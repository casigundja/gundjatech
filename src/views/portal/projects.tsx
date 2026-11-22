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

                <div class="gtb-card !p-6">
                    <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                    <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
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

                    <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div style={`width: ${projectDetail.progress_percentage || 0}%; height: 100%; background: linear-gradient(90deg, #16749A 0%, #F2C230 100%);`}></div>
                    </div>
                </div>

                <div class="gt-grid-detail">
                    <div class="gtb-card !p-5">
                        <h2 class="text-sm font-extrabold text-white pb-3 mb-4 border-b border-white/5">Etapas &amp; Entregas do Cronograma</h2>
                        {stages.length === 0 ? (
                            <div class="gt-empty-state">Nenhuma etapa detalhada no momento.</div>
                        ) : (
                            <div class="space-y-3">
                                {stages.map((st: any, idx: number) => (
                                    <div class="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#032033]/40 border border-white/10">
                                        <span class="gt-step-badge">
                                            {idx + 1}
                                        </span>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                                <strong class="text-xs font-extrabold text-white">{st.title}</strong>
                                                <span class={`gt-badge ${st.status === 'completed' ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                                    {st.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                                                </span>
                                            </div>
                                            {st.description && <p class="text-xs text-[#8C95AA] mt-1">{st.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div class="gtb-card !p-5">
                        <h2 class="text-sm font-extrabold text-white pb-3 mb-4 border-b border-white/5">Arquivos &amp; Entregáveis</h2>
                        {attachments.length === 0 ? (
                            <div class="gt-empty-state">Nenhum arquivo disponibilizado ainda.</div>
                        ) : (
                            <div class="space-y-2.5">
                                {attachments.map((att: any) => (
                                    <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#032033]/40 border border-white/10">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <svg class="w-4 h-4 text-[#16749A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                            <span class="text-xs font-bold text-white truncate">{att.file_name}</span>
                                        </div>
                                        <a href={`/portal/projetos/${projectDetail.id}/anexos/${att.id}`} class="gt-btn-outline gt-btn-xs shrink-0">
                                            Baixar
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Meus Projetos • Portal do Cliente GundjaTech"
            activeNav="projects"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Meus Projetos em Andamento</h1>
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
