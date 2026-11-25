import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import { getRequestBody } from '../lib/request';
import { ensureClientProfile, getPortalDashboard } from '../lib/client-portal';
import { getFile, streamR2Response } from '../lib/storage';
import { generatePixPayload, loadBankPaymentSettings, validateReceiptMagicBytes, renderOfficialPaymentReceiptHtml } from '../lib/pix';
import { renderQrCodeDataUri } from '../lib/qr';
import {
    getOrCreateDynamicPixCharge,
    loadPixGatewayConfig,
    settleInvoiceAsPaid,
    verifyGatewayPaymentPaid
} from '../services/pix-gateway';
import { sendEmail, renderEmailTemplate, escapeEmailHtml } from '../lib/email';
import { recordRequestTimeline } from '../lib/timeline';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import { PortalDashboardView } from '../views/portal/dashboard';
import { PortalProjectsView } from '../views/portal/projects';
import { PortalQuotationsView } from '../views/portal/quotations';
import { PortalRequestsView } from '../views/portal/requests';
import { PortalDomainsView } from '../views/portal/domains';
import { PortalFinanceView } from '../views/portal/finance';
import { PortalCampaignsView } from '../views/portal/campaigns';
import { PortalChatView } from '../views/portal/chat';

export const portalRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Exige autenticação em todas as rotas do portal
portalRoutes.use('*', requireAuth);

// Helper para obter o client associado ao usuário logado
async function getClientContext(c: any) {
    const user = c.get('user');
    const db = c.env.DB;
    if (!db) {
        throw new Error('Banco de dados D1 não inicializado.');
    }
    const client = await ensureClientProfile(db, user);
    return { user, db, client };
}

const handleDashboard = async (c: any) => {
    const { user, db, client } = await getClientContext(c);
    const summary = await getPortalDashboard(db, client.id);

    const successMessage = c.req.query('success');
    const errorMessage = c.req.query('error');

    return c.html(
        <PortalDashboardView
            currentUser={user}
            client={client}
            summary={summary}
            successMessage={successMessage}
            errorMessage={errorMessage}
        />
    );
};

// 1. Dashboard / Resumo (atende /portal, /portal/ e /portal/dashboard)
portalRoutes.get('/', handleDashboard);
portalRoutes.get('', handleDashboard);
portalRoutes.get('/dashboard', handleDashboard);

