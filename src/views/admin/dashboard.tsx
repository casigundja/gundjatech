import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';
import type { AdminDashboardData } from '../../lib/admin';

interface AdminDashboardProps {
    currentUser: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    stats: AdminDashboardData;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminDashboardView: FC<AdminDashboardProps> = ({
    currentUser,
    stats,
    successMessage,
    errorMessage
}) => {
    return (
        <AdminLayout
            title="Dashboard Executivo • Painel Administrativo GundjaTech"
            activeNav="dashboard"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 20px; margin-bottom: 28px;">
                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; letter-spacing: 0.5px;">Clientes Totais</div>
                    <div style="font-size: 28px; font-weight: 800; color: #F2C230; margin: 8px 0 4px;">{stats.totalClients}</div>
                    <div style="font-size: 12px; color: #B5D1E2;">{stats.activeClients} ativos &bull; {stats.leadClients} leads</div>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; letter-spacing: 0.5px;">Solicitações de Atendimento</div>
                    <div style="font-size: 28px; font-weight: 800; color: #F2C230; margin: 8px 0 4px;">{stats.totalRequests}</div>
                    <div style="font-size: 12px; color: #F87171;">{stats.pendingRequests} pendentes de análise</div>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; letter-spacing: 0.5px;">Projetos em Execução</div>
                    <div style="font-size: 28px; font-weight: 800; color: #F2C230; margin: 8px 0 4px;">{stats.activeProjects}</div>
                    <div style="font-size: 12px; color: #B5D1E2;">Total: {stats.totalProjects} no catálogo</div>
                </div>

                <div class="gt-card" style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; letter-spacing: 0.5px;">Orçamentos Aprovados</div>
                    <div style="font-size: 28px; font-weight: 800; color: #34D399; margin: 8px 0 4px;">{stats.approvedQuotations}</div>
                    <div style="font-size: 12px; color: #B5D1E2;">De {stats.totalQuotations} propostas emitidas</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="gt-card" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="font-size: 15px; font-weight: 800; color: #FFFFFF;">Últimas Solicitações de Clientes</h2>
                        <a href="/admin/solicitacoes" style="font-size: 12px; font-weight: 700; color: #F2C230; text-decoration: none;">Ver todas &rarr;</a>
                    </div>
                    {stats.recentRequests.length === 0 ? (
                        <p style="font-size: 13px; color: #8CAAB9; text-align: center; padding: 24px 0;">Nenhuma solicitação recente.</p>
                    ) : (
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            {stats.recentRequests.map((r: any) => (
                                <a href={`/admin/solicitacoes/${r.id}`} style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; padding: 12px 16px; background: rgba(3, 32, 51, 0.6); border-radius: 10px; border: 1px solid var(--gt-border);">
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">{r.service_title}</div>
                                        <div style="font-size: 11px; color: #8CAAB9; margin-top: 2px;">{r.company || r.name} &bull; Prot: {r.protocol}</div>
                                    </div>
                                    <span class="gt-badge gt-badge-warning">{r.status}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div class="gt-card" style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h2 style="font-size: 15px; font-weight: 800; color: #FFFFFF;">Clientes & Leads Recentes</h2>
                        <a href="/admin/clientes" style="font-size: 12px; font-weight: 700; color: #F2C230; text-decoration: none;">Ver todos &rarr;</a>
                    </div>
                    {stats.recentClients.length === 0 ? (
                        <p style="font-size: 13px; color: #8CAAB9; text-align: center; padding: 24px 0;">Nenhum cliente cadastrado.</p>
                    ) : (
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            {stats.recentClients.map((c: any) => (
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(3, 32, 51, 0.6); border-radius: 10px; border: 1px solid var(--gt-border);">
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">{c.name} {c.company ? `(${c.company})` : ''}</div>
                                        <div style="font-size: 11px; color: #8CAAB9; margin-top: 2px;">{c.email} {c.phone ? `&bull; ${c.phone}` : ''}</div>
                                    </div>
                                    <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-info'}`}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};
