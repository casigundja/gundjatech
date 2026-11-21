import { Hono } from 'hono';
import { Env, AppVariables } from './types/env';
import { securityHeaders, csrfProtection } from './middleware/security';
import { attachSession } from './middleware/auth';
import { pruneExpiredSessions } from './lib/session';

import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';
import { chatRoutes } from './routes/chat';
import { whatsappRoutes } from './routes/whatsapp';
import { adminRoutes } from './routes/admin';
import { portalRoutes } from './routes/portal';
import { accountRoutes } from './routes/account';
import { uploadRoutes } from './routes/uploads';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Middlewares Globais
app.use('*', securityHeaders);
app.use('*', csrfProtection);
app.use('*', attachSession);

// Montagem Modular de Rotas
app.route('/', healthRoutes);
app.route('/', authRoutes);
app.route('/auth', authRoutes);
app.route('/', uploadRoutes);
app.route('/minha-conta', accountRoutes);
app.route('/api/account', accountRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/webhooks/whatsapp', whatsappRoutes);
app.route('/admin', adminRoutes);
app.route('/portal', portalRoutes);
app.route('/', publicRoutes);

// 404 Handler
app.notFound((c) => {
    if (c.req.path.startsWith('/api/') || c.req.header('accept')?.includes('application/json')) {
        return c.json({ error: 'Not Found', message: 'Endpoint não encontrado.' }, 404);
    }
    return c.html(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><title>404 • GundjaTech</title><meta charset="utf-8"></head>
        <body style="background: #063B5C; color: #fff; font-family: sans-serif; text-align: center; padding: 80px 20px;">
            <h1 style="color: #F2C230; font-size: 48px;">404</h1>
            <p style="font-size: 18px;">Página não encontrada.</p>
            <a href="/" style="color: #F2C230; text-decoration: underline;">Voltar ao início</a>
        </body>
        </html>
    `, 404);
});

// Error Handler
app.onError((err, c) => {
    console.error('Unhandled Worker Error:', err);
    return c.json({
        error: 'Internal Server Error',
        message: err instanceof Error ? err.message : 'Erro interno do servidor'
    }, 500);
});

// Cron Trigger para limpeza automática de sessões expiradas no D1
(app as unknown as { scheduled: (event: unknown, env: Env, ctx: unknown) => Promise<void> }).scheduled = async (_event, env) => {
    if (env?.DB) {
        await pruneExpiredSessions(env.DB);
    }
};

export default app;
