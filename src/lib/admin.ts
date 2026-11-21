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
    recentRequests: any[];
    recentClients: any[];
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
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
         FROM quotations`
    ).first<{ total: number; approved: number }>();

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
        recentRequests: recentRequests.results || [],
        recentClients: recentClients.results || []
    };
}
