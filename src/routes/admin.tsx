import { Hono } from 'hono';
import { Env, AppVariables, UserRole } from '../types/env';
import { requireAuth, requirePermission, requireStaff } from '../middleware/auth';
import {
    CONFIGURABLE_STAFF_ROLES,
    hasPermission,
    loadDynamicRbacConfig,
    resolveEffectivePermissions,
    saveRolePermissions,
    saveUserPermissionOverride
} from '../lib/rbac';
import { sha256Hex } from '../lib/crypto';
import { destroyAllUserSessions } from '../lib/session';
import { getRequestBody } from '../lib/request';
import { hashPassword } from '../lib/password';
import { getAdminDashboardStats } from '../lib/admin';

import { AdminDashboardView } from '../views/admin/dashboard';
import { AdminLayout } from '../views/admin/layout';
import { AdminCrmView } from '../views/admin/crm';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import { AdminClientsView } from '../views/admin/clients';
import { AdminRequestsView } from '../views/admin/requests';
import { AdminUsersView } from '../views/admin/users';
import { AdminPermissionsView } from '../views/admin/permissions';
import { AdminQuotationsView } from '../views/admin/quotations';
import { sendWhatsAppTextMessage } from '../services/whatsapp';
import { AdminChatView } from '../views/admin/chat';
import { AdminProjectsView } from '../views/admin/projects';
import { sendProjectStartedEmail, sendProjectCompletedEmail, sendPortalInviteEmail, sendEmail } from '../lib/email';
import { recordRequestTimeline } from '../lib/timeline';
import { adminServicesRoutes } from './admin/services';
import { adminDomainsRoutes } from './admin/domains';
import { adminCampaignsRoutes } from './admin/campaigns';
import { adminSettingsRoutes } from './admin/settings';
import { createAdminFinanceRoutes } from './admin/finance';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Protege todas as rotas do admin exigindo login e perfil staff
adminRoutes.use('*', requireAuth, requireStaff);

// Carrega permissões dinâmicas do D1 (por cargo + sobrescrita individual por usuário)
adminRoutes.use('*', async (c, next) => {
    const user = c.get('user');
    if (user && user.role !== 'superadmin') {
        try {
            const rbacCfg = await loadDynamicRbacConfig(c.env?.DB);
            user.effectivePermissions = resolveEffectivePermissions(user.role, user.id, rbacCfg);
        } catch {}
    }
    await next();
});

// RBAC Granular por módulo administrativo (leitura vs mutação)
function requireModulePermission(viewPermission: string, managePermission: string) {
    const viewGuard = requirePermission(viewPermission);
    const manageGuard = requirePermission(managePermission);
    return async (c: any, next: any) => {
        const method = c.req.method.toUpperCase();
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            return viewGuard(c, next);
        }
        return manageGuard(c, next);
    };
}

