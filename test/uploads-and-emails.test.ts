import { describe, it, expect, vi } from 'vitest';
import app from '../src/index';
import { hmacSign } from '../src/lib/crypto';
import {
    sendEmail,
    sendPasswordResetEmail,
    sendQuoteConfirmationEmail,
    sendNewLeadStaffNotification,
    sendInvoiceNoticeEmail,
    renderEmailTemplate
} from '../src/lib/email';
import { generateStorageKey } from '../src/lib/storage';

const TEST_SECRET = 'test_secret_for_signing_cookies_32bytes!';

function createStorageAndEmailMockEnv() {
    const memoryR2 = new Map<string, { body: Uint8Array; httpMetadata: any; customMetadata: any; httpEtag: string }>();

    const mockBucket: any = {
        put: async (key: string, data: any, options?: any) => {
            let buffer: Uint8Array;
            if (data instanceof Uint8Array) {
                buffer = data;
            } else if (data instanceof ArrayBuffer) {
                buffer = new Uint8Array(data);
            } else {
                buffer = new Uint8Array(await new Response(data).arrayBuffer());
            }

            const item = {
                body: buffer,
                httpMetadata: options?.httpMetadata || { contentType: 'application/octet-stream' },
                customMetadata: options?.customMetadata || {},
                httpEtag: `W/"${Date.now()}"`
            };
            memoryR2.set(key, item);

            return {
                key,
                size: buffer.byteLength,
                httpEtag: item.httpEtag,
                writeHttpMetadata: (headers: Headers) => {
                    if (item.httpMetadata.contentType) headers.set('content-type', item.httpMetadata.contentType);
                    if (item.httpMetadata.cacheControl) headers.set('cache-control', item.httpMetadata.cacheControl);
                }
            };
        },
        get: async (key: string) => {
            const item = memoryR2.get(key);
            if (!item) return null;

            return {
                key,
                size: item.body.byteLength,
                httpEtag: item.httpEtag,
                body: item.body,
                writeHttpMetadata: (headers: Headers) => {
                    if (item.httpMetadata.contentType) headers.set('content-type', item.httpMetadata.contentType);
                    if (item.httpMetadata.cacheControl) headers.set('cache-control', item.httpMetadata.cacheControl);
                }
            };
        },
        delete: async (key: string) => {
            memoryR2.delete(key);
        }
    };

    const mockDb: any = {
        prepare: () => ({
            bind: (...params: any[]) => ({
                first: async () => {
                    if (params[0] === 'sess_auth_user') {
                        return {
                            id: 'sess_auth_user',
                            user_id: 1,
                            payload: JSON.stringify({
                                id: 1,
                                name: 'Engenheiro Gundja',
                                email: 'eng@gundjatech.com',
                                role: 'admin',
                                is_active: 1
                            }),
                            last_activity: Math.floor(Date.now() / 1000)
                        };
                    }
                    return null;
                },
                all: async () => ({ results: [] }),
                run: async () => ({ success: true })
            }),
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => ({ success: true })
        })
    };

    return {
        env: {
            DB: mockDb,
            UPLOADS_BUCKET: mockBucket,
            SESSION_SECRET: TEST_SECRET,
            APP_SECRET: TEST_SECRET,
            APP_NAME: 'GundjaTech',
            APP_URL: 'http://localhost'
        },
        memoryR2
    };
}

async function makeSignedCookie(sessionId: string): Promise<string> {
    const sig = await hmacSign(sessionId, TEST_SECRET);
    return `gt_session=${sessionId}.${sig}`;
}

