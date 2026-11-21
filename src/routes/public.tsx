import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { HomeView } from '../views/home';
import { ServicesListView } from '../views/services';
import { PortfolioView } from '../views/portfolio';
import { BlogListView, BlogPostView } from '../views/blog';
import { ContactView } from '../views/contact';
import { SinnapseLandingView } from '../views/sinnapse';
import { RequestQuoteView } from '../views/request-quote';
import { TrackRequestView } from '../views/track-request';
import { getRequestBody } from '../lib/request';
import { sendQuoteConfirmationEmail, sendNewLeadStaffNotification } from '../lib/email';

export const publicRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ----------------------------------------------------
// SOLICITAR ORÇAMENTO
// ----------------------------------------------------
publicRoutes.get('/solicitar-orcamento', async (c) => {
    const user = c.get('user');
    const serviceIdParam = c.req.query('service_id');
    const selectedServiceId = serviceIdParam ? parseInt(serviceIdParam, 10) : null;

    let services: Array<{ id: number; name: string; slug: string }> = [];
    try {
        if (c.env?.DB) {
            const res = await c.env.DB.prepare(
                `SELECT id, name, slug FROM services WHERE is_active = 1 ORDER BY sort_order ASC`
            ).all<{ id: number; name: string; slug: string }>();
            services = res.results || [];
        }
    } catch {}

    if (services.length === 0) {
        services = [
            { id: 1, name: 'Criação de Sites', slug: 'criacao-de-sites' },
            { id: 2, name: 'Desenvolvimento Sob Medida', slug: 'desenvolvimento-de-sites' },
            { id: 3, name: 'WordPress & WooCommerce', slug: 'criacao-de-sites-wordpress' },
            { id: 4, name: 'Cibersegurança & DNS', slug: 'ciberseguranca' },
            { id: 5, name: 'Gestão de Tráfego Pago', slug: 'gestao-de-trafego-pago' }
        ];
    }

    return c.html(
        <RequestQuoteView
            currentUser={user}
            services={services}
            selectedServiceId={selectedServiceId}
        />
    );
});

