import { Hono } from 'hono';
import { Env, AppVariables, UserRole } from '../types/env';
import { requireAuth, requireGuest } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import { verifyPassword, hashPassword } from '../lib/password';
import { createSession, destroySession, destroyAllUserSessions } from '../lib/session';
import { findUserByEmail, createUser, updateUserPassword } from '../lib/users';
import { generateRandomToken, sha256Hex, timingSafeEqual } from '../lib/crypto';
import { sendPasswordResetEmail } from '../lib/email';
import { renderAuthBladePage } from '../views/auth-blade-templates';

export const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

authRoutes.get('/cadastrar', (c) => c.redirect('/cadastro'));
authRoutes.get('/cliente', (c) => c.redirect('/portal'));

// ----------------------------------------------------
// LOGIN (Estrutura idêntica a resources/views/auth/login.blade.php)
// ----------------------------------------------------
authRoutes.get('/login', requireGuest, (c) => {
    return c.html(
        renderAuthBladePage('login', {
            error: c.req.query('error') || null,
            status: c.req.query('status') || null,
            email: c.req.query('email') || null
        })
    );
});

authRoutes.post('/login', rateLimit({ keyPrefix: 'auth_login', maxRequests: 15, windowSeconds: 300 }), async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const remember = body.remember === '1' || body.remember === 'true';

    if (!email || !password) {
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Credenciais inválidas', message: 'Preencha todos os campos.' }, 422);
        }
        return c.redirect('/login?error=' + encodeURIComponent('Preencha seu e-mail e senha.'));
    }

    const user = await findUserByEmail(c.env.DB, email);
    if (!user) {
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Unauthorized', message: 'As credenciais informadas não correspondem aos nossos registros.' }, 401);
        }
        return c.redirect('/login?error=' + encodeURIComponent('E-mail ou senha incorretos.'));
    }

    if (!user.is_active) {
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Forbidden', message: 'Esta conta de usuário está desativada.' }, 403);
        }
        return c.redirect('/login?error=' + encodeURIComponent('Sua conta de usuário está desativada.'));
    }

    const { valid, needsRehash } = await verifyPassword(password, user.password);

    if (!valid) {
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Unauthorized', message: 'As credenciais informadas não correspondem aos nossos registros.' }, 401);
        }
        return c.redirect('/login?error=' + encodeURIComponent('E-mail ou senha incorretos.'));
    }

    // Se a senha precisar de re-hash para PBKDF2, atualiza no D1 de forma transparente
    if (needsRehash) {
        const newHash = await hashPassword(password);
        await updateUserPassword(c.env.DB, user.id, newHash);
    }

    // Registra último login
    await c.env.DB.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").bind(user.id).run();

    const sessionPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: Boolean(user.is_active)
    };

    const { cookieHeader } = await createSession(
        c.env,
        sessionPayload,
        c.req.header('cf-connecting-ip'),
        c.req.header('user-agent'),
        remember
    );

    c.header('Set-Cookie', cookieHeader);

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({ ok: true, message: 'Autenticado com sucesso', user: sessionPayload });
    }

    const redirectUrl = sessionPayload.role === 'client' ? '/portal/dashboard' : '/admin/dashboard';
    return c.redirect(redirectUrl);
});

// ----------------------------------------------------
// LOGOUT & LOGOUT ALL
// ----------------------------------------------------
authRoutes.post('/logout', requireAuth, async (c) => {
    const sessionId = c.get('sessionId');
    if (sessionId) {
        const clearCookie = await destroySession(c.env, sessionId);
        c.header('Set-Cookie', clearCookie);
    }

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({ ok: true, message: 'Sessão encerrada com sucesso.' });
    }

    return c.redirect('/login');
});

authRoutes.post('/logout-all', requireAuth, async (c) => {
    const user = c.get('user');
    const sessionId = c.get('sessionId');

    if (user) {
        await destroyAllUserSessions(c.env, user.id);
    }
    if (sessionId) {
        const clearCookie = await destroySession(c.env, sessionId);
        c.header('Set-Cookie', clearCookie);
    }

    return c.json({ ok: true, message: 'Todas as sessões ativas foram desconectadas.' });
});

