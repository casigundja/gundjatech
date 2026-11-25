export interface ClientRecord {
    id: number;
    user_id: number | null;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    trade_name: string | null;
    tax_id: string | null;
    address: string | null;
    notes: string | null;
    status: string;
    is_active: number;
    created_at?: string;
    updated_at?: string;
}

export interface PortalDashboardSummary {
    client: ClientRecord;
    pendingRequests: number;
    activeProjects: number;
    totalDomains: number;
    activeCampaigns: number;
    quotationsPending: any[];
    recentProjects: any[];
    recentRequests: any[];
}

export async function ensureClientProfile(db: D1Database, user: { id: number; name: string; email: string; phone?: string | null }): Promise<ClientRecord> {
    const existing = await db.prepare(
        'SELECT * FROM clients WHERE user_id = ? LIMIT 1'
    ).bind(user.id).first<ClientRecord>();

    if (existing) {
        return existing;
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    const existingByEmail = await db.prepare(
        'SELECT * FROM clients WHERE lower(email) = ? LIMIT 1'
    ).bind(normalizedEmail).first<ClientRecord>();

    if (existingByEmail && existingByEmail.user_id === null) {
        await db.prepare(
            'UPDATE clients SET user_id = ?, updated_at = datetime("now") WHERE id = ? AND user_id IS NULL'
        ).bind(user.id, existingByEmail.id).run();
        return { ...existingByEmail, user_id: user.id };
    }

    const result = await db.prepare(
        `INSERT INTO clients (user_id, name, email, phone, company, status, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'))`
    ).bind(user.id, user.name, normalizedEmail, user.phone || null, user.name).run();

    const newId = Number(result.meta.last_row_id);
    return {
        id: newId,
        user_id: user.id,
        name: user.name,
        email: normalizedEmail,
        phone: user.phone || null,
        company: user.name,
        trade_name: null,
        tax_id: null,
        address: null,
        notes: null,
        status: 'active',
        is_active: 1
    };
}

export async function getPortalDashboard(db: D1Database, clientId: number): Promise<Omit<PortalDashboardSummary, 'client'>> {
    const [
        pendingRequestsRes,
        activeProjectsRes,
        totalDomainsRes,
        activeCampaignsRes,
        quotationsPending,
        recentProjects,
        recentRequests
    ] = await Promise.all([
        db.prepare(
            `SELECT COUNT(*) as total FROM service_requests 
             WHERE client_id = ? AND status IN ('new', 'analyzing', 'awaiting_info', 'quotation_sent', 'awaiting_approval')`
        ).bind(clientId).first<{ total: number }>(),
        db.prepare(
            `SELECT COUNT(*) as total FROM projects 
             WHERE client_id = ? AND status IN ('planning', 'in_progress', 'reviewing')`
        ).bind(clientId).first<{ total: number }>(),
        db.prepare(
            `SELECT COUNT(*) as total FROM domains WHERE client_id = ?`
        ).bind(clientId).first<{ total: number }>(),
        db.prepare(
            `SELECT COUNT(*) as total FROM advertising_campaigns WHERE client_id = ? AND status = 'active'`
        ).bind(clientId).first<{ total: number }>(),
        db.prepare(
            `SELECT * FROM quotations WHERE client_id = ? AND status = 'sent' ORDER BY created_at DESC LIMIT 5`
        ).bind(clientId).all(),
        db.prepare(
            `SELECT * FROM projects WHERE client_id = ? ORDER BY updated_at DESC LIMIT 3`
        ).bind(clientId).all(),
        db.prepare(
            `SELECT * FROM service_requests WHERE client_id = ? ORDER BY created_at DESC LIMIT 4`
        ).bind(clientId).all()
    ]);

    return {
        pendingRequests: pendingRequestsRes?.total ?? 0,
        activeProjects: activeProjectsRes?.total ?? 0,
        totalDomains: totalDomainsRes?.total ?? 0,
        activeCampaigns: activeCampaignsRes?.total ?? 0,
        quotationsPending: quotationsPending.results || [],
        recentProjects: recentProjects.results || [],
        recentRequests: recentRequests.results || []
    };
}