publicRoutes.post('/solicitar-orcamento', async (c) => {
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

    // Gera protocolo único com formato oficial
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `GNDJ-${dateStr}-${randomChars}`;

    try {
        if (c.env?.DB) {
            // 1. Cria ou recupera cliente
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

            // 2. Cria service request
            const reqRes = await c.env.DB.prepare(
                `INSERT INTO service_requests (client_id, service_id, title, description, estimated_budget, deadline, status, tracking_code, internal_notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, datetime('now'), datetime('now'))`
            ).bind(
                clientId,
                serviceId,
                title,
                description,
                budget,
                deadline,
                protocol,
                `Contato: ${contactName} | Tel: ${phone} | Empresa: ${companyName}`
            ).run();

            const requestId = Number(reqRes.meta.last_row_id);

            // 3. Registra histórico inicial
            await c.env.DB.prepare(
                `INSERT INTO request_status_histories (service_request_id, status_from, status_to, notes, created_at, updated_at)
                 VALUES (?, NULL, 'new', 'Solicitação registrada através do portal online.', datetime('now'), datetime('now'))`
            ).bind(requestId).run();

            // 4. Se houver anexo, faz streaming seguro para o R2 Bucket
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

            // Envio de e-mails transacionais
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
// ACOMPANHAR SOLICITAÇÃO
// ----------------------------------------------------
publicRoutes.get('/acompanhar-solicitacao', async (c) => {
    const user = c.get('user');
    const protocol = c.req.query('protocol')?.trim().toUpperCase() || null;

    let serviceRequest: {
        id: number;
        title: string;
        description: string;
        tracking_code: string;
        status: string;
        created_at: string;
        estimated_budget?: number | null;
    } | null = null;

    let histories: Array<{ status_to: string; notes: string | null; created_at: string }> = [];

    if (protocol) {
        try {
            if (c.env?.DB) {
                serviceRequest = await c.env.DB.prepare(
                    `SELECT id, title, description, tracking_code, status, estimated_budget, created_at
                     FROM service_requests WHERE tracking_code = ?`
                ).bind(protocol).first<{
                    id: number;
                    title: string;
                    description: string;
                    tracking_code: string;
                    status: string;
                    created_at: string;
                    estimated_budget?: number | null;
                }>();

                if (serviceRequest) {
                    const histRes = await c.env.DB.prepare(
                        `SELECT status_to, notes, created_at
                         FROM request_status_histories
                         WHERE service_request_id = ? ORDER BY id ASC`
                    ).bind(serviceRequest.id).all<{ status_to: string; notes: string | null; created_at: string }>();

                    histories = histRes.results || [];
                }
            }
        } catch {}
    }

    return c.html(
        <TrackRequestView
            currentUser={user}
            protocol={protocol}
            serviceRequest={serviceRequest}
            histories={histories}
        />
    );
});

// ----------------------------------------------------
// API RÁPIDA DE CAPTAÇÃO DE LEADS (Honeypot + Antispam)
// ----------------------------------------------------
publicRoutes.post('/api/lead', async (c) => {
    const body = await getRequestBody(c);

    // Honeypot antispam idêntico ao Laravel
    if (body.sobrenome_hp) {
        return c.json({ ok: true });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const nome = String(body.nome || '').trim();
    const telefone = String(body.telefone || '').trim();
    const empresa = String(body.empresa || '').trim();

    if (!email) {
        return c.json({ error: 'Email obrigatório' }, 422);
    }

    try {
        if (c.env?.DB) {
            await c.env.DB.prepare(
                `INSERT INTO clients (name, email, phone, company, status, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
            ).bind(nome || 'Lead Rápido', email, telefone || null, empresa || null).run();
        }
    } catch {}

    return c.json({ ok: true, message: 'Lead captado com sucesso!' });
});

// ----------------------------------------------------
// HOME
// ----------------------------------------------------
publicRoutes.get('/', async (c) => {
    const user = c.get('user');

    // 1. Busca categorias e serviços no D1
    let categories: Array<{ id: number; name: string; slug: string; description: string | null }> = [];
    try {
        const catRows = await c.env.DB.prepare(
            `SELECT id, name, slug, description FROM service_categories WHERE is_active = 1 ORDER BY sort_order ASC`
        ).all<{ id: number; name: string; slug: string; description: string | null }>();
        categories = catRows.results || [];
    } catch {}

    // 2. Busca projetos em destaque no D1
    let featuredProjects: Array<{ id: number; title: string; slug: string; client_name: string | null; summary: string | null; category: string | null }> = [];
    try {
        const projRows = await c.env.DB.prepare(
            `SELECT id, title, slug, client_name, summary, category FROM portfolio_projects WHERE is_featured = 1 ORDER BY sort_order ASC LIMIT 6`
        ).all<{ id: number; title: string; slug: string; client_name: string | null; summary: string | null; category: string | null }>();
        featuredProjects = projRows.results || [];
    } catch {}

    // 3. Busca posts recentes do blog no D1
    let latestPosts: Array<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null }> = [];
    try {
        const postRows = await c.env.DB.prepare(
            `SELECT id, title, slug, summary, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 3`
        ).all<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null }>();
        latestPosts = postRows.results || [];
    } catch {}

    return c.html(
        <HomeView
            currentUser={user}
            categories={categories}
            featuredProjects={featuredProjects}
            latestPosts={latestPosts}
        />
    );
});

// ----------------------------------------------------
// SERVIÇOS
// ----------------------------------------------------
publicRoutes.get('/servicos', async (c) => {
    const user = c.get('user');

    let services: Array<{
        id: number;
        name: string;
        slug: string;
        summary: string | null;
        description: string | null;
        price_starting_at: number | null;
    }> = [];

    try {
        const res = await c.env.DB.prepare(
            `SELECT id, name, slug, summary, description, price_starting_at FROM services WHERE is_active = 1 ORDER BY sort_order ASC`
        ).all<{ id: number; name: string; slug: string; summary: string | null; description: string | null; price_starting_at: number | null }>();
        services = res.results || [];
    } catch {}

    // Fallback de catálogo se ainda não houver dados populados
    if (services.length === 0) {
        services = [
            { id: 1, name: 'Criação de Sites', slug: 'criacao-de-sites', summary: 'Sites corporativos e institucionais de alta conversão.', description: 'Desenvolvimento exclusivo com foco em velocidade e SEO.', price_starting_at: 4500 },
            { id: 2, name: 'Desenvolvimento Sob Medida', slug: 'desenvolvimento-de-sites', summary: 'Plataformas web e sistemas empresariais.', description: 'Aplicações personalizadas para o fluxo da sua empresa.', price_starting_at: 9800 },
            { id: 3, name: 'WordPress & Elementor Pro', slug: 'criacao-de-sites-wordpress', summary: 'Websites fáceis de editar sem dependência técnica.', description: 'Treinamento completo e arquitetura segura contra invasões.', price_starting_at: 3800 },
            { id: 4, name: 'Cibersegurança & DNS', slug: 'ciberseguranca', summary: 'Proteção contra ataques, SSL e conformidade LGPD.', description: 'Infraestrutura blindada em nuvem para seu domínio.', price_starting_at: 1800 },
            { id: 5, name: 'Gestão de Tráfego Pago', slug: 'gestao-de-trafego-pago', summary: 'Google Ads e Meta Ads com foco em ROI real.', description: 'Campanhas orientadas a leads qualificados.', price_starting_at: 2500 }
        ];
    }

    return c.html(<ServicesListView currentUser={user} services={services} />);
});

// ----------------------------------------------------
// PORTFÓLIO & CASES
// ----------------------------------------------------
publicRoutes.get('/portfolio', async (c) => {
    const user = c.get('user');

    let projects: Array<{
        id: number;
        title: string;
        slug: string;
        client_name: string | null;
        summary: string | null;
        category: string | null;
    }> = [];

    try {
        const res = await c.env.DB.prepare(
            `SELECT id, title, slug, client_name, summary, category FROM portfolio_projects ORDER BY sort_order ASC`
        ).all<{ id: number; title: string; slug: string; client_name: string | null; summary: string | null; category: string | null }>();
        projects = res.results || [];
    } catch {}

    if (projects.length === 0) {
        projects = [
            { id: 1, title: 'Plataforma Escolar KLASSE', slug: 'klasse', client_name: 'KLASSE', summary: 'Gestão integrada de escolas particulares com portal do aluno e financeiro.', category: 'Educação' },
            { id: 2, title: 'Portal do Instituto Paraíso do Saber', slug: 'instituto-paraiso-do-saber', client_name: 'Instituto Paraíso do Saber', summary: 'Portal institucional para matrículas e apresentação pedagógica.', category: 'Educação' },
            { id: 3, title: 'Cotech Contabilidade Empresarial', slug: 'cotech-contabilidade', client_name: 'Cotech Contabilidade', summary: 'Redesign digital e captação de clientes B2B.', category: 'B2B & Finanças' }
        ];
    }

    return c.html(<PortfolioView currentUser={user} projects={projects} />);
});

publicRoutes.get('/cases/:slug', (c) => {
    const slug = c.req.param('slug');
    const user = c.get('user');

    const casesMap: Record<string, { title: string; client: string; category: string; description: string }> = {
        'klasse': {
            title: 'KLASSE • Ecossistema Digital de Gestão Escolar',
            client: 'KLASSE',
            category: 'Educação & Tecnologia',
            description: 'Desenvolvimento de portal institucional e sistema web robusto para atendimento a milhares de alunos, responsáveis e professores.'
        },
        'instituto-paraiso-do-saber': {
            title: 'Instituto Paraíso do Saber • Portal Institucional',
            client: 'Instituto Paraíso do Saber',
            category: 'Educação',
            description: 'Novo site focado em conversão de matrículas, velocidade de carregamento e identidade visual acolhedora.'
        },
        'cotech-contabilidade': {
            title: 'Cotech Contabilidade • Presença Digital B2B',
            client: 'Cotech Contabilidade',
            category: 'Serviços B2B',
            description: 'Arquitetura de conversão focada em geração de leads para abertura de empresas e assessoria contábil.'
        }
    };

    const caseData = casesMap[slug];
    if (!caseData) {
        return c.redirect('/portfolio');
    }

    return c.html(
        <SinnapseLandingView
            title={`${caseData.title} • GundjaTech`}
            description={caseData.description}
            h1={caseData.title}
            subtitle={caseData.description}
            badgeText={`Case de Sucesso • ${caseData.category}`}
            currentUser={user}
        />
    );
});

// ----------------------------------------------------
// BLOG
// ----------------------------------------------------
publicRoutes.get('/blog', async (c) => {
    const user = c.get('user');

    let posts: Array<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null }> = [];
    try {
        const res = await c.env.DB.prepare(
            `SELECT id, title, slug, summary, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC`
        ).all<{ id: number; title: string; slug: string; summary: string | null; published_at: string | null }>();
        posts = res.results || [];
    } catch {}

    if (posts.length === 0) {
        posts = [
            { id: 1, title: 'Conteúdo Técnico: Atraia e Converta Clientes com Expertise', slug: 'conteudo-tecnico-atraia-e-converta-clientes-com-expertise', summary: 'Como o marketing de autoridade e o conteúdo especializado aceleram vendas B2B.', published_at: '2026-11-15' },
            { id: 2, title: 'Área do Cliente: Como Criar uma Conta de Usuário Perfeita', slug: 'area-do-cliente-como-criar-uma-conta-de-usuario-perfeita', summary: 'Boas práticas de UX, retenção e segurança para portais de clientes.', published_at: '2026-11-10' },
            { id: 3, title: 'Entenda o que é uma Aplicação Web Sob Medida', slug: 'entenda-o-que-e-aplicacao-web', summary: 'Diferenças cruciais entre sites institucionais simples e sistemas web escaláveis.', published_at: '2026-11-05' }
        ];
    }

    return c.html(<BlogListView currentUser={user} posts={posts} />);
});

publicRoutes.get('/blog/:slug', async (c) => {
    const slug = c.req.param('slug');
    const user = c.get('user');

    let post: { id: number; title: string; slug: string; summary: string | null; content: string; published_at: string | null } | null = null;

    try {
        if (c.env?.DB) {
            post = await c.env.DB.prepare(
                `SELECT id, title, slug, summary, content, published_at FROM blog_posts WHERE slug = ?`
            )
                .bind(slug)
                .first<{ id: number; title: string; slug: string; summary: string | null; content: string; published_at: string | null }>();

            if (post) {
                await c.env.DB.prepare(`UPDATE blog_posts SET views_count = views_count + 1 WHERE id = ?`).bind(post.id).run();
            }
        }
    } catch {}

    if (!post) {
        // Fallback para artigos estáticos
        post = {
            id: 99,
            title: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
            slug,
            summary: 'Artigo técnico sobre engenharia digital e melhores práticas de desenvolvimento.',
            content: '<p>Este artigo explora as melhores práticas e padrões de engenharia recomendados pela GundjaTech para projetos de alto impacto no mercado corporativo.</p>',
            published_at: new Date().toISOString()
        };
    }

    return c.html(<BlogPostView currentUser={user} post={post} />);
});

// ----------------------------------------------------
// CONTATO
// ----------------------------------------------------
publicRoutes.get('/contato', (c) => {
    return c.html(<ContactView currentUser={c.get('user')} />);
});

publicRoutes.post('/contato', async (c) => {
    const body = await getRequestBody(c);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
        return c.json({ error: 'Preencha todos os campos obrigatórios.' }, 422);
    }

    // Salva solicitação no D1
    try {
        const trackingCode = 'GT-' + Math.floor(100000 + Math.random() * 900000);
        await c.env.DB.prepare(
            `INSERT INTO service_requests (title, description, tracking_code, status, internal_notes, created_at, updated_at)
             VALUES (?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`
        )
            .bind(
                `Contato via Site: ${name}`,
                `Mensagem: ${message}\nEmail: ${email}\nTelefone: ${phone}`,
                trackingCode,
                `Origem: Formulário de Contato Web`
            )
            .run();
    } catch {}

    return c.html(`
        <body style="font-family: sans-serif; background: #063B5C; color: #fff; text-align: center; padding: 80px 20px;">
            <h2 style="color: #F2C230; font-size: 28px;">Mensagem Recebida com Sucesso!</h2>
            <p style="color: #E7F0F5; margin: 16px 0 24px; font-size: 16px;">Obrigado, ${name}. Nossa diretoria técnica responderá em até 4 horas úteis.</p>
            <a href="/" style="background: #F2C230; color: #063B5C; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Voltar ao Início</a>
        </body>
    `);
});

// ----------------------------------------------------
// PÁGINAS SINNAPSE DE ALTA CONVERSÃO & SEO
// ----------------------------------------------------
publicRoutes.get('/criacao-de-sites', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Criação de Sites Profissionais e Corporativos • GundjaTech"
            description="Empresa especializada em criação de sites de alta performance, design exclusivo e SEO preparado para o Google e inteligência artificial."
            h1="Criação de Sites Profissionais para Empresas que Querem Crescer"
            subtitle="Layout exclusivo sob medida, velocidade de carregamento e código otimizado para gerar mais contatos e negócios."
            badgeText="Metodologia OneFlow • 100% de Entrega no Prazo"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/criacao-de-sites-alphaville', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Criação de Sites em Alphaville e Barueri • GundjaTech"
            description="Agência de criação de sites em Alphaville. Atendimento presencial e remoto para empresas da Grande São Paulo com tecnologia de ponta."
            h1="Criação de Sites de Alta Performance em Alphaville"
            subtitle="Projetos sob medida para empresas que buscam autoridade, posicionamento no Google e novos clientes."
            badgeText="Atendimento Executivo em Alphaville e Barueri"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/criacao-de-sites-wordpress', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Criação de Sites em WordPress e WooCommerce • GundjaTech"
            description="Especialistas em desenvolvimento de sites WordPress com Elementor Pro. Fácil de editar, seguro, rápido e preparado para SEO."
            h1="Sites em WordPress Sob Medida: Fáceis de Editar e Seguros"
            subtitle="Sua equipe edita páginas e textos sem depender de programador. Entregamos com treinamento e manutenção contínua."
            badgeText="WordPress & WooCommerce Especialistas"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/desenvolvimento-de-sites', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Desenvolvimento de Sites e Aplicações Web Sob Medida • GundjaTech"
            description="Desenvolvimento completo do código à infraestrutura na nuvem. Sistemas web, portais de clientes e integrações empresariais."
            h1="Desenvolvimento de Sites e Sistemas Web Sob Medida"
            subtitle="Arquiteturas robustas, escaláveis e seguras para empresas com regras de negócio personalizadas."
            badgeText="Engenharia de Software & Cloud"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/quanto-custa-um-site', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Quanto Custa Criar um Site Profissional em 2026? • Guia GundjaTech"
            description="Entenda os fatores que determinam o investimento na criação de um site: número de páginas, integrações, layout exclusivo e hospedagem."
            h1="Quanto Custa Criar um Site Profissional?"
            subtitle="Transparência total. Descubra os custos de layout, desenvolvimento, SEO e manutenção para o projeto da sua empresa."
            badgeText="Guia Completo de Orçamento"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/ciberseguranca', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Cibersegurança para Sites, Domínios e DNS • GundjaTech"
            description="Proteja a reputação da sua empresa. Gestão profissional de domínios, DNS blindado, certificados SSL e proteção contra ataques."
            h1="Cibersegurança e Gestão Blindada de Domínios"
            subtitle="Sua infraestrutura protegida 24/7 com monitoramento, backups automáticos e conformidade rigorosa com a LGPD."
            badgeText="Segurança Empresarial 24/7"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/sobre', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Sobre a GundjaTech • Engenharia Digital & Inovação"
            description="Conheça a história, os valores e a equipe por trás da GundjaTech. Conectando ideias e negócios no Brasil, Angola e Portugal."
            h1="Engenharia Digital que Impulsiona Marcas Globais"
            subtitle="Unimos visão estratégica de negócios, design centrado no usuário e tecnologia de ponta para criar plataformas de sucesso."
            badgeText="Sobre a GundjaTech"
            currentUser={c.get('user')}
        />
    );
});

publicRoutes.get('/politica-de-privacidade', (c) => {
    return c.html(
        <SinnapseLandingView
            title="Política de Privacidade • GundjaTech"
            description="Termos de privacidade e proteção de dados da GundjaTech em total conformidade com a Lei Geral de Proteção de Dados (LGPD)."
            h1="Política de Privacidade e Proteção de Dados"
            subtitle="Nosso compromisso inegociável com a transparência, segurança e privacidade dos seus dados pessoais e empresariais."
            badgeText="Conformidade LGPD"
            currentUser={c.get('user')}
        />
    );
});

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