// ----------------------------------------------------
// CADASTRO / REGISTRO (Estrutura idêntica a resources/views/auth/register.blade.php)
// ----------------------------------------------------
authRoutes.get('/cadastro', requireGuest, (c) => {
    return c.html(
        renderAuthBladePage('register', {
            error: c.req.query('error') || null
        })
    );
});

authRoutes.post('/cadastro', rateLimit({ keyPrefix: 'auth_register', maxRequests: 10, windowSeconds: 600 }), async (c) => {
    const body = await c.req.parseBody();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const company = String(body.company || body.company_name || '').trim();
    const phone = String(body.phone || '').trim();

    if (!name || !email || password.length < 6) {
        return c.json({ error: 'Campos inválidos', message: 'Preencha nome, email e senha com no mínimo 6 caracteres.' }, 422);
    }

    const existingUser = await findUserByEmail(c.env.DB, email);
    if (existingUser) {
        return c.json({ error: 'Email já cadastrado', message: 'Este endereço de e-mail já possui uma conta.' }, 422);
    }

    // Regra de Governança & Segurança:
    // Impede criação de usuários fantasmas/desnecessários em /cadastro se o e-mail não possuir
    // um cadastro de cliente com Orçamento Enviado/Aprovado, Projeto Ativo ou Serviço Contínuo.
    let authorizedClient: { id: number } | null = null;
    try {
        if (c.env.DB) {
            const clientRow = await c.env.DB.prepare(
                `SELECT c.id
                 FROM clients c
                 WHERE lower(c.email) = lower(?)
                   AND (
                       EXISTS (SELECT 1 FROM quotations q WHERE q.client_id = c.id AND q.status IN ('sent', 'approved'))
                       OR EXISTS (SELECT 1 FROM projects p WHERE p.client_id = c.id AND p.status IN ('planning', 'in_progress', 'reviewing'))
                       OR EXISTS (SELECT 1 FROM domains d WHERE d.client_id = c.id AND d.status = 'active')
                       OR EXISTS (SELECT 1 FROM advertising_campaigns a WHERE a.client_id = c.id AND a.status = 'active')
                   )
                 LIMIT 1`
            ).bind(email).first<{ id: number }>();
            authorizedClient = clientRow || null;
        }
    } catch {}

    if (!authorizedClient) {
        const msg = 'O acesso ao Portal do Cliente é liberado automaticamente assim que o seu orçamento oficial for emitido pela nossa equipe. Enquanto sua solicitação estiver em análise inicial, acompanhe pelo protocolo em /acompanhar-solicitacao.';
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Acesso restrito a clientes com orçamento ou projeto ativo', message: msg }, 403);
        }
        return c.redirect('/cadastro?error=' + encodeURIComponent(msg));
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser(c.env.DB, {
        name,
        email,
        passwordHash,
        role: 'client',
        phone,
        company
    });

    const { cookieHeader } = await createSession(
        c.env,
        newUser,
        c.req.header('cf-connecting-ip'),
        c.req.header('user-agent'),
        false
    );

    c.header('Set-Cookie', cookieHeader);

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({ ok: true, message: 'Cadastro realizado com sucesso!', user: newUser }, 201);
    }

    return c.redirect('/portal/dashboard');
});

// ----------------------------------------------------
// RECUPERAÇÃO DE SENHA (Estrutura idêntica a resources/views/auth/forgot-password.blade.php)
// ----------------------------------------------------
authRoutes.get('/esqueci-minha-senha', requireGuest, (c) => {
    return c.html(
        renderAuthBladePage('forgot', {
            error: c.req.query('error') || null,
            status: c.req.query('status') || null
        })
    );
});

