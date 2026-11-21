import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminRequestsProps {
    currentUser: any;
    requests: any[];
    requestDetail?: any;
    history?: any[];
    statusFilter?: string;
    search?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const AdminRequestsView: FC<AdminRequestsProps> = ({
    currentUser,
    requests = [],
    requestDetail,
    history = [],
    statusFilter = '',
    search = '',
    successMessage,
    errorMessage
}) => {
    if (requestDetail) {
        return (
            <AdminLayout
                title={`Solicitação ${requestDetail.protocol} • Painel Administrativo`}
                activeNav="requests"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/admin/solicitacoes" style="font-size: 13px; font-weight: 700; color: #F2C230; text-decoration: none;">&larr; Voltar para Solicitações</a>
                </div>

                <div class="gt-card" style="padding: 24px; margin-bottom: 24px;">
                    <div class="gt-page-header" style="align-items: flex-start; border-bottom: 1px solid var(--gt-border); padding-bottom: 20px; margin-bottom: 20px;">
                        <div>
                            <span class="gt-badge gt-badge-warning" style="margin-bottom: 8px;">{requestDetail.status}</span>
                            <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF;">{requestDetail.service_title}</h1>
                            <div style="font-size: 12px; color: #8CAAB9; margin-top: 4px; word-break: break-word;">Protocolo: <strong>{requestDetail.protocol}</strong> | Cliente: <strong>{requestDetail.company || requestDetail.name}</strong> ({requestDetail.email})</div>
                        </div>

                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <form action={`/admin/solicitacoes/${requestDetail.id}/converter`} method="post">
                                <button type="submit" class="gt-btn-primary" style="font-size: 12px;">
                                    🚀 Converter em Projeto
                                </button>
                            </form>
                            <form action={`/admin/solicitacoes/${requestDetail.id}/cancelar`} method="post">
                                <button type="submit" class="gt-btn-outline" style="color: #F87171; border-color: rgba(239, 68, 68, 0.4); font-size: 12px;">
                                    Cancelar
                                </button>
                            </form>
                        </div>
                    </div>

                    <div class="gt-grid-detail">
                        <div>
                            <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 10px;">Descrição da Demanda</h2>
                            <p style="font-size: 14px; color: #E7F0F5; line-height: 1.6; white-space: pre-wrap; padding: 18px; background: rgba(3, 32, 51, 0.6); border-radius: 12px; border: 1px solid var(--gt-border); margin-bottom: 24px;">
                                {requestDetail.description}
                            </p>

                            <h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 14px;">Linha do Tempo / Histórico</h2>
                            {history.length === 0 ? (
                                <p style="font-size: 13px; color: #8CAAB9;">Nenhum histórico registrado.</p>
                            ) : (
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    {history.map((h: any) => (
                                        <div style="padding: 12px 16px; background: rgba(3, 32, 51, 0.6); border-radius: 10px; border: 1px solid var(--gt-border);">
                                            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                                <strong style="color: #F2C230;">Status: {h.new_status || h.to_status || h.status_to || h.action}</strong>
                                                <span style="color: #8CAAB9;">{h.created_at}</span>
                                            </div>
                                            {(h.comment || h.notes) && <p style="font-size: 12px; color: #B5D1E2; margin-top: 4px;">{h.comment || h.notes}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div class="gt-card" style="padding: 20px; height: fit-content;">
                            <h3 style="font-size: 14px; font-weight: 800; color: #FFFFFF; margin-bottom: 14px;">Atualizar Status Operacional</h3>
                            <form action={`/admin/solicitacoes/${requestDetail.id}/status`} method="post" style="display: flex; flex-direction: column; gap: 14px;">
                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Novo Status</label>
                                    <select name="status" style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;">
                                        <option value="new" selected={requestDetail.status === 'new'}>Novo / Recebido</option>
                                        <option value="analyzing" selected={requestDetail.status === 'analyzing'}>Em Análise Técnica</option>
                                        <option value="quotation_sent" selected={requestDetail.status === 'quotation_sent'}>Orçamento Enviado</option>
                                        <option value="approved" selected={requestDetail.status === 'approved'}>Aprovado pelo Cliente</option>
                                        <option value="in_progress" selected={requestDetail.status === 'in_progress'}>Em Execução</option>
                                        <option value="completed" selected={requestDetail.status === 'completed'}>Concluído / Entregue</option>
                                        <option value="cancelled" selected={requestDetail.status === 'cancelled'}>Cancelado</option>
                                    </select>
                                </div>

                                <div>
                                    <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Comentário de Atualização</label>
                                    <textarea name="comment" rows={3} placeholder="Descreva o motivo ou avanço desta etapa..." style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 12px; font-family: inherit;"></textarea>
                                </div>

                                <button type="submit" class="gt-btn-primary" style="justify-content: center; font-size: 12px; padding: 10px;">
                                    Salvar Alteração
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Solicitações & Leads • Painel Administrativo GundjaTech"
            activeNav="requests"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF;">Gestão de Solicitações & Pipeline de Entrada</h1>
                <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">Analise briefings de clientes, qualifique leads e gere orçamentos formais.</p>
            </div>

            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 20px;">
                <form action="/admin/solicitacoes" method="get" class="gt-filter-bar">
                    <input
                        type="text"
                        name="search"
                        value={search}
                        placeholder="Buscar por protocolo, título ou cliente..."
                        class="gt-filter-input"
                        style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;"
                    />
                    <select name="status" class="gt-filter-select" style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;">
                        <option value="">Todos os status</option>
                        <option value="new" selected={statusFilter === 'new'}>Novas</option>
                        <option value="analyzing" selected={statusFilter === 'analyzing'}>Em Análise</option>
                        <option value="quotation_sent" selected={statusFilter === 'quotation_sent'}>Orçamento Enviado</option>
                        <option value="approved" selected={statusFilter === 'approved'}>Aprovadas</option>
                        <option value="completed" selected={statusFilter === 'completed'}>Concluídas</option>
                    </select>
                    <button type="submit" class="gt-btn-outline">Filtrar</button>
                </form>
            </div>

            <div class="gt-card" style="overflow: hidden;">
                {requests.length === 0 ? (
                    <div class="gt-empty-state">Nenhuma solicitação encontrada.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: rgba(3, 32, 51, 0.8); border-bottom: 1px solid var(--gt-border); text-align: left; color: #8CAAB9; font-size: 11px; text-transform: uppercase;">
                                    <th style="padding: 14px 20px;">Protocolo</th>
                                    <th style="padding: 14px 20px;">Demanda / Título</th>
                                    <th style="padding: 14px 20px;">Cliente / Contato</th>
                                    <th style="padding: 14px 20px;">Status</th>
                                    <th style="padding: 14px 20px; text-align: right;">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r: any) => (
                                    <tr style="border-bottom: 1px solid var(--gt-border);">
                                        <td style="padding: 14px 20px; font-weight: 700; color: #F2C230; white-space: nowrap;">{r.protocol}</td>
                                        <td style="padding: 14px 20px; font-weight: 600; color: #FFFFFF;">{r.service_title}</td>
                                        <td style="padding: 14px 20px;">
                                            <div style="color: #FFFFFF;">{r.company || r.name}</div>
                                            <div style="font-size: 11px; color: #8CAAB9;">{r.email}</div>
                                        </td>
                                        <td style="padding: 14px 20px; white-space: nowrap;">
                                            <span class={`gt-badge ${r.status === 'approved' ? 'gt-badge-success' : r.status === 'cancelled' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style="padding: 14px 20px; text-align: right; white-space: nowrap;">
                                            <a href={`/admin/solicitacoes/${r.id}`} class="gt-btn-outline" style="font-size: 12px; padding: 6px 12px;">
                                                Gerenciar &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
