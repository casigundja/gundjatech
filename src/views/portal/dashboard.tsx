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

const projectStatusLabel: Record<string, string> = {
    planning: 'Planejamento',
    in_progress: 'Em Execução',
    testing: 'Homologação',
    completed: 'Concluído',
    on_hold: 'Pausado'
};

const requestStatusLabel: Record<string, string> = {
    new: 'Nova',
    in_review: 'Em Análise',
    quotation_sent: 'Orçamento Enviado',
    approved: 'Aprovada',
    in_progress: 'Em Execução',
    completed: 'Concluída'
};

export const PortalDashboardView: FC<PortalDashboardProps> = ({
    currentUser,
    client,
    summary,
    successMessage,
    errorMessage
}) => {
    const companyOrName = client.company || client.name;

    return (
        <PortalLayout
            title="Início & Resumo • Portal do Cliente GundjaTech"
            activeNav="dashboard"
            currentUser={currentUser}
            clientName={companyOrName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {/* Executive Header */}
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        Olá, {companyOrName}
                    </h1>
                    <p class="text-xs text-[#8C95AA] mt-1">
                        Acompanhe em tempo real seus projetos, solicitações técnicas, domínios, campanhas e faturas.
                    </p>
                </div>
                <div class="flex items-center gap-2.5 flex-wrap">
                    <a href="/portal/atendimento" class="gt-btn-outline gt-btn-sm">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                        <span>Suporte Técnico</span>
                    </a>
                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                        <span>+ Nova Solicitação</span>
                    </a>
                </div>
            </div>

            {/* Standardized Compact KPI Cards */}
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Solicitações Abertas</div>
                        <div class="text-xl font-extrabold text-white mt-0.5">{summary.pendingRequests}</div>
                        <a href="/portal/solicitacoes" class="inline-flex items-center gap-1 text-[11px] font-bold text-[#16749A] hover:underline mt-1 no-underline">
                            <span>Ver todas</span>
                            <span>&rarr;</span>
                        </a>
                    </div>
                    <span class="gt-badge gt-badge-warning">Demandas</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-emerald"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Projetos em Andamento</div>
                        <div class="text-xl font-extrabold text-emerald-400 mt-0.5">{summary.activeProjects}</div>
                        <a href="/portal/projetos" class="inline-flex items-center gap-1 text-[11px] font-bold text-[#16749A] hover:underline mt-1 no-underline">
                            <span>Acompanhar</span>
                            <span>&rarr;</span>
                        </a>
                    </div>
                    <span class="gt-badge gt-badge-success">Sprints</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Domínios Monitorados</div>
                        <div class="text-xl font-extrabold text-white mt-0.5">{summary.totalDomains}</div>
                        <a href="/portal/dominios" class="inline-flex items-center gap-1 text-[11px] font-bold text-[#16749A] hover:underline mt-1 no-underline">
                            <span>Gerenciar DNS</span>
                            <span>&rarr;</span>
                        </a>
                    </div>
                    <span class="gt-badge gt-badge-info">SSL &amp; DNS</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Campanhas Ativas</div>
                        <div class="text-xl font-extrabold text-[#F2C230] mt-0.5">{summary.activeCampaigns}</div>
                        <a href="/portal/campanhas" class="inline-flex items-center gap-1 text-[11px] font-bold text-[#16749A] hover:underline mt-1 no-underline">
                            <span>Ver métricas</span>
                            <span>&rarr;</span>
                        </a>
                    </div>
                    <span class="gtb-pill-neutral">Growth</span>
                </div>
            </div>

            {/* Pending Quotations Highlight */}
            {summary.quotationsPending.length > 0 && (
                <div class="gtb-card !p-5">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div class="flex items-center justify-between gap-3 flex-wrap mb-4">
                        <div class="flex items-center gap-3">
                            <span class="w-9 h-9 rounded-xl bg-[#F2C230]/15 border border-[#F2C230]/35 flex items-center justify-center text-[#F2C230] shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </span>
                            <div>
                                <h2 class="text-sm font-extrabold text-white">Orçamentos Aguardando Sua Aprovação</h2>
                                <p class="text-xs text-[#8C95AA]">Revise as propostas enviadas pela nossa equipe para liberação imediata do cronograma.</p>
                            </div>
                        </div>
                        <span class="gt-badge gt-badge-warning">{summary.quotationsPending.length} pendente(s)</span>
                    </div>

                    <div class="space-y-2.5">
                        {summary.quotationsPending.map((quote: any) => (
                            <div class="flex items-center justify-between gap-4 flex-wrap p-3.5 rounded-xl bg-[#032033]/50 border border-white/10">
                                <div class="min-w-0">
                                    <div class="text-xs font-extrabold text-white truncate">
                                        {quote.title} <span class="text-[#8C95AA] font-mono">({quote.reference_code})</span>
                                    </div>
                                    <div class="text-xs text-[#8C95AA] mt-0.5">
                                        Investimento: <strong class="text-[#F2C230]">R$ {Number(quote.final_amount || quote.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                                    </div>
                                </div>
                                <a href={`/portal/orcamentos/${quote.id}`} class="gt-btn-primary gt-btn-xs">
                                    <span>Analisar &amp; Aprovar</span>
                                    <span>&rarr;</span>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Two-Column Responsive Panels */}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Recent Projects */}
                <div class="gtb-card !p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <span class="w-8 h-8 rounded-lg bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A]">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                </span>
                                <div>
                                    <h2 class="text-sm font-extrabold text-white">Projetos Recentes</h2>
                                    <p class="text-[11px] text-[#8C95AA]">Entregas técnicas e evolução de sprint</p>
                                </div>
                            </div>
                            <a href="/portal/projetos" class="gt-btn-outline gt-btn-xs">
                                <span>Ver todos</span>
                                <span>&rarr;</span>
                            </a>
                        </div>

                        {summary.recentProjects.length === 0 ? (
                            <div class="gt-empty-state py-8">
                                <div class="w-10 h-10 rounded-xl bg-[#16749A]/10 border border-[#16749A]/25 flex items-center justify-center text-[#16749A] mx-auto mb-2.5">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                </div>
                                <div class="text-xs font-bold text-white">Nenhum projeto em andamento no momento.</div>
                                <div class="text-[11px] text-[#8C95AA] mt-1">Seus projetos aprovados aparecerão aqui com progresso detalhado.</div>
                            </div>
                        ) : (
                            <div class="space-y-3">
                                {summary.recentProjects.map((p: any) => (
                                    <a href={`/portal/projetos/${p.id}`} class="block no-underline p-3.5 rounded-xl bg-[#032033]/40 border border-white/10 hover:border-[#16749A] transition-colors">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-xs font-extrabold text-white truncate">{p.title}</span>
                                            <span class="gt-badge gt-badge-info">{projectStatusLabel[p.status] || p.status}</span>
                                        </div>
                                        <div class="mt-2.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div style={`width: ${p.progress_percentage || 0}%; height: 100%; background: linear-gradient(90deg, #16749A 0%, #F2C230 100%);`}></div>
                                        </div>
                                        <div class="flex items-center justify-between text-[11px] text-[#8C95AA] mt-1.5">
                                            <span>Progresso de Engenharia</span>
                                            <strong class="text-white">{p.progress_percentage || 0}%</strong>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Service Requests */}
                <div class="gtb-card !p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between gap-2 pb-3.5 mb-4 border-b border-white/5">
                            <div class="flex items-center gap-2.5">
                                <span class="w-8 h-8 rounded-lg bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230]">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </span>
                                <div>
                                    <h2 class="text-sm font-extrabold text-white">Últimas Solicitações</h2>
                                    <p class="text-[11px] text-[#8C95AA]">Chamados comerciais e pedidos de escopo</p>
                                </div>
                            </div>
                            <a href="/portal/solicitacoes" class="gt-btn-outline gt-btn-xs">
                                <span>Ver todas</span>
                                <span>&rarr;</span>
                            </a>
                        </div>

                        {summary.recentRequests.length === 0 ? (
                            <div class="gt-empty-state py-8">
                                <div class="w-10 h-10 rounded-xl bg-[#F2C230]/10 border border-[#F2C230]/25 flex items-center justify-center text-[#F2C230] mx-auto mb-2.5">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </div>
                                <div class="text-xs font-bold text-white">Nenhuma solicitação aberta.</div>
                                <div class="text-[11px] text-[#8C95AA] mt-1">Solicite novos recursos, sites ou suporte especializado a qualquer momento.</div>
                            </div>
                        ) : (
                            <div class="space-y-2.5">
                                {summary.recentRequests.map((r: any) => (
                                    <a href={`/portal/solicitacoes/${r.id}`} class="flex items-center justify-between gap-3 no-underline p-3.5 rounded-xl bg-[#032033]/40 border border-white/10 hover:border-[#16749A] transition-colors">
                                        <div class="min-w-0">
                                            <div class="text-xs font-extrabold text-white truncate">{r.service_title}</div>
                                            <div class="text-[11px] text-[#8C95AA] font-mono mt-0.5">Protocolo: {r.protocol}</div>
                                        </div>
                                        <span class="gt-badge gt-badge-warning shrink-0">{requestStatusLabel[r.status] || r.status}</span>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PortalLayout>
    );
};
