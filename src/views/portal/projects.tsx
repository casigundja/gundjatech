import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalProjectsProps {
    currentUser: any;
    clientName?: string;
    projects: any[];
    projectDetail?: any;
    stages?: any[];
    attachments?: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

const statusMap: Record<string, { label: string; badge: string }> = {
    planning: { label: 'Planejamento', badge: 'gt-badge-info' },
    in_progress: { label: 'Em Execução', badge: 'gt-badge-warning' },
    testing: { label: 'Homologação', badge: 'gt-badge-info' },
    completed: { label: 'Concluído', badge: 'gt-badge-success' },
    on_hold: { label: 'Pausado', badge: 'gt-badge-danger' }
};

export const PortalProjectsView: FC<PortalProjectsProps> = ({
    currentUser,
    clientName,
    projects,
    projectDetail,
    stages = [],
    attachments = [],
    successMessage,
    errorMessage
}) => {
    if (projectDetail) {
        const stInfo = statusMap[projectDetail.status] || { label: projectDetail.status, badge: 'gt-badge-info' };
        const projSteps = [
            { key: 'planning', label: 'Planejamento' },
            { key: 'in_progress', label: 'Execução' },
            { key: 'testing', label: 'Homologação' },
            { key: 'completed', label: 'Concluído' },
        ];
        const normProjSt = projectDetail.status === 'reviewing' ? 'testing' : projectDetail.status;
        const currProjIdx = projSteps.findIndex((s) => s.key === normProjSt);

        return (
            <PortalLayout
                title={`${projectDetail.title} • Portal do Cliente`}
                activeNav="projects"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/portal/projetos" class="gt-back-link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        <span>Voltar para Meus Projetos</span>
                    </a>
                </div>

                <div class="gtb-card !p-6 space-y-5">
                    <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                        <div class="min-w-0 flex-1">
                            <span class={`gt-badge ${stInfo.badge} mb-2`}>{stInfo.label}</span>
                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">{projectDetail.title}</h1>
                            <p class="text-xs text-[#8C95AA] mt-1.5 leading-relaxed">{projectDetail.description || 'Sem descrição cadastrada.'}</p>
                        </div>
                        <div class="text-left sm:text-right shrink-0">
                            <div class="text-[11px] font-bold uppercase tracking-wider text-[#8C95AA]">Progresso Geral</div>
                            <div class="text-2xl font-extrabold text-[#F2C230] mt-0.5">{projectDetail.progress_percentage || 0}%</div>
                        </div>
                    </div>

                    {normProjSt !== 'on_hold' && normProjSt !== 'canceled' && (
                        <div class="gt-req-stepper gt-req-stepper--4" role="list" aria-label="Fases do projeto">
                            {projSteps.map((step, idx) => {
                                const isDoneAll = normProjSt === 'completed';
                                const isDone = isDoneAll || (currProjIdx >= 0 && idx < currProjIdx);
                                const isActive = !isDoneAll && idx === currProjIdx;
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

                    <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div style={`width: ${projectDetail.progress_percentage || 0}%; height: 100%; background: linear-gradient(90deg, #063B5C 0%, #16749A 65%, #F2C230 100%);`}></div>
                    </div>
                </div>

                <div class="gt-grid-detail">
                    <div class="gtb-card !p-5">
                        <div class="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-white/5">
                            <h2 class="text-sm font-extrabold text-white">Etapas &amp; Entregas do Cronograma</h2>
                            <span class="text-[11px] font-semibold text-[#8C95AA]">{stages.length} {stages.length === 1 ? 'etapa' : 'etapas'}</span>
                        </div>
                        {stages.length === 0 ? (
                            <div class="gt-empty-state">Nenhuma etapa detalhada no momento.</div>
                        ) : (
                            <div class="gt-activity-feed" style="max-height: 300px; overflow-y: auto; padding-right: 4px;">
                                {stages.map((st: any) => {
                                    const isDone = st.status === 'completed';
                                    return (
                                        <div class={`gt-activity-item ${isDone ? 'is-latest' : ''}`}>
                                            <div class="gt-activity-rail" aria-hidden="true">
                                                <span class="gt-activity-node">
                                                    {isDone ? (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="4"/></svg>
                                                    )}
                                                </span>
                                            </div>
                                            <div class="gt-activity-body">
                                                <div class="gt-activity-head">
                                                    <span class="gt-activity-title">{st.title}</span>
                                                    <span class="gt-activity-time">{isDone ? 'Concluída' : 'Em andamento'}</span>
                                                </div>
                                                {st.description && <div class="gt-activity-note">{st.description}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div class="gtb-card !p-5 flex flex-col justify-between gap-4">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                                <h2 class="text-sm font-extrabold text-white">Arquivos &amp; Entregáveis ({attachments.length})</h2>
                            </div>
                            {attachments.length === 0 ? (
                                <div class="gtb-surface-box rounded-xl p-5 text-center text-xs text-[#8C95AA]">
                                    Nenhum arquivo disponibilizado ainda. Você também pode enviar arquivos para a equipe abaixo.
                                </div>
                            ) : (
                                <div class="space-y-2.5" style="max-height: 270px; overflow-y: auto; padding-right: 4px;">
                                    {attachments.map((att: any) => {
                                        const isFromClient = att.uploader_role === 'client' || Number(att.user_id) === Number(currentUser?.id);
                                        const sizeKb = att.file_size ? (att.file_size < 1024 * 1024 ? `${(att.file_size / 1024).toFixed(1)} KB` : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`) : '';
                                        return (
                                            <div class="gtb-surface-box flex items-center justify-between gap-3 p-3 rounded-xl">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <span class="gtb-icon-box !w-8 !h-8 shrink-0" aria-hidden="true">
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                                    </span>
                                                    <div class="min-w-0">
                                                        <div class="text-xs font-bold text-white truncate">{att.file_name}</div>
                                                        <div class="text-[10.5px] text-[#8C95AA] flex items-center gap-1.5 flex-wrap">
                                                            <span>{isFromClient ? 'Enviado por você' : 'Equipe GundjaTech'}</span>
                                                            {sizeKb && <span>· {sizeKb}</span>}
                                                            {att.created_at && <span>· {new Date(att.created_at).toLocaleDateString('pt-BR')}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <a href={`/portal/projetos/${projectDetail.id}/anexos/${att.id}`} class="gt-btn-outline gt-btn-xs shrink-0">
                                                    Baixar
                                                </a>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Upload de Anexo pelo Cliente (sincronizado direto com o Admin) */}
                        <form
                            action={`/portal/projetos/${projectDetail.id}/anexos`}
                            method="post"
                            enctype="multipart/form-data"
                            class="gtb-surface-box rounded-xl p-4 space-y-3"
                        >
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]">
                                Enviar Arquivo para a Equipe (até 15 MB)
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
                                <span class="text-[10.5px] text-[#8C95AA]">Disponível imediatamente para nossa equipe técnica.</span>
                                <button type="submit" data-loading-text="Enviando..." class="gt-btn-petrol gt-btn-xs shrink-0">
                                    Enviar Arquivo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Projetos • Portal do Cliente GundjaTech"
            activeNav="projects"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Projetos em Andamento</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Acompanhe o status técnico, sprints e entregas dos seus produtos contratados.</p>
                </div>
                <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    <span>Novo Projeto / Demanda</span>
                </a>
            </div>

            {projects.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Você ainda não possui projetos ativos.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1 mb-5">Abra uma nova solicitação para iniciarmos o planejamento técnico do seu projeto.</p>
                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">+ Criar Solicitação</a>
                </div>
            ) : (
                <div class="gt-cards-grid">
                    {projects.map((p: any) => {
                        const stInfo = statusMap[p.status] || { label: p.status, badge: 'gt-badge-info' };
                        return (
                            <div class="gtb-card !p-5 flex flex-col justify-between">
                                <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                                <div>
                                    <div class="flex items-center justify-between gap-2 mb-3">
                                        <span class={`gt-badge ${stInfo.badge}`}>{stInfo.label}</span>
                                        <span class="text-xs font-extrabold text-[#F2C230]">{p.progress_percentage || 0}% Concluído</span>
                                    </div>
                                    <h3 class="text-base font-extrabold text-white mb-1.5">{p.title}</h3>
                                    <p class="text-xs text-[#8C95AA] leading-relaxed mb-4">
                                        {p.description || 'Desenvolvimento contínuo e infraestrutura sob medida.'}
                                    </p>
                                    <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                                        <div style={`width: ${p.progress_percentage || 0}%; height: 100%; background: linear-gradient(90deg, #16749A 0%, #F2C230 100%);`}></div>
                                    </div>
                                </div>
                                <div class="pt-3.5 border-t border-white/10 flex items-center justify-between gap-2">
                                    <span class="text-[11px] text-[#8C95AA]">Iniciado: {p.start_date || 'N/D'}</span>
                                    <a href={`/portal/projetos/${p.id}`} class="gt-btn-outline gt-btn-xs">
                                        <span>Detalhes</span>
                                        <span>&rarr;</span>
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </PortalLayout>
    );
};
