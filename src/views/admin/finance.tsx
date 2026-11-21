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
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    return (
        <AdminLayout
            title="Faturas & Finanças • Painel Administrativo"
            activeNav="finance"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF;">Gestão Financeira & Faturamento</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">
                        Controle de receitas de contratos, parcelas, emissão de faturas e liquidações.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('modal-nova-fatura').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Nova Fatura / Lançamento</span>
                </button>
            </div>

            {/* 4 Cards de Métricas */}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Total Faturado</div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin-top: 6px;">
                        {formatCurrency(metrics.totalInvoiced)}
                    </div>
                </div>

                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Recebido / Liquidado</div>
                    <div style="font-size: 24px; font-weight: 800; color: #34D399; margin-top: 6px;">
                        {formatCurrency(metrics.totalReceived)}
                    </div>
                </div>

                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">A Receber (Pendente)</div>
                    <div style="font-size: 24px; font-weight: 800; color: #F2C230; margin-top: 6px;">
                        {formatCurrency(metrics.totalPending)}
                    </div>
                </div>

                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Em Atraso (Vencido)</div>
                    <div style="font-size: 24px; font-weight: 800; color: #F87171; margin-top: 6px;">
                        {formatCurrency(metrics.totalOverdue)}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 24px;">
                <form method="get" action="/admin/financeiro" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por descrição, cliente ou nº fatura..."
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="status"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Todos os Status</option>
                            <option value="pending" selected={statusFilter === 'pending'}>Pendente</option>
                            <option value="paid" selected={statusFilter === 'paid'}>Pago</option>
                            <option value="canceled" selected={statusFilter === 'canceled'}>Cancelado</option>
                        </select>
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="type"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Tipo (Todos)</option>
                            <option value="income" selected={typeFilter === 'income'}>Receita (+)</option>
                            <option value="expense" selected={typeFilter === 'expense'}>Despesa (-)</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline" style="font-size: 13px;">Filtrar</button>
                    {(search || statusFilter || typeFilter) && (
                        <a href="/admin/financeiro" style="font-size: 12px; color: #F2C230; text-decoration: underline;">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Transações */}
            <div class="gt-card" style="overflow: hidden;">
                {transactions.length === 0 ? (
                    <div class="gt-empty-state">Nenhum lançamento financeiro localizado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--gt-border); background: rgba(3, 32, 51, 0.6); color: #8CAAB9; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                                    <th style="padding: 16px 20px;">Fatura / Descrição</th>
                                    <th style="padding: 16px 20px;">Cliente</th>
                                    <th style="padding: 16px 20px;">Valor</th>
                                    <th style="padding: 16px 20px;">Vencimento</th>
                                    <th style="padding: 16px 20px;">Status</th>
                                    <th style="padding: 16px 20px; text-align: right;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => {
                                    const isIncome = t.type === 'income';
                                    const statusMeta = STATUS_LABELS[t.status] || { label: t.status, badgeClass: 'gt-badge-info' };
                                    const isPending = t.status === 'pending';

                                    return (
                                        <tr style="border-bottom: 1px solid rgba(22, 116, 154, 0.15);">
                                            <td style="padding: 16px 20px;">
                                                <div style="font-weight: 700; color: #FFFFFF;">
                                                    {t.description}
                                                </div>
                                                <div style="font-size: 11px; color: #8CAAB9; margin-top: 2px;">
                                                    {t.invoice_number ? `NF #${t.invoice_number} • ` : ''}
                                                    {t.payment_method || 'Boleto / PIX'}
                                                </div>
                                            </td>
                                            <td style="padding: 16px 20px;">
                                                <div style="color: #FFFFFF;">{t.company || t.client_name || '—'}</div>
                                                <div style="font-size: 11px; color: #8CAAB9;">{t.client_email || ''}</div>
                                            </td>
                                            <td style="padding: 16px 20px; white-space: nowrap;">
                                                <div style={`font-weight: 800; font-size: 14px; ${isIncome ? 'color: #34D399;' : 'color: #F87171;'}`}>
                                                    {isIncome ? '+ ' : '- '}
                                                    {formatCurrency(t.amount)}
                                                </div>
                                            </td>
                                            <td style="padding: 16px 20px; color: #8CAAB9; white-space: nowrap;">
                                                {new Date(t.due_date).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td style="padding: 16px 20px; white-space: nowrap;">
                                                <span class={`gt-badge ${statusMeta.badgeClass}`}>
                                                    {statusMeta.label}
                                                </span>
                                            </td>
                                            <td style="padding: 16px 20px; text-align: right; white-space: nowrap;">
                                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                                    {isPending && (
                                                        <form action={`/admin/financeiro/${t.id}/pagar`} method="post" style="margin: 0;">
                                                            <button
                                                                type="submit"
                                                                class="gt-btn-primary"
                                                                style="font-size: 11px; padding: 4px 10px;"
                                                                title="Marcar como Liquidado"
                                                            >
                                                                ✓ Liquidar
                                                            </button>
                                                        </form>
                                                    )}
                                                    {isPending && (
                                                        <form action={`/admin/financeiro/${t.id}/cancelar`} method="post" style="margin: 0;">
                                                            <button
                                                                type="submit"
                                                                class="gt-btn-outline"
                                                                style="font-size: 11px; padding: 4px 8px; color: #F87171;"
                                                                title="Cancelar Fatura"
                                                            >
                                                                ✕
                                                            </button>
                                                        </form>
                                                    )}
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
                style="display: none; position: fixed; inset: 0; background: rgba(3, 32, 51, 0.85); backdrop-filter: blur(4px); z-index: 100; align-items: center; justify-content: center; padding: 16px;"
            >
                <div class="gt-card gt-modal-card" style="max-width: 560px; padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Lançar Nova Fatura / Cobrança</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-fatura').style.display='none'"
                            style="background: none; border: none; font-size: 20px; color: #8CAAB9; cursor: pointer;"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/financeiro" method="post">
                        <div class="gt-grid-2">
                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Cliente *</label>
                                <select
                                    name="client_id"
                                    required
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                >
                                    <option value="">Selecione o cliente...</option>
                                    {clients.map((c) => (
                                        <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Descrição do Lançamento *</label>
                                <input
                                    type="text"
                                    name="description"
                                    required
                                    placeholder="Ex: Parcela 01/03 - Desenvolvimento Web Edge"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Valor (R$) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="amount"
                                    required
                                    placeholder="5000.00"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Data de Vencimento *</label>
                                <input
                                    type="date"
                                    name="due_date"
                                    required
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Método Previsto</label>
                                <select
                                    name="payment_method"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                >
                                    <option value="PIX">PIX</option>
                                    <option value="Boleto">Boleto Bancário</option>
                                    <option value="Cartão">Cartão de Crédito</option>
                                    <option value="Transferência">Transferência / TED</option>
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Nº da Fatura / NF</label>
                                <input
                                    type="text"
                                    name="invoice_number"
                                    placeholder="Ex: 2026-0012"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--gt-border); padding-top: 20px;">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-nova-fatura').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" class="gt-btn-primary">
                                Cadastrar Fatura
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
