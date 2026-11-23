import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';

describe('Integração Meta WhatsApp Cloud API & CRM Autônomo', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve validar o desafio GET /api/webhooks/whatsapp com token correto', async () => {
        const res = await app.request(
            '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=gundjatech_wa_verify_2026&hub.challenge=123456789',
            { method: 'GET' }
        );

        expect(res.status).toBe(200);
        expect(await res.text()).toBe('123456789');
    });

    it('deve rejeitar GET /api/webhooks/whatsapp com token inválido', async () => {
        const res = await app.request(
            '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token_errado&hub.challenge=123456789',
            { method: 'GET' }
        );

        expect(res.status).toBe(403);
    });

    it('deve receber mensagem do WhatsApp via POST, acionar a IA e responder pela Graph API', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ messages: [{ id: 'wamid.reply.1' }] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const kvStore = new Map<string, string>();
        const mockEnv = {
            WHATSAPP_VERIFY_TOKEN: 'gundjatech_wa_verify_2026',
            WHATSAPP_ACCESS_TOKEN: 'test_token_meta',
            WHATSAPP_PHONE_NUMBER_ID: '10999888777',
            WHATSAPP_API_VERSION: 'v21.0',
            KV_CACHE: {
                get: async (k: string) => kvStore.get(k) || null,
                put: async (k: string, v: string) => {
                    kvStore.set(k, v);
                }
            },
            DB: {
                prepare: () => ({
                    bind: () => ({
                        first: async () => null,
                        all: async () => ({ results: [] }),
                        run: async () => ({ meta: { last_row_id: 42 } })
                    }),
                    first: async () => null,
                    all: async () => ({ results: [] }),
                    run: async () => ({ meta: { last_row_id: 42 } })
                })
            }
        } as any;

        const payload = {
            object: 'whatsapp_business_account',
            entry: [
                {
                    id: 'WABA_1',
                    changes: [
                        {
                            field: 'messages',
                            value: {
                                contacts: [{ profile: { name: 'Marcos Silva' }, wa_id: '5511999998888' }],
                                messages: [
                                    {
                                        from: '5511999998888',
                                        id: 'wamid.incoming.1',
                                        timestamp: '1700000000',
                                        type: 'text',
                                        text: { body: 'Olá, quero orçamento para um site institucional.' }
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        };

        const res = await app.request(
            '/api/webhooks/whatsapp',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            },
            mockEnv
        );

        expect(res.status).toBe(200);
        const data = (await res.json()) as {
            ok: boolean;
            processed: Array<{ messageId: string; conversationId?: number; replied: boolean }>;
        };
        expect(data.ok).toBe(true);
        expect(data.processed).toHaveLength(1);
        expect(data.processed[0].replied).toBe(true);
        expect(fetchMock).toHaveBeenCalled();

        // Segunda entrega duplicada do mesmo wamid deve ser ignorada
        const dupRes = await app.request(
            '/api/webhooks/whatsapp',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            },
            mockEnv
        );
        const dupData = (await dupRes.json()) as { ok: boolean; processed: any[] };
        expect(dupData.ok).toBe(true);
        expect(dupData.processed).toHaveLength(0);
    });

    it('deve receber mensagem via Z-API (QR Code), acionar a IA e responder pela Z-API', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ messageId: 'zapi.msg.1' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const mockEnv = {
            DB: {
                prepare: (sql: string) => ({
                    bind: () => ({
                        first: async () => null,
                        all: async () => ({ results: [] }),
                        run: async () => ({ meta: { last_row_id: 77 } })
                    }),
                    first: async () => null,
                    all: async () => ({
                        results: sql.includes('whatsapp_zapi_instance_id')
                            ? [
                                { key: 'whatsapp_provider', value: 'zapi' },
                                { key: 'whatsapp_zapi_instance_id', value: 'INST123' },
                                { key: 'whatsapp_zapi_token', value: 'TOK456' },
                                { key: 'whatsapp_zapi_client_token', value: 'CLI789' }
                            ]
                            : []
                    }),
                    run: async () => ({ meta: { last_row_id: 77 } })
                })
            }
        } as any;

        const zapiPayload = {
            instanceId: 'INST123',
            messageId: 'ZAPI-MSG-001',
            phone: '5519953248420',
            fromMe: false,
            isGroup: false,
            senderName: 'Casimiro Gundja',
            text: { message: 'Olá, quero orçamento para um sistema web' }
        };

        const res = await app.request(
            '/api/webhooks/whatsapp',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(zapiPayload)
            },
            mockEnv
        );

        expect(res.status).toBe(200);
        const data = (await res.json()) as { ok: boolean; processed: Array<{ provider: string; replied: boolean }> };
        expect(data.ok).toBe(true);
        expect(data.processed).toHaveLength(1);
        expect(data.processed[0].provider).toBe('zapi');
        expect(data.processed[0].replied).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.z-api.io/instances/INST123/token/TOK456/send-text',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('deve salvar no Inbox sem resposta da IA quando whatsapp_ai_enabled estiver pausado', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch');
        const mockEnv = {
            DB: {
                prepare: (sql: string) => ({
                    bind: () => ({
                        first: async () => null,
                        all: async () => ({ results: [] }),
                        run: async () => ({ meta: { last_row_id: 88 } })
                    }),
                    first: async () => null,
                    all: async () => ({
                        results: sql.includes('whatsapp_ai_enabled')
                            ? [
                                { key: 'whatsapp_sync_enabled', value: '1' },
                                { key: 'whatsapp_ai_enabled', value: '0' },
                                { key: 'whatsapp_director_enabled', value: '1' }
                            ]
                            : []
                    }),
                    run: async () => ({ meta: { last_row_id: 88 } })
                })
            }
        } as any;

        const zapiPayload = {
            instanceId: 'INST123',
            messageId: 'ZAPI-MSG-NOAI-1',
            phone: '5519953248420',
            fromMe: false,
            isGroup: false,
            senderName: 'Cliente WhatsApp',
            text: { message: 'Oi, gostaria de informações' }
        };

        const res = await app.request(
            '/api/webhooks/whatsapp',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(zapiPayload)
            },
            mockEnv
        );

        expect(res.status).toBe(200);
        const data = (await res.json()) as { ok: boolean; processed: Array<{ conversationId?: number; replied: boolean }> };
        expect(data.ok).toBe(true);
        expect(data.processed).toHaveLength(1);
        expect(data.processed[0].conversationId).toBe(88);
        expect(data.processed[0].replied).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('deve respeitar pausa independente do WhatsApp 2 (Diretor) em sendDirectorWhatsAppAlert', async () => {
        const { sendDirectorWhatsAppAlert } = await import('../src/services/whatsapp');
        const mockEnv = {
            DB: {
                prepare: () => ({
                    all: async () => ({
                        results: [
                            { key: 'whatsapp_director_enabled', value: '0' },
                            { key: 'whatsapp_director_phone', value: '5519953248420' }
                        ]
                    })
                })
            }
        } as any;

        const res = await sendDirectorWhatsAppAlert(mockEnv, {
            conversationId: 99,
            visitorName: 'Lead Teste',
            message: 'Quero falar com humano',
            sourceChannel: 'whatsapp'
        });

        expect(res.ok).toBe(false);
        expect(res.error).toContain('pausado');
    });
});
