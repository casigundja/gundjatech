import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalRequestsProps {
    currentUser: any;
    clientName?: string;
    requests?: any[];
    requestDetail?: any;
    services?: any[];
    history?: any[];
    attachments?: any[];
    isCreate?: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalRequestsView: FC<PortalRequestsProps> = ({
    currentUser,
    clientName,
    requests = [],
    requestDetail,
    services = [],
    history = [],
    attachments = [],
    isCreate = false,
    successMessage,
    errorMessage
}) => {
    if (isCreate) {
        return (
            <PortalLayout
                title="Nova Solicitação • Portal do Cliente"
                activeNav="requests"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/portal/solicitacoes" style="font-size: 13px; font-weight: 700; color: #16749A; text-decoration: none;">&larr; Voltar para Solicitações</a>
                </div>

                <div class="gt-card" style="max-width: 720px; padding: 32px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #063B5C; margin-bottom: 6px;">Abrir Nova Solicitação</h1>
                    <p style="font-size: 13px; color: #527287; margin-bottom: 24px;">Conte-nos o que sua empresa precisa (novo recurso, site, campanha ou suporte técnico).</p>

                    <form action="/portal/solicitacoes" method="post" style="display: flex; flex-direction: column; gap: 18px;">
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; margin-bottom: 6px;">
                                Categoria do Serviço *
                            </label>
                            <select name="service_id" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C; background: #FFFFFF;">
                                <option value="">Selecione o serviço desejado...</option>
                                {services.map((s: any) => (
                                    <option value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; margin-bottom: 6px;">
                                Título do Pedido *
                            </label>
                            <input type="text" name="title" required placeholder="Ex: Criação de Landing Page com foco em captação de leads" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C;" />
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; margin-bottom: 6px;">
                                Descrição Detalhada *
                            </label>
                            <textarea name="description" rows={5} required placeholder="Explique os objetivos, público-alvo e requisitos essenciais do projeto..." style="width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C; font-family: inherit;"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; margin-bottom: 6px;">
                                    Orçamento Estimado (R$)
                                </label>
                                <input type="number" step="0.01" name="estimated_budget" placeholder="Ex: 5000.00" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C;" />
                            </div>

                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; margin-bottom: 6px;">
                                    Prazo Desejado
                                </label>
                                <input type="date" name="desired_deadline" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); font-size: 13px; color: #063B5C;" />
                            </div>
                        </div>

                        <div style="margin-top: 10px;">
                            <button type="submit" class="gt-btn-primary" style="width: 100%; justify-content: center; padding: 12px;">
                                Enviar Solicitação para Análise &rarr;
                            </button>
                        </div>
                    </form>
                </div>
            </PortalLayout>
        );
    }

    if (requestDetail) {
        return (
            <PortalLayout
                title={`Solicitação ${requestDetail.protocol} • Portal do Cliente`}
                activeNav="requests"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/portal/solicitacoes" style="font-size: 13px; font-weight: 700; color: #16749A; text-decoration: none;">&larr; Voltar para Solicitações</a>
                </div>

                <div class="gt-card" style="padding: 32px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div>
                            <span class="gt-badge gt-badge-warning" style="margin-bottom: 8px;">{requestDetail.status}</span>
                            <h1 style="font-size: 22px; font-weight: 800; color: #063B5C;">{requestDetail.service_title}</h1>
                            <div style="font-size: 12px; color: #8CAAB9; margin-top: 4px;">Protocolo: <strong>{requestDetail.protocol}</strong> | Aberta em: {requestDetail.created_at}</div>
                        </div>
                    </div>

                    <p style="font-size: 14px; color: #527287; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px; padding: 16px; background: #F8FAFC; border-radius: 10px; border: 1px solid var(--gt-border);">
                        {requestDetail.description}
                    </p>

                    <h2 style="font-size: 15px; font-weight: 800; color: #063B5C; margin-bottom: 16px;">Histórico de Andamento</h2>
                    {history.length === 0 ? (
                        <p style="font-size: 13px; color: #8CAAB9;">Aguardando primeira movimentação da equipe técnica.</p>
                    ) : (
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            {history.map((h: any) => (
                                <div style="display: flex; gap: 14px; padding: 12px 16px; background: #F8FAFC; border-radius: 10px; border: 1px solid var(--gt-border);">
                                    <div style="font-size: 16px;">⏱</div>
                                    <div style="flex: 1;">
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="font-size: 12px; font-weight: 700; color: #063B5C;">Status: {h.new_status}</span>
                                            <span style="font-size: 11px; color: #8CAAB9;">{h.created_at}</span>
                                        </div>
                                        {h.comment && <p style="font-size: 12px; color: #527287; margin-top: 4px;">{h.comment}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Minhas Solicitações • Portal do Cliente GundjaTech"
            activeNav="requests"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Minhas Solicitações de Serviço</h1>
                    <p style="font-size: 13px; color: #527287; margin-top: 4px;">Consulte e acompanhe suas demandas, orçamentos solicitados e prazos.</p>
                </div>
                <a href="/portal/solicitacoes/nova" class="gt-btn-primary">+ Nova Solicitação</a>
            </div>

            {requests.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">📋</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Nenhuma solicitação aberta.</h3>
                    <p style="font-size: 13px; color: #527287; margin: 8px 0 20px;">Precisa de um novo site, funcionalidade ou ajuste técnico? Abra sua solicitação agora mesmo.</p>
                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary">+ Abrir Solicitação</a>
                </div>
            ) : (
                <div class="gt-card" style="overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #F4F8FA; border-bottom: 1px solid var(--gt-border); text-align: left; color: #67879C; font-size: 11px; text-transform: uppercase;">
                                <th style="padding: 14px 20px;">Protocolo</th>
                                <th style="padding: 14px 20px;">Título / Demanda</th>
                                <th style="padding: 14px 20px;">Data</th>
                                <th style="padding: 14px 20px;">Status</th>
                                <th style="padding: 14px 20px; text-align: right;">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r: any) => (
                                <tr style="border-bottom: 1px solid var(--gt-border);">
                                    <td style="padding: 14px 20px; font-weight: 700; color: #063B5C;">{r.protocol}</td>
                                    <td style="padding: 14px 20px; font-weight: 600; color: #063B5C;">{r.service_title}</td>
                                    <td style="padding: 14px 20px; color: #527287;">{r.created_at?.slice(0, 10)}</td>
                                    <td style="padding: 14px 20px;">
                                        <span class="gt-badge gt-badge-warning">{r.status}</span>
                                    </td>
                                    <td style="padding: 14px 20px; text-align: right;">
                                        <a href={`/portal/solicitacoes/${r.id}`} class="gt-btn-outline" style="font-size: 12px; padding: 6px 12px;">
                                            Ver Detalhes &rarr;
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </PortalLayout>
    );
};