adminRoutes.use('/usuarios*', requirePermission('users.manage'));
adminRoutes.use('/permissoes*', requirePermission('users.manage'));
adminRoutes.use('/configuracoes*', requirePermission('settings.manage'));
adminRoutes.use('/financeiro*', requireModulePermission('finance.view', 'finance.manage'));
adminRoutes.use('/clientes*', requireModulePermission('clients.view', 'clients.manage'));
adminRoutes.use('/solicitacoes*', requireModulePermission('requests.view', 'requests.manage'));
adminRoutes.use('/servicos*', requireModulePermission('services.view', 'services.manage'));
adminRoutes.use('/projetos*', requireModulePermission('projects.view', 'projects.manage'));
adminRoutes.use('/dominios*', requireModulePermission('domains.view', 'domains.manage'));
adminRoutes.use('/campanhas*', requireModulePermission('campaigns.view', 'campaigns.manage'));
adminRoutes.use('/orcamentos*', requireModulePermission('quotations.view', 'quotations.manage'));
adminRoutes.use('/atendimento*', requireModulePermission('chat.view', 'chat.manage'));
adminRoutes.use('/crm-autonomo*', requirePermission('chat.manage'));
adminRoutes.use('/canais*', requirePermission('settings.manage'));
adminRoutes.use('/relatorio*', requirePermission('finance.view'));

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
    const user = c.get('user');
    const db = c.env.DB;
    const period = Number(c.req.query('period') || 30);
    const stats = await getAdminDashboardStats(db, period);

    const fmtBRL = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));
    const esc = (s: any) =>
        String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

    const emittedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const emitterName = user?.name || 'Diretoria GundjaTech';

    const statusPt: Record<string, string> = {
        new: 'Recebido',
        analyzing: 'Em Análise',
        quotation_sent: 'Orçamento Enviado',
        approved: 'Aprovado',
        in_progress: 'Em Execução',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };

    const recentRequests = Array.isArray(stats.recentRequests) ? stats.recentRequests : [];
    const recentClients = Array.isArray(stats.recentClients) ? stats.recentClients : [];

    const kpiRows = [
        {
            category: 'Financeiro',
            metric: 'Receita Recebida em Caixa',
            context: `Últimos ${period} dias`,
            value: fmtBRL(stats.monthlyRevenue)
        },
        {
            category: 'Financeiro',
            metric: 'Contas a Receber (Pendente)',
            context: 'Contratos aprovados em aberto',
            value: fmtBRL(stats.pendingReceivables)
        },
        {
            category: 'Comercial',
            metric: 'Orçamentos Aprovados',
            context: `${stats.totalQuotations} proposta(s) emitida(s)`,
            value: `${stats.approvedQuotations}`
        },
        {
            category: 'Comercial',
            metric: 'Propostas em Negociação',
            context: 'Aguardando aprovação do cliente',
            value: fmtBRL(stats.openQuotationsValue || 0)
        },
        {
            category: 'Engenharia',
            metric: 'Projetos em Execução',
            context: `${stats.totalProjects} projeto(s) na carteira`,
            value: `${stats.activeProjects}`
        },
        {
            category: 'Pipeline',
            metric: 'Solicitações Recebidas',
            context: `${stats.pendingRequests} aguardando triagem`,
            value: `${stats.totalRequests}`
        },
        {
            category: 'Clientes',
            metric: 'Clientes Ativos',
            context: `${stats.leadClients} lead(s) cadastrado(s)`,
            value: `${stats.activeClients}`
        }
    ];

    const excelHtml = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>Relatorio Executivo</x:Name>
        <x:WorksheetOptions>
          <x:DisplayGridlines/>
          <x:FitToPage/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body, table { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10pt; color: #1E293B; }
  table { border-collapse: collapse; table-layout: fixed; }
  td, th { padding: 8px 12px; vertical-align: middle; white-space: nowrap; mso-number-format: "\\@"; }
  .doc-title { background-color: #063B5C; color: #FFFFFF; font-size: 13pt; font-weight: bold; border: 1px solid #063B5C; }
  .doc-meta { background-color: #F8FAFC; color: #475569; font-size: 9.5pt; border-left: 1px solid #CBD5E1; border-right: 1px solid #CBD5E1; border-bottom: 1.5px solid #063B5C; }
  .sec-title { background-color: #FFFFFF; color: #063B5C; font-size: 10.5pt; font-weight: bold; border-bottom: 1.5px solid #063B5C; padding-top: 14px; padding-bottom: 6px; }
  .tbl-head { background-color: #F1F5F9; color: #063B5C; font-size: 9pt; font-weight: bold; text-transform: uppercase; border-top: 1px solid #CBD5E1; border-bottom: 1px solid #94A3B8; border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; }
  .cell { background-color: #FFFFFF; color: #1E293B; border: 1px solid #E2E8F0; }
  .cell-muted { background-color: #FFFFFF; color: #475569; border: 1px solid #E2E8F0; }
  .cell-strong { background-color: #FFFFFF; color: #0F172A; font-weight: bold; border: 1px solid #E2E8F0; }
  .cell-num { background-color: #FFFFFF; color: #063B5C; font-weight: bold; text-align: right; border: 1px solid #E2E8F0; }
  .cell-empty { background-color: #FFFFFF; color: #64748B; font-style: italic; text-align: center; border: 1px solid #E2E8F0; }
  .doc-footer { background-color: #F8FAFC; color: #64748B; font-size: 8.5pt; text-align: left; border-top: 1px solid #CBD5E1; }
</style>
</head>
<body>
<table>
  <col width="160" style="mso-width-source:userset;width:120pt;">
  <col width="320" style="mso-width-source:userset;width:240pt;">
  <col width="260" style="mso-width-source:userset;width:195pt;">
  <col width="180" style="mso-width-source:userset;width:135pt;">

  <!-- CABEÇALHO CORPORATIVO SÓBRIO -->
  <tr height="38" style="mso-height-source:userset;height:28.5pt;">
    <td colspan="4" class="doc-title">
      GUNDJATECH &mdash; RELATÓRIO EXECUTIVO DE GESTÃO
    </td>
  </tr>
  <tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <td colspan="4" class="doc-meta">
      Período: <b>Últimos ${period} dias</b> &nbsp;|&nbsp; Emissão: <b>${esc(emittedAt)}</b> &nbsp;|&nbsp; Emitido por: <b>${esc(emitterName)}</b>
    </td>
  </tr>

  <!-- SEÇÃO 1: INDICADORES EXECUTIVOS -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="4" class="sec-title">1. Resumo Financeiro e Operacional</td>
  </tr>
  <tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <th class="tbl-head" align="left">Área</th>
    <th class="tbl-head" align="left">Indicador</th>
    <th class="tbl-head" align="left">Referência</th>
    <th class="tbl-head" align="right">Resultado</th>
  </tr>
  ${kpiRows
            .map(
                (row) => `<tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <td class="cell-muted">${esc(row.category)}</td>
    <td class="cell-strong">${esc(row.metric)}</td>
    <td class="cell-muted">${esc(row.context)}</td>
    <td class="cell-num">${esc(row.value)}</td>
  </tr>`
            )
            .join('\n  ')}

  <!-- SEÇÃO 2: SOLICITAÇÕES & PIPELINE -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="4" class="sec-title">2. Solicitações e Pipeline Comercial (${recentRequests.length})</td>
  </tr>
  <tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <th class="tbl-head" align="left">Protocolo</th>
    <th class="tbl-head" align="left">Demanda</th>
    <th class="tbl-head" align="left">Cliente / Empresa</th>
    <th class="tbl-head" align="right">Status / Data</th>
  </tr>
  ${recentRequests.length === 0
            ? `<tr height="28" style="mso-height-source:userset;height:21pt;"><td colspan="4" class="cell-empty">Nenhuma solicitação registrada no período.</td></tr>`
            : recentRequests
                .map((r: any) => {
                    const st = statusPt[r.status] || r.status || 'Recebido';
                    const dt = r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—';
                    return `<tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <td class="cell-muted">${esc(r.protocol)}</td>
    <td class="cell-strong">${esc(r.service_title || r.title || 'Solicitação Digital')}</td>
    <td class="cell">${esc(r.company || r.name || 'Cliente')}</td>
    <td class="cell-num">${esc(st)} (${esc(dt)})</td>
  </tr>`;
                })
                .join('\n  ')
        }

  <!-- SEÇÃO 3: CARTEIRA DE CLIENTES -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="4" class="sec-title">3. Carteira de Clientes e Leads (${recentClients.length})</td>
  </tr>
  <tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <th class="tbl-head" align="left">Situação</th>
    <th class="tbl-head" align="left">Cliente / Empresa</th>
    <th class="tbl-head" align="left">Contato</th>
    <th class="tbl-head" align="right">Telefone / Data</th>
  </tr>
  ${recentClients.length === 0
            ? `<tr height="28" style="mso-height-source:userset;height:21pt;"><td colspan="4" class="cell-empty">Nenhum cliente cadastrado no período.</td></tr>`
            : recentClients
                .map((cl: any) => {
                    const isWa = String(cl.email || '').endsWith('.local');
                    const catLabel = cl.status === 'active' ? 'Cliente Ativo' : 'Lead';
                    const dt = cl.created_at ? new Date(cl.created_at).toLocaleDateString('pt-BR') : '—';
                    const phoneStr = cl.phone ? `${cl.phone} (${dt})` : dt;
                    return `<tr height="26" style="mso-height-source:userset;height:19.5pt;">
    <td class="cell-muted">${esc(catLabel)}</td>
    <td class="cell-strong">${esc(cl.company || cl.name || 'Cliente')}</td>
    <td class="cell">${isWa ? 'Canal WhatsApp' : esc(cl.email || '—')}</td>
    <td class="cell-num">${esc(phoneStr)}</td>
  </tr>`;
                })
                .join('\n  ')
        }

  <tr height="14"><td colspan="4"></td></tr>
  <tr height="24" style="mso-height-source:userset;height:18pt;">
    <td colspan="4" class="doc-footer">
      GundjaTech &bull; Documento de uso interno e confidencial
    </td>
  </tr>
</table>
</body>
</html>`;

    c.header('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="relatorio-executivo-gundjatech-${period}d.xls"`);
    return c.body(excelHtml);
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

    let query = `
        SELECT clients.*,
               (SELECT u.id FROM users u WHERE u.id = clients.user_id OR (clients.email IS NOT NULL AND clients.email != '' AND lower(u.email) = lower(clients.email)) LIMIT 1) AS portal_user_id
        FROM clients
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }

    if (statusFilter === 'active') {
        query += ` AND status = 'active'`;
    } else if (statusFilter === 'lead') {
        query += ` AND status != 'active' AND (email IS NULL OR email NOT LIKE '%.local')`;
    } else if (statusFilter === 'whatsapp') {
        query += ` AND status != 'active' AND email LIKE '%.local'`;
    } else if (statusFilter) {
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

adminRoutes.post('/clientes/:id/status', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);
    const nextStatus = String(body.status || 'active').trim() === 'active' ? 'active' : 'lead';

    if (id > 0) {
        await db.prepare(`UPDATE clients SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(nextStatus, id).run();
    }

    return c.redirect(`/admin/clientes?success=${encodeURIComponent(nextStatus === 'active' ? 'Cliente promovido para Ativo!' : 'Movido para Lead.')}`);
});

adminRoutes.post('/clientes/:id/editar', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    if (!id || id <= 0) {
        return c.redirect('/admin/clientes?error=Cliente inválido');
    }

    const name = String(body.name || '').trim();
    const company = String(body.company || '').trim() || null;
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;
    const document = String(body.document || '').trim() || null;
    const segment = String(body.segment || '').trim() || null;
    const status = String(body.status || 'active').trim() === 'lead' ? 'lead' : 'active';

    if (!name && !company) {
        return c.redirect('/admin/clientes?error=Informe ao menos o Nome ou a Empresa do cliente');
    }

    try {
        const existing = await db.prepare(`SELECT id, user_id, email FROM clients WHERE id = ?`).bind(id).first<any>();
        if (!existing) {
            return c.redirect('/admin/clientes?error=Cliente não encontrado');
        }

        const finalName = name || company || 'Cliente';
        const finalEmail = email || existing.email || '';

        await db.prepare(
            `UPDATE clients
             SET name = ?, company = ?, email = ?, phone = ?, document = ?, segment = ?, status = ?, updated_at = datetime('now')
             WHERE id = ?`
        ).bind(finalName, company, finalEmail, phone, document, segment, status, id).run();

        if (existing.user_id && finalEmail && !finalEmail.endsWith('.local')) {
            const emailTaken = await db.prepare(
                `SELECT id FROM users WHERE lower(email) = lower(?) AND id != ? LIMIT 1`
            ).bind(finalEmail, existing.user_id).first<any>();

            if (!emailTaken) {
                await db.prepare(
                    `UPDATE users SET name = ?, email = ?, phone = ?, company = ?, updated_at = datetime('now') WHERE id = ?`
                ).bind(finalName, finalEmail, phone, company, existing.user_id).run();
            } else {
                await db.prepare(
                    `UPDATE users SET name = ?, phone = ?, company = ?, updated_at = datetime('now') WHERE id = ?`
                ).bind(finalName, phone, company, existing.user_id).run();
            }
        } else if (existing.user_id) {
            await db.prepare(
                `UPDATE users SET name = ?, phone = ?, company = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(finalName, phone, company, existing.user_id).run();
        }

        // Propaga dados cadastrais para todas as solicitações vinculadas a este cliente
        try {
            await db.prepare(
                `UPDATE service_requests
                 SET name = ?, company = ?, email = COALESCE(NULLIF(?, ''), email), phone = ?, updated_at = datetime('now')
                 WHERE client_id = ?`
            ).bind(finalName, company, finalEmail, phone, id).run();
        } catch { }

        return c.redirect('/admin/clientes?success=Cliente atualizado e sincronizado em todos os módulos');
    } catch (err: any) {
        return c.redirect(`/admin/clientes?error=${encodeURIComponent(err.message || 'Erro ao atualizar cliente')}`);
    }
});

adminRoutes.post('/clientes/:id/ativar-portal', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    if (!id || id <= 0) {
        return c.json({ ok: false, error: 'Cliente inválido.' }, 400);
    }

    const client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(id).first<any>();
    if (!client) {
        return c.json({ ok: false, error: 'Cliente não encontrado.' }, 404);
    }

    const inputEmail = String(body.email || '').trim().toLowerCase();
    const targetEmail = (inputEmail || String(client.email || '').trim().toLowerCase());
    const inputPhone = String(body.phone || '').trim();
    const targetPhone = inputPhone || String(client.phone || '').trim();
    const promoteActive = body.promote_active === true || body.promote_active === '1' || body.promote_active === 'true';
    const shouldSendEmail = body.send_email !== false && body.send_email !== '0' && body.send_email !== 'false';

    if (!targetEmail || !targetEmail.includes('@') || targetEmail.endsWith('.local')) {
        return c.json({ ok: false, error: 'Informe um endereço de e-mail válido para ativar o acesso ao Portal.' }, 422);
    }

    const displayName = String(client.name || client.company || 'Cliente').trim();

    // Atualiza e-mail/telefone/status no cadastro do cliente se necessário
    const nextStatus = promoteActive ? 'active' : (client.status || 'lead');
    await db.prepare(
        `UPDATE clients SET email = ?, phone = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(targetEmail, targetPhone || null, nextStatus, id).run();

    // Localiza ou cria usuário do Portal do Cliente (role = 'client')
    let existingUser = await db.prepare(
        `SELECT id, email, role FROM users WHERE id = ? OR lower(email) = lower(?) LIMIT 1`
    ).bind(client.user_id || 0, targetEmail).first<{ id: number; email: string; role: string }>();

    let userId: number;
    if (existingUser) {
        if (existingUser.role && existingUser.role !== 'client') {
            return c.json({ ok: false, error: 'Este e-mail pertence a um membro da equipe administrativa e não pode ser vinculado como cliente do Portal.' }, 409);
        }
        userId = existingUser.id;
        await db.prepare(
            `UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ? AND role = 'client'`
        ).bind(userId).run();
    } else {
        const randomSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
        const randomHash = await hashPassword(randomSecret);
        const ins = await db.prepare(
            `INSERT INTO users (name, email, password, role, is_active, created_at, updated_at)
             VALUES (?, ?, ?, 'client', 1, datetime('now'), datetime('now'))`
        ).bind(displayName, targetEmail, randomHash).run();
        userId = Number(ins.meta?.last_row_id || 0);
    }

    if (userId > 0) {
        await db.prepare(
            `UPDATE clients SET user_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(userId, id).run();
    }

    // Gera token único seguro para definição da senha pessoal (/redefinir-senha/:token) — armazena hash SHA-256 no banco
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256Hex(token);

    await db.batch([
        db.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(targetEmail),
        db.prepare(`INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))`).bind(targetEmail, tokenHash)
    ]);

    const baseUrl = (c.env.APP_URL || new URL(c.req.url).origin).replace(/\/+$/, '');
    const activateUrl = `${baseUrl}/redefinir-senha/${token}?email=${encodeURIComponent(targetEmail)}`;
    const portalUrl = `${baseUrl}/login`;

    let emailSent = false;
    let emailError: string | null = null;
    if (shouldSendEmail) {
        try {
            const res = await sendPortalInviteEmail(c.env, targetEmail, displayName, activateUrl);
            emailSent = res.success;
            emailError = res.error || null;
        } catch (err: any) {
            emailError = err?.message || 'Erro ao enviar e-mail';
        }
    }

    const whatsappMessage =
        `Olá, *${displayName}*! 👋\n\n` +
        `Seu acesso exclusivo ao *Portal do Cliente GundjaTech* já está liberado.\n\n` +
        `📧 *E-mail:* ${targetEmail}\n` +
        `🔐 *Link único para criar sua senha e acessar:*\n${activateUrl}\n\n` +
        `Pelo portal você acompanha suas solicitações, aprova orçamentos e conversa direto com nossa equipe.\n` +
        `Qualquer dúvida, estamos à disposição!`;

    const phoneDigits = targetPhone.replace(/\D/g, '');
    const whatsappUrl = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    return c.json({
        ok: true,
        client_id: id,
        user_id: userId,
        name: displayName,
        email: targetEmail,
        phone: targetPhone,
        promoted: promoteActive && client.status !== 'active',
        activate_url: activateUrl,
        portal_url: portalUrl,
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
        email_sent: emailSent,
        email_error: emailError,
    });
});

adminRoutes.post('/clientes/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    // Trava Contábil e de Fase (fail-closed: se a validação falhar no D1, aborta a exclusão)
    try {
        const paidTx = await db.prepare(
            `SELECT id FROM financial_transactions WHERE client_id = ? AND status = 'paid' LIMIT 1`
        ).bind(id).first<{ id: number }>();
        if (paidTx) {
            return c.redirect(
                `/admin/clientes?error=${encodeURIComponent('Trava Contábil: Este cliente possui fatura já paga. Para preservar os Recibos Oficiais de Quitação e o histórico financeiro, inative o cliente em vez de excluir.')}`
            );
        }

        // Trava de Fase: impede excluir cliente com projetos ativos
        const activeProj = await db.prepare(
            `SELECT id FROM projects WHERE client_id = ? AND status NOT IN ('completed', 'canceled') LIMIT 1`
        ).bind(id).first<{ id: number }>();
        if (activeProj) {
            return c.redirect(
                `/admin/clientes?error=${encodeURIComponent('Trava de Fase: Este cliente possui projeto ativo em andamento. Conclua ou cancele os projetos antes de remover o cliente.')}`
            );
        }
    } catch (lockErr) {
        console.error('[Excluir Cliente] Falha fail-closed ao verificar travas:', lockErr);
        return c.redirect(
            `/admin/clientes?error=${encodeURIComponent('Não foi possível validar as travas contábeis/operacionais no momento. Exclusão abortada por segurança.')}`
        );
    }

    let linkedUserId: number | null = null;
    try {
        const clientRow = await db.prepare(`SELECT user_id FROM clients WHERE id = ?`).bind(id).first<{ user_id: number | null }>();
        linkedUserId = clientRow?.user_id ? Number(clientRow.user_id) : null;

        await db.batch([
            db.prepare(`UPDATE conversations SET client_id = NULL WHERE client_id = ?`).bind(id),
            db.prepare(`UPDATE service_requests SET client_id = NULL WHERE client_id = ?`).bind(id),
            db.prepare(`DELETE FROM quotations WHERE client_id = ?`).bind(id),
            db.prepare(`DELETE FROM advertising_campaigns WHERE client_id = ?`).bind(id),
            db.prepare(`DELETE FROM payments WHERE financial_transaction_id IN (SELECT id FROM financial_transactions WHERE client_id = ? AND status != 'paid')`).bind(id),
            db.prepare(`DELETE FROM financial_transactions WHERE client_id = ? AND status != 'paid'`).bind(id),
            db.prepare(`DELETE FROM domains WHERE client_id = ?`).bind(id),
            db.prepare(`DELETE FROM projects WHERE client_id = ?`).bind(id),
            db.prepare(`DELETE FROM clients WHERE id = ?`).bind(id)
        ]);
    } catch (delErr) {
        console.error('[Excluir Cliente] Erro ao excluir registros vinculados:', delErr);
        return c.redirect(`/admin/clientes?error=${encodeURIComponent('Erro ao remover os dados do cliente. Tente novamente.')}`);
    }

    if (linkedUserId) {
        try {
            await db.prepare(`UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND role = 'client'`).bind(linkedUserId).run();
            await destroyAllUserSessions(c.env, linkedUserId);
        } catch { }
    }

    return c.redirect('/admin/clientes?success=Cliente removido com sucesso');
});

// ==========================================
// 3. SOLICITAÇÕES & LEADS (CRM PIPELINE)
// ==========================================
adminRoutes.get('/solicitacoes', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    // Garante que qualquer orçamento manual sem solicitação receba sua solicitação vinculada automaticamente
    await reconcileApprovedQuotationsWithoutProject(db, c.env, user?.id || null);

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
    ).bind(id).first<any>();

    if (!requestDetail) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    const reqTitle = String(requestDetail.service_title || requestDetail.title || '').trim();
    const [historyRes, linkedQuotation, linkedProject, paidInvoicesRes] = await Promise.all([
        db.prepare(
            `SELECT h.*, u.name as user_name 
             FROM service_request_history h 
             LEFT JOIN users u ON h.user_id = u.id 
             WHERE h.service_request_id = ? 
             ORDER BY h.created_at DESC`
        ).bind(id).all(),
        db.prepare(
            `SELECT * FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
        ).bind(id).first().catch(() => null),
        (async () => {
            try {
                const byRel = await db.prepare(
                    `SELECT id, title, name, status, progress_percentage FROM projects
                     WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
                ).bind(id).first();
                if (byRel) return byRel;
            } catch { }
            if (requestDetail.client_id && reqTitle) {
                try {
                    return await db.prepare(
                        `SELECT id, title, name, status, progress_percentage FROM projects
                         WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?))
                         ORDER BY id DESC LIMIT 1`
                    ).bind(requestDetail.client_id, reqTitle, reqTitle).first();
                } catch { }
            }
            return null;
        })(),
        requestDetail.client_id
            ? db.prepare(
                `SELECT id, project_id, quotation_id, invoice_number, description FROM financial_transactions
                 WHERE client_id = ? AND status = 'paid'`
            ).bind(requestDetail.client_id).all().catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] })
    ]);
    const history = historyRes.results || [];
    const reqTitleLow = reqTitle.toLowerCase();
    const quoteRefLow = String((linkedQuotation as any)?.reference_code || '').trim().toLowerCase();
    const reqProtoLow = String(requestDetail.protocol || '').trim().toLowerCase();
    const hasPaidInvoice = ((paidInvoicesRes as any)?.results || []).some((tx: any) => {
        if ((linkedProject as any)?.id && Number(tx.project_id) === Number((linkedProject as any).id)) return true;
        if ((linkedQuotation as any)?.id && Number(tx.quotation_id) === Number((linkedQuotation as any).id)) return true;
        if (tx.project_id || tx.quotation_id) return false;
        const inv = String(tx.invoice_number || '').trim().toLowerCase();
        const desc = String(tx.description || '').toLowerCase();
        return Boolean(
            (quoteRefLow && (inv === quoteRefLow || desc.includes(quoteRefLow))) ||
            (reqProtoLow && (inv === reqProtoLow || desc.includes(reqProtoLow))) ||
            (reqTitleLow && desc.includes(reqTitleLow))
        );
    });

    return c.html(
        <AdminRequestsView
            currentUser={user}
            requests={[]}
            requestDetail={requestDetail}
            history={history}
            linkedQuotation={linkedQuotation}
            linkedProject={linkedProject}
            hasPaidInvoice={hasPaidInvoice}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

async function ensureClientForRequest(db: any, req: any): Promise<number | null> {
    let clientId = req.client_id ? Number(req.client_id) : null;
    if (clientId) return clientId;

    const email = String(req.email || '').trim();
    if (email) {
        try {
            const existingClient = (await db.prepare(`SELECT id FROM clients WHERE lower(email) = lower(?)`).bind(email).first()) as { id: number } | null;
            if (existingClient?.id) {
                clientId = Number(existingClient.id);
            }
        } catch { }
    }

    if (!clientId) {
        try {
            const insClient = await db.prepare(
                `INSERT INTO clients (name, company, email, phone, status, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
            ).bind(
                req.name || req.company || 'Cliente',
                req.company || null,
                email || `lead-${req.id || Date.now()}@gundjatech.local`,
                req.phone || null
            ).run();
            clientId = Number(insClient.meta?.last_row_id || 0) || null;
        } catch { }
    }

    if (clientId && req.id) {
        try {
            await db.prepare(`UPDATE service_requests SET client_id = ? WHERE id = ?`).bind(clientId, req.id).run();
        } catch { }
    }

    return clientId;
}

/**
 * Provisiona ou reativa automaticamente o usuário do Portal do Cliente (role = 'client')
 * somente a partir da Fase 3 (Orçamento Enviado ao Cliente ou Aprovado).
 */
async function autoProvisionPortalUserForClient(
    db: any,
    env: any,
    options: {
        clientId?: number | null;
        overrideEmail?: string | null;
        overridePhone?: string | null;
        promoteActive?: boolean;
        sendInviteEmail?: boolean;
        baseUrl?: string;
    }
): Promise<{
    provisioned: boolean;
    userId?: number;
    email?: string;
    activateUrl?: string;
    whatsappUrl?: string;
    needsRealEmail?: boolean;
}> {
    const clientId = options.clientId ? Number(options.clientId) : null;
    if (!clientId || !db) return { provisioned: false };

    let client: any = null;
    try {
        client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(clientId).first();
    } catch { }
    if (!client) return { provisioned: false };

    const rawEmail = String(options.overrideEmail || client.email || '').trim().toLowerCase();
    const rawPhone = String(options.overridePhone || client.phone || '').trim();
    if (!rawEmail || !rawEmail.includes('@') || rawEmail.endsWith('.local')) {
        return { provisioned: false, needsRealEmail: true };
    }

    const displayName = String(client.name || client.company || 'Cliente').trim();
    const nextClientStatus = options.promoteActive ? 'active' : (client.status || 'lead');

    try {
        await db.prepare(
            `UPDATE clients SET email = ?, phone = COALESCE(?, phone), status = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(rawEmail, rawPhone || null, nextClientStatus, clientId).run();
    } catch { }

    let existingUser: any = null;
    try {
        existingUser = await db.prepare(
            `SELECT id, email, role, is_active FROM users WHERE id = ? OR lower(email) = lower(?) LIMIT 1`
        ).bind(client.user_id || 0, rawEmail).first();
    } catch { }

    let userId = 0;
    let isNewOrReactivated = false;
    if (existingUser && existingUser.id) {
        if (existingUser.role && existingUser.role !== 'client') {
            return { provisioned: false };
        }
        userId = Number(existingUser.id);
        if (!existingUser.is_active || Number(existingUser.is_active) === 0) {
            isNewOrReactivated = true;
        }
        try {
            await db.prepare(
                `UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ? AND role = 'client'`
            ).bind(userId).run();
        } catch { }
    } else {
        isNewOrReactivated = true;
        try {
            const randomSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
            const randomHash = await hashPassword(randomSecret);
            const ins = await db.prepare(
                `INSERT INTO users (name, email, phone, role, company, password, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
            ).bind(displayName, rawEmail, rawPhone || null, 'client', client.company || displayName, randomHash).run();
            userId = Number(ins?.meta?.last_row_id || 0);
        } catch { }
    }

    if (userId > 0) {
        try {
            await db.prepare(
                `UPDATE clients SET user_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(userId, clientId).run();
        } catch { }
    }

    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256Hex(token);

    try {
        await db.batch([
            db.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(rawEmail),
            db.prepare(`INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))`).bind(rawEmail, tokenHash)
        ]);
    } catch { }

    const baseUrl = String(options.baseUrl || env?.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/+$/, '');
    const activateUrl = `${baseUrl}/redefinir-senha/${token}?email=${encodeURIComponent(rawEmail)}`;
    const whatsappMessage =
        `Olá, *${displayName}*! 👋\n\n` +
        `Seu orçamento e acompanhamento oficial no *Portal do Cliente GundjaTech* já estão disponíveis.\n\n` +
        `📧 *E-mail:* ${rawEmail}\n` +
        `🔐 *Link único para definir sua senha e acessar:*\n${activateUrl}`;
    const phoneDigits = rawPhone.replace(/\D/g, '');
    const whatsappUrl = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    if (options.sendInviteEmail !== false && isNewOrReactivated && env) {
        try {
            await sendPortalInviteEmail(env, rawEmail, displayName, activateUrl);
        } catch { }
    }

    return {
        provisioned: true,
        userId: userId || undefined,
        email: rawEmail,
        activateUrl,
        whatsappUrl
    };
}

/**
 * Revoga automaticamente o acesso do usuário do Portal (users.is_active = 0 + encerra sessões)
 * quando sua solicitação/orçamento/projeto é cancelado ou quando o projeto foi 100% concluído
 * e todas as faturas já foram liquidadas (paid), DESDE QUE o cliente não possua nenhum outro
 * serviço ativo (outro projeto em andamento, orçamento aberto, domínio ativo ou campanha ativa).
 */
async function autoRevokeIdlePortalUser(
    db: any,
    env: any,
    clientId?: number | null
): Promise<{ revoked: boolean; userId?: number }> {
    const cid = clientId ? Number(clientId) : 0;
    if (!cid || !db) return { revoked: false };

    let client: any = null;
    try {
        client = await db.prepare(`SELECT id, user_id, email, status FROM clients WHERE id = ?`).bind(cid).first();
    } catch { }
    if (!client) return { revoked: false };

    // Verifica se o cliente ainda possui qualquer vínculo ativo que exija Portal aberto:
    // 1. Orçamento enviado ou aprovado vinculado a solicitação ainda não concluída/cancelada
    // 2. Projeto ativo (planning, in_progress, reviewing)
    // 3. Fatura pendente (A Receber) no financeiro
    // 4. Domínio ativo ou Campanha de tráfego ativa
    try {
        const activeProjs = (await db.prepare(
            `SELECT id FROM projects WHERE client_id = ? AND status IN ('planning', 'in_progress', 'reviewing')`
        ).bind(cid).all())?.results || [];
        if (activeProjs.length > 0) return { revoked: false };

        const activeReqs = (await db.prepare(
            `SELECT id FROM service_requests WHERE client_id = ? AND status IN ('quotation_sent', 'approved', 'in_progress')`
        ).bind(cid).all())?.results || [];
        if (activeReqs.length > 0) return { revoked: false };

        const sentQuotes = (await db.prepare(
            `SELECT id FROM quotations WHERE client_id = ? AND status = 'sent'`
        ).bind(cid).all())?.results || [];
        if (sentQuotes.length > 0) return { revoked: false };

        const pendingInvoices = (await db.prepare(
            `SELECT id FROM financial_transactions WHERE client_id = ? AND status IN ('pending', 'reviewing')`
        ).bind(cid).all())?.results || [];
        if (pendingInvoices.length > 0) return { revoked: false };

        // 5. Carência de 30 dias após fatura quitada (permite ao cliente baixar o Recibo Oficial recebido por e-mail)
        const recentPaidInvoices = (await db.prepare(
            `SELECT id FROM financial_transactions WHERE client_id = ? AND status = 'paid' AND paid_at >= datetime('now', '-30 days')`
        ).bind(cid).all())?.results || [];
        if (recentPaidInvoices.length > 0) return { revoked: false };

        const activeDomains = (await db.prepare(
            `SELECT id FROM domains WHERE client_id = ? AND status = 'active'`
        ).bind(cid).all())?.results || [];
        if (activeDomains.length > 0) return { revoked: false };

        const activeCampaigns = (await db.prepare(
            `SELECT id FROM advertising_campaigns WHERE client_id = ? AND status = 'active'`
        ).bind(cid).all())?.results || [];
        if (activeCampaigns.length > 0) return { revoked: false };
    } catch {
        return { revoked: false };
    }

    // Não possui nenhum serviço ativo nem pendência financeira: localiza o user role='client' e desativa
    let targetUser: any = null;
    try {
        if (client.user_id) {
            targetUser = await db.prepare(`SELECT id, role, is_active FROM users WHERE id = ?`).bind(client.user_id).first();
        }
        if (!targetUser && client.email) {
            targetUser = await db.prepare(`SELECT id, role, is_active FROM users WHERE lower(email) = lower(?)`).bind(client.email).first();
        }
    } catch { }

    if (!targetUser || !targetUser.id || targetUser.role !== 'client') {
        return { revoked: false };
    }

    const uid = Number(targetUser.id);
    try {
        await db.prepare(
            `UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND role = 'client'`
        ).bind(uid).run();
        if (env) {
            await destroyAllUserSessions(env, uid);
        }
    } catch { }

    return { revoked: true, userId: uid };
}

const DEFAULT_PROJECT_STAGES = [
    '1. Levantamento Técnico & Arquitetura',
    '2. Desenvolvimento & Implementação',
    '3. Testes & Homologação com Cliente',
    '4. Deploy & Entrega Final'
];

async function seedDefaultProjectStages(db: any, projectId?: number | null): Promise<void> {
    if (!projectId) return;
    try {
        const existingStages = await db.prepare(
            `SELECT id FROM project_stages WHERE project_id = ? LIMIT 1`
        ).bind(projectId).all();
        if ((existingStages?.results || []).length > 0) return;

        for (let i = 0; i < DEFAULT_PROJECT_STAGES.length; i++) {
            await db.prepare(
                `INSERT INTO project_stages (project_id, title, status, sort_order, created_at, updated_at)
                 VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`
            ).bind(projectId, DEFAULT_PROJECT_STAGES[i], i + 1).run();
        }
    } catch { }
}

async function ensurePendingReceivableOnApproval(
    db: any,
    options: {
        clientId?: number | null;
        projectTitle: string;
        quotation?: any;
        request?: any;
        projectId?: number;
    }
): Promise<void> {
    const clientId = options.clientId ? Number(options.clientId) : null;
    if (!clientId) return;

    const amount = Number(
        options.quotation?.final_amount ??
        options.quotation?.total_amount ??
        options.request?.estimated_budget ??
        0
    );
    if (Number.isNaN(amount) || amount <= 0) return;

    const invoiceRef = String(
        options.quotation?.reference_code ||
        options.request?.protocol ||
        (options.projectId ? `PROJ-${options.projectId}` : `ORC-${clientId}`)
    ).trim();

    const description = options.quotation?.reference_code
        ? `Contrato Aprovado: ${options.projectTitle} (Orçamento ${options.quotation.reference_code})`
        : `Contrato Aprovado: ${options.projectTitle}`;

    try {
        const existingTx = (await db.prepare(
            `SELECT id FROM financial_transactions
             WHERE client_id = ? AND (invoice_number = ? OR lower(description) = lower(?))
             ORDER BY id DESC LIMIT 1`
        ).bind(clientId, invoiceRef, description).first()) as { id: number } | null;

        if (existingTx?.id) return;

        const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        await db.prepare(
            `INSERT INTO financial_transactions (client_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
             VALUES (?, 'income', 'contract', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(clientId, description, amount, dueDate, 'PIX', invoiceRef).run();
    } catch { }
}

async function autoStartProjectFromApprovedRequest(
    db: any,
    env: any,
    userId: number | null,
    options: {
        request?: any;
        quotation?: any;
        approvalNote?: string;
    }
): Promise<{ projectId?: number; alreadyExisted: boolean }> {
    const req = options.request || null;
    const quotation = options.quotation || null;

    let clientId: number | null = quotation?.client_id ? Number(quotation.client_id) : (req ? await ensureClientForRequest(db, req) : null);

    if (clientId) {
        try {
            await db.prepare(`UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(clientId).run();
        } catch { }
        try {
            await autoProvisionPortalUserForClient(db, env, {
                clientId,
                overrideEmail: req?.email || null,
                overridePhone: req?.phone || null,
                promoteActive: true,
                sendInviteEmail: true
            });
        } catch { }
    }

    const projectName = String(
        quotation?.title ||
        req?.service_title ||
        req?.title ||
        `Projeto • ${req?.company || req?.name || quotation?.reference_code || 'Cliente'}`
    ).trim();

    // Verifica se já existe projeto criado para evitar duplicidade
    let existingProjId: number | undefined;
    if (req?.id) {
        try {
            const alreadyConverted = (await db.prepare(
                `SELECT id FROM service_request_history WHERE service_request_id = ? AND action = 'converted_to_project' LIMIT 1`
            ).bind(req.id).first()) as { id: number } | null;
            if (alreadyConverted && clientId) {
                const foundProj = (await db.prepare(
                    `SELECT id FROM projects WHERE client_id = ? ORDER BY id DESC LIMIT 1`
                ).bind(clientId).first()) as { id: number } | null;
                existingProjId = foundProj?.id;
                if (alreadyConverted) {
                    await db.prepare(
                        `UPDATE service_requests SET status = 'in_progress', client_id = COALESCE(client_id, ?), updated_at = datetime('now') WHERE id = ?`
                    ).bind(clientId, req.id).run();
                    return { projectId: existingProjId, alreadyExisted: true };
                }
            }
        } catch { }
    }

    if (clientId && projectName) {
        try {
            const existingByName = (await db.prepare(
                `SELECT id FROM projects WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?)) LIMIT 1`
            ).bind(clientId, projectName, projectName).first()) as { id: number } | null;
            if (existingByName?.id) {
                existingProjId = Number(existingByName.id);
            }
        } catch { }
    }

    let newProjectId = existingProjId;
    if (!newProjectId) {
        const baseSlug = projectName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 48) || 'projeto';
        const projectSlug = `${baseSlug}-${Date.now().toString(36)}`;
        const quoteRef = quotation?.reference_code ? `Orçamento aprovado: ${quotation.reference_code}` : '';
        const rawDesc = String(quotation?.notes || req?.briefing || req?.description || 'Projeto iniciado após aprovação de orçamento').trim();
        const projectDesc = quoteRef ? `${quoteRef} • ${rawDesc}` : rawDesc;

        try {
            const insProj = await db.prepare(
                `INSERT INTO projects (client_id, quotation_id, service_request_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
            ).bind(clientId || 1, quotation?.id || null, req?.id || null, projectName, projectName, projectSlug, projectDesc).run();
            newProjectId = Number(insProj.meta?.last_row_id || 0) || undefined;
        } catch {
            try {
                const insProj = await db.prepare(
                    `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
                ).bind(clientId || 1, projectName, projectName, projectSlug, projectDesc).run();
                newProjectId = Number(insProj.meta?.last_row_id || 0) || undefined;
            } catch { }
        }
    }

    // Popula automaticamente as 4 etapas obrigatórias do cronograma e lança a fatura A RECEBER
    await seedDefaultProjectStages(db, newProjectId);
    await ensurePendingReceivableOnApproval(db, {
        clientId,
        projectTitle: projectName,
        quotation,
        request: req,
        projectId: newProjectId
    });

    if (req?.id) {
        const prevStatus = String(req.status || 'quotation_sent');
        await db.prepare(
            `UPDATE service_requests SET status = 'in_progress', client_id = COALESCE(client_id, ?), updated_at = datetime('now') WHERE id = ?`
        ).bind(clientId, req.id).run();

        if (prevStatus !== 'approved' && prevStatus !== 'in_progress') {
            await recordRequestTimeline(db, {
                serviceRequestId: req.id,
                userId,
                action: 'quotation_approved',
                fromStatus: prevStatus,
                toStatus: 'approved',
                notes: options.approvalNote || (quotation?.reference_code ? `Orçamento ${quotation.reference_code} aprovado` : 'Orçamento aprovado')
            });
        }

        await recordRequestTimeline(db, {
            serviceRequestId: req.id,
            userId,
            action: 'converted_to_project',
            fromStatus: 'approved',
            toStatus: 'in_progress',
            notes: `Projeto${newProjectId ? ` #${newProjectId}` : ''} criado e iniciado automaticamente após aprovação do orçamento`
        });
    }

    // Dispara e-mail de início de projeto sem bloquear o fluxo
    try {
        let recipientEmail = String(req?.email || '').trim();
        let recipientName = String(req?.company || req?.name || 'Cliente').trim();
        if (!recipientEmail && clientId) {
            const clientRow = (await db.prepare(`SELECT name, company, email FROM clients WHERE id = ?`).bind(clientId).first()) as any;
            if (clientRow?.email) {
                recipientEmail = String(clientRow.email).trim();
                recipientName = String(clientRow.company || clientRow.name || recipientName).trim();
            }
        }
        if (recipientEmail && !recipientEmail.endsWith('.local')) {
            await sendProjectStartedEmail(env, recipientEmail, recipientName, {
                id: newProjectId,
                title: projectName,
                protocol: req?.protocol || quotation?.reference_code || null
            });
        }
    } catch { }

    return { projectId: newProjectId, alreadyExisted: Boolean(existingProjId) };
}

/**
 * Retorno de fase seguro (Rollback ERP):
 * 1) Bloqueia retorno se houver fatura já paga (Trava Contábil) ou projeto já concluído (Trava de Fase).
 * 2) Cancela projetos em andamento (não concluídos) e faturas ainda pendentes vinculadas ao fluxo,
 *    impedindo faturas órfãs em /admin/financeiro e botões dessincronizados.
 */
async function rollbackUnfinishedFlow(
    db: any,
    params: {
        clientId?: number | null;
        requestId?: number | null;
        quotationId?: number | null;
        projectId?: number | null;
        title?: string | null;
        refs?: Array<string | null | undefined>;
    }
): Promise<{ blockedReason?: string; canceledProjects: number; canceledInvoices: number }> {
    const clientId = params.clientId ? Number(params.clientId) : 0;
    const requestId = params.requestId ? Number(params.requestId) : 0;
    const quotationId = params.quotationId ? Number(params.quotationId) : 0;
    const projectId = params.projectId ? Number(params.projectId) : 0;
    const titleLow = String(params.title || '').trim().toLowerCase();
    const refsLow = (params.refs || []).map((r) => String(r || '').trim().toLowerCase()).filter(Boolean);

    const matchedProjectIds = new Set<number>();
    if (projectId > 0) matchedProjectIds.add(projectId);

    // 1. Localiza projetos vinculados (por FK exata ou título legado) e bloqueia se algum já estiver concluído
    try {
        if (clientId > 0) {
            const projRes = await db.prepare(
                `SELECT id, title, name, status, quotation_id, service_request_id FROM projects WHERE client_id = ?`
            ).bind(clientId).all().catch(async () =>
                db.prepare(`SELECT id, title, name, status FROM projects WHERE client_id = ?`).bind(clientId).all()
            );
            for (const p of (projRes?.results || []) as any[]) {
                const byFk =
                    (projectId > 0 && Number(p.id) === projectId) ||
                    (quotationId > 0 && Number(p.quotation_id) === quotationId) ||
                    (requestId > 0 && Number(p.service_request_id) === requestId);
                const hasFk = Boolean(p.quotation_id || p.service_request_id);
                const pt1 = String(p.title || '').trim().toLowerCase();
                const pt2 = String(p.name || '').trim().toLowerCase();
                const byLegacy = !hasFk && Boolean(titleLow && (pt1 === titleLow || pt2 === titleLow));
                if (byFk || byLegacy) {
                    if (p.status === 'completed') {
                        return {
                            blockedReason: 'Trava de Fase: O projeto vinculado já foi concluído e entregue. Não é possível retornar para fase anterior.',
                            canceledProjects: 0,
                            canceledInvoices: 0
                        };
                    }
                    matchedProjectIds.add(Number(p.id));
                }
            }
        }
    } catch { }

    const matchesTx = (tx: any): boolean => {
        if (tx.project_id && matchedProjectIds.has(Number(tx.project_id))) return true;
        if (quotationId > 0 && Number(tx.quotation_id) === quotationId) return true;
        if (tx.project_id || tx.quotation_id) return false;
        const inv = String(tx.invoice_number || '').trim().toLowerCase();
        const desc = String(tx.description || '').toLowerCase();
        if (refsLow.some((r) => inv === r || desc.includes(r))) return true;
        if (titleLow && desc.includes(titleLow)) return true;
        return false;
    };

    // 2. Trava Contábil: bloqueia retorno se houver fatura já paga vinculada a este fluxo
    try {
        if (clientId > 0) {
            const paidRes = await db.prepare(
                `SELECT id, project_id, quotation_id, invoice_number, description FROM financial_transactions WHERE client_id = ? AND status = 'paid'`
            ).bind(clientId).all();
            for (const tx of (paidRes?.results || []) as any[]) {
                if (matchesTx(tx)) {
                    return {
                        blockedReason: 'Trava Contábil: Este fluxo já possui fatura paga. Para preservar o Recibo Oficial de Quitação e a auditoria financeira, não é possível voltar de fase.',
                        canceledProjects: 0,
                        canceledInvoices: 0
                    };
                }
            }
        }
    } catch { }

    // 3. Cancela projetos ainda não concluídos e faturas em aberto (pending/reviewing/overdue)
    let canceledProjects = 0;
    for (const pId of matchedProjectIds) {
        try {
            const res = await db.prepare(
                `UPDATE projects SET status = 'canceled', progress_percentage = 0, updated_at = datetime('now')
                 WHERE id = ? AND status NOT IN ('completed', 'canceled')`
            ).bind(pId).run();
            if (Number(res?.meta?.changes || 0) > 0) canceledProjects++;
        } catch { }
    }

    let canceledInvoices = 0;
    try {
        if (clientId > 0) {
            const openRes = await db.prepare(
                `SELECT id, project_id, quotation_id, invoice_number, description FROM financial_transactions
                 WHERE client_id = ? AND status IN ('pending', 'reviewing', 'overdue')`
            ).bind(clientId).all();
            for (const tx of (openRes?.results || []) as any[]) {
                if (matchesTx(tx)) {
                    const res = await db.prepare(
                        `UPDATE financial_transactions SET status = 'canceled', updated_at = datetime('now')
                         WHERE id = ? AND status != 'paid'`
                    ).bind(tx.id).run();
                    if (Number(res?.meta?.changes || 0) > 0) canceledInvoices++;
                }
            }
        }
    } catch { }

    return { canceledProjects, canceledInvoices };
}

/**
 * Exclusão sincronizada do fluxo comercial completo:
 * Solicitação ↔ Orçamento ↔ Projeto (etapas/anexos) ↔ Faturas em aberto (não pagas).
 * Preserva faturas já pagas (`status = 'paid'`) para integridade contábil e de recibos.
 */
async function deleteLinkedCommercialFlow(
    db: any,
    env: any,
    anchor: { requestId?: number; quotationId?: number; projectId?: number }
): Promise<{
    blockedReason?: string;
    deletedRequests: number;
    deletedQuotations: number;
    deletedProjects: number;
    deletedInvoices: number;
}> {
    const requestIds = new Set<number>();
    const quotationIds = new Set<number>();
    const projectIds = new Set<number>();
    const invoiceRefs = new Set<string>();
    const titles = new Set<string>();
    let clientId: number | null = null;

    const addTitle = (t: unknown) => {
        const s = String(t || '').trim();
        if (s) titles.add(s.toLowerCase());
    };
    const addRef = (r: unknown) => {
        const s = String(r || '').trim();
        if (s) invoiceRefs.add(s);
    };

    try {
        if (anchor.requestId && anchor.requestId > 0) {
            requestIds.add(anchor.requestId);
            const req = (await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(anchor.requestId).first()) as any;
            if (req) {
                if (req.client_id) clientId = Number(req.client_id);
                addTitle(req.service_title);
                addTitle(req.title);
                addRef(req.protocol);
                addRef(req.tracking_code);
            }
        }

        if (anchor.quotationId && anchor.quotationId > 0) {
            quotationIds.add(anchor.quotationId);
            const q = (await db.prepare(`SELECT * FROM quotations WHERE id = ?`).bind(anchor.quotationId).first()) as any;
            if (q) {
                if (q.client_id) clientId = Number(q.client_id);
                if (q.service_request_id) requestIds.add(Number(q.service_request_id));
                addTitle(q.title);
                addRef(q.reference_code);
            }
        }

        if (anchor.projectId && anchor.projectId > 0) {
            projectIds.add(anchor.projectId);
            const p = (await db.prepare(`SELECT * FROM projects WHERE id = ?`).bind(anchor.projectId).first()) as any;
            if (p) {
                if (p.client_id) clientId = Number(p.client_id);
                if (p.quotation_id) quotationIds.add(Number(p.quotation_id));
                if (p.service_request_id) requestIds.add(Number(p.service_request_id));
                addTitle(p.title);
                addTitle(p.name);
            }
        }

        // Expande vínculos: solicitações -> orçamentos e vice-versa
        for (const rId of [...requestIds]) {
            const req = (await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(rId).first()) as any;
            if (req) {
                if (!clientId && req.client_id) clientId = Number(req.client_id);
                addTitle(req.service_title);
                addTitle(req.title);
                addRef(req.protocol);
                addRef(req.tracking_code);
            }
            const qRes = await db.prepare(`SELECT * FROM quotations WHERE service_request_id = ?`).bind(rId).all();
            for (const q of (qRes?.results || []) as any[]) {
                quotationIds.add(Number(q.id));
                if (!clientId && q.client_id) clientId = Number(q.client_id);
                addTitle(q.title);
                addRef(q.reference_code);
            }
        }

        // Busca solicitações, orçamentos e projetos do mesmo cliente com o mesmo título
        if (clientId && titles.size > 0) {
            const reqRes = await db.prepare(`SELECT * FROM service_requests WHERE client_id = ?`).bind(clientId).all();
            for (const r of (reqRes?.results || []) as any[]) {
                const t1 = String(r.service_title || '').trim().toLowerCase();
                const t2 = String(r.title || '').trim().toLowerCase();
                if ((t1 && titles.has(t1)) || (t2 && titles.has(t2))) {
                    requestIds.add(Number(r.id));
                    addRef(r.protocol);
                    addRef(r.tracking_code);
                }
            }

            const qRes = await db.prepare(`SELECT * FROM quotations WHERE client_id = ?`).bind(clientId).all();
            for (const q of (qRes?.results || []) as any[]) {
                const qt = String(q.title || '').trim().toLowerCase();
                if ((q.service_request_id && requestIds.has(Number(q.service_request_id))) || (qt && titles.has(qt))) {
                    quotationIds.add(Number(q.id));
                    addRef(q.reference_code);
                }
            }

            const pRes = await db.prepare(`SELECT * FROM projects WHERE client_id = ?`).bind(clientId).all();
            for (const p of (pRes?.results || []) as any[]) {
                const matchesRelational =
                    (p.quotation_id && quotationIds.has(Number(p.quotation_id))) ||
                    (p.service_request_id && requestIds.has(Number(p.service_request_id)));
                const hasRelationalLink = Boolean(p.quotation_id || p.service_request_id);
                const pt1 = String(p.title || '').trim().toLowerCase();
                const pt2 = String(p.name || '').trim().toLowerCase();
                const matchesLegacyTitle = !hasRelationalLink && ((pt1 && titles.has(pt1)) || (pt2 && titles.has(pt2)));
                if (matchesRelational || matchesLegacyTitle) {
                    projectIds.add(Number(p.id));
                }
            }
        }
    } catch { }

    // Trava de Fase 1: Orçamento ou Solicitação que já gerou Projeto vinculado não pode ser excluído diretamente
    if ((anchor.quotationId || anchor.requestId) && projectIds.size > 0) {
        return {
            blockedReason: 'Trava de Fase: Este registro já possui projeto vinculado. Exclua ou cancele o projeto primeiro em Projetos antes de remover o orçamento ou solicitação.',
            deletedRequests: 0,
            deletedQuotations: 0,
            deletedProjects: 0,
            deletedInvoices: 0
        };
    }

    // Trava de Fase 1B: Projetos já concluídos não podem ser excluídos diretamente
    if (projectIds.size > 0) {
        try {
            for (const pid of projectIds) {
                const pSt = (await db.prepare(`SELECT status FROM projects WHERE id = ?`).bind(pid).first()) as { status?: string } | null;
                if (pSt?.status === 'completed') {
                    return {
                        blockedReason: 'Trava de Fase: Projetos já concluídos não podem ser excluídos para preservar o histórico de entregas e auditoria.',
                        deletedRequests: 0,
                        deletedQuotations: 0,
                        deletedProjects: 0,
                        deletedInvoices: 0
                    };
                }
            }
        } catch (phaseErr) {
            console.error('[deleteLinkedCommercialFlow] Falha fail-closed na Trava de Fase:', phaseErr);
            return {
                blockedReason: 'Não foi possível validar a Trava de Fase no momento. Exclusão abortada por segurança.',
                deletedRequests: 0,
                deletedQuotations: 0,
                deletedProjects: 0,
                deletedInvoices: 0
            };
        }
    }

    const matchesTransactionToFlow = (tx: any): boolean => {
        if (tx.project_id && projectIds.has(Number(tx.project_id))) return true;
        if (tx.quotation_id && quotationIds.has(Number(tx.quotation_id))) return true;
        // Se a fatura já possui vínculo relacional explícito com outro projeto/orçamento, não faz match por texto
        if (tx.project_id || tx.quotation_id) return false;
        const inv = String(tx.invoice_number || '').trim();
        const descLow = String(tx.description || '').toLowerCase();
        const matchesRef = Boolean(inv && invoiceRefs.has(inv));
        const matchesRefInDesc = [...invoiceRefs].some((r) => r && descLow.includes(r.toLowerCase()));
        const matchesTitle = [...titles].some((t) => t && descLow.includes(t));
        return matchesRef || matchesRefInDesc || matchesTitle;
    };

    // Trava Contábil 2 (fail-closed): Bloqueia exclusão se houver fatura já paga vinculada a este fluxo
    try {
        if (clientId && (projectIds.size > 0 || quotationIds.size > 0 || invoiceRefs.size > 0 || titles.size > 0)) {
            const paidRes = await db.prepare(
                `SELECT id, project_id, quotation_id, invoice_number, description FROM financial_transactions WHERE client_id = ? AND status = 'paid'`
            ).bind(clientId).all();
            for (const tx of (paidRes?.results || []) as any[]) {
                if (matchesTransactionToFlow(tx)) {
                    return {
                        blockedReason: 'Trava Contábil: Este fluxo possui fatura já paga. Para preservar o Recibo Oficial de Quitação e o histórico financeiro, cancele/arquive em vez de excluir.',
                        deletedRequests: 0,
                        deletedQuotations: 0,
                        deletedProjects: 0,
                        deletedInvoices: 0
                    };
                }
            }
        }
    } catch (acctErr) {
        console.error('[deleteLinkedCommercialFlow] Falha fail-closed na Trava Contábil:', acctErr);
        return {
            blockedReason: 'Não foi possível validar a Trava Contábil no momento. Exclusão abortada por segurança.',
            deletedRequests: 0,
            deletedQuotations: 0,
            deletedProjects: 0,
            deletedInvoices: 0
        };
    }

    let deletedInvoices = 0;
    try {
        if (clientId && (projectIds.size > 0 || quotationIds.size > 0 || invoiceRefs.size > 0 || titles.size > 0)) {
            const txRes = await db.prepare(
                `SELECT id, project_id, quotation_id, invoice_number, description, status FROM financial_transactions WHERE client_id = ? AND status != 'paid'`
            ).bind(clientId).all();
            for (const tx of (txRes?.results || []) as any[]) {
                if (matchesTransactionToFlow(tx)) {
                    try { await db.prepare(`DELETE FROM payments WHERE financial_transaction_id = ?`).bind(tx.id).run(); } catch { }
                    await db.prepare(`DELETE FROM financial_transactions WHERE id = ? AND status != 'paid'`).bind(tx.id).run();
                    deletedInvoices++;
                }
            }
        }
    } catch { }

    for (const pId of projectIds) {
        try {
            await db.prepare(`DELETE FROM project_stages WHERE project_id = ?`).bind(pId).run();
            await db.prepare(`DELETE FROM project_attachments WHERE project_id = ?`).bind(pId).run();
            await db.prepare(`DELETE FROM projects WHERE id = ?`).bind(pId).run();
        } catch { }
    }

    for (const qId of quotationIds) {
        try {
            await db.prepare(`DELETE FROM quotations WHERE id = ?`).bind(qId).run();
        } catch { }
    }

    for (const rId of requestIds) {
        try {
            await db.prepare(`DELETE FROM service_request_history WHERE service_request_id = ?`).bind(rId).run();
            await db.prepare(`DELETE FROM request_status_histories WHERE service_request_id = ?`).bind(rId).run();
            await db.prepare(`DELETE FROM request_attachments WHERE service_request_id = ?`).bind(rId).run();
            await db.prepare(`DELETE FROM service_requests WHERE id = ?`).bind(rId).run();
        } catch { }
    }

    if (clientId) {
        try {
            await autoRevokeIdlePortalUser(db, env, clientId);
        } catch { }
    }

    return {
        deletedRequests: requestIds.size,
        deletedQuotations: quotationIds.size,
        deletedProjects: projectIds.size,
        deletedInvoices
    };
}

/**
 * Garante que todo orçamento (inclusive os criados manualmente em "+ Novo Orçamento")
 * esteja vinculado a uma Solicitação (service_requests), mantendo o pipeline comercial unificado.
 */
async function ensureRequestForManualQuotation(
    db: any,
    userId: number | null,
    quotation: {
        id: number;
        client_id: number;
        service_request_id?: number | null;
        reference_code?: string | null;
        title?: string | null;
        final_amount?: number | null;
        total_amount?: number | null;
        status?: string | null;
        notes?: string | null;
    }
): Promise<any | null> {
    if (!db || !quotation?.client_id) return null;

    if (quotation.service_request_id) {
        try {
            const existing = await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(quotation.service_request_id).first();
            if (existing) return existing;
        } catch { }
    }

    const qTitle = String(quotation.title || `Proposta • ${quotation.reference_code || quotation.id}`).trim();

    // Verifica se já existe solicitação do mesmo cliente com mesmo título sem outro orçamento
    try {
        const matchByTitle = (await db.prepare(
            `SELECT * FROM service_requests
             WHERE client_id = ? AND (lower(service_title) = lower(?) OR lower(title) = lower(?))
             ORDER BY id DESC LIMIT 1`
        ).bind(quotation.client_id, qTitle, qTitle).first()) as any;
        if (matchByTitle?.id) {
            await db.prepare(`UPDATE quotations SET service_request_id = ? WHERE id = ?`).bind(matchByTitle.id, quotation.id).run();
            quotation.service_request_id = Number(matchByTitle.id);
            return matchByTitle;
        }
    } catch { }

    let client: any = null;
    try {
        client = await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(quotation.client_id).first();
    } catch { }

    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${rand}`;
    const qStatus = String(quotation.status || 'draft');
    const reqStatus =
        qStatus === 'approved'
            ? 'in_progress'
            : qStatus === 'sent'
                ? 'quotation_sent'
                : 'analyzing';
    const amount = Number(quotation.final_amount ?? quotation.total_amount ?? 0);
    const description = String(quotation.notes || `Demanda originada a partir do orçamento ${quotation.reference_code || `#${quotation.id}`}.`).trim();
    const clientName = String(client?.name || client?.company || 'Cliente').trim();
    const clientCompany = client?.company || null;
    const clientEmail = String(client?.email || `lead-${quotation.client_id}@gundjatech.local`).trim();
    const clientPhone = client?.phone || null;

    try {
        const insReq = await db.prepare(
            `INSERT INTO service_requests (protocol, tracking_code, client_id, name, company, email, phone, title, service_title, description, briefing, estimated_budget, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
            protocol,
            protocol,
            quotation.client_id,
            clientName,
            clientCompany,
            clientEmail,
            clientPhone,
            qTitle,
            qTitle,
            description,
            description,
            amount,
            reqStatus
        ).run();

        const newReqId = Number(insReq?.meta?.last_row_id || 0);
        if (newReqId > 0) {
            await db.prepare(`UPDATE quotations SET service_request_id = ? WHERE id = ?`).bind(newReqId, quotation.id).run();
            quotation.service_request_id = newReqId;

            await recordRequestTimeline(db, {
                serviceRequestId: newReqId,
                userId,
                action: 'created',
                fromStatus: null,
                toStatus: reqStatus,
                notes: `Solicitação ${protocol} gerada e vinculada automaticamente ao orçamento ${quotation.reference_code || `#${quotation.id}`}`
            });

            return {
                id: newReqId,
                protocol,
                client_id: quotation.client_id,
                name: clientName,
                company: clientCompany,
                email: clientEmail,
                phone: clientPhone,
                title: qTitle,
                service_title: qTitle,
                description,
                estimated_budget: amount,
                status: reqStatus
            };
        }
    } catch { }

    return null;
}

/**
 * Reconcilia e garante que todo orçamento com status = 'approved' (inclusive os criados manualmente
 * diretamente como Aprovados) possua a Solicitação vinculada, o respectivo Projeto em Execução (com as 4 etapas padrão)
 * e o lançamento financeiro A RECEBER em Receita & Caixa.
 */
async function reconcileApprovedQuotationsWithoutProject(
    db: any,
    env: any,
    userId: number | null,
    filterQuotationId?: number | null
): Promise<void> {
    if (!db) return;
    try {
        // 1. Garante que qualquer orçamento sem service_request_id receba sua Solicitação correspondente
        const orphanQuotesSql = filterQuotationId
            ? `SELECT * FROM quotations WHERE id = ? AND service_request_id IS NULL`
            : `SELECT * FROM quotations WHERE service_request_id IS NULL ORDER BY id ASC`;
        const orphanStmt = filterQuotationId ? db.prepare(orphanQuotesSql).bind(filterQuotationId) : db.prepare(orphanQuotesSql);
        const orphanQuotes = ((await orphanStmt.all())?.results || []) as any[];
        for (const oq of orphanQuotes) {
            if (oq?.id && oq?.client_id) {
                await ensureRequestForManualQuotation(db, userId, oq);
            }
        }

        // 2. Garante que todo orçamento aprovado possua Projeto em Execução
        const sql = filterQuotationId
            ? `SELECT * FROM quotations WHERE id = ? AND status = 'approved'`
            : `SELECT * FROM quotations WHERE status = 'approved' ORDER BY id ASC`;
        const stmt = filterQuotationId ? db.prepare(sql).bind(filterQuotationId) : db.prepare(sql);
        const rows = ((await stmt.all())?.results || []) as any[];

        for (const q of rows) {
            if (!q || q.status !== 'approved' || !q.client_id) continue;
            const qTitle = String(q.title || '').trim();
            if (!qTitle) continue;

            const reqRow = await ensureRequestForManualQuotation(db, userId, q);

            const existingProj = (await db.prepare(
                `SELECT id FROM projects
                 WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?))
                 LIMIT 1`
            ).bind(q.client_id, qTitle, qTitle).first()) as { id: number } | null;

            if (!existingProj?.id) {
                await autoStartProjectFromApprovedRequest(db, env, userId, {
                    request: reqRow,
                    quotation: q,
                    approvalNote: `Orçamento ${q.reference_code || `#${q.id}`} aprovado — projeto iniciado automaticamente`
                });
            }
        }
    } catch { }
}

async function autoRegisterRevenueOnProjectCompletion(
    db: any,
    options: {
        projectId?: number | string | null;
        clientId?: number | null;
        projectTitle: string;
        linkedReq?: any;
        linkedQuotation?: any;
    }
): Promise<{ transactionId?: number; amount: number; created: boolean }> {
    const clientId = options.clientId
        ? Number(options.clientId)
        : options.linkedReq?.client_id
            ? Number(options.linkedReq.client_id)
            : null;
    if (!clientId) {
        return { amount: 0, created: false };
    }

    // 1. Localiza orçamento aprovado vinculado à solicitação ou ao cliente/projeto
    let quotation = options.linkedQuotation || null;
    if (!quotation && options.linkedReq?.id) {
        try {
            quotation = (await db.prepare(
                `SELECT * FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
            ).bind(options.linkedReq.id).first()) as any;
        } catch { }
    }
    if (!quotation && clientId) {
        try {
            quotation = (await db.prepare(
                `SELECT * FROM quotations WHERE client_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 1`
            ).bind(clientId).first()) as any;
        } catch { }
    }

    // Garante que o projeto pertence a um fluxo aprovado
    const isApprovedFlow =
        quotation?.status === 'approved' ||
        options.linkedReq?.status === 'approved' ||
        options.linkedReq?.status === 'in_progress' ||
        options.linkedReq?.status === 'completed' ||
        Boolean(options.projectId);

    if (!isApprovedFlow) {
        return { amount: 0, created: false };
    }

    // 2. Calcula valor da receita a partir do orçamento aprovado (ou valor estimado da solicitação)
    let amount = Number(
        quotation?.final_amount ??
        quotation?.total_amount ??
        options.linkedReq?.estimated_budget ??
        0
    );
    if (Number.isNaN(amount) || amount < 0) {
        amount = 0;
    }

    const invoiceRef = String(
        quotation?.reference_code ||
        options.linkedReq?.protocol ||
        (options.projectId ? `PROJ-${options.projectId}` : `REC-${Date.now().toString(36).toUpperCase()}`)
    ).trim();

    const description = quotation?.reference_code
        ? `Receita de Projeto Concluído: ${options.projectTitle} (Orçamento ${quotation.reference_code})`
        : `Receita de Projeto Concluído: ${options.projectTitle}`;

    // 3. Idempotência: verifica se já existe lançamento financeiro para este orçamento/projeto
    try {
        const existingTx = (await db.prepare(
            `SELECT id, status, amount FROM financial_transactions
             WHERE client_id = ? AND (invoice_number = ? OR lower(description) = lower(?))
             ORDER BY id DESC LIMIT 1`
        ).bind(clientId, invoiceRef, description).first()) as { id: number; status: string; amount: number } | null;

        if (existingTx?.id) {
            if (amount > 0 && Number(existingTx.amount || 0) !== amount) {
                await db.prepare(
                    `UPDATE financial_transactions
                     SET amount = ?,
                         updated_at = datetime('now')
                     WHERE id = ?`
                ).bind(amount, existingTx.id).run();
            }
            return { transactionId: existingTx.id, amount: amount || Number(existingTx.amount || 0), created: false };
        }
    } catch { }

    // 4. Insere automaticamente como Receita A RECEBER (type = 'income', status = 'pending') em Receita & Caixa
    // Permanece como A Receber até a confirmação manual do recebimento (botão "✓ Receber")
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    let newTxId: number | undefined;
    try {
        const insTx = await db.prepare(
            `INSERT INTO financial_transactions (client_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
             VALUES (?, 'income', 'contract', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(clientId, description, amount, dueDate, 'PIX', invoiceRef).run();
        newTxId = Number(insTx?.meta?.last_row_id || 0) || undefined;
    } catch { }

    return { transactionId: newTxId, amount, created: true };
}

adminRoutes.post('/solicitacoes/:id/gerar-orcamento', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');

    const req = await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(id).first<any>();
    if (!req) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    // Se já existe orçamento vinculado a esta solicitação, abre para edição
    try {
        const existingQuote = await db.prepare(
            `SELECT id FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
        ).bind(id).first<{ id: number }>();
        if (existingQuote?.id) {
            return c.redirect(`/admin/orcamentos/${existingQuote.id}?success=${encodeURIComponent('Orçamento vinculado carregado para revisão e envio.')}`);
        }
    } catch { }

    const clientId = await ensureClientForRequest(db, req);
    if (!clientId) {
        return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent('Não foi possível vincular o cliente para gerar o orçamento.')}`);
    }

    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refCode = `ORC-${dateStr}-${rand}`;
    const amount = Math.max(0, Number(req.estimated_budget || 0));
    const qTitle = String(req.service_title || req.title || `Proposta • ${req.protocol || id}`).trim();
    const qNotes = String(req.description || req.briefing || '').trim() || null;
    const defaultExpiry = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

    const insQuote = await db.prepare(
        `INSERT INTO quotations (reference_code, client_id, service_request_id, title, total_amount, discount_amount, final_amount, status, expires_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'draft', ?, ?, datetime('now'), datetime('now'))`
    ).bind(refCode, clientId, id, qTitle, amount, amount, defaultExpiry, qNotes).run();
    const newQuoteId = Number(insQuote.meta?.last_row_id || 0);

    if (req.status === 'new') {
        await db.prepare(
            `UPDATE service_requests SET status = 'analyzing', updated_at = datetime('now') WHERE id = ?`
        ).bind(id).run();

        await recordRequestTimeline(db, {
            serviceRequestId: id,
            userId: user.id,
            action: 'status_change',
            fromStatus: 'new',
            toStatus: 'analyzing',
            notes: `Em análise técnica — orçamento ${refCode} iniciado pela administração`
        });
    }

    if (newQuoteId > 0) {
        return c.redirect(`/admin/orcamentos/${newQuoteId}?success=${encodeURIComponent(`Orçamento ${refCode} criado! Defina valores, validade e envie ao cliente.`)}`);
    }

    return c.redirect(`/admin/orcamentos?success=${encodeURIComponent(`Orçamento ${refCode} criado com sucesso!`)}`);
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

    const current = await db.prepare(`SELECT id, status, client_id, name, company, email, phone, title, service_title, description, briefing, estimated_budget, protocol FROM service_requests WHERE id = ?`).bind(id).first<any>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    // Impede registro duplicado na linha do tempo quando não houve alteração real de status nem comentário
    if (current.status === newStatus && !notes) {
        return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent('Nenhuma alteração detectada para salvar.')}`);
    }

    // Busca orçamento vinculado à solicitação
    let linkedQuotation: any = null;
    try {
        linkedQuotation = await db.prepare(
            `SELECT * FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
        ).bind(id).first<any>();
    } catch { }

    // REGRA OBRIGATÓRIA: Toda solicitação deve passar por um orçamento aprovado antes de iniciar execução ou concluir
    if (newStatus === 'approved' || newStatus === 'in_progress' || newStatus === 'completed') {
        const isAlreadyApprovedOrRunning = current.status === 'approved' || current.status === 'in_progress' || current.status === 'completed';

        if (!linkedQuotation && !isAlreadyApprovedOrRunning) {
            return c.redirect(
                `/admin/solicitacoes/${id}?error=${encodeURIComponent('Toda solicitação deve passar primeiramente por um orçamento. Clique em "Elaborar Orçamento" e envie a proposta antes de aprovar ou iniciar o trabalho.')}`
            );
        }

        // Trava de Fase sincronizada com o botão superior: orçamento ainda em rascunho/recusado precisa ser enviado antes de aprovar
        if (
            newStatus === 'approved' &&
            !isAlreadyApprovedOrRunning &&
            linkedQuotation &&
            (linkedQuotation.status === 'draft' || linkedQuotation.status === 'rejected') &&
            current.status !== 'quotation_sent'
        ) {
            return c.redirect(
                `/admin/solicitacoes/${id}?error=${encodeURIComponent('Trava de Fase: Finalize e envie o orçamento ao cliente primeiro ("Finalizar & Enviar Orçamento" ou status "3. Orçamento Enviado") antes de aprovar.')}`
            );
        }

        if ((newStatus === 'in_progress' || newStatus === 'completed') && !isAlreadyApprovedOrRunning && linkedQuotation?.status !== 'approved') {
            return c.redirect(
                `/admin/solicitacoes/${id}?error=${encodeURIComponent('Só é possível iniciar ou concluir o trabalho depois que o orçamento estiver Aprovado.')}`
            );
        }

        // Quando o orçamento é aprovado (ou a solicitação é marcada como Aprovada com orçamento emitido),
        // aprova o orçamento e já inicia o Projeto automaticamente movendo para Em Execução!
        if (newStatus === 'approved' || (newStatus === 'in_progress' && linkedQuotation?.status === 'approved' && current.status !== 'in_progress')) {
            const quoteAmount = Number(linkedQuotation?.final_amount ?? linkedQuotation?.total_amount ?? current.estimated_budget ?? 0);
            if (quoteAmount <= 0) {
                const targetUrl = linkedQuotation?.id ? `/admin/orcamentos/${linkedQuotation.id}` : `/admin/solicitacoes/${id}`;
                return c.redirect(
                    `${targetUrl}?error=${encodeURIComponent('Trava Comercial: Defina um valor maior que R$ 0,00 no orçamento antes de aprovar e iniciar o projeto.')}`
                );
            }

            if (linkedQuotation && linkedQuotation.status !== 'approved') {
                try {
                    await db.prepare(
                        `UPDATE quotations SET status = 'approved', updated_at = datetime('now') WHERE id = ?`
                    ).bind(linkedQuotation.id).run();
                    linkedQuotation.status = 'approved';
                } catch { }
            }

            await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
                request: current,
                quotation: linkedQuotation,
                approvalNote: notes || (linkedQuotation?.reference_code ? `Orçamento ${linkedQuotation.reference_code} aprovado — início automático do projeto` : 'Orçamento aprovado — início automático do projeto')
            });

            return c.redirect(
                `/admin/solicitacoes/${id}?success=${encodeURIComponent('Orçamento aprovado! O Projeto foi criado automaticamente com as 4 etapas padrão e a solicitação entrou em Execução.')}`
            );
        }

        // Trava de Conclusão na Solicitação: exige que todas as etapas do projeto vinculado estejam concluídas
        if (newStatus === 'completed') {
            const projTitleCheck = String(current.service_title || current.title || '').trim();
            if (current.client_id && projTitleCheck) {
                try {
                    const projRow = (await db.prepare(
                        `SELECT id FROM projects
                         WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?))
                         ORDER BY id DESC LIMIT 1`
                    ).bind(current.client_id, projTitleCheck, projTitleCheck).first()) as { id: number } | null;
                    if (projRow?.id) {
                        const stRes = await db.prepare(
                            `SELECT status FROM project_stages WHERE project_id = ?`
                        ).bind(projRow.id).all();
                        const allSt = (stRes?.results || []) as Array<{ status: string }>;
                        const pendingSt = allSt.filter((s) => s.status !== 'completed');
                        if (allSt.length > 0 && pendingSt.length > 0) {
                            return c.redirect(
                                `/admin/solicitacoes/${id}?error=${encodeURIComponent(`Trava de Qualidade: O projeto possui ${pendingSt.length} etapa(s) pendente(s) no cronograma (${allSt.length - pendingSt.length}/${allSt.length} concluídas). Conclua todas as etapas em Projetos antes de encerrar.`)}`
                            );
                        }
                    }
                } catch { }
            }
        }
    }

    // Trava Comercial: impede marcar como "Orçamento Enviado" com valor R$ 0,00
    if (newStatus === 'quotation_sent') {
        const quoteAmount = Number(linkedQuotation?.final_amount ?? linkedQuotation?.total_amount ?? current.estimated_budget ?? 0);
        if (quoteAmount <= 0) {
            const targetUrl = linkedQuotation?.id ? `/admin/orcamentos/${linkedQuotation.id}` : `/admin/solicitacoes/${id}`;
            return c.redirect(
                `${targetUrl}?error=${encodeURIComponent('Trava Comercial: Elabore o orçamento e defina um valor maior que R$ 0,00 antes de enviá-lo ao cliente.')}`
            );
        }
    }

    const prevReqStatus = String(current.status || '');
    const isRollingBackFromExecution =
        (prevReqStatus === 'in_progress' || prevReqStatus === 'approved' || prevReqStatus === 'completed') &&
        (newStatus === 'quotation_sent' || newStatus === 'analyzing' || newStatus === 'new' || newStatus === 'cancelled');

    if (isRollingBackFromExecution) {
        const rb = await rollbackUnfinishedFlow(db, {
            clientId: current.client_id,
            requestId: Number(id),
            quotationId: linkedQuotation?.id || null,
            title: String(linkedQuotation?.title || current.service_title || current.title || '').trim(),
            refs: [current.protocol, linkedQuotation?.reference_code]
        });
        if (rb.blockedReason) {
            return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent(rb.blockedReason)}`);
        }
        // Sincroniza orçamento vinculado ao voltar de Em Execução
        if (linkedQuotation && linkedQuotation.status === 'approved') {
            const targetQuoteStatus = newStatus === 'quotation_sent' ? 'sent' : 'draft';
            try {
                await db.prepare(`UPDATE quotations SET status = ?, updated_at = datetime('now') WHERE id = ?`)
                    .bind(targetQuoteStatus, linkedQuotation.id).run();
                linkedQuotation.status = targetQuoteStatus;
            } catch { }
        }
    }

    await db.prepare(
        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newStatus, id).run();

    await recordRequestTimeline(db, {
        serviceRequestId: id,
        userId: user.id,
        action: 'status_change',
        fromStatus: prevReqStatus,
        toStatus: newStatus,
        notes
    });

    // Quando marcado como "Orçamento Enviado", garante que o orçamento chegue ao Portal do Cliente
    // e provisiona automaticamente o usuário do Portal (role = 'client')
    if (newStatus === 'quotation_sent') {
        try {
            const clientId = await ensureClientForRequest(db, current);
            if (clientId) {
                if (!linkedQuotation) {
                    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    const refCode = `ORC-${dateStr}-${rand}`;
                    const amount = Number(current.estimated_budget || 0);
                    const qTitle = String(current.service_title || current.title || `Proposta • ${current.protocol || id}`).trim();
                    const qNotes = notes || String(current.description || '').trim() || null;

                    await db.prepare(
                        `INSERT INTO quotations (reference_code, client_id, service_request_id, title, total_amount, discount_amount, final_amount, status, notes, created_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, 0, ?, 'sent', ?, datetime('now'), datetime('now'))`
                    ).bind(refCode, clientId, id, qTitle, amount, amount, qNotes).run();
                } else if (linkedQuotation.status === 'draft' || linkedQuotation.status === 'rejected') {
                    await db.prepare(
                        `UPDATE quotations SET status = 'sent', updated_at = datetime('now') WHERE id = ?`
                    ).bind(linkedQuotation.id).run();
                }

                await autoProvisionPortalUserForClient(db, c.env, {
                    clientId,
                    overrideEmail: current.email || null,
                    overridePhone: current.phone || null,
                    promoteActive: false,
                    sendInviteEmail: true,
                    baseUrl: new URL(c.req.url).origin
                });
            }
        } catch { }
        return c.redirect(`/admin/solicitacoes/${id}?success=${encodeURIComponent('Orçamento enviado! Acesso ao Portal do Cliente liberado automaticamente para aprovação.')}`);
    }

    // Se retornou de "Orçamento Enviado" para "Novo" ou "Em Análise", sincroniza orçamento enviado de volta para rascunho
    if ((newStatus === 'new' || newStatus === 'analyzing') && linkedQuotation && linkedQuotation.status === 'sent') {
        try {
            await db.prepare(
                `UPDATE quotations SET status = 'draft', updated_at = datetime('now') WHERE id = ?`
            ).bind(linkedQuotation.id).run();
        } catch { }
    }

    if (newStatus === 'cancelled') {
        try {
            await autoRevokeIdlePortalUser(db, c.env, current.client_id);
        } catch { }
    }

    if (newStatus === 'completed' && prevReqStatus !== 'completed') {
        const projTitle = String(current.service_title || current.title || 'Projeto GundjaTech').trim();
        const clientId = await ensureClientForRequest(db, current);

        // Sincroniza o Projeto vinculado para Concluído (100%)
        let linkedProjectId: number | undefined;
        if (clientId && projTitle) {
            try {
                const projRow = (await db.prepare(
                    `SELECT id, status FROM projects
                     WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?))
                     ORDER BY id DESC LIMIT 1`
                ).bind(clientId, projTitle, projTitle).first()) as { id: number; status: string } | null;
                if (projRow?.id) {
                    linkedProjectId = projRow.id;
                    if (projRow.status !== 'completed') {
                        await db.prepare(
                            `UPDATE projects SET status = 'completed', progress_percentage = 100, updated_at = datetime('now') WHERE id = ?`
                        ).bind(projRow.id).run();
                    }
                }
            } catch { }
        }

        // Lança automaticamente a receita do orçamento aprovado em Receita & Caixa (/admin/financeiro)
        await autoRegisterRevenueOnProjectCompletion(db, {
            projectId: linkedProjectId,
            clientId,
            projectTitle: projTitle,
            linkedReq: { ...current, client_id: clientId, status: 'completed' },
            linkedQuotation
        });

        if (current.email && !String(current.email).endsWith('.local')) {
            try {
                await sendProjectCompletedEmail(
                    c.env,
                    String(current.email).trim(),
                    String(current.company || current.name || 'Cliente').trim(),
                    {
                        id: linkedProjectId,
                        title: projTitle
                    }
                );
            } catch { }
        }

        return c.redirect(
            `/admin/solicitacoes/${id}?success=${encodeURIComponent('Projeto concluído! Receita lançada automaticamente em Receita & Caixa.')}`
        );
    }

    return c.redirect(`/admin/solicitacoes/${id}?success=Status atualizado com sucesso`);
});

adminRoutes.post('/solicitacoes/:id/editar', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const serviceTitle = String(body.service_title || body.title || '').trim();
    const name = String(body.name || '').trim() || null;
    const company = String(body.company || '').trim() || null;
    const email = String(body.email || '').trim().toLowerCase() || null;
    const phone = String(body.phone || '').trim() || null;
    const description = String(body.description || '').trim();
    const estimatedBudgetRaw = String(body.estimated_budget || '').trim();
    const estimatedBudget = estimatedBudgetRaw !== '' ? Number(estimatedBudgetRaw) : null;

    if (!serviceTitle || !description) {
        return c.redirect(`/admin/solicitacoes/${id}?error=Título e descrição são obrigatórios.`);
    }

    const current = await db.prepare(`SELECT id, status FROM service_requests WHERE id = ?`).bind(id).first<{ id: number; status: string }>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada.');
    }

    await db.prepare(
        `UPDATE service_requests
         SET title = ?, service_title = ?, name = COALESCE(?, name), company = COALESCE(?, company), email = COALESCE(?, email), phone = COALESCE(?, phone), description = ?, estimated_budget = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(serviceTitle, serviceTitle, name, company, email, phone, description, estimatedBudget, id).run();

    await recordRequestTimeline(db, {
        serviceRequestId: Number(id),
        userId: user.id,
        action: 'edited',
        fromStatus: current.status,
        toStatus: current.status,
        notes: 'Dados da solicitação atualizados pela administração',
    });

    return c.redirect(`/admin/solicitacoes/${id}?success=Solicitação atualizada com sucesso!`);
});

adminRoutes.post('/solicitacoes/:id/cancelar', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');

    const current = await db.prepare(`SELECT status, client_id, protocol, title, service_title FROM service_requests WHERE id = ?`).bind(id).first<any>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    // Valida Trava Contábil / Fase e executa rollback do fluxo não finalizado antes de cancelar
    const linkedQuote = await db.prepare(`SELECT id, reference_code FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`).bind(id).first<any>();
    const rb = await rollbackUnfinishedFlow(db, {
        clientId: current.client_id ? Number(current.client_id) : null,
        requestId: Number(id),
        quotationId: linkedQuote?.id || null,
        title: current.service_title || current.title || null,
        refs: [current.protocol, linkedQuote?.reference_code]
    });
    if (rb.blockedReason) {
        return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent(rb.blockedReason)}`);
    }

    await db.prepare(
        `UPDATE service_requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
    ).bind(id).run();

    await recordRequestTimeline(db, {
        serviceRequestId: Number(id),
        userId: user.id,
        action: 'cancelled',
        fromStatus: current.status,
        toStatus: 'cancelled',
        notes: 'Solicitação cancelada pela administração',
    });

    // Revoga automaticamente o usuário do Portal caso o cliente não possua nenhum outro serviço ou projeto ativo
    try {
        await autoRevokeIdlePortalUser(db, c.env, current.client_id);
    } catch { }

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

    // Impede conversão duplicada em projeto
    try {
        const alreadyConverted = await db.prepare(
            `SELECT id FROM service_request_history WHERE service_request_id = ? AND action = 'converted_to_project' LIMIT 1`
        ).bind(id).first();
        if (alreadyConverted) {
            return c.redirect(`/admin/solicitacoes/${id}?error=Esta solicitação já foi convertida em Projeto.`);
        }
    } catch { }

    // REGRA OBRIGATÓRIA: Verifica se o orçamento vinculado está aprovado antes de permitir criar o projeto
    let linkedQuotation: any = null;
    try {
        linkedQuotation = await db.prepare(
            `SELECT * FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
        ).bind(id).first<any>();
    } catch { }

    const isApproved = req.status === 'approved' || req.status === 'in_progress' || linkedQuotation?.status === 'approved';
    if (!isApproved) {
        return c.redirect(
            `/admin/solicitacoes/${id}?error=${encodeURIComponent('Só é possível iniciar o projeto depois que o orçamento da solicitação for aprovado.')}`
        );
    }

    await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
        request: req,
        quotation: linkedQuotation,
        approvalNote: 'Convertido em Projeto após aprovação de orçamento'
    });

    return c.redirect(`/admin/solicitacoes/${id}?success=${encodeURIComponent('Projeto criado e solicitação movida para Em Execução com sucesso!')}`);
});

