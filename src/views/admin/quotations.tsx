import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminQuotationsProps {
    currentUser: any;
    quotations?: any[];
    quotationDetail?: any;
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

        return (
            <AdminLayout
                title={`Orçamento ${quotationDetail.reference_code} • Painel Administrativo`}
                activeNav="quotations"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <a href="/admin/orcamentos" class="text-xs font-bold text-[#F2C230] no-underline hover:underline">
                        &larr; Voltar para Orçamentos
                    </a>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button type="button" onclick="window.print()" class="gt-btn-outline !py-1.5 !px-3 !text-xs">
                            🖨️ Imprimir / PDF
                        </button>
                        {quotationDetail.status !== 'sent' && quotationDetail.status !== 'approved' && (
                            <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                <input type="hidden" name="status" value="sent" />
                                <button type="submit" data-loading-text="Enviando..." class="gt-btn-outline !py-1.5 !px-3 !text-xs">
                                    Marcar como Enviado
                                </button>
                            </form>
                        )}
                        {quotationDetail.status !== 'approved' && (
                            <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                <input type="hidden" name="status" value="approved" />
                                <button type="submit" data-loading-text="Aprovando..." class="btn-primary !py-1.5 !px-3.5 !text-xs">
                                    ✓ Aprovar Proposta
                                </button>
                            </form>
                        )}
                        <form action={`/admin/orcamentos/${quotationDetail.id}/converter-projeto`} method="post" class="m-0">
                            <button type="submit" data-loading-text="Convertendo..." class="btn-primary !py-1.5 !px-3.5 !text-xs">
                                🚀 Converter em Projeto
                            </button>
                        </form>
                    </div>
                </div>

                <div class="gt-grid-detail items-start">
                    {/* Coluna Principal: Formulário de Edição */}
                    <section class="gtb-card space-y-5 min-w-0">
                        <div class="flex items-start justify-between gap-3 flex-wrap pb-4 border-b border-white/10">
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span class="font-mono text-xs font-extrabold text-[#F2C230]">{quotationDetail.reference_code}</span>
                                    <span class={`gt-badge ${meta.badgeClass}`}>{meta.label}</span>
                                </div>
                                <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">{quotationDetail.title}</h1>
                                <p class="text-xs text-[#8C95AA] mt-1">
                                    Cliente: <strong class="text-white">{quotationDetail.company || quotationDetail.client_name || 'Cliente'}</strong>
                                    {quotationDetail.client_email && !String(quotationDetail.client_email).endsWith('.local') ? ` (${quotationDetail.client_email})` : ''}
                                </p>
                            </div>
                            <div class="text-right">
                                <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Valor Final</div>
                                <div class="gt-font-display text-2xl font-extrabold text-[#F2C230]">{formatBRL(finalAmt)}</div>
                            </div>
                        </div>

                        <form action={`/admin/orcamentos/${quotationDetail.id}`} method="post" class="space-y-4">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Título da Proposta *</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    value={quotationDetail.title || ''}
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
                                        value={totalAmt}
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
                                        value={discountAmt}
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                    />
                                </div>
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status da Proposta</label>
                                    <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                        <option value="draft" selected={quotationDetail.status === 'draft'}>Rascunho</option>
                                        <option value="sent" selected={quotationDetail.status === 'sent'}>Enviado ao Cliente</option>
                                        <option value="approved" selected={quotationDetail.status === 'approved'}>Aprovado</option>
                                        <option value="rejected" selected={quotationDetail.status === 'rejected'}>Recusado</option>
                                        <option value="expired" selected={quotationDetail.status === 'expired'}>Expirado</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Validade da Proposta</label>
                                    <input
                                        type="date"
                                        name="expires_at"
                                        value={String(quotationDetail.expires_at || '').slice(0, 10)}
                                        class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Escopo, Entregáveis &amp; Condições Comerciais</label>
                                <textarea
                                    name="notes"
                                    rows={6}
                                    placeholder="Descreva os entregáveis, prazo estimado, forma de pagamento e observações comerciais..."
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                                >{quotationDetail.notes || ''}</textarea>
                            </div>

                            <div class="flex items-center justify-between gap-3 pt-2 flex-wrap">
                                <button type="submit" data-loading-text="Salvando..." class="btn-primary py-2.5 px-6 text-xs">
                                    ✓ Salvar Alterações da Proposta
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* Coluna Lateral: Resumo Financeiro & Ações Críticas */}
                    <aside class="gtb-card space-y-4 min-w-0">
                        <h2 class="gt-font-display text-sm font-extrabold text-white">Resumo Comercial</h2>

                        <div class="gtb-surface-box rounded-xl p-4 space-y-2.5 text-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-[#8C95AA]">Valor Bruto</span>
                                <span class="font-bold text-white">{formatBRL(totalAmt)}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-[#8C95AA]">Desconto</span>
                                <span class="font-bold text-emerald-400">- {formatBRL(discountAmt)}</span>
                            </div>
                            <div class="pt-2.5 border-t border-white/10 flex items-center justify-between">
                                <span class="font-extrabold text-white">Total Líquido</span>
                                <span class="gt-font-display text-base font-extrabold text-[#F2C230]">{formatBRL(finalAmt)}</span>
                            </div>
                        </div>

                        <div class="text-[11px] text-[#8C95AA] space-y-1">
                            <div>Emitido em: <strong class="text-white">{quotationDetail.created_at ? new Date(quotationDetail.created_at).toLocaleDateString('pt-BR') : '—'}</strong></div>
                            <div>Validade: <strong class="text-white">{quotationDetail.expires_at ? String(quotationDetail.expires_at).slice(0, 10) : 'Sem prazo'}</strong></div>
                        </div>

                        <div class="pt-3 border-t border-white/10 space-y-2">
                            {quotationDetail.status !== 'rejected' && (
                                <form action={`/admin/orcamentos/${quotationDetail.id}/status`} method="post" class="m-0">
                                    <input type="hidden" name="status" value="rejected" />
                                    <button type="submit" data-loading-text="Atualizando..." class="gt-btn-outline w-full py-2 text-xs">
                                        Marcar como Recusado
                                    </button>
                                </form>
                            )}
                            <form
                                action={`/admin/orcamentos/${quotationDetail.id}/excluir`}
                                method="post"
                                class="m-0"
                                onsubmit="return confirm('Deseja realmente excluir este orçamento?')"
                            >
                                <button type="submit" data-loading-text="Excluindo..." class="w-full py-2 px-3 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 font-bold text-xs cursor-pointer border-0 transition">
                                    Excluir Orçamento
                                </button>
                            </form>
                        </div>
                    </aside>
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
                <div class="flex items-center gap-2.5 flex-wrap">
                    <a href="/admin/solicitacoes" class="gt-btn-outline">
                        A partir de Solicitação
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

            {/* 4 KPI Cards Executivos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Volume em Propostas</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">{formatBRL(totalValue)}</div>
                    <div class="text-[11px] text-[#8C95AA]">{quotations.length} proposta(s) registrada(s)</div>
                </div>

                <div class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Aprovadas</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#34D399]">{formatBRL(approvedValue)}</div>
                    <div class="text-[11px] text-[#8C95AA]">{approvedList.length} fechada(s)</div>
                </div>

                <div class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Enviadas (Aguardando)</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">{sentCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">em negociação com cliente</div>
                </div>

                <div class="gtb-card !p-5 flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Rascunhos / IA</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#F2C230]">{draftCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">pendentes de revisão/envio</div>
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
                                                    <a href={`/admin/orcamentos/${q.id}`} class="gt-btn-outline !py-1 !px-2.5 !text-[11px]">
                                                        Gerenciar
                                                    </a>
                                                    {q.status !== 'approved' && (
                                                        <form action={`/admin/orcamentos/${q.id}/status`} method="post" class="inline-block m-0">
                                                            <input type="hidden" name="status" value="approved" />
                                                            <button type="submit" data-loading-text="..." class="btn-primary !py-1 !px-2.5 !text-[11px]" title="Aprovar orçamento">
                                                                ✓ Aprovar
                                                            </button>
                                                        </form>
                                                    )}
                                                    <form
                                                        action={`/admin/orcamentos/${q.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        onsubmit="return confirm('Deseja realmente excluir este orçamento?')"
                                                    >
                                                        <button type="submit" class="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 font-bold text-[11px] cursor-pointer border-0 transition" title="Excluir orçamento">
                                                            ✕
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
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Criar Novo Orçamento / Proposta</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-orcamento').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/orcamentos" method="post" class="space-y-4">
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
                            <button type="submit" data-loading-text="Criando..." class="btn-primary py-2.5 px-5 text-xs">
                                Criar Orçamento
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
