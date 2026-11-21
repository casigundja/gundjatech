import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';

export const healthRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

healthRoutes.get('/up', (c) => {
    return c.text('OK', 200);
});

healthRoutes.get('/api/health', async (c) => {
    try {
        // Testa conexão D1
        const d1Test = await c.env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
        return c.json({
            status: 'healthy',
            runtime: 'cloudflare-workers',
            timestamp: new Date().toISOString(),
            d1: d1Test?.ok === 1 ? 'connected' : 'error'
        });
    } catch (err: unknown) {
        return c.json({
            status: 'degraded',
            runtime: 'cloudflare-workers',
            error: err instanceof Error ? err.message : 'Unknown error'
        }, 500);
    }
});
