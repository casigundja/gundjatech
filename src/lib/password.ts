import { bufferToBase64Url, base64UrlToBuffer, timingSafeEqual, generateRandomToken } from './crypto';

const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEYLEN = 32;

/**
 * Hash de senha seguro com PBKDF2-SHA256 usando Web Crypto API.
 * Formato persistido: pbkdf2_sha256$iterations$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const saltB64 = bufferToBase64Url(saltBytes);

    const baseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    let iterationsUsed = PBKDF2_ITERATIONS;
    let derivedBits: ArrayBuffer;
    try {
        derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBytes as unknown as ArrayBuffer,
                iterations: iterationsUsed,
                hash: 'SHA-256'
            },
            baseKey,
            PBKDF2_KEYLEN * 8
        );
    } catch {
        iterationsUsed = 100_000;
        derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBytes as unknown as ArrayBuffer,
                iterations: iterationsUsed,
                hash: 'SHA-256'
            },
            baseKey,
            PBKDF2_KEYLEN * 8
        );
    }

    const hashB64 = bufferToBase64Url(derivedBits);
    return `pbkdf2_sha256$${iterationsUsed}$${saltB64}$${hashB64}`;
}

/**
 * Verifica se a senha em texto plano confere com o hash armazenado.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<{ valid: boolean; needsRehash: boolean }> {
    if (!storedHash) {
        return { valid: false, needsRehash: false };
    }

    // Se for formato PBKDF2
    if (storedHash.startsWith('pbkdf2_sha256$')) {
        const parts = storedHash.split('$');
        if (parts.length !== 4) {
            return { valid: false, needsRehash: false };
        }

        const iterations = parseInt(parts[1], 10);
        const saltBytes = base64UrlToBuffer(parts[2]);
        const expectedHash = parts[3];

        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBytes as unknown as ArrayBuffer,
                iterations: iterations,
                hash: 'SHA-256'
            },
            baseKey,
            PBKDF2_KEYLEN * 8
        );

        const computedHash = bufferToBase64Url(derivedBits);
        const valid = timingSafeEqual(computedHash, expectedHash);
        const needsRehash = iterations < PBKDF2_ITERATIONS;

        return { valid, needsRehash };
    }

    // Se for hash antigo Bcrypt do Laravel ($2y$ ou $2a$)
    // Pode ser validado através de fallback seguro ou sinalizado para redefinição
    return { valid: false, needsRehash: true };
}
