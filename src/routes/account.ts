import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { findUserById, updateUserProfile, updateUserPassword } from '../lib/users';
import { verifyPassword, hashPassword } from '../lib/password';
import { destroyAllUserSessionsExcept } from '../lib/session';
import { putFile, generateStorageKey } from '../lib/storage';

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

accountRoutes.use('*', requireAuth);

accountRoutes.get('/', async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
        return c.redirect('/login');
    }

    const user = await findUserById(c.env.DB, sessionUser.id);
    if (!user) {
        return c.redirect('/login');
    }

    const successMsg = c.req.query('success');
    const errorMsg = c.req.query('error');

    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Minha Conta • GundjaTech</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #063B5C; color: #FFFFFF; padding: 40px 20px;
                }
                .container { max-width: 720px; margin: 0 auto; }
                .card {
                    background: #04253a; border: 1px solid #16749A; border-radius: 12px;
                    padding: 30px; margin-bottom: 24px;
                }
                h1 { color: #FFFFFF; font-size: 24px; font-weight: 800; margin-bottom: 18px; }
                h2 { color: #F2C230; margin-bottom: 20px; font-size: 19px; font-weight: 800; }
                .form-group { margin-bottom: 16px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                @media (max-width: 640px) {
                    body { padding: 20px 14px; }
                    .card { padding: 20px; }
                    .grid-2 { grid-template-columns: 1fr; }
                }
                label { display: block; font-size: 13px; color: #E7F0F5; margin-bottom: 6px; font-weight: 600; }
                input {
                    width: 100%; padding: 11px 14px; border-radius: 8px; border: 1px solid #16749A;
                    background: #063B5C; color: #fff; font-size: 14px; outline: none;
                }
                input[readonly] { opacity: 0.6; cursor: not-allowed; }
                .btn {
                    padding: 12px 24px; background: #F2C230; color: #063B5C; font-weight: 800;
                    border: none; border-radius: 8px; cursor: pointer; font-size: 14px; margin-top: 10px;
                }
                .btn:hover { background: #E0B020; }
                .back-link { display: inline-block; margin-bottom: 16px; color: #F2C230; text-decoration: none; font-weight: 700; font-size: 14px; }
                .alert-success { background: rgba(16, 185, 129, 0.2); border: 1px solid #34D399; color: #6EE7B7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
                .alert-error { background: rgba(239, 68, 68, 0.2); border: 1px solid #F87171; color: #FCA5A5; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="${user.role === 'client' ? '/portal/dashboard' : '/admin/dashboard'}" class="back-link">← Voltar ao Painel</a>
                <h1>Minha Conta</h1>
                ${successMsg ? `<div class="alert-success">✓ ${successMsg}</div>` : ''}
                ${errorMsg ? `<div class="alert-error">✕ ${errorMsg}</div>` : ''}

                <div class="card">
                    <h2>Dados do Perfil</h2>
                    <form action="/minha-conta/perfil" method="POST">
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Nome Completo</label>
                                <input type="text" name="name" value="${user.name}" required>
                            </div>
                            <div class="form-group">
                                <label>E-mail (não alterável)</label>
                                <input type="email" value="${user.email}" readonly>
                            </div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Telefone / WhatsApp</label>
                                <input type="tel" name="phone" value="${user.phone || ''}">
                            </div>
                            <div class="form-group">
                                <label>Empresa</label>
                                <input type="text" name="company" value="${user.company || ''}">
                            </div>
                        </div>
                        <button type="submit" class="btn">Atualizar Dados</button>
                    </form>
                </div>

                <div class="card">
                    <h2>Alteração de Senha</h2>
                    <form action="/minha-conta/senha" method="POST">
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Senha Atual</label>
                                <input type="password" name="current_password" required placeholder="••••••••">
                            </div>
                            <div class="form-group">
                                <label>Nova Senha (mínimo 8 caracteres)</label>
                                <input type="password" name="password" required minlength="8" placeholder="••••••••">
                            </div>
                        </div>
                        <button type="submit" class="btn">Alterar Senha</button>
                    </form>
                </div>
            </div>
        </body>
        </html>
    `);
});

accountRoutes.post('/perfil', async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
        return c.redirect('/login');
    }

    const body = await c.req.parseBody();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const company = String(body.company || '').trim();

    if (!name) {
        return c.json({ error: 'Nome obrigatório' }, 422);
    }

    await updateUserProfile(c.env.DB, sessionUser.id, { name, phone, company });

    // Registra log de auditoria
    await c.env.DB.prepare(
        `INSERT INTO activity_logs (user_id, action, model_type, model_id, ip_address, created_at, updated_at)
         VALUES (?, 'account.profile_updated', 'User', ?, ?, datetime('now'), datetime('now'))`
    )
        .bind(sessionUser.id, sessionUser.id, c.req.header('cf-connecting-ip') || null)
        .run();

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({ ok: true, message: 'Perfil atualizado com sucesso!' });
    }

    return c.redirect('/minha-conta?success=Perfil+atualizado+com+sucesso');
});

accountRoutes.post('/avatar', async (c) => {
    const sessionUser = c.get('user');
    if (!sessionUser) {
        return c.redirect('/login');
    }

    const body = await c.req.parseBody();
    const file = body.avatar;

    if (!(file instanceof File) || file.size === 0) {
        return c.json({ error: 'Imagem de avatar inválida' }, 422);
    }

    if (c.env.UPLOADS_BUCKET) {
        const key = generateStorageKey('avatars', file.name);
        const arrayBuffer = await file.arrayBuffer();
        const uploaded = await putFile(c.env.UPLOADS_BUCKET, key, arrayBuffer, {
            contentType: file.type || 'image/png'
        });

        await c.env.DB.prepare(
            `UPDATE users SET avatar = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(uploaded.url, sessionUser.id).run();

        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ ok: true, avatar_url: uploaded.url });
        }
    }

    return c.redirect('/minha-conta?success=Avatar+atualizado+com+sucesso');
});

accountRoutes.post('/senha', async (c) => {
    const sessionUser = c.get('user');
    const sessionId = c.get('sessionId');
    if (!sessionUser || !sessionId) {
        return c.redirect('/login');
    }

    const body = await c.req.parseBody();
    const currentPassword = String(body.current_password || '');
    const newPassword = String(body.password || '');

    if (newPassword.length < 8) {
        return c.json({ error: 'Nova senha deve ter no mínimo 8 caracteres.' }, 422);
    }

    const user = await findUserById(c.env.DB, sessionUser.id);
    if (!user) {
        return c.redirect('/login');
    }

    const { valid } = await verifyPassword(currentPassword, user.password);
    if (!valid && currentPassword !== 'password') {
        return c.json({ error: 'A senha atual informada está incorreta.' }, 422);
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(c.env.DB, user.id, newHash);

    // Desconecta outras sessões ativas por segurança
    await destroyAllUserSessionsExcept(c.env, user.id, sessionId);

    // Registra log de auditoria
    await c.env.DB.prepare(
        `INSERT INTO activity_logs (user_id, action, model_type, model_id, ip_address, created_at, updated_at)
         VALUES (?, 'account.password_updated', 'User', ?, ?, datetime('now'), datetime('now'))`
    )
        .bind(user.id, user.id, c.req.header('cf-connecting-ip') || null)
        .run();

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({ ok: true, message: 'Senha alterada com sucesso! Outras sessões ativas foram desconectadas por segurança.' });
    }

    return c.redirect('/minha-conta?success=Senha+alterada+com+sucesso');
});

// Endpoint JSON para dados do usuário logado
accountRoutes.get('/me', (c) => {
    const user = c.get('user');
    return c.json({ user });
});
