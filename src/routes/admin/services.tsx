import { Hono } from 'hono';
import { Env, AppVariables } from '../../types/env';
import { getRequestBody } from '../../lib/request';
import { AdminServicesView } from '../../views/admin/services';

const DEFAULT_CATEGORIES = [
    { id: 'sites', name: 'Websites & Portais' },
    { id: 'ecommerce', name: 'E-commerce B2B/B2C' },
    { id: 'software', name: 'Software & SaaS Edge' },
    { id: 'infra', name: 'Infra & Cloudflare' }
];

export const adminServicesRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminServicesRoutes.get('/servicos', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const successMessage = c.req.query('success') || null;
    const errorMessage = c.req.query('error') || null;

    const search = (c.req.query('search') || '').trim();
    const categoryFilter = (c.req.query('category') || '').trim();

    let query = `SELECT * FROM services WHERE 1=1`;
    const params: any[] = [];

    if (search) {
        query += ` AND (title LIKE ? OR summary LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s);
    }

    if (categoryFilter) {
        query += ` AND category = ?`;
        params.push(categoryFilter);
    }

    query += ` ORDER BY order_position ASC, created_at DESC`;

    const stmt = db.prepare(query);
    const services = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    return c.html(
        <AdminServicesView
            currentUser={user}
            services={services}
            categories={DEFAULT_CATEGORIES}
            isCreate={false}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminServicesRoutes.get('/servicos/novo', async (c) => {
    const user = c.get('user');
    const successMessage = c.req.query('success') || null;
    const errorMessage = c.req.query('error') || null;

    return c.html(
        <AdminServicesView
            currentUser={user}
            services={[]}
            categories={DEFAULT_CATEGORIES}
            isCreate={true}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminServicesRoutes.post('/servicos', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const title = String(body.title || body.name || '').trim();
    let slug = String(body.slug || '').trim().toLowerCase();
    const category = String(body.category || body.category_id || 'sites').trim();
    const price = Number(body.price || body.base_price) || 0;
    const summary = String(body.summary || body.short_description || '').trim() || null;
    const description = String(body.description || '').trim() || null;
    const is_active = body.is_active === '0' || body.is_active === 0 ? 0 : 1;
    const is_featured = body.is_featured === '1' || body.is_featured === 1 ? 1 : 0;

    if (!title) {
        return c.redirect('/admin/servicos?error=Título do serviço é obrigatório');
    }

    if (!slug) {
        slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    try {
        await db.prepare(
            `INSERT INTO services (title, slug, category, price, summary, description, is_active, is_featured, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(title, slug, category, price, summary, description, is_active, is_featured).run();

        return c.redirect('/admin/servicos?success=Pacote de serviço cadastrado com sucesso');
    } catch (err: any) {
        return c.redirect(`/admin/servicos?error=${encodeURIComponent(err.message || 'Erro ao salvar serviço')}`);
    }
});

adminServicesRoutes.post('/servicos/:id/toggle', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE services SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/servicos?success=Status do serviço atualizado');
});

adminServicesRoutes.post('/servicos/:id/editar', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    const title = String(body.title || body.name || '').trim();
    const category = String(body.category || body.category_id || 'sites').trim();
    const price = Math.max(0, Number(body.price || body.base_price) || 0);
    const summary = String(body.summary || body.short_description || '').trim() || null;
    const isActive = body.is_active === '0' || body.is_active === 0 ? 0 : 1;

    if (!title) {
        return c.redirect('/admin/servicos?error=Título do serviço é obrigatório.');
    }

    await db.prepare(
        `UPDATE services
         SET name = ?, title = ?, category = ?, base_price = ?, price = ?, price_starting_at = ?, short_description = ?, summary = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(title, title, category, price, price, price, summary, summary, isActive, id).run();

    return c.redirect('/admin/servicos?success=Pacote de serviço atualizado com sucesso!');
});

adminServicesRoutes.post('/servicos/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        await db.prepare(`DELETE FROM services WHERE id = ?`).bind(id).run();
    }

    return c.redirect('/admin/servicos?success=Pacote de serviço excluído com sucesso.');
});
