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
                    onclick="document.getElementById('modal-nova-fatura').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Nova Fatura / Lançamento</span>
                </button>
            </div>

            {/* 4 KPIs Executivos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total Faturado</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">{formatCurrency(metrics.totalInvoiced)}</div>
                    <div class="text-[11px] text-[#8C95AA]">{transactions.length} lançamento(s)</div>
                </div>

                <div class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Recebido / Liquidado</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#34D399]">{formatCurrency(metrics.totalReceived)}</div>
                    <div class="text-[11px] text-[#8C95AA]">em caixa confirmado</div>
                </div>

                <div class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">A Receber (Pendente)</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#F2C230]">{formatCurrency(metrics.totalPending)}</div>
                    <div class="text-[11px] text-[#8C95AA]">aguardando liquidação</div>
                </div>

                <div class="gtb-card !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Em Atraso (Vencido)</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#F87171]">{formatCurrency(metrics.totalOverdue)}</div>
                    <div class="text-[11px] text-[#8C95AA]">faturas vencidas</div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/financeiro" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por descrição, cliente ou nº fatura..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Status</option>
                            <option value="pending" selected={statusFilter === 'pending'}>Pendente</option>
                            <option value="paid" selected={statusFilter === 'paid'}>Pago</option>
                            <option value="canceled" selected={statusFilter === 'canceled'}>Cancelado</option>
                        </select>
                    </div>
                    <div class="gt-filter-select">
                        <select name="type" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Tipo (Todos)</option>
                            <option value="income" selected={typeFilter === 'income'}>Receita (+)</option>
                            <option value="expense" selected={typeFilter === 'expense'}>Despesa (-)</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter || typeFilter) && (
                        <a href="/admin/financeiro" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Transações */}
            <div class="gtb-card !p-0 overflow-hidden">
                {transactions.length === 0 ? (
                    <div class="gt-empty-state">Nenhum lançamento financeiro localizado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Fatura / Descrição</th>
                                    <th class="py-3.5 px-5">Cliente</th>
                                    <th class="py-3.5 px-5">Valor</th>
                                    <th class="py-3.5 px-5">Vencimento</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {transactions.map((t) => {
                                    const isIncome = t.type !== 'expense';
                                    const statusMeta = STATUS_LABELS[t.status] || { label: t.status || 'Pendente', badgeClass: 'gt-badge-info' };
                                    const isPending = t.status === 'pending';

                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5">
                                                <div class="font-bold text-white text-[13px]">{t.description}</div>
                                                <div class="text-[11px] text-[#8C95AA] mt-0.5">
                                                    {t.invoice_number ? `NF #${t.invoice_number} • ` : ''}
                                                    {t.payment_method || 'Boleto / PIX'}
                                                </div>
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <div class="font-semibold text-white">{t.company || t.client_name || '—'}</div>
                                                {t.client_email && !String(t.client_email).endsWith('.local') && (
                                                    <div class="text-[11px] text-[#8C95AA]">{t.client_email}</div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`font-mono font-extrabold text-[13px] ${isIncome ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
                                                    {isIncome ? '+ ' : '- '}
                                                    {formatCurrency(t.amount)}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 text-[#8C95AA] whitespace-nowrap">
                                                {t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    {isPending && (
                                                        <form action={`/admin/financeiro/${t.id}/pagar`} method="post" class="inline-block m-0">
                                                            <button type="submit" data-loading-text="..." class="gt-btn-primary gt-btn-xs" title="Marcar como Liquidado">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Liquidar</span>
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
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Lançar Nova Fatura / Cobrança</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-fatura').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
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
                                <input type="date" name="due_date" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
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
                                onclick="document.getElementById('modal-nova-fatura').style.display='none'"
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
