import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminQuotationsProps {
    currentUser: any;
    quotations?: any[];
    quotationDetail?: any;
    linkedRequest?: any;
    linkedProject?: any;
    clients?: any[];
    search?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
    draft: { label: 'Rascunho', badgeClass: 'gt-badge-warning' },
    sent: { label: 'Enviado', badgeClass: 'gt-badge-info' },
    approved: { label: 'Aprovado', badgeClass: 'gt-badge-success' },
    rejected: { label: 'Recusado', badgeClass: 'gt-badge-danger' },
    expired: { label: 'Expirado', badgeClass: 'gt-badge-danger' }
};

function formatBRL(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));
}

export const AdminQuotationsView: FC<AdminQuotationsProps> = ({
    currentUser,
    quotations = [],
    quotationDetail,
    linkedRequest = null,
    linkedProject = null,
    clients = [],
    search = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    // ----------------------------------------------------
    // TELA DE DETALHE & EDIÇÃO DE ORÇAMENTO / PROPOSTA
    // ----------------------------------------------------
    if (quotationDetail) {
        const meta = STATUS_META[quotationDetail.status] || { label: quotationDetail.status || 'Rascunho', badgeClass: 'gt-badge-warning' };
        const totalAmt = Number(quotationDetail.total_amount || 0);
        const discountAmt = Number(quotationDetail.discount_amount || 0);
        const finalAmt = Number(quotationDetail.final_amount || Math.max(0, totalAmt - discountAmt));
        const quoteSteps = [
            { key: 'draft', label: 'Rascunho' },
            { key: 'sent', label: 'Enviado ao Cliente' },
            { key: 'approved', label: 'Aprovado & Projeto Iniciado' },
        ];
        const currQuoteIdx = quoteSteps.findIndex((s) => s.key === quotationDetail.status);

        return (
            <AdminLayout
                title={`Orçamento ${quotationDetail.reference_code} • Painel Administrativo`}
                activeNav="quotations"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar gt-no-print">
                    <a href={linkedRequest?.id ? `/admin/solicitacoes/${linkedRequest.id}` : '/admin/orcamentos'} class="gt-back-link">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        <span>{linkedRequest?.protocol ? `Voltar para Solicitação ${linkedRequest.protocol}` : 'Voltar para Orçamentos'}</span>
                    </a>
                    <div class="gt-detail-toolbar-actions">
                        <button type="button" onclick="window.print()" class="gt-btn-outline gt-btn-sm">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 6 2 18 2 18 9" />
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                <rect width="12" height="8" x="6" y="14" />
                            </svg>
                            <span>Imprimir / PDF</span>
                        </button>
                        {quotationDetail.status !== 'sent' && quotationDetail.status !== 'approved' && (
                            <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                <input type="hidden" name="status" value="sent" />
                                <button type="submit" data-loading-text="Enviando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="m22 2-7 20-4-9-9-4Z" />
                                        <path d="M22 2 11 13" />
                                    </svg>
                                    <span>Enviar Orçamento ao Cliente</span>
                                </button>
                            </form>
                        )}
                        {quotationDetail.status === 'sent' && (
                            <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                <input type="hidden" name="status" value="approved" />
                                <button type="submit" data-loading-text="Aprovando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Aprovar &amp; Iniciar Projeto</span>
                                </button>
                            </form>
                        )}
                        {quotationDetail.status === 'approved' && (
                            <a href={linkedProject?.id ? `/admin/projetos/${linkedProject.id}` : '/admin/projetos'} class="gt-btn-petrol gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <path d="m9 11 3 3L22 4" />
                                </svg>
                                <span>Abrir Projeto em Execução</span>
                            </a>
                        )}
                    </div>
                </div>

                <div class="gt-grid-detail" style="height: calc(100vh - 176px); max-height: calc(100vh - 176px); align-items: stretch; overflow: hidden;">
                    {/* Coluna Principal: Proposta Comercial (Sem duplicações e com ritmo visual executivo) */}
                    <section class="gtb-card !p-4 min-w-0" style="display: flex; flex-direction: column; gap: 10px; height: 100%; max-height: 100%; overflow: hidden;">
                        {/* Cabeçalho Limpo (Sem subtítulo repetido) */}
                        <div class="space-y-2.5 pb-2.5" style="flex-shrink: 0; border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <div class="flex items-center justify-between gap-3 flex-wrap">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="gt-req-pill-neutral font-mono">{quotationDetail.reference_code}</span>
                                    <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                                    {linkedRequest?.protocol && (
                                        <a href={`/admin/solicitacoes/${linkedRequest.id}`} class="gt-req-pill-neutral font-mono no-underline hover:underline">
                                            Solicitação {linkedRequest.protocol}
                                        </a>
                                    )}
                                </div>
                                <span class="text-[11px] font-semibold text-[#8C95AA]">
                                    Emitida em {quotationDetail.created_at ? new Date(quotationDetail.created_at).toLocaleDateString('pt-BR') : '—'}
                                </span>
                            </div>

                            <div class="flex items-center justify-between gap-4 flex-wrap">
                                <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white leading-tight truncate">
                                    {quotationDetail.title}
                                </h1>
                                <div class="flex items-baseline gap-2 shrink-0">
                                    <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total Líquido</span>
                                    <span class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#F2C230] leading-none">{formatBRL(finalAmt)}</span>
                                </div>
                            </div>

                            {/* 3 Chips Executivos sem repetição */}
                            <div class="gt-req-meta-grid">
                                <div class="gt-req-meta-chip">
                                    <span class="gt-req-meta-icon" aria-hidden="true">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Cliente / Empresa</div>
                                        <div class="text-xs font-bold text-white truncate">{quotationDetail.company || quotationDetail.client_name || 'Não informado'}</div>
                                    </div>
                                </div>

                                <div class="gt-req-meta-chip">
                                    <span class="gt-req-meta-icon" aria-hidden="true">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">E-mail do Portal</div>
                                        <div class="text-xs font-bold text-white truncate">
                                            {quotationDetail.client_email && !String(quotationDetail.client_email).endsWith('.local') ? quotationDetail.client_email : 'Aguardando e-mail'}
                                        </div>
                                    </div>
                                </div>

                                <div class="gt-req-meta-chip">
                                    <span class="gt-req-meta-icon gt-req-meta-icon--gold" aria-hidden="true">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Execução / Projeto</div>
                                        <div class="text-xs font-extrabold text-white truncate">
                                            {linkedProject?.id ? `Projeto #${linkedProject.id} (${linkedProject.progress_percentage || 50}%)` : 'Aguardando Aprovação'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {quotationDetail.status !== 'rejected' && quotationDetail.status !== 'expired' && (
                            <div style="flex-shrink: 0;">
                                <div class="flex items-center justify-between gap-2 mb-1">
                                    <h2 class="text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Esteira de Aprovação</h2>
                                    <span class="text-[10px] font-bold text-[#8C95AA]">
                                        Fase {Math.max(1, currQuoteIdx + 1)} de {quoteSteps.length}
                                    </span>
                                </div>
                                <div class="gt-req-stepper gt-req-stepper--3 gt-no-print" style="padding: 8px 12px;" role="list" aria-label="Etapas do orçamento">
                                    {quoteSteps.map((step, idx) => {
                                        const isDoneAll = quotationDetail.status === 'approved';
                                        const isDone = isDoneAll || (currQuoteIdx >= 0 && idx < currQuoteIdx);
                                        const isActive = !isDoneAll && idx === currQuoteIdx;
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

                        <form action={`/admin/orcamentos/${quotationDetail.id}`} method="post" data-dirty-guard="1" style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; gap: 10px; overflow: hidden;">
                            <div class="gt-grid-2" style="flex-shrink: 0;">
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Título da Proposta *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={quotationDetail.title || ''}
                                        class="w-full rounded-xl px-3 py-2 text-[12.5px]"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">
                                        E-mail do Cliente (Acesso ao Portal) *
                                    </label>
                                    <input
                                        type="email"
                                        name="client_email"
                                        placeholder="cliente@empresa.com"
                                        value={quotationDetail.client_email && !String(quotationDetail.client_email).endsWith('.local') ? quotationDetail.client_email : ''}
                                        class="w-full rounded-xl px-3 py-2 text-[12.5px]"
                                    />
                                </div>
                            </div>

                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5" style="flex-shrink: 0;">
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Valor Bruto (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="total_amount"
                                        required
                                        value={totalAmt}
                                        class="w-full rounded-xl px-3 py-2 text-[12.5px] font-mono"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Desconto (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="discount_amount"
                                        value={discountAmt}
                                        class="w-full rounded-xl px-3 py-2 text-[12.5px] font-mono"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Status da Proposta</label>
                                    <select name="status" class="w-full rounded-xl px-3 py-2 text-[12.5px]">
                                        <option value="draft" selected={quotationDetail.status === 'draft'}>Rascunho</option>
                                        <option value="sent" selected={quotationDetail.status === 'sent'}>Enviado (Libera Portal)</option>
                                        <option value="approved" selected={quotationDetail.status === 'approved'}>Aprovado (Inicia Projeto)</option>
                                        <option value="rejected" selected={quotationDetail.status === 'rejected'}>Recusado</option>
                                        <option value="expired" selected={quotationDetail.status === 'expired'}>Expirado</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1">Validade</label>
                                    <input
                                        type="date"
                                        name="expires_at"
                                        value={String(quotationDetail.expires_at || '').slice(0, 10)}
                                        class="w-full rounded-xl px-3 py-2 text-[12.5px]"
                                    />
                                </div>
                            </div>

                            <div style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column;">
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1" style="flex-shrink: 0;">Escopo Técnico, Entregáveis &amp; Condições Comerciais</label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    placeholder="Descreva os entregáveis, prazo estimado, forma de pagamento e observações comerciais..."
                                    class="w-full rounded-xl px-3 py-2 text-[12.5px] leading-relaxed"
                                    style="flex: 1 1 0%; min-height: 54px; resize: none;"
                                >{quotationDetail.notes || ''}</textarea>
                            </div>

                            <div class="flex items-center justify-between gap-3 pt-1 flex-wrap gt-no-print" style="flex-shrink: 0;">
                                <span class="text-[11px] text-[#8C95AA]">
                                    Alterações sincronizadas automaticamente com o Portal do Cliente e Receita &amp; Caixa.
                                </span>
                                <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    <span>Salvar Proposta</span>
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Coluna Lateral: 2 Cards proporcionais sem buracos vazios */}
                    <div class="min-w-0" style="display: flex; flex-direction: column; gap: 14px; height: 100%; max-height: 100%; overflow: hidden;">
                        {/* Card 1: Resumo Financeiro & Vínculos */}
                        <aside class="gtb-card !p-4 space-y-3 min-w-0" style="flex-shrink: 0;">
                            <div class="pb-2" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                <h2 class="gt-font-display text-sm font-extrabold text-white">Resumo Financeiro</h2>
                                <p class="text-[11px] text-[#8C95AA] mt-0.5">Memória de cálculo e rastreabilidade do contrato.</p>
                            </div>

                            <div class="gtb-surface-box rounded-xl p-3 space-y-2 text-xs">
                                <div class="flex items-center justify-between">
                                    <span class="text-[#8C95AA]">Valor Bruto</span>
                                    <span class="font-bold text-white">{formatBRL(totalAmt)}</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="text-[#8C95AA]">Desconto Comercial</span>
                                    <span class="font-bold text-emerald-400">- {formatBRL(discountAmt)}</span>
                                </div>
                                <div class="pt-2 border-t border-white/10 flex items-center justify-between">
                                    <span class="font-extrabold text-white">Investimento Final</span>
                                    <span class="gt-font-display text-base font-extrabold text-[#F2C230]">{formatBRL(finalAmt)}</span>
                                </div>
                            </div>

                            <div class="space-y-1.5">
                                {linkedRequest?.id && (
                                    <a href={`/admin/solicitacoes/${linkedRequest.id}`} class="gt-quick-action-btn !py-2 !px-3">
                                        <span class="flex items-center gap-2 text-xs font-bold">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            <span class="truncate">Solicitação {linkedRequest.protocol}</span>
                                        </span>
                                        <span class="gt-quick-action-tag">PIPELINE</span>
                                    </a>
                                )}

                                {linkedProject?.id && (
                                    <a href={`/admin/projetos/${linkedProject.id}`} class="gt-quick-action-btn !py-2 !px-3">
                                        <span class="flex items-center gap-2 text-xs font-bold">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                                            <span class="truncate">Projeto em Execução ({linkedProject.progress_percentage || 50}%)</span>
                                        </span>
                                        <span class="gt-quick-action-tag">PROJETO</span>
                                    </a>
                                )}
                            </div>
                        </aside>

                        {/* Card 2: Portal do Cliente & Ações Rápidas */}
                        <aside class="gtb-card !p-4 min-w-0 gt-no-print" style="flex: 1 1 0%; min-height: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
                            <div class="space-y-2.5">
                                <div class="flex items-center justify-between gap-2 pb-2" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                    <div>
                                        <h2 class="gt-font-display text-sm font-extrabold text-white">Portal do Cliente &amp; Ações</h2>
                                        <p class="text-[11px] text-[#8C95AA] mt-0.5">Entrega multicanal e controle de acesso.</p>
                                    </div>
                                    {Number(quotationDetail.portal_user_active) === 1 || quotationDetail.status === 'sent' || quotationDetail.status === 'approved' ? (
                                        <span class="gt-badge gt-badge-success">Portal Ativo</span>
                                    ) : (
                                        <span class="gt-badge gt-badge-warning">Em Rascunho</span>
                                    )}
                                </div>

                                <div class="space-y-2">
                                    {quotationDetail.client_id && (quotationDetail.status === 'sent' || quotationDetail.status === 'approved') && (
                                        <button
                                            type="button"
                                            id="gt-quote-portal-wa-btn"
                                            onclick={`(function(btn){btn.disabled=true;var orig=btn.innerHTML;btn.textContent='Gerando link seguro...';fetch('/admin/clientes/${quotationDetail.client_id}/ativar-portal',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({send_email:true,promote_active:${quotationDetail.status === 'approved' ? 'true' : 'false'}})}).then(function(r){return r.json();}).then(function(d){btn.disabled=false;btn.innerHTML=orig;if(d&&d.ok&&d.whatsapp_url){window.open(d.whatsapp_url,'_blank');}else{alert((d&&d.error)||'Informe um e-mail válido para o cliente primeiro.');}}).catch(function(){btn.disabled=false;btn.innerHTML=orig;});})(this)`}
                                            class="gt-quick-action-btn !py-2 !px-3"
                                        >
                                            <span class="flex items-center gap-2.5 text-xs font-bold">
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                                <span>Enviar Acesso do Portal no WhatsApp</span>
                                            </span>
                                            <span class="gt-quick-action-tag">WHATSAPP</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onclick="window.print()"
                                        class="gt-quick-action-btn !py-2 !px-3"
                                    >
                                        <span class="flex items-center gap-2.5 text-xs font-bold">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                                            <span>Exportar Proposta Comercial (PDF)</span>
                                        </span>
                                        <span class="gt-quick-action-tag">PDF</span>
                                    </button>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10">
                                {quotationDetail.status !== 'rejected' ? (
                                    <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                        <input type="hidden" name="status" value="rejected" />
                                        <button type="submit" data-loading-text="Atualizando..." class="gt-btn-outline gt-btn-sm w-full justify-center">
                                            Marcar Recusado
                                        </button>
                                    </form>
                                ) : (
                                    <div></div>
                                )}
                                <form
                                    action={`/admin/orcamentos/${quotationDetail.id}/excluir`}
                                    method="post"
                                    class="m-0"
                                    onsubmit="return confirm('Deseja realmente excluir este orçamento?')"
                                >
                                    <button type="submit" data-loading-text="Excluindo..." class="gt-btn-danger-ghost gt-btn-sm w-full justify-center">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M3 6h18" />
                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                        </svg>
                                        <span>Excluir</span>
                                    </button>
                                </form>
                            </div>
                        </aside>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    // ----------------------------------------------------
    // LISTAGEM DE ORÇAMENTOS & PROPOSTAS COMERCIAIS
    // ----------------------------------------------------
    const totalValue = quotations.reduce((acc, q) => acc + Number(q.final_amount || q.total_amount || 0), 0);
    const approvedList = quotations.filter((q) => q.status === 'approved');
    const approvedValue = approvedList.reduce((acc, q) => acc + Number(q.final_amount || q.total_amount || 0), 0);
    const sentCount = quotations.filter((q) => q.status === 'sent').length;
    const draftCount = quotations.filter((q) => !q.status || q.status === 'draft').length;
    const defaultExpiry = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

    return (
        <AdminLayout
            title="Orçamentos & Propostas • Painel Administrativo GundjaTech"
            activeNav="quotations"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Orçamentos &amp; Propostas Comerciais</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Propostas geradas manualmente e pré-orçamentos do CRM Autônomo IA.
                    </p>
                </div>
                <div class="flex items-center justify-end gap-2.5 flex-wrap shrink-0 ml-auto">
                    <a href="/admin/solicitacoes" class="gt-btn-outline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        <span>A partir de Solicitação</span>
                    </a>
                    <button
                        type="button"
                        onclick="document.getElementById('modal-novo-orcamento').style.display='flex'"
                        class="gt-btn-primary"
                    >
                        <span>+ Novo Orçamento</span>
                    </button>
                </div>
            </div>

            {/* 4 KPI Cards Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Volume em Propostas</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatBRL(totalValue)}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#D5DCEB]">{quotations.length} prop.</span>
                </div>

                <div class="gtb-card gtb-kpi-petrol !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Aprovadas</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-[#34D399] mt-0.5 block">{formatBRL(approvedValue)}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">{approvedList.length} aprov.</span>
                </div>

                <div class="gtb-card gtb-kpi-blue !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Enviadas (Aguardando)</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{sentCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Enviado</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Rascunhos / IA</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block">{draftCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Rascunho</span>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/orcamentos" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por código, título ou cliente..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Status</option>
                            <option value="draft" selected={statusFilter === 'draft'}>Rascunho</option>
                            <option value="sent" selected={statusFilter === 'sent'}>Enviado</option>
                            <option value="approved" selected={statusFilter === 'approved'}>Aprovado</option>
                            <option value="rejected" selected={statusFilter === 'rejected'}>Recusado</option>
                            <option value="expired" selected={statusFilter === 'expired'}>Expirado</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/orcamentos" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Orçamentos */}
            <div class="gtb-card !p-0 overflow-hidden">
                {quotations.length === 0 ? (
                    <div class="gt-empty-state">Nenhum orçamento emitido até o momento.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Código</th>
                                    <th class="py-3.5 px-5">Título / Cliente</th>
                                    <th class="py-3.5 px-5">Valor Total</th>
                                    <th class="py-3.5 px-5">Validade</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {quotations.map((q: any) => {
                                    const meta = STATUS_META[q.status] || { label: q.status || 'Rascunho', badgeClass: 'gt-badge-warning' };
                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5 font-mono font-bold text-[#F2C230] whitespace-nowrap">
                                                <a href={`/admin/orcamentos/${q.id}`} class="no-underline text-inherit hover:underline">
                                                    {q.reference_code || `#${q.id}`}
                                                </a>
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <a href={`/admin/orcamentos/${q.id}`} class="font-bold text-white no-underline hover:text-[#F2C230] block">
                                                    {q.title || 'Proposta Comercial'}
                                                </a>
                                                <div class="text-[11px] text-[#8C95AA]">{q.company || q.client_name || 'Cliente'}</div>
                                            </td>
                                            <td class="py-3.5 px-5 font-extrabold text-white whitespace-nowrap">
                                                {formatBRL(q.final_amount || q.total_amount || 0)}
                                            </td>
                                            <td class="py-3.5 px-5 text-[#8C95AA] whitespace-nowrap">
                                                {q.expires_at ? String(q.expires_at).slice(0, 10) : '—'}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <a href={`/admin/orcamentos/${q.id}`} class="gt-btn-outline gt-btn-xs">
                                                        Gerenciar
                                                    </a>
                                                    {q.status !== 'approved' && (
                                                        <form action={`/admin/orcamentos/${q.id}/status`} method="post" class="inline-block m-0">
                                                            <input type="hidden" name="status" value="approved" />
                                                            <button type="submit" data-loading-text="..." class="gt-btn-primary gt-btn-xs" title="Aprovar orçamento">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Aprovar</span>
                                                            </button>
                                                        </form>
                                                    )}
                                                    <form
                                                        action={`/admin/orcamentos/${q.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        onsubmit="return confirm('Deseja realmente excluir este orçamento?')"
                                                    >
                                                        <button type="submit" class="gt-btn-danger-ghost gt-btn-icon-only" title="Excluir orçamento" aria-label="Excluir orçamento">
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

            {/* Modal Novo Orçamento */}
            <div
                id="modal-novo-orcamento"
                onclick="if(event.target===this)this.style.display='none'"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Criar Novo Orçamento / Proposta</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-orcamento').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/orcamentos" method="post" class="space-y-3.5">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((cl: any) => (
                                    <option value={cl.id}>{cl.company ? `${cl.company} (${cl.name})` : cl.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Título da Proposta *</label>
                            <input
                                type="text"
                                name="title"
                                required
                                placeholder="Ex: Desenvolvimento de Site Institucional + SEO Técnico"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Valor Bruto (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="total_amount"
                                    required
                                    placeholder="4800.00"
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Desconto (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="discount_amount"
                                    value="0"
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Validade</label>
                                <input type="date" name="expires_at" value={defaultExpiry} class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status Inicial</label>
                                <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="draft">Rascunho</option>
                                    <option value="sent">Enviado ao Cliente</option>
                                    <option value="approved">Aprovado</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Escopo &amp; Condições Comerciais</label>
                            <textarea
                                name="notes"
                                rows={3}
                                placeholder="Prazo estimado, entregáveis e condições de pagamento..."
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            ></textarea>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-orcamento').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Criando..." class="gt-btn-primary">
                                Criar Orçamento
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
