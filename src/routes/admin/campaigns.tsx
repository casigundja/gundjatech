import { Hono } from 'hono';
import { Env, AppVariables } from '../../types/env';
import { getRequestBody } from '../../lib/request';
import { AdminCampaignsView } from '../../views/admin/campaigns';

export const adminCampaignsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminCampaignsRoutes.get('/campanhas', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const successMessage = c.req.query('success') || null;
    const errorMessage = c.req.query('error') || null;

    const search = (c.req.query('search') || '').trim();
    const platformFilter = (c.req.query('platform') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    const budgetRow = await db.prepare(
        `SELECT SUM(budget) as total_budget, SUM(spent_amount) as total_spent FROM advertising_campaigns`
    ).first<{ total_budget: number; total_spent: number }>();

    let query = `
        SELECT a.*, c.name as client_name, c.company
        FROM advertising_campaigns a
        LEFT JOIN clients c ON a.client_id = c.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (a.name LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    if (platformFilter) {
        query += ` AND a.platform = ?`;
        params.push(platformFilter);
    }

    if (statusFilter) {
        query += ` AND a.status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY a.created_at DESC`;

    const stmt = db.prepare(query);
    const campaigns = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    const clients = (await db.prepare(`SELECT id, name, company FROM clients ORDER BY company ASC, name ASC`).all()).results || [];

    return c.html(
        <AdminCampaignsView
            currentUser={user}
            campaigns={campaigns}
            clients={clients}
            totalBudget={budgetRow?.total_budget || 0}
            totalSpent={budgetRow?.total_spent || 0}
            search={search}
            platformFilter={platformFilter}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminCampaignsRoutes.post('/campanhas', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const clientId = Number(body.client_id);
    const name = String(body.name || '').trim();
    const platform = String(body.platform || 'google_ads').trim();
    const budget = Number(body.budget) || 0;

    if (!clientId || !name) {
        return c.redirect('/admin/campanhas?error=Cliente e Nome da Campanha são obrigatórios');
    }

    await db.prepare(
        `INSERT INTO advertising_campaigns (client_id, name, platform, budget, spent_amount, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, 'active', datetime('now'), datetime('now'))`
    ).bind(clientId, name, platform, budget).run();

    return c.redirect('/admin/campanhas?success=Campanha cadastrada com sucesso');
});

adminCampaignsRoutes.post('/campanhas/:id/toggle', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE advertising_campaigns 
         SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/campanhas?success=Status da campanha alterado');
});

adminCampaignsRoutes.post('/campanhas/:id/editar', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    const name = String(body.name || '').trim();
    const platform = String(body.platform || 'google_ads').trim();
    const statusRaw = String(body.status || 'active').trim();
    const status = ['active', 'paused', 'completed'].includes(statusRaw) ? statusRaw : 'active';
    const budget = Math.max(0, Number(body.budget) || 0);
    const spentAmount = Math.max(0, Number(body.spent_amount) || 0);

    if (!name) {
        return c.redirect('/admin/campanhas?error=O nome da campanha é obrigatório.');
    }

    await db.prepare(
        `UPDATE advertising_campaigns
         SET name = ?, platform = ?, status = ?, budget = ?, spent_amount = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(name, platform, status, budget, spentAmount, id).run();

    return c.redirect('/admin/campanhas?success=Campanha atualizada com sucesso!');
});

adminCampaignsRoutes.post('/campanhas/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    await db.prepare(`DELETE FROM advertising_campaigns WHERE id = ?`).bind(id).run();
    return c.redirect('/admin/campanhas?success=Campanha excluída com sucesso.');
});
