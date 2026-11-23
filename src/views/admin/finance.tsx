import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminFinanceProps {
    currentUser: any;
    transactions: any[];
    clients?: any[];
    metrics: {
        totalInvoiced: number;
        totalReceived: number;
        totalPending: number;
        totalOverdue: number;
    };
    statusFilter?: string;
    typeFilter?: string;
    search?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
    paid: { label: 'Pago / Liquidado', badgeClass: 'gt-badge-success' },
    pending: { label: 'Pendente', badgeClass: 'gt-badge-warning' },
    overdue: { label: 'Vencido', badgeClass: 'gt-badge-danger' },
    canceled: { label: 'Cancelado', badgeClass: 'gt-badge-danger' }
};

export const AdminFinanceView: FC<AdminFinanceProps> = ({
    currentUser,
    transactions = [],
    clients = [],
    metrics,
    statusFilter = '',
    typeFilter = '',
    search = '',
    successMessage,
    errorMessage
}) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));

    const formatDueDate = (raw?: string | null) => {
        if (!raw) return '—';
        const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        const dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) return String(raw);
        return dt.toLocaleDateString('pt-BR');
    };

    const isOverdueDate = (raw?: string | null, status?: string) => {
        if (status !== 'pending' || !raw) return false;
        const match = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return false;
        const due = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59);
        return due.getTime() < Date.now();
    };

    const pendingCount = transactions.filter((t) => t.status === 'pending').length;
    const paidCount = transactions.filter((t) => t.status === 'paid').length;
    const canceledCount = transactions.filter((t) => t.status === 'canceled').length;

    return (
        <AdminLayout
            title="Receita & Caixa • Painel Administrativo"
            activeNav="finance"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">
                        Gestão Financeira &amp; Faturamento
                    </h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Controle de receitas de contratos, parcelas, emissão de faturas e liquidações.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-nova-fatura').classList.remove('hidden')"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Nova Fatura / Lançamento</span>
                </button>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total Faturado</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(metrics.totalInvoiced)}</span>
                    </div>
                    <span class="text-[11px] font-bold text-[#8C95AA]">{transactions.length} lanç.</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Recebido em Caixa</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(metrics.totalReceived)}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Recebido</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">A Receber (Pendente)</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(metrics.totalPending)}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Pendente</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Atraso (Vencido)</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(metrics.totalOverdue)}</span>
                    </div>
                    <span class="gt-badge gt-badge-danger">Vencido</span>
                </div>
            </div>

            {/* Tabela Unificada com Barra de Filtros Integrada */}
            <div class="gtb-card !p-0 overflow-hidden">
                <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <a
                            href="/admin/financeiro"
                            class={`gt-btn-xs ${!statusFilter ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            Todos ({transactions.length})
                        </a>
                        <a
                            href="/admin/financeiro?status=pending"
                            class={`gt-btn-xs ${statusFilter === 'pending' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            Pendentes ({pendingCount})
                        </a>
                        <a
                            href="/admin/financeiro?status=paid"
                            class={`gt-btn-xs ${statusFilter === 'paid' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            Recebidos / Pagos ({paidCount})
                        </a>
                        <a
                            href="/admin/financeiro?status=canceled"
                            class={`gt-btn-xs ${statusFilter === 'canceled' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            Cancelados ({canceledCount})
                        </a>
                    </div>

                    <form method="get" action="/admin/financeiro" class="flex items-center gap-2 flex-wrap flex-1 sm:flex-initial justify-end">
                        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar descrição, cliente ou NF..."
                            class="rounded-xl px-3 py-1.5 text-xs w-full sm:w-56"
                        />
                        <select name="type" onchange="this.form.submit()" class="rounded-xl px-3 py-1.5 text-xs">
                            <option value="">Todos os tipos</option>
                            <option value="income" selected={typeFilter === 'income'}>Receita (+)</option>
                            <option value="expense" selected={typeFilter === 'expense'}>Despesa (-)</option>
                        </select>
                        <button type="submit" class="gt-btn-outline gt-btn-xs">Filtrar</button>
                        {(search || statusFilter || typeFilter) && (
                            <a href="/admin/financeiro" class="text-[11px] font-bold text-[#16749A] hover:underline">Limpar</a>
                        )}
                    </form>
                </div>

                {transactions.length === 0 ? (
                    <div class="gt-empty-state">Nenhum lançamento financeiro localizado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3 px-5">Fatura / Descrição</th>
                                    <th class="py-3 px-5">Cliente</th>
                                    <th class="py-3 px-5">Valor</th>
                                    <th class="py-3 px-5">Vencimento</th>
                                    <th class="py-3 px-5">Status</th>
                                    <th class="py-3 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {transactions.map((t) => {
                                    const isIncome = t.type !== 'expense';
                                    const overdue = isOverdueDate(t.due_date, t.status);
                                    const statusMeta = overdue
                                        ? STATUS_LABELS.overdue
                                        : t.status === 'paid'
                                        ? { label: isIncome ? 'Recebido' : 'Pago', badgeClass: 'gt-badge-success' }
                                        : t.status === 'pending'
                                        ? { label: isIncome ? 'A Receber' : 'A Pagar', badgeClass: 'gt-badge-warning' }
                                        : (STATUS_LABELS[t.status] || { label: t.status || 'Pendente', badgeClass: 'gt-badge-info' });
                                    const isPending = t.status === 'pending';

                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5">
                                                <div class="flex items-center gap-3">
                                                    <span class="gtb-icon-box !w-8 !h-8" title={isIncome ? 'Receita' : 'Despesa'} aria-hidden="true">
                                                        {isIncome ? (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                                                        ) : (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                                                        )}
                                                    </span>
                                                    <div class="min-w-0">
                                                        <div class="font-bold text-white text-[13px] truncate max-w-[260px]">{t.description}</div>
                                                        <div class="text-[11px] text-[#8C95AA] mt-0.5">
                                                            {t.invoice_number ? `NF #${t.invoice_number} · ` : ''}
                                                            {t.payment_method || 'Boleto / PIX'} · {isIncome ? 'Receita' : 'Despesa'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <div class="font-semibold text-white">{t.company || t.client_name || '—'}</div>
                                                {t.client_email && !String(t.client_email).endsWith('.local') && (
                                                    <div class="text-[11px] text-[#8C95AA]">{t.client_email}</div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`font-extrabold text-[13px] ${isIncome ? 'text-[#34D399]' : 'text-[#F87171]'}`} style="font-variant-numeric: tabular-nums;">
                                                    {isIncome ? '+' : '-'} {formatCurrency(t.amount)}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <div class="text-xs font-semibold text-[#8C95AA]" style="font-variant-numeric: tabular-nums;">
                                                    {formatDueDate(t.due_date)}
                                                </div>
                                                {overdue && (
                                                    <div class="text-[10px] font-bold text-red-400 mt-0.5">Em atraso</div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    {isPending && (
                                                        <form action={`/admin/financeiro/${t.id}/pagar`} method="post" class="inline-block m-0">
                                                            <button
                                                                type="submit"
                                                                data-loading-text={isIncome ? 'Recebendo...' : 'Pagando...'}
                                                                class="gt-btn-petrol gt-btn-xs"
                                                                title={isIncome ? 'Confirmar recebimento da receita' : 'Confirmar pagamento da despesa'}
                                                            >
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>{isIncome ? 'Receber' : 'Pagar'}</span>
                                                            </button>
                                                        </form>
                                                    )}
                                                    {isPending && (
                                                        <form action={`/admin/financeiro/${t.id}/cancelar`} method="post" class="inline-block m-0">
                                                            <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs" title="Cancelar fatura">
                                                                Cancelar
                                                            </button>
                                                        </form>
                                                    )}
                                                    <form
                                                        action={`/admin/financeiro/${t.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente excluir este lançamento financeiro permanentemente?"
                                                    >
                                                        <button
                                                            type="submit"
                                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                                            title="Excluir lançamento"
                                                            aria-label="Excluir lançamento"
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

            {/* Modal Nova Fatura */}
            <div
                id="modal-nova-fatura"
                class="gt-modal-overlay hidden"
                onclick="if(event.target===this)this.classList.add('hidden')"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Lançar Nova Fatura / Cobrança</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-fatura').classList.add('hidden')"
                            class="gtb-icon-btn !w-8 !h-8 rounded-lg"
                            aria-label="Fechar"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <form action="/admin/financeiro" method="post" class="space-y-4">
                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente *</label>
                                <select name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="">Selecione o cliente...</option>
                                    {clients.map((c) => (
                                        <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Tipo de Lançamento</label>
                                <select name="type" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="income">Receita (+)</option>
                                    <option value="expense">Despesa (-)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição do Lançamento *</label>
                            <input
                                type="text"
                                name="description"
                                required
                                placeholder="Ex: Parcela 01/03 - Desenvolvimento Web Edge"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Valor (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="amount"
                                    required
                                    placeholder="5000.00"
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Vencimento *</label>
                                <input type="date" name="due_date" min="2020-01-01" max="2099-12-31" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Método Previsto</label>
                                <select name="payment_method" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="PIX">PIX</option>
                                    <option value="Boleto">Boleto Bancário</option>
                                    <option value="Cartão">Cartão de Crédito</option>
                                    <option value="Transferência">Transferência / TED</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nº da Fatura / NF</label>
                                <input type="text" name="invoice_number" placeholder="Ex: 2026-0012" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-nova-fatura').classList.add('hidden')"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Emitindo..." class="gt-btn-primary gt-btn-sm">
                                Emitir Cobrança
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
