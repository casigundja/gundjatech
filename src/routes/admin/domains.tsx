import { Hono } from 'hono';
import { Env, AppVariables } from '../../types/env';
import { getRequestBody } from '../../lib/request';
import { AdminDomainsView } from '../../views/admin/domains';

export const adminDomainsRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminDomainsRoutes.get('/dominios', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const successMessage = c.req.query('success') || null;
    const errorMessage = c.req.query('error') || null;

    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    let query = `
        SELECT d.*, c.name as client_name, c.company, c.email as client_email
        FROM domains d
        LEFT JOIN clients c ON d.client_id = c.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (d.domain_name LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    if (statusFilter) {
        query += ` AND d.status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY d.expires_at ASC`;

    const stmt = db.prepare(query);
    const domains = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    const clients = (await db.prepare(`SELECT id, name, company FROM clients ORDER BY company ASC, name ASC`).all()).results || [];

    return c.html(
        <AdminDomainsView
            currentUser={user}
            domains={domains}
            clients={clients}
            search={search}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminDomainsRoutes.post('/dominios', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const clientId = Number(body.client_id);
    const domainName = String(body.domain_name || '').trim().toLowerCase();
    const registrar = String(body.registrar || 'Cloudflare / Registro.br').trim();
    const expiresAt = String(body.expires_at || '').trim() || null;
    const autoRenew = body.auto_renew === '1' || body.auto_renew === 1 ? 1 : 0;

    if (!clientId || !domainName) {
        return c.redirect('/admin/dominios?error=Cliente e Nome do Domínio são obrigatórios');
    }

    try {
        await db.prepare(
            `INSERT INTO domains (client_id, domain_name, registrar, expires_at, auto_renew, status, dns_provider, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'active', 'Cloudflare Edge', datetime('now'), datetime('now'))`
        ).bind(clientId, domainName, registrar, expiresAt, autoRenew).run();

        return c.redirect('/admin/dominios?success=Domínio cadastrado para monitoramento');
    } catch (err: any) {
        return c.redirect(`/admin/dominios?error=${encodeURIComponent(err.message || 'Erro ao cadastrar domínio')}`);
    }
});

adminDomainsRoutes.post('/dominios/:id/editar', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    if (!id) {
        return c.redirect('/admin/dominios?error=Domínio inválido');
    }

    const clientId = Number(body.client_id);
    const domainName = String(body.domain_name || '').trim().toLowerCase();
    const registrar = String(body.registrar || 'Cloudflare / Registro.br').trim();
    const dnsProvider = String(body.dns_provider || 'Cloudflare Edge').trim();
    const expiresAt = String(body.expires_at || '').trim() || null;
    const autoRenew = body.auto_renew === '1' || body.auto_renew === 1 ? 1 : 0;
    const rawStatus = String(body.status || 'active').trim();
    const status = ['active', 'pending_dns', 'expiring', 'expired'].includes(rawStatus) ? rawStatus : 'active';

    if (!clientId || !domainName) {
        return c.redirect('/admin/dominios?error=Cliente e Nome do Domínio são obrigatórios');
    }

    try {
        await db.prepare(
            `UPDATE domains
             SET client_id = ?, domain_name = ?, registrar = ?, dns_provider = ?, expires_at = ?, auto_renew = ?, status = ?, updated_at = datetime('now')
             WHERE id = ?`
        ).bind(clientId, domainName, registrar, dnsProvider, expiresAt, autoRenew, status, id).run();

        return c.redirect('/admin/dominios?success=Domínio atualizado com sucesso');
    } catch (err: any) {
        return c.redirect(`/admin/dominios?error=${encodeURIComponent(err.message || 'Erro ao atualizar domínio')}`);
    }
});

adminDomainsRoutes.post('/dominios/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(`DELETE FROM domains WHERE id = ?`).bind(id).run();
    return c.redirect('/admin/dominios?success=Domínio removido');
});
