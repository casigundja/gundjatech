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
        const isConvertedToProject = history.some((h: any) => h.action === 'converted_to_project');
        const canConvert = !isConvertedToProject && requestDetail.status !== 'cancelled' && requestDetail.status !== 'completed';

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
                        {canConvert ? (
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
                        ) : isConvertedToProject ? (
                            <a href="/admin/projetos" class="gt-btn-petrol gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <path d="m9 11 3 3L22 4" />
                                </svg>
                                <span>Ver em Projetos</span>
                            </a>
                        ) : null}

                        <button
                            type="button"
                            onclick="var p=document.getElementById('gt-profile-menu');if(p)p.classList.add('hidden');var n=document.getElementById('gt-notif-dropdown');if(n)n.classList.add('hidden');var m=document.getElementById('gt-edit-request-modal');if(m){m.classList.remove('hidden');var first=m.querySelector('input[name=service_title]');if(first)setTimeout(function(){first.focus();},50);}"
                            class="gt-btn-outline gt-btn-sm"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                            <span>Editar</span>
                        </button>

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

                {/* Modal Editar Solicitação */}
                <div
                    id="gt-edit-request-modal"
                    class="gt-modal-overlay hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="gt-edit-request-title"
                    onclick="if(event.target===this)this.classList.add('hidden')"
                >
                    <div class="gtb-card gt-modal-card max-w-2xl !p-0 overflow-hidden">
                        <div class="gtb-card-accent-top gtb-card-accent-gold"></div>

                        {/* Cabeçalho do Modal */}
                        <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10">
                            <div class="flex items-center gap-3 min-w-0">
                                <span
                                    class="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                                    style="background: rgba(242, 194, 48, 0.16); border: 1px solid rgba(242, 194, 48, 0.42); color: #F2C230;"
                                    aria-hidden="true"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                </span>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <h2 id="gt-edit-request-title" class="gt-font-display text-base font-extrabold text-white">Editar Solicitação</h2>
                                        <span class="gtb-badge-pill">{requestDetail.protocol || `#${requestDetail.id}`}</span>
                                    </div>
                                    <p class="text-xs text-[#8C95AA] mt-0.5">Atualize título, dados do cliente, valor estimado e descrição da demanda.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onclick="document.getElementById('gt-edit-request-modal').classList.add('hidden')"
                                class="gtb-icon-btn !w-9 !h-9 rounded-xl shrink-0"
                                aria-label="Fechar modal"
                                title="Fechar (Esc)"
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <form action={`/admin/solicitacoes/${requestDetail.id}/editar`} method="post" class="p-6 space-y-4">
                            {/* Seção 1: Identificação & Orçamento */}
                            <div class="gt-modal-section space-y-3.5">
                                <div class="gt-modal-section-title">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    <span>Identificação & Valor</span>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <div class="sm:col-span-2">
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            Título da Solicitação *
                                        </label>
                                        <input
                                            type="text"
                                            name="service_title"
                                            required
                                            value={requestDetail.service_title || requestDetail.title || ''}
                                            class="gt-modal-input"
                                            placeholder="Ex: Desenvolvimento de Sistema Web"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            Orçamento Estimado
                                        </label>
                                        <div class="gt-modal-input-prefix-wrap">
                                            <span class="gt-modal-input-prefix">R$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="estimated_budget"
                                                value={requestDetail.estimated_budget ?? ''}
                                                placeholder="2500.00"
                                                class="gt-modal-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seção 2: Dados do Cliente */}
                            <div class="gt-modal-section space-y-3.5">
                                <div class="gt-modal-section-title">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    <span>Dados do Cliente</span>
                                </div>

                                <div class="gt-grid-2">
                                    <div>
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            Nome do Contato
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={requestDetail.name || ''}
                                            placeholder="Nome do responsável"
                                            class="gt-modal-input"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            Empresa
                                        </label>
                                        <input
                                            type="text"
                                            name="company"
                                            value={requestDetail.company || ''}
                                            placeholder="Nome da empresa (opcional)"
                                            class="gt-modal-input"
                                        />
                                    </div>
                                </div>

                                <div class="gt-grid-2">
                                    <div>
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={requestDetail.email || ''}
                                            placeholder="cliente@empresa.com"
                                            class="gt-modal-input"
                                        />
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                            Telefone / WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={requestDetail.phone || ''}
                                            placeholder="+55 (11) 99999-9999"
                                            class="gt-modal-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seção 3: Descrição da Demanda */}
                            <div class="gt-modal-section">
                                <div class="gt-modal-section-title">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                                    <span>Escopo da Demanda *</span>
                                </div>

                                <textarea
                                    name="description"
                                    rows={4}
                                    required
                                    placeholder="Descreva os requisitos, objetivos e detalhes técnicos da solicitação..."
                                    class="gt-modal-input"
                                    style="resize: vertical; min-height: 96px;"
                                >{requestDetail.description || requestDetail.briefing || ''}</textarea>
                            </div>

                            {/* Rodapé de Ações */}
                            <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                                <span class="text-[11px] text-[#8C95AA]">A alteração será registrada na linha do tempo.</span>
                                <div class="flex items-center gap-2.5 ml-auto">
                                    <button
                                        type="button"
                                        onclick="document.getElementById('gt-edit-request-modal').classList.add('hidden')"
                                        class="gt-btn-outline gt-btn-sm"
                                    >
                                        Cancelar
                                    </button>
                                    <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>Salvar Alterações</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                <script dangerouslySetInnerHTML={{ __html: `
                    document.addEventListener('keydown', function (e) {
                        if (e.key === 'Escape') {
                            var m = document.getElementById('gt-edit-request-modal');
                            if (m && !m.classList.contains('hidden')) m.classList.add('hidden');
                        }
                    });
                ` }} />
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
