import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password';
import { hmacSign, hmacVerify, timingSafeEqual } from '../src/lib/crypto';
import { hasPermission } from '../src/lib/rbac';
import app from '../src/index';

describe('Fase 3: Autenticação & Criptografia Web Crypto', () => {
    it('deve gerar e verificar hashes de senha com PBKDF2-SHA256 (600k iterações)', async () => {
        const password = 'MinhaSenhaSegura#2026';
        const hash = await hashPassword(password);

        expect(hash).toContain('pbkdf2_sha256$600000$');

        const verification = await verifyPassword(password, hash);
        expect(verification.valid).toBe(true);
        expect(verification.needsRehash).toBe(false);

        const invalidVerification = await verifyPassword('SenhaErrada#123', hash);
        expect(invalidVerification.valid).toBe(false);
    });

    it('deve assinar e verificar cookies de sessão com HMAC-SHA256 e resistir a adulteração', async () => {
        const secret = 'super_secret_test_key_at_least_32_chars_long';
        const sessionId = 'session_token_xyz123';

        const signature = await hmacSign(sessionId, secret);
        const isValid = await hmacVerify(sessionId, signature, secret);
        expect(isValid).toBe(true);

        // Se o token for adulterado
        const isTamperedValid = await hmacVerify(sessionId + '_hacked', signature, secret);
        expect(isTamperedValid).toBe(false);

        // Se a assinatura for adulterada
        const isTamperedSigValid = await hmacVerify(sessionId, signature + 'bad', secret);
        expect(isTamperedSigValid).toBe(false);
    });

    it('deve validar permissões e regras RBAC corretamente', () => {
        // SuperAdmin tem acesso total
        expect(hasPermission('superadmin', 'qualquer.coisa')).toBe(true);

        // Admin tem acesso administrativo e bypass para portal
        expect(hasPermission('admin', 'clients.manage')).toBe(true);
        expect(hasPermission('admin', 'portal.access')).toBe(true);

        // Client tem acesso ao portal, mas NÃO a rotas administrativas
        expect(hasPermission('client', 'portal.access')).toBe(true);
        expect(hasPermission('client', 'admin.dashboard.view')).toBe(false);
        expect(hasPermission('client', 'finance.manage')).toBe(false);

        // Attendant tem acesso a chat e leads, mas não a finanças
        expect(hasPermission('attendant', 'chat.manage')).toBe(true);
        expect(hasPermission('attendant', 'finance.manage')).toBe(false);
    });

    it('deve responder 200 no health check /up', async () => {
        const res = await app.request('/up');
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('OK');
    });

    it('deve retornar 422 quando login for submetido sem email ou senha via JSON', async () => {
        const res = await app.request('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email: '', password: '' })
        });

        expect(res.status).toBe(422);
    });

    it('deve redirecionar para /login ao tentar acessar /admin/dashboard sem sessão', async () => {
        const res = await app.request('/admin/dashboard');
        expect(res.status).toBe(302);
        expect(res.headers.get('Location')).toBe('/login');
    });

    it('deve retornar 401 ao tentar acessar /admin/dashboard sem sessão via API JSON', async () => {
        const res = await app.request('/admin/dashboard', {
            headers: {
                'Accept': 'application/json'
            }
        });

        expect(res.status).toBe(401);
        const data = await res.json() as { error: string };
        expect(data.error).toBe('Unauthenticated');
    });

    it('deve validar timing-safe comparison contra timing attacks', () => {
        expect(timingSafeEqual('mesma-string', 'mesma-string')).toBe(true);
        expect(timingSafeEqual('string-a', 'string-b')).toBe(false);
        expect(timingSafeEqual('tamanho-diferente', 'curto')).toBe(false);
    });

    it('deve limpar sessões expiradas via Cron Trigger (scheduled handler) e suportar rota /auth/logout', async () => {
        let prunedCalled = false;
        const mockEnv = {
            SESSION_SECRET: 'test_secret_for_signing_cookies_32bytes!',
            DB: {
                prepare: (sql: string) => ({
                    bind: (..._args: unknown[]) => ({
                        run: async () => {
                            if (sql.toLowerCase().includes('delete from sessions where last_activity <')) {
                                prunedCalled = true;
                            }
                            return { meta: { changes: 3 } };
                        },
                        first: async () => ({
                            id: 'sess_test',
                            payload: JSON.stringify({ id: 1, name: 'Admin', email: 'a@g.com', role: 'admin', is_active: true }),
                            last_activity: Math.floor(Date.now() / 1000)
                        })
                    })
                })
            }
        };

        const scheduledFn = (app as unknown as { scheduled: (e: unknown, env: unknown, c: unknown) => Promise<void> }).scheduled;
        expect(typeof scheduledFn).toBe('function');
        await scheduledFn({}, mockEnv, {});
        expect(prunedCalled).toBe(true);

        const sig = await hmacSign('sess_test', mockEnv.SESSION_SECRET);
        const logoutRes = await app.request('/auth/logout', {
            method: 'POST',
            headers: { Cookie: `gt_session=sess_test.${sig}` }
        }, mockEnv as never);
        expect(logoutRes.status).toBe(302);
        expect(logoutRes.headers.get('Location')).toBe('/login');
    });
});
