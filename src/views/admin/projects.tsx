import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminProjectsProps {
    currentUser: any;
    projects: any[];
    projectDetail?: any;
    stages?: any[];
    attachments?: any[];
    clients?: any[];
    search?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
    planning: { label: 'Planejamento', badgeClass: 'gt-badge-info' },
    in_progress: { label: 'Em Desenvolvimento', badgeClass: 'gt-badge-warning' },
    reviewing: { label: 'Em Homologação', badgeClass: 'gt-badge-warning' },
    completed: { label: 'Entregue / Concluído', badgeClass: 'gt-badge-success' },
    canceled: { label: 'Cancelado', badgeClass: 'gt-badge-danger' }
};

export const AdminProjectsView: FC<AdminProjectsProps> = ({
    currentUser,
    projects = [],
    projectDetail,
    stages = [],
    attachments = [],
    clients = [],
    search = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    // ----------------------------------------------------
    // VISÃO DE DETALHE DE PROJETO
    // ----------------------------------------------------
    if (projectDetail) {
        const statusMeta = STATUS_LABELS[projectDetail.status] || { label: projectDetail.status || 'Planejamento', badgeClass: 'gt-badge-info' };
        const progress = Math.max(0, Math.min(100, Number(projectDetail.progress_percentage || 0)));
        const completedStages = stages.filter((s) => s.status === 'completed').length;

        return (
            <AdminLayout
                title={`${projectDetail.title} • Painel Administrativo`}
                activeNav="projects"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/admin/projetos" class="gt-back-link">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        <span>Voltar para Projetos</span>
                    </a>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                        <span class="text-xs text-[#8C95AA]">
                            Etapas: <strong class="text-white">{completedStages}/{stages.length}</strong>
                        </span>
                    </div>
                </div>

                {/* Cabeçalho Executivo do Projeto */}
                <section class="gtb-card gtb-kpi-gold space-y-5">
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2.5 flex-wrap mb-2">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#8C95AA]">
                                    Cliente: <strong class="text-white">{projectDetail.company || projectDetail.client_name || 'Geral'}</strong>
                                </span>
                            </div>
                            <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white leading-tight">
                                {projectDetail.title}
                            </h1>
                            {projectDetail.description && (
                                <p class="text-xs sm:text-sm text-[#8C95AA] mt-2 max-w-3xl leading-relaxed whitespace-pre-line">
                                    {projectDetail.description}
                                </p>
                            )}
                        </div>

                        <div class="gtb-surface-box rounded-2xl px-5 py-3.5 text-right shrink-0">
                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Progresso Geral</div>
                            <div class="gt-font-display text-2xl sm:text-3xl font-extrabold text-[#F2C230] mt-0.5">{progress}%</div>
                        </div>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div class="w-full h-2.5 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                        <div style={`height: 100%; width: ${progress}%; background: linear-gradient(90deg, #16749A 0%, #F2C230 100%); border-radius: 999px; transition: width 0.3s ease;`} />
                    </div>

                    {/* Formulário de Atualização de Status & Cronograma */}
                    <form action={`/admin/projetos/${projectDetail.id}`} method="post" class="pt-5 border-t border-white/10 space-y-4">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                                <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="planning" selected={projectDetail.status === 'planning'}>Planejamento</option>
                                    <option value="in_progress" selected={projectDetail.status === 'in_progress'}>Em Desenvolvimento</option>
                                    <option value="reviewing" selected={projectDetail.status === 'reviewing'}>Em Homologação</option>
                                    <option value="completed" selected={projectDetail.status === 'completed'}>Entregue / Concluído</option>
                                    <option value="canceled" selected={projectDetail.status === 'canceled'}>Cancelado</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Progresso (%)</label>
                                <input
                                    type="number"
                                    name="progress_percentage"
                                    min="0"
                                    max="100"
                                    value={progress}
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                />
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Início</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={String(projectDetail.start_date || '').slice(0, 10)}
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                />
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Previsão de Entrega</label>
                                <input
                                    type="date"
                                    name="expected_end_date"
                                    value={String(projectDetail.expected_end_date || '').slice(0, 10)}
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-end">
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                <span>Salvar Alterações</span>
                            </button>
                        </div>
                    </form>
                </section>

                {/* Duas colunas: Etapas & Anexos */}
                <div class="gt-grid-detail items-start">
                    {/* Etapas do Cronograma */}
                    <section class="gtb-card space-y-5 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <div>
                                <h2 class="gt-font-display text-base font-extrabold text-white">Etapas do Cronograma ({stages.length})</h2>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Controle de entregas e marcos técnicos do projeto.</p>
                            </div>
                        </div>

                        <div class="space-y-2.5">
                            {stages.length === 0 ? (
                                <div class="gtb-surface-box rounded-xl p-5 text-center text-xs text-[#8C95AA]">
                                    Nenhuma etapa cadastrada ainda. Adicione o primeiro marco abaixo.
                                </div>
                            ) : (
                                stages.map((s, idx) => {
                                    const isDone = s.status === 'completed';
                                    return (
                                        <div class="gtb-surface-box rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                            <div class="flex items-center gap-3 min-w-0">
                                                <div
                                                    class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0"
                                                    style={
                                                        isDone
                                                            ? 'background: #10B981; color: #FFFFFF;'
                                                            : 'background: rgba(22, 116, 154, 0.22); color: #F2C230; border: 1px solid rgba(22, 116, 154, 0.45);'
                                                    }
                                                >
                                                    {isDone ? (
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        idx + 1
                                                    )}
                                                </div>
                                                <div class="min-w-0">
                                                    <div class={`text-[13px] font-bold truncate ${isDone ? 'line-through text-[#8C95AA]' : 'text-white'}`}>
                                                        {s.title}
                                                    </div>
                                                    {s.description && <div class="text-[11px] text-[#8C95AA] mt-0.5">{s.description}</div>}
                                                </div>
                                            </div>

                                            <form action={`/admin/projetos/${projectDetail.id}/etapas/${s.id}/toggle`} method="post" class="m-0 shrink-0">
                                                <button
                                                    type="submit"
                                                    data-loading-text="..."
                                                    class={isDone ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}
                                                >
                                                    {isDone ? 'Reabrir' : 'Concluir'}
                                                </button>
                                            </form>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Adicionar Nova Etapa */}
                        <form action={`/admin/projetos/${projectDetail.id}/etapas`} method="post" class="gtb-surface-box rounded-xl p-4 space-y-2.5">
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#F2C230]">
                                Adicionar Nova Etapa
                            </label>
                            <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Ex: Configuração DNS, SSL Cloudflare e Deploy"
                                    class="flex-1 min-w-0 rounded-xl px-3.5 py-2 text-[13px]"
                                />
                                <button type="submit" data-loading-text="..." class="gt-btn-primary gt-btn-sm shrink-0">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M5 12h14" />
                                        <path d="M12 5v14" />
                                    </svg>
                                    <span>Adicionar</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Arquivos & Anexos */}
                    <aside class="gtb-card space-y-4 min-w-0">
                        <div>
                            <h2 class="gt-font-display text-base font-extrabold text-white">Arquivos &amp; Anexos ({attachments.length})</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Documentos técnicos e entregáveis vinculados.</p>
                        </div>

                        <div class="space-y-2.5">
                            {attachments.length === 0 ? (
                                <div class="gtb-surface-box rounded-xl p-5 text-center text-xs text-[#8C95AA]">
                                    Nenhum documento ou anexo vinculado.
                                </div>
                            ) : (
                                attachments.map((att) => (
                                    <div class="gtb-surface-box rounded-xl p-3 flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2.5 min-w-0">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F2C230" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                <polyline points="14 2 14 8 20 8" />
                                            </svg>
                                            <div class="min-w-0">
                                                <div class="text-xs font-bold text-white truncate">{att.file_name}</div>
                                                <div class="text-[10.5px] text-[#8C95AA]">
                                                    {att.created_at ? new Date(att.created_at).toLocaleDateString('pt-BR') : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <a href={att.file_path} target="_blank" class="gt-btn-outline gt-btn-xs shrink-0">
                                            Baixar
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                </div>
            </AdminLayout>
        );
    }

    // ----------------------------------------------------
    // LISTAGEM GERAL DE PROJETOS
    // ----------------------------------------------------
    const inProgressCount = projects.filter((p) => p.status === 'in_progress').length;
    const reviewingCount = projects.filter((p) => p.status === 'reviewing').length;
    const completedCount = projects.filter((p) => p.status === 'completed').length;

    return (
        <AdminLayout
            title="Projetos & Entregas • Painel Administrativo"
            activeNav="projects"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Projetos &amp; Gestão de Entregas</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Acompanhamento de escopos, progresso percentual, etapas e entrega das soluções.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-novo-projeto').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Projeto</span>
                </button>
            </div>

            {/* 4 KPIs Executivos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total de Projetos</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{projects.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">na carteira técnica</div>
                </div>
                <div class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Desenvolvimento</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#F2C230]">{inProgressCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">em execução ativa</div>
                </div>
                <div class="gtb-card !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Homologação</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{reviewingCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">aguardando aprovação</div>
                </div>
                <div class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Entregues</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#34D399]">{completedCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">concluídos com sucesso</div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/projetos" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar projeto por título ou cliente..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Status</option>
                            <option value="planning" selected={statusFilter === 'planning'}>Planejamento</option>
                            <option value="in_progress" selected={statusFilter === 'in_progress'}>Em Desenvolvimento</option>
                            <option value="reviewing" selected={statusFilter === 'reviewing'}>Em Homologação</option>
                            <option value="completed" selected={statusFilter === 'completed'}>Entregue</option>
                            <option value="canceled" selected={statusFilter === 'canceled'}>Cancelado</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/projetos" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Grid de Cards de Projetos */}
            <div class="gt-cards-grid">
                {projects.length === 0 ? (
                    <div class="gtb-card gt-empty-state" style="grid-column: 1 / -1;">
                        Nenhum projeto encontrado.
                    </div>
                ) : (
                    projects.map((p) => {
                        const statusMeta = STATUS_LABELS[p.status] || { label: p.status || 'Planejamento', badgeClass: 'gt-badge-info' };
                        const progress = Math.max(0, Math.min(100, Number(p.progress_percentage || 0)));

                        return (
                            <article class="gtb-card !p-5 flex flex-col justify-between gap-4 min-w-0">
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between gap-2 flex-wrap">
                                        <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        <span class="text-[11px] font-semibold text-[#8C95AA] truncate max-w-[160px]">
                                            {p.company || p.client_name || 'Cliente'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 class="gt-font-display text-base font-extrabold text-white leading-snug">
                                            <a href={`/admin/projetos/${p.id}`} class="text-inherit no-underline hover:text-[#F2C230] transition">
                                                {p.title}
                                            </a>
                                        </h3>
                                        {p.description && (
                                            <p
                                                class="text-xs text-[#8C95AA] mt-1.5 leading-relaxed"
                                                style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;"
                                            >
                                                {p.description}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div class="space-y-3.5">
                                    <div class="gtb-surface-box rounded-xl p-3 space-y-1.5">
                                        <div class="flex items-center justify-between text-[11px]">
                                            <span class="text-[#8C95AA]">Progresso</span>
                                            <span class="font-extrabold text-[#F2C230]">{progress}%</span>
                                        </div>
                                        <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                                            <div style={`width: ${progress}%; height: 100%; background: linear-gradient(90deg, #16749A, #F2C230); border-radius: 999px;`} />
                                        </div>
                                    </div>

                                    <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                                        <span class="text-[11px] text-[#8C95AA]">
                                            Início: <strong class="text-white">{p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—'}</strong>
                                        </span>
                                        <a href={`/admin/projetos/${p.id}`} class="gt-btn-outline gt-btn-xs">
                                            <span>Gerenciar</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M5 12h14" />
                                                <path d="m12 5 7 7-7 7" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>

            {/* Modal Novo Projeto */}
            <div
                id="modal-novo-projeto"
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Cadastrar Novo Projeto</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-projeto').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/projetos" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente Vinculado *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((c) => (
                                    <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Título do Projeto *</label>
                            <input
                                type="text"
                                name="title"
                                required
                                placeholder="Ex: Portal Fullstack Cloudflare Workers"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição do Escopo</label>
                            <textarea
                                name="description"
                                rows={3}
                                placeholder="Resumo dos objetivos e entregas técnicas..."
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Início</label>
                                <input type="date" name="start_date" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Previsão de Entrega</label>
                                <input type="date" name="expected_end_date" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-projeto').style.display='none'"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Criando..." class="gt-btn-primary gt-btn-sm">
                                Criar Projeto
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
