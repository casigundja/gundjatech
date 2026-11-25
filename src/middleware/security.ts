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
    c.header(
        'Content-Security-Policy-Report-Only',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
    );
};

/**
 * Middleware CSRF baseado em verificação de Origin/Referer (Fetch Metadata / Same-Origin)
 * para endpoints de mutação HTML (POST/PUT/DELETE/PATCH).
 * Rotas /api/* possuem mecanismos próprios (webhooks/tokens).
 */
export const csrfProtection: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
    const path = c.req.path;
    const method = c.req.method.toUpperCase();

    const isCookieAuthenticatedApi = path.startsWith('/api/account') || path.startsWith('/api/uploads');
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }
    if (path.startsWith('/api/') && !isCookieAuthenticatedApi) {
        return next();
    }

    const requestOrigin = new URL(c.req.url).origin;
    const originHeader = c.req.header('origin');
    const refererHeader = c.req.header('referer');
    const secFetchSite = (c.req.header('sec-fetch-site') || '').toLowerCase();

    if (originHeader === 'null' || secFetchSite === 'cross-site') {
        return c.json(
            { error: 'Forbidden', message: 'Requisição bloqueada por proteção CSRF (origem cross-site ou nula).' },
            403
        );
    }

    if (originHeader) {
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

/**
 * Rate Limiter distribuído via Cloudflare KV_CACHE (proteção contra brute-force e spam).
 * Faz fallback silencioso caso KV_CACHE não esteja disponível no ambiente de teste.
 */
export function rateLimit(options: {
    keyPrefix: string;
    maxRequests: number;
    windowSeconds: number;
    message?: string;
}): MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> {
    return async (c, next) => {
        const kv = c.env?.KV_CACHE;
        if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
            return next();
        }

        const ip =
            c.req.header('cf-connecting-ip') ||
            c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
            'unknown';
        const windowBucket = Math.floor(Date.now() / (options.windowSeconds * 1000));
        const key = `rl:${options.keyPrefix}:${ip}:${windowBucket}`;

        try {
            const raw = await kv.get(key);
            const current = raw ? parseInt(raw, 10) || 0 : 0;

            if (current >= options.maxRequests) {
                const msg =
                    options.message ||
                    'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.';
                c.header('Retry-After', String(options.windowSeconds));
                if (c.req.path.startsWith('/api/') || c.req.header('accept')?.includes('application/json')) {
                    return c.json({ error: 'Too Many Requests', message: msg }, 429);
                }
                return c.text(msg, 429);
            }

            await kv.put(key, String(current + 1), {
                expirationTtl: Math.max(60, options.windowSeconds + 10)
            });
        } catch {
            // Falha de KV não deve derrubar o fluxo principal
        }

        await next();
    };
}
