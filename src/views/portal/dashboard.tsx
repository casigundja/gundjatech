import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalDashboardProps {
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    client: {
        id: number;
        name: string;
        company: string | null;
    };
    summary: {
        pendingRequests: number;
        activeProjects: number;
        totalDomains: number;
        activeCampaigns: number;
        quotationsPending: any[];
        recentProjects: any[];
        recentRequests: any[];
    };
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalDashboardView: FC<PortalDashboardProps> = ({
    currentUser,
    client,
    summary,
    successMessage,
    errorMessage
}) => {
    return (
        <PortalLayout
            title="Início & Resumo • Portal do Cliente GundjaTech"
            activeNav="dashboard"
            currentUser={currentUser}
            clientName={client.company || client.name}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 28px;">
                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; letter-spacing: 0.5px;">Solicitações Abertas</div>
                    <div style="font-size: 28px; font-weight: 800; color: #063B5C; margin: 8px 0 4px;">{summary.pendingRequests}</div>
                    <a href="/portal/solicitacoes" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Ver todas &rarr;</a>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; letter-spacing: 0.5px;">Projetos em Andamento</div>
                    <div style="font-size: 28px; font-weight: 800; color: #063B5C; margin: 8px 0 4px;">{summary.activeProjects}</div>
                    <a href="/portal/projetos" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Acompanhar &rarr;</a>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; letter-spacing: 0.5px;">Domínios Monitorados</div>
                    <div style="font-size: 28px; font-weight: 800; color: #063B5C; margin: 8px 0 4px;">{summary.totalDomains}</div>
                    <a href="/portal/dominios" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Gerenciar DNS &rarr;</a>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #67879C; letter-spacing: 0.5px;">Campanhas Ativas</div>
                    <div style="font-size: 28px; font-weight: 800; color: #063B5C; margin: 8px 0 4px;">{summary.activeCampaigns}</div>
                    <a href="/portal/campanhas" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Ver métricas &rarr;</a>
                </div>
            </div>

            {summary.quotationsPending.length > 0 && (
                <div class="gt-card" style="padding: 24px; margin-bottom: 28px; border-left: 5px solid var(--gt-gold);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <h2 style="font-size: 16px; font-weight: 800; color: #063B5C;">Orçamentos Aguardando Sua Aprovação</h2>
                            <p style="font-size: 12px; color: #527287; margin-top: 2px;">Revise as propostas enviadas pela nossa equipe para liberação do cronograma.</p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        {summary.quotationsPending.map((quote: any) => (
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #F8FAFC; border-radius: 12px; border: 1px solid var(--gt-border);">
                                <div>
                                    <div style="font-size: 14px; font-weight: 700; color: #063B5C;">{quote.title} ({quote.reference_code})</div>
                                    <div style="font-size: 12px; color: #527287; margin-top: 2px;">Valor: <strong>R$ {Number(quote.final_amount || quote.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                                </div>
                                <div style="display: flex; gap: 10px;">
                                    <a href={`/portal/orcamentos/${quote.id}`} class="gt-btn-primary" style="font-size: 12px; padding: 6px 14px;">
                                        Analisar & Aprovar &rarr;
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="gt-card" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="font-size: 15px; font-weight: 800; color: #063B5C;">Projetos Recentes</h2>
                        <a href="/portal/projetos" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Ver todos &rarr;</a>
                    </div>
                    {summary.recentProjects.length === 0 ? (
                        <p style="font-size: 13px; color: #8CAAB9; text-align: center; padding: 24px 0;">Nenhum projeto em andamento no momento.</p>
                    ) : (
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            {summary.recentProjects.map((p: any) => (
                                <a href={`/portal/projetos/${p.id}`} style="display: block; text-decoration: none; padding: 12px 16px; background: #F8FAFC; border-radius: 10px; border: 1px solid var(--gt-border);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-size: 13px; font-weight: 700; color: #063B5C;">{p.title}</span>
                                        <span class="gt-badge gt-badge-info">{p.status}</span>
                                    </div>
                                    <div style="margin-top: 8px; width: 100%; height: 6px; background: #E2E8F0; border-radius: 99px; overflow: hidden;">
                                        <div style={`width: ${p.progress_percentage || 0}%; height: 100%; background: #16749A;`}></div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8CAAB9; margin-top: 4px;">
                                        <span>Progresso</span>
                                        <span>{p.progress_percentage || 0}%</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div class="gt-card" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="font-size: 15px; font-weight: 800; color: #063B5C;">Últimas Solicitações</h2>
                        <a href="/portal/solicitacoes" style="font-size: 12px; font-weight: 700; color: #16749A; text-decoration: none;">Ver todas &rarr;</a>
                    </div>
                    {summary.recentRequests.length === 0 ? (
                        <p style="font-size: 13px; color: #8CAAB9; text-align: center; padding: 24px 0;">Nenhuma solicitação aberta.</p>
                    ) : (
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            {summary.recentRequests.map((r: any) => (
                                <a href={`/portal/solicitacoes/${r.id}`} style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; padding: 12px 16px; background: #F8FAFC; border-radius: 10px; border: 1px solid var(--gt-border);">
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #063B5C;">{r.service_title}</div>
                                        <div style="font-size: 11px; color: #8CAAB9; margin-top: 2px;">Protocolo: {r.protocol}</div>
                                    </div>
                                    <span class="gt-badge gt-badge-warning">{r.status}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PortalLayout>
    );
};
