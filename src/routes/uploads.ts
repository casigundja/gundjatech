import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getFile, putFile, generateStorageKey, streamR2Response } from '../lib/storage';

export const uploadRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * Rota pública/protegida de streaming de arquivos do bucket R2
 * Suporta cache headers HTTP, ETags e mime-type correto
 */
uploadRoutes.get('/uploads/:key{.*}', async (c) => {
    const key = c.req.param('key');
    if (!key) {
        return c.text('Key do arquivo não fornecida', 400);
    }

    // Bloqueia acesso não-autenticado para arquivos armazenados sob o prefixo private/
    if (key.startsWith('private/')) {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthenticated', message: 'Autenticação obrigatória para acessar arquivos privados.' }, 401);
        }
    }

    if (!c.env.UPLOADS_BUCKET) {
        return c.text('Bucket R2 não configurado no runtime', 500);
    }

    const object = await getFile(c.env.UPLOADS_BUCKET, key);
    if (!object) {
        return c.text('Arquivo não encontrado no armazenamento', 404);
    }

    return streamR2Response(c, object);
});

/**
 * Endpoint de upload de arquivos autenticado
 */
uploadRoutes.post('/api/uploads', requireAuth, async (c) => {
    if (!c.env.UPLOADS_BUCKET) {
        return c.json({ error: 'Bucket R2 não configurado' }, 500);
    }

    try {
        const body = await c.req.parseBody();
        const file = body.file;
        const folder = String(body.folder || 'general').trim();

        if (!(file instanceof File) || file.size === 0) {
            return c.json({ error: 'Nenhum arquivo válido enviado' }, 422);
        }

        // Limite de 25MB para uploads edge
        if (file.size > 25 * 1024 * 1024) {
            return c.json({ error: 'Arquivo excede o limite máximo permitido de 25MB' }, 413);
        }

        const key = generateStorageKey(folder, file.name);
        const arrayBuffer = await file.arrayBuffer();

        const result = await putFile(c.env.UPLOADS_BUCKET, key, arrayBuffer, {
            contentType: file.type || 'application/octet-stream',
            metadata: {
                originalName: file.name,
                uploadedBy: String(c.get('user')?.id || 'anonymous')
            }
        });

        return c.json({
            ok: true,
            key: result.key,
            url: result.url,
            size: result.size,
            contentType: result.contentType
        }, 201);
    } catch (err: any) {
        console.error('Erro no processamento de upload R2:', err);
        return c.json({ error: err.message || 'Erro interno ao realizar upload' }, 500);
    }
});
