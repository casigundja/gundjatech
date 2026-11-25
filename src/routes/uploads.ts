import { Hono } from 'hono';
import { Env, AppVariables, UserRole } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { hasPermission } from '../lib/rbac';
import { getFile, putFile, generateStorageKey, streamR2Response } from '../lib/storage';

export const uploadRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const BLOCKED_UPLOAD_EXTS = new Set(['html', 'htm', 'svg', 'xhtml', 'js', 'mjs', 'cjs', 'php', 'phtml', 'exe', 'bat', 'sh']);
const BLOCKED_UPLOAD_MIME_PATTERNS = ['text/html', 'image/svg+xml', 'application/xhtml+xml', 'javascript', 'ecmascript'];
const ALLOWED_UPLOAD_FOLDERS = new Set(['general', 'chat', 'projects', 'requests', 'avatars', 'contratos', 'documentos']);

/**
 * Rota pública/protegida de streaming de arquivos do bucket R2
 * Suporta cache headers HTTP, ETags e proteção contra Stored XSS / IDOR / RBAC
 */
uploadRoutes.get('/uploads/:key{.*}', async (c) => {
    const key = c.req.param('key');
    if (!key || key.includes('..')) {
        return c.text('Key do arquivo inválida', 400);
    }

    // Bloqueia acesso não-autenticado, clientes (multi-tenant) e staff sem permissão modular para private/
    if (key.startsWith('private/')) {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthenticated', message: 'Autenticação obrigatória para acessar arquivos privados.' }, 401);
        }
        if (user.role === 'client') {
            return c.json({ error: 'Forbidden', message: 'Use a rota autenticada do Portal do Cliente para baixar arquivos privados.' }, 403);
        }
        const role = user.role as UserRole;
        if (key.startsWith('private/receipts/') && !hasPermission(role, 'finance.view')) {
            return c.json({ error: 'Forbidden', message: 'Permissão finance.view obrigatória.' }, 403);
        }
        if (key.startsWith('private/projects/') && !hasPermission(role, 'projects.view')) {
            return c.json({ error: 'Forbidden', message: 'Permissão projects.view obrigatória.' }, 403);
        }
        if (key.startsWith('private/attachments/') && !hasPermission(role, 'requests.view')) {
            return c.json({ error: 'Forbidden', message: 'Permissão requests.view obrigatória.' }, 403);
        }
    }

    if (!c.env.UPLOADS_BUCKET) {
        return c.text('Bucket R2 não configurado no runtime', 500);
    }

    const object = await getFile(c.env.UPLOADS_BUCKET, key);
    if (!object) {
        return c.text('Arquivo não encontrado no armazenamento', 404);
    }

    return streamR2Response(c, object, key);
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
        const rawFolder = String(body.folder || 'general').trim().toLowerCase().replace(/^\/+|\/+$/g, '');
        const folder = ALLOWED_UPLOAD_FOLDERS.has(rawFolder) ? rawFolder : 'general';

        if (!(file instanceof File) || file.size === 0) {
            return c.json({ error: 'Nenhum arquivo válido enviado' }, 422);
        }

        // Limite de 25MB para uploads edge
        if (file.size > 25 * 1024 * 1024) {
            return c.json({ error: 'Arquivo excede o limite máximo permitido de 25MB' }, 413);
        }

        // Bloqueia extensões e MIME types ativos (proteção contra Stored XSS)
        const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().trim() : '';
        const mimeLower = String(file.type || '').toLowerCase();
        if (
            (ext && BLOCKED_UPLOAD_EXTS.has(ext)) ||
            BLOCKED_UPLOAD_MIME_PATTERNS.some((p) => mimeLower.includes(p))
        ) {
            return c.json({ error: 'Tipo de arquivo não permitido por política de segurança.' }, 422);
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
