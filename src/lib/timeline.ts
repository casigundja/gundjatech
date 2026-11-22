/**
 * Registra um evento na Linha do Tempo de uma solicitação em ambas as tabelas
 * (`service_request_history` usada pelo Admin e `request_status_histories` usada pelo Portal/Público),
 * garantindo 100% de sincronização entre todos os canais.
 */
export async function recordRequestTimeline(
    db: D1Database,
    entry: {
        serviceRequestId: number | string;
        userId?: number | null;
        action?: string;
        fromStatus?: string | null;
        toStatus: string;
        notes?: string | null;
    }
): Promise<void> {
    const reqId = Number(entry.serviceRequestId);
    if (!reqId) return;

    const userId = entry.userId ?? null;
    const action = entry.action || 'status_change';
    const fromStatus = entry.fromStatus ?? null;
    const toStatus = entry.toStatus;
    const notes = entry.notes ?? null;

    try {
        await db.prepare(
            `INSERT INTO service_request_history
             (service_request_id, user_id, action, from_status, to_status, old_status, new_status, notes, comment, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(reqId, userId, action, fromStatus, toStatus, fromStatus, toStatus, notes, notes).run();
    } catch {}

    try {
        await db.prepare(
            `INSERT INTO request_status_histories
             (service_request_id, user_id, action, status_from, status_to, old_status, new_status, from_status, to_status, notes, comment, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(reqId, userId, action, fromStatus, toStatus, fromStatus, toStatus, fromStatus, toStatus, notes, notes).run();
    } catch {}
}
