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

const DEFAULT_HMAC_SECRET = 'gundjatech_prod_hmac_key_PU1bNMoz8jVmKIWiC650bGnL2FljkKJ3w3W2JcD1Myk';

export async function hmacSign(message: string, secret?: string): Promise<string> {
    const effectiveSecret = secret && secret.length > 0 ? secret : DEFAULT_HMAC_SECRET;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(effectiveSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return bufferToBase64Url(signature);
}

export async function hmacVerify(message: string, signature: string, secret?: string): Promise<boolean> {
    const expectedSignature = await hmacSign(message, secret);
    return timingSafeEqual(expectedSignature, signature);
}

export function generateRandomToken(bytesLength = 32): string {
    const array = new Uint8Array(bytesLength);
    crypto.getRandomValues(array);
    return bufferToBase64Url(array);
}
