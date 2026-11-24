import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hmacSign, hmacSignHex, sha256Hex } from '../src/lib/crypto';
import { hashPassword } from '../src/lib/password';
import { destroyAllUserSessions } from '../src/lib/session';

const TEST_SECRET = 'security_suite_test_hmac_secret_32b!';

async function createSecurityMockEnv() {
    const realPasswordHash = await hashPassword('SenhaForte!2026');
    const kvStore = new Map<string, string>();

    const data = {
        users: [
            { id: 1, name: 'Diretor Admin', email: 'admin@gundjatech.com', role: 'superadmin', password: realPasswordHash, is_active: 1, phone: null, company: 'GundjaTech' },
            { id: 2, name: 'Atendente Comercial', email: 'atendente@gundjatech.com', role: 'attendant', password: realPasswordHash, is_active: 1, phone: null, company: 'GundjaTech' },
            { id: 10, name: 'Cliente A', email: 'a@cliente.com', role: 'client', password: realPasswordHash, is_active: 1, phone: null, company: 'Empresa A' },
            { id: 20, name: 'Cliente B', email: 'b@cliente.com', role: 'client', password: realPasswordHash, is_active: 1, phone: null, company: 'Empresa B' }
        ],
        clients: [
            { id: 100, user_id: 10, name: 'Cliente A', company: 'Empresa A', email: 'a@cliente.com', status: 'active', is_active: 1 },
            { id: 200, user_id: 20, name: 'Cliente B', company: 'Empresa B', email: 'b@cliente.com', status: 'active', is_active: 1 }
        ],
        conversations: [
            { id: 1, client_id: 100, subject: 'Chat A', channel: 'web_chat', status: 'open', ai_enabled: 0 },
            { id: 2, client_id: 200, subject: 'Chat B Privado', channel: 'web_chat', status: 'open', ai_enabled: 0 }
        ],
        conversation_messages: [] as any[],
        projects: [
            { id: 10, client_id: 100, title: 'Projeto A', status: 'in_progress' }
        ],
        quotations: [
            { id: 77, client_id: 100, title: 'Rascunho Interno', reference_code: 'ORC-DRAFT-77', status: 'draft', total_amount: 5000, discount_amount: 0, final_amount: 5000 }
        ],
        financial_transactions: [
            { id: 88, client_id: 100, description: 'Fatura Paga', amount: 2500, status: 'paid' }
        ],
        password_reset_tokens: [
            { email: 'a@cliente.com', token: 'expired_token_raw', created_at: '2020-01-01 00:00:00' }
        ],
        project_attachments: [
            { id: 50, project_id: 10, file_name: 'contrato.pdf', file_path: 'projects/contrato.pdf', is_client_visible: 1 }
        ],
        sessions: [
            {
                id: 'sess_superadmin',
                user_id: 1,
                payload: JSON.stringify({ id: 1, name: 'Diretor Admin', email: 'admin@gundjatech.com', role: 'superadmin', is_active: true }),
                last_activity: Math.floor(Date.now() / 1000)
            },
            {
                id: 'sess_attendant',
                user_id: 2,
                payload: JSON.stringify({ id: 2, name: 'Atendente Comercial', email: 'atendente@gundjatech.com', role: 'attendant', is_active: true }),
                last_activity: Math.floor(Date.now() / 1000)
            },
            {
                id: 'sess_client_a',
                user_id: 10,
                payload: JSON.stringify({ id: 10, name: 'Cliente A', email: 'a@cliente.com', role: 'client', is_active: true }),
                last_activity: Math.floor(Date.now() / 1000)
            }
        ]
    };

    kvStore.set('session:sess_superadmin', data.sessions[0].payload);
    kvStore.set('session:sess_attendant', data.sessions[1].payload);
    kvStore.set('session:sess_client_a', data.sessions[2].payload);

    const mockDb = {
        prepare: (query: string) => {
            const q = query.toLowerCase();
            return {
                first: async <T>(): Promise<T | null> => ({ total: 0, total_income: 0, pending_income: 0 } as unknown as T),
                all: async <T>(): Promise<{ results: T[] }> => ({ results: [] }),
                run: async () => ({ meta: { changes: 0, last_row_id: 0 } }),
                bind: (...params: any[]) => ({
                    first: async <T>(): Promise<T | null> => {
                        if (q.includes('from users where lower(email) =') || q.includes('from users where email =')) {
                            return (data.users.find(u => u.email.toLowerCase() === String(params[0]).toLowerCase()) || null) as unknown as T;
                        }
                        if (q.includes('from users where id =')) {
                            return (data.users.find(u => u.id === Number(params[0])) || null) as unknown as T;
                        }
                        if (q.includes('from sessions where id =')) {
                            return (data.sessions.find(s => s.id === params[0]) || null) as unknown as T;
                        }
                        if (q.includes('from clients where user_id =')) {
                            return (data.clients.find(c => c.user_id === Number(params[0])) || null) as unknown as T;
                        }
                        if (q.includes('from conversations where id = ? and client_id = ?')) {
                            return (data.conversations.find(cv => cv.id === Number(params[0]) && cv.client_id === Number(params[1])) || null) as unknown as T;
                        }
                        if (q.includes('from projects where id = ? and client_id = ?')) {
                            return (data.projects.find(p => p.id === Number(params[0]) && p.client_id === Number(params[1])) || null) as unknown as T;
                        }
                        if (q.includes('from project_attachments where id = ? and project_id = ?')) {
                            return (data.project_attachments.find(a => a.id === Number(params[0]) && a.project_id === Number(params[1]) && a.is_client_visible === 1) || null) as unknown as T;
                        }
                        if (q.includes('from quotations where id = ? and client_id = ? and status != "draft"')) {
                            return (data.quotations.find(qt => qt.id === Number(params[0]) && qt.client_id === Number(params[1]) && qt.status !== 'draft') || null) as unknown as T;
                        }
                        if (q.includes("from financial_transactions where client_id = ? and status = 'paid'")) {
                            return (data.financial_transactions.find(tx => tx.client_id === Number(params[0]) && tx.status === 'paid') || null) as unknown as T;
                        }
                        if (q.includes('from password_reset_tokens where email = ?')) {
                            return (data.password_reset_tokens.find(rt => rt.email === String(params[0]).toLowerCase()) || null) as unknown as T;
                        }
                        if (q.includes('from conversations where session_id = ?')) {
                            return null;
                        }
                        return null;
                    },
                    all: async <T>(): Promise<{ results: T[] }> => {
                        if (q.includes('select id from sessions where user_id = ?')) {
                            return { results: data.sessions.filter(s => s.user_id === Number(params[0])).map(s => ({ id: s.id })) as unknown as T[] };
                        }
                        return { results: [] };
                    },
                    run: async () => {
                        if (q.includes('delete from sessions where user_id = ?')) {
                            data.sessions = data.sessions.filter(s => s.user_id !== Number(params[0]));
                        }
                        if (q.includes('insert into conversation_messages')) {
                            data.conversation_messages.push({ conversation_id: params[0], message: params[2] });
                        }
                        return { meta: { changes: 1, last_row_id: 1 } };
                    }
                })
            };
        }
    };

    const mockR2 = {
        put: async (key: string, body: any, opts?: any) => ({
            key,
            size: body?.byteLength ?? 0,
            httpEtag: '"etag-put-1"',
            httpMetadata: opts?.httpMetadata
        }),
        get: async (key: string) => {
            if (key === 'projects/contrato.pdf' || key === 'private/contrato-sigiloso.pdf') {
                return {
                    body: new TextEncoder().encode('%PDF-1.4 GundjaTech'),
                    httpEtag: '"etag-pdf-1"',
                    writeHttpMetadata: (h: Headers) => h.set('content-type', 'application/pdf')
                };
            }
            return null;
        }
    };

    return {
        env: {
            DB: mockDb as any,
            SESSION_SECRET: TEST_SECRET,
            KV_SESSIONS: {
                get: async (k: string) => kvStore.get(k) ?? null,
                put: async (k: string, v: string) => { kvStore.set(k, v); },
                delete: async (k: string) => { kvStore.delete(k); }
            } as any,
            KV_CACHE: {} as any,
            UPLOADS_BUCKET: mockR2 as any,
            AI: {} as any
        },
        kvStore,
        data
    };
}

