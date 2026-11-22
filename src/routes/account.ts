import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { findUserById, updateUserProfile, updateUserPassword } from '../lib/users';
import { verifyPassword, hashPassword } from '../lib/password';
import { destroyAllUserSessionsExcept } from '../lib/session';
import { putFile, generateStorageKey } from '../lib/storage';

export const accountRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

accountRoutes.use('*', requireAuth);

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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
    const backHref = user.role === 'client' ? '/portal/dashboard' : '/admin/dashboard';
    const initials = escapeHtml((user.name || 'GT').slice(0, 2).toUpperCase());

    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Minha Conta • GundjaTech</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" type="image/svg+xml" href="/img/favicon.svg?v=gt-icon4">
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                :root {
                    --gt-gold: #F2C230;
                    --gt-gold-hover: #E0B020;
                    --gt-dark: #063B5C;
                    --gt-blue: #16749A;
                    --gt-ice: #E7F0F5;
                    --gt-border: #CFE0EB;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: var(--gt-ice);
                    color: var(--gt-dark);
                    min-height: 100vh;
                    padding: 32px 20px;
                }
                .container { max-width: 780px; margin: 0 auto; }
                .top-bar {
                    display: flex; align-items: center; justify-content: space-between;
                    gap: 12px; flex-wrap: wrap; margin-bottom: 22px;
                }
                .back-link {
                    display: inline-flex; align-items: center; gap: 6px;
                    color: var(--gt-blue); text-decoration: none; font-weight: 700; font-size: 13px;
                    padding: 8px 14px; border-radius: 10px; background: #FFFFFF;
                    border: 1px solid var(--gt-border); transition: all 0.15s ease;
                }
                .back-link:hover { border-color: var(--gt-blue); color: var(--gt-dark); }
                .header-card {
                    background: linear-gradient(135deg, #042840 0%, #063B5C 60%, #16749A 100%);
                    color: #FFFFFF; border-radius: 18px; padding: 24px 28px; margin-bottom: 22px;
                    display: flex; align-items: center; gap: 16px;
                    box-shadow: 0 14px 32px -12px rgba(6, 59, 92, 0.35);
                }
                .avatar {
                    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
                    background: rgba(242, 194, 48, 0.16); border: 1.5px solid rgba(242, 194, 48, 0.6);
                    color: var(--gt-gold); font-size: 18px; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                }
                .header-card h1 { font-size: 20px; font-weight: 800; color: #FFFFFF; }
                .header-card p { font-size: 12.5px; color: #D5E6F0; margin-top: 3px; }
                .card {
                    background: #FFFFFF; border: 1px solid var(--gt-border); border-radius: 16px;
                    padding: 26px; margin-bottom: 20px;
                    box-shadow: 0 6px 20px -10px rgba(6, 59, 92, 0.12);
                }
                .card h2 {
                    color: var(--gt-dark); font-size: 15px; font-weight: 800;
                    padding-bottom: 12px; margin-bottom: 18px; border-bottom: 1px solid var(--gt-ice);
                }
                .form-group { margin-bottom: 16px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                label {
                    display: block; font-size: 11px; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.04em; color: #527287; margin-bottom: 6px;
                }
                input {
                    width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #BDD2DF;
                    background: #FFFFFF; color: var(--gt-dark); font-size: 13px; font-family: inherit;
                    outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                input:focus { border-color: var(--gt-blue); box-shadow: 0 0 0 3px rgba(22, 116, 154, 0.14); }
                input[readonly] { background: #F4F8FB; color: #67879C; cursor: not-allowed; }
                .btn {
                    padding: 11px 22px; background: var(--gt-gold); color: var(--gt-dark);
                    font-weight: 800; border: none; border-radius: 10px; cursor: pointer;
                    font-size: 13px; font-family: inherit; transition: background 0.15s ease;
                }
                .btn:hover { background: var(--gt-gold-hover); }
                .alert-success {
                    background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46;
                    padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 13px; font-weight: 600;
                }
                .alert-error {
                    background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B;
                    padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 13px; font-weight: 600;
                }
                @media (max-width: 640px) {
                    body { padding: 18px 12px; }
                    .card, .header-card { padding: 18px; }
                    .grid-2 { grid-template-columns: 1fr; }
                    .btn { width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="top-bar">
                    <a href="${backHref}" class="back-link">&larr; Voltar ao Painel</a>
                </div>

                <div class="header-card">
                    <div class="avatar">${initials}</div>
                    <div>
                        <h1>${escapeHtml(user.name)}</h1>
                        <p>${escapeHtml(user.email)}</p>
                    </div>
                </div>

                ${successMsg ? `<div class="alert-success">${escapeHtml(successMsg)}</div>` : ''}
                ${errorMsg ? `<div class="alert-error">${escapeHtml(errorMsg)}</div>` : ''}

                <div class="card">
                    <h2>Dados do Perfil</h2>
                    <form action="/minha-conta/perfil" method="POST">
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Nome Completo</label>
                                <input type="text" name="name" value="${escapeHtml(user.name)}" required>
                            </div>
                            <div class="form-group">
                                <label>E-mail (não alterável)</label>
                                <input type="email" value="${escapeHtml(user.email)}" readonly>
                            </div>
                        </div>
                        <div class="grid-2">
                            <div class="form-group">
                                <label>Telefone / WhatsApp</label>
                                <input type="tel" name="phone" value="${escapeHtml(user.phone || '')}">
                            </div>
                            <div class="form-group">
                                <label>Empresa</label>
                                <input type="text" name="company" value="${escapeHtml(user.company || '')}">
                            </div>
                        </div>
                        <button type="submit" class="btn">Atualizar Dados</button>
                    </form>
                </div>

                <div class="card">
                    <h2>Segurança &amp; Alteração de Senha</h2>
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
    if (!valid) {
        return c.json({ error: 'A senha atual informada está incorreta.' }, 422);
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(c.env.DB, user.id, newHash);

    // Desconecta outras sessões ativas (D1 + KV) por segurança
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
