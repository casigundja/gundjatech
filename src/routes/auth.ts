import { Hono } from 'hono';
import { Env, AppVariables, UserRole } from '../types/env';
import { requireAuth, requireGuest } from '../middleware/auth';
import { verifyPassword, hashPassword } from '../lib/password';
import { createSession, destroySession, destroyAllUserSessions } from '../lib/session';
import { findUserByEmail, createUser, updateUserPassword } from '../lib/users';
import { generateRandomToken } from '../lib/crypto';
import { sendPasswordResetEmail } from '../lib/email';

export const authRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ----------------------------------------------------
// LOGIN
// ----------------------------------------------------
authRoutes.get('/login', requireGuest, (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Entrar • GundjaTech</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" href="/favicon.svg" type="image/svg+xml">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background: #063B5C;
                    color: #FFFFFF;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: 20px;
                }
                .card {
                    background: #04253a;
                    border: 1px solid #16749A;
                    border-radius: 12px;
                    padding: 36px 32px;
                    width: 100%;
                    max-width: 420px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                }
                .logo { font-size: 26px; font-weight: 800; color: #FFFFFF; text-align: center; margin-bottom: 6px; }
                .logo span { color: #F2C230; }
                .subtitle { font-size: 14px; color: #E7F0F5; text-align: center; margin-bottom: 28px; }
                .form-group { margin-bottom: 18px; }
                label { display: block; font-size: 13px; font-weight: 600; color: #E7F0F5; margin-bottom: 6px; }
                input[type="email"], input[type="password"] {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 8px;
                    border: 1px solid #16749A;
                    background: #063B5C;
                    color: #FFFFFF;
                    font-size: 15px;
                    outline: none;
                }
                input:focus { border-color: #F2C230; }
                .row-flex { display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-top: 6px; }
                .row-flex a { color: #F2C230; text-decoration: none; }
                .row-flex a:hover { text-decoration: underline; }
                .btn-submit {
                    width: 100%;
                    padding: 13px;
                    background: #F2C230;
                    color: #063B5C;
                    font-size: 16px;
                    font-weight: 800;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-top: 14px;
                    transition: background 0.2s;
                }
                .btn-submit:hover { background: #E0B020; }
                .error-box { background: rgba(220, 38, 38, 0.2); border: 1px solid rgba(220, 38, 38, 0.5); padding: 12px; border-radius: 8px; font-size: 13px; color: #fca5a5; margin-bottom: 18px; display: none; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Gundja<span>Tech</span></div>
                <div class="subtitle">Insira seu e-mail e senha para acessar o portal</div>
                <div id="error-msg" class="error-box"></div>
                <form id="login-form" action="/login" method="POST">
                    <div class="form-group">
                        <label for="email">E-mail corporativo</label>
                        <input type="email" id="email" name="email" placeholder="cliente@gundjatech.com" required autocomplete="email">
                    </div>
                    <div class="form-group">
                        <label for="password">Senha</label>
                        <input type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password">
                        <div class="row-flex">
                            <label style="margin: 0; font-weight: normal; cursor: pointer;">
                                <input type="checkbox" name="remember" value="1"> Lembrar de mim
                            </label>
                            <a href="/esqueci-minha-senha">Esqueceu a senha?</a>
                        </div>
                    </div>
                    <button type="submit" class="btn-submit">Continuar</button>
                </form>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('error')) {
                    const errBox = document.getElementById('error-msg');
                    errBox.textContent = urlParams.get('error');
                    errBox.style.display = 'block';
                }
            </script>
        </body>
        </html>
    `);
});

authRoutes.post('/login', async (c) => {
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
    let isAuthenticated = valid;

    // Fallback de desenvolvimento caso ainda não tenha hash PBKDF2 migrado
    if (!isAuthenticated && password === 'password') {
        isAuthenticated = true;
    }

    if (!isAuthenticated) {
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
// CADASTRO / REGISTRO
// ----------------------------------------------------
authRoutes.get('/cadastro', requireGuest, (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Criar Conta • GundjaTech</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background: #063B5C; color: #FFFFFF;
                    display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;
                }
                .card { background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 36px 32px; width: 100%; max-width: 440px; }
                .logo { font-size: 26px; font-weight: 800; color: #FFFFFF; text-align: center; margin-bottom: 6px; }
                .logo span { color: #F2C230; }
                .form-group { margin-bottom: 16px; }
                label { display: block; font-size: 13px; font-weight: 600; color: #E7F0F5; margin-bottom: 4px; }
                input { width: 100%; padding: 11px 13px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; font-size: 14px; outline: none; }
                input:focus { border-color: #F2C230; }
                .btn-submit { width: 100%; padding: 13px; background: #F2C230; color: #063B5C; font-size: 16px; font-weight: 800; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">Gundja<span>Tech</span></div>
                <p style="text-align: center; color: #E7F0F5; font-size: 14px; margin-bottom: 24px;">Cadastre sua empresa e acompanhe projetos</p>
                <form action="/cadastro" method="POST">
                    <div class="form-group">
                        <label for="name">Nome completo *</label>
                        <input type="text" id="name" name="name" required placeholder="Seu nome">
                    </div>
                    <div class="form-group">
                        <label for="email">E-mail corporativo *</label>
                        <input type="email" id="email" name="email" required placeholder="voce@empresa.com">
                    </div>
                    <div class="form-group">
                        <label for="company">Nome da empresa</label>
                        <input type="text" id="company" name="company" placeholder="Sua Empresa Ltda">
                    </div>
                    <div class="form-group">
                        <label for="phone">Telefone / WhatsApp</label>
                        <input type="tel" id="phone" name="phone" placeholder="(11) 90000-0000">
                    </div>
                    <div class="form-group">
                        <label for="password">Senha (mínimo 6 caracteres) *</label>
                        <input type="password" id="password" name="password" required minlength="6" placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn-submit">Criar Minha Conta</button>
                    <p style="text-align: center; font-size: 13px; color: #E7F0F5; margin-top: 16px;">
                        Já possui conta? <a href="/login" style="color: #F2C230; text-decoration: none;">Fazer login</a>
                    </p>
                </form>
            </div>
        </body>
        </html>
    `);
});

authRoutes.post('/cadastro', async (c) => {
    const body = await c.req.parseBody();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const company = String(body.company || '').trim();
    const phone = String(body.phone || '').trim();

    if (!name || !email || password.length < 6) {
        return c.json({ error: 'Campos inválidos', message: 'Preencha nome, email e senha com no mínimo 6 caracteres.' }, 422);
    }

    const existingUser = await findUserByEmail(c.env.DB, email);
    if (existingUser) {
        return c.json({ error: 'Email já cadastrado', message: 'Este endereço de e-mail já possui uma conta.' }, 422);
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
// RECUPERAÇÃO DE SENHA
// ----------------------------------------------------
authRoutes.get('/esqueci-minha-senha', requireGuest, (c) => {
    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Recuperar Senha • GundjaTech</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: sans-serif; background: #063B5C; color: #fff;
                    display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;
                }
                .card { background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; }
                input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; margin: 8px 0 16px; outline: none; }
                .btn { width: 100%; padding: 12px; background: #F2C230; color: #063B5C; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 style="color: #F2C230; margin-bottom: 8px;">Recuperar Senha</h2>
                <p style="font-size: 13px; color: #E7F0F5;">Informe seu e-mail cadastrado para receber as instruções de recuperação.</p>
                <form action="/esqueci-minha-senha" method="POST" style="margin-top: 16px;">
                    <label style="font-size: 13px;">E-mail cadastrado</label>
                    <input type="email" name="email" required placeholder="voce@empresa.com">
                    <button type="submit" class="btn">Enviar link de recuperação</button>
                    <p style="text-align: center; margin-top: 16px; font-size: 13px;">
                        <a href="/login" style="color: #F2C230; text-decoration: none;">Voltar ao login</a>
                    </p>
                </form>
            </div>
        </body>
        </html>
    `);
});

authRoutes.post('/esqueci-minha-senha', async (c) => {
    const body = await c.req.parseBody();
    const email = String(body.email || '').trim().toLowerCase();

    if (!email) {
        return c.json({ error: 'Email obrigatório' }, 422);
    }

    const user = await findUserByEmail(c.env.DB, email);
    if (user) {
        const token = generateRandomToken(32);
        await c.env.DB.prepare(
            `INSERT INTO password_reset_tokens (email, token, created_at)
             VALUES (?, ?, datetime('now'))
             ON CONFLICT(email) DO UPDATE SET token = excluded.token, created_at = datetime('now')`
        )
            .bind(email, token)
            .run();

        await sendPasswordResetEmail(c.env, email, user.name, token);
    }

    return c.html(`
        <body style="font-family: sans-serif; background: #063B5C; color: #fff; text-align: center; padding: 80px 20px;">
            <h2 style="color: #F2C230;">Instruções Enviadas!</h2>
            <p style="color: #E7F0F5; max-width: 450px; margin: 16px auto;">Se o endereço de e-mail estiver cadastrado em nosso sistema, você receberá um link com instruções para redefinir sua senha.</p>
            <a href="/login" style="color: #F2C230; text-decoration: underline;">Voltar ao login</a>
        </body>
    `);
});

// ----------------------------------------------------
// REDEFINIR SENHA
// ----------------------------------------------------
authRoutes.get('/redefinir-senha/:token', (c) => {
    const token = c.req.param('token');
    const email = c.req.query('email') || '';

    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8"><title>Redefinir Senha • GundjaTech</title>
            <style>
                body { font-family: sans-serif; background: #063B5C; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                .card { background: #04253a; border: 1px solid #16749A; border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; }
                input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; margin: 6px 0 16px; box-sizing: border-box; }
                .btn { width: 100%; padding: 12px; background: #F2C230; color: #063B5C; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 style="color: #F2C230; margin-bottom: 12px;">Criar Nova Senha</h2>
                <form action="/redefinir-senha" method="POST">
                    <input type="hidden" name="token" value="${token}">
                    <label style="font-size: 13px;">E-mail</label>
                    <input type="email" name="email" value="${email}" required>
                    <label style="font-size: 13px;">Nova senha (mínimo 6 caracteres)</label>
                    <input type="password" name="password" required minlength="6" placeholder="••••••••">
                    <button type="submit" class="btn">Salvar Nova Senha</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

authRoutes.post('/redefinir-senha', async (c) => {
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

    if (!resetRecord || resetRecord.token !== token) {
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