adminRoutes.post('/solicitacoes/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        const res = await deleteLinkedCommercialFlow(db, c.env, { requestId: id });
        if (res.blockedReason) {
            return c.redirect(`/admin/solicitacoes?error=${encodeURIComponent(res.blockedReason)}`);
        }
    }

    return c.redirect('/admin/solicitacoes?success=Solicitação e vínculos (orçamento, projeto e faturas em aberto) excluídos com sucesso.');
});

// ==========================================
// 4. PACOTES DE SERVIÇOS & CATÁLOGO (Modularizado em src/routes/admin/services.tsx)
// ==========================================
adminRoutes.route('/', adminServicesRoutes);

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
    const currentUser = c.get('user')!;
    const db = c.env.DB;
    const body = await getRequestBody(c);

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;
    const role = String(body.role || 'client').trim();
    const company = String(body.company || '').trim() || null;
    const password = String(body.password || '');

    const allowedRoles = new Set(['superadmin', 'admin', 'manager', 'developer', 'financial', 'attendant', 'client']);
    if (!allowedRoles.has(role)) {
        return c.redirect('/admin/usuarios?error=Cargo informado é inválido.');
    }
    if (role === 'superadmin' && currentUser.role !== 'superadmin') {
        return c.redirect('/admin/usuarios?error=Apenas um Super Admin pode cadastrar outro Super Admin.');
    }

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
    const currentUser = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    const isActive = body.is_active === '1' || body.is_active === 1 ? 1 : 0;
    const target = await db.prepare(`SELECT id, role, is_active FROM users WHERE id = ?`).bind(id).first<{ id: number; role: string; is_active: number }>();
    if (!target) {
        return c.redirect('/admin/usuarios?error=Usuário não encontrado.');
    }
    if (isActive === 0 && id === Number(currentUser.id)) {
        return c.redirect('/admin/usuarios?error=Não é possível desativar a própria conta.');
    }
    if (target.role === 'superadmin' && currentUser.role !== 'superadmin') {
        return c.redirect('/admin/usuarios?error=Apenas um Super Admin pode alterar o status de outro Super Admin.');
    }
    if (target.role === 'superadmin' && isActive === 0) {
        const activeSupers = await db.prepare(`SELECT COUNT(*) as total FROM users WHERE role = 'superadmin' AND is_active = 1`).first<{ total: number }>();
        if ((activeSupers?.total || 0) <= 1) {
            return c.redirect('/admin/usuarios?error=Não é possível desativar o último Super Admin ativo do sistema.');
        }
    }

    await db.prepare(
        `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(isActive, id).run();

    if (isActive === 0) {
        await destroyAllUserSessions(c.env, id);
    }

    return c.redirect('/admin/usuarios?success=Status do usuário atualizado com sucesso');
});

adminRoutes.post('/usuarios/:id/editar', async (c) => {
    const currentUser = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);

    if (!id || id <= 0) {
        return c.redirect('/admin/usuarios?error=Usuário inválido.');
    }

    const target = await db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<any>();
    if (!target) {
        return c.redirect('/admin/usuarios?error=Usuário não encontrado.');
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;
    const company = String(body.company || '').trim() || null;
    const allowedRoles = ['superadmin', 'admin', 'manager', 'attendant', 'developer', 'financial', 'client'];
    const requestedRole = String(body.role || target.role).trim();
    const nextRole = allowedRoles.includes(requestedRole) ? requestedRole : target.role;
    const nextActive = body.is_active === '0' || body.is_active === 0 ? 0 : 1;
    const newPassword = String(body.new_password || '');

    if (!name || !email) {
        return c.redirect('/admin/usuarios?error=Nome e E-mail são obrigatórios.');
    }

    if (newPassword && newPassword.length < 8) {
        return c.redirect('/admin/usuarios?error=A nova senha deve ter no mínimo 8 caracteres.');
    }

    // Somente Super Admin pode atribuir ou alterar papel de Super Admin
    if ((nextRole === 'superadmin' || target.role === 'superadmin') && currentUser.role !== 'superadmin' && nextRole !== target.role) {
        return c.redirect('/admin/usuarios?error=Apenas Super Administradores podem alterar este papel.');
    }

    // Impede desativar ou rebaixar a própria conta
    if (id === Number(currentUser.id) && (nextActive === 0 || nextRole !== target.role)) {
        return c.redirect('/admin/usuarios?error=Não é possível desativar ou alterar o papel da própria conta.');
    }

    // Impede remover o último Super Admin ativo
    if (target.role === 'superadmin' && (nextRole !== 'superadmin' || nextActive === 0)) {
        const superCount = await db.prepare(
            `SELECT COUNT(*) AS cnt FROM users WHERE role = 'superadmin' AND is_active = 1 AND id != ?`
        ).bind(id).first<{ cnt: number }>();
        if (!superCount || Number(superCount.cnt) < 1) {
            return c.redirect('/admin/usuarios?error=O sistema precisa manter pelo menos um Super Administrador ativo.');
        }
    }

    // Verifica duplicidade de e-mail
    const dup = await db.prepare(`SELECT id FROM users WHERE lower(email) = lower(?) AND id != ?`).bind(email, id).first();
    if (dup) {
        return c.redirect('/admin/usuarios?error=Já existe outro usuário cadastrado com este e-mail.');
    }

    if (newPassword) {
        const hashed = await hashPassword(newPassword);
        await db.prepare(
            `UPDATE users SET name = ?, email = ?, phone = ?, company = ?, role = ?, is_active = ?, password = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(name, email, phone, company, nextRole, nextActive, hashed, id).run();
        await destroyAllUserSessions(c.env, id);
        return c.redirect('/admin/usuarios?success=Usuário atualizado e nova senha definida com sucesso!');
    }

    await db.prepare(
        `UPDATE users SET name = ?, email = ?, phone = ?, company = ?, role = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(name, email, phone, company, nextRole, nextActive, id).run();

    // Revoga sessões se perdeu acesso ou trocou de papel
    if (nextActive === 0 || nextRole !== target.role) {
        await destroyAllUserSessions(c.env, id);
    }

    return c.redirect('/admin/usuarios?success=Dados do usuário atualizados com sucesso!');
});

adminRoutes.post('/usuarios/:id/revogar-sessoes', async (c) => {
    const currentUser = c.get('user')!;
    const id = Number(c.req.param('id'));

    if (!id || id === Number(currentUser.id)) {
        return c.redirect('/admin/usuarios?error=Use Sair do Painel para encerrar sua própria sessão.');
    }

    await destroyAllUserSessions(c.env, id);
    return c.redirect('/admin/usuarios?success=Todas as sessões ativas do usuário foram encerradas.');
});

adminRoutes.post('/usuarios/:id/reset-link', async (c) => {
    const currentUser = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);
    const shouldSendEmail = body.send_email !== false && body.send_email !== '0';

    const target = await db.prepare(`SELECT id, name, email, phone, role FROM users WHERE id = ?`).bind(id).first<any>();
    if (!target || !target.email) {
        return c.json({ ok: false, error: 'Usuário não encontrado.' }, 404);
    }
    if (target.role === 'superadmin' && currentUser.role !== 'superadmin') {
        return c.json({ ok: false, error: 'Apenas um Super Admin pode gerar link de redefinição para outro Super Admin.' }, 403);
    }

    const targetEmail = String(target.email).trim().toLowerCase();
    const displayName = String(target.name || 'Usuário').trim();
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const tokenHash = await sha256Hex(token);

    await db.batch([
        db.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(targetEmail),
        db.prepare(`INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))`).bind(targetEmail, tokenHash)
    ]);

    const baseUrl = (c.env.APP_URL || new URL(c.req.url).origin).replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/redefinir-senha/${token}?email=${encodeURIComponent(targetEmail)}`;

    let emailSent = false;
    let emailError: string | null = null;
    if (shouldSendEmail) {
        try {
            const res = await sendPortalInviteEmail(c.env, targetEmail, displayName, resetUrl);
            emailSent = res.success;
            emailError = res.error || null;
        } catch (err: any) {
            emailError = err?.message || 'Erro ao enviar e-mail';
        }
    }

    const whatsappMessage =
        `Olá, *${displayName}*!\n\n` +
        `Segue o link seguro para definir ou redefinir sua senha de acesso na *GundjaTech*:\n\n` +
        `E-mail: ${targetEmail}\n` +
        `Link de acesso: ${resetUrl}`;

    const phoneDigits = String(target.phone || '').replace(/\D/g, '');
    const whatsappUrl = phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(whatsappMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

    return c.json({
        ok: true,
        email: targetEmail,
        reset_url: resetUrl,
        whatsapp_url: whatsappUrl,
        whatsapp_message: whatsappMessage,
        email_sent: emailSent,
        email_error: emailError,
    });
});

