/**
 * Utilitários criptográficos seguros via Web Crypto API nativa do Cloudflare Workers
 */

export function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function base64UrlToBuffer(base64url: string): Uint8Array {
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}

async function computeHmacSignature(message: string, secret?: string): Promise<ArrayBuffer> {
    if (!secret || secret.trim().length === 0) {
        throw new Error('SESSION_SECRET / HMAC secret não configurado no ambiente.');
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

export async function hmacSign(message: string, secret?: string): Promise<string> {
    const signature = await computeHmacSignature(message, secret);
    return bufferToBase64Url(signature);
}

export async function hmacVerify(message: string, signature: string, secret?: string): Promise<boolean> {
    if (!secret || secret.trim().length === 0 || !signature) {
        return false;
    }
    const expectedSignature = await hmacSign(message, secret);
    return timingSafeEqual(expectedSignature, signature);
}

export async function hmacSignHex(message: string, secret?: string): Promise<string> {
    const signature = await computeHmacSignature(message, secret);
    return bufferToHex(signature);
}

export async function hmacVerifyHex(message: string, hexSignature: string, secret?: string): Promise<boolean> {
    if (!secret || secret.trim().length === 0 || !hexSignature) {
        return false;
    }
    const expectedHex = await hmacSignHex(message, secret);
    return timingSafeEqual(expectedHex, hexSignature.toLowerCase());
}

export async function sha256Hex(value: string): Promise<string> {
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return bufferToHex(digest);
}

export function generateRandomToken(bytesLength = 32): string {
    const array = new Uint8Array(bytesLength);
    crypto.getRandomValues(array);
    return bufferToBase64Url(array);
}
