import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { renderPublicBladePage, renderPublicLayoutShell } from '../views/public-blade-templates';
import { getRequestBody } from '../lib/request';
import { sendQuoteConfirmationEmail, sendNewLeadStaffNotification } from '../lib/email';
import { rateLimit } from '../middleware/security';

export const publicRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function escapeHtml(str: unknown): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ----------------------------------------------------
// SOLICITAR ORÇAMENTO (Estrutura idêntica a resources/views/public/request-quote.blade.php)
// ----------------------------------------------------
publicRoutes.get('/solicitar-orcamento', async (c) => {
    const user = c.get('user');
    const serviceIdParam = c.req.query('service_id');
    const selectedServiceId = serviceIdParam ? parseInt(serviceIdParam, 10) : null;
    const errorMsg = c.req.query('error');

    let services: Array<{ id: number; name: string; slug: string; category?: string | null; price_starting_at?: number | null }> = [];
    try {
        if (c.env?.DB) {
            const res = await c.env.DB.prepare(
                `SELECT id, COALESCE(name, title) AS name, slug, category, COALESCE(price_starting_at, base_price, price, 0) AS price_starting_at
                 FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
            ).all<{ id: number; name: string; slug: string; category?: string | null; price_starting_at?: number | null }>();
            services = res.results || [];
        }
    } catch {}

    if (services.length === 0) {
        services = [
            { id: 1, name: 'Criação de Sites', slug: 'criacao-de-sites', category: 'Sites', price_starting_at: 6500 },
            { id: 2, name: 'Desenvolvimento Sob Medida', slug: 'desenvolvimento-de-sites', category: 'Sistemas', price_starting_at: 9800 },
            { id: 3, name: 'WordPress & WooCommerce', slug: 'criacao-de-sites-wordpress', category: 'Sites', price_starting_at: 4800 },
            { id: 4, name: 'Cibersegurança & DNS', slug: 'ciberseguranca', category: 'Segurança', price_starting_at: 2800 },
            { id: 5, name: 'Operação & Sustentação Contínua', slug: 'operacao-de-sites', category: 'Operação', price_starting_at: 1500 }
        ];
    }

    const optionsHtml = services
        .map((s) => {
            const sel = selectedServiceId === s.id ? 'selected' : '';
            const priceFmt = Number(s.price_starting_at || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `<option value="${s.id}" style="color:#000" ${sel}>[${escapeHtml(s.category || 'Geral')}] ${escapeHtml(s.name)} — A partir de R$ ${priceFmt}</option>`;
        })
        .join('\n');

    const errorBanner = errorMsg
        ? `<div class="cheio gt-auto-alert" style="background:rgba(242,46,62,.15);border:1px solid rgba(242,46,62,.4);color:#fff;padding:12px 16px;border-radius:12px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:12px">
             <span>${escapeHtml(errorMsg)}</span>
             <button type="button" onclick="this.closest('.gt-auto-alert').remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">&times;</button>
           </div>`
        : '';

    const contentHtml = `
<section class="hm-contato ct-topo" id="orcamento" aria-labelledby="orcamento-titulo">
  <div class="container hm-contato-grid">
    <div class="hm-contato-txt">
      <p class="ct-kicker">Orçamento &amp; Diagnóstico GundjaTech</p>
      <h1 id="orcamento-titulo">Solicite seu Orçamento — <em>proposta sob medida</em></h1>
      <p>Conte o que você precisa. Nosso sistema gera um protocolo único imediato e um diretor da GundjaTech responde em até 4 horas úteis.</p>

      <ul class="hm-contato-canais">
        <li>
          <a class="ct-whats-destaque" href="https://wa.me/5519953248420">
            <svg><use href="#i-whats"/></svg>
            <span><small>Prefere conversar agora?</small>Chamar no WhatsApp</span>
          </a>
        </li>
        <li>
          <a href="/acompanhar-solicitacao">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span><small>Já possui protocolo?</small>Acompanhar solicitação</span>
          </a>
        </li>
      </ul>
    </div>

    <form action="/solicitar-orcamento" method="POST" enctype="multipart/form-data" class="form hm-form">
      ${errorBanner}

      <label class="campo">Nome completo*
        <input type="text" name="contact_name" autocomplete="name" value="${escapeHtml(user?.name || '')}" required>
      </label>

      <label class="campo">Empresa
        <input type="text" name="company_name" autocomplete="organization" value="">
      </label>

      <label class="campo">E-mail corporativo*
        <input type="email" name="email" autocomplete="email" value="${escapeHtml(user?.email || '')}" required>
      </label>

      <label class="campo">Telefone / WhatsApp*
        <input type="tel" name="phone" autocomplete="tel" placeholder="(11) 90000-0000" value="" required>
      </label>

      <label class="campo cheio">Serviço desejado*
        <select name="service_id" required style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;color:#fff;font:inherit;margin-top:6px">
          <option value="" style="color:#000">Selecione o serviço...</option>
          ${optionsHtml}
        </select>
      </label>

      <label class="campo cheio">Título resumido do projeto*
        <input type="text" name="title" placeholder="Ex.: Criação de site institucional ou loja virtual" required>
      </label>

      <label class="campo">Orçamento estimado (R$)
        <input type="number" step="0.01" name="estimated_budget" placeholder="Ex.: 15000">
      </label>

      <label class="campo">Prazo desejado
        <input type="date" name="desired_deadline">
      </label>

      <label class="campo cheio">Descrição do projeto*
        <textarea name="description" rows="4" placeholder="Conte um pouco sobre os objetivos, funcionalidades e referências do projeto" required></textarea>
      </label>

      <div class="cheio hm-form-acoes">
        <label class="hm-anexo">
          <input type="file" name="attachment" class="js-anexo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/></svg>
          <span class="js-anexo-nome">Anexar briefing (opcional)</span>
        </label>

        <button type="submit" class="btn">Enviar solicitação <svg><use href="#i-seta"/></svg></button>
      </div>

      <p class="cheio hm-lgpd">Seus dados são usados só para responder à sua solicitação (LGPD).</p>
    </form>
  </div>
</section>`;

    return c.html(
        renderPublicLayoutShell({
            title: 'Solicitar Orçamento | GundjaTech',
            url: '/solicitar-orcamento',
            user,
            contentHtml
        })
    );
});

publicRoutes.post('/solicitar-orcamento', rateLimit({ keyPrefix: 'public_quote', maxRequests: 10, windowSeconds: 600 }), async (c) => {
    const body = await getRequestBody(c);
    const contactName = String(body.contact_name || '').trim();
    const companyName = String(body.company_name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const serviceId = body.service_id ? parseInt(String(body.service_id), 10) : null;
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const budget = body.estimated_budget ? parseFloat(String(body.estimated_budget)) : null;
    const deadline = body.desired_deadline ? String(body.desired_deadline) : null;

    if (!contactName || !email || !phone || !title || !description) {
        if (c.req.header('accept')?.includes('application/json')) {
            return c.json({ error: 'Preencha todos os campos obrigatórios.' }, 422);
        }
        return c.redirect('/solicitar-orcamento?error=Preencha+todos+os+campos+obrigatórios');
    }

    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${randomChars}`;

    try {
        if (c.env?.DB) {
            let client = await c.env.DB.prepare(
                `SELECT id FROM clients WHERE lower(email) = ?`
            ).bind(email).first<{ id: number }>();

            let clientId: number;
            if (!client) {
                const clientRes = await c.env.DB.prepare(
                    `INSERT INTO clients (name, email, phone, company, status, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'))`
                ).bind(contactName, email, phone, companyName || null).run();
                clientId = Number(clientRes.meta.last_row_id);
            } else {
                clientId = client.id;
            }

            const reqRes = await c.env.DB.prepare(
                `INSERT INTO service_requests (protocol, tracking_code, client_id, service_id, name, company, email, phone, title, service_title, description, estimated_budget, deadline, desired_deadline, status, internal_notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, datetime('now'), datetime('now'))`
            ).bind(
                protocol,
                protocol,
                clientId,
                serviceId,
                contactName,
                companyName || null,
                email,
                phone,
                title,
                title,
                description,
                budget,
                deadline,
                deadline,
                `Contato: ${contactName} | Tel: ${phone} | Empresa: ${companyName}`
            ).run();

            const requestId = Number(reqRes.meta.last_row_id);

            await c.env.DB.prepare(
                `INSERT INTO request_status_histories (service_request_id, status_from, status_to, new_status, notes, comment, created_at, updated_at)
                 VALUES (?, NULL, 'new', 'new', 'Solicitação registrada através do portal online.', 'Solicitação registrada através do portal online.', datetime('now'), datetime('now'))`
            ).bind(requestId).run();

            const file = body.attachment;
            if (file instanceof File && file.size > 0 && c.env?.UPLOADS_BUCKET) {
                const fileKey = `attachments/${protocol}/${file.name}`;
                const arrayBuffer = await file.arrayBuffer();
                await c.env.UPLOADS_BUCKET.put(fileKey, arrayBuffer, {
                    httpMetadata: { contentType: file.type }
                });

                await c.env.DB.prepare(
                    `INSERT INTO request_attachments (service_request_id, file_name, file_path, file_size, mime_type, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
                ).bind(requestId, file.name, fileKey, file.size, file.type).run();
            }

            await sendQuoteConfirmationEmail(c.env, email, contactName, protocol, title);
            await sendNewLeadStaffNotification(c.env, {
                name: contactName,
                email,
                phone,
                company: companyName,
                serviceTitle: title,
                protocol
            });
        }
    } catch (err) {
        console.error('Erro ao salvar solicitação:', err);
    }

    if (c.req.header('accept')?.includes('application/json')) {
        return c.json({
            ok: true,
            protocol,
            message: 'Solicitação registrada com sucesso!'
        }, 201);
    }

    return c.redirect(`/acompanhar-solicitacao?protocol=${protocol}`);
});

// ----------------------------------------------------
// ACOMPANHAR SOLICITAÇÃO (Estrutura idêntica a resources/views/public/track-request.blade.php)
// ----------------------------------------------------
publicRoutes.get('/acompanhar-solicitacao', async (c) => {
    const user = c.get('user');
    const protocol = c.req.query('protocol')?.trim().toUpperCase() || null;

    let serviceRequest: {
        id: number;
        title: string;
        service_title?: string | null;
        description: string;
        tracking_code: string;
        protocol?: string | null;
        status: string;
        created_at: string;
        estimated_budget?: number | null;
    } | null = null;

    let histories: Array<{ status_to: string; notes: string | null; created_at: string }> = [];

    if (protocol) {
        try {
            if (c.env?.DB) {
                serviceRequest = await c.env.DB.prepare(
                    `SELECT id, COALESCE(service_title, title) AS title, description, COALESCE(protocol, tracking_code) AS tracking_code, status, estimated_budget, created_at
                     FROM service_requests WHERE tracking_code = ? OR protocol = ?`
                ).bind(protocol, protocol).first();

                if (serviceRequest) {
                    const histRes = await c.env.DB.prepare(
                        `SELECT COALESCE(status_to, new_status) AS status_to, COALESCE(notes, comment) AS notes, created_at
                         FROM request_status_histories
                         WHERE service_request_id = ? ORDER BY id ASC`
                    ).bind(serviceRequest.id).all<{ status_to: string; notes: string | null; created_at: string }>();

                    histories = histRes.results || [];
                }
            }
        } catch {}
    }

    const statusLabels: Record<string, string> = {
        new: 'Nova Solicitação',
        pending: 'Em Análise Inicial',
        analyzing: 'Em Análise Técnica',
        awaiting_info: 'Aguardando Informações',
        waiting_info: 'Aguardando Informações',
        quotation_sent: 'Orçamento Enviado',
        quoted: 'Orçamento Enviado',
        awaiting_approval: 'Aguardando Aprovação',
        approved: 'Aprovada',
        in_progress: 'Em Execução / Projeto',
        completed: 'Concluída com Sucesso',
        cancelled: 'Cancelada'
    };

    let rightColumnHtml = '';
    if (serviceRequest) {
        const histHtml = histories
            .map(
                (h) => `
                <div>
                  <small style="color:#8F9BB7;font-size:11px">${escapeHtml(h.created_at)}</small>
                  <div style="color:#fff;font-weight:700;font-size:14px;margin-top:2px">
                    Status: ${escapeHtml(statusLabels[h.status_to] || h.status_to)}
                  </div>
                  ${h.notes ? `<p style="color:#A9B1CC;font-size:13px;margin-top:4px">${escapeHtml(h.notes)}</p>` : ''}
                </div>`
            )
            .join('');

        rightColumnHtml = `
        <div class="form hm-form" style="display:block">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12)">
            <div>
              <small style="color:#8F9BB7;font-family:monospace;font-size:12px">Protocolo: ${escapeHtml(serviceRequest.tracking_code)}</small>
              <h2 style="font-size:22px;color:#fff;margin-top:4px">${escapeHtml(serviceRequest.title)}</h2>
              <p style="font-size:13px;color:#A9B1CC;margin-top:4px">
                Aberto em ${escapeHtml(serviceRequest.created_at)}
              </p>
            </div>
            <span style="background:rgba(228,163,24,.22);border:1px solid rgba(228,163,24,.45);color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700">
              ${escapeHtml(statusLabels[serviceRequest.status] || serviceRequest.status)}
            </span>
          </div>
          <div style="margin-top:18px">
            <p style="color:#A9B1CC;font-size:13px;line-height:1.6">${escapeHtml(serviceRequest.description)}</p>
          </div>
          <div style="margin-top:24px">
            <h3 style="color:#fff;font-size:15px;margin-bottom:14px">Histórico de Movimentações</h3>
            <div style="border-left:2px solid rgba(255,255,255,.15);padding-left:18px;display:grid;gap:16px">
              ${histHtml || `<div style="color:#A9B1CC;font-size:13px">Solicitação registrada em ${escapeHtml(serviceRequest.created_at)}.</div>`}
            </div>
          </div>
        </div>`;
    } else if (protocol) {
        rightColumnHtml = `
        <div class="form hm-form" style="display:block;text-align:center;padding:40px 24px">
          <h3 style="color:#fff;font-size:18px">Nenhuma solicitação encontrada</h3>
          <p style="color:#A9B1CC;font-size:14px;margin-top:8px">
            Verifique se o código de protocolo informado (<strong>${escapeHtml(protocol)}</strong>) está correto.
          </p>
        </div>`;
    } else {
        rightColumnHtml = `
        <div class="form hm-form" style="display:block;padding:36px 28px">
          <h3 style="color:#fff;font-size:18px">Precisa de um novo orçamento?</h3>
          <p style="color:#A9B1CC;font-size:14px;margin-top:8px;margin-bottom:20px">
            Envie os detalhes do seu projeto e receba seu protocolo de atendimento na hora.
          </p>
          <a href="/solicitar-orcamento" class="btn">Solicitar orçamento <svg><use href="#i-seta"/></svg></a>
        </div>`;
    }

    const contentHtml = `
<section class="hm-contato ct-topo" id="acompanhar" aria-labelledby="acompanhar-titulo">
  <div class="container hm-contato-grid">
    <div class="hm-contato-txt">
      <p class="ct-kicker">Rastreabilidade GundjaTech</p>
      <h1 id="acompanhar-titulo">Acompanhar Solicitação — <em>protocolo em tempo real</em></h1>
      <p>Informe o número do protocolo gerado na sua solicitação para consultar o status técnico, histórico de etapas e propostas emitidas.</p>

      <form action="/acompanhar-solicitacao" method="GET" class="form hm-form" style="margin-top:24px;padding:24px">
        <label class="campo cheio">Número do protocolo*
          <input type="text" name="protocol" value="${escapeHtml(protocol || '')}" placeholder="Ex: GNDJ-20261121-AB12" required style="font-family:monospace;text-transform:uppercase">
        </label>
        <div class="cheio hm-form-acoes">
          <button type="submit" class="btn">Consultar protocolo <svg><use href="#i-seta"/></svg></button>
        </div>
      </form>
    </div>

    <div>
      ${rightColumnHtml}
    </div>
  </div>
</section>`;

    return c.html(
        renderPublicLayoutShell({
            title: 'Acompanhar Solicitação | GundjaTech',
            url: '/acompanhar-solicitacao',
            user,
            contentHtml
        })
    );
});

// ----------------------------------------------------
// API RÁPIDA DE CAPTAÇÃO DE LEADS & WHATSAPP (Idêntico ao PublicController.php)
// ----------------------------------------------------
publicRoutes.post('/api/lead', rateLimit({ keyPrefix: 'public_lead', maxRequests: 15, windowSeconds: 600 }), async (c) => {
    const body = await getRequestBody(c);

    if (body.sobrenome_hp) {
        return c.json({ ok: true });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const nome = String(body.nome || '').trim() || 'Lead do Site';
    const telefone = String(body.telefone || '').trim();
    const empresa = String(body.empresa || '').trim();
    const site = String(body.site || '').trim();
    const origem = String(body.origem || 'site').trim();
    const campanha = String(body.campanha || '').trim();
    const mensagem = String(body.mensagem || '').trim();
    const pagina = String(body.pagina || '').trim();

    if (!email) {
        return c.json({ error: 'Email obrigatório' }, 422);
    }

    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${randomChars}`;

    try {
        if (c.env?.DB) {
            let client = await c.env.DB.prepare(
                `SELECT id FROM clients WHERE lower(email) = ?`
            ).bind(email).first<{ id: number }>();

            let clientId: number;
            if (!client) {
                const res = await c.env.DB.prepare(
                    `INSERT INTO clients (name, email, phone, company, status, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                ).bind(nome, email, telefone || null, empresa || null).run();
                clientId = Number(res.meta.last_row_id);
            } else {
                clientId = client.id;
            }

            const detailsParts = [
                site ? `Site: ${site}` : '',
                campanha ? `Campanha: ${campanha}` : '',
                mensagem,
                pagina ? `Página: ${pagina}` : ''
            ].filter(Boolean);
            const description = detailsParts.join(' | ') || 'Solicitação de diagnóstico recebida pelo site GundjaTech.';

            const reqRes = await c.env.DB.prepare(
                `INSERT INTO service_requests (protocol, tracking_code, client_id, name, company, email, phone, title, service_title, description, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))`
            ).bind(
                protocol,
                protocol,
                clientId,
                nome,
                empresa || null,
                email,
                telefone || null,
                `Solicitação Digital (${origem})`,
                `Solicitação Digital (${origem})`,
                description
            ).run();

            const requestId = Number(reqRes.meta.last_row_id);

            await c.env.DB.prepare(
                `INSERT INTO request_status_histories (service_request_id, status_from, status_to, new_status, notes, comment, created_at, updated_at)
                 VALUES (?, NULL, 'new', 'new', ?, ?, datetime('now'), datetime('now'))`
            ).bind(
                requestId,
                `Lead recebido automaticamente via formulário (${origem}).`,
                `Lead recebido automaticamente via formulário (${origem}).`
            ).run();

            const file = body.arquivo;
            if (file instanceof File && file.size > 0 && c.env?.UPLOADS_BUCKET) {
                const fileKey = `attachments/${protocol}/${file.name}`;
                const arrayBuffer = await file.arrayBuffer();
                await c.env.UPLOADS_BUCKET.put(fileKey, arrayBuffer, {
                    httpMetadata: { contentType: file.type }
                });
                await c.env.DB.prepare(
                    `INSERT INTO request_attachments (service_request_id, file_name, file_path, file_size, mime_type, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
                ).bind(requestId, file.name, fileKey, file.size, file.type).run();
            }
        }
    } catch {}

    return c.json({
        ok: true,
        protocol,
        track_url: `/acompanhar-solicitacao?protocol=${protocol}`,
        message: 'Lead captado com sucesso!'
    });
});

publicRoutes.post('/api/whatsapp', async (c) => {
    const body = await getRequestBody(c);
    const email = String(body.email || '').trim().toLowerCase();
    const nome = String(body.nome || '').trim() || 'Contato WhatsApp';
    const telefone = String(body.telefone || '').trim();
    const empresa = String(body.empresa || '').trim();
    const site = String(body.site || '').trim();

    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = email ? `WPP-${dateStr}-${randomChars}` : null;

    try {
        if (c.env?.DB && email && protocol) {
            let client = await c.env.DB.prepare(`SELECT id FROM clients WHERE lower(email) = ?`).bind(email).first<{ id: number }>();
            let clientId: number;
            if (!client) {
                const res = await c.env.DB.prepare(
                    `INSERT INTO clients (name, email, phone, company, status, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                ).bind(nome, email, telefone || null, empresa || null).run();
                clientId = Number(res.meta.last_row_id);
            } else {
                clientId = client.id;
            }

            await c.env.DB.prepare(
                `INSERT INTO service_requests (protocol, tracking_code, client_id, name, company, email, phone, title, service_title, description, status, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Contato via WhatsApp do Site', 'Contato via WhatsApp do Site', ?, 'new', datetime('now'), datetime('now'))`
            ).bind(
                protocol,
                protocol,
                clientId,
                nome,
                empresa || null,
                email,
                telefone || null,
                `Qualificação WhatsApp${site ? ` | Site: ${site}` : ''}`
            ).run();
        }
    } catch {}

    return c.json({
        ok: true,
        protocol,
        track_url: protocol ? `/acompanhar-solicitacao?protocol=${protocol}` : null
    });
});

// ----------------------------------------------------
// TODAS AS 19 PÁGINAS PÚBLICAS REAIS DO BLADE (Idênticas ao Render)
// ----------------------------------------------------
publicRoutes.get('/', (c) => c.html(renderPublicBladePage('home', c.get('user'))));
publicRoutes.get('/sobre', (c) => c.html(renderPublicBladePage('about', c.get('user'))));
publicRoutes.get('/sobre-nos', (c) => c.html(renderPublicBladePage('about', c.get('user'))));
publicRoutes.get('/servicos', (c) => c.html(renderPublicBladePage('services', c.get('user'))));

const sinnapseServiceMap: Record<string, string> = {
    'criacao-de-sites': 'criacao-de-sites',
    'gerenciamento-de-dominios': 'ciberseguranca',
    'ciberseguranca': 'ciberseguranca',
    'gestao-de-trafego-pago': 'operacao',
    'operacao': 'operacao',
    'desenvolvimento-de-sites': 'desenvolvimento-de-sites',
    'criacao-de-sites-wordpress': 'criacao-de-sites-wordpress',
    'criacao-de-sites-alphaville': 'criacao-de-sites-alphaville',
    'quanto-custa-um-site': 'quanto-custa-um-site'
};

publicRoutes.get('/servicos/:slug', (c) => {
    const slug = c.req.param('slug');
    const viewKey = sinnapseServiceMap[slug] || 'services';
    return c.html(renderPublicBladePage(viewKey, c.get('user')));
});

publicRoutes.get('/portfolio', (c) => c.html(renderPublicBladePage('portfolio', c.get('user'))));
publicRoutes.get('/cases', (c) => c.html(renderPublicBladePage('portfolio', c.get('user'))));

const caseMap: Record<string, string> = {
    'klasse': 'case-klasse',
    'instituto-paraiso-do-saber': 'case-instituto-paraiso-do-saber',
    'cotech-contabilidade': 'case-cotech-contabilidade'
};

publicRoutes.get('/cases/:slug', (c) => {
    const slug = c.req.param('slug');
    const viewKey = caseMap[slug];
    if (!viewKey) {
        return c.redirect('/portfolio');
    }
    return c.html(renderPublicBladePage(viewKey, c.get('user')));
});

publicRoutes.get('/portfolio/:slug', (c) => {
    const slug = c.req.param('slug');
    const viewKey = caseMap[slug];
    if (!viewKey) {
        return c.redirect('/portfolio');
    }
    return c.html(renderPublicBladePage(viewKey, c.get('user')));
});

publicRoutes.get('/blog', (c) => c.html(renderPublicBladePage('blog', c.get('user'))));
publicRoutes.get('/blog/:slug', (c) => c.html(renderPublicBladePage('blog-sample', c.get('user'))));

publicRoutes.get('/contato', (c) => c.html(renderPublicBladePage('contact', c.get('user'))));

publicRoutes.post('/contato', rateLimit({ keyPrefix: 'public_contact', maxRequests: 10, windowSeconds: 600 }), async (c) => {
    const body = await getRequestBody(c);
    const name = String(body.name || body.nome || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || body.telefone || '').trim();
    const message = String(body.message || body.mensagem || '').trim();

    if (!name || !email || !message) {
        return c.json({ error: 'Preencha todos os campos obrigatórios.' }, 422);
    }

    try {
        const trackingCode = 'GT-' + Math.floor(100000 + Math.random() * 900000);
        if (c.env?.DB) {
            await c.env.DB.prepare(
                `INSERT INTO service_requests (protocol, tracking_code, name, email, phone, title, service_title, description, status, internal_notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', 'Origem: Formulário de Contato Web', datetime('now'), datetime('now'))`
            ).bind(
                trackingCode,
                trackingCode,
                name,
                email,
                phone || null,
                `Contato via Site: ${name}`,
                `Contato via Site: ${name}`,
                `Mensagem: ${message}\nEmail: ${email}\nTelefone: ${phone}`
            ).run();
        }
    } catch {}

    return c.redirect('/contato?status=sent');
});

publicRoutes.get('/criacao-de-sites', (c) => c.html(renderPublicBladePage('criacao-de-sites', c.get('user'))));
publicRoutes.get('/criacao-de-sites-alphaville', (c) => c.html(renderPublicBladePage('criacao-de-sites-alphaville', c.get('user'))));
publicRoutes.get('/criacao-de-sites-wordpress', (c) => c.html(renderPublicBladePage('criacao-de-sites-wordpress', c.get('user'))));
publicRoutes.get('/desenvolvimento-de-sites', (c) => c.html(renderPublicBladePage('desenvolvimento-de-sites', c.get('user'))));
publicRoutes.get('/quanto-custa-um-site', (c) => c.html(renderPublicBladePage('quanto-custa-um-site', c.get('user'))));
publicRoutes.get('/ciberseguranca', (c) => c.html(renderPublicBladePage('ciberseguranca', c.get('user'))));
publicRoutes.get('/operacao', (c) => c.html(renderPublicBladePage('operacao', c.get('user'))));
publicRoutes.get('/politica-de-privacidade', (c) => c.html(renderPublicBladePage('politica-de-privacidade', c.get('user'))));
publicRoutes.get('/autor-casimiro-gundja', (c) => c.html(renderPublicBladePage('autor-casimiro-gundja', c.get('user'))));

// Redirecionamentos de idioma idênticos a routes/web.php
publicRoutes.get('/pt-pt/:path{.*}?', (c) => c.redirect('/' + (c.req.param('path') || ''), 301));
publicRoutes.get('/en/:path{.*}?', (c) => c.redirect('/' + (c.req.param('path') || ''), 301));

// ----------------------------------------------------
// SITEMAP XML & RSS FEED XML
// ----------------------------------------------------
publicRoutes.get('/sitemap.xml', (c) => {
    const urls = [
        'https://gundjatech.com/',
        'https://gundjatech.com/servicos',
        'https://gundjatech.com/portfolio',
        'https://gundjatech.com/sobre',
        'https://gundjatech.com/contato',
        'https://gundjatech.com/blog',
        'https://gundjatech.com/criacao-de-sites',
        'https://gundjatech.com/criacao-de-sites-alphaville',
        'https://gundjatech.com/criacao-de-sites-wordpress',
        'https://gundjatech.com/desenvolvimento-de-sites',
        'https://gundjatech.com/quanto-custa-um-site',
        'https://gundjatech.com/ciberseguranca',
        'https://gundjatech.com/operacao',
        'https://gundjatech.com/cases/klasse',
        'https://gundjatech.com/cases/instituto-paraiso-do-saber',
        'https://gundjatech.com/cases/cotech-contabilidade'
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;

    c.header('Content-Type', 'application/xml; charset=utf-8');
    return c.body(xml);
});

publicRoutes.get('/feed.xml', (c) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GundjaTech • Blog de Engenharia Digital</title>
    <link>https://gundjatech.com/blog</link>
    <description>Artigos e novidades sobre desenvolvimento de sites, SEO e segurança.</description>
    <language>pt-BR</language>
  </channel>
</rss>`;

    c.header('Content-Type', 'application/xml; charset=utf-8');
    return c.body(xml);
});
