import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth, requireStaff } from '../middleware/auth';
import { getRequestBody } from '../lib/request';
import { hashPassword } from '../lib/password';
import { getAdminDashboardStats } from '../lib/admin';

import { AdminDashboardView } from '../views/admin/dashboard';
import { AdminLayout } from '../views/admin/layout';
import { AdminCrmView } from '../views/admin/crm';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import { AdminClientsView } from '../views/admin/clients';
import { AdminRequestsView } from '../views/admin/requests';
import { AdminServicesView } from '../views/admin/services';
import { AdminUsersView } from '../views/admin/users';
import { AdminSettingsView } from '../views/admin/settings';
import { sendWhatsAppTextMessage } from '../services/whatsapp';
import { AdminChatView } from '../views/admin/chat';
import { AdminProjectsView } from '../views/admin/projects';
import { AdminFinanceView } from '../views/admin/finance';
import { AdminDomainsView } from '../views/admin/domains';
import { AdminCampaignsView } from '../views/admin/campaigns';
import { sendInvoiceNoticeEmail } from '../lib/email';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Protege todas as rotas do admin exigindo login e perfil staff
adminRoutes.use('*', requireAuth, requireStaff);

// Helper para obter mensagens de feedback
function getFlashMessages(c: any) {
    return {
        successMessage: c.req.query('success') || null,
        errorMessage: c.req.query('error') || null
    };
}

// ==========================================
// 1. DASHBOARD EXECUTIVO
// ==========================================
const handleDashboard = async (c: any) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const stats = await getAdminDashboardStats(db);

    return c.html(
        <AdminDashboardView
            currentUser={user}
            stats={stats}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
};

adminRoutes.get('', handleDashboard);
adminRoutes.get('/', handleDashboard);
adminRoutes.get('/dashboard', handleDashboard);

adminRoutes.get('/relatorio/exportar', async (c) => {
    const db = c.env.DB;
    const period = Number(c.req.query('period') || 30);
    const stats = await getAdminDashboardStats(db, period);
    const csvLines = [
        'Metrica,Valor',
        `"Clientes Totais",${stats.totalClients}`,
        `"Clientes Ativos",${stats.activeClients}`,
        `"Leads",${stats.leadClients}`,
        `"Solicitacoes Totais",${stats.totalRequests}`,
        `"Solicitacoes Pendentes",${stats.pendingRequests}`,
        `"Projetos Ativos",${stats.activeProjects}`,
        `"Orcamentos Emitidos",${stats.totalQuotations}`,
        `"Orcamentos Aprovados",${stats.approvedQuotations}`,
        `"Receita Recebida (R$)",${stats.monthlyRevenue}`,
        `"A Receber (R$)",${stats.pendingReceivables}`
    ];
    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="relatorio-gundjatech-${period}d.csv"`);
    return c.body(csvLines.join('\n'));
});

// ==========================================
// 2. CLIENTES & EMPRESAS
// ==========================================
adminRoutes.get('/clientes', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    let query = `SELECT * FROM clients WHERE 1=1`;
    const params: any[] = [];

    if (search) {
        query += ` AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    if (statusFilter) {
        query += ` AND status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = db.prepare(query);
    const clients = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    return c.html(
        <AdminClientsView
            currentUser={user}
            clients={clients}
            search={search}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.get('/clientes/novo', async (c) => {
    const user = c.get('user');
    const { successMessage, errorMessage } = getFlashMessages(c);

    return c.html(
        <AdminClientsView
            currentUser={user}
            clients={[]}
            isCreate={true}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/clientes', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const name = String(body.name || '').trim();
    const company = String(body.company || '').trim() || null;
    const trade_name = String(body.trade_name || '').trim() || null;
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;
    const document = String(body.document || body.tax_id || '').trim() || null;
    const segment = String(body.segment || '').trim() || null;
    const status = String(body.status || 'lead').trim();
    const notes = String(body.notes || '').trim() || null;

    if (!name || !email) {
        return c.redirect('/admin/clientes?error=Nome e E-mail são obrigatórios');
    }

    try {
        await db.prepare(
            `INSERT INTO clients (name, company, trade_name, email, phone, document, segment, status, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(name, company, trade_name, email, phone, document, segment, status, notes).run();

        return c.redirect('/admin/clientes?success=Cliente cadastrado com sucesso');
    } catch (err: any) {
        return c.redirect(`/admin/clientes?error=${encodeURIComponent(err.message || 'Erro ao cadastrar cliente')}`);
    }
});

adminRoutes.post('/clientes/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(`DELETE FROM clients WHERE id = ?`).bind(id).run();
    return c.redirect('/admin/clientes?success=Cliente removido com sucesso');
});

