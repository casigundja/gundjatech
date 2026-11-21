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
    return (
        <PortalLayout
            title="Financeiro & Faturas • Portal do Cliente GundjaTech"
            activeNav="finance"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Faturas & Lançamentos Financeiros</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Acompanhe o histórico de pagamentos, faturas abertas e comprovantes fiscais.</p>
            </div>

            {transactions.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">💳</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Nenhuma fatura emitida.</h3>
                    <p style="font-size: 13px; color: #527287; margin-top: 8px;">Todas as suas obrigações financeiras e parcelas acordadas estarão visíveis aqui.</p>
                </div>
            ) : (
                <div class="gt-card" style="overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #F4F8FA; border-bottom: 1px solid var(--gt-border); text-align: left; color: #67879C; font-size: 11px; text-transform: uppercase;">
                                <th style="padding: 14px 20px;">Fatura / Descrição</th>
                                <th style="padding: 14px 20px;">Vencimento</th>
                                <th style="padding: 14px 20px;">Valor</th>
                                <th style="padding: 14px 20px;">Status</th>
                                <th style="padding: 14px 20px; text-align: right;">Método</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t: any) => (
                                <tr style="border-bottom: 1px solid var(--gt-border);">
                                    <td style="padding: 14px 20px;">
                                        <div style="font-weight: 700; color: #063B5C;">{t.description}</div>
                                        <div style="font-size: 11px; color: #8CAAB9;">{t.invoice_number ? `Doc #${t.invoice_number}` : 'Lançamento Contábil'}</div>
                                    </td>
                                    <td style="padding: 14px 20px; color: #527287;">{t.due_date}</td>
                                    <td style="padding: 14px 20px; font-weight: 700; color: #063B5C;">
                                        R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style="padding: 14px 20px;">
                                        <span class={`gt-badge ${t.status === 'paid' ? 'gt-badge-success' : t.status === 'overdue' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                            {t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Vencido' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td style="padding: 14px 20px; text-align: right; color: #67879C;">
                                        {t.payment_method || 'PIX / Boleto'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </PortalLayout>
    );
};
