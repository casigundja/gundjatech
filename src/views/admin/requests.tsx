import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminRequestsProps {
    currentUser: any;
    requests: any[];
    requestDetail?: any;
    history?: any[];
    linkedQuotation?: any;
    linkedProject?: any;
    statusFilter?: string;
    search?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_META: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
    new: { label: 'Novo', badgeClass: 'gt-badge-warning', dotClass: '' },
    analyzing: { label: 'Em Análise', badgeClass: 'gt-badge-info', dotClass: 'gt-timeline-dot--info' },
    quotation_sent: { label: 'Orçamento Enviado', badgeClass: 'gt-badge-info', dotClass: '' },
    approved: { label: 'Aprovado', badgeClass: 'gt-badge-success', dotClass: 'gt-timeline-dot--success' },
    in_progress: { label: 'Em Execução', badgeClass: 'gt-badge-info', dotClass: 'gt-timeline-dot--info' },
    completed: { label: 'Concluído', badgeClass: 'gt-badge-success', dotClass: 'gt-timeline-dot--success' },
    cancelled: { label: 'Cancelado', badgeClass: 'gt-badge-danger', dotClass: 'gt-timeline-dot--danger' }
};

const PIPELINE_STEPS = [
    { key: 'new', label: 'Recebido' },
    { key: 'analyzing', label: 'Análise' },
    { key: 'quotation_sent', label: 'Orçamento' },
    { key: 'approved', label: 'Aprovado' },
    { key: 'in_progress', label: 'Execução' },
    { key: 'completed', label: 'Concluído' },
];

const ACTION_LABELS: Record<string, string> = {
    created: 'Solicitação Criada',
    edited: 'Dados Atualizados',
    status_changed: 'Mudança de Fase',
    converted_to_project: 'Convertido em Projeto',
    client_approved: 'Aprovação do Cliente',
    client_rejected: 'Revisão Solicitada',
    project_in_progress: 'Projeto Iniciado',
    project_completed: 'Projeto Concluído',
    quotation_sent: 'Orçamento Enviado',
    quotation_approved: 'Orçamento Aprovado',
    quotation_rejected: 'Orçamento Recusado',
    cancelled: 'Cancelamento',
};

