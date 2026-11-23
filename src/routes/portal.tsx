import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getRequestBody } from '../lib/request';
import { ensureClientProfile, getPortalDashboard } from '../lib/client-portal';
import { getFile, streamR2Response } from '../lib/storage';
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

    return c.html(
        <PortalProjectsView
            currentUser={user}
            clientName={client.company || client.name}
            projects={projectsRes.results || []}
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
        const allowedExts = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'txt', 'csv'];
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

    const response = streamR2Response(c, object);
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
        'SELECT * FROM quotations WHERE id = ? AND client_id = ?'
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

    // Atualiza status do orçamento
    await db.prepare(
        'UPDATE quotations SET status = "approved", updated_at = datetime("now") WHERE id = ?'
    ).bind(quoteId).run();

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
    try {
        await db.prepare(`UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(client.id).run();
        const insProj = await db.prepare(
            `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
        ).bind(client.id, projectName, projectName, projectSlug, projectDesc).run();
        createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
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

    // Registra log de auditoria
    try {
        await db.prepare(
            `INSERT INTO activity_logs (user_id, action, subject_type, subject_id, details, created_at, updated_at)
             VALUES (?, 'portal.quotation_approved', 'Quotation', ?, ?, datetime('now'), datetime('now'))`
        ).bind(user.id, quoteId, JSON.stringify({ reference: quote.reference_code })).run();
    } catch {}

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
    const estimatedBudget = body.estimated_budget ? Number(body.estimated_budget) : null;
    const desiredDeadline = body.desired_deadline ? String(body.desired_deadline) : null;

    if (!title || !description) {
        return c.redirect('/portal/solicitacoes/nova?error=T%C3%ADtulo+e+descri%C3%A7%C3%A3o+s%C3%A3o+obrigat%C3%B3rios.');
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${randomSuffix}`;

    const insertRes = await db.prepare(
        `INSERT INTO service_requests (
            protocol, client_id, user_id, service_id, name, company, email, phone,
            service_title, description, estimated_budget, desired_deadline, status,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`
    ).bind(
        protocol,
        client.id,
        user.id,
        serviceId || null,
        user.name,
        client.company || user.name,
        user.email,
        user.phone || null,
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

    return c.redirect(`/portal/solicitacoes/${newReqId}?success=Solicita%C3%A7%C3%A3o+criada+com+sucesso!+Protocolo:+${protocol}`);
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
    try {
        linkedQuotation = await db.prepare(
            'SELECT * FROM quotations WHERE service_request_id = ? AND status != "draft" ORDER BY id DESC LIMIT 1'
        ).bind(reqId).first();
    } catch {}

    return c.html(
        <PortalRequestsView
            currentUser={user}
            clientName={client.company || client.name}
            requestDetail={request}
            history={history.results || []}
            linkedQuotation={linkedQuotation}
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
    try {
        await db.prepare(`UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(client.id).run();
        const insProj = await db.prepare(
            `INSERT INTO projects (client_id, name, title, slug, description, status, priority, progress_percentage, start_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'in_progress', 'high', 50, date('now'), datetime('now'), datetime('now'))`
        ).bind(client.id, projectName, projectName, projectSlug, projectDesc).run();
        createdProjectId = Number(insProj?.meta?.last_row_id || 0) || undefined;
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

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `REN-${dateStr}-${randomSuffix}`;

    await db.prepare(
        `INSERT INTO service_requests (
            protocol, client_id, user_id, service_title, description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`
    ).bind(
        protocol,
        client.id,
        user.id,
        `Renovação de Domínio: ${domain.domain_name}`,
        `Solicitação de renovação anual do domínio ${domain.domain_name} via Portal do Cliente.`
    ).run();

    return c.redirect(`/portal/dominios?success=Solicita%C3%A7%C3%A3o+de+renova%C3%A7%C3%A3o+registrada+(Protocolo+${protocol})!`);
});

// 6. Financeiro
portalRoutes.get('/financeiro', async (c) => {
    const { user, db, client } = await getClientContext(c);

    const txs = await db.prepare(
        'SELECT * FROM financial_transactions WHERE client_id = ? ORDER BY due_date DESC'
    ).bind(client.id).all();

    return c.html(
        <PortalFinanceView
            currentUser={user}
            clientName={client.company || client.name}
            transactions={txs.results || []}
            successMessage={c.req.query('success')}
            errorMessage={c.req.query('error')}
        />
    );
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
        'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
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

portalRoutes.post('/atendimento/:id/mensagem', async (c) => {
    const { user, db, client } = await getClientContext(c);
    const convId = Number(c.req.param('id'));
    const body = await getRequestBody(c);
    const message = String(body.message || '').trim();

    if (!message) {
        return c.redirect('/portal/atendimento');
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
        ? 'SELECT * FROM conversation_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC'
        : 'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC';
    const stmt = afterId > 0 ? db.prepare(query).bind(convId, afterId) : db.prepare(query).bind(convId);
    const messages = await stmt.all();

    return c.json({ messages: messages.results || [] });
});
