import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalRequestsProps {
    currentUser: any;
    clientName?: string;
    requests?: any[];
    requestDetail?: any;
    linkedQuotation?: any;
    services?: any[];
    history?: any[];
    attachments?: any[];
    isCreate?: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const reqStatusLabel: Record<string, string> = {
    new: 'Nova',
    analyzing: 'Em Análise Técnica',
    in_review: 'Em Análise',
    quotation_sent: 'Orçamento Enviado',
    approved: 'Aprovado pelo Cliente',
    in_progress: 'Em Execução',
    completed: 'Concluído',
    cancelled: 'Cancelado'
};

const PORTAL_PIPELINE_STEPS = [
    { key: 'new', label: 'Recebido' },
    { key: 'analyzing', label: 'Análise' },
    { key: 'quotation_sent', label: 'Orçamento' },
    { key: 'approved', label: 'Aprovado' },
    { key: 'in_progress', label: 'Execução' },
    { key: 'completed', label: 'Concluído' },
];

function formatPortalDateBrt(raw?: string | null): string {
    if (!raw) return '—';
    const normalized = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
    const dt = new Date(normalized);
    if (Number.isNaN(dt.getTime())) return raw;
    try {
        const parts = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(dt);
        const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
        return `${get('day')}/${get('month')}/${get('year')} às ${get('hour')}:${get('minute')}`;
    } catch {
        return raw;
    }
}

function parsePortalDescription(raw?: string | null): Array<{ key: string; value: string; isUrl: boolean }> | null {
    if (!raw || !raw.includes('|') || !raw.includes(':')) return null;
    const segments = raw.split('|').map((s) => s.trim()).filter(Boolean);
    if (segments.length < 2) return null;
    const parsed: Array<{ key: string; value: string; isUrl: boolean }> = [];
    for (const seg of segments) {
        const idx = seg.indexOf(':');
        if (idx <= 0 || idx > 28) return null;
        const key = seg.slice(0, idx).trim();
        const value = seg.slice(idx + 1).trim();
        if (!key || !value) continue;
        parsed.push({ key, value, isUrl: /^https?:\/\//i.test(value) });
    }
    return parsed.length >= 2 ? parsed : null;
}

export const PortalRequestsView: FC<PortalRequestsProps> = ({
    currentUser,
    clientName,
    requests = [],
    requestDetail,
    linkedQuotation = null,
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
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                        <span>Voltar para Solicitações</span>
                    </a>
                </div>

                <div class="gt-grid-detail items-start">
                    <div class="gtb-card !p-6">
                        <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                        <div class="flex items-center gap-3 pb-4 mb-5 border-b border-white/10">
                            <span class="w-10 h-10 rounded-xl bg-[#F2C230]/15 border border-[#F2C230]/35 flex items-center justify-center text-[#F2C230] shrink-0">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
                            <div class="gt-step-list">
                                <div class="gt-step-item">
                                    <span class="gt-step-badge">1</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-extrabold text-white">Protocolo &amp; Triagem</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Seu pedido recebe um código único GNDJ e entra na fila prioritária de engenharia.</div>
                                    </div>
                                </div>
                                <div class="gt-step-item">
                                    <span class="gt-step-badge">2</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-extrabold text-white">Orçamento Transparente</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Enviamos a proposta detalhada com escopo, prazo e valor para aprovação em 1 clique.</div>
                                    </div>
                                </div>
                                <div class="gt-step-item">
                                    <span class="gt-step-badge">3</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-extrabold text-white">Execução &amp; Entregas</div>
                                        <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-relaxed">Acompanhe cada etapa, percentual concluído e arquivos direto pelo Portal.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="gt-petrol-cta-card rounded-2xl p-5">
                            <div class="flex items-center gap-2.5 mb-2">
                                <span class="w-8 h-8 rounded-lg bg-[#F2C230]/20 border border-[#F2C230]/40 flex items-center justify-center text-[#F2C230] shrink-0">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
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
        const normalizedSt = requestDetail.status === 'in_review' ? 'analyzing' : requestDetail.status;
        const currentStepIndex = PORTAL_PIPELINE_STEPS.findIndex((s) => s.key === normalizedSt);
        const structuredDesc = parsePortalDescription(requestDetail.description);

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
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                        <span>Voltar para Solicitações</span>
                    </a>
                </div>

                <div class="gtb-card !p-5" style="display: flex; flex-direction: column; gap: 14px; height: calc(100vh - 176px); max-height: calc(100vh - 176px); overflow: hidden;">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div class="flex items-start justify-between gap-4 flex-wrap pb-5 border-b border-white/10">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap mb-2">
                                <span class="gt-req-pill-neutral font-mono">{requestDetail.protocol}</span>
                                <span class={`gt-badge ${requestDetail.status === 'approved' || requestDetail.status === 'completed' ? 'gt-badge-success' : requestDetail.status === 'cancelled' ? 'gt-badge-danger' : 'gt-badge-info'}`}>
                                    {reqStatusLabel[requestDetail.status] || requestDetail.status}
                                </span>
                            </div>
                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">{requestDetail.service_title || requestDetail.title}</h1>
                            <div class="text-xs text-[#8C95AA] mt-1">
                                Aberta em {formatPortalDateBrt(requestDetail.created_at)}
                            </div>
                        </div>

                        {requestDetail.status === 'quotation_sent' && (
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <form action={`/portal/solicitacoes/${requestDetail.id}/recusar`} method="post" class="m-0">
                                    <button type="submit" class="gt-btn-danger-ghost gt-btn-sm">
                                        <span>Solicitar Revisão</span>
                                    </button>
                                </form>
                                <form action={`/portal/solicitacoes/${requestDetail.id}/aprovar`} method="post" class="m-0">
                                    <button type="submit" class="gt-btn-primary gt-btn-sm">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                                        <span>Aprovar Orçamento</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Esteira Visual do Pipeline (idêntica ao Admin) */}
                    {requestDetail.status !== 'cancelled' && (
                        <div>
                            <div class="flex items-center justify-between gap-2 mb-2.5">
                                <h2 class="text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Progresso no Pipeline</h2>
                                <span class="text-[11px] font-bold text-[#8C95AA]">
                                    Etapa {Math.max(1, currentStepIndex + 1)} de {PORTAL_PIPELINE_STEPS.length}
                                </span>
                            </div>
                            <div class="gt-req-stepper" role="list" aria-label="Etapas da solicitação">
                                {PORTAL_PIPELINE_STEPS.map((step, idx) => {
                                    const isCompletedAll = normalizedSt === 'completed';
                                    const isDone = isCompletedAll || (currentStepIndex >= 0 && idx < currentStepIndex);
                                    const isActive = !isCompletedAll && idx === currentStepIndex;
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
                        </div>
                    )}

                    {/* Orçamento Vinculado (Transparência e Aprovação pelo Cliente) */}
                    {linkedQuotation && (
                        <div class="gtb-surface-box rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div class="flex items-center gap-3 flex-wrap min-w-0">
                                <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Proposta Comercial:</span>
                                <a href={`/portal/orcamentos/${linkedQuotation.id}`} class="font-mono text-xs font-extrabold text-[#F2C230] hover:underline no-underline">
                                    {linkedQuotation.reference_code}
                                </a>
                                <span class="text-xs font-extrabold text-white">
                                    R$ {Number(linkedQuotation.final_amount ?? linkedQuotation.total_amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <span class={`gt-badge ${linkedQuotation.status === 'approved' ? 'gt-badge-success' : linkedQuotation.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                    {linkedQuotation.status === 'approved' ? 'Aprovado • Projeto em Execução' : linkedQuotation.status === 'rejected' ? 'Em Revisão' : 'Aguardando Sua Aprovação'}
                                </span>
                            </div>
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <a href={`/portal/orcamentos/${linkedQuotation.id}`} class="gt-btn-outline gt-btn-xs">
                                    Ver Detalhes do Orçamento →
                                </a>
                                {linkedQuotation.status === 'approved' && (
                                    <a href="/portal/projetos" class="gt-btn-primary gt-btn-xs">
                                        Acompanhar Projeto em Execução →
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Descrição da Demanda */}
                    <div>
                        <h2 class="text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-2.5">Descrição da Demanda</h2>
                        <div class="gt-req-briefing">
                            {structuredDesc ? (
                                <div class="gt-req-kv-list">
                                    {structuredDesc.map((item) => (
                                        <div class="gt-req-kv-item">
                                            <div class="gt-req-kv-key">{item.key}</div>
                                            <div class="gt-req-kv-val">
                                                {item.isUrl ? (
                                                    <a href={item.value} target="_blank" rel="noopener noreferrer" class="text-[#16749A] hover:underline block truncate" title={item.value}>
                                                        {item.value} ↗
                                                    </a>
                                                ) : (
                                                    item.value
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div class="text-[13.5px] text-white leading-relaxed whitespace-pre-wrap">
                                    {requestDetail.description || 'Sem descrição detalhada.'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Histórico em Feed de Atividades */}
                    <div style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="flex items-center justify-between gap-2 mb-2" style="flex-shrink: 0;">
                            <h2 class="text-[11px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Histórico de Atividades</h2>
                            <span class="text-[11px] font-semibold text-[#8C95AA]">{history.length} {history.length === 1 ? 'evento' : 'eventos'}</span>
                        </div>
                        {history.length === 0 ? (
                            <div class="gt-empty-state" style="flex: 1 1 0%;">Aguardando primeira movimentação da equipe técnica.</div>
                        ) : (
                            <div class="gt-activity-feed" id="gt-portal-activity-feed" style="flex: 1 1 0%; min-height: 0; overflow-y: auto; padding-right: 4px;">
                                {history.map((h: any, idx: number) => {
                                    const fromSt = h.old_status || h.from_status || h.status_from || '';
                                    const toSt = h.new_status || h.to_status || h.status_to || '';
                                    const fromLabel = fromSt ? (reqStatusLabel[fromSt] || fromSt) : '';
                                    const toLabel = toSt ? (reqStatusLabel[toSt] || toSt) : 'Atualização';
                                    const hasTransition = Boolean(fromLabel && toLabel && fromSt !== toSt);
                                    const noteText = String(h.comment || h.notes || '').trim();
                                    const isDanger = toSt === 'cancelled';

                                    return (
                                        <div
                                            class={`gt-activity-item ${idx === 0 ? 'is-latest' : ''}`}
                                        >
                                            <div class="gt-activity-rail" aria-hidden="true">
                                                <span class={`gt-activity-node ${isDanger ? 'gt-activity-node--danger' : ''}`}>
                                                    {isDanger ? (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                    ) : toSt === 'completed' || toSt === 'approved' ? (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    ) : (
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                                                    )}
                                                </span>
                                            </div>
                                            <div class="gt-activity-body">
                                                <div class="gt-activity-head">
                                                    <div class="gt-activity-title">
                                                        {hasTransition ? (
                                                            <>
                                                                <span class="gt-activity-from">{fromLabel}</span>
                                                                <span class="gt-activity-arrow">→</span>
                                                                <span>{toLabel}</span>
                                                            </>
                                                        ) : (
                                                            <span>{toLabel}</span>
                                                        )}
                                                    </div>
                                                    <span class="gt-activity-time">{formatPortalDateBrt(h.created_at)}</span>
                                                </div>
                                                {noteText && <div class="gt-activity-note">{noteText}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Solicitações • Portal do Cliente GundjaTech"
            activeNav="requests"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Solicitações de Serviço</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Consulte e acompanhe suas demandas, orçamentos solicitados e prazos.</p>
                </div>
                <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
                    <span>+ Nova Solicitação</span>
                </a>
            </div>

            {requests.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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