async function signedCookie(sessionId: string): Promise<string> {
    const sig = await hmacSign(sessionId, TEST_SECRET);
    return `gt_session=${sessionId}.${sig}`;
}

describe('Auditoria de Blindagem de Segurança (P0/P1/P2)', () => {
    it('P0: deve rejeitar login com a senha literal "password" (backdoor removido)', async () => {
        const { env } = await createSecurityMockEnv();
        const res = await app.request('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body: new URLSearchParams({
                email: 'admin@gundjatech.com',
                password: 'password'
            }).toString()
        }, env);

        expect(res.status).toBe(401);
    });

    it('P1: deve bloquear IDOR em POST /portal/atendimento/:id/mensagem para conversa de outro cliente', async () => {
        const { env, data } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('/portal/atendimento/2/mensagem', {
            method: 'POST',
            headers: {
                Cookie: cookieA,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ message: 'Tentativa de invasão' }).toString()
        }, env);

        expect(res.status).toBe(403);
        expect(data.conversation_messages.length).toBe(0);
    });

    it('P1: deve aplicar RBAC granular bloqueando "attendant" em /admin/usuarios e /admin/configuracoes', async () => {
        const { env } = await createSecurityMockEnv();
        const attendantCookie = await signedCookie('sess_attendant');

        const usersRes = await app.request('/admin/usuarios', {
            headers: { Cookie: attendantCookie }
        }, env);
        expect(usersRes.status).toBe(403);

        const settingsRes = await app.request('/admin/configuracoes', {
            headers: { Cookie: attendantCookie }
        }, env);
        expect(settingsRes.status).toBe(403);
    });

    it('P1: deve bloquear requisição POST cross-origin por proteção CSRF', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('https://gundjatech.casimirogundja.workers.dev/minha-conta/perfil', {
            method: 'POST',
            headers: {
                Cookie: cookieA,
                Origin: 'https://site-malicioso.evil',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ name: 'Hacked' }).toString()
        }, env);

        expect(res.status).toBe(403);
    });

    it('P1: deve escapar XSS refletido na query string de /minha-conta', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('/minha-conta?error=%3Cscript%3Ealert(1)%3C/script%3E', {
            headers: { Cookie: cookieA }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        expect(html).not.toContain('<script>alert(1)</script>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('P1: destroyAllUserSessions deve invalidar também a sessão em cache no KV_SESSIONS', async () => {
        const { env, kvStore } = await createSecurityMockEnv();
        expect(kvStore.has('session:sess_attendant')).toBe(true);

        await destroyAllUserSessions(env, 2);

        expect(kvStore.has('session:sess_attendant')).toBe(false);
    });

    it('P2: deve permitir download autenticado de anexo do próprio projeto em /portal/projetos/:id/anexos/:attId', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('/portal/projetos/10/anexos/50', {
            headers: { Cookie: cookieA }
        }, env);

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/pdf');
        expect(res.headers.get('content-disposition')).toContain('contrato.pdf');
    });

    it('P2: deve aplicar Rate Limiting (429 Too Many Requests) ao exceder tentativas em /auth/login', async () => {
        const { env } = await createSecurityMockEnv();
        const rlStore = new Map<string, string>();
        env.KV_CACHE = {
            get: async (k: string) => rlStore.get(k) ?? null,
            put: async (k: string, v: string) => { rlStore.set(k, v); }
        } as any;

        let lastStatus = 0;
        for (let i = 0; i < 16; i++) {
            const res = await app.request('/auth/login', {
                method: 'POST',
                headers: {
                    'cf-connecting-ip': '203.0.113.99',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json'
                },
                body: new URLSearchParams({
                    email: 'naoexiste@gundjatech.com',
                    password: 'errada'
                }).toString()
            }, env);
            lastStatus = res.status;
        }

        expect(lastStatus).toBe(429);
    });

    it('P2: deve ocultar /admin/usuarios e /admin/configuracoes na sidebar para cargo "attendant"', async () => {
        const { env } = await createSecurityMockEnv();
        const attendantCookie = await signedCookie('sess_attendant');

        const res = await app.request('/admin/dashboard', {
            headers: { Cookie: attendantCookie }
        }, env);

        expect(res.status).toBe(200);
        const html = await res.text();
        const sidebarMatch = html.match(/<aside id="gt-admin-sidebar"[\s\S]*?<\/aside>/);
        const sidebarHtml = sidebarMatch ? sidebarMatch[0] : html;
        expect(sidebarHtml).toContain('/admin/atendimento');
        expect(sidebarHtml).not.toContain('href="/admin/usuarios"');
        expect(sidebarHtml).not.toContain('href="/admin/configuracoes"');
        expect(sidebarHtml).not.toContain('href="/admin/financeiro"');
    });

    it('P2: deve bloquear acesso anônimo a arquivos sob o prefixo /uploads/private/*', async () => {
        const { env } = await createSecurityMockEnv();

        const res = await app.request('/uploads/private/contrato-sigiloso.pdf', {}, env);
        expect(res.status).toBe(401);
    });

    it('P2: deve rejeitar webhook WhatsApp com assinatura HMAC inválida quando WHATSAPP_APP_SECRET estiver configurado', async () => {
        const { env } = await createSecurityMockEnv();
        (env as any).WHATSAPP_APP_SECRET = 'meta_app_secret_top_secret';

        const res = await app.request('/api/webhooks/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': 'sha256=assinatura_falsa_invalida'
            },
            body: JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
        }, env);

        expect(res.status).toBe(401);
    });

    it('P0: deve exigir SESSION_SECRET explícito em hmacSign (sem segredo hardcoded)', async () => {
        await expect(hmacSign('mensagem', '')).rejects.toThrow();
        await expect(hmacSign('mensagem', undefined)).rejects.toThrow();
    });

    it('P0: deve bloquear upload de arquivos HTML/SVG em /api/uploads (proteção Stored XSS)', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const formData = new FormData();
        formData.append('file', new File(['<svg onload="alert(1)"></svg>'], 'payload.svg', { type: 'image/svg+xml' }));

        const res = await app.request('/api/uploads', {
            method: 'POST',
            headers: { Cookie: cookieA },
            body: formData
        }, env);

        expect(res.status).toBe(422);
    });

    it('P0: deve bloquear cliente de acessar /uploads/private/* diretamente (IDOR) e servir private/ com no-store para staff', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieClient = await signedCookie('sess_client_a');
        const cookieAdmin = await signedCookie('sess_superadmin');

        const clientRes = await app.request('/uploads/private/contrato-sigiloso.pdf', {
            headers: { Cookie: cookieClient }
        }, env);
        expect(clientRes.status).toBe(403);

        const staffRes = await app.request('/uploads/private/contrato-sigiloso.pdf', {
            headers: { Cookie: cookieAdmin }
        }, env);
        expect(staffRes.status).toBe(200);
        expect(staffRes.headers.get('cache-control')).toBe('private, no-store');
    });

    it('P0: deve aceitar webhook WhatsApp da Meta com assinatura HMAC-SHA256 Hex válida', async () => {
        const { env } = await createSecurityMockEnv();
        const secret = 'meta_app_secret_top_secret';
        (env as any).WHATSAPP_APP_SECRET = secret;
        const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
        const validHex = await hmacSignHex(body, secret);

        const res = await app.request('/api/webhooks/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': `sha256=${validHex}`
            },
            body
        }, env);

        expect(res.status).toBe(200);
    });

    it('P0: deve acionar Trava Contábil ao tentar excluir cliente com fatura já paga', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieAdmin = await signedCookie('sess_superadmin');

        const res = await app.request('/admin/clientes/100/excluir', {
            method: 'POST',
            headers: { Cookie: cookieAdmin }
        }, env);

        expect(res.status).toBe(302);
        const location = decodeURIComponent(res.headers.get('location') || '');
        expect(location).toContain('Trava Contábil');
    });

    it('P1: deve exigir permissão *.manage nas rotas POST do Admin (bloqueando attendant em clientes e orçamentos)', async () => {
        const { env } = await createSecurityMockEnv();
        const attendantCookie = await signedCookie('sess_attendant');

        const createClientRes = await app.request('/admin/clientes', {
            method: 'POST',
            headers: {
                Cookie: attendantCookie,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ name: 'Invasor', email: 'invasor@test.com' }).toString()
        }, env);
        expect(createClientRes.status).toBe(403);

        const deleteQuoteRes = await app.request('/admin/orcamentos/77/excluir', {
            method: 'POST',
            headers: { Cookie: attendantCookie }
        }, env);
        expect(deleteQuoteRes.status).toBe(403);
    });

    it('P1: deve retornar 404 em POST /api/chat/message para visitor_token inexistente (sem cair na conversa #1)', async () => {
        const { env } = await createSecurityMockEnv();

        const res = await app.request('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitor_token: 'token_inexistente_xyz', message: 'Tentativa de injeção' })
        }, env);

        expect(res.status).toBe(404);
    });

    it('P1: deve aplicar CSRF em rotas /api/account/* e /api/uploads autenticadas por cookie', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('https://gundjatech.casimirogundja.workers.dev/api/account/perfil', {
            method: 'POST',
            headers: {
                Cookie: cookieA,
                Origin: 'https://atacante.evil',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ name: 'CSRF' }).toString()
        }, env);

        expect(res.status).toBe(403);
    });

    it('P1: deve ocultar orçamento em rascunho (draft) em GET /portal/orcamentos/:id', async () => {
        const { env } = await createSecurityMockEnv();
        const cookieA = await signedCookie('sess_client_a');

        const res = await app.request('/portal/orcamentos/77', {
            headers: { Cookie: cookieA }
        }, env);

        expect(res.status).toBe(404);
    });

    it('P1: deve rejeitar token de recuperação de senha expirado (> 60 min)', async () => {
        const { env, data } = await createSecurityMockEnv();
        data.password_reset_tokens[0].token = await sha256Hex('token_expirado_123');

        const res = await app.request('/redefinir-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                email: 'a@cliente.com',
                token: 'token_expirado_123',
                password: 'NovaSenhaForte!2026'
            }).toString()
        }, env);

        expect(res.status).toBe(400);
    });
});
