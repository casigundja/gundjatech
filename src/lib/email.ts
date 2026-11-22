import { Env } from '../types/env';

export interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    from?: string;
    replyTo?: string;
}

export interface EmailResult {
    id: string;
    success: boolean;
    mocked?: boolean;
    error?: string;
}

/**
 * Cria o invólucro HTML padrão de e-mail institucional GundjaTech
 * Respeita rigorosamente a Paleta 3 (Amarelo Ouro #F2C230, Azul Petróleo #063B5C, Branco Puro #FFFFFF)
 */
export function renderEmailTemplate(title: string, bodyContent: string, actionButton?: { text: string; url: string }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #032033; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #063B5C;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #032033; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #063B5C; padding: 32px 40px; text-align: center; border-bottom: 3px solid #F2C230;">
                            <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                                Gundja<span style="color: #F2C230;">Tech</span>
                            </div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #E7F0F5; letter-spacing: 2px; margin-top: 4px; font-weight: 600;">
                                Arquitetura Digital & Alta Performance
                            </div>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; line-height: 1.6; font-size: 15px; color: #063B5C;">
                            <h1 style="font-size: 20px; font-weight: 800; color: #063B5C; margin: 0 0 16px 0;">
                                ${title}
                            </h1>
                            <div style="color: #2D4C63; font-size: 14px;">
                                ${bodyContent}
                            </div>

                            ${actionButton ? `
                            <div style="margin: 32px 0 20px 0; text-align: center;">
                                <a href="${actionButton.url}" target="_blank" style="display: inline-block; background-color: #F2C230; color: #041B2B; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 14px rgba(242, 194, 48, 0.4);">
                                    ${actionButton.text} &rarr;
                                </a>
                            </div>
                            ` : ''}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8FAFC; padding: 24px 40px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
                            <div style="font-weight: 700; color: #063B5C; margin-bottom: 4px;">GundjaTech Soluções Digitais</div>
                            <div>Av. Eng. Luís Carlos Berrini, São Paulo &bull; Alphaville, Barueri</div>
                            <div style="margin-top: 8px; font-size: 11px;">
                                Mensagem automática gerada pelo sistema edge da plataforma. Em caso de dúvidas, responda diretamente a este e-mail.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

/**
 * Envia e-mail transacional via API HTTP do Resend
 * Se a API Key não estiver configurada (desenvolvimento / testes), simula o envio com sucesso
 */
export async function sendEmail(env: Env, options: EmailOptions): Promise<EmailResult> {
    const fromAddress = options.from || env.EMAIL_FROM || 'GundjaTech <contato@gundjatech.com>';
    const toList = Array.isArray(options.to) ? options.to : [options.to];

    // Se não houver chave do Resend configurada, realiza fallback mock sem quebrar
    if (!env.RESEND_API_KEY) {
        return {
            id: `mock_email_${Date.now()}`,
            success: true,
            mocked: true
        };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: fromAddress,
                to: toList,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
                reply_to: options.replyTo
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Falha na API Resend:', errBody);
            return {
                id: '',
                success: false,
                error: `Erro Resend (${response.status}): ${errBody}`
            };
        }

        const data = await response.json() as { id: string };
        return {
            id: data.id,
            success: true
        };
    } catch (err: any) {
        console.error('Erro de conexão ao enviar e-mail:', err);
        return {
            id: '',
            success: false,
            error: err.message || 'Erro desconhecido ao despachar e-mail'
        };
    }
}

/**
 * E-mail de Recuperação de Senha
 */
export async function sendPasswordResetEmail(env: Env, to: string, name: string, token: string): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const resetUrl = `${baseUrl}/redefinir-senha/${encodeURIComponent(token)}?email=${encodeURIComponent(to)}`;

    const html = renderEmailTemplate(
        'Recuperação de Senha de Acesso',
        `
        <p>Olá, <strong>${name}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a sua senha de acesso ao portal e aos painéis da <strong>GundjaTech</strong>.</p>
        <p>Para criar uma nova credencial com segurança, clique no botão abaixo. Este link expira em 60 minutos por medidas de proteção:</p>
        `,
        {
            text: 'Redefinir Minha Senha',
            url: resetUrl
        }
    );

    return await sendEmail(env, {
        to,
        subject: 'Recuperação de Senha • GundjaTech',
        html
    });
}

