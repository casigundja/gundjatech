import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { hmacSign } from '../src/lib/crypto';
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
        project_attachments: [
            { id: 50, project_id: 10, file_name: 'contrato.pdf', file_path: 'projects/contrato.pdf', is_client_visible: 1 }
        ],
        sessions: [
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

    kvStore.set('session:sess_attendant', data.sessions[0].payload);
    kvStore.set('session:sess_client_a', data.sessions[1].payload);

    const mockDb = {
        prepare: (query: string) => {
            const q = query.toLowerCase();
            return {
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
        get: async (key: string) => {
            if (key === 'projects/contrato.pdf') {
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
});
