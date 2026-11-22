import { Env, UserSessionPayload } from '../types/env';
import { generateRandomToken, hmacSign, hmacVerify } from './crypto';

const SESSION_COOKIE_NAME = 'gt_session';
const DEFAULT_SESSION_TTL = 60 * 60 * 24 * 7; // 7 dias
const REMEMBER_ME_TTL = 60 * 60 * 24 * 30; // 30 dias

export async function createSession(
    env: Env,
    user: UserSessionPayload,
    ipAddress?: string,
    userAgent?: string,
    remember = false
): Promise<{ sessionId: string; cookieHeader: string }> {
    const sessionId = generateRandomToken(32);
    const ttl = remember ? REMEMBER_ME_TTL : DEFAULT_SESSION_TTL;
    const now = Math.floor(Date.now() / 1000);

    const payloadStr = JSON.stringify(user);

    // Persiste no D1
    await env.DB.prepare(
        `INSERT INTO sessions (id, user_id, ip_address, user_agent, payload, last_activity)
         VALUES (?, ?, ?, ?, ?, ?)`
    )
        .bind(sessionId, user.id, ipAddress || null, userAgent || null, payloadStr, now)
        .run();

    // Cache no KV
    try {
        await env.KV_SESSIONS.put(`session:${sessionId}`, payloadStr, { expirationTtl: ttl });
    } catch {
        // Fallback silencioso
    }

    const signature = await hmacSign(sessionId, env.SESSION_SECRET);
    const cookieValue = `${sessionId}.${signature}`;

    const cookieHeader = `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`;

    return { sessionId, cookieHeader };
}

export async function getSession(
    env: Env,
    cookieHeader?: string | null
): Promise<{ user: UserSessionPayload; sessionId: string } | null> {
    if (!cookieHeader) {
        return null;
    }

    const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
            const [k, ...v] = c.trim().split('=');
            return [k, v.join('=')];
        })
    );

    const sessionCookie = cookies[SESSION_COOKIE_NAME];
    if (!sessionCookie || !sessionCookie.includes('.')) {
        return null;
    }

    const [sessionId, signature] = sessionCookie.split('.');
    const isValid = await hmacVerify(sessionId, signature, env.SESSION_SECRET);
    if (!isValid) {
        return null;
    }

    // 1. Tenta KV primeiro
    try {
        const cached = await env.KV_SESSIONS.get(`session:${sessionId}`);
        if (cached) {
            return { user: JSON.parse(cached) as UserSessionPayload, sessionId };
        }
    } catch {}

    // 2. Consulta D1
    const row = await env.DB.prepare(
        `SELECT payload, last_activity FROM sessions WHERE id = ?`
    )
        .bind(sessionId)
        .first<{ payload: string; last_activity: number }>();

    if (!row) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - row.last_activity > REMEMBER_ME_TTL) {
        await destroySession(env, sessionId);
        return null;
    }

    const user = JSON.parse(row.payload) as UserSessionPayload;
    return { user, sessionId };
}

export async function destroySession(env: Env, sessionId: string): Promise<string> {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
    try {
        await env.KV_SESSIONS.delete(`session:${sessionId}`);
    } catch {}

    return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function destroyAllUserSessionsExcept(
    env: Env,
    userId: number,
    keepSessionId: string
): Promise<void> {
    try {
        const rows = await env.DB.prepare(
            `SELECT id FROM sessions WHERE user_id = ? AND id != ?`
        )
            .bind(userId, keepSessionId)
            .all<{ id: string }>();
        for (const r of rows.results || []) {
            try {
                await env.KV_SESSIONS.delete(`session:${r.id}`);
            } catch {}
        }
    } catch {}

    await env.DB.prepare(
        `DELETE FROM sessions WHERE user_id = ? AND id != ?`
    )
        .bind(userId, keepSessionId)
        .run();
}

export async function destroyAllUserSessions(env: Env, userId: number): Promise<void> {
    try {
        const rows = await env.DB.prepare(
            `SELECT id FROM sessions WHERE user_id = ?`
        )
            .bind(userId)
            .all<{ id: string }>();
        for (const r of rows.results || []) {
            try {
                await env.KV_SESSIONS.delete(`session:${r.id}`);
            } catch {}
        }
    } catch {}

    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
}

export async function pruneExpiredSessions(db: D1Database): Promise<number> {
    const cutoff = Math.floor(Date.now() / 1000) - REMEMBER_ME_TTL;
    const res = await db.prepare(`DELETE FROM sessions WHERE last_activity < ?`).bind(cutoff).run();
    return Number(res.meta?.changes || 0);
}