adminRoutes.post('/usuarios/:id/excluir', async (c) => {
    const currentUser = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (!id || id === Number(currentUser.id)) {
        return c.redirect('/admin/usuarios?error=Não é possível excluir a própria conta.');
    }

    const target = await db.prepare(`SELECT id, role FROM users WHERE id = ?`).bind(id).first<{ id: number; role: string }>();
    if (!target) {
        return c.redirect('/admin/usuarios?error=Usuário não encontrado.');
    }
    if (target.role === 'superadmin' && currentUser.role !== 'superadmin') {
        return c.redirect('/admin/usuarios?error=Apenas um Super Admin pode excluir outro Super Admin.');
    }
    if (target.role === 'superadmin') {
        const activeSupers = await db.prepare(`SELECT COUNT(*) as total FROM users WHERE role = 'superadmin' AND is_active = 1`).first<{ total: number }>();
        if ((activeSupers?.total || 0) <= 1) {
            return c.redirect('/admin/usuarios?error=Não é possível excluir o último Super Admin ativo do sistema.');
        }
    }

    try {
        await destroyAllUserSessions(c.env, id);
        await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
    } catch {
        return c.redirect('/admin/usuarios?error=Não foi possível excluir este usuário.');
    }

    return c.redirect('/admin/usuarios?success=Usuário excluído com sucesso.');
});

