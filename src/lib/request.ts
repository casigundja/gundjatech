import type { Context } from 'hono';

/**
 * Lê o corpo da requisição de forma transparente para JSON, Multipart Form Data ou URL Encoded
 */
export async function getRequestBody(c: Context): Promise<Record<string, unknown>> {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
        try {
            return await c.req.json();
        } catch {
            return {};
        }
    }

    try {
        return await c.req.parseBody();
    } catch {
        return {};
    }
}
