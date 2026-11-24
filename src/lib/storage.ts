import type { Context } from 'hono';

export interface StorageUploadResult {
    key: string;
    url: string;
    size: number;
    contentType: string;
    etag?: string;
}

/**
 * Sanitiza e gera uma chave única de arquivo no R2
 */
export function generateStorageKey(folder: string, originalName: string): string {
    const cleanFolder = folder.replace(/(^\/+|\/+$)/g, '');
    const cleanName = originalName
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '_')
        .replace(/_+/g, '_');
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).substring(2, 8);

    return `${cleanFolder}/${timestamp}_${randomHex}_${cleanName}`;
}

/**
 * Salva um buffer ou stream no bucket R2
 */
export async function putFile(
    bucket: R2Bucket,
    key: string,
    data: ArrayBuffer | Uint8Array | ReadableStream,
    options?: {
        contentType?: string;
        metadata?: Record<string, string>;
    }
): Promise<StorageUploadResult> {
    const contentType = options?.contentType || 'application/octet-stream';
    const isPrivate = key.startsWith('private/');

    const obj = await bucket.put(key, data, {
        httpMetadata: {
            contentType,
            cacheControl: isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable'
        },
        customMetadata: options?.metadata
    });

    return {
        key,
        url: `/uploads/${key}`,
        size: obj ? obj.size : 0,
        contentType,
        etag: obj ? obj.httpEtag : undefined
    };
}

/**
 * Recupera um arquivo do bucket R2
 */
export async function getFile(bucket: R2Bucket, key: string): Promise<R2ObjectBody | null> {
    return await bucket.get(key);
}

/**
 * Remove um arquivo do bucket R2
 */
export async function deleteFile(bucket: R2Bucket, key: string): Promise<void> {
    await bucket.delete(key);
}

const SAFE_INLINE_CONTENT_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf'
]);

/**
 * Retorna uma Response HTTP transmitindo o conteúdo do R2 com headers seguros
 */
export function streamR2Response(c: Context, obj: R2ObjectBody, key?: string): Response {
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('x-content-type-options', 'nosniff');

    const isPrivate = Boolean(key && key.startsWith('private/'));
    if (isPrivate) {
        headers.set('cache-control', 'private, no-store');
    } else if (!headers.has('cache-control')) {
        headers.set('cache-control', 'public, max-age=86400');
    }

    const normalizedType = (headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    if (!SAFE_INLINE_CONTENT_TYPES.has(normalizedType)) {
        headers.set('content-security-policy', 'sandbox');
        if (!headers.has('content-disposition')) {
            headers.set('content-disposition', 'attachment');
        }
    }

    return c.body(obj.body, 200, Object.fromEntries(headers.entries()));
}
