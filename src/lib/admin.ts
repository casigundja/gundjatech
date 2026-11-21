export interface AdminDashboardData {
    periodDays: number;
    totalClients: number;
    activeClients: number;
    leadClients: number;
    totalRequests: number;
    pendingRequests: number;
    totalProjects: number;
    activeProjects: number;
    totalQuotations: number;
    approvedQuotations: number;
    openQuotations: number;
    openQuotationsValue: number;
    monthlyRevenue: number;
    pendingReceivables: number;
    openConversations: number;
    domainsExpiringSoon: number;
    recentRequests: any[];
    recentClients: any[];
    recentConversations: any[];
    recentProjects: any[];
    domainsExpiringSoonList: any[];
}

export async function getAdminDashboardStats(db: D1Database, periodDays = 30): Promise<AdminDashboardData> {
    const clientsStats = await db.prepare(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN status = 'lead' THEN 1 ELSE 0 END) as leads
         FROM clients`
    ).first<{ total: number; active: number; leads: number }>();

    const requestsStats = await db.prepare(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('new', 'analyzing', 'awaiting_info') THEN 1 ELSE 0 END) as pending
         FROM service_requests`
    ).first<{ total: number; pending: number }>();

    const projectsStats = await db.prepare(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('planning', 'in_progress', 'reviewing') THEN 1 ELSE 0 END) as active
         FROM projects`
    ).first<{ total: number; active: number }>();

    const quotationsStats = await db.prepare(
        `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status IN ('sent', 'pending') THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status IN ('sent', 'pending') THEN COALESCE(final_amount, total_amount, 0) ELSE 0 END) as open_val
         FROM quotations`
    ).first<{ total: number; approved: number; open_count: number; open_val: number }>();

    let monthlyRevenue = 0;
    let pendingReceivables = 0;
    try {
        const finStats = await db.prepare(
            `SELECT 
                SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END) as paid_rev,
                SUM(CASE WHEN type = 'income' AND status IN ('pending', 'overdue') THEN amount ELSE 0 END) as pend_rev
             FROM financial_transactions`
        ).first<{ paid_rev: number; pend_rev: number }>();
        monthlyRevenue = finStats?.paid_rev ?? 0;
        pendingReceivables = finStats?.pend_rev ?? 0;
    } catch {}

    let openConversations = 0;
    let recentConversations: any[] = [];
    try {
        const convStats = await db.prepare(
            `SELECT COUNT(*) as total FROM conversations WHERE status != 'closed'`
        ).first<{ total: number }>();
        openConversations = convStats?.total ?? 0;
        const convRows = await db.prepare(
            `SELECT id, visitor_name, visitor_email, subject, status, ai_enabled, updated_at
             FROM conversations WHERE status != 'closed' ORDER BY updated_at DESC LIMIT 4`
        ).all();
        recentConversations = convRows.results || [];
    } catch {}

    let recentProjects: any[] = [];
    try {
        const projRows = await db.prepare(
            `SELECT id, COALESCE(name, title) as title, progress_percentage, status FROM projects ORDER BY id DESC LIMIT 4`
        ).all();
        recentProjects = projRows.results || [];
    } catch {}

    let domainsExpiringSoonList: any[] = [];
    try {
        const domRows = await db.prepare(
            `SELECT id, domain_name, expires_at FROM domains ORDER BY expires_at ASC LIMIT 4`
        ).all();
        domainsExpiringSoonList = domRows.results || [];
    } catch {}

    const recentRequests = await db.prepare(
        `SELECT id, protocol, service_title, name, company, email, status, created_at 
         FROM service_requests 
         ORDER BY created_at DESC LIMIT 5`
    ).all();

    const recentClients = await db.prepare(
        `SELECT id, name, company, email, phone, status, created_at 
         FROM clients 
         ORDER BY created_at DESC LIMIT 5`
    ).all();

    return {
        periodDays,
        totalClients: clientsStats?.total ?? 0,
        activeClients: clientsStats?.active ?? 0,
        leadClients: clientsStats?.leads ?? 0,
        totalRequests: requestsStats?.total ?? 0,
        pendingRequests: requestsStats?.pending ?? 0,
        totalProjects: projectsStats?.total ?? 0,
        activeProjects: projectsStats?.active ?? 0,
        totalQuotations: quotationsStats?.total ?? 0,
        approvedQuotations: quotationsStats?.approved ?? 0,
        openQuotations: quotationsStats?.open_count ?? 0,
        openQuotationsValue: quotationsStats?.open_val ?? 0,
        monthlyRevenue,
        pendingReceivables,
        openConversations,
        domainsExpiringSoon: domainsExpiringSoonList.length,
        recentRequests: recentRequests.results || [],
        recentClients: recentClients.results || [],
        recentConversations,
        recentProjects,
        domainsExpiringSoonList
    };
}
