import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalRequestsProps {
    currentUser: any;
    clientName?: string;
    requests?: any[];
    requestDetail?: any;
    services?: any[];
    history?: any[];
    attachments?: any[];
    isCreate?: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const reqStatusLabel: Record<string, string> = {
    new: 'Nova',
    in_review: 'Em Análise',
    quotation_sent: 'Orçamento Enviado',
    approved: 'Aprovada',
    in_progress: 'Em Execução',
    completed: 'Concluída'
};

export const PortalRequestsView: FC<PortalRequestsProps> = ({
    currentUser,
    clientName,
    requests = [],
    requestDetail,
    services = [],
    history = [],
    isCreate = false,
    successMessage,
    errorMessage
}) => {
    if (isCreate) {
        return (
            <PortalLayout
                title="Nova Solicitação • Portal do Cliente"
                activeNav="requests"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/portal/solicitacoes" class="gt-back-link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        <span>Voltar para Solicitações</span>
                    </a>
                </div>

                <div class="gt-grid-detail items-start">
                    <div class="gtb-card !p-6">
                        <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                        <div class="flex items-center gap-3 pb-4 mb-5 border-b border-white/10">
                            <span class="w-10 h-10 rounded-xl bg-[#F2C230]/15 border border-[#F2C230]/35 flex items-center justify-center text-[#F2C230] shrink-0">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            </span>
                            <div>
                                <h1 class="gt-font-display text-lg font-extrabold text-white">Abrir Nova Solicitação</h1>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Descreva o escopo desejado para receber análise técnica e proposta formal.</p>
                            </div>
                        </div>

                        <form action="/portal/solicitacoes" method="post" class="space-y-4">
                            <div>
                                <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                    Categoria do Serviço *
                                </label>
                                <select name="service_id" required class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white">
                                    <option value="">Selecione o serviço desejado...</option>
                                    {services.map((s: any) => (
                                        <option value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                    Título do Pedido *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Ex: Criação de Landing Page com foco em captação de leads"
                                    class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                                />
                            </div>

                            <div>
                                <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                    Descrição Detalhada *
                                </label>
                                <textarea
                                    name="description"
                                    rows={5}
                                    required
                                    placeholder="Explique os objetivos, público-alvo, integrações e requisitos essenciais do projeto..."
                                    class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                                ></textarea>
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Orçamento Estimado (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="estimated_budget"
                                        placeholder="Ex: 5000.00"
                                        class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                                    />
                                </div>

                                <div>
                                    <label class="block text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                        Prazo Desejado
                                    </label>
                                    <input
                                        type="date"
                                        name="desired_deadline"
                                        class="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#032033] text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div class="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5 flex-wrap">
                                <a href="/portal/solicitacoes" class="gt-btn-outline gt-btn-sm">Cancelar</a>
                                <button type="submit" class="gt-btn-primary gt-btn-sm">
                                    <span>Enviar Solicitação para Análise</span>
                                    <span>&rarr;</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="space-y-4">
                        <div class="gtb-card !p-5">
                            <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                            <div class="flex items-center justify-between mb-4">
                                <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#16749A]">Fluxo de Atendimento</h2>
                                <span class="text-[10.5px] font-bold text-[#8C95AA]">3 etapas</span>
                            </div>
                            <div class="space-y-4">
                                <div class="flex items-start gap-3">
                                    <span class="w-7 h-7 rounded-lg bg-[#063B5C] border border-[#16749A]/50 text-[#F2C230] text-xs font-extrabold flex items-center justify-center shrink-0">1</span>
                                    <div>
                                        <div class="text-xs font-extrabold text-white">Protocolo &amp; Triagem</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Seu pedido recebe um código único GNDJ e entra na fila prioritária de engenharia.</div>
                                    </div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="w-7 h-7 rounded-lg bg-[#063B5C] border border-[#16749A]/50 text-[#F2C230] text-xs font-extrabold flex items-center justify-center shrink-0">2</span>
                                    <div>
                                        <div class="text-xs font-extrabold text-white">Orçamento Transparente</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Enviamos a proposta detalhada com escopo, prazo e valor para aprovação em 1 clique.</div>
                                    </div>
                                </div>
                                <div class="flex items-start gap-3">
                                    <span class="w-7 h-7 rounded-lg bg-[#063B5C] border border-[#16749A]/50 text-[#F2C230] text-xs font-extrabold flex items-center justify-center shrink-0">3</span>
                                    <div>
                                        <div class="text-xs font-extrabold text-white">Execução &amp; Entregas</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Acompanhe cada etapa, percentual concluído e arquivos direto pelo Portal.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="gt-petrol-cta-card rounded-2xl p-5">
                            <div class="flex items-center gap-2.5 mb-2">
                                <span class="w-8 h-8 rounded-lg bg-[#F2C230]/20 border border-[#F2C230]/40 flex items-center justify-center text-[#F2C230] shrink-0">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                                </span>
                                <div class="gt-petrol-cta-title">Precisa de ajuda no escopo?</div>
                            </div>
                            <p class="gt-petrol-cta-desc">
                                Fale diretamente com nossa equipe técnica no chat em tempo real antes de enviar sua solicitação.
                            </p>
                            <a href="/portal/atendimento" class="gt-btn-primary gt-btn-sm w-full justify-center">
                                <span>Abrir Chat com Engenharia</span>
                                <span>&rarr;</span>
                            </a>
                        </div>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    if (requestDetail) {
        return (
            <PortalLayout
                title={`Solicitação ${requestDetail.protocol} • Portal do Cliente`}
                activeNav="requests"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/portal/solicitacoes" class="gt-back-link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        <span>Voltar para Solicitações</span>
                    </a>
                </div>

                <div class="gtb-card !p-6">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div class="flex items-start justify-between gap-4 flex-wrap mb-4">
                        <div>
                            <span class="gt-badge gt-badge-warning mb-2">{reqStatusLabel[requestDetail.status] || requestDetail.status}</span>
                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">{requestDetail.service_title}</h1>
                            <div class="text-xs text-[#8C95AA] mt-1">
                                Protocolo: <strong class="text-white font-mono">{requestDetail.protocol}</strong> • Aberta em: {requestDetail.created_at}
                            </div>
                        </div>
                    </div>

                    <div class="text-xs text-[#8C95AA] leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-[#032033]/40 border border-white/10 mb-6">
                        {requestDetail.description}
                    </div>

                    <h2 class="text-sm font-extrabold text-white pb-3 mb-4 border-b border-white/5">Histórico de Andamento</h2>
                    {history.length === 0 ? (
                        <div class="gt-empty-state">Aguardando primeira movimentação da equipe técnica.</div>
                    ) : (
                        <div class="space-y-3">
                            {history.map((h: any) => (
                                <div class="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#032033]/40 border border-white/10">
                                    <span class="w-7 h-7 rounded-lg bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] shrink-0">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </span>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between gap-2 flex-wrap">
                                            <span class="text-xs font-extrabold text-white">Status: {reqStatusLabel[h.new_status] || h.new_status}</span>
                                            <span class="text-[11px] text-[#8C95AA]">{h.created_at}</span>
                                        </div>
                                        {h.comment && <p class="text-xs text-[#8C95AA] mt-1">{h.comment}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Minhas Solicitações • Portal do Cliente GundjaTech"
            activeNav="requests"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Minhas Solicitações de Serviço</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Consulte e acompanhe suas demandas, orçamentos solicitados e prazos.</p>
                </div>
                <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
                    <span>+ Nova Solicitação</span>
                </a>
            </div>

            {requests.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Nenhuma solicitação aberta.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1 mb-5">Precisa de um novo site, funcionalidade ou ajuste técnico? Abra sua solicitação agora mesmo.</p>
                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">+ Abrir Solicitação</a>
                </div>
            ) : (
                <div class="gtb-card !p-0 overflow-hidden">
                    <div class="gt-table-wrap">
                        <table>
                            <thead>
                                <tr class="border-b border-white/10 text-left text-[11px] uppercase text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Protocolo</th>
                                    <th class="py-3.5 px-5">Título / Demanda</th>
                                    <th class="py-3.5 px-5">Data</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((r: any) => (
                                    <tr class="border-b border-white/5">
                                        <td class="py-3.5 px-5 text-xs font-extrabold font-mono text-white">{r.protocol}</td>
                                        <td class="py-3.5 px-5 text-xs font-bold text-white">{r.service_title}</td>
                                        <td class="py-3.5 px-5 text-xs text-[#8C95AA]">{r.created_at?.slice(0, 10)}</td>
                                        <td class="py-3.5 px-5">
                                            <span class="gt-badge gt-badge-warning">{reqStatusLabel[r.status] || r.status}</span>
                                        </td>
                                        <td class="py-3.5 px-5 text-right">
                                            <a href={`/portal/solicitacoes/${r.id}`} class="gt-btn-outline gt-btn-xs">
                                                <span>Ver Detalhes</span>
                                                <span>&rarr;</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </PortalLayout>
    );
};
