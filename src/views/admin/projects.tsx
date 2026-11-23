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

function formatFileSize(bytes?: number | null): string {
    const n = Number(bytes || 0);
    if (!n) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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
        const projectSteps = [
            { key: 'planning', label: 'Planejamento' },
            { key: 'in_progress', label: 'Desenvolvimento' },
            { key: 'reviewing', label: 'Homologação' },
            { key: 'completed', label: 'Concluído' },
        ];
        const currentProjStep = projectSteps.findIndex((s) => s.key === projectDetail.status);

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
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                        <span class="text-xs text-[#8C95AA]">
                            Etapas: <strong class="text-white">{completedStages}/{stages.length}</strong>
                        </span>
                        <form
                            action={`/admin/projetos/${projectDetail.id}/excluir`}
                            method="post"
                            class="m-0"
                            data-confirm="Deseja realmente excluir este projeto e todas as suas etapas?"
                        >
                            <button type="submit" class="gt-btn-danger-ghost gt-btn-xs">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                </svg>
                                <span>Excluir Projeto</span>
                            </button>
                        </form>
                    </div>
                </div>

                {/* Cabeçalho Executivo do Projeto */}
                <section class="gtb-card !p-5 space-y-5">
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2.5 flex-wrap mb-1.5">
                                <span class="text-[11px] font-bold uppercase tracking-wider text-[#8C95AA]">
                                    Cliente: <strong class="text-white">{projectDetail.company || projectDetail.client_name || 'Geral'}</strong>
                                </span>
                            </div>
                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white leading-tight">
                                {projectDetail.title}
                            </h1>
                            {projectDetail.description && (
                                <p class="text-xs text-[#8C95AA] mt-2 max-w-3xl leading-relaxed whitespace-pre-line">
                                    {projectDetail.description}
                                </p>
                            )}
                        </div>

                        <div class="gtb-surface-box rounded-2xl px-5 py-3 text-right shrink-0">
                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Progresso Geral</div>
                            <div id="gt-proj-progress-kpi" class="gt-font-display text-2xl font-extrabold text-[#F2C230] mt-0.5" style="font-variant-numeric: tabular-nums;">{progress}%</div>
                        </div>
                    </div>

                    {/* Esteira Visual de Etapas do Projeto */}
                    {projectDetail.status !== 'canceled' && (
                        <div class="gt-req-stepper gt-req-stepper--4" role="list" aria-label="Fases do projeto">
                            {projectSteps.map((step, idx) => {
                                const isDoneAll = projectDetail.status === 'completed';
                                const isDone = isDoneAll || (currentProjStep >= 0 && idx < currentProjStep);
                                const isActive = !isDoneAll && idx === currentProjStep;
                                return (
                                    <div class={`gt-req-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`} role="listitem">
                                        <span class="gt-req-step-dot" aria-hidden="true">
                                            {isDone ? (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                idx + 1
                                            )}
                                        </span>
                                        <span class="gt-req-step-label">{step.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Barra de Progresso Visual */}
                    <div class="w-full h-2 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                        <div id="gt-proj-progress-bar" style={`height: 100%; width: ${progress}%; background: linear-gradient(90deg, #063B5C 0%, #16749A 65%, #F2C230 100%); border-radius: 999px; transition: width 0.3s ease;`} />
                    </div>

                    {/* Formulário de Atualização de Status & Cronograma */}
                    <form action={`/admin/projetos/${projectDetail.id}`} method="post" data-dirty-guard="1" class="pt-4 space-y-4" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px;">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                                <select
                                    id="gt-proj-status-select"
                                    name="status"
                                    onchange="var map={planning:15,in_progress:50,reviewing:85,completed:100,canceled:0};var pct=map[this.value];if(pct!==undefined){var inp=document.getElementById('gt-proj-progress-input');if(inp){inp.value=String(pct);inp.dispatchEvent(new Event('input',{bubbles:true}));}var kpi=document.getElementById('gt-proj-progress-kpi');if(kpi)kpi.textContent=pct+'%';var bar=document.getElementById('gt-proj-progress-bar');if(bar)bar.style.width=pct+'%';}"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                >
                                    <option value="planning" selected={projectDetail.status === 'planning'}>Planejamento</option>
                                    <option value="in_progress" selected={projectDetail.status === 'in_progress'}>Em Desenvolvimento</option>
                                    <option value="reviewing" selected={projectDetail.status === 'reviewing'}>Em Homologação</option>
                                    <option value="completed" selected={projectDetail.status === 'completed'}>Entregue / Concluído</option>
                                    <option value="canceled" selected={projectDetail.status === 'canceled'}>Cancelado</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Progresso (%) · Automático</label>
                                <input
                                    id="gt-proj-progress-input"
                                    type="number"
                                    name="progress_percentage"
                                    min="0"
                                    max="100"
                                    value={progress}
                                    oninput="var v=Math.max(0,Math.min(100,parseInt(this.value||'0',10)||0));var kpi=document.getElementById('gt-proj-progress-kpi');if(kpi)kpi.textContent=v+'%';var bar=document.getElementById('gt-proj-progress-bar');if(bar)bar.style.width=v+'%';"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                            </div>

                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Início</label>
                                <input
                                    type="date"
                                    name="start_date"
                                    value={String(projectDetail.start_date || '').slice(0, 10)}
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                />
                            </div>

                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Previsão de Entrega</label>
                                <input
                                    type="date"
                                    name="expected_end_date"
                                    value={String(projectDetail.expected_end_date || '').slice(0, 10)}
                                    class="w-full rounded-xl px-3.5 py-2 text-xs"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-end">
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Salvar Alterações</span>
                            </button>
                        </div>
                    </form>
                </section>

                {/* Duas colunas equalizadas (7fr / 5fr): Etapas & Anexos */}
                <div class="gt-crm-grid">
                    {/* Etapas do Cronograma */}
                    <section class="gtb-card !p-5 flex flex-col justify-between gap-4 min-w-0">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between gap-2 pb-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <div>
                                    <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Etapas do Cronograma ({stages.length})</h2>
                                    <p class="text-xs text-[#8C95AA] mt-0.5">Controle de entregas e marcos técnicos do projeto.</p>
                                </div>
                                <span class="gt-badge gt-badge-info">{completedStages}/{stages.length} concluídas</span>
                            </div>

                            <div class="space-y-2.5" style="max-height: 270px; overflow-y: auto; padding-right: 4px;">
                                {stages.length === 0 ? (
                                    <div class="gtb-surface-box rounded-xl p-6 text-center text-xs text-[#8C95AA]">
                                        Nenhuma etapa cadastrada ainda. Adicione o primeiro marco abaixo.
                                    </div>
                                ) : (
                                    stages.map((s, idx) => {
                                        const isDone = s.status === 'completed';
                                        return (
                                            <div class="gtb-surface-box rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                                <div class="flex items-center gap-3 min-w-0">
                                                    <span
                                                        style={`width: 28px; height: 28px; min-width: 28px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; ${
                                                            isDone
                                                                ? 'background: #10B981; color: #FFFFFF;'
                                                                : 'background: #063B5C; color: #F2C230;'
                                                        }`}
                                                    >
                                                        {isDone ? (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        ) : (
                                                            idx + 1
                                                        )}
                                                    </span>
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
                        </div>

                        {/* Adicionar Nova Etapa */}
                        <form action={`/admin/projetos/${projectDetail.id}/etapas`} method="post" class="gtb-surface-box rounded-xl p-4 space-y-2.5">
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]">
                                Adicionar Nova Etapa
                            </label>
                            <div class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Ex: Configuração DNS, SSL Cloudflare e Deploy"
                                    class="flex-1 min-w-0 rounded-xl px-3.5 py-2 text-xs"
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

                    {/* Arquivos & Anexos (com Upload R2 + Visibilidade Portal + Download/Exclusão) */}
                    <aside class="gtb-card !p-5 flex flex-col justify-between gap-4 min-w-0">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between gap-2 pb-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <div>
                                    <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">Arquivos &amp; Anexos ({attachments.length})</h2>
                                    <p class="text-xs text-[#8C95AA] mt-0.5">Documentos técnicos, contratos e entregáveis.</p>
                                </div>
                            </div>

                            <div class="space-y-2.5" style="max-height: 270px; overflow-y: auto; padding-right: 4px;">
                                {attachments.length === 0 ? (
                                    <div class="gtb-surface-box rounded-xl p-6 text-center text-xs text-[#8C95AA]">
                                        Nenhum documento ou anexo vinculado ainda. Use o formulário abaixo para enviar.
                                    </div>
                                ) : (
                                    attachments.map((att) => {
                                        const sizeLabel = formatFileSize(att.file_size);
                                        const isPortalVisible = att.is_client_visible !== 0;
                                        const isFromClient = att.uploader_role === 'client';
                                        return (
                                            <div class="gtb-surface-box rounded-xl p-3 flex items-center justify-between gap-2.5">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <span class="gtb-icon-box !w-8 !h-8 shrink-0" aria-hidden="true">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                                            <polyline points="14 2 14 8 20 8" />
                                                        </svg>
                                                    </span>
                                                    <div class="min-w-0">
                                                        <div class="text-xs font-bold text-white truncate">{att.file_name}</div>
                                                        <div class="text-[10.5px] text-[#8C95AA] flex items-center gap-1.5 flex-wrap">
                                                            <span class={isFromClient ? 'font-bold text-[#16749A]' : ''}>{isFromClient ? 'Cliente' : 'Equipe'}</span>
                                                            <span>· {att.created_at ? new Date(att.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                                                            {sizeLabel && <span>· {sizeLabel}</span>}
                                                            <span>· {isPortalVisible ? 'Portal' : 'Interno'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="inline-flex items-center gap-1.5 shrink-0">
                                                    <a href={`/admin/projetos/${projectDetail.id}/anexos/${att.id}`} class="gt-btn-outline gt-btn-xs">
                                                        Baixar
                                                    </a>
                                                    <form
                                                        action={`/admin/projetos/${projectDetail.id}/anexos/${att.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente excluir este anexo?"
                                                    >
                                                        <button type="submit" class="gt-btn-danger-ghost gt-btn-icon-only" title="Excluir anexo" aria-label="Excluir anexo">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Upload de Novo Anexo */}
                        <form
                            action={`/admin/projetos/${projectDetail.id}/anexos`}
                            method="post"
                            enctype="multipart/form-data"
                            class="gtb-surface-box rounded-xl p-4 space-y-3"
                        >
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]">
                                Enviar Novo Anexo (até 15 MB)
                            </label>
                            <input
                                type="file"
                                name="file"
                                required
                                accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
                                class="w-full rounded-xl px-3 py-2 text-xs"
                                style="border: 1px dashed rgba(22, 116, 154, 0.35); cursor: pointer;"
                            />
                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                <label class="inline-flex items-center gap-2 text-[11px] font-semibold text-[#8C95AA] cursor-pointer">
                                    <input type="checkbox" name="is_client_visible" value="1" checked />
                                    <span>Visível no Portal do Cliente</span>
                                </label>
                                <button type="submit" data-loading-text="Enviando..." class="gt-btn-petrol gt-btn-xs shrink-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" x2="12" y1="3" y2="15" />
                                    </svg>
                                    <span>Enviar Anexo</span>
                                </button>
                            </div>
                        </form>
                    </aside>
                </div>
            </AdminLayout>
        );
    }

    // ----------------------------------------------------
    // LISTAGEM GERAL DE PROJETOS (TABELA EXECUTIVA UNIFICADA)
    // ----------------------------------------------------
    const planningCount = projects.filter((p) => p.status === 'planning').length;
    const inProgressCount = projects.filter((p) => p.status === 'in_progress').length;
    const reviewingCount = projects.filter((p) => p.status === 'reviewing').length;
    const completedCount = projects.filter((p) => p.status === 'completed').length;

    const buildFilterUrl = (nextStatus: string) => {
        const params = new URLSearchParams();
        if (nextStatus) params.set('status', nextStatus);
        if (search) params.set('search', search);
        const qs = params.toString();
        return qs ? `/admin/projetos?${qs}` : '/admin/projetos';
    };

    return (
        <AdminLayout
            title="Projetos & Entregas • Painel Administrativo"
            activeNav="projects"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0">
                    <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">Projetos &amp; Gestão de Entregas</h1>
                    <p class="text-xs text-[#8C95AA] mt-0.5">
                        Acompanhamento de escopos, progresso percentual, etapas, anexos e entrega das soluções.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-novo-projeto').style.display='flex'"
                    class="gt-btn-primary gt-btn-sm shrink-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Projeto</span>
                </button>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="gtb-card gtb-kpi-gold !py-3.5 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total de Projetos</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block" style="font-variant-numeric: tabular-nums;">{projects.length}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Carteira</span>
                </div>
                <div class="gtb-card gtb-kpi-blue !py-3.5 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Desenvolvimento</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block" style="font-variant-numeric: tabular-nums;">{inProgressCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Ativo</span>
                </div>
                <div class="gtb-card !py-3.5 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Homologação</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block" style="font-variant-numeric: tabular-nums;">{reviewingCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Revisão</span>
                </div>
                <div class="gtb-card gtb-kpi-petrol !py-3.5 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Entregues</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block" style="font-variant-numeric: tabular-nums;">{completedCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Concluído</span>
                </div>
            </div>

            {/* Card Unificado: Toolbar de Filtros + Tabela Executiva de Projetos */}
            <section class="gtb-card !p-0 overflow-hidden">
                <div class="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <a
                            href={buildFilterUrl('')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                !statusFilter ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Todos ({projects.length})
                        </a>
                        <a
                            href={buildFilterUrl('planning')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'planning' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Planejamento ({planningCount})
                        </a>
                        <a
                            href={buildFilterUrl('in_progress')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'in_progress' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Desenvolvimento ({inProgressCount})
                        </a>
                        <a
                            href={buildFilterUrl('reviewing')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'reviewing' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Homologação ({reviewingCount})
                        </a>
                        <a
                            href={buildFilterUrl('completed')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'completed' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Entregues ({completedCount})
                        </a>
                    </div>

                    <form method="get" action="/admin/projetos" class="flex flex-wrap items-center gap-2 m-0">
                        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar projeto ou cliente..."
                            class="rounded-xl px-3 py-1.5 text-xs"
                            style="width: 220px;"
                        />
                        <button type="submit" class="gt-btn-outline gt-btn-xs">Filtrar</button>
                        {(search || statusFilter) && (
                            <a href="/admin/projetos" class="gt-btn-outline gt-btn-xs">Limpar</a>
                        )}
                    </form>
                </div>

                {projects.length === 0 ? (
                    <div class="p-5">
                        <div class="gt-crm-empty-frame" style="margin-top: 0;">
                            <span class="gt-crm-empty-icon" aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                </svg>
                            </span>
                            <h3 class="gt-font-display text-sm sm:text-base font-extrabold text-white" style="margin: 0 0 6px 0;">
                                Nenhum projeto encontrado
                            </h3>
                            <p class="text-xs text-[#8C95AA]" style="max-width: 400px; line-height: 1.6; margin: 0 0 18px 0;">
                                Crie um novo projeto ou converta um orçamento aprovado para acompanhar etapas, prazos e anexos.
                            </p>
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-projeto').style.display='flex'"
                                class="gt-btn-primary gt-btn-xs"
                            >
                                + Novo Projeto
                            </button>
                        </div>
                    </div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3 px-4">Projeto / Escopo</th>
                                    <th class="py-3 px-4">Cliente</th>
                                    <th class="py-3 px-4" style="min-width: 170px;">Progresso</th>
                                    <th class="py-3 px-4">Início / Previsão</th>
                                    <th class="py-3 px-4">Status</th>
                                    <th class="py-3 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {projects.map((p) => {
                                    const statusMeta = STATUS_LABELS[p.status] || { label: p.status || 'Planejamento', badgeClass: 'gt-badge-info' };
                                    const progress = Math.max(0, Math.min(100, Number(p.progress_percentage || 0)));
                                    const startLabel = p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—';
                                    const endLabel = p.expected_end_date ? new Date(p.expected_end_date).toLocaleDateString('pt-BR') : '';

                                    return (
                                        <tr class="hover:bg-white/[0.02]">
                                            <td class="py-3.5 px-4 align-middle">
                                                <div class="flex items-center gap-3">
                                                    <span class="gtb-icon-box !w-9 !h-9 shrink-0" aria-hidden="true">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                        </svg>
                                                    </span>
                                                    <div class="min-w-0">
                                                        <a href={`/admin/projetos/${p.id}`} class="font-extrabold text-white text-[13px] no-underline hover:text-[#16749A] transition block truncate max-w-[300px]">
                                                            {p.title}
                                                        </a>
                                                        {p.description && (
                                                            <div class="text-[11px] text-[#8C95AA] truncate max-w-[320px] mt-0.5">
                                                                {p.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap font-bold text-white">
                                                {p.company || p.client_name || 'Cliente'}
                                            </td>

                                            <td class="py-3.5 px-4 align-middle">
                                                <div class="flex items-center justify-between gap-2 text-[11px] mb-1" style="font-variant-numeric: tabular-nums;">
                                                    <span class="font-bold text-white">{progress}%</span>
                                                </div>
                                                <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                                                    <div style={`width: ${progress}%; height: 100%; background: linear-gradient(90deg, #063B5C 0%, #16749A 65%, #F2C230 100%); border-radius: 999px;`} />
                                                </div>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap text-[#8C95AA]" style="font-variant-numeric: tabular-nums;">
                                                <div class="font-semibold text-white">{startLabel}</div>
                                                {endLabel && <div class="text-[10.5px]">Prev: {endLabel}</div>}
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                                                <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <a href={`/admin/projetos/${p.id}`} class="gt-btn-petrol gt-btn-xs">
                                                        Gerenciar →
                                                    </a>
                                                    <form
                                                        action={`/admin/projetos/${p.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente excluir este projeto permanentemente?"
                                                    >
                                                        <button
                                                            type="submit"
                                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                                            title="Excluir projeto"
                                                            aria-label="Excluir projeto"
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
            </section>

            {/* Modal Novo Projeto */}
            <div
                id="modal-novo-projeto"
                style="display: none;"
                class="gt-modal-overlay"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-7">
                    <div class="flex items-center justify-between gap-3 pb-4 mb-5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                        <div>
                            <h2 class="gt-font-display text-base sm:text-lg font-extrabold text-white">Cadastrar Novo Projeto</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Vincule o cliente, escopo e cronograma inicial.</p>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-projeto').style.display='none'"
                            class="gtb-ctrl-btn !w-8 !h-8 !p-0 justify-center"
                            aria-label="Fechar"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/projetos" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente Vinculado *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2 text-xs">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((c) => (
                                    <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Título do Projeto *</label>
                            <input
                                type="text"
                                name="title"
                                required
                                placeholder="Ex: Portal Fullstack Cloudflare Workers"
                                class="w-full rounded-xl px-3.5 py-2 text-xs"
                            />
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição do Escopo</label>
                            <textarea
                                name="description"
                                rows={3}
                                placeholder="Resumo dos objetivos e entregas técnicas..."
                                class="w-full rounded-xl px-3.5 py-2 text-xs"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Início</label>
                                <input type="date" name="start_date" class="w-full rounded-xl px-3.5 py-2 text-xs" />
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Previsão de Entrega</label>
                                <input type="date" name="expected_end_date" class="w-full rounded-xl px-3.5 py-2 text-xs" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
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