// ==========================================
// 3. SOLICITAÇÕES & LEADS (CRM PIPELINE)
// ==========================================
adminRoutes.get('/solicitacoes', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    let query = `SELECT * FROM service_requests WHERE 1=1`;
    const params: any[] = [];

    if (search) {
        query += ` AND (protocol LIKE ? OR name LIKE ? OR company LIKE ? OR email LIKE ? OR service_title LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
    }

    if (statusFilter) {
        query += ` AND status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = db.prepare(query);
    const requests = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    return c.html(
        <AdminRequestsView
            currentUser={user}
            requests={requests}
            search={search}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.get('/solicitacoes/:id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const id = c.req.param('id');
    const { successMessage, errorMessage } = getFlashMessages(c);

    const requestDetail = await db.prepare(
        `SELECT * FROM service_requests WHERE id = ?`
    ).bind(id).first();

    if (!requestDetail) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    const history = (await db.prepare(
        `SELECT h.*, u.name as user_name 
         FROM service_request_history h 
         LEFT JOIN users u ON h.user_id = u.id 
         WHERE h.service_request_id = ? 
         ORDER BY h.created_at DESC`
    ).bind(id).all()).results || [];

    return c.html(
        <AdminRequestsView
            currentUser={user}
            requests={[]}
            requestDetail={requestDetail}
            history={history}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/solicitacoes/:id/status', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const newStatus = String(body.status || '').trim();
    const notes = String(body.notes || body.comment || '').trim() || null;

    if (!newStatus) {
        return c.redirect(`/admin/solicitacoes/${id}?error=Status inválido`);
    }

    const current = await db.prepare(`SELECT status FROM service_requests WHERE id = ?`).bind(id).first<{ status: string }>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    await db.prepare(
        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newStatus, id).run();

    await db.prepare(
        `INSERT INTO service_request_history (service_request_id, user_id, action, from_status, to_status, notes, created_at)
         VALUES (?, ?, 'status_change', ?, ?, ?, datetime('now'))`
    ).bind(id, user.id, current.status, newStatus, notes).run();

    return c.redirect(`/admin/solicitacoes/${id}?success=Status atualizado com sucesso`);
});

adminRoutes.post('/solicitacoes/:id/cancelar', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');

    const current = await db.prepare(`SELECT status FROM service_requests WHERE id = ?`).bind(id).first<{ status: string }>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    await db.prepare(
        `UPDATE service_requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    await db.prepare(
        `INSERT INTO service_request_history (service_request_id, user_id, action, from_status, to_status, notes, created_at)
         VALUES (?, ?, 'cancelled', ?, 'cancelled', 'Solicitação cancelada pela administração', datetime('now'))`
    ).bind(id, user.id, current.status).run();

    return c.redirect(`/admin/solicitacoes/${id}?success=Solicitação cancelada`);
});

adminRoutes.post('/solicitacoes/:id/converter', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');

    const req = await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(id).first<any>();
    if (!req) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    // Garante que existe cliente associado
    let clientId = req.client_id;
    if (!clientId) {
        const existingClient = await db.prepare(`SELECT id FROM clients WHERE lower(email) = lower(?)`).bind(req.email).first<{ id: number }>();
        if (existingClient) {
            clientId = existingClient.id;
        } else {
            const insClient = await db.prepare(
                `INSERT INTO clients (name, company, email, phone, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`
            ).bind(req.name, req.company, req.email, req.phone).run();
            clientId = insClient.meta.last_row_id;
        }
    }

    // Cria o projeto
    const projectName = req.service_title || req.title || `Projeto • ${req.company || req.name}`;
    const projectDesc = req.briefing || req.description || 'Projeto iniciado via solicitação web';

    await db.prepare(
        `INSERT INTO projects (client_id, name, description, status, priority, start_date, created_at, updated_at)
         VALUES (?, ?, ?, 'planning', 'high', date('now'), datetime('now'), datetime('now'))`
    ).bind(clientId, projectName, projectDesc).run();

    // Atualiza solicitação para approved
    await db.prepare(
        `UPDATE service_requests SET status = 'approved', client_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(clientId, id).run();

    // Histórico
    await db.prepare(
        `INSERT INTO service_request_history (service_request_id, user_id, action, from_status, to_status, notes, created_at)
         VALUES (?, ?, 'converted_to_project', ?, 'approved', 'Convertido em Projeto pela administração', datetime('now'))`
    ).bind(id, user.id, req.status).run();

    return c.redirect(`/admin/solicitacoes/${id}?success=Solicitação convertida em Projeto com sucesso!`);
});

// ==========================================
// 4. PACOTES DE SERVIÇOS & CATÁLOGO
// ==========================================
const DEFAULT_CATEGORIES = [
    { id: 'sites', name: 'Websites & Portais' },
    { id: 'ecommerce', name: 'E-commerce B2B/B2C' },
    { id: 'software', name: 'Software & SaaS Edge' },
    { id: 'infra', name: 'Infra & Cloudflare' }
];

adminRoutes.get('/servicos', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

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

adminRoutes.get('/servicos/novo', async (c) => {
    const user = c.get('user');
    const { successMessage, errorMessage } = getFlashMessages(c);

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

adminRoutes.post('/servicos', async (c) => {
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

const toggleServiceHandler = async (c: any) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE services SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/servicos?success=Status do serviço atualizado');
};

adminRoutes.post('/servicos/:id/toggle', toggleServiceHandler);
adminRoutes.post('/servicos/:id/excluir', toggleServiceHandler);

// ==========================================
// 5. EQUIPE & USUÁRIOS (RBAC)
// ==========================================
adminRoutes.get('/usuarios', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const search = (c.req.query('search') || '').trim();
    const roleFilter = (c.req.query('role') || '').trim();

    let query = `SELECT id, name, email, role, phone, company, is_active, created_at FROM users WHERE 1=1`;
    const params: any[] = [];

    if (search) {
        query += ` AND (name LIKE ? OR email LIKE ? OR company LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    if (roleFilter) {
        query += ` AND role = ?`;
        params.push(roleFilter);
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = db.prepare(query);
    const users = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    return c.html(
        <AdminUsersView
            currentUser={user}
            users={users}
            search={search}
            roleFilter={roleFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/usuarios', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;
    const role = String(body.role || 'client').trim();
    const company = String(body.company || '').trim() || null;
    const password = String(body.password || '');

    if (!name || !email || !password) {
        return c.redirect('/admin/usuarios?error=Nome, E-mail e Senha são obrigatórios');
    }

    if (password.length < 8) {
        return c.redirect('/admin/usuarios?error=A senha deve ter no mínimo 8 caracteres');
    }

    const existing = await db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?)`).bind(email).first();
    if (existing) {
        return c.redirect('/admin/usuarios?error=Já existe um usuário cadastrado com este e-mail');
    }

    const hashedPassword = await hashPassword(password);

    await db.prepare(
        `INSERT INTO users (name, email, phone, role, company, password, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(name, email, phone, role, company, hashedPassword).run();

    return c.redirect('/admin/usuarios?success=Novo usuário cadastrado com sucesso');
});

adminRoutes.post('/usuarios/:id/status', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const isActive = body.is_active === '1' || body.is_active === 1 ? 1 : 0;

    await db.prepare(
        `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(isActive, id).run();

    return c.redirect('/admin/usuarios?success=Status do usuário atualizado com sucesso');
});

// ==========================================
// 6. CENTRAL DE ATENDIMENTO CRM & CHAT AO VIVO
// ==========================================
adminRoutes.get('/atendimento', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const statusFilter = c.req.query('status') || 'open';
    const activeId = c.req.query('id');

    let convQuery = `SELECT * FROM conversations WHERE 1=1`;
    const params: any[] = [];

    if (statusFilter === 'open') {
        convQuery += ` AND status = 'open'`;
    } else if (statusFilter === 'closed') {
        convQuery += ` AND status = 'closed'`;
    }

    convQuery += ` ORDER BY last_message_at DESC, created_at DESC`;

    const stmt = db.prepare(convQuery);
    const conversations = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    let activeConversation: any = null;
    let messages: any[] = [];

    if (activeId) {
        activeConversation = await db.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(activeId).first();
        if (activeConversation) {
            messages = (await db.prepare(
                `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`
            ).bind(activeId).all()).results || [];
        }
    } else if (conversations.length > 0) {
        // Seleciona a primeira automaticamente
        activeConversation = conversations[0];
        messages = (await db.prepare(
            `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`
        ).bind(activeConversation.id).all()).results || [];
    }

    return c.html(
        <AdminChatView
            currentUser={user}
            conversations={conversations}
            activeConversation={activeConversation}
            messages={messages}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/atendimento/:id/mensagem', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const message = String(body.message || '').trim();
    if (!message) {
        return c.redirect(`/admin/atendimento?id=${id}&error=Mensagem não pode ser vazia`);
    }

    // Insere resposta do atendente humano
    await db.prepare(
        `INSERT INTO conversation_messages (conversation_id, sender_type, sender_id, message, is_ai, created_at, updated_at)
         VALUES (?, 'staff', ?, ?, 0, datetime('now'), datetime('now'))`
    ).bind(id, user.id, message).run();

    // Atualiza conversa
    await db.prepare(
        `UPDATE conversations SET last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    // Se a conversa for do canal WhatsApp, entrega a resposta humana diretamente no WhatsApp do cliente
    try {
        const conv = await db.prepare(
            `SELECT channel, visitor_phone FROM conversations WHERE id = ?`
        ).bind(id).first<{ channel?: string; visitor_phone?: string }>();

        if (conv?.channel === 'whatsapp' && conv.visitor_phone) {
            await sendWhatsAppTextMessage(c.env, conv.visitor_phone, message);
        }
    } catch (waErr) {
        console.warn('[Admin Chat] Falha ao entregar resposta no WhatsApp:', waErr);
    }

    return c.redirect(`/admin/atendimento?id=${id}&success=Mensagem enviada com sucesso`);
});

adminRoutes.post('/atendimento/:id/toggle-ai', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE conversations SET ai_enabled = CASE WHEN ai_enabled = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect(`/admin/atendimento?id=${id}&success=Status da IA autônoma atualizado`);
});

adminRoutes.post('/atendimento/:id/fechar', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE conversations SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect(`/admin/atendimento?id=${id}&success=Conversa encerrada`);
});

adminRoutes.post('/atendimento/:id/reabrir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE conversations SET status = 'open', closed_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect(`/admin/atendimento?id=${id}&success=Conversa reaberta com sucesso`);
});

// ==========================================
// 7. GESTÃO AVANÇADA DE PROJETOS & ENTREGAS
// ==========================================
adminRoutes.get('/projetos', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    let query = `
        SELECT p.*, c.name as client_name, c.company
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (p.title LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    if (statusFilter) {
        query += ` AND p.status = ?`;
        params.push(statusFilter);
    }

    query += ` ORDER BY p.created_at DESC`;

    const stmt = db.prepare(query);
    const projects = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    const clients = (await db.prepare(`SELECT id, name, company FROM clients ORDER BY company ASC, name ASC`).all()).results || [];

    return c.html(
        <AdminProjectsView
            currentUser={user}
            projects={projects}
            clients={clients}
            search={search}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/projetos', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const clientId = Number(body.client_id);
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim() || null;
    const startDate = String(body.start_date || '').trim() || null;
    const expectedEndDate = String(body.expected_end_date || '').trim() || null;

    if (!clientId || !title) {
        return c.redirect('/admin/projetos?error=Cliente e Título são obrigatórios');
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    try {
        await db.prepare(
            `INSERT INTO projects (client_id, title, slug, description, status, progress_percentage, start_date, expected_end_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'planning', 0, ?, ?, datetime('now'), datetime('now'))`
        ).bind(clientId, title, slug, description, startDate, expectedEndDate).run();

        return c.redirect('/admin/projetos?success=Projeto cadastrado com sucesso');
    } catch (err: any) {
        return c.redirect(`/admin/projetos?error=${encodeURIComponent(err.message || 'Erro ao criar projeto')}`);
    }
});

adminRoutes.get('/projetos/:id', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const id = c.req.param('id');
    const { successMessage, errorMessage } = getFlashMessages(c);

    const projectDetail = await db.prepare(
        `SELECT p.*, c.name as client_name, c.company, c.email as client_email
         FROM projects p
         LEFT JOIN clients c ON p.client_id = c.id
         WHERE p.id = ?`
    ).bind(id).first();

    if (!projectDetail) {
        return c.redirect('/admin/projetos?error=Projeto não encontrado');
    }

    const stages = (await db.prepare(
        `SELECT * FROM project_stages WHERE project_id = ? ORDER BY sort_order ASC, id ASC`
    ).bind(id).all()).results || [];

    const attachments = (await db.prepare(
        `SELECT * FROM project_attachments WHERE project_id = ? ORDER BY created_at DESC`
    ).bind(id).all()).results || [];

    return c.html(
        <AdminProjectsView
            currentUser={user}
            projects={[]}
            projectDetail={projectDetail}
            stages={stages}
            attachments={attachments}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/projetos/:id', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const status = String(body.status || 'planning').trim();
    const progress = Math.min(100, Math.max(0, Number(body.progress_percentage) || 0));
    const startDate = String(body.start_date || '').trim() || null;
    const expectedEndDate = String(body.expected_end_date || '').trim() || null;

    await db.prepare(
        `UPDATE projects 
         SET status = ?, progress_percentage = ?, start_date = ?, expected_end_date = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(status, progress, startDate, expectedEndDate, id).run();

    return c.redirect(`/admin/projetos/${id}?success=Projeto atualizado com sucesso`);
});

adminRoutes.post('/projetos/:id/etapas', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const title = String(body.title || '').trim();
    if (!title) {
        return c.redirect(`/admin/projetos/${id}?error=Título da etapa é obrigatório`);
    }

    await db.prepare(
        `INSERT INTO project_stages (project_id, title, status, sort_order, created_at, updated_at)
         VALUES (?, ?, 'pending', 0, datetime('now'), datetime('now'))`
    ).bind(id, title).run();

    return c.redirect(`/admin/projetos/${id}?success=Etapa adicionada com sucesso`);
});

adminRoutes.post('/projetos/:id/etapas/:stageId/toggle', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');
    const stageId = c.req.param('stageId');

    const current = await db.prepare(`SELECT status FROM project_stages WHERE id = ?`).bind(stageId).first<{ status: string }>();
    const nextStatus = current?.status === 'completed' ? 'pending' : 'completed';

    await db.prepare(
        `UPDATE project_stages 
         SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN datetime('now') ELSE NULL END, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(nextStatus, nextStatus, stageId).run();

    return c.redirect(`/admin/projetos/${id}?success=Status da etapa atualizado`);
});

// ==========================================
// 8. FATURAS & GESTÃO FINANCEIRA
// ==========================================
adminRoutes.get('/financeiro', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();
    const typeFilter = (c.req.query('type') || '').trim();

    // Métricas financeiras
    const totalInvoicedRow = await db.prepare(
        `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status != 'canceled'`
    ).first<{ val: number }>();

    const totalReceivedRow = await db.prepare(
        `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status = 'paid'`
    ).first<{ val: number }>();

    const totalPendingRow = await db.prepare(
        `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status = 'pending'`
    ).first<{ val: number }>();

    const totalOverdueRow = await db.prepare(
        `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status = 'pending' AND due_date < date('now')`
    ).first<{ val: number }>();

    let query = `
        SELECT t.*, c.name as client_name, c.company, c.email as client_email
        FROM financial_transactions t
        LEFT JOIN clients c ON t.client_id = c.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (t.description LIKE ? OR t.invoice_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    if (statusFilter) {
        query += ` AND t.status = ?`;
        params.push(statusFilter);
    }

    if (typeFilter) {
        query += ` AND t.type = ?`;
        params.push(typeFilter);
    }

    query += ` ORDER BY t.due_date DESC, t.created_at DESC`;

    const stmt = db.prepare(query);
    const transactions = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

    const clients = (await db.prepare(`SELECT id, name, company FROM clients ORDER BY company ASC, name ASC`).all()).results || [];

    return c.html(
        <AdminFinanceView
            currentUser={user}
            transactions={transactions}
            clients={clients}
            metrics={{
                totalInvoiced: totalInvoicedRow?.val || 0,
                totalReceived: totalReceivedRow?.val || 0,
                totalPending: totalPendingRow?.val || 0,
                totalOverdue: totalOverdueRow?.val || 0
            }}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            search={search}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/financeiro', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const clientId = Number(body.client_id);
    const description = String(body.description || '').trim();
    const amount = Number(body.amount);
    const dueDate = String(body.due_date || '').trim();
    const paymentMethod = String(body.payment_method || 'PIX').trim();
    const invoiceNumber = String(body.invoice_number || '').trim() || null;

    if (!clientId || !description || !amount || !dueDate) {
        return c.redirect('/admin/financeiro?error=Preencha todos os campos obrigatórios');
    }

    await db.prepare(
        `INSERT INTO financial_transactions (client_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
         VALUES (?, 'income', 'contract', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(clientId, description, amount, dueDate, paymentMethod, invoiceNumber).run();

    try {
        const client = await db.prepare(`SELECT name, email FROM clients WHERE id = ?`).bind(clientId).first<{ name: string; email: string }>();
        if (client && client.email) {
            await sendInvoiceNoticeEmail(c.env, client.email, client.name, {
                description,
                amount,
                dueDate,
                invoiceNumber: invoiceNumber || undefined
            });
        }
    } catch (mailErr) {
        console.error('Erro ao despachar e-mail de fatura:', mailErr);
    }

    return c.redirect('/admin/financeiro?success=Fatura cadastrada com sucesso');
});

adminRoutes.post('/financeiro/:id/pagar', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE financial_transactions SET status = 'paid', paid_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/financeiro?success=Fatura liquidada com sucesso');
});

adminRoutes.post('/financeiro/:id/cancelar', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE financial_transactions SET status = 'canceled', updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/financeiro?success=Fatura cancelada');
});

// ==========================================
// 9. DOMÍNIOS & ZONAS DNS
// ==========================================
adminRoutes.get('/dominios', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

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

adminRoutes.post('/dominios', async (c) => {
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

adminRoutes.post('/dominios/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(`DELETE FROM domains WHERE id = ?`).bind(id).run();
    return c.redirect('/admin/dominios?success=Domínio removido');
});

// ==========================================
// 10. CAMPANHAS DE PERFORMANCE & ADS
// ==========================================
adminRoutes.get('/campanhas', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

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

adminRoutes.post('/campanhas', async (c) => {
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

adminRoutes.post('/campanhas/:id/toggle', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE advertising_campaigns 
         SET status = CASE WHEN status = 'active' THEN 'paused' ELSE 'active' END, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(id).run();

    return c.redirect('/admin/campanhas?success=Status da campanha alterado');
});

// ==========================================
// 11. ORÇAMENTOS, CRM AUTÔNOMO IA & PERMISSÕES RBAC
// ==========================================
adminRoutes.get('/orcamentos', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    let quotations: any[] = [];
    try {
        const res = await db.prepare(
            `SELECT q.*, c.name as client_name, c.company
             FROM quotations q
             LEFT JOIN clients c ON q.client_id = c.id
             ORDER BY q.id DESC`
        ).all();
        quotations = res.results || [];
    } catch {}

    return c.html(
        <AdminLayout
            title="Orçamentos & Propostas • Painel Administrativo GundjaTech"
            activeNav="quotations"
            currentUser={user}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="text-xl font-extrabold text-white">Orçamentos &amp; Propostas Comerciais</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Propostas geradas manualmente e pré-orçamentos do CRM Autônomo IA.</p>
                </div>
                <a href="/admin/solicitacoes" class="gt-btn-primary">+ Gerar a partir de Solicitação</a>
            </div>

            <div class="gtb-card" style="padding: 0; overflow: hidden;">
                {quotations.length === 0 ? (
                    <div class="gt-empty-state">Nenhum orçamento emitido até o momento.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[#8C95AA] uppercase">
                                    <th class="py-3 px-4">Código</th>
                                    <th class="py-3 px-4">Título / Cliente</th>
                                    <th class="py-3 px-4">Valor Total</th>
                                    <th class="py-3 px-4">Validade</th>
                                    <th class="py-3 px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {quotations.map((q: any) => (
                                    <tr>
                                        <td class="py-3 px-4 font-mono font-bold text-[#F2C230] whitespace-nowrap">{q.reference_code || q.quotation_number || `#${q.id}`}</td>
                                        <td class="py-3 px-4">
                                            <div class="font-bold text-white">{q.title || 'Proposta Comercial'}</div>
                                            <div class="text-[11px] text-[#8C95AA]">{q.client_name || q.company || 'Cliente'}</div>
                                        </td>
                                        <td class="py-3 px-4 font-extrabold text-white whitespace-nowrap">
                                            R$ {Number(q.final_amount || q.total_amount || q.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td class="py-3 px-4 text-[#8C95AA] whitespace-nowrap">{q.expires_at || q.valid_until || '—'}</td>
                                        <td class="py-3 px-4 whitespace-nowrap">
                                            <span class={`gt-badge ${q.status === 'approved' ? 'gt-badge-success' : 'gt-badge-warning'}`}>{q.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
});

adminRoutes.get('/orcamentos/novo', (c) => c.redirect('/admin/orcamentos'));
adminRoutes.get('/permissoes', (c) => c.redirect('/admin/usuarios'));

// ==========================================
// 12. CRM AUTÔNOMO IA (/admin/crm-autonomo)
// ==========================================
adminRoutes.get('/crm-autonomo', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    let conversations: any[] = [];
    let settingsMap: Record<string, string> = {};
    let aiQuotationsCount = 0;

    try {
        const convRes = await db.prepare(
            `SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 30`
        ).all();
        conversations = convRes.results || [];
    } catch {}

    try {
        const setRes = await db.prepare(
            `SELECT key, value FROM system_settings WHERE group_name = 'crm_ai'`
        ).all<{ key: string; value: string }>();
        for (const row of setRes.results || []) {
            settingsMap[row.key] = row.value || '';
        }
    } catch {}

    try {
        const qRes = await db.prepare(
            `SELECT COUNT(*) as total FROM quotations WHERE reference_code LIKE 'ORC-AI-%'`
        ).first<{ total: number }>();
        aiQuotationsCount = qRes?.total ?? 0;
    } catch {}

    const activeAutopilotCount = conversations.filter((x) => x.ai_enabled && x.status !== 'closed').length;
    const qualifyingCount = conversations.filter((x) => x.status !== 'closed' && ['new', 'greeting', 'discovery', 'qualifying', 'qualification'].includes(String(x.crm_stage || ''))).length;
    const handoffCount = conversations.filter((x) => x.status === 'waiting_staff' || x.crm_stage === 'handoff_human').length;

    const hasApiKey = Boolean(settingsMap.crm_ai_api_key || c.env.GEMINI_API_KEY || c.env.OPENAI_API_KEY);
    const safeSettings = { ...settingsMap };
    delete safeSettings.crm_ai_api_key;

    return c.html(
        <AdminCrmView
            currentUser={user}
            conversations={conversations}
            settings={safeSettings}
            hasApiKey={hasApiKey}
            stats={{
                activeAutopilotCount,
                qualifyingCount,
                aiQuotationsCount,
                handoffCount
            }}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/crm-autonomo/configuracoes', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const pairs: Array<[string, string]> = [
        ['crm_ai_enabled', body.crm_ai_enabled ? '1' : '0'],
        ['crm_ai_auto_draft_quotation', body.crm_ai_auto_draft_quotation ? '1' : '0'],
        ['crm_ai_agent_name', String(body.crm_ai_agent_name || 'Assistente IA GundjaTech').trim()],
        ['crm_ai_provider', String(body.crm_ai_provider || 'auto').trim()],
        ['crm_ai_model', String(body.crm_ai_model || 'gemini-2.5-flash').trim()],
        ['crm_ai_system_prompt', String(body.crm_ai_system_prompt || '').trim()]
    ];

    const submittedApiKey = String(body.crm_ai_api_key || '').trim();
    if (submittedApiKey) {
        pairs.push(['crm_ai_api_key', submittedApiKey]);
    }

    try {
        for (const [key, value] of pairs) {
            await db.prepare(
                `INSERT INTO system_settings (key, value, type, group_name, created_at, updated_at)
                 VALUES (?, ?, 'string', 'crm_ai', datetime('now'), datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
            ).bind(key, value).run();
        }
    } catch {}

    return c.redirect('/admin/crm-autonomo?success=Configurações do CRM Autônomo IA salvas com sucesso');
});

adminRoutes.post('/crm-autonomo/testar', async (c) => {
    try {
        const agent = new AutonomousCrmAgent(c.env);
        const testReply = await agent.handleIncomingMessage(0, 'Olá, quero um orçamento para um site institucional.', 'Teste Diretoria');
        const motorTag = testReply?.provider ? `[${testReply.provider}] ` : '';
        const preview = String(testReply?.message || 'Conexão IA validada!').slice(0, 90);
        return c.redirect(`/admin/crm-autonomo?success=${encodeURIComponent('Conexão IA OK ' + motorTag + preview)}`);
    } catch (err: any) {
        return c.redirect(`/admin/crm-autonomo?error=${encodeURIComponent(err?.message || 'Falha ao testar IA')}`);
    }
});

// ==========================================
// 12B. CONFIGURAÇÕES GERAIS (/admin/configuracoes)
// ==========================================
adminRoutes.get('/configuracoes', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const settingsMap: Record<string, string> = {};
    try {
        const res = await db.prepare(`SELECT key, value FROM system_settings`).all<{ key: string; value: string }>();
        for (const row of res.results || []) {
            settingsMap[row.key] = row.value || '';
        }
    } catch {}

    const activeProvider = settingsMap.whatsapp_provider || 'zapi_omni';
    const whatsappConfigured =
        activeProvider === 'zapi' || activeProvider === 'zapi_omni'
            ? Boolean(settingsMap.whatsapp_zapi_instance_id && settingsMap.whatsapp_zapi_token)
            : activeProvider === 'evolution'
            ? Boolean(settingsMap.whatsapp_evolution_url && settingsMap.whatsapp_evolution_instance && settingsMap.whatsapp_evolution_api_key)
            : Boolean((c.env.WHATSAPP_ACCESS_TOKEN || settingsMap.whatsapp_access_token) && (c.env.WHATSAPP_PHONE_NUMBER_ID || settingsMap.whatsapp_phone_number_id));

    settingsMap.has_zapi_token = settingsMap.whatsapp_zapi_token ? '1' : '';
    settingsMap.has_zapi_client_token = settingsMap.whatsapp_zapi_client_token ? '1' : '';
    settingsMap.has_evolution_key = settingsMap.whatsapp_evolution_api_key ? '1' : '';
    delete settingsMap.whatsapp_access_token;
    delete settingsMap.whatsapp_zapi_token;
    delete settingsMap.whatsapp_zapi_client_token;
    delete settingsMap.whatsapp_evolution_api_key;

    const origin = new URL(c.req.url).origin;
    return c.html(
        <AdminSettingsView
            currentUser={user}
            settings={settingsMap}
            whatsappConfigured={whatsappConfigured}
            webhookUrl={`${origin}/api/webhooks/whatsapp`}
            verifyToken={c.env.WHATSAPP_VERIFY_TOKEN || 'gundjatech_wa_verify_2026'}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/configuracoes', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const pairs: Array<[string, string, string]> = [
        ['company_name', String(body.company_name || 'GundjaTech').trim(), 'general'],
        ['company_cnpj', String(body.company_cnpj || '').trim(), 'general'],
        ['company_slogan', String(body.company_slogan || '').trim(), 'general'],
        ['company_email', String(body.company_email || '').trim(), 'general'],
        ['company_phone', String(body.company_phone || '').trim(), 'general'],
        ['company_whatsapp', String(body.company_whatsapp || '').trim(), 'general'],
        ['company_address', String(body.company_address || '').trim(), 'general']
    ];

    const provider = String(body.whatsapp_provider || '').trim();
    if (provider === 'zapi' || provider === 'zapi_omni' || provider === 'evolution' || provider === 'meta') {
        pairs.push(['whatsapp_provider', provider, 'integrations']);
    }

    const optionalSecrets: Array<[string, string]> = [
        ['whatsapp_phone_number_id', String(body.whatsapp_phone_number_id || '').trim()],
        ['whatsapp_access_token', String(body.whatsapp_access_token || '').trim()],
        ['whatsapp_zapi_instance_id', String(body.whatsapp_zapi_instance_id || '').trim()],
        ['whatsapp_zapi_token', String(body.whatsapp_zapi_token || '').trim()],
        ['whatsapp_zapi_client_token', String(body.whatsapp_zapi_client_token || '').trim()],
        ['whatsapp_evolution_url', String(body.whatsapp_evolution_url || '').trim()],
        ['whatsapp_evolution_instance', String(body.whatsapp_evolution_instance || '').trim()],
        ['whatsapp_evolution_api_key', String(body.whatsapp_evolution_api_key || '').trim()]
    ];
    for (const [k, v] of optionalSecrets) {
        if (v) pairs.push([k, v, 'integrations']);
    }

    try {
        for (const [key, value, groupName] of pairs) {
            await db.prepare(
                `INSERT INTO system_settings (key, value, type, group_name, created_at, updated_at)
                 VALUES (?, ?, 'string', ?, datetime('now'), datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
            ).bind(key, value, groupName).run();
        }
    } catch {}

    return c.redirect('/admin/configuracoes?success=Configurações gerais salvas com sucesso');
});

// ==========================================
// 13. RESUMO EM TEMPO REAL & MENSAGENS (SOM & NOTIFICAÇÕES)
// ==========================================
adminRoutes.get('/atendimento/:id/mensagens', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const afterId = Number(c.req.query('after_id') || 0);

    try {
        const query = afterId > 0
            ? `SELECT id, sender_type, message, is_ai, created_at FROM conversation_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC`
            : `SELECT id, sender_type, message, is_ai, created_at FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC`;
        const stmt = afterId > 0 ? db.prepare(query).bind(id, afterId) : db.prepare(query).bind(id);
        const res = await stmt.all();
        return c.json({ ok: true, messages: res.results || [] });
    } catch {
        return c.json({ ok: true, messages: [] });
    }
});

adminRoutes.get('/atendimento/resumo', async (c) => {
    const db = c.env.DB;
    const stats = await getAdminDashboardStats(db, 30);

    let latestConversationId = 0;
    let latestClientMessageId = 0;
    let latestRequestId = 0;
    const notifications: any[] = [];

    try {
        const cRow = await db.prepare(`SELECT MAX(id) as max_id FROM conversations`).first<{ max_id: number }>();
        latestConversationId = cRow?.max_id ?? 0;

        const mRow = await db.prepare(`SELECT MAX(id) as max_id FROM conversation_messages WHERE sender_type IN ('client', 'visitor')`).first<{ max_id: number }>();
        latestClientMessageId = mRow?.max_id ?? 0;

        const rRow = await db.prepare(`SELECT MAX(id) as max_id FROM service_requests`).first<{ max_id: number }>();
        latestRequestId = rRow?.max_id ?? 0;

        for (const req of (stats.recentRequests || []).slice(0, 3)) {
            notifications.push({
                key: `request:${req.id}`,
                type: 'request',
                title: req.service_title || req.title || `Solicitação ${req.protocol}`,
                subtitle: `${req.protocol || ''} • ${req.name || 'Cliente'}`,
                time: String(req.created_at || '').slice(11, 16),
                url: `/admin/solicitacoes/${req.id}`
            });
        }
        for (const conv of (stats.recentConversations || []).slice(0, 3)) {
            notifications.push({
                key: `chat:${conv.id}`,
                type: 'chat',
                title: `Chat • ${conv.visitor_name || 'Visitante'}`,
                subtitle: conv.subject || 'Atendimento aberto',
                time: String(conv.updated_at || '').slice(11, 16),
                url: `/admin/atendimento?id=${conv.id}`
            });
        }
    } catch {}

    return c.json({
        ok: true,
        pending_requests: stats.pendingRequests,
        open_chats: stats.openConversations,
        total_notifications: stats.pendingRequests + stats.openConversations,
        latest_conversation_id: latestConversationId,
        latest_client_message_id: latestClientMessageId,
        latest_request_id: latestRequestId,
        notifications
    });
});
