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
        const estimatedVal = Number(linkedQuotation?.final_amount ?? linkedQuotation?.total_amount ?? requestDetail.estimated_budget ?? 0);
        const formattedVal = estimatedVal > 0
            ? `R$ ${estimatedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : 'Em avaliação';
        const statusBadgeCls =
            requestDetail.status === 'approved' || requestDetail.status === 'completed'
                ? 'gt-badge-success'
                : requestDetail.status === 'cancelled'
                    ? 'gt-badge-danger'
                    : requestDetail.status === 'quotation_sent'
                        ? 'gt-badge-warning'
                        : 'gt-badge-info';

        const nextStepInfo: { badge: string; title: string; desc: string } =
            requestDetail.status === 'quotation_sent'
                ? {
                    badge: 'Ação Necessária',
                    title: 'Proposta Pronta para Aprovação',
                    desc: 'Revise os valores e condições do orçamento enviado. Ao aprovar, seu projeto inicia automaticamente.'
                }
                : requestDetail.status === 'approved' || requestDetail.status === 'in_progress'
                    ? {
                        badge: 'Em Andamento',
                        title: 'Projeto em Execução',
                        desc: 'Sua proposta foi aprovada e nossa equipe técnica está executando o cronograma de entregas.'
                    }
                    : requestDetail.status === 'completed'
                        ? {
                            badge: 'Entregue',
                            title: 'Demanda Concluída',
                            desc: 'Todas as etapas foram finalizadas. Você pode consultar entregáveis e recibos no portal.'
                        }
                        : requestDetail.status === 'cancelled'
                            ? {
                                badge: 'Encerrada',
                                title: 'Solicitação Cancelada',
                                desc: 'Esta solicitação foi cancelada. Caso deseje retomar o escopo, abra uma nova solicitação.'
                            }
                            : {
                                badge: 'Em Triagem Técnica',
                                title: 'Briefing em Análise',
                                desc: 'Nossa equipe de engenharia está analisando seu escopo para estruturar o orçamento técnico ideal.'
                            };

        return (
            <PortalLayout
                title={`Solicitação ${requestDetail.protocol} • Portal do Cliente`}
                activeNav="requests"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-req-detail-shell">
                    <div class="gt-detail-toolbar !mb-0" style="flex-shrink: 0;">
                        <a href="/portal/solicitacoes" class="gt-back-link">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            <span>Voltar para Solicitações</span>
                        </a>
                        <div class="flex items-center gap-2">
                            <span class="gt-req-pill-neutral font-mono">{requestDetail.protocol}</span>
                            <span class={`gt-badge ${statusBadgeCls}`}>
                                {reqStatusLabel[requestDetail.status] || requestDetail.status}
                            </span>
                        </div>
                    </div>

                    <div class="gt-req-detail-grid">
                        {/* Coluna Principal */}
                        <div class="min-w-0 gt-req-detail-left" style="display: flex; flex-direction: column; gap: 12px;">
                            {/* Card 1: Cabeçalho Executivo + 3 Mini-Cards + Esteira Visual */}
                            <section class="gtb-card !p-4 sm:!px-5 space-y-3 min-w-0" style="flex-shrink: 0;">
                                <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                                <div class="flex items-start justify-between gap-3 flex-wrap">
                                    <div class="min-w-0 flex-1">
                                        <div class="flex items-center gap-2 flex-wrap mb-1">
                                            <span class="gt-req-pill-neutral font-mono">{requestDetail.protocol}</span>
                                            <span class={`gt-badge ${statusBadgeCls}`}>
                                                {reqStatusLabel[requestDetail.status] || requestDetail.status}
                                            </span>
                                            {linkedQuotation && (
                                                <span class="gt-req-pill-neutral">Proposta {linkedQuotation.reference_code}</span>
                                            )}
                                        </div>
                                        <h1 class="gt-font-display text-base sm:text-lg font-extrabold text-white leading-snug">
                                            {requestDetail.service_title || requestDetail.title}
                                        </h1>
                                    </div>
                                    <span class="text-[11px] font-semibold text-[#8C95AA] whitespace-nowrap">
                                        Aberta em {formatPortalDateBrt(requestDetail.created_at)}
                                    </span>
                                </div>

                                {/* 3 Mini-Cards Informativos */}
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div class="gtb-surface-box rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-0">
                                        <span class="gtb-icon-box !w-7 !h-7 shrink-0" aria-hidden="true">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[9.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Protocolo</div>
                                            <div class="text-xs font-bold font-mono text-white truncate">{requestDetail.protocol}</div>
                                        </div>
                                    </div>

                                    <div class="gtb-surface-box rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-0">
                                        <span class="gtb-icon-box !w-7 !h-7 shrink-0" aria-hidden="true">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[9.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Etapa Atual</div>
                                            <div class="text-xs font-bold text-white truncate">
                                                {requestDetail.status === 'cancelled'
                                                    ? 'Cancelada'
                                                    : `Etapa ${Math.max(1, currentStepIndex + 1)} de ${PORTAL_PIPELINE_STEPS.length} • ${PORTAL_PIPELINE_STEPS[Math.max(0, currentStepIndex)]?.label || 'Recebido'}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="gtb-surface-box rounded-xl px-3 py-2 flex items-center gap-2.5 min-w-0">
                                        <span class="gtb-icon-box !w-7 !h-7 shrink-0" style="color: #F2C230;" aria-hidden="true">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[9.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">
                                                {linkedQuotation ? 'Valor da Proposta' : 'Orçamento Estimado'}
                                            </div>
                                            <div class="text-xs font-extrabold text-[#F2C230] truncate">{formattedVal}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Esteira Visual do Pipeline */}
                                {requestDetail.status !== 'cancelled' && (
                                    <div>
                                        <div class="flex items-center justify-between gap-2 mb-1.5">
                                            <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Progresso no Pipeline</h2>
                                            <span class="text-[10.5px] font-bold text-[#8C95AA]">
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

                                {/* Faixa de Proposta Comercial Vinculada */}
                                {linkedQuotation && (
                                    <div class="gtb-surface-box rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                        <div class="flex items-center gap-2.5 flex-wrap min-w-0">
                                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Proposta Comercial:</span>
                                            <a href={`/portal/orcamentos/${linkedQuotation.id}`} class="font-mono text-xs font-extrabold text-[#F2C230] hover:underline no-underline">
                                                {linkedQuotation.reference_code}
                                            </a>
                                            <span class={`gt-badge ${linkedQuotation.status === 'approved' ? 'gt-badge-success' : linkedQuotation.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                                {linkedQuotation.status === 'approved' ? 'Aprovado' : linkedQuotation.status === 'rejected' ? 'Em Revisão' : 'Aguardando Aprovação'}
                                            </span>
                                            <span class="text-xs font-extrabold text-white">{formattedVal}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <a href={`/portal/orcamentos/${linkedQuotation.id}`} class="text-xs font-extrabold text-[#16749A] hover:underline no-underline">
                                                Ver Orçamento →
                                            </a>
                                            {linkedQuotation.status === 'approved' && (
                                                <a href="/portal/projetos" class="text-xs font-extrabold text-[#10B981] hover:underline no-underline ml-2">
                                                    Ver Projeto →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Card 2: Descrição da Demanda */}
                            <section class="gtb-card !p-3.5 sm:!px-4 min-w-0" style="flex-shrink: 0;">
                                <div class="flex items-center justify-between gap-2 mb-2">
                                    <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Descrição da Demanda</h2>
                                </div>
                                <div class="gt-req-briefing" style="padding: 9px 14px 9px 16px; max-height: 92px; overflow-y: auto;">
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
                                        <div class="text-[13px] text-white leading-relaxed whitespace-pre-wrap">
                                            {requestDetail.description || 'Sem descrição detalhada.'}
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Card 3: Histórico de Atividades (compacto com 1 item; rola internamente sem espaço vazio) */}
                            <section class="gtb-card !p-3.5 sm:!px-4 min-w-0 gt-req-history-card" style="flex: 0 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                                <div class="flex items-center justify-between gap-2 mb-2" style="flex-shrink: 0;">
                                    <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Histórico de Atividades</h2>
                                    <span class="text-[10.5px] font-semibold text-[#8C95AA]">{history.length} {history.length === 1 ? 'evento' : 'eventos'}</span>
                                </div>
                                {history.length === 0 ? (
                                    <div class="gtb-surface-box rounded-xl p-3 text-xs text-[#8C95AA]">
                                        Aguardando primeira movimentação da equipe técnica.
                                    </div>
                                ) : (
                                    <div class="gt-activity-feed" id="gt-portal-activity-feed" style="flex: 0 1 auto; min-height: 0; overflow-y: auto; padding: 4px 14px;">
                                        {history.map((h: any, idx: number) => {
                                            const fromSt = h.old_status || h.from_status || h.status_from || '';
                                            const toSt = h.new_status || h.to_status || h.status_to || '';
                                            const fromLabel = fromSt ? (reqStatusLabel[fromSt] || fromSt) : '';
                                            const toLabel = toSt ? (reqStatusLabel[toSt] || toSt) : 'Atualização';
                                            const hasTransition = Boolean(fromLabel && toLabel && fromSt !== toSt);
                                            const noteText = String(h.comment || h.notes || '').trim();
                                            const isDanger = toSt === 'cancelled';

                                            return (
                                                <div class={`gt-activity-item ${idx === 0 ? 'is-latest' : ''}`}>
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
                            </section>
                        </div>

                        {/* Coluna Lateral: Próximo Passo + Ações & Suporte GundjaTech */}
                        <div class="min-w-0 gt-req-detail-right" style="display: flex; flex-direction: column; gap: 12px;">
                            <aside class="gtb-card !p-4 min-w-0 space-y-3" style="flex-shrink: 0;">
                                <div class="flex items-center justify-between gap-2 pb-2.5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                    <h2 class="gt-font-display text-sm font-extrabold text-white">Status &amp; Próximo Passo</h2>
                                    <span class={`gt-badge ${statusBadgeCls}`}>{nextStepInfo.badge}</span>
                                </div>

                                <div class="gtb-surface-box rounded-xl p-3 space-y-1">
                                    <div class="text-xs font-extrabold text-white">{nextStepInfo.title}</div>
                                    <p class="text-[11.5px] text-[#8C95AA] leading-relaxed">{nextStepInfo.desc}</p>
                                </div>

                                {requestDetail.status === 'quotation_sent' && (
                                    <div class="space-y-2 pt-1">
                                        <form action={`/portal/solicitacoes/${requestDetail.id}/aprovar`} method="post" class="m-0">
                                            <button type="submit" class="gt-btn-primary gt-btn-sm w-full justify-center">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                                                <span>Aprovar Orçamento</span>
                                            </button>
                                        </form>
                                        <form action={`/portal/solicitacoes/${requestDetail.id}/recusar`} method="post" class="m-0">
                                            <button type="submit" class="gt-btn-danger-ghost gt-btn-sm w-full justify-center">
                                                <span>Solicitar Revisão</span>
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {(requestDetail.status === 'approved' || requestDetail.status === 'in_progress' || requestDetail.status === 'completed') && (
                                    <a href="/portal/projetos" class="gt-btn-primary gt-btn-sm w-full justify-center">
                                        <span>Acompanhar Meu Projeto →</span>
                                    </a>
                                )}

                                {requestDetail.status === 'new' && (
                                    <form
                                        action={`/portal/solicitacoes/${requestDetail.id}/cancelar`}
                                        method="post"
                                        class="m-0 pt-1"
                                        data-confirm="Deseja realmente cancelar esta solicitação antes do início da análise?"
                                    >
                                        <button type="submit" class="gt-btn-danger-ghost gt-btn-xs w-full justify-center">
                                            <span>Cancelar Solicitação</span>
                                        </button>
                                    </form>
                                )}

                                {requestDetail.status === 'cancelled' && (
                                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm w-full justify-center">
                                        <span>+ Abrir Nova Solicitação</span>
                                    </a>
                                )}
                            </aside>

                            {/* Card de Suporte Institucional (Paleta 3: Azul Petróleo + Amarelo Ouro) */}
                            <div class="gt-petrol-cta-card" style="flex-shrink: 0;">
                                <div class="gt-petrol-cta-head">
                                    <span class="gt-petrol-cta-icon" aria-hidden="true">
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.1" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </span>
                                    <div class="gt-petrol-cta-title">Dúvidas sobre esta demanda?</div>
                                </div>
                                <p class="gt-petrol-cta-desc">
                                    Fale em tempo real com nossa equipe técnica pelo chat ou acompanhe suas propostas comerciais.
                                </p>
                                <div class="space-y-2">
                                    <a href="/portal/atendimento" class="gt-btn-primary gt-btn-sm w-full justify-center">
                                        <span>Falar com a Equipe</span>
                                        <span>&rarr;</span>
                                    </a>
                                    <a href="/portal/orcamentos" class="gt-btn-outline gt-btn-xs w-full justify-center" style="border-color: rgba(231, 240, 245, 0.25); color: #E7F0F5;">
                                        <span>Ver Meus Orçamentos</span>
                                    </a>
                                </div>
                            </div>
                        </div>
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
