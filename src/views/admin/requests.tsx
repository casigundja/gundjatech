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

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
    new: { label: 'Novo', badgeClass: 'gt-badge-warning' },
    analyzing: { label: 'Em Análise', badgeClass: 'gt-badge-info' },
    quotation_sent: { label: 'Orçamento Enviado', badgeClass: 'gt-badge-info' },
    approved: { label: 'Aprovado', badgeClass: 'gt-badge-success' },
    in_progress: { label: 'Em Execução', badgeClass: 'gt-badge-info' },
    completed: { label: 'Concluído', badgeClass: 'gt-badge-success' },
    cancelled: { label: 'Cancelado', badgeClass: 'gt-badge-danger' }
};

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
    // ----------------------------------------------------
    // DETALHE DA SOLICITAÇÃO
    // ----------------------------------------------------
    if (requestDetail) {
        const meta = STATUS_META[requestDetail.status] || { label: requestDetail.status || 'Novo', badgeClass: 'gt-badge-warning' };

        return (
            <AdminLayout
                title={`Solicitação ${requestDetail.protocol} • Painel Administrativo`}
                activeNav="requests"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/admin/solicitacoes" class="gt-back-link">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        <span>Voltar para Solicitações</span>
                    </a>

                    <div class="gt-detail-toolbar-actions">
                        <form action={`/admin/solicitacoes/${requestDetail.id}/converter`} method="post" class="m-0">
                            <button type="submit" data-loading-text="Convertendo..." class="gt-btn-primary gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                                    <path d="M12 10v6" />
                                    <path d="M9 13h6" />
                                </svg>
                                <span>Converter em Projeto</span>
                            </button>
                        </form>

                        {requestDetail.status !== 'cancelled' && (
                            <form action={`/admin/solicitacoes/${requestDetail.id}/cancelar`} method="post" class="m-0">
                                <button type="submit" data-loading-text="Cancelando..." class="gt-btn-outline gt-btn-sm">
                                    Cancelar
                                </button>
                            </form>
                        )}

                        <form
                            action={`/admin/solicitacoes/${requestDetail.id}/excluir`}
                            method="post"
                            class="m-0"
                            onsubmit="return confirm('Deseja realmente excluir esta solicitação permanentemente?')"
                        >
                            <button type="submit" data-loading-text="Excluindo..." class="gt-btn-danger-ghost gt-btn-sm">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                                <span>Excluir</span>
                            </button>
                        </form>
                    </div>
                </div>

                <div class="gt-grid-detail items-start">
                    {/* Coluna Principal */}
                    <section class="gtb-card gtb-kpi-gold space-y-6 min-w-0">
                        <div class="pb-5 border-b border-white/10">
                            <div class="flex items-center gap-2.5 flex-wrap mb-2">
                                <span class="font-mono text-xs font-extrabold text-[#F2C230]">{requestDetail.protocol}</span>
                                <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                            </div>
                            <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white leading-tight">
                                {requestDetail.service_title || requestDetail.title}
                            </h1>
                            <p class="text-xs text-[#8C95AA] mt-1.5">
                                Cliente: <strong class="text-white">{requestDetail.company || requestDetail.name}</strong>
                                {requestDetail.email ? ` • ${requestDetail.email}` : ''}
                                {requestDetail.phone ? ` • ${requestDetail.phone}` : ''}
                            </p>
                        </div>

                        <div>
                            <h2 class="text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-2.5">Descrição da Demanda</h2>
                            <div class="gtb-surface-box rounded-xl p-4 text-[13.5px] text-white leading-relaxed whitespace-pre-wrap">
                                {requestDetail.description || 'Sem descrição detalhada.'}
                            </div>
                        </div>

                        <div>
                            <h2 class="text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-3">Linha do Tempo / Histórico</h2>
                            {history.length === 0 ? (
                                <div class="gtb-surface-box rounded-xl p-4 text-xs text-[#8C95AA]">
                                    Nenhum histórico de movimentação registrado.
                                </div>
                            ) : (
                                <div class="space-y-2.5">
                                    {history.map((h: any) => {
                                        const st = h.new_status || h.to_status || h.status_to || h.action;
                                        const stLabel = STATUS_META[st]?.label || st;
                                        return (
                                            <div class="gtb-surface-box rounded-xl px-4 py-3">
                                                <div class="flex items-center justify-between gap-2 text-xs">
                                                    <strong class="text-[#F2C230]">{stLabel}</strong>
                                                    <span class="text-[11px] text-[#8C95AA]">{h.created_at}</span>
                                                </div>
                                                {(h.comment || h.notes) && (
                                                    <p class="text-xs text-[#D5DCEB] mt-1 leading-relaxed">{h.comment || h.notes}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Coluna Lateral: Atualizar Status */}
                    <aside class="gtb-card space-y-4 min-w-0">
                        <div>
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Atualizar Status Operacional</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Registre o avanço no pipeline comercial.</p>
                        </div>

                        <form action={`/admin/solicitacoes/${requestDetail.id}/status`} method="post" class="space-y-4">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Novo Status</label>
                                <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
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
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Comentário de Atualização</label>
                                <textarea
                                    name="comment"
                                    rows={3}
                                    placeholder="Descreva o motivo ou avanço desta etapa..."
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                ></textarea>
                            </div>

                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm w-full justify-center">
                                Salvar Alteração
                            </button>
                        </form>
                    </aside>
                </div>
            </AdminLayout>
        );
    }

    // ----------------------------------------------------
    // LISTAGEM DE SOLICITAÇÕES
    // ----------------------------------------------------
    const newCount = requests.filter((r) => r.status === 'new').length;
    const analyzingCount = requests.filter((r) => r.status === 'analyzing' || r.status === 'quotation_sent').length;
    const approvedCount = requests.filter((r) => r.status === 'approved' || r.status === 'completed').length;

    return (
        <AdminLayout
            title="Solicitações & Leads • Painel Administrativo GundjaTech"
            activeNav="requests"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">
                        Gestão de Solicitações &amp; Pipeline de Entrada
                    </h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Analise briefings de clientes, qualifique leads, converta em projetos e gere orçamentos formais.
                    </p>
                </div>
                <a href="/admin/orcamentos" class="gt-btn-outline gt-btn-sm">
                    <span>Ver Orçamentos</span>
                </a>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total no Pipeline</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{requests.length}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#D5DCEB]">Total</span>
                </div>
                <div class="gtb-card gtb-kpi-blue !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Novas / Pendentes</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block">{newCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Triagem</span>
                </div>
                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Análise / Proposta</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{analyzingCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Análise</span>
                </div>
                <div class="gtb-card gtb-kpi-petrol !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Aprovadas / Concluídas</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block">{approvedCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Aprovado</span>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form action="/admin/solicitacoes" method="get" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por protocolo, título ou cliente..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os status</option>
                            <option value="new" selected={statusFilter === 'new'}>Novas</option>
                            <option value="analyzing" selected={statusFilter === 'analyzing'}>Em Análise</option>
                            <option value="quotation_sent" selected={statusFilter === 'quotation_sent'}>Orçamento Enviado</option>
                            <option value="approved" selected={statusFilter === 'approved'}>Aprovadas</option>
                            <option value="completed" selected={statusFilter === 'completed'}>Concluídas</option>
                            <option value="cancelled" selected={statusFilter === 'cancelled'}>Canceladas</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/solicitacoes" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Solicitações */}
            <div class="gtb-card !p-0 overflow-hidden">
                {requests.length === 0 ? (
                    <div class="gt-empty-state">Nenhuma solicitação encontrada.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Protocolo</th>
                                    <th class="py-3.5 px-5">Demanda / Título</th>
                                    <th class="py-3.5 px-5">Cliente / Contato</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {requests.map((r: any) => {
                                    const meta = STATUS_META[r.status] || { label: r.status || 'Novo', badgeClass: 'gt-badge-warning' };
                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5 font-mono font-bold text-[#F2C230] whitespace-nowrap">
                                                <a href={`/admin/solicitacoes/${r.id}`} class="text-inherit no-underline hover:underline">
                                                    {r.protocol}
                                                </a>
                                            </td>
                                            <td class="py-3.5 px-5 font-bold text-white">
                                                <a href={`/admin/solicitacoes/${r.id}`} class="text-inherit no-underline hover:text-[#F2C230]">
                                                    {r.service_title || r.title}
                                                </a>
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <div class="font-semibold text-white">{r.company || r.name}</div>
                                                <div class="text-[11px] text-[#8C95AA]">{r.email}</div>
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <a href={`/admin/solicitacoes/${r.id}`} class="gt-btn-outline gt-btn-xs">
                                                        <span>Gerenciar</span>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M5 12h14" />
                                                            <path d="m12 5 7 7-7 7" />
                                                        </svg>
                                                    </a>
                                                    <form
                                                        action={`/admin/solicitacoes/${r.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        onsubmit="return confirm('Deseja realmente excluir esta solicitação?')"
                                                    >
                                                        <button
                                                            type="submit"
                                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                                            title="Excluir solicitação"
                                                            aria-label="Excluir solicitação"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </form>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