// ==========================================
// 6. CENTRAL DE ATENDIMENTO CRM & CHAT AO VIVO
// ==========================================
async function loadInboxConversations(db: any, statusFilter: string) {
    let whereSql = `WHERE 1=1`;
    if (statusFilter === 'open') {
        whereSql += ` AND c.status != 'closed'`;
    } else if (statusFilter === 'handoff') {
        whereSql += ` AND c.status != 'closed' AND (c.status = 'waiting_staff' OR c.crm_stage = 'handoff_human')`;
    } else if (statusFilter === 'closed') {
        whereSql += ` AND c.status = 'closed'`;
    }

    let conversations: any[] = [];
    try {
        const res = await db.prepare(
            `SELECT c.*,
                    cl.name AS client_name,
                    cl.email AS client_email,
                    cl.phone AS client_phone,
                    (SELECT m.message FROM conversation_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_preview
             FROM conversations c
             LEFT JOIN clients cl ON cl.id = c.client_id
             ${whereSql}
             ORDER BY CASE WHEN c.status != 'closed' AND (c.status = 'waiting_staff' OR c.crm_stage = 'handoff_human') THEN 0 ELSE 1 END ASC,
                      COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC
             LIMIT 60`
        ).all();
        conversations = res.results || [];
    } catch {
        const fallback = await db.prepare(
            `SELECT * FROM conversations ORDER BY last_message_at DESC, created_at DESC LIMIT 60`
        ).all();
        conversations = fallback.results || [];
    }

    const counts = { all: 0, open: 0, handoff: 0, closed: 0 };
    try {
        const countRow = (await db.prepare(
            `SELECT
                COUNT(*) AS total_all,
                SUM(CASE WHEN status != 'closed' THEN 1 ELSE 0 END) AS total_open,
                SUM(CASE WHEN status != 'closed' AND (status = 'waiting_staff' OR crm_stage = 'handoff_human') THEN 1 ELSE 0 END) AS total_handoff,
                SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS total_closed
             FROM conversations`
        ).first()) as { total_all?: number; total_open?: number; total_handoff?: number; total_closed?: number } | null;
        if (countRow) {
            counts.all = Number(countRow.total_all || 0);
            counts.open = Number(countRow.total_open || 0);
            counts.handoff = Number(countRow.total_handoff || 0);
            counts.closed = Number(countRow.total_closed || 0);
        }
    } catch { }

    return { conversations, counts };
}

