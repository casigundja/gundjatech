import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalFinanceProps {
    currentUser: any;
    clientName?: string;
    transactions: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalFinanceView: FC<PortalFinanceProps> = ({
    currentUser,
    clientName,
    transactions,
    successMessage,
    errorMessage
}) => {
    const totalPaid = transactions
        .filter((t: any) => t.status === 'paid')
        .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
    const totalPending = transactions
        .filter((t: any) => t.status !== 'paid')
        .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);

    return (
        <PortalLayout
            title="Financeiro & Faturas • Portal do Cliente GundjaTech"
            activeNav="finance"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Faturas &amp; Lançamentos Financeiros</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Acompanhe o histórico de pagamentos, faturas abertas e comprovantes fiscais.</p>
                </div>
            </div>

            {transactions.length > 0 && (
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                        <div class="gtb-card-accent-top gtb-card-accent-emerald"></div>
                        <div>
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Total Liquidado</div>
                            <div class="text-lg font-extrabold text-emerald-400 mt-0.5">
                                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <span class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        </span>
                    </div>

                    <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                        <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                        <div>
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Em Aberto / A Vencer</div>
                            <div class="text-lg font-extrabold text-[#F2C230] mt-0.5">
                                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <span class="w-9 h-9 rounded-xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </span>
                    </div>

                    <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                        <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                        <div>
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Total de Lançamentos</div>
                            <div class="text-lg font-extrabold text-white mt-0.5">{transactions.length}</div>
                        </div>
                        <span class="w-9 h-9 rounded-xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                        </span>
                    </div>
                </div>
            )}

            {transactions.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Nenhuma fatura emitida.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1">Todas as suas obrigações financeiras e parcelas acordadas estarão visíveis aqui.</p>
                </div>
            ) : (
                <div class="gtb-card !p-0 overflow-hidden">
                    <div class="gt-table-wrap">
                        <table>
                            <thead>
                                <tr class="border-b border-white/10 text-left text-[11px] uppercase text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Fatura / Descrição</th>
                                    <th class="py-3.5 px-5">Vencimento</th>
                                    <th class="py-3.5 px-5">Valor</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Método</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t: any) => (
                                    <tr class="border-b border-white/5">
                                        <td class="py-3.5 px-5">
                                            <div class="text-xs font-extrabold text-white">{t.description}</div>
                                            <div class="text-[11px] text-[#8C95AA] mt-0.5">{t.invoice_number ? `Doc #${t.invoice_number}` : 'Lançamento Contábil'}</div>
                                        </td>
                                        <td class="py-3.5 px-5 text-xs text-[#8C95AA]">{t.due_date}</td>
                                        <td class="py-3.5 px-5 text-xs font-extrabold text-white">
                                            R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td class="py-3.5 px-5">
                                            <span class={`gt-badge ${t.status === 'paid' ? 'gt-badge-success' : t.status === 'overdue' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                                {t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-5 text-right text-xs font-bold text-[#8C95AA]">
                                            {t.payment_method || 'PIX / Boleto'}
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