/**
 * Confirmação de Solicitação de Orçamento para o Cliente
 */
export async function sendQuoteConfirmationEmail(
    env: Env,
    to: string,
    name: string,
    protocol: string,
    serviceTitle: string
): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const trackUrl = `${baseUrl}/acompanhar-solicitacao?protocol=${encodeURIComponent(protocol)}`;

    const html = renderEmailTemplate(
        'Sua solicitação foi recebida com sucesso!',
        `
        <p>Olá, <strong>${name}</strong>,</p>
        <p>Recebemos o seu briefing e a solicitação para o projeto <strong>${serviceTitle}</strong>.</p>
        <p>Nosso time de engenharia e arquitetura já está analisando o escopo para preparar a proposta técnica mais eficiente e performática.</p>
        <div style="background-color: #E7F0F5; border-radius: 8px; padding: 14px 18px; margin: 20px 0; border-left: 4px solid #16749A;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #16749A;">Número do Protocolo</div>
            <div style="font-size: 18px; font-weight: 800; color: #063B5C; margin-top: 2px;">${protocol}</div>
        </div>
        <p>Você pode acompanhar o andamento em tempo real a qualquer momento:</p>
        `,
        {
            text: 'Acompanhar Minha Solicitação',
            url: trackUrl
        }
    );

    return await sendEmail(env, {
        to,
        subject: `[${protocol}] Solicitação Confirmada • GundjaTech`,
        html
    });
}

/**
 * Notificação Interna de Novo Lead / Solicitação para a Equipe Staff
 */
export async function sendNewLeadStaffNotification(
    env: Env,
    lead: {
        name: string;
        email: string;
        phone?: string;
        company?: string;
        serviceTitle?: string;
        protocol?: string;
    }
): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const adminUrl = `${baseUrl}/admin/solicitacoes`;

    const html = renderEmailTemplate(
        '🚀 Novo Lead / Solicitação Recebida no Site',
        `
        <p>Um novo briefing comercial acaba de ser submetido através do portal GundjaTech:</p>
        <table role="presentation" border="0" cellpadding="6" cellspacing="0" style="width: 100%; font-size: 13px; margin: 16px 0;">
            <tr><td style="font-weight: 700; color: #063B5C; width: 120px;">Protocolo:</td><td>${lead.protocol || '—'}</td></tr>
            <tr><td style="font-weight: 700; color: #063B5C;">Nome:</td><td>${lead.name}</td></tr>
            <tr><td style="font-weight: 700; color: #063B5C;">E-mail:</td><td>${lead.email}</td></tr>
            <tr><td style="font-weight: 700; color: #063B5C;">Telefone:</td><td>${lead.phone || 'Não informado'}</td></tr>
            <tr><td style="font-weight: 700; color: #063B5C;">Empresa:</td><td>${lead.company || '—'}</td></tr>
            <tr><td style="font-weight: 700; color: #063B5C;">Solução:</td><td><strong>${lead.serviceTitle || 'Geral'}</strong></td></tr>
        </table>
        <p>Acesse o painel para revisar o briefing e converter em projeto ou orçamento:</p>
        `,
        {
            text: 'Abrir no Painel Administrativo',
            url: adminUrl
        }
    );

    return await sendEmail(env, {
        to: env.STAFF_NOTIFY_EMAIL || 'comercial@gundjatech.com',
        subject: `[LEAD] ${lead.company || lead.name} - ${lead.serviceTitle || 'Nova Solicitação'}`,
        html
    });
}

/**
 * Notificação de Fatura / Cobrança Emitida para o Cliente
 */