adminRoutes.get('/atendimento', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const statusFilter = c.req.query('status') || 'open';
    const activeId = c.req.query('id');

    const { conversations, counts } = await loadInboxConversations(db, statusFilter);

    let activeConversation: any = null;
    let messages: any[] = [];

    if (activeId) {
        try {
            activeConversation = await db.prepare(
                `SELECT c.*, cl.name AS client_name, cl.email AS client_email, cl.phone AS client_phone
                 FROM conversations c
                 LEFT JOIN clients cl ON cl.id = c.client_id
                 WHERE c.id = ?`
            ).bind(activeId).first();
        } catch {
            activeConversation = await db.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(activeId).first();
        }
        if (activeConversation) {
            messages = (await db.prepare(
                `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC`
            ).bind(activeId).all()).results || [];
        }
    } else if (conversations.length > 0) {
        activeConversation = conversations[0];
        messages = (await db.prepare(
            `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC`
        ).bind(activeConversation.id).all()).results || [];
    }

    let linkedRequest: any = null;
    if (activeConversation) {
        try {
            if (activeConversation.client_id) {
                linkedRequest = await db.prepare(
                    `SELECT id, protocol, status, service_title FROM service_requests
                     WHERE client_id = ? AND status != 'cancelled'
                     ORDER BY id DESC LIMIT 1`
                ).bind(activeConversation.client_id).first();
            }
            if (!linkedRequest && activeConversation.visitor_email && !String(activeConversation.visitor_email).endsWith('.local')) {
                linkedRequest = await db.prepare(
                    `SELECT id, protocol, status, service_title FROM service_requests
                     WHERE lower(email) = lower(?) AND status != 'cancelled'
                     ORDER BY id DESC LIMIT 1`
                ).bind(activeConversation.visitor_email).first();
            }
        } catch { }
    }

    return c.html(
        <AdminChatView
            currentUser={user}
            conversations={conversations}
            activeConversation={activeConversation}
            linkedRequest={linkedRequest}
            messages={messages}
            statusFilter={statusFilter}
            counts={counts}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/atendimento/:id/gerar-solicitacao', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const convId = c.req.param('id');

    const conv = await db.prepare(`SELECT * FROM conversations WHERE id = ?`).bind(convId).first<any>();
    if (!conv) {
        return c.redirect('/admin/atendimento?error=Conversa não encontrada.');
    }

    let clientId = conv.client_id ? Number(conv.client_id) : null;
    const visitorName = String(conv.visitor_name || conv.subject || 'Cliente').trim();
    const visitorEmail = String(conv.visitor_email || `lead-${conv.id}@gundjatech.local`).trim().toLowerCase();
    const visitorPhone = String(conv.visitor_phone || '').trim() || null;

    if (!clientId) {
        try {
            const existingClient = (await db.prepare(`SELECT id FROM clients WHERE lower(email) = lower(?)`).bind(visitorEmail).first()) as { id: number } | null;
            if (existingClient?.id) {
                clientId = Number(existingClient.id);
            } else {
                const insClient = await db.prepare(
                    `INSERT INTO clients (name, company, email, phone, status, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                ).bind(visitorName, conv.visitor_company || null, visitorEmail, visitorPhone).run();
                clientId = Number(insClient.meta?.last_row_id || 0) || null;
            }
            if (clientId) {
                await db.prepare(`UPDATE conversations SET client_id = ? WHERE id = ?`).bind(clientId, convId).run();
            }
        } catch { }
    }

    if (clientId) {
        try {
            const existingReq = (await db.prepare(
                `SELECT id FROM service_requests WHERE client_id = ? AND status != 'cancelled' ORDER BY id DESC LIMIT 1`
            ).bind(clientId).first()) as { id: number } | null;
            if (existingReq?.id) {
                return c.redirect(`/admin/solicitacoes/${existingReq.id}?success=${encodeURIComponent('Solicitação vinculada a este atendimento carregada.')}`);
            }
        } catch { }
    }

    let summaryText = String(conv.visitor_objective || conv.subject || 'Atendimento comercial via Inbox').trim();
    try {
        const msgsRes = await db.prepare(
            `SELECT sender_type, message FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 8`
        ).bind(convId).all();
        const clientMsgs = (msgsRes.results || [])
            .filter((m: any) => m.sender_type === 'client' || m.sender_type === 'visitor')
            .map((m: any) => String(m.message || '').trim())
            .filter(Boolean);
        if (clientMsgs.length > 0) {
            summaryText = clientMsgs.join('\n');
        }
    } catch { }

    const prefix = conv.channel === 'whatsapp' ? 'WA' : 'CHAT';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const protocol = `${prefix}-${dateStr}-${rand}`;
    const reqTitle = String(conv.visitor_objective || conv.subject || `Demanda ${conv.channel === 'whatsapp' ? 'WhatsApp' : 'Chat'} • ${visitorName}`).trim();

    const insReq = await db.prepare(
        `INSERT INTO service_requests (protocol, tracking_code, client_id, name, company, email, phone, title, service_title, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzing', datetime('now'), datetime('now'))`
    ).bind(
        protocol,
        protocol,
        clientId,
        visitorName,
        conv.visitor_company || null,
        visitorEmail,
        visitorPhone,
        reqTitle,
        reqTitle,
        summaryText
    ).run();
    const newReqId = Number(insReq.meta?.last_row_id || 0);

    if (newReqId > 0) {
        await recordRequestTimeline(db, {
            serviceRequestId: newReqId,
            userId: user.id,
            action: 'created',
            fromStatus: null,
            toStatus: 'analyzing',
            notes: `Solicitação formalizada a partir do atendimento #${convId} (${conv.channel === 'whatsapp' ? 'WhatsApp Oficial' : 'Chat do Site'})`
        });
        return c.redirect(`/admin/solicitacoes/${newReqId}?success=${encodeURIComponent(`Solicitação ${protocol} gerada! Clique em "Elaborar Orçamento" para enviar a proposta.`)}`);
    }

    return c.redirect('/admin/solicitacoes?success=Solicitação criada a partir do atendimento.');
});

adminRoutes.get('/atendimento/lista', async (c) => {
    const db = c.env.DB;
    const statusFilter = c.req.query('status') || 'open';
    const { conversations, counts } = await loadInboxConversations(db, statusFilter);
    return c.json({ ok: true, conversations, counts });
});

adminRoutes.post('/atendimento/:id/assumir', async (c) => {
    const db = c.env.DB;
    const id = c.req.param('id');

    await db.prepare(
        `UPDATE conversations
         SET status = 'open',
             ai_enabled = 0,
             handoff_at = COALESCE(handoff_at, datetime('now')),
             updated_at = datetime('now')
         WHERE id = ?`
    ).bind(id).run();

    return c.redirect(`/admin/atendimento?id=${id}&success=Atendimento humano assumido com sucesso`);
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

    // Atualiza conversa: se estava aguardando humano, assume para status 'open'
    await db.prepare(
        `UPDATE conversations
         SET status = CASE WHEN status = 'waiting_staff' THEN 'open' ELSE status END,
             ai_enabled = CASE WHEN status = 'waiting_staff' THEN 0 ELSE ai_enabled END,
             last_message_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ?`
    ).bind(id).run();

    // Se a conversa for do canal WhatsApp e a sincronização estiver ativa, entrega a resposta humana no WhatsApp
    try {
        const syncCfg = await db.prepare(
            `SELECT value FROM system_settings WHERE key = 'whatsapp_sync_enabled'`
        ).first<{ value: string }>();
        const syncActive = !syncCfg || syncCfg.value !== '0';

        if (syncActive) {
            const conv = await db.prepare(
                `SELECT channel, visitor_phone FROM conversations WHERE id = ?`
            ).bind(id).first<{ channel?: string; visitor_phone?: string }>();

            if (conv?.channel === 'whatsapp' && conv.visitor_phone) {
                await sendWhatsAppTextMessage(c.env, conv.visitor_phone, message);
            }
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

adminRoutes.post('/atendimento/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        try {
            await db.prepare(`DELETE FROM conversation_messages WHERE conversation_id = ?`).bind(id).run();
            await db.prepare(`DELETE FROM conversations WHERE id = ?`).bind(id).run();
        } catch { }
    }

    const referer = c.req.header('referer') || '';
    const backUrl = referer.includes('/admin/crm-autonomo') ? '/admin/crm-autonomo' : '/admin/atendimento';
    return c.redirect(`${backUrl}?success=Conversa excluída com sucesso.`);
});

// ==========================================
// 7. GESTÃO AVANÇADA DE PROJETOS & ENTREGAS
// ==========================================
adminRoutes.get('/projetos', async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    // Garante que qualquer orçamento aprovado (mesmo criado manualmente) já tenha seu projeto em execução
    await reconcileApprovedQuotationsWithoutProject(db, c.env, user?.id || null);

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
            `INSERT INTO projects (client_id, name, title, slug, description, status, progress_percentage, start_date, expected_end_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'planning', 0, ?, ?, datetime('now'), datetime('now'))`
        ).bind(clientId, title, title, slug, description, startDate, expectedEndDate).run();

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

    let attachments: any[] = [];
    try {
        attachments = (await db.prepare(
            `SELECT a.*, u.name AS uploader_name, u.role AS uploader_role
             FROM project_attachments a
             LEFT JOIN users u ON u.id = a.user_id
             WHERE a.project_id = ?
             ORDER BY a.created_at DESC`
        ).bind(id).all()).results || [];
    } catch {
        attachments = (await db.prepare(
            `SELECT * FROM project_attachments WHERE project_id = ? ORDER BY created_at DESC`
        ).bind(id).all()).results || [];
    }

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
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const status = String(body.status || 'planning').trim();
    const STATUS_DEFAULT_PROGRESS: Record<string, number> = {
        planning: 15,
        in_progress: 50,
        reviewing: 85,
        completed: 100,
        canceled: 0
    };
    const rawProgressStr = String(body.progress_percentage ?? '').trim();
    const startDate = String(body.start_date || '').trim() || null;
    const expectedEndDate = String(body.expected_end_date || '').trim() || null;

    // Busca estado anterior do projeto + dados do cliente para sincronização e notificação
    let previousProject: any = null;
    try {
        previousProject = await db.prepare(
            `SELECT p.id, p.client_id, p.quotation_id, p.service_request_id, p.title, p.name, p.status, p.progress_percentage, c.name AS client_name, c.company AS client_company, c.email AS client_email
             FROM projects p
             LEFT JOIN clients c ON c.id = p.client_id
             WHERE p.id = ?`
        ).bind(id).first<any>();
    } catch {
        try {
            previousProject = await db.prepare(
                `SELECT p.id, p.client_id, p.title, p.name, p.status, p.progress_percentage, c.name AS client_name, c.company AS client_company, c.email AS client_email
                 FROM projects p
                 LEFT JOIN clients c ON c.id = p.client_id
                 WHERE p.id = ?`
            ).bind(id).first<any>();
        } catch { }
    }

    const prevStatus = String(previousProject?.status || '');
    const prevProgress = Number(previousProject?.progress_percentage ?? 0);
    const parsedProgress = rawProgressStr === '' ? NaN : Number(rawProgressStr);
    const statusChanged = Boolean(prevStatus && prevStatus !== status);
    const progress =
        status === 'completed'
            ? 100
            : status === 'canceled'
                ? 0
                : Number.isNaN(parsedProgress) || (statusChanged && parsedProgress === prevProgress)
                    ? (STATUS_DEFAULT_PROGRESS[status] ?? prevProgress)
                    : Math.min(100, Math.max(0, parsedProgress));

    // Trava de Qualidade: impede marcar projeto como Concluído se houver etapas pendentes no cronograma
    if (status === 'completed' && prevStatus !== 'completed') {
        try {
            const stRes = await db.prepare(
                `SELECT status FROM project_stages WHERE project_id = ?`
            ).bind(id).all();
            const allStages = (stRes?.results || []) as Array<{ status: string }>;
            const pendingStages = allStages.filter((s) => s.status !== 'completed');
            if (allStages.length > 0 && pendingStages.length > 0) {
                return c.redirect(
                    `/admin/projetos/${id}?error=${encodeURIComponent(`Trava de Qualidade: Conclua todas as etapas do cronograma (${allStages.length - pendingStages.length}/${allStages.length} concluídas) antes de finalizar o projeto.`)}`
                );
            }
        } catch { }
    }

    const allowedProjectStatuses = new Set(['planning', 'in_progress', 'reviewing', 'completed', 'canceled']);
    if (!allowedProjectStatuses.has(status)) {
        return c.redirect(`/admin/projetos/${id}?error=${encodeURIComponent('Status de projeto inválido.')}`);
    }

    // Se estiver cancelando o projeto, valida Trava Contábil/Fase ANTES de alterar o projeto
    let linkedReqForCompletion: any = null;
    let linkedQuoteForRollback: any = null;
    const projTitle = String(previousProject?.title || previousProject?.name || 'Projeto GundjaTech').trim();
    if (previousProject && previousProject.client_id && prevStatus !== status && status === 'canceled') {
        if (prevStatus === 'completed') {
            return c.redirect(`/admin/projetos/${id}?error=${encodeURIComponent('Trava de Fase: Projetos já concluídos não podem ser cancelados.')}`);
        }
        try {
            if (previousProject.service_request_id) {
                linkedReqForCompletion = await db.prepare(
                    `SELECT id, status, protocol, estimated_budget, client_id FROM service_requests WHERE id = ? LIMIT 1`
                ).bind(previousProject.service_request_id).first<any>();
            }
            if (!linkedReqForCompletion && projTitle) {
                linkedReqForCompletion = await db.prepare(
                    `SELECT id, status, protocol, estimated_budget, client_id FROM service_requests
                     WHERE client_id = ? AND (lower(service_title) = lower(?) OR lower(title) = lower(?))
                     ORDER BY id DESC LIMIT 1`
                ).bind(previousProject.client_id, projTitle, projTitle).first<any>();
            }
            if (previousProject.quotation_id) {
                linkedQuoteForRollback = await db.prepare(`SELECT id, status, reference_code, title FROM quotations WHERE id = ?`).bind(previousProject.quotation_id).first<any>();
            } else if (linkedReqForCompletion?.id) {
                linkedQuoteForRollback = await db.prepare(`SELECT id, status, reference_code, title FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`).bind(linkedReqForCompletion.id).first<any>();
            }
            const rbProj = await rollbackUnfinishedFlow(db, {
                clientId: previousProject.client_id,
                requestId: linkedReqForCompletion?.id || previousProject.service_request_id || null,
                quotationId: linkedQuoteForRollback?.id || previousProject.quotation_id || null,
                projectId: Number(id),
                title: projTitle,
                refs: [linkedReqForCompletion?.protocol, linkedQuoteForRollback?.reference_code]
            });
            if (rbProj.blockedReason) {
                return c.redirect(`/admin/projetos/${id}?error=${encodeURIComponent(rbProj.blockedReason)}`);
            }
        } catch (rbErr) {
            console.error('[POST /projetos/:id] Falha fail-closed ao validar rollback:', rbErr);
            return c.redirect(`/admin/projetos/${id}?error=${encodeURIComponent('Não foi possível validar as travas financeiras. Operação abortada.')}`);
        }
    }

    await db.prepare(
        `UPDATE projects 
         SET status = ?, progress_percentage = ?, start_date = ?, expected_end_date = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(status, progress, startDate, expectedEndDate, id).run();

    // Sincroniza Projeto -> Solicitação & Orçamento vinculados (avanço ou cancelamento/retorno de fase)
    if (previousProject && previousProject.client_id && prevStatus !== status && (status === 'in_progress' || status === 'completed' || status === 'canceled')) {
        try {
            if (!linkedReqForCompletion && previousProject.service_request_id) {
                linkedReqForCompletion = await db.prepare(
                    `SELECT id, status, protocol, estimated_budget, client_id FROM service_requests WHERE id = ? LIMIT 1`
                ).bind(previousProject.service_request_id).first<any>();
            }
            if (!linkedReqForCompletion && projTitle) {
                linkedReqForCompletion = await db.prepare(
                    `SELECT id, status, protocol, estimated_budget, client_id FROM service_requests
                     WHERE client_id = ? AND (lower(service_title) = lower(?) OR lower(title) = lower(?))
                     ORDER BY id DESC LIMIT 1`
                ).bind(previousProject.client_id, projTitle, projTitle).first<any>();
            }

            if (status === 'canceled') {
                if (linkedQuoteForRollback && linkedQuoteForRollback.status === 'approved') {
                    await db.prepare(`UPDATE quotations SET status = 'sent', updated_at = datetime('now') WHERE id = ?`).bind(linkedQuoteForRollback.id).run();
                }
                const targetReqStatus = linkedQuoteForRollback ? 'quotation_sent' : 'analyzing';
                if (linkedReqForCompletion && linkedReqForCompletion.status !== targetReqStatus) {
                    const prevLinkedReqSt = String(linkedReqForCompletion.status || '');
                    await db.prepare(
                        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(targetReqStatus, linkedReqForCompletion.id).run();
                    await recordRequestTimeline(db, {
                        serviceRequestId: linkedReqForCompletion.id,
                        userId: user.id,
                        action: 'status_change',
                        fromStatus: prevLinkedReqSt,
                        toStatus: targetReqStatus,
                        notes: `Projeto #${id} cancelado — fatura em aberto cancelada e solicitação retornou para ${targetReqStatus === 'quotation_sent' ? 'Orçamento Enviado' : 'Em Análise'}`
                    });
                }
            } else if (linkedReqForCompletion && linkedReqForCompletion.status !== status) {
                const prevLinkedReqSt = String(linkedReqForCompletion.status || '');
                await db.prepare(
                    `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
                ).bind(status, linkedReqForCompletion.id).run();

                await recordRequestTimeline(db, {
                    serviceRequestId: linkedReqForCompletion.id,
                    userId: user.id,
                    action: status === 'completed' ? 'project_completed' : 'project_in_progress',
                    fromStatus: prevLinkedReqSt,
                    toStatus: status,
                    notes: status === 'completed'
                        ? `Projeto #${id} concluído e entregue — Receita lançada automaticamente em Receita & Caixa`
                        : `Projeto #${id} iniciado — em execução pela equipe GundjaTech`,
                });
            }
        } catch { }
    }

    // Quando o projeto é concluído, lança automaticamente a receita do orçamento aprovado em Receita & Caixa (/admin/financeiro)
    if (status === 'completed' && prevStatus !== 'completed') {
        await autoRegisterRevenueOnProjectCompletion(db, {
            projectId: id,
            clientId: previousProject?.client_id ? Number(previousProject.client_id) : null,
            projectTitle: projTitle,
            linkedReq: linkedReqForCompletion
        });
    }

    // Se acabou de ser marcado como concluído, notifica o cliente por e-mail
    if (status === 'completed' && previousProject && prevStatus !== 'completed') {
        if (previousProject.client_email && !String(previousProject.client_email).endsWith('.local')) {
            try {
                await sendProjectCompletedEmail(
                    c.env,
                    String(previousProject.client_email).trim(),
                    String(previousProject.client_company || previousProject.client_name || 'Cliente').trim(),
                    {
                        id: Number(id),
                        title: projTitle
                    }
                );
            } catch { }
        }
        return c.redirect(
            `/admin/projetos/${id}?success=${encodeURIComponent('Projeto concluído! Solicitação finalizada e receita lançada automaticamente em Receita & Caixa.')}`
        );
    }

    // Se o projeto foi cancelado e o cliente não possui outros serviços ativos, revoga o usuário do Portal
    if (status === 'canceled' && previousProject?.client_id) {
        try {
            await autoRevokeIdlePortalUser(db, c.env, Number(previousProject.client_id));
        } catch { }
    }

    return c.redirect(`/admin/projetos/${id}?success=Projeto atualizado com sucesso`);
});

adminRoutes.post('/projetos/:id/excluir', async (c) => {
    const user = c.get('user');
    if (!user || !hasPermission(user.role, 'projects.delete', user.effectivePermissions)) {
        return c.json({ error: 'Forbidden', message: 'Apenas perfis autorizados (Diretoria / Admin) podem excluir projetos.' }, 403);
    }

    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        const res = await deleteLinkedCommercialFlow(db, c.env, { projectId: id });
        if (res.blockedReason) {
            return c.redirect(`/admin/projetos?error=${encodeURIComponent(res.blockedReason)}`);
        }
    }

    return c.redirect('/admin/projetos?success=Projeto e vínculos (solicitação, orçamento e faturas em aberto) excluídos com sucesso.');
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

    // Recalcula automaticamente o progresso e a fase do projeto com base nas etapas concluídas
    try {
        const stagesRes = await db.prepare(
            `SELECT status FROM project_stages WHERE project_id = ?`
        ).bind(id).all();
        const allStages = (stagesRes?.results || []) as Array<{ status: string }>;
        if (allStages.length > 0) {
            const doneCount = allStages.filter((s) => s.status === 'completed').length;
            const totalCount = allStages.length;
            let autoStatus = 'in_progress';
            let autoProgress = 50;

            if (doneCount === 0) {
                autoStatus = 'planning';
                autoProgress = 15;
            } else if (doneCount === totalCount) {
                autoStatus = 'reviewing';
                autoProgress = 95;
            } else {
                autoProgress = Math.max(25, Math.min(85, Math.round((doneCount / totalCount) * 80) + 10));
                autoStatus = doneCount >= totalCount - 1 ? 'reviewing' : 'in_progress';
            }

            const projRow = (await db.prepare(`SELECT status, start_date, expected_end_date FROM projects WHERE id = ?`).bind(id).first()) as any;
            if (!projRow || projRow.status !== 'completed') {
                await db.prepare(
                    `UPDATE projects
                     SET status = ?, progress_percentage = ?, start_date = ?, expected_end_date = ?, updated_at = datetime('now')
                     WHERE id = ?`
                ).bind(autoStatus, autoProgress, projRow?.start_date || null, projRow?.expected_end_date || null, id).run();
            }
        }
    } catch { }

    return c.redirect(`/admin/projetos/${id}?success=Status da etapa e progresso do projeto atualizados`);
});

adminRoutes.post('/projetos/:id/anexos', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const projectId = Number(c.req.param('id'));

    const project = await db.prepare(`SELECT id FROM projects WHERE id = ?`).bind(projectId).first();
    if (!project) {
        return c.redirect('/admin/projetos?error=Projeto não encontrado');
    }

    try {
        const formData = await c.req.formData();
        const fileEntry = formData.get('file');
        const isClientVisible = formData.get('is_client_visible') ? 1 : 0;

        if (!fileEntry || typeof fileEntry === 'string' || !('arrayBuffer' in fileEntry)) {
            return c.redirect(`/admin/projetos/${projectId}?error=Selecione um arquivo válido para enviar.`);
        }

        const file = fileEntry as File;
        const maxSize = 15 * 1024 * 1024;
        if (file.size <= 0 || file.size > maxSize) {
            return c.redirect(`/admin/projetos/${projectId}?error=Arquivo inválido ou maior que 15 MB.`);
        }

        const originalName = String(file.name || 'documento').trim();
        const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';
        const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt', 'csv'];
        if (ext && !allowedExts.includes(ext)) {
            return c.redirect(`/admin/projetos/${projectId}?error=Formato de arquivo não permitido (.${ext}).`);
        }

        const safeBase = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 100);
        const storageKey = `private/projects/${projectId}/${Date.now()}_${safeBase}`;
        const mimeType = file.type || 'application/octet-stream';

        if (c.env?.UPLOADS_BUCKET) {
            const buf = await file.arrayBuffer();
            await c.env.UPLOADS_BUCKET.put(storageKey, buf, {
                httpMetadata: { contentType: mimeType }
            });
        }

        await db.prepare(
            `INSERT INTO project_attachments (project_id, user_id, file_name, file_path, file_size, mime_type, is_client_visible, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(projectId, user.id, originalName, storageKey, file.size, mimeType, isClientVisible).run();

        return c.redirect(`/admin/projetos/${projectId}?success=Anexo enviado com sucesso!`);
    } catch (err: any) {
        return c.redirect(`/admin/projetos/${projectId}?error=${encodeURIComponent(err?.message || 'Erro ao enviar anexo')}`);
    }
});

adminRoutes.get('/projetos/:id/anexos/:attId', async (c) => {
    const db = c.env.DB;
    const projectId = Number(c.req.param('id'));
    const attId = Number(c.req.param('attId'));

    const att = (await db.prepare(
        `SELECT * FROM project_attachments WHERE id = ? AND project_id = ?`
    ).bind(attId, projectId).first()) as any;

    if (!att) {
        return c.text('Anexo não encontrado.', 404);
    }

    const rawPath = String(att.file_path || '').trim();
    const storageKey = rawPath.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
    if (!c.env?.UPLOADS_BUCKET || !storageKey) {
        return c.text('Armazenamento indisponível.', 404);
    }

    const obj = await c.env.UPLOADS_BUCKET.get(storageKey);
    if (!obj) {
        return c.text('Arquivo não encontrado no armazenamento.', 404);
    }

    const safeFileName = String(att.file_name || 'anexo').replace(/["\r\n]/g, '');
    return new Response(obj.body, {
        status: 200,
        headers: {
            'Content-Type': att.mime_type || obj.httpMetadata?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${safeFileName}"`
        }
    });
});

