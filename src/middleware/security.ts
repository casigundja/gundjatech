import { MiddlewareHandler } from 'hono';
import { Env, AppVariables } from '../types/env';

/**
 * Injeta Security Headers padrão na resposta (HSTS, CSP, etc.)
 */
export const securityHeaders: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    await next();

    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'SAMEORIGIN');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
};

/**
 * Middleware CSRF baseado em verificação de Origin/Referer (Fetch Metadata / Same-Origin)
 * para endpoints de mutação HTML (POST/PUT/DELETE/PATCH).
 * Rotas /api/* possuem mecanismos próprios (webhooks/tokens).
 */
export const csrfProtection: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const path = c.req.path;
    const method = c.req.method.toUpperCase();

    if (path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }

    const requestOrigin = new URL(c.req.url).origin;
    const originHeader = c.req.header('origin');
    const refererHeader = c.req.header('referer');

    if (originHeader && originHeader !== 'null') {
        if (originHeader !== requestOrigin) {
            return c.json(
                { error: 'Forbidden', message: 'Requisição bloqueada por proteção CSRF (Origin inválido).' },
                403
            );
        }
    } else if (refererHeader) {
        try {
            const refOrigin = new URL(refererHeader).origin;
            if (refOrigin !== requestOrigin) {
                return c.json(
                    { error: 'Forbidden', message: 'Requisição bloqueada por proteção CSRF (Referer inválido).' },
                    403
                );
            }
        } catch {
            return c.json(
                { error: 'Forbidden', message: 'Requisição bloqueada por proteção CSRF (Referer malformado).' },
                403
            );
        }
    }

    await next();
};