export async function sendInvoiceNoticeEmail(
    env: Env,
    to: string,
    clientName: string,
    invoice: {
        description: string;
        amount: number;
        dueDate: string;
        invoiceNumber?: string;
    }
): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const financeUrl = `${baseUrl}/portal/financeiro`;
    const formatCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount);

    const html = renderEmailTemplate(
        'Fatura Disponível para Pagamento',
        `
        <p>Olá, <strong>${clientName}</strong>,</p>
        <p>Uma nova fatura referente aos serviços digitais contratados foi emitida e está disponível:</p>
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 20px 0;">
            <div style="font-size: 13px; color: #64748B;">${invoice.description}</div>
            <div style="font-size: 24px; font-weight: 800; color: #063B5C; margin: 8px 0;">${formatCurrency}</div>
            <div style="font-size: 12px; color: #16749A; font-weight: 700;">
                Vencimento: ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                ${invoice.invoiceNumber ? ` &bull; NF: #${invoice.invoiceNumber}` : ''}
            </div>
        </div>
        <p>Acesse o Portal do Cliente para visualizar as opções de pagamento (PIX ou Boleto):</p>
        `,
        {
            text: 'Acessar Fatura no Portal',
            url: financeUrl
        }
    );

    return await sendEmail(env, {
        to,
        subject: `Fatura GundjaTech: ${formatCurrency} - Vencimento ${new Date(invoice.dueDate).toLocaleDateString('pt-BR')}`,
        html
    });
}

/**
 * Notificação de Início de Projeto para o Cliente (quando solicitação/orçamento é convertido em projeto)
 */
export async function sendProjectStartedEmail(
    env: Env,
    to: string,
    clientName: string,
    project: {
        id?: number;
        title: string;
        protocol?: string | null;
    }
): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const projectUrl = project.id ? `${baseUrl}/portal/projetos/${project.id}` : `${baseUrl}/portal/projetos`;

    const html = renderEmailTemplate(
        'Seu projeto foi iniciado!',
        `
        <p>Olá, <strong>${clientName}</strong>,</p>
        <p>Temos o prazer de informar que sua demanda foi aprovada e oficialmente convertida em projeto na <strong>GundjaTech</strong>.</p>
        <div style="background-color: #E7F0F5; border-radius: 10px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #16749A;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #16749A;">Projeto em Andamento</div>
            <div style="font-size: 17px; font-weight: 800; color: #063B5C; margin-top: 4px;">${project.title}</div>
            ${project.protocol ? `<div style="font-size: 12px; color: #527287; margin-top: 4px;">Referência: <strong>${project.protocol}</strong></div>` : ''}
        </div>
        <p>Nossa equipe técnica já deu início ao planejamento e execução das etapas. Você pode acompanhar o progresso, cronograma e entregáveis em tempo real pelo seu Portal do Cliente:</p>
        `,
        {
            text: 'Acompanhar Meu Projeto',
            url: projectUrl
        }
    );

    return await sendEmail(env, {
        to,
        subject: `Projeto Iniciado: ${project.title} • GundjaTech`,
        html
    });
}

/**
 * Notificação de Conclusão de Projeto para o Cliente
 */
export async function sendProjectCompletedEmail(
    env: Env,
    to: string,
    clientName: string,
    project: {
        id?: number;
        title: string;
    }
): Promise<EmailResult> {
    const baseUrl = env.APP_URL || 'http://localhost';
    const projectUrl = project.id ? `${baseUrl}/portal/projetos/${project.id}` : `${baseUrl}/portal/projetos`;

    const html = renderEmailTemplate(
        'Seu projeto foi concluído com sucesso!',
        `
        <p>Olá, <strong>${clientName}</strong>,</p>
        <p>É com grande satisfação que informamos que todas as etapas do seu projeto foram finalizadas pela equipe da <strong>GundjaTech</strong>:</p>
        <div style="background-color: #ECFDF5; border-radius: 10px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #10B981;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #047857;">Projeto Concluído • 100%</div>
            <div style="font-size: 17px; font-weight: 800; color: #063B5C; margin-top: 4px;">${project.title}</div>
        </div>
        <p>Acesse o Portal do Cliente para revisar as entregas, baixar arquivos disponíveis ou falar com nosso time para suporte contínuo e próximos passos:</p>
        `,
        {
            text: 'Acessar Entregas no Portal',
            url: projectUrl
        }
    );

    return await sendEmail(env, {
        to,
        subject: `Projeto Concluído: ${project.title} • GundjaTech`,
        html
    });
}