adminRoutes.post('/projetos/:id/anexos/:attId/excluir', async (c) => {
    const db = c.env.DB;
    const projectId = Number(c.req.param('id'));
    const attId = Number(c.req.param('attId'));

    try {
        const att = (await db.prepare(
            `SELECT file_path FROM project_attachments WHERE id = ? AND project_id = ?`
        ).bind(attId, projectId).first()) as { file_path?: string } | null;

        if (att?.file_path && c.env?.UPLOADS_BUCKET) {
            const storageKey = String(att.file_path).replace(/^\/?uploads\//, '').replace(/^\/+/, '');
            try { await c.env.UPLOADS_BUCKET.delete(storageKey); } catch { }
        }
        await db.prepare(`DELETE FROM project_attachments WHERE id = ? AND project_id = ?`).bind(attId, projectId).run();
    } catch { }

    return c.redirect(`/admin/projetos/${projectId}?success=Anexo excluído com sucesso.`);
});

// ==========================================
// 8-10. FINANCEIRO, DOMÍNIOS & CAMPANHAS (Modularizados em src/routes/admin/*)
// ==========================================
adminRoutes.route('/', createAdminFinanceRoutes({ autoRevokeIdlePortalUser }));
adminRoutes.route('/', adminDomainsRoutes);
adminRoutes.route('/', adminCampaignsRoutes);

// ==========================================
// 11. ORÇAMENTOS & PROPOSTAS COMERCIAIS
// ==========================================
adminRoutes.get('/orcamentos', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);
    const search = (c.req.query('search') || '').trim();
    const statusFilter = (c.req.query('status') || '').trim();

    let query = `
        SELECT q.*, cl.name as client_name, cl.company, cl.email as client_email
        FROM quotations q
        LEFT JOIN clients cl ON q.client_id = cl.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
        query += ` AND (q.reference_code LIKE ? OR q.title LIKE ? OR cl.name LIKE ? OR cl.company LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }
    if (statusFilter) {
        query += ` AND q.status = ?`;
        params.push(statusFilter);
    }
    query += ` ORDER BY q.id DESC`;

    let quotations: any[] = [];
    let clients: any[] = [];
    try {
        const res = await db.prepare(query).bind(...params).all();
        quotations = res.results || [];
    } catch { }

    try {
        const clientsRes = await db.prepare('SELECT id, name, company FROM clients ORDER BY name ASC').all();
        clients = clientsRes.results || [];
    } catch { }

    return c.html(
        <AdminQuotationsView
            currentUser={user}
            quotations={quotations}
            clients={clients}
            search={search}
            statusFilter={statusFilter}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.get('/orcamentos/novo', (c) => c.redirect('/admin/orcamentos'));

adminRoutes.post('/orcamentos', async (c) => {
    const db = c.env.DB;
    const body = await c.req.parseBody();
    const clientId = Number(body['client_id'] || 0);
    const title = String(body['title'] || '').trim();
    const totalAmount = Math.max(0, Number(body['total_amount'] || 0));
    const discountAmount = Math.max(0, Number(body['discount_amount'] || 0));
    const finalAmount = Math.max(0, totalAmount - discountAmount);
    const statusRaw = String(body['status'] || 'draft').trim();
    const allowedStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];
    const status = allowedStatuses.includes(statusRaw) ? statusRaw : 'draft';
    const expiresAt = String(body['expires_at'] || '').trim() || null;
    const notes = String(body['notes'] || '').trim() || null;

    if (!clientId || !title) {
        return c.redirect('/admin/orcamentos?error=Selecione um cliente e informe o título da proposta.');
    }

    const now = new Date();
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referenceCode = `ORC-${ymd}-${rand}`;

    const result = await db.prepare(
        `INSERT INTO quotations (client_id, title, reference_code, total_amount, discount_amount, final_amount, status, expires_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(clientId, title, referenceCode, totalAmount, discountAmount, finalAmount, status, expiresAt, notes).run();

    const newId = Number(result.meta?.last_row_id || 0);
    const createdQuoteObj = {
        id: newId,
        client_id: clientId,
        service_request_id: null as number | null,
        title,
        reference_code: referenceCode,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status,
        notes
    };

    // Todo orçamento manual gera e vincula automaticamente sua Solicitação (service_requests) no pipeline
    let linkedReqRow: any = null;
    if (newId > 0) {
        try {
            linkedReqRow = await ensureRequestForManualQuotation(db, (c.get('user') as any)?.id || null, createdQuoteObj);
        } catch { }
    }

    if (status === 'sent') {
        try {
            await autoProvisionPortalUserForClient(db, c.env, {
                clientId,
                promoteActive: false,
                sendInviteEmail: true,
                baseUrl: new URL(c.req.url).origin
            });
        } catch { }
    } else if (status === 'approved') {
        try {
            await autoStartProjectFromApprovedRequest(db, c.env, (c.get('user') as any)?.id || null, {
                request: linkedReqRow,
                quotation: createdQuoteObj,
                approvalNote: `Orçamento ${referenceCode} criado já aprovado`
            });
        } catch { }
    }

    if (newId) {
        return c.redirect(`/admin/orcamentos/${newId}?success=Orçamento ${encodeURIComponent(referenceCode)} criado com sucesso!`);
    }
    return c.redirect('/admin/orcamentos?success=Orçamento criado com sucesso!');
});

adminRoutes.get('/orcamentos/:id', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const { successMessage, errorMessage } = getFlashMessages(c);

    if (!id) {
        return c.redirect('/admin/orcamentos');
    }

    const quotationDetail = await db.prepare(
        `SELECT q.*, cl.name as client_name, cl.company, cl.email as client_email, cl.phone as client_phone, cl.user_id as client_user_id,
                (SELECT u.is_active FROM users u WHERE u.id = cl.user_id OR (cl.email IS NOT NULL AND cl.email != '' AND lower(u.email) = lower(cl.email)) LIMIT 1) as portal_user_active
         FROM quotations q
         LEFT JOIN clients cl ON q.client_id = cl.id
         WHERE q.id = ?`
    ).bind(id).first<any>();

    if (!quotationDetail) {
        return c.redirect('/admin/orcamentos?error=Orçamento não encontrado.');
    }

    // Se o orçamento já está Enviado ou Aprovado e o cliente possui e-mail válido, mas ainda não tem usuário ativo,
    // provisiona automaticamente ao abrir a tela para que o status "Usuário Ativo" esteja sempre sincronizado
    if (
        (quotationDetail.status === 'sent' || quotationDetail.status === 'approved') &&
        Number(quotationDetail.portal_user_active) !== 1 &&
        quotationDetail.client_id &&
        quotationDetail.client_email &&
        !String(quotationDetail.client_email).endsWith('.local')
    ) {
        try {
            const prov = await autoProvisionPortalUserForClient(db, c.env, {
                clientId: Number(quotationDetail.client_id),
                promoteActive: quotationDetail.status === 'approved',
                sendInviteEmail: false,
                baseUrl: new URL(c.req.url).origin
            });
            if (prov.provisioned) {
                quotationDetail.portal_user_active = 1;
            }
        } catch { }
    }

    let linkedRequest: any = null;
    if (!quotationDetail.service_request_id && quotationDetail.client_id) {
        try {
            linkedRequest = await ensureRequestForManualQuotation(db, user?.id || null, quotationDetail);
        } catch { }
    } else if (quotationDetail.service_request_id) {
        try {
            linkedRequest = await db.prepare(
                `SELECT id, protocol, service_title, title, status FROM service_requests WHERE id = ?`
            ).bind(quotationDetail.service_request_id).first();
        } catch { }
    }

    let linkedProject: any = null;
    try {
        if (quotationDetail.status === 'approved') {
            await reconcileApprovedQuotationsWithoutProject(db, c.env, user?.id || null, quotationDetail.id);
        }
        const qTitle = String(quotationDetail.title || linkedRequest?.service_title || linkedRequest?.title || '').trim();
        if (quotationDetail.client_id && qTitle) {
            linkedProject = await db.prepare(
                `SELECT id, title, name, status, progress_percentage FROM projects
                 WHERE client_id = ? AND (lower(title) = lower(?) OR lower(name) = lower(?))
                 ORDER BY id DESC LIMIT 1`
            ).bind(quotationDetail.client_id, qTitle, qTitle).first();
        }
    } catch { }

    return c.html(
        <AdminQuotationsView
            currentUser={user}
            quotationDetail={quotationDetail}
            linkedRequest={linkedRequest}
            linkedProject={linkedProject}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/orcamentos/:id', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await c.req.parseBody();

    const title = String(body['title'] || '').trim();
    const totalAmount = Math.max(0, Number(body['total_amount'] || 0));
    const discountAmount = Math.max(0, Number(body['discount_amount'] || 0));
    const finalAmount = Math.max(0, totalAmount - discountAmount);
    const statusRaw = String(body['status'] || 'draft').trim();
    const allowedStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];
    const status = allowedStatuses.includes(statusRaw) ? statusRaw : 'draft';
    const expiresAt = String(body['expires_at'] || '').trim() || null;
    const notes = String(body['notes'] || '').trim() || null;
    const clientEmailInput = String(body['client_email'] || '').trim().toLowerCase() || null;

    if (!title) {
        return c.redirect(`/admin/orcamentos/${id}?error=O título da proposta é obrigatório.`);
    }

    if ((status === 'sent' || status === 'approved') && finalAmount <= 0) {
        return c.redirect(
            `/admin/orcamentos/${id}?error=${encodeURIComponent('Trava Comercial: Informe um valor líquido maior que R$ 0,00 antes de enviar ou aprovar o orçamento.')}`
        );
    }

    const prevQuote = await db.prepare(`SELECT * FROM quotations WHERE id = ?`).bind(id).first<any>();

    // Se o administrador informou/atualizou o e-mail real do cliente no orçamento, sincroniza no cadastro do cliente e solicitação
    if (clientEmailInput && clientEmailInput.includes('@') && !clientEmailInput.endsWith('.local')) {
        if (prevQuote?.client_id) {
            try {
                await db.prepare(`UPDATE clients SET email = ?, updated_at = datetime('now') WHERE id = ?`).bind(clientEmailInput, prevQuote.client_id).run();
            } catch { }
        }
        if (prevQuote?.service_request_id) {
            try {
                await db.prepare(`UPDATE service_requests SET email = ?, updated_at = datetime('now') WHERE id = ?`).bind(clientEmailInput, prevQuote.service_request_id).run();
            } catch { }
        }
    }

    // Trava de Segurança & Portal: ao enviar o orçamento ao cliente (sent) ou aprovar (approved),
    // exige que o cliente possua um e-mail real válido (não .local) para liberar o acesso ao Portal
    if ((status === 'sent' || status === 'approved') && prevQuote?.client_id) {
        try {
            const clRow = (await db.prepare(`SELECT email FROM clients WHERE id = ?`).bind(prevQuote.client_id).first()) as { email?: string } | null;
            const effectiveEmail = String(clientEmailInput || clRow?.email || '').trim().toLowerCase();
            if (clRow && (!effectiveEmail || !effectiveEmail.includes('@') || effectiveEmail.endsWith('.local'))) {
                return c.redirect(
                    `/admin/orcamentos/${id}?error=${encodeURIComponent('Trava de Portal: Este cliente veio do WhatsApp sem e-mail real cadastrado. Informe o e-mail corporativo/pessoal do cliente no campo "E-mail do Cliente para Acesso ao Portal" antes de enviar o orçamento.')}`
                );
            }
        } catch { }
    }

    await db.prepare(
        `UPDATE quotations
         SET title = ?, total_amount = ?, discount_amount = ?, final_amount = ?, status = ?, expires_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
    ).bind(title, totalAmount, discountAmount, finalAmount, status, expiresAt, notes, id).run();

    // Provisionamento ou Revogação Automática do Usuário do Portal conforme a fase do orçamento
    if (prevQuote?.client_id) {
        if (status === 'sent') {
            try {
                await autoProvisionPortalUserForClient(db, c.env, {
                    clientId: Number(prevQuote.client_id),
                    overrideEmail: clientEmailInput,
                    promoteActive: false,
                    sendInviteEmail: true,
                    baseUrl: new URL(c.req.url).origin
                });
            } catch { }
        } else if (status === 'rejected' || status === 'expired') {
            try {
                await autoRevokeIdlePortalUser(db, c.env, Number(prevQuote.client_id));
            } catch { }
        }
    }

    const updatedQuote = {
        ...(prevQuote || {}),
        id,
        title,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status,
        expires_at: expiresAt,
        notes
    };

    // Garante que qualquer orçamento manual sem service_request_id tenha sua Solicitação vinculada
    if (!updatedQuote.service_request_id && updatedQuote.client_id) {
        try {
            await ensureRequestForManualQuotation(db, user.id, updatedQuote);
        } catch { }
    }

    // Sincroniza solicitação vinculada quando o status do orçamento muda pelo formulário de edição
    if (updatedQuote.service_request_id) {
        try {
            const reqRow = await db.prepare(`SELECT * FROM service_requests WHERE id = ?`).bind(updatedQuote.service_request_id).first<any>();
            if (reqRow) {
                if (status === 'approved') {
                    await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
                        request: reqRow,
                        quotation: updatedQuote,
                        approvalNote: `Orçamento ${updatedQuote.reference_code || `#${id}`} aprovado — projeto iniciado automaticamente`
                    });
                    return c.redirect(`/admin/orcamentos/${id}?success=${encodeURIComponent('Proposta aprovada! Projeto criado automaticamente e solicitação movida para Em Execução.')}`);
                } else if (status === 'sent' && reqRow.status !== 'quotation_sent') {
                    const rb = await rollbackUnfinishedFlow(db, {
                        clientId: updatedQuote.client_id || reqRow.client_id,
                        requestId: reqRow.id,
                        quotationId: Number(id),
                        title: String(updatedQuote.title || reqRow.service_title || reqRow.title || '').trim(),
                        refs: [reqRow.protocol, updatedQuote.reference_code]
                    });
                    if (rb.blockedReason) {
                        await db.prepare(`UPDATE quotations SET status = 'approved', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
                        return c.redirect(`/admin/orcamentos/${id}?error=${encodeURIComponent(rb.blockedReason)}`);
                    }
                    await db.prepare(`UPDATE service_requests SET status = 'quotation_sent', estimated_budget = ?, updated_at = datetime('now') WHERE id = ?`).bind(finalAmount, reqRow.id).run();
                    await recordRequestTimeline(db, {
                        serviceRequestId: reqRow.id,
                        userId: user.id,
                        action: 'quotation_sent',
                        fromStatus: reqRow.status,
                        toStatus: 'quotation_sent',
                        notes: `Orçamento ${updatedQuote.reference_code || `#${id}`} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalAmount)}) enviado ao cliente`
                    });
                } else if (status === 'rejected' && reqRow.status !== 'analyzing') {
                    const rb = await rollbackUnfinishedFlow(db, {
                        clientId: updatedQuote.client_id || reqRow.client_id,
                        requestId: reqRow.id,
                        quotationId: Number(id),
                        title: String(updatedQuote.title || reqRow.service_title || reqRow.title || '').trim(),
                        refs: [reqRow.protocol, updatedQuote.reference_code]
                    });
                    if (rb.blockedReason) {
                        await db.prepare(`UPDATE quotations SET status = 'approved', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
                        return c.redirect(`/admin/orcamentos/${id}?error=${encodeURIComponent(rb.blockedReason)}`);
                    }
                    await db.prepare(`UPDATE service_requests SET status = 'analyzing', updated_at = datetime('now') WHERE id = ?`).bind(reqRow.id).run();
                    await recordRequestTimeline(db, {
                        serviceRequestId: reqRow.id,
                        userId: user.id,
                        action: 'quotation_rejected',
                        fromStatus: reqRow.status,
                        toStatus: 'analyzing',
                        notes: `Orçamento ${updatedQuote.reference_code || `#${id}`} recusado — retornou para análise`
                    });
                } else if ((status === 'draft' || status === 'expired') && reqRow.status !== 'analyzing' && reqRow.status !== 'new') {
                    const rb = await rollbackUnfinishedFlow(db, {
                        clientId: updatedQuote.client_id || reqRow.client_id,
                        requestId: reqRow.id,
                        quotationId: Number(id),
                        title: String(updatedQuote.title || reqRow.service_title || reqRow.title || '').trim(),
                        refs: [reqRow.protocol, updatedQuote.reference_code]
                    });
                    if (rb.blockedReason) {
                        await db.prepare(`UPDATE quotations SET status = 'approved', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
                        return c.redirect(`/admin/orcamentos/${id}?error=${encodeURIComponent(rb.blockedReason)}`);
                    }
                    await db.prepare(`UPDATE service_requests SET status = 'analyzing', estimated_budget = ?, updated_at = datetime('now') WHERE id = ?`).bind(finalAmount, reqRow.id).run();
                    await recordRequestTimeline(db, {
                        serviceRequestId: reqRow.id,
                        userId: user.id,
                        action: 'status_change',
                        fromStatus: reqRow.status,
                        toStatus: 'analyzing',
                        notes: `Orçamento ${updatedQuote.reference_code || `#${id}`} voltou para ${status === 'draft' ? 'rascunho' : 'expirado'} — solicitação retornou para análise`
                    });
                } else {
                    await db.prepare(`UPDATE service_requests SET estimated_budget = ?, updated_at = datetime('now') WHERE id = ?`).bind(finalAmount, reqRow.id).run();
                }
            }
        } catch { }
    } else if (status === 'approved') {
        await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
            quotation: updatedQuote,
            approvalNote: `Orçamento ${updatedQuote.reference_code || `#${id}`} aprovado`
        });
        return c.redirect(`/admin/orcamentos/${id}?success=${encodeURIComponent('Proposta aprovada e Projeto criado automaticamente!')}`);
    }

    return c.redirect(`/admin/orcamentos/${id}?success=Proposta atualizada com sucesso!`);
});

adminRoutes.post('/orcamentos/:id/status', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await c.req.parseBody();
    const status = String(body['status'] || '').trim();
    const allowedStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired'];

    if (!allowedStatuses.includes(status)) {
        return c.redirect(`/admin/orcamentos/${id}?error=Status inválido.`);
    }

    const quotation = await db.prepare('SELECT * FROM quotations WHERE id = ?').bind(id).first<any>();
    if (quotation && !quotation.service_request_id && quotation.client_id) {
        try {
            await ensureRequestForManualQuotation(db, user.id, quotation);
        } catch { }
    }

    const referer = c.req.header('referer') || '';
    const backUrl = referer.includes(`/admin/solicitacoes/`) && quotation?.service_request_id
        ? `/admin/solicitacoes/${quotation.service_request_id}`
        : referer.includes(`/admin/orcamentos/${id}`)
            ? `/admin/orcamentos/${id}`
            : '/admin/orcamentos';

    if (status === 'sent' || status === 'approved') {
        const quoteFinalAmt = Number(quotation?.final_amount ?? quotation?.total_amount ?? 0);
        if (quoteFinalAmt <= 0) {
            return c.redirect(
                `/admin/orcamentos/${id}?error=${encodeURIComponent('Trava Comercial: Defina um valor maior que R$ 0,00 na proposta antes de enviá-la ou aprová-la.')}`
            );
        }

        if (quotation?.client_id) {
            try {
                const clRow = (await db.prepare(`SELECT email FROM clients WHERE id = ?`).bind(quotation.client_id).first()) as { email?: string } | null;
                const effectiveEmail = String(clRow?.email || '').trim().toLowerCase();
                if (clRow && (!effectiveEmail || !effectiveEmail.includes('@') || effectiveEmail.endsWith('.local'))) {
                    return c.redirect(
                        `/admin/orcamentos/${id}?error=${encodeURIComponent('Trava de Portal: Informe o e-mail real do cliente no orçamento antes de enviá-lo para liberar o acesso ao Portal do Cliente.')}`
                    );
                }
            } catch { }
        }
    }

    await db.prepare(
        `UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(status, id).run();

    if (quotation?.client_id) {
        if (status === 'sent') {
            try {
                await autoProvisionPortalUserForClient(db, c.env, {
                    clientId: Number(quotation.client_id),
                    promoteActive: false,
                    sendInviteEmail: true,
                    baseUrl: new URL(c.req.url).origin
                });
            } catch { }
        } else if (status === 'rejected' || status === 'expired') {
            try {
                await autoRevokeIdlePortalUser(db, c.env, Number(quotation.client_id));
            } catch { }
        }
    }

    // Quando o orçamento é aprovado: cria o Projeto automaticamente e avança a Solicitação para Em Execução!
    if (status === 'approved') {
        let reqRow: any = null;
        if (quotation?.service_request_id) {
            try {
                reqRow = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(quotation.service_request_id).first<any>();
            } catch { }
        }
        await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
            request: reqRow,
            quotation: { ...(quotation || {}), id, status: 'approved' },
            approvalNote: `Orçamento ${quotation?.reference_code || `#${id}`} aprovado pela administração`
        });
        return c.redirect(`${backUrl}?success=${encodeURIComponent('Orçamento aprovado! O Projeto foi criado e iniciado automaticamente.')}`);
    }

    // Sincroniza Orçamento -> Solicitação & Projeto vinculado (avanço ou retorno de fase)
    if (quotation?.service_request_id) {
        const mappedReqStatus: Record<string, { status: string; note: string }> = {
            draft: { status: 'analyzing', note: `Orçamento ${quotation.reference_code || `#${id}`} retornou para rascunho — solicitação voltou para análise` },
            sent: { status: 'quotation_sent', note: `Orçamento ${quotation.reference_code || `#${id}`} enviado ao cliente` },
            rejected: { status: 'analyzing', note: `Orçamento ${quotation.reference_code || `#${id}`} recusado — retornou para análise` },
            expired: { status: 'analyzing', note: `Orçamento ${quotation.reference_code || `#${id}`} expirado — retornou para análise` },
        };
        const sync = mappedReqStatus[status];
        if (sync) {
            const rb = await rollbackUnfinishedFlow(db, {
                clientId: quotation.client_id,
                requestId: quotation.service_request_id,
                quotationId: Number(id),
                title: String(quotation.title || '').trim(),
                refs: [quotation.reference_code]
            });
            if (rb.blockedReason) {
                await db.prepare(`UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
                    .bind(quotation.status || 'approved', id).run();
                return c.redirect(`${backUrl}?error=${encodeURIComponent(rb.blockedReason)}`);
            }
            try {
                const reqRow = await db.prepare('SELECT id, status FROM service_requests WHERE id = ?').bind(quotation.service_request_id).first<{ id: number; status: string }>();
                if (reqRow && reqRow.status !== sync.status) {
                    await db.prepare(
                        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(sync.status, reqRow.id).run();

                    await recordRequestTimeline(db, {
                        serviceRequestId: reqRow.id,
                        userId: user.id,
                        action: `quotation_${status}`,
                        fromStatus: reqRow.status,
                        toStatus: sync.status,
                        notes: sync.note,
                    });
                }
            } catch { }
        }
    }

    const labels: Record<string, string> = {
        draft: 'Rascunho',
        sent: 'Enviado ao cliente',
        approved: 'Aprovado',
        rejected: 'Recusado',
        expired: 'Expirado'
    };

    return c.redirect(`${backUrl}?success=Status atualizado para ${encodeURIComponent(labels[status] || status)}!`);
});

adminRoutes.post('/orcamentos/:id/converter-projeto', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    const quotation = await db.prepare('SELECT * FROM quotations WHERE id = ?').bind(id).first<any>();
    if (quotation && !quotation.service_request_id && quotation.client_id) {
        try {
            await ensureRequestForManualQuotation(db, user.id, quotation);
        } catch { }
    }
    if (!quotation) {
        return c.redirect('/admin/orcamentos?error=Orçamento não encontrado.');
    }

    if (quotation.status !== 'approved') {
        return c.redirect(`/admin/orcamentos/${id}?error=${encodeURIComponent('Só é possível iniciar o projeto após a aprovação do orçamento.')}`);
    }

    let reqRow: any = null;
    if (quotation.service_request_id) {
        try {
            reqRow = await db.prepare('SELECT * FROM service_requests WHERE id = ?').bind(quotation.service_request_id).first<any>();
        } catch { }
    }

    await autoStartProjectFromApprovedRequest(db, c.env, user.id, {
        request: reqRow,
        quotation,
        approvalNote: `Orçamento ${quotation.reference_code || `#${id}`} convertido em Projeto pela administração`
    });

    return c.redirect('/admin/projetos?success=Projeto iniciado com sucesso a partir do orçamento aprovado!');
});

adminRoutes.post('/orcamentos/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    if (id > 0) {
        const res = await deleteLinkedCommercialFlow(db, c.env, { quotationId: id });
        if (res.blockedReason) {
            return c.redirect(`/admin/orcamentos?error=${encodeURIComponent(res.blockedReason)}`);
        }
    }
    return c.redirect('/admin/orcamentos?success=Orçamento e vínculos (solicitação e faturas em aberto) excluídos com sucesso.');
});

// ==========================================
// GESTÃO DE ACESSOS & PERMISSÕES (RBAC DINÂMICO)
// ==========================================
adminRoutes.get('/permissoes', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const { successMessage, errorMessage } = getFlashMessages(c);

    const tabParam = c.req.query('tab') === 'users' ? 'users' : 'roles';
    const validRoleKeys = CONFIGURABLE_STAFF_ROLES.map((r) => r.key);
    const roleParam = (c.req.query('role') || 'manager') as UserRole;
    const selectedRole: UserRole = validRoleKeys.includes(roleParam) ? roleParam : 'manager';
    const selectedUserId = Number(c.req.query('user_id') || 0) || null;

    const [rbacConfig, staffRes] = await Promise.all([
        loadDynamicRbacConfig(db),
        db.prepare(
            `SELECT id, name, email, role, is_active
             FROM users
             WHERE role != 'client'
             ORDER BY name ASC`
        ).all()
    ]);

    return c.html(
        <AdminPermissionsView
            currentUser={user}
            staffUsers={staffRes.results || []}
            rbacConfig={rbacConfig}
            selectedTab={tabParam}
            selectedRole={selectedRole}
            selectedUserId={selectedUserId}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/permissoes/cargo', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const body = await c.req.parseBody({ all: true });
    const role = String(body.role || '').trim() as UserRole;
    const validRoleKeys = CONFIGURABLE_STAFF_ROLES.map((r) => r.key);

    if (!validRoleKeys.includes(role)) {
        return c.redirect('/admin/permissoes?error=' + encodeURIComponent('Cargo inválido.'));
    }
    if (role === 'admin' && user.role !== 'superadmin') {
        return c.redirect(`/admin/permissoes?tab=roles&role=${role}&error=` + encodeURIComponent('Apenas Super Admin pode alterar permissões do cargo Administrador.'));
    }

    const rawPerms = body.permissions;
    const permsList = Array.isArray(rawPerms)
        ? rawPerms.map((v) => String(v))
        : rawPerms
        ? [String(rawPerms)]
        : [];

    await saveRolePermissions(db, role, permsList);
    return c.redirect(`/admin/permissoes?tab=roles&role=${role}&success=` + encodeURIComponent('Permissões do cargo atualizadas com sucesso!'));
});

adminRoutes.post('/permissoes/cargo/reset', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const body = await getRequestBody(c);
    const role = String(body.role || '').trim() as UserRole;
    const validRoleKeys = CONFIGURABLE_STAFF_ROLES.map((r) => r.key);

    if (!validRoleKeys.includes(role)) {
        return c.redirect('/admin/permissoes?error=' + encodeURIComponent('Cargo inválido.'));
    }
    if (role === 'admin' && user.role !== 'superadmin') {
        return c.redirect(`/admin/permissoes?tab=roles&role=${role}&error=` + encodeURIComponent('Apenas Super Admin pode restaurar o cargo Administrador.'));
    }

    await saveRolePermissions(db, role, null);
    return c.redirect(`/admin/permissoes?tab=roles&role=${role}&success=` + encodeURIComponent('Permissões restauradas para o padrão do sistema!'));
});

adminRoutes.post('/permissoes/usuario', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const body = await c.req.parseBody({ all: true });
    const targetId = Number(body.user_id || 0);

    if (!targetId) {
        return c.redirect('/admin/permissoes?tab=users&error=' + encodeURIComponent('Usuário inválido.'));
    }

    const target = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').bind(targetId).first<{ id: number; name: string; role: UserRole }>();
    if (!target || target.role === 'client' || target.role === 'superadmin') {
        return c.redirect('/admin/permissoes?tab=users&error=' + encodeURIComponent('Este usuário não pode ter permissões personalizadas.'));
    }
    if (target.role === 'admin' && user.role !== 'superadmin') {
        return c.redirect(`/admin/permissoes?tab=users&user_id=${targetId}&error=` + encodeURIComponent('Apenas Super Admin pode personalizar acessos de outro Administrador.'));
    }

    const rawPerms = body.permissions;
    const permsList = Array.isArray(rawPerms)
        ? rawPerms.map((v) => String(v))
        : rawPerms
        ? [String(rawPerms)]
        : [];

    await saveUserPermissionOverride(db, targetId, permsList);
    return c.redirect(`/admin/permissoes?tab=users&user_id=${targetId}&success=` + encodeURIComponent(`Acessos individuais de ${target.name} salvos com sucesso!`));
});

adminRoutes.post('/permissoes/usuario/reset', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const body = await getRequestBody(c);
    const targetId = Number(body.user_id || 0);

    if (!targetId) {
        return c.redirect('/admin/permissoes?tab=users&error=' + encodeURIComponent('Usuário inválido.'));
    }

    const target = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').bind(targetId).first<{ id: number; name: string; role: UserRole }>();
    if (target && target.role === 'admin' && user.role !== 'superadmin') {
        return c.redirect(`/admin/permissoes?tab=users&user_id=${targetId}&error=` + encodeURIComponent('Apenas Super Admin pode alterar acessos de outro Administrador.'));
    }

    await saveUserPermissionOverride(db, targetId, null);
    return c.redirect(`/admin/permissoes?tab=users&user_id=${targetId}&success=` + encodeURIComponent('Usuário voltou a herdar as permissões padrão do cargo!'));
});

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
    let siteChatAiEnabled = true;
    let whatsappSyncEnabled = true;
    let whatsappAiEnabled = true;
    let whatsappDirectorEnabled = true;
    let officialWhatsappPhone = '';
    let directorWhatsappPhone = '';

    try {
        const convRes = await db.prepare(
            `SELECT c.*,
                    cl.name AS client_name,
                    cl.email AS client_email,
                    cl.phone AS client_phone,
                    (SELECT COUNT(*) FROM conversation_messages m WHERE m.conversation_id = c.id) AS message_count,
                    (SELECT m.message FROM conversation_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_preview
             FROM conversations c
             LEFT JOIN clients cl ON cl.id = c.client_id
             ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC
             LIMIT 30`
        ).all();
        conversations = convRes.results || [];
    } catch {
        try {
            const convRes = await db.prepare(
                `SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 30`
            ).all();
            conversations = convRes.results || [];
        } catch { }
    }

    try {
        const setRes = await db.prepare(
            `SELECT key, value FROM system_settings
             WHERE group_name = 'crm_ai'
                OR key IN ('site_chat_ai_enabled', 'whatsapp_sync_enabled', 'whatsapp_ai_enabled', 'whatsapp_director_enabled', 'company_whatsapp', 'whatsapp_director_phone')`
        ).all<{ key: string; value: string }>();
        for (const row of setRes.results || []) {
            if (row.key === 'site_chat_ai_enabled') {
                siteChatAiEnabled = row.value !== '0';
            } else if (row.key === 'whatsapp_sync_enabled') {
                whatsappSyncEnabled = row.value !== '0';
            } else if (row.key === 'whatsapp_ai_enabled') {
                whatsappAiEnabled = row.value !== '0';
            } else if (row.key === 'whatsapp_director_enabled') {
                whatsappDirectorEnabled = row.value !== '0';
            } else if (row.key === 'company_whatsapp') {
                officialWhatsappPhone = row.value || '';
            } else if (row.key === 'whatsapp_director_phone') {
                directorWhatsappPhone = row.value || '';
            } else {
                settingsMap[row.key] = row.value || '';
            }
        }
    } catch { }

    try {
        const qRes = await db.prepare(
            `SELECT COUNT(*) as total FROM quotations WHERE reference_code LIKE 'ORC-AI-%'`
        ).first<{ total: number }>();
        aiQuotationsCount = qRes?.total ?? 0;
    } catch { }

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
            whatsappSyncEnabled={whatsappSyncEnabled}
            channelControls={{
                siteChatAiEnabled,
                whatsappSyncEnabled,
                whatsappAiEnabled,
                whatsappDirectorEnabled,
                officialWhatsappPhone,
                directorWhatsappPhone
            }}
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

adminRoutes.post('/canais/toggle', async (c) => {
    const db = c.env.DB;
    const body = await getRequestBody(c);
    const channel = String(body.channel || '').trim();
    const enabled = String(body.enabled || '') === '1' ? '1' : '0';
    const returnTo = String(body.return_to || '/admin/crm-autonomo').startsWith('/admin/')
        ? String(body.return_to)
        : '/admin/crm-autonomo';

    const allowedChannels: Record<string, { group: string; label: string }> = {
        site_chat_ai_enabled: { group: 'crm_ai', label: 'IA do Chat do Site' },
        whatsapp_sync_enabled: { group: 'integrations', label: 'Recebimento WhatsApp 1 (Oficial)' },
        whatsapp_ai_enabled: { group: 'integrations', label: 'IA no WhatsApp 1 (Oficial)' },
        whatsapp_director_enabled: { group: 'integrations', label: 'Alertas e Ponte WhatsApp 2 (Diretor)' }
    };

    const meta = allowedChannels[channel];
    if (!meta) {
        return c.redirect(`${returnTo}?error=Canal inválido`);
    }

    try {
        await db.prepare(
            `INSERT INTO system_settings (key, value, type, group_name, created_at, updated_at)
             VALUES (?, ?, 'string', ?, datetime('now'), datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        ).bind(channel, enabled, meta.group).run();
    } catch { }

    const statusTxt = enabled === '1' ? 'ativado' : 'pausado';
    return c.redirect(`${returnTo}?success=${encodeURIComponent(`${meta.label} ${statusTxt} com sucesso`)}`);
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
    } catch { }

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
// 12B. CONFIGURAÇÕES GERAIS (Modularizado em src/routes/admin/settings.tsx)
// ==========================================
adminRoutes.route('/', adminSettingsRoutes);

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
    const currentUser = c.get('user');
    const role = (currentUser?.role || 'client') as UserRole;
    const canReq = hasPermission(role, 'requests.view');
    const canChat = hasPermission(role, 'chat.view');
    const canQuotes = hasPermission(role, 'quotations.view');
    const canFinance = hasPermission(role, 'finance.view');

    const formatTimeBrt = (raw?: string | null): string => {
        if (!raw) return '';
        try {
            const iso = String(raw).includes('T') ? String(raw) : `${String(raw).replace(' ', 'T')}Z`;
            const dt = new Date(iso);
            if (isNaN(dt.getTime())) return String(raw).slice(11, 16);
            return new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(dt);
        } catch {
            return String(raw).slice(11, 16);
        }
    };

    let pendingRequests = 0;
    let openConversations = 0;
    let latestConversationId = 0;
    let latestClientMessageId = 0;
    let latestRequestId = 0;
    let latestHandoffId = 0;
    let handoffCount = 0;
    const notifications: any[] = [];

    try {
        // Queries leves dedicadas (substituem getAdminDashboardStats(db, 30) completo no polling de 6s)
        const [reqStats, chatStats, msgStats, handoffStats] = await Promise.all([
            canReq
                ? db.prepare(`SELECT COUNT(*) as pending, COALESCE(MAX(id), 0) as max_id FROM service_requests WHERE status IN ('new', 'analyzing')`).first<{ pending: number; max_id: number }>()
                : Promise.resolve(null),
            canChat
                ? db.prepare(`SELECT COUNT(*) as open_total, COALESCE(MAX(id), 0) as max_id FROM conversations WHERE status IN ('open', 'waiting_staff', 'waiting_client')`).first<{ open_total: number; max_id: number }>()
                : Promise.resolve(null),
            canChat
                ? db.prepare(`SELECT COALESCE(MAX(id), 0) as max_id FROM conversation_messages WHERE sender_type IN ('client', 'visitor')`).first<{ max_id: number }>()
                : Promise.resolve(null),
            canChat
                ? db.prepare(`SELECT COALESCE(MAX(id), 0) as max_id, COUNT(*) as total FROM conversations WHERE status != 'closed' AND (status = 'waiting_staff' OR crm_stage = 'handoff_human')`).first<{ max_id: number; total: number }>()
                : Promise.resolve(null),
        ]);

        pendingRequests = reqStats?.pending ?? 0;
        latestRequestId = reqStats?.max_id ?? 0;
        openConversations = chatStats?.open_total ?? 0;
        latestConversationId = chatStats?.max_id ?? 0;
        latestClientMessageId = msgStats?.max_id ?? 0;
        latestHandoffId = handoffStats?.max_id ?? 0;
        handoffCount = handoffStats?.total ?? 0;

        const [recentReqs, recentConvs, recentQuotes, overdueFinance] = await Promise.all([
            canReq
                ? db.prepare(`SELECT id, protocol, name, title, service_title, created_at FROM service_requests WHERE status IN ('new', 'analyzing') ORDER BY id DESC LIMIT 3`).all()
                : Promise.resolve({ results: [] }),
            canChat
                ? db.prepare(`SELECT id, visitor_name, subject, status, crm_stage, updated_at FROM conversations WHERE status IN ('open', 'waiting_staff', 'waiting_client') ORDER BY updated_at DESC LIMIT 3`).all()
                : Promise.resolve({ results: [] }),
            canQuotes
                ? db.prepare(`SELECT id, reference_code, title, status, updated_at FROM quotations WHERE status IN ('approved', 'rejected') ORDER BY updated_at DESC LIMIT 2`).all()
                : Promise.resolve({ results: [] }),
            canFinance
                ? db.prepare(`SELECT id, description, amount, due_date, updated_at FROM financial_transactions WHERE status = 'pending' AND due_date IS NOT NULL AND date(due_date) < date('now') ORDER BY due_date ASC LIMIT 2`).all()
                : Promise.resolve({ results: [] }),
        ]);

        for (const req of (recentReqs.results || []) as any[]) {
            notifications.push({
                key: `request:${req.id}`,
                type: 'request',
                title: req.service_title || req.title || `Solicitação ${req.protocol}`,
                subtitle: `${req.protocol || ''} • ${req.name || 'Cliente'}`,
                time: formatTimeBrt(req.created_at),
                url: `/admin/solicitacoes/${req.id}`
            });
        }
        for (const conv of (recentConvs.results || []) as any[]) {
            const isHandoff = conv.status === 'waiting_staff' || conv.crm_stage === 'handoff_human';
            notifications.push({
                key: `chat:${conv.id}:${conv.updated_at || ''}`,
                type: 'chat',
                title: `${isHandoff ? 'Handoff Humano' : 'Chat'} • ${conv.visitor_name || 'Visitante'}`,
                subtitle: conv.subject || 'Atendimento aberto',
                time: formatTimeBrt(conv.updated_at),
                url: `/admin/atendimento?id=${conv.id}`
            });
        }
        for (const q of (recentQuotes.results || []) as any[]) {
            const isApproved = q.status === 'approved';
            notifications.push({
                key: `quote:${q.id}:${q.status}:${q.updated_at || ''}`,
                type: 'quotation',
                title: `${isApproved ? 'Orçamento Aprovado' : 'Revisão Solicitada'} • ${q.reference_code || `#${q.id}`}`,
                subtitle: q.title || 'Proposta comercial atualizada',
                time: formatTimeBrt(q.updated_at),
                url: `/admin/orcamentos/${q.id}`
            });
        }
        for (const fin of (overdueFinance.results || []) as any[]) {
            const val = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(fin.amount || 0));
            notifications.push({
                key: `overdue:${fin.id}:${fin.due_date || ''}`,
                type: 'finance',
                title: `Fatura Vencida • ${val}`,
                subtitle: fin.description || 'Cobrança em atraso',
                time: fin.due_date ? String(fin.due_date).slice(5, 10).split('-').reverse().join('/') : '',
                url: '/admin/financeiro?status=pending'
            });
        }
    } catch { }

    return c.json({
        ok: true,
        pending_requests: pendingRequests,
        open_chats: openConversations,
        handoff_count: handoffCount,
        total_notifications: pendingRequests + openConversations,
        latest_conversation_id: latestConversationId,
        latest_client_message_id: latestClientMessageId,
        latest_request_id: latestRequestId,
        latest_handoff_id: latestHandoffId,
        notifications
    });
});