authRoutes.post('/esqueci-minha-senha', rateLimit({ keyPrefix: 'auth_forgot', maxRequests: 5, windowSeconds: 600 }), async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
        return c.json({ error: 'Email obrigatório' }, 422);
    }

    const user = await findUserByEmail(c.env.DB, email);
    if (user) {
        const token = generateRandomToken(32);
        const tokenHash = await sha256Hex(token);
        await c.env.DB.prepare(
            `INSERT INTO password_reset_tokens (email, token, created_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT(email) DO UPDATE SET token = excluded.token, created_at = datetime('now')`
        )
            .bind(email, tokenHash)
            .run();

        await sendPasswordResetEmail(c.env, email, user.name, token);
    }

    return c.html(
        renderAuthBladePage('forgot', {
            status: 'Se o endereço de e-mail estiver cadastrado em nosso sistema, você receberá um link com instruções para redefinir sua senha.'
        })
    );
});

// ----------------------------------------------------
// REDEFINIR SENHA (Estrutura idêntica a resources/views/auth/reset-password.blade.php)
// ----------------------------------------------------
authRoutes.get('/redefinir-senha/:token', (c) => {
    const token = c.req.param('token');
    const email = c.req.query('email') || '';

    return c.html(
        renderAuthBladePage('reset', {
            token,
            email,
            error: c.req.query('error') || null
        })
    );
});

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 60 minutos

authRoutes.post('/redefinir-senha', rateLimit({ keyPrefix: 'auth_reset', maxRequests: 10, windowSeconds: 600 }), async (c) => {
    const body = await c.req.parseBody();
    const token = String(body.token || '');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!token || !email || password.length < 6) {
        return c.json({ error: 'Dados inválidos' }, 422);
    }

    const resetRecord = await c.env.DB.prepare(
        `SELECT token, created_at FROM password_reset_tokens WHERE email = ?`
    )
        .bind(email)
        .first<{ token: string; created_at: string }>();

    const providedHash = await sha256Hex(token);
    const tokenMatches = Boolean(
        resetRecord &&
        (timingSafeEqual(resetRecord.token, providedHash) || timingSafeEqual(resetRecord.token, token))
    );

    let isExpired = false;
    if (resetRecord?.created_at) {
        const normalizedIso = resetRecord.created_at.includes('T')
            ? resetRecord.created_at
            : resetRecord.created_at.replace(' ', 'T') + 'Z';
        const createdMs = Date.parse(normalizedIso);
        if (Number.isFinite(createdMs) && Date.now() - createdMs > PASSWORD_RESET_TTL_MS) {
            isExpired = true;
        }
    }

    if (!resetRecord || !tokenMatches || isExpired) {
        if (isExpired) {
            await c.env.DB.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(email).run();
        }
        return c.html(`
            <body style="font-family: sans-serif; background: #063B5C; color: #fff; text-align: center; padding: 80px 20px;">
                <h2 style="color: #f87171;">Token Inválido ou Expirado</h2>
                <p>O link de recuperação utilizado não é mais válido. Por favor, solicite um novo.</p>
                <a href="/esqueci-minha-senha" style="color: #F2C230;">Solicitar novo link</a>
            </body>
        `, 400);
    }

    const user = await findUserByEmail(c.env.DB, email);
    if (!user) {
        return c.redirect('/login');
    }

    const newHash = await hashPassword(password);
    await updateUserPassword(c.env.DB, user.id, newHash);

    // Remove token usado e revoga todas as sessões anteriores
    await c.env.DB.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(email).run();
    await destroyAllUserSessions(c.env, user.id);

    return c.html(`
        <body style="font-family: sans-serif; background: #063B5C; color: #fff; text-align: center; padding: 80px 20px;">
            <h2 style="color: #F2C230;">Senha Alterada com Sucesso!</h2>
            <p style="color: #E7F0F5; margin: 16px 0;">Sua nova senha já está ativa. Você pode agora fazer login com segurança.</p>
            <a href="/login" style="background: #F2C230; color: #063B5C; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px;">Ir para o Login</a>
        </body>
    `);
});