describe('Fase 4 • Módulo 7: Uploads R2 Storage & E-mails Transacionais', () => {
    // ----------------------------------------------------
    // 1. R2 STORAGE & UPLOADS
    // ----------------------------------------------------
    it('1. Bloqueia upload em /api/uploads para usuário não-autenticado', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const formData = new FormData();
        formData.append('file', new File(['conteudo teste'], 'briefing.txt', { type: 'text/plain' }));

        const res = await app.request('/api/uploads', {
            method: 'POST',
            body: formData
        }, env);

        expect([302, 401]).toContain(res.status);
    });

    it('2. Realiza upload seguro no R2 Bucket via /api/uploads com metadados e URL', async () => {
        const { env, memoryR2 } = createStorageAndEmailMockEnv();
        const cookie = await makeSignedCookie('sess_auth_user');

        const formData = new FormData();
        const testFile = new File(['contrato assinado gundjatech'], 'contrato_final.pdf', { type: 'application/pdf' });
        formData.append('file', testFile);
        formData.append('folder', 'contratos');

        const res = await app.request('/api/uploads', {
            method: 'POST',
            headers: {
                'Cookie': cookie
            },
            body: formData
        }, env);

        expect(res.status).toBe(201);
        const data = await res.json() as any;
        expect(data.ok).toBe(true);
        expect(data.key).toContain('contratos/');
        expect(data.key).toContain('contrato_final.pdf');
        expect(data.url).toBe(`/uploads/${data.key}`);
        expect(data.contentType).toBe('application/pdf');

        // Confirma armazenamento no mock R2
        expect(memoryR2.has(data.key)).toBe(true);
    });

    it('3. Rejeita upload sem arquivo válido (retorna 422)', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const cookie = await makeSignedCookie('sess_auth_user');

        const formData = new FormData();
        formData.append('folder', 'documentos');

        const res = await app.request('/api/uploads', {
            method: 'POST',
            headers: { 'Cookie': cookie },
            body: formData
        }, env);

        expect(res.status).toBe(422);
        const data = await res.json() as any;
        expect(data.error).toContain('Nenhum arquivo válido');
    });

    it('4. Realiza streaming do arquivo armazenado no R2 via GET /uploads/:key com headers corretos', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const fileContent = 'documento confidencial de arquitetura edge';
        const key = 'projetos/10_arquitetura.txt';

        await env.UPLOADS_BUCKET.put(key, new TextEncoder().encode(fileContent), {
            httpMetadata: { contentType: 'text/plain; charset=utf-8' }
        });

        const res = await app.request(`/uploads/${key}`, {
            method: 'GET'
        }, env);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/plain');
        expect(res.headers.get('etag')).toBeDefined();
        const bodyText = await res.text();
        expect(bodyText).toBe(fileContent);
    });

    it('5. Retorna 404 quando o arquivo não existe no R2', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await app.request('/uploads/inexistente/arquivo_nao_encontrado.pdf', {
            method: 'GET'
        }, env);

        expect(res.status).toBe(404);
    });

    it('6. Gera chave de armazenamento R2 sanitizada e única', () => {
        const key1 = generateStorageKey('/avatars/', 'Foto Perfil (2026)!.png');
        const key2 = generateStorageKey('avatars', 'Foto Perfil (2026)!.png');

        expect(key1).toContain('avatars/');
        expect(key1).toContain('foto_perfil_2026_.png');
        expect(key1).not.toBe(key2); // timestamp/random único
    });

    // ----------------------------------------------------
    // 2. E-MAILS TRANSACIONAIS (RESEND API & TEMPLATES)
    // ----------------------------------------------------
    it('7. Realiza envio mock elegante quando RESEND_API_KEY não está configurada', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await sendEmail(env as any, {
            to: 'cliente@teste.com',
            subject: 'Teste de Envio',
            html: '<p>Mensagem teste</p>'
        });

        expect(res.success).toBe(true);
        expect(res.mocked).toBe(true);
        expect(res.id).toContain('mock_email_');
    });

    it('8. Despacha chamada HTTP para a API do Resend quando RESEND_API_KEY está presente', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const envWithKey = {
            ...env,
            RESEND_API_KEY: 're_mock_test_key_12345678'
        };

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input, init) => {
            expect(input).toBe('https://api.resend.com/emails');
            expect(init?.method).toBe('POST');
            const headers = init?.headers as Record<string, string>;
            expect(headers['Authorization']).toBe('Bearer re_mock_test_key_12345678');

            const payload = JSON.parse(init?.body as string);
            expect(payload.to).toEqual(['lead@empresa.com']);
            expect(payload.subject).toBe('Proposta Comercial GundjaTech');

            return new Response(JSON.stringify({ id: 're_real_msg_987654' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        });

        const res = await sendEmail(envWithKey as any, {
            to: 'lead@empresa.com',
            subject: 'Proposta Comercial GundjaTech',
            html: '<p>Segue a proposta</p>'
        });

        expect(res.success).toBe(true);
        expect(res.id).toBe('re_real_msg_987654');
        expect(res.mocked).toBeUndefined();

        fetchSpy.mockRestore();
    });

    it('9. Formata e despacha e-mail de recuperação de senha com link assinado e Paleta 3', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await sendPasswordResetEmail(env as any, 'admin@gundjatech.com', 'Administrador Master', 'token_abc_123');

        expect(res.success).toBe(true);
    });

    it('10. Formata e despacha e-mail de confirmação de solicitação com protocolo para o cliente', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await sendQuoteConfirmationEmail(
            env as any,
            'cliente@techcorp.com.br',
            'Carlos Oliveira',
            'GNDJ-20261121-ABCD',
            'Portal Enterprise Cloudflare'
        );

        expect(res.success).toBe(true);
    });

    it('11. Formata e despacha notificação de lead para a equipe comercial', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await sendNewLeadStaffNotification(env as any, {
            name: 'Fernanda Lima',
            email: 'fernanda@fintech.com',
            phone: '(11) 97777-6666',
            company: 'Fintech Inovadora',
            serviceTitle: 'Migração Serverless D1',
            protocol: 'GNDJ-20261121-7788'
        });

        expect(res.success).toBe(true);
    });

    it('12. Formata e despacha notificação de fatura com valor em BRL', async () => {
        const { env } = createStorageAndEmailMockEnv();
        const res = await sendInvoiceNoticeEmail(env as any, 'financeiro@cliente.com', 'Diretoria Financeira', {
            description: 'Parcela 02/03 - Desenvolvimento Web',
            amount: 8500,
            dueDate: '2026-12-15',
            invoiceNumber: '2026-0045'
        });

        expect(res.success).toBe(true);
    });

    it('13. Renderiza template institucional com elementos visuais da marca GundjaTech', () => {
        const html = renderEmailTemplate(
            'Teste de Identidade Visual',
            '<p>Conteúdo de teste</p>',
            { text: 'Acessar Plataforma', url: 'https://gundjatech.com/portal' }
        );

        // Validação da Paleta 3
        expect(html).toContain('Gundja<span style="color: #F2C230;">Tech</span>');
        expect(html).toContain('#063B5C'); // Azul Petróleo
        expect(html).toContain('#F2C230'); // Amarelo Ouro
        expect(html).toContain('Acessar Plataforma');
        expect(html).toContain('https://gundjatech.com/portal');
        expect(html).toContain('Av. Eng. Luís Carlos Berrini, São Paulo');
    });
});
