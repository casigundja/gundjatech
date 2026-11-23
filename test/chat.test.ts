import { describe, it, expect, vi } from 'vitest';
import app from '../src/index';

describe('Fase 4 - Módulo 3: Chat ao Vivo & Autonomous CRM AI', () => {
    let visitorToken = '';

    it('deve rejeitar início de chat sem campos obrigatórios (POST /api/chat/start)', async () => {
        const res = await app.request('/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                nome: '',
                email: '',
                mensagem: ''
            })
        });

        expect(res.status).toBe(422);
    });

    it('deve descartar bots via honeypot sobrenome_hp em POST /api/chat/start', async () => {
        const res = await app.request('/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                nome: 'Spam Bot',
                email: 'spambot@spam.com',
                mensagem: 'Oferta de empréstimo',
                sobrenome_hp: 'Valor de bot'
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json() as { ok: boolean };
        expect(data.ok).toBe(true);
    });

    it('deve iniciar atendimento com IA, gerar protocolo e responder imediatamente', async () => {
        const res = await app.request('/api/chat/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                nome: 'Juliana Mendes',
                email: 'juliana@mendes.com.br',
                telefone: '11977776666',
                assunto: 'Novo Site Institucional',
                mensagem: 'Olá! Gostaria de saber como funciona o desenvolvimento de sites em WordPress na GundjaTech.'
            })
        });

        expect(res.status).toBe(201);
        const data = await res.json() as {
            ok: boolean;
            visitor_token: string;
            protocol: string;
            ai_reply: { message: string; is_ai: boolean };
            messages: Array<{ message: string }>;
        };

        expect(data.ok).toBe(true);
        expect(data.visitor_token).toBeDefined();
        expect(data.protocol).toMatch(/^CHAT-\d{8}-[A-Z0-9]{4}$/);
        expect(data.ai_reply).toBeDefined();
        expect(data.ai_reply.is_ai).toBe(true);
        expect(data.ai_reply.message).toContain('GundjaTech');

        visitorToken = data.visitor_token;
    });

    it('deve responder mensagens subsequentes do visitante no chat (POST /api/chat/message)', async () => {
        const res = await app.request('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                visitor_token: visitorToken,
                message: 'Quanto custa em média a criação de um site sob medida?'
            })
        });

        expect(res.status).toBe(200);
        const data = await res.json() as {
            ok: boolean;
            message: { message: string };
            ai_reply: { message: string; is_ai: boolean };
        };

        expect(data.ok).toBe(true);
        expect(data.message.message).toContain('Quanto custa');
        expect(data.ai_reply).toBeDefined();
        expect(data.ai_reply.message.toLowerCase()).toContain('investimento');
    });

    it('deve listar o histórico de mensagens da conversa (GET /api/chat/messages)', async () => {
        const res = await app.request(`/api/chat/messages?token=${visitorToken}`);
        expect(res.status).toBe(200);
        const data = await res.json() as {
            ok: boolean;
            messages: Array<{ message: string }>;
        };

        expect(data.ok).toBe(true);
        expect(data.messages).toBeInstanceOf(Array);
    });

    it('deve rejeitar busca de mensagens sem token de visitante', async () => {
        const res = await app.request('/api/chat/messages');
        expect(res.status).toBe(422);
    });

    it('deve acionar Workers AI quando disponível no ambiente edge', async () => {
        const mockAiEnv = {
            AI: {
                run: async (model: string, options: any) => {
                    expect(model).toBe('@cf/meta/llama-3.3-70b-instruct');
                    expect(options.messages.length).toBeGreaterThan(0);
                    return { response: 'Resposta gerada com sucesso pela Llama 3.3 no Cloudflare Workers AI' };
                }
            } as any
        };

        const { AutonomousCrmAgent } = await import('../src/services/ai-crm-agent');
        const agent = new AutonomousCrmAgent(mockAiEnv as any);
        const reply = await agent.handleIncomingMessage(1, 'Vocês fazem desenvolvimento de sistemas web em Cloudflare?');

        expect(reply.is_ai).toBe(true);
        expect(reply.message).toBe('Resposta gerada com sucesso pela Llama 3.3 no Cloudflare Workers AI');
    });

    it('deve realizar fallback para Gemini API quando Workers AI falha e GEMINI_API_KEY existe', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input) => {
            expect(String(input)).toContain('generativelanguage.googleapis.com');
            return new Response(JSON.stringify({
                candidates: [{ content: { parts: [{ text: 'Resposta corporativa via Google Gemini API' }] } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });

        const mockGeminiEnv = {
            GEMINI_API_KEY: 'test_gemini_key_123'
        };

        const { AutonomousCrmAgent } = await import('../src/services/ai-crm-agent');
        const agent = new AutonomousCrmAgent(mockGeminiEnv as any);
        const reply = await agent.handleIncomingMessage(1, 'Como funciona o processo de migração?');

        expect(reply.is_ai).toBe(true);
        expect(reply.message).toBe('Resposta corporativa via Google Gemini API');

        fetchSpy.mockRestore();
    });

    it('deve realizar fallback para OpenAI API quando Gemini não está disponível e OPENAI_API_KEY existe', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (input) => {
            expect(String(input)).toContain('api.openai.com');
            return new Response(JSON.stringify({
                choices: [{ message: { content: 'Resposta corporativa via OpenAI GPT-4o-mini' } }]
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        });

        const mockOpenAiEnv = {
            OPENAI_API_KEY: 'test_openai_key_456'
        };

        const { AutonomousCrmAgent } = await import('../src/services/ai-crm-agent');
        const agent = new AutonomousCrmAgent(mockOpenAiEnv as any);
        const reply = await agent.handleIncomingMessage(1, 'Vocês prestam consultoria de cloud?');

        expect(reply.is_ai).toBe(true);
        expect(reply.message).toBe('Resposta corporativa via OpenAI GPT-4o-mini');

        fetchSpy.mockRestore();
    });

    it('deve detectar pedido de atendimento humano em /api/chat/start e marcar status waiting_staff + handoff_human', async () => {
        const res = await app.request('/api/chat/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: 'Cliente Urgente',
                email: 'urgente@empresa.com',
                mensagem: 'Quero falar com um atendente humano agora'
            })
        });

        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(data.ok).toBe(true);
        expect(data.status).toBe('waiting_staff');
        expect(data.crm_stage).toBe('handoff_human');
        expect(data.ai_enabled).toBe(false);
    });
});