function formatDateBrt(raw?: string | null): string {
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

function formatCurrencyBrl(val: any): string | null {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) return null;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseStructuredDescription(raw?: string | null): Array<{ key: string; value: string; isUrl: boolean }> | null {
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

export const AdminRequestsView: FC<AdminRequestsProps> = ({
    currentUser,
    requests = [],
    requestDetail,
    history = [],
    linkedQuotation = null,
    linkedProject = null,
    statusFilter = '',
    search = '',
    successMessage,
    errorMessage
}) => {
    // ----------------------------------------------------
    // DETALHE DA SOLICITAÇÃO
    // ----------------------------------------------------
    if (requestDetail) {
        const meta = STATUS_META[requestDetail.status] || { label: requestDetail.status || 'Novo', badgeClass: 'gt-badge-warning', dotClass: '' };
        const hasQuotation = Boolean(linkedQuotation?.id);
        const isQuotationApproved =
            linkedQuotation?.status === 'approved' ||
            requestDetail.status === 'approved' ||
            requestDetail.status === 'in_progress' ||
            requestDetail.status === 'completed';
        const isConvertedToProject =
            Boolean(linkedProject?.id) ||
            history.some((h: any) => h.action === 'converted_to_project') ||
            requestDetail.status === 'in_progress' ||
            requestDetail.status === 'completed';
        const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === requestDetail.status);
        const quoteFinalValue = hasQuotation ? Number(linkedQuotation.final_amount ?? linkedQuotation.total_amount ?? 0) : null;
        const formattedBudget = formatCurrencyBrl(quoteFinalValue || requestDetail.estimated_budget);
        const structuredDesc = parseStructuredDescription(requestDetail.description || requestDetail.briefing);
        const phoneDigits = String(requestDetail.phone || '').replace(/\D/g, '');
        const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
        const trackingPath = `/acompanhar-solicitacao?protocolo=${encodeURIComponent(requestDetail.protocol || '')}`;

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
                        {isConvertedToProject ? (
                            <a href={linkedProject?.id ? `/admin/projetos/${linkedProject.id}` : '/admin/projetos'} class="gt-btn-petrol gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <path d="m9 11 3 3L22 4" />
                                </svg>
                                <span>Abrir Projeto em Execução</span>
                            </a>
                        ) : requestDetail.status !== 'cancelled' && !hasQuotation ? (
                            <form action={`/admin/solicitacoes/${requestDetail.id}/gerar-orcamento`} method="post" class="m-0">
                                <button type="submit" data-loading-text="Gerando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                    <span>Elaborar Orçamento</span>
                                </button>
                            </form>
                        ) : requestDetail.status !== 'cancelled' && hasQuotation && (linkedQuotation.status === 'draft' || linkedQuotation.status === 'rejected') ? (
                            <a href={`/admin/orcamentos/${linkedQuotation.id}`} class="gt-btn-primary gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m22 2-7 20-4-9-9-4Z" />
                                    <path d="M22 2 11 13" />
                                </svg>
                                <span>Finalizar &amp; Enviar Orçamento</span>
                            </a>
                        ) : requestDetail.status !== 'cancelled' && hasQuotation && linkedQuotation.status === 'sent' ? (
                            <>
                                <a href={`/admin/orcamentos/${linkedQuotation.id}`} class="gt-btn-outline gt-btn-sm">
                                    <span>Ver Orçamento ({linkedQuotation.reference_code})</span>
                                </a>
                                <form action={`/admin/orcamentos/${linkedQuotation.id}/status`} method="post" class="m-0">
                                    <input type="hidden" name="status" value="approved" />
                                    <button type="submit" data-loading-text="Aprovando..." class="gt-btn-primary gt-btn-sm">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Aprovar &amp; Iniciar Projeto</span>
                                    </button>
                                </form>
                            </>
                        ) : isQuotationApproved && !isConvertedToProject ? (
                            <form action={`/admin/solicitacoes/${requestDetail.id}/converter`} method="post" class="m-0">
                                <button type="submit" data-loading-text="Iniciando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                                        <path d="M12 10v6" />
                                        <path d="M9 13h6" />
                                    </svg>
                                    <span>Iniciar Projeto</span>
                                </button>
                            </form>
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

                <div class="gt-grid-detail" style="height: calc(100vh - 176px); max-height: calc(100vh - 176px); align-items: stretch; overflow: hidden;">
                    {/* Coluna Principal */}
                    <section class="gtb-card !p-4 min-w-0" style="display: flex; flex-direction: column; gap: 11px; height: 100%; max-height: 100%; overflow: hidden;">
                        {/* Cabeçalho Hero */}
                        <div class="space-y-2.5 pb-2.5" style="flex-shrink: 0; border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <div class="flex items-center justify-between gap-3 flex-wrap">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="gt-req-pill-neutral font-mono">{requestDetail.protocol}</span>
                                    <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                                    {isConvertedToProject && (
                                        <span class="gt-req-pill-neutral">Projeto Vinculado</span>
                                    )}
                                </div>
                                <span class="text-[11px] font-semibold text-[#8C95AA]">
                                    Aberta em {formatDateBrt(requestDetail.created_at)}
                                </span>
                            </div>

                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white leading-tight">
                                {requestDetail.service_title || requestDetail.title}
                            </h1>

                            {/* Chips de Contato e Valor */}
                            <div class="gt-req-meta-grid">
                                <div class="gt-req-meta-chip">
                                    <span class="gt-req-meta-icon" aria-hidden="true">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Cliente</div>
                                        <div class="text-xs font-bold text-white truncate">{requestDetail.company || requestDetail.name || 'Não informado'}</div>
                                    </div>
                                </div>

                                {requestDetail.email && (
                                    <a href={`mailto:${requestDetail.email}`} class="gt-req-meta-chip" title="Enviar e-mail">
                                        <span class="gt-req-meta-icon" aria-hidden="true">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">E-mail</div>
                                            <div class="text-xs font-bold text-white truncate">{requestDetail.email}</div>
                                        </div>
                                    </a>
                                )}

                                {requestDetail.phone && (
                                    <a href={whatsappUrl || '#'} target="_blank" rel="noopener noreferrer" class="gt-req-meta-chip" title="Abrir no WhatsApp">
                                        <span class="gt-req-meta-icon" aria-hidden="true">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">WhatsApp / Tel</div>
                                            <div class="text-xs font-bold text-white truncate">{requestDetail.phone}</div>
                                        </div>
                                    </a>
                                )}

                                {formattedBudget && (
                                    <div class="gt-req-meta-chip">
                                        <span class="gt-req-meta-icon gt-req-meta-icon--gold" aria-hidden="true">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Valor Estimado</div>
                                            <div class="text-xs font-extrabold text-[#F2C230] truncate">{formattedBudget}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Esteira Visual do Pipeline */}
                        {requestDetail.status === 'cancelled' ? (
                            <div class="rounded-xl p-3 border border-red-500/30 bg-red-500/10 flex items-center gap-3 text-xs font-bold text-red-400" style="flex-shrink: 0;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                <span>Esta solicitação foi cancelada e encerrada no pipeline comercial.</span>
                            </div>
                        ) : (
                            <div style="flex-shrink: 0;">
                                <div class="flex items-center justify-between gap-2 mb-1.5">
                                    <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Progresso no Pipeline</h2>
                                    <span class="text-[10.5px] font-bold text-[#8C95AA]">
                                        Etapa {Math.max(1, currentStepIndex + 1)} de {PIPELINE_STEPS.length}
                                    </span>
                                </div>
                                <div class="gt-req-stepper" style="padding: 9px 12px;" role="list" aria-label="Etapas da solicitação">
                                    {PIPELINE_STEPS.map((step, idx) => {
                                        const isCompletedAll = requestDetail.status === 'completed';
                                        const isDone = isCompletedAll || (currentStepIndex >= 0 && idx < currentStepIndex);
                                        const isActive = !isCompletedAll && idx === currentStepIndex;
                                        return (
                                            <div
                                                class={`gt-req-step ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
                                                role="listitem"
                                            >
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

                        {/* Card de Governança: Orçamento Obrigatório -> Aprovação -> Projeto */}
                        <div class="gtb-surface-box rounded-xl px-3 py-2 flex items-center justify-between gap-3 flex-wrap" style="flex-shrink: 0;">
                            {hasQuotation ? (
                                <>
                                    <div class="flex items-center gap-2.5 flex-wrap min-w-0">
                                        <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Orçamento Vinculado:</span>
                                        <a href={`/admin/orcamentos/${linkedQuotation.id}`} class="font-mono text-xs font-extrabold text-[#F2C230] hover:underline no-underline">
                                            {linkedQuotation.reference_code}
                                        </a>
                                        <span class={`gt-badge ${linkedQuotation.status === 'approved' ? 'gt-badge-success' : linkedQuotation.status === 'sent' ? 'gt-badge-info' : linkedQuotation.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                            {linkedQuotation.status === 'approved' ? 'Aprovado' : linkedQuotation.status === 'sent' ? 'Enviado ao Cliente' : linkedQuotation.status === 'rejected' ? 'Revisão Solicitada' : 'Rascunho'}
                                        </span>
                                        <span class="text-xs font-extrabold text-white">
                                            {formatCurrencyBrl(linkedQuotation.final_amount ?? linkedQuotation.total_amount) || 'R$ 0,00'}
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <a href={`/admin/orcamentos/${linkedQuotation.id}`} class="text-xs font-extrabold text-[#16749A] hover:underline no-underline">
                                            Editar Proposta →
                                        </a>
                                        {isConvertedToProject && (
                                            <a href={linkedProject?.id ? `/admin/projetos/${linkedProject.id}` : '/admin/projetos'} class="text-xs font-extrabold text-[#10B981] hover:underline no-underline ml-2">
                                                Ver Projeto →
                                            </a>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div class="text-xs text-[#8C95AA]">
                                        <strong class="text-white">Fluxo Obrigatório:</strong> Nenhum orçamento emitido ainda. Elabore e aprove o orçamento para liberar a execução do projeto.
                                    </div>
                                    {requestDetail.status !== 'cancelled' && (
                                        <form action={`/admin/solicitacoes/${requestDetail.id}/gerar-orcamento`} method="post" class="m-0">
                                            <button type="submit" class="text-xs font-extrabold text-[#F2C230] hover:underline bg-transparent border-0 cursor-pointer p-0">
                                                + Elaborar Orçamento Agora →
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Descrição da Demanda */}
                        <div style="flex-shrink: 0;">
                            <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição da Demanda</h2>
                            <div class="gt-req-briefing" style="padding: 9px 13px; max-height: 76px; overflow-y: auto;">
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
                                        {requestDetail.description || requestDetail.briefing || 'Sem descrição detalhada.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Linha do Tempo / Feed de Atividades */}
                        <div style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                            <div class="flex items-center justify-between gap-2 mb-1.5" style="flex-shrink: 0;">
                                <h2 class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Histórico de Atividades</h2>
                                <span class="text-[10.5px] font-semibold text-[#8C95AA]">{history.length} {history.length === 1 ? 'evento' : 'eventos'}</span>
                            </div>

                            {history.length === 0 ? (
                                <div class="gtb-surface-box rounded-xl p-3 text-xs text-[#8C95AA]" style="flex: 1 1 0%;">
                                    Nenhuma movimentação registrada ainda.
                                </div>
                            ) : (
                                <div class="gt-activity-feed" id="gt-request-activity-feed" style="flex: 1 1 0%; min-height: 0; overflow-y: auto; padding-right: 4px;">
                                    {history.map((h: any, idx: number) => {
                                        const fromSt = h.from_status || h.old_status || h.status_from || '';
                                        const toSt = h.to_status || h.new_status || h.status_to || '';
                                        const fromLabel = fromSt ? (STATUS_META[fromSt]?.label || fromSt) : '';
                                        const toLabel = toSt ? (STATUS_META[toSt]?.label || toSt) : (ACTION_LABELS[h.action] || h.action || 'Atualização');
                                        const hasTransition = Boolean(fromLabel && toLabel && fromSt !== toSt);
                                        const actionKey = String(h.action || '');
                                        const noteText = String(h.comment || h.notes || '').trim();
                                        const authorName = h.user_name ? String(h.user_name).trim() : null;
                                        const isDanger = toSt === 'cancelled' || actionKey === 'cancelled';

                                        // Evita repetir nota quando o próprio título já comunica a ação
                                        const isRedundantNote =
                                            (actionKey === 'edited' && /atualizados pela administra/i.test(noteText)) ||
                                            (actionKey === 'converted_to_project' && /^convertido em projeto pela administra/i.test(noteText));
                                        const showNote = Boolean(noteText && !isRedundantNote);

                                        return (
                                            <div
                                                class={`gt-activity-item ${idx === 0 ? 'is-latest' : ''}`}
                                            >
                                                <div class="gt-activity-rail" aria-hidden="true">
                                                    <span class={`gt-activity-node ${isDanger ? 'gt-activity-node--danger' : ''}`}>
                                                        {actionKey === 'edited' ? (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                                                        ) : actionKey === 'converted_to_project' ? (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
                                                        ) : isDanger ? (
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
                                                            {actionKey === 'edited' ? (
                                                                <span>Dados da solicitação editados</span>
                                                            ) : actionKey === 'converted_to_project' ? (
                                                                <span>Convertido em Projeto</span>
                                                            ) : hasTransition ? (
                                                                <>
                                                                    <span class="gt-activity-from">{fromLabel}</span>
                                                                    <span class="gt-activity-arrow">→</span>
                                                                    <span>{toLabel}</span>
                                                                </>
                                                            ) : (
                                                                <span>{toLabel}</span>
                                                            )}
                                                        </div>
                                                        <span class="gt-activity-time">{formatDateBrt(h.created_at)}</span>
                                                    </div>

                                                    {authorName && (
                                                        <div class="gt-activity-meta">por {authorName}</div>
                                                    )}

                                                    {showNote && (
                                                        <div class="gt-activity-note">{noteText}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Coluna Lateral: Atualizar Status + Ações Rápidas */}
                    <div class="min-w-0" style="display: flex; flex-direction: column; gap: 14px; height: 100%; max-height: 100%; overflow: hidden;">
                        <aside class="gtb-card !p-4 min-w-0" style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; overflow: hidden;">
                            <div class="pb-2.5" style="flex-shrink: 0; border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <h2 class="gt-font-display text-sm font-extrabold text-white">Atualizar Status Operacional</h2>
                                <p class="text-[11px] text-[#8C95AA] mt-0.5">Registre o avanço no pipeline comercial.</p>
                            </div>

                            <form action={`/admin/solicitacoes/${requestDetail.id}/status`} method="post" data-dirty-guard="1" style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                                <div style="flex-shrink: 0;">
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Novo Status</label>
                                    <select name="status" class="w-full rounded-xl px-3 py-2 text-xs">
                                        <option value="new" selected={requestDetail.status === 'new'}>1. Novo / Recebido</option>
                                        <option value="analyzing" selected={requestDetail.status === 'analyzing'}>2. Em Análise Técnica</option>
                                        <option value="quotation_sent" selected={requestDetail.status === 'quotation_sent'}>3. Orçamento Enviado ao Cliente</option>
                                        <option value="approved" selected={requestDetail.status === 'approved'} disabled={!hasQuotation && !isQuotationApproved}>
                                            4. Aprovado (Inicia Projeto Automaticamente){!hasQuotation && !isQuotationApproved ? ' — Requer Orçamento' : ''}
                                        </option>
                                        <option value="in_progress" selected={requestDetail.status === 'in_progress'} disabled={!isQuotationApproved}>
                                            5. Em Execução{!isQuotationApproved ? ' — Requer Orçamento Aprovado' : ''}
                                        </option>
                                        <option value="completed" selected={requestDetail.status === 'completed'} disabled={!isQuotationApproved}>
                                            6. Concluído / Entregue{!isQuotationApproved ? ' — Requer Orçamento Aprovado' : ''}
                                        </option>
                                        <option value="cancelled" selected={requestDetail.status === 'cancelled'}>Cancelado</option>
                                    </select>
                                    {!isQuotationApproved && (
                                        <p class="text-[10px] text-[#8C95AA] mt-1">
                                            A execução só é liberada após o orçamento ser emitido e aprovado.
                                        </p>
                                    )}
                                </div>

                                <div style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column;">
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Comentário de Atualização</label>
                                    <textarea
                                        name="comment"
                                        rows={2}
                                        placeholder="Descreva o motivo ou avanço desta etapa..."
                                        class="w-full rounded-xl px-3 py-2 text-xs"
                                        style="flex: 1 1 0%; min-height: 48px; resize: none;"
                                    ></textarea>
                                </div>

                                <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm w-full justify-center" style="flex-shrink: 0; margin-top: auto;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Salvar Alteração</span>
                                </button>
                            </form>
                        </aside>

                        {/* Card de Ações Rápidas & Compartilhamento */}
                        <aside class="gtb-card !p-4 space-y-2.5 min-w-0" style="flex-shrink: 0;">
                            <div>
                                <h2 class="gt-font-display text-sm font-extrabold text-white">Ações Rápidas</h2>
                                <p class="text-[11px] text-[#8C95AA] mt-0.5">Comunicação direta e rastreio do cliente.</p>
                            </div>

                            <div class="space-y-2">
                                <button
                                    type="button"
                                    onclick={`var url=window.location.origin+'${trackingPath}';navigator.clipboard.writeText(url).then(function(){var el=document.getElementById('gt-copy-track-lbl');if(el){el.textContent='Link copiado!';setTimeout(function(){el.textContent='Copiar Link de Rastreio';},2000);}});`}
                                    class="gt-quick-action-btn"
                                >
                                    <span class="flex items-center gap-2.5">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                        <span id="gt-copy-track-lbl">Copiar Link de Rastreio</span>
                                    </span>
                                    <span class="text-[10.5px] font-extrabold text-[#F2C230]">COPIAR</span>
                                </button>

                                <a href={trackingPath} target="_blank" rel="noopener noreferrer" class="gt-quick-action-btn">
                                    <span class="flex items-center gap-2.5">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        <span>Ver Página Pública</span>
                                    </span>
                                    <span class="text-[11px] text-[#8C95AA]">↗</span>
                                </a>

                                {whatsappUrl && (
                                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" class="gt-quick-action-btn">
                                        <span class="flex items-center gap-2.5">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                            <span>Chamar no WhatsApp</span>
                                        </span>
                                        <span class="text-[11px] text-[#10B981] font-extrabold">ABRIR</span>
                                    </a>
                                )}
                            </div>
                        </aside>
                    </div>
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

                        <form action={`/admin/solicitacoes/${requestDetail.id}/editar`} method="post" data-dirty-guard="1" class="p-6 space-y-4">
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
