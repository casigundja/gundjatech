import { UserRole, UserSessionPayload } from '../types/env';

export interface UserRecord {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
    password: string;
    role: UserRole;
    avatar?: string | null;
    phone?: string | null;
    company?: string | null;
    trade_name?: string | null;
    is_active: number;
    last_login_at?: string | null;
    remember_token?: string | null;
    created_at?: string;
    updated_at?: string;
}

export async function findUserByEmail(db: D1Database, email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    return await db.prepare(
        `SELECT id, name, email, email_verified_at, password, role, avatar, phone, company, trade_name, is_active, last_login_at, remember_token
         FROM users WHERE lower(email) = ?`
    )
        .bind(normalized)
        .first<UserRecord>();
}

export async function findUserById(db: D1Database, id: number): Promise<UserRecord | null> {
    return await db.prepare(
        `SELECT id, name, email, email_verified_at, password, role, avatar, phone, company, trade_name, is_active, last_login_at, remember_token
         FROM users WHERE id = ?`
    )
        .bind(id)
        .first<UserRecord>();
}

export async function createUser(
    db: D1Database,
    data: {
        name: string;
        email: string;
        passwordHash: string;
        role?: UserRole;
        phone?: string | null;
        company?: string | null;
    }
): Promise<UserSessionPayload> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const role: UserRole = data.role || 'client';

    const result = await db.prepare(
        `INSERT INTO users (name, email, password, role, phone, company, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    )
        .bind(
            data.name.trim(),
            normalizedEmail,
            data.passwordHash,
            role,
            data.phone || null,
            data.company || null
        )
        .run();

    const userId = Number(result.meta.last_row_id);

    // Se for cliente, cria ou vincula registro na tabela clients
    let clientId: number | null = null;
    if (role === 'client') {
        const clientRes = await db.prepare(
            `INSERT INTO clients (user_id, name, email, phone, company, status, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'))`
        )
            .bind(userId, data.name.trim(), normalizedEmail, data.phone || null, data.company || null)
            .run();
        clientId = Number(clientRes.meta.last_row_id);
    }

    return {
        id: userId,
        name: data.name.trim(),
        email: normalizedEmail,
        role,
        is_active: true,
        client_id: clientId
    };
}

export async function updateUserPassword(db: D1Database, userId: number, newPasswordHash: string): Promise<void> {
    await db.prepare(
        `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(newPasswordHash, userId)
        .run();
}

export async function updateUserProfile(
    db: D1Database,
    userId: number,
    data: { name: string; phone?: string | null; company?: string | null }
): Promise<void> {
    await db.prepare(
        `UPDATE users SET name = ?, phone = ?, company = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(data.name.trim(), data.phone || null, data.company || null, userId)
        .run();

    // Sincroniza tabela clients se existir vínculo
    await db.prepare(
        `UPDATE clients SET name = ?, phone = ?, company = ?, updated_at = datetime('now') WHERE user_id = ?`
    )
        .bind(data.name.trim(), data.phone || null, data.company || null, userId)
        .run();
}
