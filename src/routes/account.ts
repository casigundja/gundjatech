import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { findUserById, updateUserProfile, updateUserPassword } from '../lib/users';
import { verifyPassword, hashPassword } from '../lib/password';
import { destroyAllUserSessionsExcept } from '../lib/session';
import { putFile, generateStorageKey } from '../lib/storage';
import { AccountView } from '../views/account';

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

    const successMsg = c.req.query('success') || null;
    const errorMsg = c.req.query('error') || null;

    return c.html(
        AccountView({
            user,
            successMessage: successMsg,
            errorMessage: errorMsg,
        }) as any
    );
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
