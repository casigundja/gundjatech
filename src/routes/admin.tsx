import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth, requirePermission, requireStaff } from '../middleware/auth';
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
import { AdminServicesView } from '../views/admin/services';
import { AdminUsersView } from '../views/admin/users';
import { AdminSettingsView } from '../views/admin/settings';
import { AdminQuotationsView } from '../views/admin/quotations';
import { sendWhatsAppTextMessage } from '../services/whatsapp';
import { AdminChatView } from '../views/admin/chat';
import { AdminProjectsView } from '../views/admin/projects';
import { AdminFinanceView } from '../views/admin/finance';
import { AdminDomainsView } from '../views/admin/domains';
import { AdminCampaignsView } from '../views/admin/campaigns';
import { sendInvoiceNoticeEmail, sendProjectStartedEmail, sendProjectCompletedEmail, sendPortalInviteEmail } from '../lib/email';
import { recordRequestTimeline } from '../lib/timeline';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Protege todas as rotas do admin exigindo login e perfil staff
adminRoutes.use('*', requireAuth, requireStaff);

// RBAC Granular por módulo administrativo
adminRoutes.use('/usuarios*', requirePermission('users.manage'));
adminRoutes.use('/configuracoes*', requirePermission('settings.manage'));
adminRoutes.use('/financeiro*', requirePermission('finance.view'));
adminRoutes.use('/clientes*', requirePermission('clients.view'));
adminRoutes.use('/solicitacoes*', requirePermission('requests.view'));
adminRoutes.use('/servicos*', requirePermission('services.view'));
adminRoutes.use('/projetos*', requirePermission('projects.view'));
adminRoutes.use('/dominios*', requirePermission('domains.view'));
adminRoutes.use('/campanhas*', requirePermission('campaigns.view'));
adminRoutes.use('/orcamentos*', requirePermission('quotations.view'));
adminRoutes.use('/atendimento*', requirePermission('chat.view'));
adminRoutes.use('/crm-autonomo*', requirePermission('chat.manage'));

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

    let servicesList: any[] = [];
    try {
        const sRes = await db.prepare(`SELECT title, slug, category, price, is_active FROM services ORDER BY order_position ASC, id ASC`).all();
        servicesList = sRes.results || [];
    } catch { }

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
        new: 'Novo',
        analyzing: 'Em Análise',
        quotation_sent: 'Orçamento Enviado',
        approved: 'Aprovado',
        in_progress: 'Em Execução',
        completed: 'Concluído',
        cancelled: 'Cancelado'
    };

    const catPt: Record<string, string> = {
        sites: 'Websites & Portais',
        ecommerce: 'E-commerce B2B/B2C',
        software: 'Software & SaaS',
        infra: 'Infra & Cloudflare'
    };

    const recentRequests = Array.isArray(stats.recentRequests) ? stats.recentRequests : [];
    const recentClients = Array.isArray(stats.recentClients) ? stats.recentClients : [];

    const kpiRows = [
        {
            area: 'Financeiro & Caixa',
            metric: 'Receita Recebida (Liquidada)',
            value: fmtBRL(stats.monthlyRevenue),
            status: 'Caixa Confirmado',
            note: `Total liquidado nos últimos ${period} dias`,
            highlight: true
        },
        {
            area: 'Financeiro & Caixa',
            metric: 'Faturas a Receber (Pendente)',
            value: fmtBRL(stats.pendingReceivables),
            status: stats.pendingReceivables > 0 ? 'Aguardando Baixa' : 'Sem Pendências',
            note: 'Cobranças emitidas aguardando liquidação',
            highlight: false
        },
        {
            area: 'Comercial & Propostas',
            metric: 'Orçamentos & Propostas Emitidas',
            value: `${stats.totalQuotations} proposta(s)`,
            status: `${stats.approvedQuotations} Aprovada(s)`,
            note: `Em aberto: ${fmtBRL(stats.openQuotationsValue || 0)}`,
            highlight: false
        },
        {
            area: 'Carteira de Clientes',
            metric: 'Total de Clientes & Leads',
            value: `${stats.totalClients} registro(s)`,
            status: `${stats.activeClients} Ativo(s)`,
            note: `${stats.leadClients} lead(s) em qualificação comercial`,
            highlight: false
        },
        {
            area: 'Pipeline de Entrada',
            metric: 'Solicitações Comerciais & Briefings',
            value: `${stats.totalRequests} solicitação(ões)`,
            status: `${stats.pendingRequests} Pendente(s)`,
            note: 'Demandas recebidas pelo site e canais digitais',
            highlight: false
        },
        {
            area: 'Operação & Engenharia',
            metric: 'Projetos Técnicos em Execução',
            value: `${stats.activeProjects} projeto(s)`,
            status: `${stats.totalProjects} no Histórico`,
            note: 'Planejamento, desenvolvimento e homologação',
            highlight: false
        },
        {
            area: 'Atendimento & CRM IA',
            metric: 'Conversas Ativas (Site & WhatsApp)',
            value: `${stats.openConversations} conversa(s)`,
            status: 'Monitoramento Ativo',
            note: 'Central de Atendimento e Agente Autônomo IA',
            highlight: false
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
  body, table { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 10.5pt; color: #063B5C; }
  table { border-collapse: collapse; table-layout: fixed; }
  td, th { padding: 9px 14px; vertical-align: middle; white-space: nowrap; mso-number-format: "\\@"; }
  .banner-top { background-color: #063B5C; color: #FFFFFF; font-size: 15pt; font-weight: bold; border-top: 2px solid #063B5C; border-left: 2px solid #063B5C; border-right: 2px solid #063B5C; }
  .banner-sub { background-color: #063B5C; color: #E7F0F5; font-size: 10pt; border-bottom: 3px solid #F2C230; border-left: 2px solid #063B5C; border-right: 2px solid #063B5C; }
  .gold-text { color: #F2C230; font-weight: bold; }
  .sec-head { background-color: #16749A; color: #FFFFFF; font-size: 11pt; font-weight: bold; text-transform: uppercase; border: 1px solid #063B5C; }
  .tbl-head { background-color: #063B5C; color: #F2C230; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; border: 1px solid #16749A; }
  .cell-even { background-color: #FFFFFF; color: #063B5C; border: 1px solid #C8DBE6; }
  .cell-odd { background-color: #E7F0F5; color: #063B5C; border: 1px solid #C8DBE6; }
  .cell-area { font-weight: bold; color: #16749A; }
  .cell-metric { font-weight: bold; color: #063B5C; }
  .cell-val { font-weight: bold; color: #063B5C; text-align: right; }
  .cell-gold { font-weight: bold; color: #063B5C; background-color: #FEF7DC; text-align: right; border: 1px solid #F2C230; }
  .cell-green { font-weight: bold; color: #065F46; background-color: #D1FAE5; text-align: center; border: 1px solid #A7F3D0; }
  .cell-badge { font-weight: bold; color: #063B5C; background-color: #E7F0F5; text-align: center; border: 1px solid #C8DBE6; }
  .cell-empty { background-color: #FFFFFF; color: #5C768D; font-style: italic; text-align: center; border: 1px solid #C8DBE6; }
  .footer-bar { background-color: #063B5C; color: #F2C230; font-size: 9.5pt; font-weight: bold; text-align: center; border-top: 2px solid #F2C230; }
</style>
</head>
<body>
<table>
  <col width="220" style="mso-width-source:userset;width:165pt;">
  <col width="310" style="mso-width-source:userset;width:232pt;">
  <col width="190" style="mso-width-source:userset;width:142pt;">
  <col width="190" style="mso-width-source:userset;width:142pt;">
  <col width="310" style="mso-width-source:userset;width:232pt;">

  <!-- CABEÇALHO INSTITUCIONAL GUNDJATECH (PALETA 3) -->
  <tr height="44" style="mso-height-source:userset;height:33pt;">
    <td colspan="5" class="banner-top">
      GUNDJA<span class="gold-text">TECH</span> &bull; RELATÓRIO EXECUTIVO DE GESTÃO &amp; PERFORMANCE
    </td>
  </tr>
  <tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <td colspan="5" class="banner-sub">
      Período analisado: <b>Últimos ${period} dias</b> &nbsp;&bull;&nbsp; Emitido em: <b>${esc(emittedAt)} (BRT)</b> &nbsp;&bull;&nbsp; Responsável: <b>${esc(emitterName)}</b>
    </td>
  </tr>
  <tr height="16"><td colspan="5"></td></tr>

  <!-- SEÇÃO 1: INDICADORES EXECUTIVOS (KPIs) — 5 Colunas Independentes sem mesclagem -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="5" class="sec-head">1. Resumo Executivo &amp; Indicadores-Chave (KPIs)</td>
  </tr>
  <tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <th class="tbl-head" align="left">Área / Módulo</th>
    <th class="tbl-head" align="left">Indicador Operacional</th>
    <th class="tbl-head" align="right">Resultado Atual</th>
    <th class="tbl-head" align="center">Status</th>
    <th class="tbl-head" align="left">Detalhamento / Contexto</th>
  </tr>
  ${kpiRows
            .map((row, idx) => {
                const base = idx % 2 === 0 ? 'cell-even' : 'cell-odd';
                const valCls = row.highlight ? 'cell-gold' : `${base} cell-val`;
                return `<tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <td class="${base} cell-area">${esc(row.area)}</td>
    <td class="${base} cell-metric">${esc(row.metric)}</td>
    <td class="${valCls}">${esc(row.value)}</td>
    <td class="cell-badge">${esc(row.status)}</td>
    <td class="${base}">${esc(row.note)}</td>
  </tr>`;
            })
            .join('\n  ')}

  <tr height="18"><td colspan="5"></td></tr>

  <!-- SEÇÃO 2: CATÁLOGO DE PACOTES & SOLUÇÕES DIGITAIS -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="5" class="sec-head">2. Catálogo Ativo de Pacotes &amp; Soluções Digitais (${servicesList.length})</td>
  </tr>
  <tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <th class="tbl-head" align="left">Categoria</th>
    <th class="tbl-head" align="left">Pacote / Solução Digital</th>
    <th class="tbl-head" align="right">Preço Base (R$)</th>
    <th class="tbl-head" align="center">Disponibilidade</th>
    <th class="tbl-head" align="left">Identificador (Slug)</th>
  </tr>
  ${servicesList.length === 0
            ? `<tr height="32" style="mso-height-source:userset;height:24pt;"><td colspan="5" class="cell-empty">Nenhum pacote de serviço cadastrado.</td></tr>`
            : servicesList
                .map((s: any, idx: number) => {
                    const base = idx % 2 === 0 ? 'cell-even' : 'cell-odd';
                    const catLabel = catPt[s.category] || s.category || 'Websites & Portais';
                    const stCls = s.is_active ? 'cell-green' : 'cell-badge';
                    return `<tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <td class="${base} cell-area">${esc(catLabel)}</td>
    <td class="${base} cell-metric">${esc(s.title)}</td>
    <td class="${base} cell-val">${esc(fmtBRL(s.price || 0))}</td>
    <td class="${stCls}">${s.is_active ? 'Ativo no Site' : 'Inativo'}</td>
    <td class="${base}">${esc(s.slug || '—')}</td>
  </tr>`;
                })
                .join('\n  ')
        }

  <tr height="18"><td colspan="5"></td></tr>

  <!-- SEÇÃO 3: ÚLTIMAS SOLICITAÇÕES DE CLIENTES -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="5" class="sec-head">3. Últimas Solicitações &amp; Pipeline de Entrada (${recentRequests.length})</td>
  </tr>
  <tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <th class="tbl-head" align="left">Protocolo</th>
    <th class="tbl-head" align="left">Demanda / Serviço Solicitado</th>
    <th class="tbl-head" align="left">Cliente / Empresa</th>
    <th class="tbl-head" align="center">Status</th>
    <th class="tbl-head" align="center">Data de Registro</th>
  </tr>
  ${recentRequests.length === 0
            ? `<tr height="32" style="mso-height-source:userset;height:24pt;"><td colspan="5" class="cell-empty">Nenhuma solicitação registrada no período atual.</td></tr>`
            : recentRequests
                .map((r: any, idx: number) => {
                    const base = idx % 2 === 0 ? 'cell-even' : 'cell-odd';
                    const st = statusPt[r.status] || r.status || 'Novo';
                    const dt = r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—';
                    return `<tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <td class="${base} cell-area">${esc(r.protocol)}</td>
    <td class="${base} cell-metric">${esc(r.service_title || r.title || 'Solicitação Digital')}</td>
    <td class="${base}">${esc(r.company || r.name || 'Cliente')}</td>
    <td class="cell-badge">${esc(st)}</td>
    <td class="${base}" align="center">${esc(dt)}</td>
  </tr>`;
                })
                .join('\n  ')
        }

  <tr height="18"><td colspan="5"></td></tr>

  <!-- SEÇÃO 4: DIRETÓRIO DE CLIENTES & LEADS -->
  <tr height="34" style="mso-height-source:userset;height:25.5pt;">
    <td colspan="5" class="sec-head">4. Diretório Recente de Clientes &amp; Leads (${recentClients.length})</td>
  </tr>
  <tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <th class="tbl-head" align="left">Empresa / Nome</th>
    <th class="tbl-head" align="left">E-mail / Canal de Origem</th>
    <th class="tbl-head" align="left">Telefone / WhatsApp</th>
    <th class="tbl-head" align="center">Categoria</th>
    <th class="tbl-head" align="center">Data de Cadastro</th>
  </tr>
  ${recentClients.length === 0
            ? `<tr height="32" style="mso-height-source:userset;height:24pt;"><td colspan="5" class="cell-empty">Nenhum cliente ou lead cadastrado no momento.</td></tr>`
            : recentClients
                .map((cl: any, idx: number) => {
                    const base = idx % 2 === 0 ? 'cell-even' : 'cell-odd';
                    const isWa = String(cl.email || '').endsWith('.local');
                    const catLabel = cl.status === 'active' ? 'Cliente Ativo' : isWa ? 'Lead WhatsApp' : 'Lead Site';
                    const catClass = cl.status === 'active' ? 'cell-green' : 'cell-badge';
                    const dt = cl.created_at ? new Date(cl.created_at).toLocaleDateString('pt-BR') : '—';
                    return `<tr height="30" style="mso-height-source:userset;height:22.5pt;">
    <td class="${base} cell-metric">${esc(cl.company || cl.name || 'Cliente')}</td>
    <td class="${base}">${isWa ? 'WhatsApp Direto' : esc(cl.email || '—')}</td>
    <td class="${base}">${esc(cl.phone || '—')}</td>
    <td class="${catClass}">${esc(catLabel)}</td>
    <td class="${base}" align="center">${esc(dt)}</td>
  </tr>`;
                })
                .join('\n  ')
        }

  <tr height="18"><td colspan="5"></td></tr>
  <tr height="32" style="mso-height-source:userset;height:24pt;">
    <td colspan="5" class="footer-bar">
      GUNDJATECH &bull; ENGENHARIA DIGITAL, SISTEMAS WEB, CIBERSEGURANÇA E OPERAÇÃO CONTÍNUA &bull; gundjatech.com
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
        userId = existingUser.id;
        await db.prepare(
            `UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ?`
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

    // Gera token único seguro para definição da senha pessoal (/redefinir-senha/:token)
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    await db.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(targetEmail).run();
    await db.prepare(
        `INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))`
    ).bind(targetEmail, token).run();

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

    try {
        await db.prepare(`UPDATE conversations SET client_id = NULL WHERE client_id = ?`).bind(id).run();
        await db.prepare(`UPDATE service_requests SET client_id = NULL WHERE client_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM quotations WHERE client_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM advertising_campaigns WHERE client_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM financial_transactions WHERE client_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM domains WHERE client_id = ?`).bind(id).run();
        await db.prepare(`DELETE FROM projects WHERE client_id = ?`).bind(id).run();
    } catch { }

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

    const current = await db.prepare(`SELECT id, status, client_id, name, company, email, phone, title, service_title, description, estimated_budget, protocol FROM service_requests WHERE id = ?`).bind(id).first<any>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
    }

    // Impede registro duplicado na linha do tempo quando não houve alteração real de status nem comentário
    if (current.status === newStatus && !notes) {
        return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent('Nenhuma alteração detectada para salvar.')}`);
    }

    await db.prepare(
        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newStatus, id).run();

    await recordRequestTimeline(db, {
        serviceRequestId: id,
        userId: user.id,
        action: 'status_change',
        fromStatus: current.status,
        toStatus: newStatus,
        notes
    });

    // Quando marcado como "Orçamento Enviado", garante que o orçamento chegue ao Portal do Cliente
    if (newStatus === 'quotation_sent') {
        try {
            let clientId = current.client_id;
            if (!clientId && current.email) {
                const existingClient = await db.prepare(`SELECT id FROM clients WHERE lower(email) = lower(?)`).bind(current.email).first<{ id: number }>();
                if (existingClient) {
                    clientId = existingClient.id;
                } else {
                    const insClient = await db.prepare(
                        `INSERT INTO clients (name, company, email, phone, status, is_active, created_at, updated_at)
                         VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                    ).bind(current.name || 'Cliente', current.company || null, current.email, current.phone || null).run();
                    clientId = Number(insClient.meta?.last_row_id || 0) || null;
                }
                if (clientId) {
                    await db.prepare(`UPDATE service_requests SET client_id = ? WHERE id = ?`).bind(clientId, id).run();
                }
            }

            if (clientId) {
                const existingQuote = await db.prepare(
                    `SELECT id, status FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1`
                ).bind(id).first<{ id: number; status: string }>();

                if (!existingQuote) {
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
                } else if (existingQuote.status === 'draft') {
                    await db.prepare(
                        `UPDATE quotations SET status = 'sent', updated_at = datetime('now') WHERE id = ?`
                    ).bind(existingQuote.id).run();
                }
            }
        } catch { }
        return c.redirect(`/admin/solicitacoes/${id}?success=${encodeURIComponent('Orçamento enviado e disponibilizado no Portal do Cliente para aprovação!')}`);
    }

    if (newStatus === 'completed' && current.status !== 'completed' && current.email) {
        try {
            const mailRes = await sendProjectCompletedEmail(
                c.env,
                String(current.email).trim(),
                String(current.company || current.name || 'Cliente').trim(),
                {
                    title: String(current.service_title || current.title || 'Projeto GundjaTech')
                }
            );
            if (!mailRes.success) {
                return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent('Status concluído, mas o e-mail não pôde ser entregue (Resend em modo teste só envia para gundjatech@gmail.com até verificar um domínio próprio).')}`);
            }
            return c.redirect(`/admin/solicitacoes/${id}?success=${encodeURIComponent('Status concluído e cliente notificado por e-mail!')}`);
        } catch { }
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
         SET title = ?, service_title = ?, name = COALESCE(?, name), company = ?, email = COALESCE(?, email), phone = ?, description = ?, estimated_budget = ?, updated_at = datetime('now')
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

    const current = await db.prepare(`SELECT status FROM service_requests WHERE id = ?`).bind(id).first<{ status: string }>();
    if (!current) {
        return c.redirect('/admin/solicitacoes?error=Solicitação não encontrada');
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

    // Cria o projeto (preenchendo title, name e slug obrigatórios no D1)
    const projectName = String(req.service_title || req.title || `Projeto • ${req.company || req.name || 'Cliente'}`).trim();
    const projectDesc = String(req.briefing || req.description || 'Projeto iniciado via solicitação web').trim();
    const baseSlug = projectName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48) || 'projeto';
    const projectSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const insProj = await db.prepare(
        `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'planning', 'high', 0, date('now'), datetime('now'), datetime('now'))`
    ).bind(clientId, projectName, projectName, projectSlug, projectDesc).run();
    const newProjectId = Number(insProj.meta?.last_row_id || 0) || undefined;

    // Atualiza solicitação para approved
    await db.prepare(
        `UPDATE service_requests SET status = 'approved', client_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(clientId, id).run();

    // Histórico (sincronizado entre Admin e Portal do Cliente)
    await recordRequestTimeline(db, {
        serviceRequestId: id,
        userId: user.id,
        action: 'converted_to_project',
        fromStatus: req.status,
        toStatus: 'approved',
        notes: 'Convertido em Projeto pela administração'
    });

    // Notifica o cliente por e-mail sobre o início do projeto
    try {
        let recipientEmail = String(req.email || '').trim();
        let recipientName = String(req.company || req.name || 'Cliente').trim();
        if (!recipientEmail && clientId) {
            const clientRow = await db.prepare(`SELECT name, company, email FROM clients WHERE id = ?`).bind(clientId).first<any>();
            if (clientRow?.email) {
                recipientEmail = String(clientRow.email).trim();
                recipientName = String(clientRow.company || clientRow.name || recipientName).trim();
            }
        }
        if (recipientEmail) {
            const mailRes = await sendProjectStartedEmail(c.env, recipientEmail, recipientName, {
                id: newProjectId,
                title: projectName,
                protocol: req.protocol || null
            });
            if (!mailRes.success) {
                return c.redirect(`/admin/solicitacoes/${id}?error=${encodeURIComponent('Convertido em Projeto, mas o Resend bloqueou envio externo (sem domínio verificado, só entrega para gundjatech@gmail.com).')}`);
            }
        }
    } catch { }

    return c.redirect(`/admin/solicitacoes/${id}?success=Solicitação convertida em Projeto com sucesso! Cliente notificado por e-mail.`);
});

adminRoutes.post('/solicitacoes/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        try {
            await db.prepare(`DELETE FROM service_request_history WHERE service_request_id = ?`).bind(id).run();
            await db.prepare(`DELETE FROM service_requests WHERE id = ?`).bind(id).run();
        } catch { }
    }

    return c.redirect('/admin/solicitacoes?success=Solicitação excluída com sucesso.');
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

adminRoutes.post('/servicos/:id/editar', async (c) => {
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

adminRoutes.post('/servicos/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        await db.prepare(`DELETE FROM services WHERE id = ?`).bind(id).run();
    }

    return c.redirect('/admin/servicos?success=Pacote de serviço excluído com sucesso.');
});

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

    if (isActive === 0) {
        await destroyAllUserSessions(c.env, Number(id));
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
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    const body = await getRequestBody(c);
    const shouldSendEmail = body.send_email !== false && body.send_email !== '0';

    const target = await db.prepare(`SELECT id, name, email, phone, role FROM users WHERE id = ?`).bind(id).first<any>();
    if (!target || !target.email) {
        return c.json({ ok: false, error: 'Usuário não encontrado.' }, 404);
    }

    const targetEmail = String(target.email).trim().toLowerCase();
    const displayName = String(target.name || 'Usuário').trim();
    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

    await db.prepare(`DELETE FROM password_reset_tokens WHERE email = ?`).bind(targetEmail).run();
    await db.prepare(
        `INSERT INTO password_reset_tokens (email, token, created_at) VALUES (?, ?, datetime('now'))`
    ).bind(targetEmail, token).run();

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
                `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC`
            ).bind(activeId).all()).results || [];
        }
    } else if (conversations.length > 0) {
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
            counts={counts}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
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
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = c.req.param('id');
    const body = await getRequestBody(c);

    const status = String(body.status || 'planning').trim();
    const progress = status === 'completed' ? 100 : Math.min(100, Math.max(0, Number(body.progress_percentage) || 0));
    const startDate = String(body.start_date || '').trim() || null;
    const expectedEndDate = String(body.expected_end_date || '').trim() || null;

    // Busca estado anterior do projeto + dados do cliente para sincronização e notificação
    let previousProject: any = null;
    try {
        previousProject = await db.prepare(
            `SELECT p.id, p.client_id, p.title, p.name, p.status, c.name AS client_name, c.company AS client_company, c.email AS client_email
             FROM projects p
             LEFT JOIN clients c ON c.id = p.client_id
             WHERE p.id = ?`
        ).bind(id).first<any>();
    } catch { }

    await db.prepare(
        `UPDATE projects 
         SET status = ?, progress_percentage = ?, start_date = ?, expected_end_date = ?, updated_at = datetime('now')
         WHERE id = ?`
    ).bind(status, progress, startDate, expectedEndDate, id).run();

    // Sincroniza Projeto -> Solicitação vinculada quando entra em execução ou é concluído
    if (previousProject && previousProject.client_id && previousProject.status !== status && (status === 'in_progress' || status === 'completed')) {
        try {
            const projTitle = String(previousProject.title || previousProject.name || '').trim();
            if (projTitle) {
                const linkedReq = await db.prepare(
                    `SELECT id, status FROM service_requests
                     WHERE client_id = ? AND (lower(service_title) = lower(?) OR lower(title) = lower(?))
                     ORDER BY id DESC LIMIT 1`
                ).bind(previousProject.client_id, projTitle, projTitle).first<{ id: number; status: string }>();

                if (linkedReq && linkedReq.status !== status) {
                    await db.prepare(
                        `UPDATE service_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
                    ).bind(status, linkedReq.id).run();

                    await recordRequestTimeline(db, {
                        serviceRequestId: linkedReq.id,
                        userId: user.id,
                        action: status === 'completed' ? 'project_completed' : 'project_in_progress',
                        fromStatus: linkedReq.status,
                        toStatus: status,
                        notes: status === 'completed'
                            ? `Projeto #${id} concluído e entregue pela equipe GundjaTech`
                            : `Projeto #${id} iniciado — em execução pela equipe GundjaTech`,
                    });
                }
            }
        } catch { }
    }

    // Se acabou de ser marcado como concluído, notifica o cliente por e-mail
    if (status === 'completed' && previousProject && previousProject.status !== 'completed' && previousProject.client_email) {
        let emailResult: { success: boolean; error?: string } = { success: false };
        try {
            emailResult = await sendProjectCompletedEmail(
                c.env,
                String(previousProject.client_email).trim(),
                String(previousProject.client_company || previousProject.client_name || 'Cliente').trim(),
                {
                    id: Number(id),
                    title: String(previousProject.title || previousProject.name || 'Projeto GundjaTech')
                }
            );
        } catch { }
        const msg = emailResult.success
            ? 'Projeto concluído, solicitação sincronizada e cliente notificado por e-mail!'
            : `Projeto concluído e solicitação sincronizada! (Aviso de e-mail: ${emailResult.error || 'não enviado'})`;
        return c.redirect(`/admin/projetos/${id}?success=${encodeURIComponent(msg)}`);
    }

    return c.redirect(`/admin/projetos/${id}?success=Projeto atualizado com sucesso`);
});

adminRoutes.post('/projetos/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        try {
            await db.prepare(`DELETE FROM project_stages WHERE project_id = ?`).bind(id).run();
            await db.prepare(`DELETE FROM project_attachments WHERE project_id = ?`).bind(id).run();
            await db.prepare(`DELETE FROM projects WHERE id = ?`).bind(id).run();
        } catch { }
    }

    return c.redirect('/admin/projetos?success=Projeto excluído com sucesso.');
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
    const typeRaw = String(body.type || 'income').trim();
    const txType = typeRaw === 'expense' ? 'expense' : 'income';
    const description = String(body.description || '').trim();
    const amount = Number(body.amount);
    const dueDate = String(body.due_date || '').trim();
    const paymentMethod = String(body.payment_method || 'PIX').trim();
    const invoiceNumber = String(body.invoice_number || '').trim() || null;

    if (!clientId || !description || !amount || !dueDate) {
        return c.redirect('/admin/financeiro?error=Preencha todos os campos obrigatórios');
    }

    const txTypeSql = txType === 'expense' ? "'expense'" : "'income'";
    await db.prepare(
        `INSERT INTO financial_transactions (client_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
         VALUES (?, ${txTypeSql}, 'contract', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
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

adminRoutes.post('/financeiro/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    if (id > 0) {
        await db.prepare(`DELETE FROM financial_transactions WHERE id = ?`).bind(id).run();
    }

    return c.redirect('/admin/financeiro?success=Lançamento financeiro excluído com sucesso.');
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

adminRoutes.post('/campanhas/:id/editar', async (c) => {
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

adminRoutes.post('/campanhas/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    await db.prepare(`DELETE FROM advertising_campaigns WHERE id = ?`).bind(id).run();
    return c.redirect('/admin/campanhas?success=Campanha excluída com sucesso.');
});

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

    const newId = result.meta?.last_row_id;
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
        `SELECT q.*, cl.name as client_name, cl.company, cl.email as client_email
         FROM quotations q
         LEFT JOIN clients cl ON q.client_id = cl.id
         WHERE q.id = ?`
    ).bind(id).first();

    if (!quotationDetail) {
        return c.redirect('/admin/orcamentos?error=Orçamento não encontrado.');
    }

    return c.html(
        <AdminQuotationsView
            currentUser={user}
            quotationDetail={quotationDetail}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
});

adminRoutes.post('/orcamentos/:id', async (c) => {
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

    if (!title) {
        return c.redirect(`/admin/orcamentos/${id}?error=O título da proposta é obrigatório.`);
    }

    await db.prepare(
        `UPDATE quotations
         SET title = ?, total_amount = ?, discount_amount = ?, final_amount = ?, status = ?, expires_at = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
    ).bind(title, totalAmount, discountAmount, finalAmount, status, expiresAt, notes, id).run();

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

    const quotation = await db.prepare('SELECT id, reference_code, service_request_id, status FROM quotations WHERE id = ?').bind(id).first<any>();

    await db.prepare(
        `UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(status, id).run();

    // Sincroniza Orçamento -> Solicitação vinculada e linha do tempo unificada
    if (quotation?.service_request_id) {
        const mappedReqStatus: Record<string, { status: string; note: string }> = {
            sent: { status: 'quotation_sent', note: `Orçamento ${quotation.reference_code || `#${id}`} enviado ao cliente` },
            approved: { status: 'approved', note: `Orçamento ${quotation.reference_code || `#${id}`} marcado como aprovado pela administração` },
            rejected: { status: 'analyzing', note: `Orçamento ${quotation.reference_code || `#${id}`} recusado — retornou para análise` },
        };
        const sync = mappedReqStatus[status];
        if (sync) {
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

    const referer = c.req.header('referer') || '';
    const backUrl = referer.includes(`/admin/orcamentos/${id}`) ? `/admin/orcamentos/${id}` : '/admin/orcamentos';
    return c.redirect(`${backUrl}?success=Status atualizado para ${encodeURIComponent(labels[status] || status)}!`);
});

adminRoutes.post('/orcamentos/:id/converter-projeto', async (c) => {
    const user = c.get('user')!;
    const db = c.env.DB;
    const id = Number(c.req.param('id'));

    const quotation = await db.prepare('SELECT * FROM quotations WHERE id = ?').bind(id).first<any>();
    if (!quotation) {
        return c.redirect('/admin/orcamentos?error=Orçamento não encontrado.');
    }

    const projectName = String(quotation.title || `Projeto #${quotation.reference_code || id}`).trim();
    const baseSlug = projectName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'projeto';
    const projectSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const description = quotation.notes
        ? `Originado do orçamento ${quotation.reference_code} (Valor: R$ ${Number(quotation.final_amount || quotation.total_amount || 0).toFixed(2)}).\n\n${quotation.notes}`
        : `Projeto originado do orçamento ${quotation.reference_code}.`;

    const insProj = await db.prepare(
        `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'planning', 'high', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(quotation.client_id, projectName, projectName, projectSlug, description).run();
    const newProjectId = Number(insProj.meta?.last_row_id || 0) || undefined;

    await db.prepare(
        `UPDATE quotations SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(id).run();

    // Sincroniza a solicitação vinculada ao orçamento e registra na linha do tempo unificada
    if (quotation.service_request_id) {
        try {
            const reqRow = await db.prepare('SELECT id, status FROM service_requests WHERE id = ?').bind(quotation.service_request_id).first<{ id: number; status: string }>();
            if (reqRow) {
                await db.prepare(
                    `UPDATE service_requests SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?`
                ).bind(reqRow.id).run();

                await recordRequestTimeline(db, {
                    serviceRequestId: reqRow.id,
                    userId: user.id,
                    action: 'converted_to_project',
                    fromStatus: reqRow.status,
                    toStatus: 'in_progress',
                    notes: `Orçamento ${quotation.reference_code || `#${id}`} convertido em Projeto #${newProjectId || ''} pela administração`,
                });
            }
        } catch { }
    }

    // Notifica o cliente por e-mail sobre o início do projeto
    try {
        if (quotation.client_id) {
            const clientRow = await db.prepare(`SELECT name, company, email FROM clients WHERE id = ?`).bind(quotation.client_id).first<any>();
            if (clientRow?.email) {
                await sendProjectStartedEmail(
                    c.env,
                    String(clientRow.email).trim(),
                    String(clientRow.company || clientRow.name || 'Cliente').trim(),
                    {
                        id: newProjectId,
                        title: projectName,
                        protocol: quotation.reference_code || null
                    }
                );
            }
        }
    } catch { }

    return c.redirect('/admin/projetos?success=Orçamento aprovado e convertido em Projeto com sucesso! Cliente notificado por e-mail.');
});

adminRoutes.post('/orcamentos/:id/excluir', async (c) => {
    const db = c.env.DB;
    const id = Number(c.req.param('id'));
    await db.prepare('DELETE FROM quotations WHERE id = ?').bind(id).run();
    return c.redirect('/admin/orcamentos?success=Orçamento excluído com sucesso.');
});

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
    let whatsappSyncEnabled = true;

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
            `SELECT key, value FROM system_settings WHERE group_name = 'crm_ai' OR key = 'whatsapp_sync_enabled'`
        ).all<{ key: string; value: string }>();
        for (const row of setRes.results || []) {
            if (row.key === 'whatsapp_sync_enabled') {
                whatsappSyncEnabled = row.value !== '0';
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
    } catch { }

    const activeProvider = settingsMap.whatsapp_provider || 'zapi_omni';
    const whatsappSyncEnabled = settingsMap.whatsapp_sync_enabled !== '0';
    const whatsappConfigured =
        activeProvider === 'zapi' || activeProvider === 'zapi_omni'
            ? Boolean(settingsMap.whatsapp_zapi_instance_id && settingsMap.whatsapp_zapi_token)
            : activeProvider === 'evolution'
                ? Boolean(settingsMap.whatsapp_evolution_url && settingsMap.whatsapp_evolution_instance && settingsMap.whatsapp_evolution_api_key)
                : Boolean((c.env.WHATSAPP_ACCESS_TOKEN || settingsMap.whatsapp_access_token) && (c.env.WHATSAPP_PHONE_NUMBER_ID || settingsMap.whatsapp_phone_number_id));

    let whatsappLastError: string | null = null;
    if (c.env?.KV_CACHE) {
        try {
            const rawLastSend = await c.env.KV_CACHE.get('wa:debug:last_send');
            if (rawLastSend) {
                const parsed = JSON.parse(rawLastSend) as { ok?: boolean; error?: string };
                if (parsed && parsed.ok === false && parsed.error) {
                    whatsappLastError = parsed.error;
                }
            }
        } catch { }
    }

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
            whatsappSyncEnabled={whatsappSyncEnabled}
            whatsappLastError={whatsappLastError}
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
        ['whatsapp_director_phone', String(body.whatsapp_director_phone || '').replace(/\D+/g, ''), 'integrations'],
        ['company_address', String(body.company_address || '').trim(), 'general'],
        ['whatsapp_sync_enabled', body.whatsapp_sync_enabled ? '1' : '0', 'integrations']
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
    } catch { }

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
    let latestHandoffId = 0;
    let handoffCount = 0;
    const notifications: any[] = [];

    try {
        const cRow = await db.prepare(`SELECT MAX(id) as max_id FROM conversations`).first<{ max_id: number }>();
        latestConversationId = cRow?.max_id ?? 0;

        const mRow = await db.prepare(`SELECT MAX(id) as max_id FROM conversation_messages WHERE sender_type IN ('client', 'visitor')`).first<{ max_id: number }>();
        latestClientMessageId = mRow?.max_id ?? 0;

        const rRow = await db.prepare(`SELECT MAX(id) as max_id FROM service_requests`).first<{ max_id: number }>();
        latestRequestId = rRow?.max_id ?? 0;

        const hRow = await db.prepare(
            `SELECT MAX(id) as max_id, COUNT(*) as total FROM conversations WHERE status != 'closed' AND (status = 'waiting_staff' OR crm_stage = 'handoff_human')`
        ).first<{ max_id: number; total: number }>();
        latestHandoffId = hRow?.max_id ?? 0;
        handoffCount = hRow?.total ?? 0;

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
            const isHandoff = conv.status === 'waiting_staff' || conv.crm_stage === 'handoff_human';
            notifications.push({
                key: `chat:${conv.id}`,
                type: 'chat',
                title: `${isHandoff ? 'Handoff Humano' : 'Chat'} • ${conv.visitor_name || 'Visitante'}`,
                subtitle: conv.subject || 'Atendimento aberto',
                time: String(conv.updated_at || '').slice(11, 16),
                url: `/admin/atendimento?id=${conv.id}`
            });
        }
    } catch { }

    return c.json({
        ok: true,
        pending_requests: stats.pendingRequests,
        open_chats: stats.openConversations,
        handoff_count: handoffCount,
        total_notifications: stats.pendingRequests + stats.openConversations,
        latest_conversation_id: latestConversationId,
        latest_client_message_id: latestClientMessageId,
        latest_request_id: latestRequestId,
        latest_handoff_id: latestHandoffId,
        notifications
    });
});
