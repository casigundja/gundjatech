import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';
import { BankPaymentSettings, DEFAULT_BANK_PAYMENT_SETTINGS } from '../../lib/pix';

interface PortalFinanceProps {
    currentUser: any;
    clientName?: string;
    transactions: any[];
    bankSettings?: BankPaymentSettings;
    pixGatewayProvider?: 'static' | 'mercadopago' | 'asaas';
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalFinanceView: FC<PortalFinanceProps> = ({
    currentUser,
    clientName,
    transactions,
    bankSettings = DEFAULT_BANK_PAYMENT_SETTINGS,
    pixGatewayProvider = 'static',
    successMessage,
    errorMessage
}) => {
    const totalPaid = transactions
        .filter((t: any) => t.status === 'paid')
        .reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
    const totalPending = transactions
        .filter((t: any) => t.status !== 'paid' && t.status !== 'canceled')
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
                    <p class="text-xs text-[#8C95AA] mt-1">Pague via PIX instantâneo ou Transferência TED Nu Empresas e envie seu comprovante com segurança.</p>
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
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
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
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </span>
                    </div>

                    <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                        <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                        <div>
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Total de Lançamentos</div>
                            <div class="text-lg font-extrabold text-white mt-0.5">{transactions.length}</div>
                        </div>
                        <span class="w-9 h-9 rounded-xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </span>
                    </div>
                </div>
            )}

            {transactions.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
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
                                    <th class="py-3.5 px-5 text-right">Pagamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t: any) => {
                                    const isPaid = t.status === 'paid';
                                    const isReviewing = t.status === 'reviewing';
                                    const isCanceled = t.status === 'canceled';
                                    const canPay = !isPaid && !isCanceled;
                                    const formattedVal = Number(t.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                    return (
                                        <tr class="border-b border-white/5">
                                            <td class="py-3.5 px-5">
                                                <div class="text-xs font-extrabold text-white">{t.description}</div>
                                                <div class="text-[11px] text-[#8C95AA] mt-0.5">
                                                    {t.invoice_number ? `Doc #${t.invoice_number}` : `Fatura #${t.id}`} · {t.payment_method || 'PIX / TED'}
                                                </div>
                                                {t.status === 'pending' && typeof t.notes === 'string' && t.notes.startsWith('[COMPROVANTE RECUSADO]') && (
                                                    <div class="text-[11px] font-bold text-red-400 mt-1">
                                                        {t.notes.replace('[COMPROVANTE RECUSADO]', 'Comprovante recusado:').trim()}
                                                    </div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 text-xs text-[#8C95AA]">{t.due_date}</td>
                                            <td class="py-3.5 px-5 text-xs font-extrabold text-white">
                                                R$ {formattedVal}
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <span class={`gt-badge ${isPaid ? 'gt-badge-success' : isReviewing ? 'gt-badge-info' : t.status === 'overdue' ? 'gt-badge-danger' : isCanceled ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                                    {isPaid ? 'Pago' : isReviewing ? 'Em Conferência' : t.status === 'overdue' ? 'Vencido' : isCanceled ? 'Cancelado' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center justify-end gap-2">
                                                    {isPaid && (
                                                        <a
                                                            href={`/portal/financeiro/${t.id}/recibo`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            class="gt-btn-petrol gt-btn-xs"
                                                        >
                                                            Recibo PDF
                                                        </a>
                                                    )}
                                                    {t.proof_file && (
                                                        <a
                                                            href={`/portal/financeiro/${t.id}/comprovante`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            class="gt-btn-outline gt-btn-xs"
                                                        >
                                                            Ver Comprovante
                                                        </a>
                                                    )}
                                                    {canPay && (
                                                        <button
                                                            type="button"
                                                            data-id={String(t.id)}
                                                            data-desc={String(t.description || '')}
                                                            data-amount={`R$ ${formattedVal}`}
                                                            data-due={String(t.due_date || '')}
                                                            data-txid={String(t.pix_txid || '')}
                                                            data-pix={String(t.pix_payload || '')}
                                                            data-qr={String(t.pix_qr_data_uri || '')}
                                                            onclick="window.GT_OpenPayModal && window.GT_OpenPayModal(this)"
                                                            class={isReviewing ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-primary gt-btn-xs'}
                                                        >
                                                            <span>{isReviewing ? 'Reenviar / PIX' : 'Pagar Agora'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Pagamento Executivo — PIX + TED Nu Empresas + Comprovante + Confirmação em Tempo Real */}
            <div
                id="modal-pagar-fatura"
                data-pix-provider={pixGatewayProvider}
                onclick="if(event.target===this){window.GT_ClosePayModal&&window.GT_ClosePayModal();}"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-[#063B5C]/65 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl !p-0 overflow-hidden">
                    {/* Cabeçalho Executivo */}
                    <div class="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-start justify-between gap-4">
                        <div class="min-w-0 flex-1">
                            <div class="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                                <svg class="w-3.5 h-3.5 text-[#16749A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                <span>Checkout Financeiro • GundjaTech</span>
                            </div>
                            <h2 id="gt-pay-title" class="gt-font-display text-[15px] font-extrabold text-[#063B5C] mt-1 truncate">Pagar Fatura</h2>
                            <div class="text-[11.5px] text-[#64748B] mt-0.5">
                                Vencimento em <strong id="gt-pay-due" class="text-[#063B5C] font-semibold">—</strong>
                            </div>
                        </div>
                        <div class="flex items-start gap-3 shrink-0">
                            <div class="text-right">
                                <div class="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">Valor Total</div>
                                <div id="gt-pay-amount" class="gt-font-display text-lg font-extrabold text-[#063B5C] leading-tight tabular-nums">R$ 0,00</div>
                            </div>
                            <button
                                type="button"
                                onclick="window.GT_ClosePayModal && window.GT_ClosePayModal()"
                                class="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#063B5C] hover:bg-[#E7F0F5] text-lg leading-none cursor-pointer bg-transparent border-0 transition-colors"
                                aria-label="Fechar"
                            >
                                &times;
                            </button>
                        </div>
                    </div>

                    {/* Estado de Sucesso em Tempo Real (Padrão Executivo / Banking) */}
                    <div id="gt-pay-confirmed-view" class="hidden p-6 space-y-5">
                        <div class="flex items-start gap-3.5">
                            <div
                                style="width: 44px; height: 44px; border-radius: 12px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"
                            >
                                <svg style="width: 22px; height: 22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <div class="min-w-0">
                                <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#059669]">Liquidação Confirmada</div>
                                <h3 class="gt-font-display text-base font-extrabold text-[#063B5C] mt-0.5">Pagamento confirmado</h3>
                                <p class="text-xs text-[#64748B] mt-1 leading-relaxed">
                                    O recebimento foi validado automaticamente. O recibo oficial já está disponível e as notificações foram disparadas.
                                </p>
                            </div>
                        </div>

                        <div class="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2.5 text-xs">
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                <span class="text-[#64748B]">Situação</span>
                                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700;">
                                    Quitado
                                </span>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                <span class="text-[#64748B]">Valor liquidado</span>
                                <strong id="gt-pay-ok-amount" class="font-mono text-[#063B5C] font-extrabold">—</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                <span class="text-[#64748B]">Método</span>
                                <strong class="text-[#063B5C] font-semibold">PIX Instantâneo</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                <span class="text-[#64748B]">Referência</span>
                                <strong id="gt-pay-ok-txid" class="font-mono text-[#16749A] font-semibold">—</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[#64748B]">Confirmado em</span>
                                <strong id="gt-pay-ok-date" class="font-mono text-[#063B5C] font-semibold">—</strong>
                            </div>
                        </div>

                        <div class="flex items-center justify-between gap-3 pt-3 border-t border-[#E2E8F0]">
                            <span class="text-[10.5px] text-[#64748B] hidden sm:inline">Art. 319 e 320 • Código Civil</span>
                            <div class="flex items-center gap-2.5 ml-auto">
                                <button
                                    type="button"
                                    onclick="window.location.reload()"
                                    class="gt-btn-outline gt-btn-sm"
                                >
                                    Concluir
                                </button>
                                <a
                                    id="gt-pay-receipt-link"
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="gt-btn-primary gt-btn-sm no-underline"
                                >
                                    Baixar Recibo (PDF)
                                </a>
                            </div>
                        </div>
                    </div>

                    <div id="gt-pay-checkout-body" class="p-6 space-y-4">
                        {/* Barra de status ao vivo (apenas quando gateway automático está ativo, ou orientação clara no PIX estático) */}
                        {pixGatewayProvider !== 'static' ? (
                            <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F0F7FA] border border-[#D4E4EE] text-[11px] text-[#063B5C]">
                                <span class="inline-flex items-center gap-2 font-semibold">
                                    <span class="w-2 h-2 rounded-full bg-[#16749A] animate-pulse"></span>
                                    <span id="gt-pay-live-label">Verificação automática ativa — assim que pagar, esta tela confirma sozinha.</span>
                                </span>
                            </div>
                        ) : (
                            <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569]">
                                <span id="gt-pay-live-label" class="font-medium">
                                    Após concluir o pagamento via PIX ou TED, anexe o comprovante abaixo para validação e emissão do recibo.
                                </span>
                            </div>
                        )}

                        {/* Abas Segmentadas (Estilo Fintech) */}
                        <div class="gt-pay-seg" role="tablist">
                            <button
                                type="button"
                                id="gt-pay-tab-pix"
                                onclick="window.GT_SwitchPayTab('pix')"
                                class="gt-pay-seg-btn is-active"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                <span>PIX (QR Code)</span>
                            </button>
                            <button
                                type="button"
                                id="gt-pay-tab-ted"
                                onclick="window.GT_SwitchPayTab('ted')"
                                class="gt-pay-seg-btn"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                <span>Transferência / TED</span>
                            </button>
                        </div>

                        {/* Conteúdo Aba PIX */}
                        <div id="gt-pay-pane-pix" class="space-y-4">
                            <div class="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 flex flex-col sm:flex-row items-center gap-4">
                                <div class="bg-white p-2.5 rounded-xl border border-[#E2E8F0] shrink-0">
                                    <img id="gt-pay-qr" src="" alt="QR Code PIX GundjaTech" width="152" height="152" class="block w-[152px] h-[152px] object-contain" />
                                </div>
                                <div class="min-w-0 flex-1 space-y-2 text-xs">
                                    <div class="font-bold text-[#063B5C] text-[13px]">Escaneie o QR Code pelo app do banco</div>
                                    <p class="text-[11.5px] text-[#64748B] leading-relaxed">
                                        O valor e os dados oficiais de recebimento já estão preenchidos no padrão Banco Central.
                                    </p>
                                    <div class="pt-2 border-t border-[#E2E8F0] space-y-1 text-[11px]">
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-[#64748B]">Beneficiário</span>
                                            <strong class="text-[#063B5C] font-semibold">{bankSettings.pixHolder}</strong>
                                        </div>
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-[#64748B]">Chave CNPJ</span>
                                            <strong class="font-mono text-[#063B5C] font-semibold">{bankSettings.pixKey}</strong>
                                        </div>
                                        <div class="flex items-center justify-between gap-2">
                                            <span class="text-[#64748B]">Referência</span>
                                            <strong id="gt-pay-txid" class="font-mono text-[#16749A] font-semibold">—</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">PIX Copia e Cola</label>
                                <div class="flex items-center gap-2">
                                    <input
                                        id="gt-pay-pix-code"
                                        type="text"
                                        readonly
                                        value=""
                                        class="w-full rounded-xl px-3 py-2 text-[11.5px] font-mono !bg-[#F8FAFC] !border-[#CBD5E1] !text-[#063B5C]"
                                    />
                                    <button
                                        type="button"
                                        id="gt-pay-copy-pix"
                                        onclick="window.GT_CopyText('gt-pay-pix-code', 'gt-pay-copy-pix', 'Copiar código')"
                                        class="gt-btn-petrol gt-btn-sm shrink-0"
                                    >
                                        Copiar código
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Aba TED */}
                        <div id="gt-pay-pane-ted" class="hidden">
                            <div class="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2.5 text-xs">
                                <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                    <span class="text-[#64748B]">Instituição</span>
                                    <strong class="text-[#063B5C] font-semibold text-right">{bankSettings.bankName}</strong>
                                </div>
                                <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                    <span class="text-[#64748B]">Agência</span>
                                    <strong class="font-mono text-[#063B5C] font-semibold">{bankSettings.bankAgency}</strong>
                                </div>
                                <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                    <span class="text-[#64748B]">Conta Corrente</span>
                                    <strong class="font-mono text-[#063B5C] font-semibold">{bankSettings.bankAccount}</strong>
                                </div>
                                <div class="flex items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                                    <span class="text-[#64748B]">CNPJ</span>
                                    <strong class="font-mono text-[#063B5C] font-semibold">{bankSettings.bankCnpj}</strong>
                                </div>
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-[#64748B]">Favorecido</span>
                                    <strong class="text-[#063B5C] font-semibold">{bankSettings.pixHolder}</strong>
                                </div>
                            </div>
                        </div>

                        {/* Upload de Comprovante (Dropzone Executivo) */}
                        <form id="gt-pay-receipt-form" action="/portal/financeiro/0/comprovante" method="post" enctype="multipart/form-data" class="pt-4 border-t border-[#E2E8F0] space-y-4">
                            <input type="hidden" id="gt-pay-method-input" name="payment_method" value="PIX" />
                            <div>
                                <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                                    Comprovante de pagamento {pixGatewayProvider !== 'static' ? '(opcional para TED)' : ''}
                                </div>
                                <label id="gt-pay-dropzone" class="gt-pay-dropzone">
                                    <input
                                        id="gt-pay-file-input"
                                        type="file"
                                        name="receipt"
                                        required
                                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                                        onchange="window.GT_UpdateReceiptLabel && window.GT_UpdateReceiptLabel(this)"
                                        class="hidden"
                                    />
                                    <div class="flex items-center gap-3 min-w-0">
                                        <span class="w-8 h-8 rounded-lg bg-[#E7F0F5] text-[#063B5C] flex items-center justify-center shrink-0">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </span>
                                        <div class="min-w-0">
                                            <div id="gt-pay-file-name" class="text-xs font-bold text-[#063B5C] truncate">Anexar comprovante (PDF, JPG ou PNG)</div>
                                            <div class="text-[10.5px] text-[#64748B]">Máx. 8 MB • Recibo oficial liberado após conferência</div>
                                        </div>
                                    </div>
                                    <span class="text-[11px] font-bold text-[#16749A] shrink-0">Selecionar</span>
                                </label>
                            </div>
                            <div class="flex items-center justify-between gap-3 pt-1">
                                <span class="text-[10.5px] text-[#64748B] hidden sm:inline">Dados protegidos • Padrão BCB</span>
                                <div class="flex items-center gap-2.5 ml-auto">
                                    <button
                                        type="button"
                                        onclick="window.GT_ClosePayModal && window.GT_ClosePayModal()"
                                        class="gt-btn-outline gt-btn-sm"
                                    >
                                        Fechar
                                    </button>
                                    <button type="submit" data-loading-text="Enviando..." class="gt-btn-primary gt-btn-sm">
                                        Enviar Comprovante
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
                window.__GT_PAY_POLL = null;

                window.GT_StopPayPoll = function () {
                    if (window.__GT_PAY_POLL) {
                        clearInterval(window.__GT_PAY_POLL);
                        window.__GT_PAY_POLL = null;
                    }
                };

                window.GT_ClosePayModal = function () {
                    window.GT_StopPayPoll();
                    var modal = document.getElementById('modal-pagar-fatura');
                    if (modal) modal.style.display = 'none';
                };

                window.GT_ShowPayConfirmed = function (receiptUrl) {
                    window.GT_StopPayPoll();
                    var bodyEl = document.getElementById('gt-pay-checkout-body');
                    var okEl = document.getElementById('gt-pay-confirmed-view');
                    var recLink = document.getElementById('gt-pay-receipt-link');
                    var amountSrc = document.getElementById('gt-pay-amount');
                    var txidSrc = document.getElementById('gt-pay-txid');
                    var okAmount = document.getElementById('gt-pay-ok-amount');
                    var okTxid = document.getElementById('gt-pay-ok-txid');
                    var okDate = document.getElementById('gt-pay-ok-date');
                    if (okAmount && amountSrc) okAmount.textContent = amountSrc.textContent || '—';
                    if (okTxid && txidSrc) okTxid.textContent = txidSrc.textContent || '—';
                    if (okDate) {
                        var now = new Date();
                        okDate.textContent = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    }
                    if (bodyEl) bodyEl.classList.add('hidden');
                    if (okEl) okEl.classList.remove('hidden');
                    if (recLink && receiptUrl) recLink.setAttribute('href', receiptUrl);
                };

                window.GT_StartPayPoll = function (txId) {
                    window.GT_StopPayPoll();
                    if (!txId) return;
                    var poll = function () {
                        fetch('/portal/financeiro/' + encodeURIComponent(txId) + '/status', {
                            headers: { 'Accept': 'application/json' },
                            credentials: 'same-origin'
                        })
                            .then(function (r) { return r.ok ? r.json() : null; })
                            .then(function (data) {
                                if (data && data.status === 'paid') {
                                    window.GT_ShowPayConfirmed(data.receipt_url || ('/portal/financeiro/' + encodeURIComponent(txId) + '/recibo'));
                                }
                            })
                            .catch(function () {});
                    };
                    window.__GT_PAY_POLL = setInterval(poll, 3500);
                };

                window.GT_FormatBrDate = function (val) {
                    if (!val) return '—';
                    var m = String(val).match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
                    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(val);
                };

                window.GT_UpdateReceiptLabel = function (inp) {
                    var labelEl = document.getElementById('gt-pay-file-name');
                    var zoneEl = document.getElementById('gt-pay-dropzone');
                    var f = inp && inp.files && inp.files[0];
                    if (f) {
                        if (labelEl) labelEl.textContent = f.name;
                        if (zoneEl) zoneEl.classList.add('has-file');
                    } else {
                        if (labelEl) labelEl.textContent = 'Anexar comprovante (PDF, JPG ou PNG)';
                        if (zoneEl) zoneEl.classList.remove('has-file');
                    }
                };

                window.GT_SwitchPayTab = function (tab) {
                    var pixPane = document.getElementById('gt-pay-pane-pix');
                    var tedPane = document.getElementById('gt-pay-pane-ted');
                    var pixTab = document.getElementById('gt-pay-tab-pix');
                    var tedTab = document.getElementById('gt-pay-tab-ted');
                    var methodInp = document.getElementById('gt-pay-method-input');
                    var isPix = tab !== 'ted';
                    if (pixPane) pixPane.classList.toggle('hidden', !isPix);
                    if (tedPane) tedPane.classList.toggle('hidden', isPix);
                    if (pixTab) pixTab.classList.toggle('is-active', isPix);
                    if (tedTab) tedTab.classList.toggle('is-active', !isPix);
                    if (methodInp) methodInp.value = isPix ? 'PIX' : 'Transferência / TED';
                };

                window.GT_CopyText = function (inputId, btnId, defaultLabel) {
                    var inp = document.getElementById(inputId);
                    var btn = document.getElementById(btnId);
                    if (!inp || !inp.value) return;
                    navigator.clipboard.writeText(inp.value).then(function () {
                        if (btn) {
                            btn.textContent = 'Copiado ✓';
                            setTimeout(function () { btn.textContent = defaultLabel; }, 2200);
                        }
                    });
                };

                window.GT_OpenPayModal = function (btn) {
                    var modal = document.getElementById('modal-pagar-fatura');
                    var form = document.getElementById('gt-pay-receipt-form');
                    if (!modal || !form || !btn) return;
                    var id = btn.getAttribute('data-id') || '';
                    var desc = btn.getAttribute('data-desc') || 'Pagar Fatura';
                    var amount = btn.getAttribute('data-amount') || '';
                    var due = btn.getAttribute('data-due') || '—';
                    var txid = btn.getAttribute('data-txid') || '—';
                    var pix = btn.getAttribute('data-pix') || '';
                    var qrUri = btn.getAttribute('data-qr') || '';

                    var bodyEl = document.getElementById('gt-pay-checkout-body');
                    var okEl = document.getElementById('gt-pay-confirmed-view');
                    if (bodyEl) bodyEl.classList.remove('hidden');
                    if (okEl) okEl.classList.add('hidden');

                    form.setAttribute('action', '/portal/financeiro/' + encodeURIComponent(id) + '/comprovante');
                    var fileInp = document.getElementById('gt-pay-file-input');
                    if (fileInp) { fileInp.value = ''; window.GT_UpdateReceiptLabel(fileInp); }

                    var titleEl = document.getElementById('gt-pay-title');
                    var amountEl = document.getElementById('gt-pay-amount');
                    var dueEl = document.getElementById('gt-pay-due');
                    var txidEl = document.getElementById('gt-pay-txid');
                    var pixEl = document.getElementById('gt-pay-pix-code');
                    var qrEl = document.getElementById('gt-pay-qr');

                    if (titleEl) titleEl.textContent = desc;
                    if (amountEl) amountEl.textContent = amount;
                    if (dueEl) dueEl.textContent = window.GT_FormatBrDate(due);
                    if (txidEl) txidEl.textContent = txid;
                    if (pixEl) pixEl.value = pix;
                    if (qrEl && qrUri) qrEl.src = qrUri;

                    window.GT_SwitchPayTab('pix');
                    modal.style.display = 'flex';
                    window.GT_StartPayPoll(id);

                    // Se o gateway PIX dinâmico (Mercado Pago / Asaas) estiver ativo, gera/atualiza cobrança dinâmica automaticamente
                    var provider = modal.getAttribute('data-pix-provider') || 'static';
                    if (provider !== 'static' && id) {
                        fetch('/portal/financeiro/' + encodeURIComponent(id) + '/gerar-pix', {
                            method: 'POST',
                            headers: { 'Accept': 'application/json' },
                            credentials: 'same-origin'
                        })
                            .then(function (r) { return r.ok ? r.json() : null; })
                            .then(function (data) {
                                if (!data) return;
                                if (data.status === 'paid') {
                                    window.GT_ShowPayConfirmed(data.receipt_url);
                                    return;
                                }
                                if (data.mode === 'dynamic' && data.pixPayload && data.qrDataUri) {
                                    if (pixEl) pixEl.value = data.pixPayload;
                                    if (qrEl) qrEl.src = data.qrDataUri;
                                }
                            })
                            .catch(function () {});
                    }
                };
            ` }} />
        </PortalLayout>
    );
};