// 2. Projetos
portalRoutes.get('/projetos', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const projectsRes = await db.prepare(
        'SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC'
    ).bind(client.id).all();

    const pendingInvoicesByProject: Record<number, any> = {};
    try {
        const invRes = await db.prepare(
            `SELECT id, project_id, amount, due_date, status
             FROM financial_transactions
             WHERE client_id = ? AND type = 'income' AND status IN ('pending', 'overdue') AND project_id IS NOT NULL
             ORDER BY due_date ASC`
        ).bind(client.id).all();
        for (const inv of (invRes.results || []) as any[]) {
            const pid = Number(inv.project_id || 0);
            if (pid > 0 && !pendingInvoicesByProject[pid]) {
                pendingInvoicesByProject[pid] = inv;
            }
        }
    } catch {}

    return c.html(
        <PortalProjectsView
            currentUser={user}
            clientName={client.company || client.name}
            projects={projectsRes.results || []}
            pendingInvoicesByProject={pendingInvoicesByProject}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.get('/projetos/:id', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const projectId = Number(c.req.param('id'));

    const project = await db.prepare(
        'SELECT * FROM projects WHERE id = ? AND client_id = ?'
    ).bind(projectId, client.id).first();

    if (!project) {
        return c.text('Projeto não encontrado ou acesso não autorizado.', 404);
    }

    const stages = await db.prepare(
        'SELECT * FROM project_stages WHERE project_id = ? ORDER BY sort_order ASC, id ASC'
    ).bind(projectId).all();

    const attRes = await db.prepare(
        'SELECT * FROM project_attachments WHERE project_id = ? AND is_client_visible = 1 ORDER BY created_at DESC'
    ).bind(projectId).all();
    const attachments = attRes.results || [];

    return c.html(
        <PortalProjectsView
            currentUser={user}
            clientName={client.company || client.name}
            projects={[]}
            projectDetail={project}
            stages={stages.results || []}
            attachments={attachments}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/projetos/:id/anexos', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const projectId = Number(c.req.param('id'));

    const project = await db.prepare(
        'SELECT id FROM projects WHERE id = ? AND client_id = ?'
    ).bind(projectId, client.id).first();

    if (!project) {
        return c.text('Projeto não encontrado ou acesso não autorizado.', 404);
    }

    try {
        const formData = await c.req.formData();
        const fileEntry = formData.get('file');
        if (!fileEntry || typeof fileEntry === 'string' || !('arrayBuffer' in fileEntry)) {
            return c.redirect(`/portal/projetos/${projectId}?error=Selecione um arquivo válido para enviar.`);
        }

        const file = fileEntry as File;
        const maxSize = 15 * 1024 * 1024;
        if (file.size <= 0 || file.size > maxSize) {
            return c.redirect(`/portal/projetos/${projectId}?error=Arquivo inválido ou maior que 15 MB.`);
        }

        const originalName = String(file.name || 'arquivo').trim();
        const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : '';
        const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt', 'csv'];
        if (ext && !allowedExts.includes(ext)) {
            return c.redirect(`/portal/projetos/${projectId}?error=Formato de arquivo não permitido (.${ext}).`);
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
             VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
        ).bind(projectId, user.id, originalName, storageKey, file.size, mimeType).run();

        return c.redirect(`/portal/projetos/${projectId}?success=Arquivo enviado com sucesso! Nossa equipe já tem acesso.`);
    } catch (err: any) {
        return c.redirect(`/portal/projetos/${projectId}?error=${encodeURIComponent(err?.message || 'Erro ao enviar arquivo')}`);
    }
});

portalRoutes.get('/projetos/:id/anexos/:attId', async (c) => {
    const { db, client } = await getClientContext(c);
    const projectId = Number(c.req.param('id'));
    const attId = Number(c.req.param('attId'));

    const project = await db.prepare(
        'SELECT id FROM projects WHERE id = ? AND client_id = ?'
    ).bind(projectId, client.id).first();

    if (!project) {
        return c.text('Projeto não encontrado ou acesso não autorizado.', 404);
    }

    const attachment = (await db.prepare(
        'SELECT * FROM project_attachments WHERE id = ? AND project_id = ? AND is_client_visible = 1'
    ).bind(attId, projectId).first()) as any;

    if (!attachment) {
        return c.text('Anexo não encontrado.', 404);
    }

    const rawPath = String(attachment.file_path || attachment.file_url || attachment.file_name || '').trim();
    const storageKey = rawPath.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
    if (!storageKey || !c.env.UPLOADS_BUCKET) {
        return c.text('Arquivo indisponível no armazenamento.', 404);
    }

    const object = await getFile(c.env.UPLOADS_BUCKET, storageKey);
    if (!object) {
        return c.text('Arquivo não encontrado no armazenamento.', 404);
    }

    const response = streamR2Response(c, object, storageKey);
    const safeFileName = String(attachment.file_name || 'anexo').replace(/["\r\n]/g, '');
    response.headers.set('Content-Disposition', `attachment; filename="${safeFileName}"`);
    return response;
});

// 3. Orçamentos
portalRoutes.get('/orcamentos', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const quotes = await db.prepare(
        'SELECT * FROM quotations WHERE client_id = ? AND status != "draft" ORDER BY created_at DESC'
    ).bind(client.id).all();

    return c.html(
        <PortalQuotationsView
            currentUser={user}
            clientName={client.company || client.name}
            quotations={quotes.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.get('/orcamentos/:id', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const quoteId = Number(c.req.param('id'));

    const quote = await db.prepare(
        'SELECT * FROM quotations WHERE id = ? AND client_id = ? AND status != "draft"'
    ).bind(quoteId, client.id).first();

    if (!quote) {
        return c.text('Orçamento não encontrado.', 404);
    }

    const items = await db.prepare(
        'SELECT * FROM quotation_items WHERE quotation_id = ?'
    ).bind(quoteId).all();

    return c.html(
        <PortalQuotationsView
            currentUser={user}
            clientName={client.company || client.name}
            quotations={[]}
            quotationDetail={quote}
            items={items.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/orcamentos/:id/aprovar', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const quoteId = Number(c.req.param('id'));

    const quote = (await db.prepare(
        'SELECT * FROM quotations WHERE id = ? AND client_id = ?'
    ).bind(quoteId, client.id).first()) as any;

    if (!quote || quote.status !== 'sent') {
        return c.redirect('/portal/orcamentos?error=Or%C3%A7amento+n%C3%A3o+dispon%C3%ADvel+para+aprova%C3%A7%C3%A3o.');
    }

    // Validação de validade da proposta (CDC Arts. 30/35)
    if (quote.valid_until) {
        const validEnd = new Date(`${String(quote.valid_until).slice(0, 10)}T23:59:59Z`).getTime();
        if (!isNaN(validEnd) && validEnd < Date.now()) {
            return c.redirect(`/portal/orcamentos/${quoteId}?error=${encodeURIComponent('Este orçamento expirou. Clique em "Solicitar Revisão" ou fale com nossa equipe para atualizar a validade.')}`);
        }
    }

    // Compare-and-swap atômico: evita duplicação de projetos/faturas em duplo clique ou concorrência
    const approveRes = await db.prepare(
        'UPDATE quotations SET status = "approved", updated_at = datetime("now") WHERE id = ? AND client_id = ? AND status = "sent"'
    ).bind(quoteId, client.id).run();
    if (!approveRes.meta?.changes) {
        return c.redirect('/portal/orcamentos?error=Este+or%C3%A7amento+j%C3%A1+foi+aprovado+ou+atualizado.');
    }

    // Cria automaticamente o Projeto em Execução (50%) se ainda não existir para este cliente/título
    const projectName = String(quote.title || `Projeto • ${quote.reference_code || quoteId}`).trim();
    const baseSlug = projectName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48) || 'projeto';
    const projectSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const projectDesc = quote.notes
        ? `Orçamento aprovado: ${quote.reference_code} • ${quote.notes}`
        : `Projeto iniciado automaticamente após aprovação do orçamento ${quote.reference_code}.`;

    let createdProjectId: number | undefined;
    let createdInvoiceId: number | undefined;
    try {
        await db.prepare(`UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(client.id).run();
        try {
            const insProj = await db.prepare(
                `INSERT INTO projects (client_id, quotation_id, service_request_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
            ).bind(client.id, quoteId, quote.service_request_id || null, projectName, projectName, projectSlug, projectDesc).run();
            createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
        } catch {
            const insProj = await db.prepare(
                `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
            ).bind(client.id, projectName, projectName, projectSlug, projectDesc).run();
            createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
        }

        if (createdProjectId) {
            const defaultStages = [
                '1. Levantamento Técnico & Arquitetura',
                '2. Desenvolvimento & Implementação',
                '3. Testes & Homologação com Cliente',
                '4. Deploy & Entrega Final'
            ];
            for (let i = 0; i < defaultStages.length; i++) {
                await db.prepare(
                    `INSERT INTO project_stages (project_id, title, status, sort_order, created_at, updated_at)
                     VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`
                ).bind(createdProjectId, defaultStages[i], i + 1).run();
            }
        }

        const quoteAmt = Number(quote.final_amount ?? quote.total_amount ?? 0);
        if (quoteAmt > 0) {
            const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const invRes = await db.prepare(
                `INSERT INTO financial_transactions (client_id, project_id, quotation_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
                 VALUES (?, ?, ?, 'income', 'contract', ?, ?, 'pending', ?, 'PIX', ?, datetime('now'), datetime('now'))`
            ).bind(
                client.id,
                createdProjectId || null,
                quoteId,
                `Contrato Aprovado: ${projectName} (Orçamento ${quote.reference_code})`,
                quoteAmt,
                dueDate,
                quote.reference_code || `ORC-${quoteId}`
            ).run();
            createdInvoiceId = Number(invRes?.meta?.last_row_id || 0) || undefined;
        }
    } catch {}

    // Se estiver associado a uma service_request, avança automaticamente para Em Execução (in_progress) e sincroniza ambas as timelines
    if (quote.service_request_id) {
        await db.prepare(
            'UPDATE service_requests SET status = "in_progress", updated_at = datetime("now") WHERE id = ?'
        ).bind(quote.service_request_id).run();

        await recordRequestTimeline(db, {
            serviceRequestId: quote.service_request_id,
            userId: user.id,
            action: 'client_approved',
            fromStatus: 'quotation_sent',
            toStatus: 'approved',
            notes: `Orçamento ${quote.reference_code || `#${quoteId}`} aprovado pelo cliente via Portal do Cliente`
        });

        await recordRequestTimeline(db, {
            serviceRequestId: quote.service_request_id,
            userId: user.id,
            action: 'converted_to_project',
            fromStatus: 'approved',
            toStatus: 'in_progress',
            notes: `Projeto${createdProjectId ? ` #${createdProjectId}` : ''} criado e iniciado automaticamente após aprovação do orçamento`
        });
    }

    // Registra prova de aceite eletrônico (MP 2.200-2 / CDC) com IP e User-Agent
    try {
        const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const userAgent = String(c.req.header('user-agent') || '').slice(0, 240);
        await db.prepare(
            `INSERT INTO activity_logs (user_id, action, model_type, model_id, metadata, ip_address, user_agent, created_at, updated_at)
             VALUES (?, 'portal.quotation_approved', 'Quotation', ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
            user.id,
            quoteId,
            JSON.stringify({
                reference: quote.reference_code,
                amount: Number(quote.final_amount ?? quote.total_amount ?? 0),
                project_id: createdProjectId || null,
                accepted_at: new Date().toISOString()
            }),
            clientIp,
            userAgent
        ).run();
    } catch {}

    // Notifica equipe comercial por e-mail sobre a aprovação pelo cliente
    try {
        const staffTo = c.env.STAFF_NOTIFY_EMAIL || 'gundjatech@gmail.com';
        const appUrl = (c.env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');
        const valFmt = Number(quote.final_amount ?? quote.total_amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        await sendEmail(c.env, {
            to: staffTo,
            subject: `Orçamento Aprovado pelo Cliente • ${quote.reference_code || `#${quoteId}`} (R$ ${valFmt})`,
            html: renderEmailTemplate(
                'Orçamento Aprovado no Portal',
                `<p>O cliente <strong>${escapeEmailHtml(client.company || client.name)}</strong> aprovou formalmente a proposta <strong>${escapeEmailHtml(quote.reference_code || `#${quoteId}`)}</strong>.</p>
                 <p><strong>Projeto iniciado:</strong> ${escapeEmailHtml(projectName)}<br/><strong>Valor:</strong> R$ ${valFmt}</p>`,
                { text: 'Abrir Orçamento no Painel Admin', url: `${appUrl}/admin/orcamentos/${quoteId}` }
            )
        });
    } catch {}

    const approvedAmt = Number(quote.final_amount ?? quote.total_amount ?? 0);
    if (approvedAmt > 0) {
        const invParam = createdInvoiceId ? String(createdInvoiceId) : '1';
        return c.redirect(
            `/portal/orcamentos?fatura_gerada=${encodeURIComponent(invParam)}&valor=${encodeURIComponent(String(approvedAmt))}&success=` +
            encodeURIComponent('Orçamento aprovado com sucesso! Fatura gerada para liberação do projeto.')
        );
    }

    return c.redirect('/portal/orcamentos?success=Or%C3%A7amento+aprovado+com+sucesso!+Seu+projeto+j%C3%A1+foi+iniciado+automaticamente.');
});

portalRoutes.post('/orcamentos/:id/recusar', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const quoteId = Number(c.req.param('id'));

    const quote = (await db.prepare(
        'SELECT * FROM quotations WHERE id = ? AND client_id = ?'
    ).bind(quoteId, client.id).first()) as any;

    if (!quote || quote.status !== 'sent') {
        return c.redirect('/portal/orcamentos?error=Or%C3%A7amento+n%C3%A3o+dispon%C3%ADvel+para+recusa.');
    }

    await db.prepare(
        'UPDATE quotations SET status = "rejected", updated_at = datetime("now") WHERE id = ?'
    ).bind(quoteId).run();

    if (quote.service_request_id) {
        await db.prepare(
            'UPDATE service_requests SET status = "analyzing", updated_at = datetime("now") WHERE id = ?'
        ).bind(quote.service_request_id).run();

        await recordRequestTimeline(db, {
            serviceRequestId: Number(quote.service_request_id),
            userId: user.id,
            action: 'client_rejected',
            fromStatus: 'quotation_sent',
            toStatus: 'analyzing',
            notes: 'Proposta recusada pelo cliente via Portal — aguardando revisão',
        });
    }

    return c.redirect('/portal/orcamentos?success=Proposta+recusada.+Nossa+equipe+entrar%C3%A1+em+contato+para+reajuste.');
});

// 4. Solicitações
portalRoutes.get('/solicitacoes', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const requests = await db.prepare(
        'SELECT * FROM service_requests WHERE client_id = ? ORDER BY created_at DESC'
    ).bind(client.id).all();

    return c.html(
        <PortalRequestsView
            currentUser={user}
            clientName={client.company || client.name}
            requests={requests.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.get('/solicitacoes/nova', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const services = await db.prepare(
        'SELECT * FROM services WHERE is_active = 1 ORDER BY name ASC'
    ).all();

    return c.html(
        <PortalRequestsView
            currentUser={user}
            clientName={client.company || client.name}
            services={services.results || []}
            isCreate={true}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/solicitacoes', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const body = await getRequestBody(c);

    const serviceId = Number(body.service_id);
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const rawBudget = body.estimated_budget !== undefined && String(body.estimated_budget).trim() !== ''
        ? Number(body.estimated_budget)
        : null;
    const desiredDeadline = body.desired_deadline ? String(body.desired_deadline).trim().slice(0, 20) : null;

    if (!title || !description) {
        return c.redirect('/portal/solicitacoes/nova?error=T%C3%ADtulo+e+descri%C3%A7%C3%A3o+s%C3%A3o+obrigat%C3%B3rios.');
    }
    if (rawBudget !== null && (!Number.isFinite(rawBudget) || rawBudget < 0)) {
        return c.redirect('/portal/solicitacoes/nova?error=' + encodeURIComponent('Informe um valor de orçamento estimado válido (maior ou igual a zero).'));
    }
    const estimatedBudget = rawBudget;

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randBytes = new Uint8Array(4);
    crypto.getRandomValues(randBytes);
    const randomSuffix = Array.from(randBytes, (b) => alphabet[b % alphabet.length]).join('');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${randomSuffix}`;

    const insertRes = await db.prepare(
        `INSERT INTO service_requests (
            protocol, tracking_code, client_id, user_id, service_id, name, company, email, phone,
            title, service_title, description, estimated_budget, desired_deadline, status,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`
    ).bind(
        protocol,
        protocol,
        client.id,
        user.id,
        serviceId || null,
        user.name,
        client.company || user.name,
        user.email,
        user.phone || null,
        title,
        title,
        description,
        estimatedBudget,
        desiredDeadline
    ).run();

    const newReqId = Number(insertRes.meta.last_row_id);

    await recordRequestTimeline(db, {
        serviceRequestId: newReqId,
        userId: user.id,
        action: 'created',
        fromStatus: null,
        toStatus: 'new',
        notes: 'Solicitação aberta diretamente pelo Portal do Cliente.'
    });

    // Notifica equipe sobre nova solicitação aberta pelo Portal
    try {
        const staffTo = c.env.STAFF_NOTIFY_EMAIL || 'gundjatech@gmail.com';
        const appUrl = (c.env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');
        await sendEmail(c.env, {
            to: staffTo,
            subject: `[PORTAL] Nova Solicitação ${protocol} • ${client.company || client.name}`,
            html: renderEmailTemplate(
                'Nova Solicitação via Portal do Cliente',
                `<p>O cliente <strong>${escapeEmailHtml(client.company || client.name)}</strong> abriu uma nova solicitação no Portal.</p>
                 <p><strong>Protocolo:</strong> ${escapeEmailHtml(protocol)}<br/><strong>Demanda:</strong> ${escapeEmailHtml(title)}</p>`,
                { text: 'Abrir Solicitação no Admin', url: `${appUrl}/admin/solicitacoes/${newReqId}` }
            )
        });
    } catch {}

    return c.redirect(`/portal/solicitacoes/${newReqId}?success=Solicita%C3%A7%C3%A3o+criada+com+sucesso!+Protocolo:+${protocol}`);
});

// Cancelamento pelo cliente permitido EXCLUSIVAMENTE enquanto status === 'new' (respeita travas de fase e CDC)
portalRoutes.post('/solicitacoes/:id/cancelar', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const reqId = Number(c.req.param('id'));

    const cancelRes = await db.prepare(
        `UPDATE service_requests SET status = 'cancelled', updated_at = datetime('now')
         WHERE id = ? AND client_id = ? AND status = 'new'`
    ).bind(reqId, client.id).run();

    if (!cancelRes.meta?.changes) {
        return c.redirect(`/portal/solicitacoes/${reqId}?error=${encodeURIComponent('Esta solicitação já entrou em análise ou execução e não pode ser cancelada diretamente. Fale com nossa equipe no chat.')}`);
    }

    await recordRequestTimeline(db, {
        serviceRequestId: reqId,
        userId: user.id,
        action: 'cancelled',
        fromStatus: 'new',
        toStatus: 'cancelled',
        notes: 'Solicitação cancelada pelo cliente antes do início da análise técnica.'
    });

    return c.redirect(`/portal/solicitacoes/${reqId}?success=${encodeURIComponent('Solicitação cancelada com sucesso.')}`);
});

portalRoutes.get('/solicitacoes/:id', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const reqId = Number(c.req.param('id'));

    const request = await db.prepare(
        'SELECT * FROM service_requests WHERE id = ? AND client_id = ?'
    ).bind(reqId, client.id).first();

    if (!request) {
        return c.text('Solicitação não encontrada.', 404);
    }

    const history = await db.prepare(
        'SELECT * FROM request_status_histories WHERE service_request_id = ? ORDER BY created_at DESC'
    ).bind(reqId).all();

    let linkedQuotation: any = null;
    let pendingInvoice: any = null;
    try {
        linkedQuotation = await db.prepare(
            'SELECT * FROM quotations WHERE service_request_id = ? AND status != "draft" ORDER BY id DESC LIMIT 1'
        ).bind(reqId).first();
        if (linkedQuotation?.id) {
            pendingInvoice = await db.prepare(
                `SELECT id, amount, due_date, status, description
                 FROM financial_transactions
                 WHERE client_id = ? AND quotation_id = ? AND type = 'income' AND status IN ('pending', 'overdue')
                 ORDER BY id DESC LIMIT 1`
            ).bind(client.id, linkedQuotation.id).first();
        }
    } catch {}

    return c.html(
        <PortalRequestsView
            currentUser={user}
            clientName={client.company || client.name}
            requestDetail={request}
            history={history.results || []}
            linkedQuotation={linkedQuotation}
            pendingInvoice={pendingInvoice}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/solicitacoes/:id/aprovar', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const reqId = Number(c.req.param('id'));

    const request = (await db.prepare(
        'SELECT * FROM service_requests WHERE id = ? AND client_id = ?'
    ).bind(reqId, client.id).first()) as any;

    if (!request || request.status !== 'quotation_sent') {
        return c.redirect(`/portal/solicitacoes/${reqId}?error=Solicita%C3%A7%C3%A3o+n%C3%A3o+est%C3%A1+aguardando+aprova%C3%A7%C3%A3o.`);
    }

    let linkedQuote: any = null;
    try {
        linkedQuote = await db.prepare(
            'SELECT * FROM quotations WHERE service_request_id = ? ORDER BY id DESC LIMIT 1'
        ).bind(reqId).first();
    } catch {}

    // Valida validade da proposta vinculada (CDC Arts. 30/35) antes de aprovar
    if (linkedQuote?.valid_until) {
        const validEnd = new Date(`${String(linkedQuote.valid_until).slice(0, 10)}T23:59:59Z`).getTime();
        if (!isNaN(validEnd) && validEnd < Date.now()) {
            return c.redirect(`/portal/solicitacoes/${reqId}?error=${encodeURIComponent('O orçamento vinculado expirou. Clique em "Solicitar Revisão" para atualizar a proposta.')}`);
        }
    }

    const reqLockRes = await db.prepare(
        'UPDATE service_requests SET status = "in_progress", updated_at = datetime("now") WHERE id = ? AND client_id = ? AND status = "quotation_sent"'
    ).bind(reqId, client.id).run();
    if (!reqLockRes.meta?.changes) {
        return c.redirect(`/portal/solicitacoes/${reqId}?error=Esta+solicita%C3%A7%C3%A3o+j%C3%A1+foi+aprovada.`);
    }

    try {
        await db.prepare(
            'UPDATE quotations SET status = "approved", updated_at = datetime("now") WHERE service_request_id = ? AND status = "sent"'
        ).bind(reqId).run();
    } catch {}

    // Cria automaticamente o Projeto em Execução (50%) e move a solicitação para Em Execução (in_progress)
    const projectName = String(linkedQuote?.title || request.service_title || request.title || `Projeto • ${request.protocol || reqId}`).trim();
    const baseSlug = projectName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48) || 'projeto';
    const projectSlug = `${baseSlug}-${Date.now().toString(36)}`;
    const projectDesc = String(linkedQuote?.notes || request.description || 'Projeto iniciado após aprovação de orçamento pelo Portal do Cliente').trim();

    let createdProjectId: number | undefined;
    let createdInvoiceId: number | undefined;
    try {
        await db.prepare(`UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(client.id).run();
        try {
            const insProj = await db.prepare(
                `INSERT INTO projects (client_id, quotation_id, service_request_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
            ).bind(client.id, linkedQuote?.id || null, reqId || null, projectName, projectName, projectSlug, projectDesc).run();
            createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
        } catch {
            const insProj = await db.prepare(
                `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
            ).bind(client.id, projectName, projectName, projectSlug, projectDesc).run();
            createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
        }

        if (createdProjectId) {
            const defaultStages = [
                '1. Levantamento Técnico & Arquitetura',
                '2. Desenvolvimento & Implementação',
                '3. Testes & Homologação com Cliente',
                '4. Deploy & Entrega Final'
            ];
            for (let i = 0; i < defaultStages.length; i++) {
                await db.prepare(
                    `INSERT INTO project_stages (project_id, title, status, sort_order, created_at, updated_at)
                     VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`
                ).bind(createdProjectId, defaultStages[i], i + 1).run();
            }
        }

        const quoteAmt = Number(linkedQuote?.final_amount ?? linkedQuote?.total_amount ?? request.estimated_budget ?? 0);
        if (quoteAmt > 0) {
            const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            const invRes = await db.prepare(
                `INSERT INTO financial_transactions (client_id, project_id, quotation_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
                 VALUES (?, ?, ?, 'income', 'contract', ?, ?, 'pending', ?, 'PIX', ?, datetime('now'), datetime('now'))`
            ).bind(
                client.id,
                createdProjectId || null,
                linkedQuote?.id || null,
                `Contrato Aprovado: ${projectName}${linkedQuote?.reference_code ? ` (Orçamento ${linkedQuote.reference_code})` : ''}`,
                quoteAmt,
                dueDate,
                linkedQuote?.reference_code || request.protocol || `REQ-${reqId}`
            ).run();
            createdInvoiceId = Number(invRes?.meta?.last_row_id || 0) || undefined;
        }
    } catch {}

    await db.prepare(
        'UPDATE service_requests SET status = "in_progress", updated_at = datetime("now") WHERE id = ?'
    ).bind(reqId).run();

    await recordRequestTimeline(db, {
        serviceRequestId: reqId,
        userId: user.id,
        action: 'client_approved',
        fromStatus: 'quotation_sent',
        toStatus: 'approved',
        notes: 'Orçamento aprovado pelo cliente via Portal do Cliente!',
    });

    await recordRequestTimeline(db, {
        serviceRequestId: reqId,
        userId: user.id,
        action: 'converted_to_project',
        fromStatus: 'approved',
        toStatus: 'in_progress',
        notes: `Projeto${createdProjectId ? ` #${createdProjectId}` : ''} criado e iniciado automaticamente após aprovação do orçamento`,
    });

    // Registra prova de aceite eletrônico (MP 2.200-2 / CDC)
    try {
        const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const userAgent = String(c.req.header('user-agent') || '').slice(0, 240);
        await db.prepare(
            `INSERT INTO activity_logs (user_id, action, model_type, model_id, metadata, ip_address, user_agent, created_at, updated_at)
             VALUES (?, 'portal.request_quote_approved', 'ServiceRequest', ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
            user.id,
            reqId,
            JSON.stringify({
                protocol: request.protocol,
                quotation_id: linkedQuote?.id || null,
                project_id: createdProjectId || null,
                accepted_at: new Date().toISOString()
            }),
            clientIp,
            userAgent
        ).run();
    } catch {}

    const approvedReqAmt = Number(linkedQuote?.final_amount ?? linkedQuote?.total_amount ?? request.estimated_budget ?? 0);
    if (approvedReqAmt > 0) {
        const invParam = createdInvoiceId ? String(createdInvoiceId) : '1';
        return c.redirect(
            `/portal/solicitacoes/${reqId}?fatura_gerada=${encodeURIComponent(invParam)}&valor=${encodeURIComponent(String(approvedReqAmt))}&success=` +
            encodeURIComponent('Orçamento aprovado com sucesso! Fatura gerada para liberação do projeto.')
        );
    }

    return c.redirect(`/portal/solicitacoes/${reqId}?success=Or%C3%A7amento+aprovado+com+sucesso!+Seu+projeto+j%C3%A1+entrou+em+execu%C3%A7%C3%A3o.`);
});

portalRoutes.post('/solicitacoes/:id/recusar', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const reqId = Number(c.req.param('id'));

    const request = (await db.prepare(
        'SELECT * FROM service_requests WHERE id = ? AND client_id = ?'
    ).bind(reqId, client.id).first()) as any;

    if (!request || request.status !== 'quotation_sent') {
        return c.redirect(`/portal/solicitacoes/${reqId}?error=Solicita%C3%A7%C3%A3o+n%C3%A3o+est%C3%A1+aguardando+aprova%C3%A7%C3%A3o.`);
    }

    await db.prepare(
        'UPDATE service_requests SET status = "analyzing", updated_at = datetime("now") WHERE id = ?'
    ).bind(reqId).run();

    try {
        await db.prepare(
            'UPDATE quotations SET status = "rejected", updated_at = datetime("now") WHERE service_request_id = ? AND status = "sent"'
        ).bind(reqId).run();
    } catch {}

    await recordRequestTimeline(db, {
        serviceRequestId: reqId,
        userId: user.id,
        action: 'client_rejected',
        fromStatus: 'quotation_sent',
        toStatus: 'analyzing',
        notes: 'Cliente solicitou revisão do orçamento via Portal',
    });

    return c.redirect(`/portal/solicitacoes/${reqId}?success=Solicita%C3%A7%C3%A3o+de+revis%C3%A3o+enviada+para+nossa+equipe.`);
});

// 5. Domínios
portalRoutes.get('/dominios', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const domains = await db.prepare(
        'SELECT * FROM domains WHERE client_id = ? ORDER BY expires_at ASC'
    ).bind(client.id).all();

    return c.html(
        <PortalDomainsView
            currentUser={user}
            clientName={client.company || client.name}
            domains={domains.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/dominios/:id/renovacao', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const domainId = Number(c.req.param('id'));

    const domain = (await db.prepare(
        'SELECT * FROM domains WHERE id = ? AND client_id = ?'
    ).bind(domainId, client.id).first()) as any;

    if (!domain) {
        return c.redirect('/portal/dominios?error=Dom%C3%ADnio+n%C3%A3o+encontrado.');
    }

    const renewTitle = `Renovação de Domínio: ${domain.domain_name}`;
    const existingRenew = (await db.prepare(
        `SELECT id, protocol FROM service_requests
         WHERE client_id = ? AND service_title = ? AND status IN ('new', 'analyzing', 'quotation_sent')
         LIMIT 1`
    ).bind(client.id, renewTitle).first()) as { id: number; protocol: string } | null;

    if (existingRenew) {
        return c.redirect(`/portal/dominios?error=${encodeURIComponent(`Já existe uma solicitação de renovação em aberto para ${domain.domain_name} (${existingRenew.protocol}).`)}`);
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randBytes = new Uint8Array(4);
    crypto.getRandomValues(randBytes);
    const randomSuffix = Array.from(randBytes, (b) => alphabet[b % alphabet.length]).join('');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `REN-${dateStr}-${randomSuffix}`;

    const renewIns = await db.prepare(
        `INSERT INTO service_requests (
            protocol, tracking_code, client_id, user_id, name, company, email, phone,
            title, service_title, description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`
    ).bind(
        protocol,
        protocol,
        client.id,
        user.id,
        user.name,
        client.company || user.name,
        user.email,
        user.phone || null,
        renewTitle,
        renewTitle,
        `Solicitação de renovação anual do domínio ${domain.domain_name} via Portal do Cliente.`
    ).run();

    const renewReqId = Number(renewIns.meta?.last_row_id || 0);
    if (renewReqId > 0) {
        await recordRequestTimeline(db, {
            serviceRequestId: renewReqId,
            userId: user.id,
            action: 'created',
            fromStatus: null,
            toStatus: 'new',
            notes: `Solicitação de renovação do domínio ${domain.domain_name} aberta pelo cliente.`
        });
    }

    return c.redirect(`/portal/dominios?success=Solicita%C3%A7%C3%A3o+de+renova%C3%A7%C3%A3o+registrada+(Protocolo+${protocol})!`);
});

// 6. Financeiro
portalRoutes.get('/financeiro', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const [txsRes, bankSettings, gatewayCfg] = await Promise.all([
        db.prepare(
            'SELECT * FROM financial_transactions WHERE client_id = ? ORDER BY due_date DESC'
        ).bind(client.id).all(),
        loadBankPaymentSettings(db),
        loadPixGatewayConfig(db)
    ]);

    const proofMap = new Map<number, string>();
    try {
        const payRes = await db.prepare(
            `SELECT p.financial_transaction_id, p.proof_file
             FROM payments p
             INNER JOIN financial_transactions t ON t.id = p.financial_transaction_id
             WHERE t.client_id = ? AND p.proof_file IS NOT NULL
             ORDER BY p.id ASC`
        ).bind(client.id).all();
        for (const p of (payRes?.results || []) as any[]) {
            if (p.financial_transaction_id && p.proof_file) {
                proofMap.set(Number(p.financial_transaction_id), String(p.proof_file));
            }
        }
    } catch { }

    const transactions = (txsRes.results || []).map((t: any) => {
        const isUnpaid = t.status !== 'paid' && t.status !== 'canceled';
        const txid = `GTFAT${String(t.id).padStart(5, '0')}`;
        const pixPayload = isUnpaid
            ? generatePixPayload({
                pixKey: bankSettings.pixKey,
                merchantName: bankSettings.pixHolder,
                merchantCity: bankSettings.pixCity,
                amount: Number(t.amount || 0),
                txid,
                description: `Fatura ${t.invoice_number || t.id}`
            })
            : '';
        return {
            ...t,
            proof_file: proofMap.get(Number(t.id)) || t.proof_file || null,
            pix_payload: pixPayload,
            pix_qr_data_uri: pixPayload ? renderQrCodeDataUri(pixPayload) : '',
            pix_txid: txid
        };
    });

    return c.html(
        <PortalFinanceView
            currentUser={user}
            clientName={client.company || client.name}
            transactions={transactions}
            bankSettings={bankSettings}
            pixGatewayProvider={gatewayCfg.provider}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/financeiro/:id/comprovante', rateLimit({ keyPrefix: 'portal_receipt', maxRequests: 10, windowSeconds: 300 }), async (c) => {
    const { db, client } = await getClientContext(c);
    const txId = Number(c.req.param('id'));

    const tx = (await db.prepare(
        `SELECT * FROM financial_transactions WHERE id = ? AND client_id = ?`
    ).bind(txId, client.id).first()) as any;

    if (!tx) {
        return c.redirect('/portal/financeiro?error=Fatura+n%C3%A3o+encontrada.');
    }

    if (tx.status === 'paid' || tx.status === 'canceled') {
        return c.redirect('/portal/financeiro?error=Esta+fatura+n%C3%A3o+aceita+mais+envio+de+comprovante.');
    }
    if (tx.status === 'reviewing') {
        return c.redirect('/portal/financeiro?error=' + encodeURIComponent('Já existe um comprovante em análise para esta fatura. Aguarde a conferência da equipe financeira.'));
    }

    try {
        const formData = await c.req.formData();
        const file = formData.get('receipt') as File | null;
        const rawMethod = String(formData.get('payment_method') || 'PIX').trim();
        const chosenMethod = rawMethod === 'Transferência / TED' ? 'Transferência / TED' : 'PIX';

        if (!file || typeof file === 'string' || file.size === 0) {
            return c.redirect('/portal/financeiro?error=Selecione+um+arquivo+de+comprovante+(PDF,+JPG+ou+PNG).');
        }
        if (file.size > 10 * 1024 * 1024) {
            return c.redirect('/portal/financeiro?error=O+comprovante+deve+ter+no+m%C3%A1ximo+10MB.');
        }

        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
            return c.redirect('/portal/financeiro?error=Formato+inv%C3%A1lido.+Envie+PDF,+PNG,+JPG+ou+WEBP.');
        }

        const buf = await file.arrayBuffer();
        if (!validateReceiptMagicBytes(buf, ext)) {
            return c.redirect('/portal/financeiro?error=Arquivo+inv%C3%A1lido+ou+corrompido.+Envie+um+PDF,+PNG,+JPG+ou+WEBP+leg%C3%ADtimo.');
        }

        const r2Key = `private/receipts/client-${client.id}/fat-${tx.id}-${Date.now()}.${ext}`;
        if (c.env.UPLOADS_BUCKET) {
            await c.env.UPLOADS_BUCKET.put(r2Key, buf, {
                httpMetadata: { contentType: ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}` }
            });
        }

        await db.batch([
            db.prepare(
                `INSERT INTO payments (financial_transaction_id, amount, payment_method, transaction_reference, proof_file, status, paid_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'reviewing', datetime('now'), datetime('now'), datetime('now'))`
            ).bind(tx.id, tx.amount, chosenMethod, `GTFAT${String(tx.id).padStart(5, '0')}`, r2Key),
            db.prepare(
                `UPDATE financial_transactions
                 SET status = 'reviewing',
                     payment_method = ?,
                     notes = NULL,
                     updated_at = datetime('now')
                 WHERE id = ? AND client_id = ? AND status NOT IN ('paid', 'canceled')`
            ).bind(chosenMethod, tx.id, client.id)
        ]);

        // Notifica o financeiro por e-mail (template seguro com escapeHtml)
        try {
            const staffTo = c.env.STAFF_NOTIFY_EMAIL || 'gundjatech@gmail.com';
            const appUrl = (c.env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');
            const valFmt = Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            await sendEmail(c.env, {
                to: staffTo,
                subject: `Comprovante recebido • Fatura #${tx.id} (R$ ${valFmt})`,
                html: renderEmailTemplate(
                    'Comprovante de Pagamento Recebido',
                    `<p>O cliente <strong>${escapeEmailHtml(client.company || client.name)}</strong> enviou um comprovante de pagamento via <strong>${escapeEmailHtml(chosenMethod)}</strong>.</p>
                     <p><strong>Fatura:</strong> ${escapeEmailHtml(tx.description)}<br/><strong>Valor:</strong> R$ ${valFmt}</p>`,
                    { text: 'Abrir Financeiro para Conferência & Baixa', url: `${appUrl}/admin/financeiro` }
                )
            });
        } catch (mailErr) {
            console.error('[Portal Comprovante] Erro ao notificar financeiro:', mailErr);
        }

        return c.redirect('/portal/financeiro?success=Comprovante+enviado+com+sucesso!+Nossa+equipe+confirmar%C3%A1+o+recebimento+em+instantes.');
    } catch {
        return c.redirect('/portal/financeiro?error=N%C3%A3o+foi+poss%C3%ADvel+enviar+o+comprovante.');
    }
});

portalRoutes.get('/financeiro/:id/comprovante', async (c) => {
    const { db, client } = await getClientContext(c);
    const txId = Number(c.req.param('id'));

    const row = (await db.prepare(
        `SELECT p.proof_file
         FROM payments p
         INNER JOIN financial_transactions t ON t.id = p.financial_transaction_id
         WHERE t.id = ? AND t.client_id = ? AND p.proof_file IS NOT NULL
         ORDER BY p.id DESC LIMIT 1`
    ).bind(txId, client.id).first()) as { proof_file?: string } | null;

    if (!row?.proof_file || !c.env.UPLOADS_BUCKET) {
        return c.text('Comprovante não encontrado', 404);
    }

    const obj = await c.env.UPLOADS_BUCKET.get(row.proof_file);
    if (!obj) return c.text('Arquivo não encontrado', 404);

    const headers = new Headers();
    headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="comprovante-fatura-${txId}"`);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Content-Security-Policy', 'sandbox');
    headers.set('Cache-Control', 'private, no-store');
    return new Response(obj.body, { headers });
});

// Status ao vivo da fatura (polling do modal de pagamento a cada 3,5s)
portalRoutes.get('/financeiro/:id/status', async (c) => {
    const { db, client } = await getClientContext(c);
    const txId = Number(c.req.param('id'));

    const tx = (await db.prepare(
        `SELECT id, status, paid_at, amount FROM financial_transactions WHERE id = ? AND client_id = ?`
    ).bind(txId, client.id).first()) as any;

    if (!tx) {
        return c.json({ error: 'Fatura não encontrada' }, 404);
    }

    // Se ainda não foi paga e há cobrança dinâmica ativa no gateway, faz checagem ao vivo
    if (tx.status !== 'paid' && tx.status !== 'canceled' && c.env.KV_CACHE) {
        try {
            const gwRaw = await c.env.KV_CACHE.get(`pix_tx_gw:${txId}`);
            if (gwRaw) {
                const gw = JSON.parse(gwRaw) as { provider: 'mercadopago' | 'asaas'; gatewayPaymentId: string };
                const check = await verifyGatewayPaymentPaid(db, gw.provider, gw.gatewayPaymentId);
                if (check.paid) {
                    const settledRes = await settleInvoiceAsPaid(c.env, db, txId, {
                        provider: gw.provider === 'mercadopago' ? 'Mercado Pago PIX' : 'Asaas PIX',
                        gatewayReference: gw.gatewayPaymentId,
                        paidAmount: check.amount
                    });
                    if (settledRes.settled || settledRes.alreadyPaid) {
                        return c.json({
                            id: txId,
                            status: 'paid',
                            paid_at: new Date().toISOString(),
                            receipt_url: `/portal/financeiro/${txId}/recibo`
                        });
                    }
                }
            }
        } catch { }
    }

    return c.json({
        id: txId,
        status: tx.status,
        paid_at: tx.paid_at || null,
        receipt_url: tx.status === 'paid' ? `/portal/financeiro/${txId}/recibo` : null
    });
});

// Geração sob demanda de PIX Dinâmico (Mercado Pago / Asaas) ao abrir o modal
portalRoutes.post('/financeiro/:id/gerar-pix', async (c) => {
    const { db, client } = await getClientContext(c);
    const txId = Number(c.req.param('id'));

    const tx = (await db.prepare(
        `SELECT * FROM financial_transactions WHERE id = ? AND client_id = ?`
    ).bind(txId, client.id).first()) as any;

    if (!tx) return c.json({ ok: false, error: 'Fatura não encontrada' }, 404);
    if (tx.status === 'paid') {
        return c.json({ ok: true, status: 'paid', receipt_url: `/portal/financeiro/${txId}/recibo` });
    }
    if (tx.status === 'canceled') {
        return c.json({ ok: false, error: 'Fatura cancelada' }, 400);
    }

    const dynamicCharge = await getOrCreateDynamicPixCharge(c.env, db, tx, client);
    if (!dynamicCharge) {
        return c.json({ ok: true, mode: 'static' });
    }

    return c.json({
        ok: true,
        mode: 'dynamic',
        provider: dynamicCharge.provider,
        pixPayload: dynamicCharge.pixPayload,
        qrDataUri: dynamicCharge.qrDataUri,
        gatewayPaymentId: dynamicCharge.gatewayPaymentId
    });
});

portalRoutes.get('/financeiro/:id/recibo', async (c) => {
    const { db, client } = await getClientContext(c);
    const txId = Number(c.req.param('id'));

    const tx = (await db.prepare(
        `SELECT * FROM financial_transactions WHERE id = ? AND client_id = ? AND status = 'paid'`
    ).bind(txId, client.id).first()) as any;

    if (!tx) {
        return c.text('Recibo disponível apenas para faturas quitadas.', 404);
    }

    const bankSettings = await loadBankPaymentSettings(db);
    return c.html(renderOfficialPaymentReceiptHtml({ tx, client, bankSettings }));
});

// 7. Campanhas
portalRoutes.get('/campanhas', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const campaigns = await db.prepare(
        'SELECT * FROM advertising_campaigns WHERE client_id = ? ORDER BY created_at DESC'
    ).bind(client.id).all();

    return c.html(
        <PortalCampaignsView
            currentUser={user}
            clientName={client.company || client.name}
            campaigns={campaigns.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

// 8. Falar com Atendimento (Chat Interno do Portal)
portalRoutes.get('/atendimento', async (c) => {
    const { user, db, client } = await getClientContext(c);

    let conversation = (await db.prepare(
        'SELECT * FROM conversations WHERE client_id = ? AND channel = "web_chat" AND status IN ("open", "waiting_client", "waiting_staff") ORDER BY updated_at DESC LIMIT 1'
    ).bind(client.id).first()) as any;

    if (!conversation) {
        const createRes = await db.prepare(
            `INSERT INTO conversations (client_id, subject, channel, status, ai_enabled, crm_stage, lead_score, created_at, updated_at)
             VALUES (?, ?, 'web_chat', 'open', 1, 'active_client', 50, datetime('now'), datetime('now'))`
        ).bind(client.id, `Atendimento Geral ${client.company || client.name}`).run();

        const convId = Number(createRes.meta.last_row_id);
        conversation = {
            id: convId,
            client_id: client.id,
            subject: `Atendimento Geral ${client.company || client.name}`,
            channel: 'web_chat',
            status: 'open'
        };
    }

    const messagesRes = await db.prepare(
        'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC'
    ).bind(conversation.id).all();

    return c.html(
        <PortalChatView
            currentUser={user}
            clientName={client.company || client.name}
            conversation={conversation}
            messages={messagesRes.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
});

portalRoutes.post('/atendimento/:id/mensagem', rateLimit({ keyPrefix: 'portal_chat_msg', maxRequests: 40, windowSeconds: 60 }), async (c) => {
    const { user, db, client } = await getClientContext(c);
    const convId = Number(c.req.param('id'));
    const body = await getRequestBody(c);
    const message = String(body.message || '').trim();

    if (!message) {
        return c.redirect('/portal/atendimento');
    }
    if (message.length > 2000) {
        return c.redirect('/portal/atendimento?error=' + encodeURIComponent('A mensagem deve ter no máximo 2.000 caracteres.'));
    }

    // Isolamento multi-tenant: garante que a conversa pertence ao cliente autenticado
    const ownedConv = (await db.prepare(
        'SELECT id, ai_enabled FROM conversations WHERE id = ? AND client_id = ?'
    ).bind(convId, client.id).first()) as { id: number; ai_enabled?: number } | null;

    if (!ownedConv) {
        return c.json({ error: 'Acesso não autorizado a esta conversa.' }, 403);
    }

    await db.prepare(
        `INSERT INTO conversation_messages (conversation_id, sender_type, sender_id, message, is_ai, created_at, updated_at)
         VALUES (?, 'client', ?, ?, 0, datetime('now'), datetime('now'))`
    ).bind(convId, user.id, message).run();

    await db.prepare(
        'UPDATE conversations SET status = "waiting_staff", last_message_at = datetime("now"), updated_at = datetime("now") WHERE id = ?'
    ).bind(convId).run();

    // Se a conversa estiver com Piloto IA ativo (e IA global ativa), responde automaticamente
    try {
        let globalAiEnabled = true;
        try {
            const cfg = (await db.prepare(`SELECT value FROM system_settings WHERE key = 'crm_ai_enabled'`).first()) as { value: string } | null;
            if (cfg && cfg.value === '0') globalAiEnabled = false;
        } catch {}

        if (globalAiEnabled && Boolean(ownedConv.ai_enabled ?? 1)) {
            const agent = new AutonomousCrmAgent(c.env);
            await agent.handleIncomingMessage(convId, message, client.name);
        }
    } catch {}

    return c.redirect('/portal/atendimento?success=Mensagem+enviada+com+sucesso!');
});

// Arquivamento lógico seguro ("Nova Conversa / Limpar Chat"):
// Preserva integralmente a conversa e mensagens no D1 para auditoria, CRM e jurídico (zero DELETE físico).
portalRoutes.post('/atendimento/:id/nova-conversa', rateLimit({ keyPrefix: 'portal_chat_clear', maxRequests: 10, windowSeconds: 60 }), async (c) => {
    const { user, db, client } = await getClientContext(c);
    const convId = Number(c.req.param('id'));

    const ownedConv = (await db.prepare(
        'SELECT id, status FROM conversations WHERE id = ? AND client_id = ?'
    ).bind(convId, client.id).first()) as { id: number; status?: string } | null;

    if (!ownedConv) {
        return c.json({ error: 'Acesso não autorizado a esta conversa.' }, 403);
    }

    if (ownedConv.status !== 'closed') {
        await db.prepare(
            `UPDATE conversations SET status = 'closed', updated_at = datetime('now') WHERE id = ? AND client_id = ?`
        ).bind(convId, client.id).run();

        try {
            const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
            const userAgent = c.req.header('user-agent') || 'unknown';
            await db.prepare(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
                 VALUES (?, 'portal_chat_archived', 'conversation', ?, ?, ?, ?, datetime('now'))`
            ).bind(
                user.id,
                convId,
                JSON.stringify({ archived_by: 'client', client_id: client.id, preserved_for_audit: true }),
                clientIp,
                userAgent
            ).run();
        } catch {}
    }

    return c.redirect('/portal/atendimento?success=' + encodeURIComponent('Nova conversa iniciada! O histórico anterior permanece salvo com nossa equipe.'));
});

portalRoutes.get('/atendimento/:id/mensagens', async (c) => {
    const { db, client } = await getClientContext(c);
    const convId = Number(c.req.param('id'));
    const afterId = Number(c.req.query('after_id') || 0);

    const conv = await db.prepare(
        'SELECT id FROM conversations WHERE id = ? AND client_id = ?'
    ).bind(convId, client.id).first();

    if (!conv) {
        return c.json({ error: 'Acesso não autorizado' }, 403);
    }

    const query = afterId > 0
        ? 'SELECT * FROM conversation_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC LIMIT 100'
        : 'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 100';
    const stmt = afterId > 0 ? db.prepare(query).bind(convId, afterId) : db.prepare(query).bind(convId);
    const messages = await stmt.all();

    return c.json({ messages: messages.results || [] });
});

// Central de Notificações do Portal do Cliente (isolamento multi-tenant por client_id)
portalRoutes.get('/notificacoes/resumo', async (c) => {
    const { db, client } = await getClientContext(c);
    const notifications: any[] = [];

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

    let pendingBilling = {
        count: 0,
        total_amount: 0,
        next_invoice_id: null as number | null,
        next_due_date: null as string | null,
        has_overdue: false
    };

    try {
        const [pendingQuotes, pendingInvoices, waitingChats] = await Promise.all([
            db.prepare(
                `SELECT id, reference_code, title, final_amount, total_amount, updated_at
                 FROM quotations
                 WHERE client_id = ? AND status = 'sent'
                 ORDER BY updated_at DESC LIMIT 3`
            ).bind(client.id).all(),
            db.prepare(
                `SELECT id, description, amount, due_date, status, updated_at
                 FROM financial_transactions
                 WHERE client_id = ? AND status IN ('pending', 'overdue') AND type = 'income'
                 ORDER BY due_date ASC LIMIT 20`
            ).bind(client.id).all(),
            db.prepare(
                `SELECT id, subject, updated_at
                 FROM conversations
                 WHERE client_id = ? AND status = 'waiting_client'
                 ORDER BY updated_at DESC LIMIT 2`
            ).bind(client.id).all()
        ]);

        const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

        for (const q of (pendingQuotes.results || []) as any[]) {
            const val = brl.format(Number(q.final_amount ?? q.total_amount ?? 0));
            notifications.push({
                key: `pquote:${q.id}:${q.updated_at || ''}`,
                type: 'quotation',
                title: `Orçamento Aguardando Aprovação • ${q.reference_code || `#${q.id}`}`,
                subtitle: `${q.title || 'Proposta comercial'} (${val})`,
                time: formatTimeBrt(q.updated_at),
                url: `/portal/orcamentos/${q.id}`
            });
        }

        const invList = (pendingInvoices.results || []) as any[];
        if (invList.length > 0) {
            pendingBilling.count = invList.length;
            pendingBilling.total_amount = invList.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
            pendingBilling.next_invoice_id = Number(invList[0].id || 0) || null;
            pendingBilling.next_due_date = invList[0].due_date || null;
            pendingBilling.has_overdue = invList.some((inv) => inv.status === 'overdue' || (inv.due_date ? new Date(inv.due_date).getTime() < Date.now() : false));
        }

        for (const inv of invList.slice(0, 3)) {
            const val = brl.format(Number(inv.amount || 0));
            const isOverdue = inv.status === 'overdue' || (inv.due_date ? new Date(inv.due_date).getTime() < Date.now() : false);
            const dueLabel = inv.due_date ? String(inv.due_date).slice(5, 10).split('-').reverse().join('/') : '';
            notifications.push({
                key: `pinv:${inv.id}:${inv.due_date || ''}`,
                type: 'finance',
                title: `${isOverdue ? 'Fatura Vencida' : 'Pagamento Pendente'} • ${val}`,
                subtitle: inv.description || 'Cobrança disponível no Financeiro',
                time: dueLabel,
                url: `/portal/financeiro?pagar=${inv.id}`
            });
        }

        for (const chat of (waitingChats.results || []) as any[]) {
            notifications.push({
                key: `pchat:${chat.id}:${chat.updated_at || ''}`,
                type: 'chat',
                title: 'Nova resposta da equipe GundjaTech',
                subtitle: chat.subject || 'Clique para continuar no chat ao vivo',
                time: formatTimeBrt(chat.updated_at),
                url: '/portal/atendimento'
            });
        }
    } catch { }

    return c.json({
        ok: true,
        total_notifications: notifications.length,
        pending_billing: pendingBilling,
        notifications
    });
});
