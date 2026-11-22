import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hmacSign } from '../src/lib/crypto';

const TEST_SECRET = 'test_secret_for_signing_cookies_32bytes!';

function createMockEnv() {
    const data = {
        users: [
            { id: 10, name: 'Jose Gundja', email: 'cliente@gundjatech.com', role: 'client' },
            { id: 20, name: 'Outro Cliente', email: 'outro@cliente.com', role: 'client' }
        ],
        clients: [
            { id: 1, user_id: 10, name: 'Jose Gundja', company: 'Gundja Enterprises', email: 'cliente@gundjatech.com', status: 'active', is_active: 1 },
            { id: 2, user_id: 20, name: 'Outro Cliente', company: 'Outra Empresa', email: 'outro@cliente.com', status: 'active', is_active: 1 }
        ],
        projects: [
            { id: 1, client_id: 1, title: 'Portal Corporativo GundjaTech', status: 'in_progress', progress_percentage: 75, start_date: '2026-01-10', description: 'Desenvolvimento Web' },
            { id: 2, client_id: 2, title: 'Projeto Confidencial Outro Cliente', status: 'planning', progress_percentage: 10, start_date: '2026-02-01' }
        ],
        project_stages: [
            { id: 1, project_id: 1, title: 'Briefing e UX Wireframes', status: 'completed', sort_order: 1 },
            { id: 2, project_id: 1, title: 'Frontend JSX & Cloudflare D1', status: 'in_progress', sort_order: 2 }
        ],
        project_attachments: [
            { id: 1, project_id: 1, file_name: 'especificacao-tecnica.pdf', is_client_visible: 1 }
        ],
        quotations: [
            { id: 1, client_id: 1, service_request_id: 1, reference_code: 'ORC-2026-001', title: 'Infraestrutura Cloudflare Workers', total_amount: 8500, final_amount: 8500, discount_amount: 0, status: 'sent', expires_at: '2026-12-31' }
        ],
        quotation_items: [
            { id: 1, quotation_id: 1, description: 'Migração Fullstack TypeScript & Hono', quantity: 1, unit_price: 8500, total_price: 8500 }
        ],
        service_requests: [
            { id: 1, protocol: 'GNDJ-20261121-ABCD', client_id: 1, user_id: 10, service_title: 'Novo Site Institucional', description: 'Reformulação visual e alta performance', status: 'new', created_at: '2026-11-21 10:00:00' }
        ],
        request_status_histories: [] as any[],
        domains: [
            { id: 1, client_id: 1, domain_name: 'gundja.com.br', registrar: 'Registro.br', expires_at: '2027-01-15', auto_renew: 1, status: 'active' }
        ],
        financial_transactions: [
            { id: 1, client_id: 1, description: 'Parcela 01/03 - Desenvolvimento Web', amount: 2833.33, due_date: '2026-12-10', status: 'pending', payment_method: 'PIX', invoice_number: '1001' }
        ],
        advertising_campaigns: [
            { id: 1, client_id: 1, name: 'Captação Google Search SP', platform: 'google_ads', status: 'active', budget: 3000, spent: 1250, objective: 'Captação B2B' }
        ],
        conversations: [
            { id: 1, client_id: 1, subject: 'Atendimento Geral Gundja Enterprises', channel: 'web_chat', status: 'open' }
        ],
        conversation_messages: [
            { id: 1, conversation_id: 1, sender_type: 'client', sender_id: 10, message: 'Olá, gostaria de verificar o prazo de entrega.', created_at: '2026-11-21 11:00:00' }
        ],
        activity_logs: [] as any[],
        sessions: [
            {
                id: 'sess_client_10',
                user_id: 10,
                payload: JSON.stringify({
                    id: 10,
                    name: 'Jose Gundja',
                    email: 'cliente@gundjatech.com',
                    role: 'client',
                    is_active: 1
                }),
                last_activity: Math.floor(Date.now() / 1000)
            }
        ],
        services: [
            { id: 1, name: 'Criação de Sites', is_active: 1 }
        ]
    };

    const mockDb = {
        prepare: (query: string) => {
            return {
                bind: (...params: any[]) => {
                    return {
                        first: async <T>(): Promise<T | null> => {
                            const q = query.toLowerCase();
                            if (q.includes('from sessions where id =')) {
                                const s = data.sessions.find(x => x.id === params[0]);
                                return (s || null) as unknown as T;
                            }
                            if (q.includes('from users where id =')) {
                                const u = data.users.find(x => x.id === params[0]);
                                return (u || null) as unknown as T;
                            }
                            if (q.includes('from clients where user_id =')) {
                                const c = data.clients.find(x => x.user_id === params[0]);
                                return (c || null) as unknown as T;
                            }
                            if (q.includes('from clients where lower(email) =')) {
                                const c = data.clients.find(x => x.email.toLowerCase() === String(params[0]).toLowerCase());
                                return (c || null) as unknown as T;
                            }
                            if (q.includes('from projects where id = ? and client_id = ?')) {
                                const p = data.projects.find(x => x.id === params[0] && x.client_id === params[1]);
                                return (p || null) as unknown as T;
                            }
                            if (q.includes('from quotations where id = ? and client_id = ?')) {
                                const quo = data.quotations.find(x => x.id === params[0] && x.client_id === params[1]);
                                return (quo || null) as unknown as T;
                            }
                            if (q.includes('from service_requests where id = ? and client_id = ?')) {
                                const sr = data.service_requests.find(x => x.id === params[0] && x.client_id === params[1]);
                                return (sr || null) as unknown as T;
                            }
                            if (q.includes('from domains where id = ? and client_id = ?')) {
                                const d = data.domains.find(x => x.id === params[0] && x.client_id === params[1]);
                                return (d || null) as unknown as T;
                            }
                            if (q.includes('from conversations where id = ? and client_id = ?')) {
                                const conv = data.conversations.find(x => x.id === params[0] && x.client_id === params[1]);
                                return (conv || null) as unknown as T;
                            }
                            if (q.includes('from conversations where client_id = ?')) {
                                const conv = data.conversations.find(x => x.client_id === params[0]);
                                return (conv || null) as unknown as T;
                            }
                            if (q.includes('select count(*) as total from service_requests')) {
                                const count = data.service_requests.filter(x => x.client_id === params[0]).length;
                                return { total: count } as unknown as T;
                            }
                            if (q.includes('select count(*) as total from projects')) {
                                const count = data.projects.filter(x => x.client_id === params[0]).length;
                                return { total: count } as unknown as T;
                            }
                            if (q.includes('select count(*) as total from domains')) {
                                const count = data.domains.filter(x => x.client_id === params[0]).length;
                                return { total: count } as unknown as T;
                            }
                            if (q.includes('select count(*) as total from advertising_campaigns')) {
                                const count = data.advertising_campaigns.filter(x => x.client_id === params[0]).length;
                                return { total: count } as unknown as T;
                            }
                            return null;
                        },
                        all: async <T>(): Promise<{ results: T[] }> => {
                            const q = query.toLowerCase();
                            if (q.includes('from projects where client_id =')) {
                                return { results: data.projects.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from project_stages where project_id =')) {
                                return { results: data.project_stages.filter(x => x.project_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from project_attachments where project_id =')) {
                                return { results: data.project_attachments.filter(x => x.project_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from quotations where client_id =')) {
                                return { results: data.quotations.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from quotation_items where quotation_id =')) {
                                return { results: data.quotation_items.filter(x => x.quotation_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from service_requests where client_id =')) {
                                return { results: data.service_requests.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from request_status_histories where service_request_id =')) {
                                return { results: data.request_status_histories.filter(x => x.service_request_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from domains where client_id =')) {
                                return { results: data.domains.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from financial_transactions where client_id =')) {
                                return { results: data.financial_transactions.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from advertising_campaigns where client_id =')) {
                                return { results: data.advertising_campaigns.filter(x => x.client_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from conversation_messages where conversation_id =')) {
                                return { results: data.conversation_messages.filter(x => x.conversation_id === params[0]) as unknown as T[] };
                            }
                            if (q.includes('from services where is_active = 1')) {
                                return { results: data.services as unknown as T[] };
                            }
                            return { results: [] };
                        },
                        run: async () => {
                            const q = query.toLowerCase();
                            if (q.includes('insert into service_requests')) {
                                const newId = data.service_requests.length + 1;
                                data.service_requests.push({
                                    id: newId,
                                    protocol: params[0],
                                    client_id: params[1],
                                    user_id: params[2],
                                    service_title: params[8] || params[3],
                                    description: params[9] || params[4],
                                    status: 'new',
                                    created_at: '2026-11-21'
                                });
                                return { meta: { last_row_id: newId, changes: 1 } };
                            }
                            if (q.includes('update quotations set status = "approved"')) {
                                const item = data.quotations.find(x => x.id === params[0]);
                                if (item) item.status = 'approved';
                                return { meta: { changes: 1 } };
                            }
                            if (q.includes('update quotations set status = "rejected"')) {
                                const item = data.quotations.find(x => x.id === params[0]);
                                if (item) item.status = 'rejected';
                                return { meta: { changes: 1 } };
                            }
                            if (q.includes('insert into conversation_messages')) {
                                const newId = data.conversation_messages.length + 1;
                                data.conversation_messages.push({
                                    id: newId,
                                    conversation_id: params[0],
                                    sender_type: params[1],
                                    sender_id: params[2],
                                    message: params[3],
                                    created_at: new Date().toISOString()
                                });
                                return { meta: { last_row_id: newId, changes: 1 } };
                            }
                            return { meta: { changes: 1 } };
                        }
                    };
                },
                all: async <T>() => {
                    const q = query.toLowerCase();
                    if (q.includes('from services where is_active = 1')) {
                        return { results: data.services as unknown as T[] };
                    }
                    return { results: [] };
                }
            };
        }
    };

    return {
        DB: mockDb as any,
        SESSION_SECRET: TEST_SECRET,
        KV_SESSIONS: {
            get: async () => null,
            put: async () => {},
            delete: async () => {}
        } as any,
        KV_CACHE: {} as any,
        UPLOADS_BUCKET: {} as any,
        AI: {} as any
    };
}

describe('Fase 4 - Módulo 4: Portal do Cliente Multi-tenant', () => {
    let clientCookie = '';
    let env: any;

    it('deve bloquear acesso a /portal sem autenticação (retorna 401 ou redirect)', async () => {
        env = createMockEnv();
        const res = await app.request('/portal', {}, env);
        expect([302, 401]).toContain(res.status);
    });

    it('deve autenticar cliente com cookie assinado e carregar o Dashboard do Portal', async () => {
        env = createMockEnv();
        const sessionId = 'sess_client_10';
        const sig = await hmacSign(sessionId, TEST_SECRET);
        clientCookie = `gt_session=${sessionId}.${sig}`;

        const res = await app.request('/portal', {
            headers: {
                Cookie: clientCookie
            }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Início &amp; Resumo');
        expect(html).toContain('Gundja Enterprises');
        expect(html).toContain('Solicitações Abertas');
        expect(html).toContain('Projetos em Andamento');
    });

    it('deve listar apenas os projetos pertencentes ao cliente autenticado (isolamento multi-tenant)', async () => {
        const res = await app.request('/portal/projetos', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Portal Corporativo GundjaTech');
        // Não pode vazar dados de outro cliente
        expect(html).not.toContain('Projeto Confidencial Outro Cliente');
    });

    it('deve exibir detalhes, etapas e entregáveis do projeto do cliente', async () => {
        const res = await app.request('/portal/projetos/1', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Briefing e UX Wireframes');
        expect(html).toContain('Frontend JSX &amp; Cloudflare D1');
        expect(html).toContain('especificacao-tecnica.pdf');
    });

    it('deve bloquear acesso a projeto de outro cliente (retorna 404)', async () => {
        const res = await app.request('/portal/projetos/2', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(404);
    });

    it('deve listar orçamentos e permitir visualização de proposta com itens', async () => {
        const listRes = await app.request('/portal/orcamentos', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(listRes.status).toBe(200);
        const listHtml = await listRes.text();
        expect(listHtml).toContain('ORC-2026-001');

        const detailRes = await app.request('/portal/orcamentos/1', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(detailRes.status).toBe(200);
        const detailHtml = await detailRes.text();
        expect(detailHtml).toContain('Migração Fullstack TypeScript &amp; Hono');
        expect(detailHtml).toContain('R$ 8.500,00');
        expect(detailHtml).toContain('Aprovar Orçamento');
    });

    it('deve aprovar orçamento via POST /portal/orcamentos/:id/aprovar', async () => {
        const res = await app.request('/portal/orcamentos/1/aprovar', {
            method: 'POST',
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toContain('success=Or');
    });

    it('deve permitir criar nova solicitação via POST /portal/solicitacoes com protocolo GNDJ', async () => {
        const res = await app.request('/portal/solicitacoes', {
            method: 'POST',
            headers: {
                Cookie: clientCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                service_id: '1',
                title: 'Nova Funcionalidade de Checkout com PIX',
                description: 'Implementar chave estática e dinâmica para recebimentos rápidos.',
                estimated_budget: '4500'
            }).toString()
        }, env);

        expect(res.status).toBe(302);
        const loc = res.headers.get('Location') || '';
        expect(loc).toContain('/portal/solicitacoes/');
        expect(loc).toContain('Protocolo:+GNDJ-');
    });

    it('deve solicitar renovação anual de domínio via POST /portal/dominios/:id/renovacao', async () => {
        const res = await app.request('/portal/dominios/1/renovacao', {
            method: 'POST',
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toContain('Protocolo+REN-');
    });

    it('deve listar faturas e histórico financeiro em /portal/financeiro', async () => {
        const res = await app.request('/portal/financeiro', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Parcela 01/03 - Desenvolvimento Web');
        expect(html).toContain('Doc #1001');
        expect(html).toContain('PIX');
    });

    it('deve listar campanhas de marketing em /portal/campanhas', async () => {
        const res = await app.request('/portal/campanhas', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).toContain('Captação Google Search SP');
        expect(html).toContain('google_ads');
    });

    it('deve carregar o canal de atendimento e permitir envio de mensagens em /portal/atendimento', async () => {
        const chatRes = await app.request('/portal/atendimento', {
            headers: { Cookie: clientCookie }
        }, env);

        expect(chatRes.status).toBe(200);
        const chatHtml = await chatRes.text();
        expect(chatHtml).toContain('Canal Direto com o Time');
        expect(chatHtml).toContain('Olá, gostaria de verificar o prazo de entrega.');

        const sendRes = await app.request('/portal/atendimento/1/mensagem', {
            method: 'POST',
            headers: {
                Cookie: clientCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                message: 'Perfeito, obrigado pelo retorno rápido!'
            }).toString()
        }, env);

        expect(sendRes.status).toBe(302);
        expect(sendRes.headers.get('Location')).toContain('success=Mensagem');
    });
});
