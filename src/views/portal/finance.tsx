import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';
import { BankPaymentSettings, DEFAULT_BANK_PAYMENT_SETTINGS } from '../../lib/pix';

interface PortalFinanceProps {
    currentUser: any;
    clientName?: string;
    transactions: any[];
    bankSettings?: BankPaymentSettings;
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalFinanceView: FC<PortalFinanceProps> = ({
    currentUser,
    clientName,
    transactions,
    bankSettings = DEFAULT_BANK_PAYMENT_SETTINGS,
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

            {/* Modal de Pagamento PIX + TED Nu Empresas + Upload de Comprovante */}
            <div
                id="modal-pagar-fatura"
                onclick="if(event.target===this)this.style.display='none'"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-5 sm:p-6">
                    <div class="flex items-start justify-between gap-3 pb-3.5 border-b border-white/10">
                        <div class="min-w-0">
                            <span class="text-[10px] font-extrabold uppercase tracking-wider text-[#F2C230]">Pagamento Seguro GundjaTech</span>
                            <h2 id="gt-pay-title" class="gt-font-display text-base font-extrabold text-white mt-0.5 truncate">Pagar Fatura</h2>
                            <div class="flex items-center gap-3 mt-1 text-xs text-[#8C95AA]">
                                <span>Valor: <strong id="gt-pay-amount" class="text-[#F2C230] font-extrabold">R$ 0,00</strong></span>
                                <span>•</span>
                                <span>Vencimento: <strong id="gt-pay-due" class="text-white">—</strong></span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-pagar-fatura').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                            aria-label="Fechar"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Abas PIX / Transferência TED */}
                    <div class="grid grid-cols-2 gap-2 mt-4">
                        <button
                            type="button"
                            id="gt-pay-tab-pix"
                            onclick="window.GT_SwitchPayTab('pix')"
                            class="gt-btn-primary gt-btn-sm justify-center"
                        >
                            PIX Instantâneo (QR Code)
                        </button>
                        <button
                            type="button"
                            id="gt-pay-tab-ted"
                            onclick="window.GT_SwitchPayTab('ted')"
                            class="gt-btn-outline gt-btn-sm justify-center"
                        >
                            Transferência / TED (Nu Empresas)
                        </button>
                    </div>

                    {/* Conteúdo Aba PIX */}
                    <div id="gt-pay-pane-pix" class="mt-4 space-y-3.5">
                        <div class="gtb-surface-box rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
                            <div class="bg-white p-2 rounded-xl shrink-0 shadow-md">
                                <img id="gt-pay-qr" src="" alt="QR Code PIX GundjaTech" width="168" height="168" class="block w-[168px] h-[168px] object-contain" />
                            </div>
                            <div class="min-w-0 flex-1 space-y-2 text-xs">
                                <div class="font-extrabold text-white">Escaneie no app do seu banco</div>
                                <p class="text-[11.5px] text-[#8C95AA] leading-relaxed">
                                    O QR Code já contém o valor exato da fatura e a chave CNPJ oficial da <strong class="text-white">{bankSettings.pixHolder}</strong>.
                                </p>
                                <div class="text-[11px] text-[#8C95AA] space-y-0.5 pt-1">
                                    <div>Chave PIX (CNPJ): <strong class="font-mono text-white">{bankSettings.pixKey}</strong></div>
                                    <div>Identificador: <strong id="gt-pay-txid" class="font-mono text-[#F2C230]">—</strong></div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">PIX Copia e Cola (Padrão Banco Central)</label>
                            <div class="flex items-center gap-2">
                                <input id="gt-pay-pix-code" type="text" readonly value="" class="w-full rounded-xl px-3 py-2 text-[11.5px] font-mono" />
                                <button
                                    type="button"
                                    id="gt-pay-copy-pix"
                                    onclick="window.GT_CopyText('gt-pay-pix-code', 'gt-pay-copy-pix', 'Copiar PIX')"
                                    class="gt-btn-primary gt-btn-sm shrink-0"
                                >
                                    Copiar PIX
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Conteúdo Aba TED */}
                    <div id="gt-pay-pane-ted" class="mt-4 hidden">
                        <div class="gtb-surface-box rounded-xl p-4 space-y-2.5 text-xs">
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                                <span class="text-[#8C95AA]">Banco</span>
                                <strong class="text-white text-right">{bankSettings.bankName}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                                <span class="text-[#8C95AA]">Agência</span>
                                <strong class="font-mono text-white">{bankSettings.bankAgency}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                                <span class="text-[#8C95AA]">Conta Corrente</span>
                                <strong class="font-mono text-white">{bankSettings.bankAccount}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                                <span class="text-[#8C95AA]">CNPJ</span>
                                <strong class="font-mono text-[#F2C230]">{bankSettings.bankCnpj}</strong>
                            </div>
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[#8C95AA]">Favorecido</span>
                                <strong class="text-white">{bankSettings.pixHolder}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Upload de Comprovante */}
                    <form id="gt-pay-receipt-form" action="/portal/financeiro/0/comprovante" method="post" enctype="multipart/form-data" class="mt-4 pt-4 border-t border-white/10 space-y-3">
                        <input type="hidden" id="gt-pay-method-input" name="payment_method" value="PIX" />
                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                Já realizou o pagamento? Anexe o comprovante (PDF, JPG ou PNG)
                            </label>
                            <input
                                type="file"
                                name="receipt"
                                required
                                accept=".pdf,.png,.jpg,.jpeg,.webp"
                                class="w-full rounded-xl px-3 py-2 text-xs"
                            />
                        </div>
                        <div class="flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-pagar-fatura').style.display='none'"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Fechar
                            </button>
                            <button type="submit" data-loading-text="Enviando..." class="gt-btn-primary gt-btn-sm">
                                Enviar Comprovante
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                window.GT_SwitchPayTab = function (tab) {
                    var pixPane = document.getElementById('gt-pay-pane-pix');
                    var tedPane = document.getElementById('gt-pay-pane-ted');
                    var pixTab = document.getElementById('gt-pay-tab-pix');
                    var tedTab = document.getElementById('gt-pay-tab-ted');
                    var methodInp = document.getElementById('gt-pay-method-input');
                    var isPix = tab !== 'ted';
                    if (pixPane) pixPane.classList.toggle('hidden', !isPix);
                    if (tedPane) tedPane.classList.toggle('hidden', isPix);
                    if (pixTab) pixTab.className = (isPix ? 'gt-btn-primary' : 'gt-btn-outline') + ' gt-btn-sm justify-center';
                    if (tedTab) tedTab.className = (!isPix ? 'gt-btn-primary' : 'gt-btn-outline') + ' gt-btn-sm justify-center';
                    if (methodInp) methodInp.value = isPix ? 'PIX' : 'Transferência / TED';
                };

                window.GT_CopyText = function (inputId, btnId, defaultLabel) {
                    var inp = document.getElementById(inputId);
                    var btn = document.getElementById(btnId);
                    if (!inp || !inp.value) return;
                    navigator.clipboard.writeText(inp.value).then(function () {
                        if (btn) {
                            btn.textContent = 'Copiado!';
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

                    form.setAttribute('action', '/portal/financeiro/' + encodeURIComponent(id) + '/comprovante');
                    var titleEl = document.getElementById('gt-pay-title');
                    var amountEl = document.getElementById('gt-pay-amount');
                    var dueEl = document.getElementById('gt-pay-due');
                    var txidEl = document.getElementById('gt-pay-txid');
                    var pixEl = document.getElementById('gt-pay-pix-code');
                    var qrEl = document.getElementById('gt-pay-qr');

                    if (titleEl) titleEl.textContent = desc;
                    if (amountEl) amountEl.textContent = amount;
                    if (dueEl) dueEl.textContent = due;
                    if (txidEl) txidEl.textContent = txid;
                    if (pixEl) pixEl.value = pix;
                    if (qrEl && pix) {
                        qrEl.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=' + encodeURIComponent(pix);
                    }
                    window.GT_SwitchPayTab('pix');
                    modal.style.display = 'flex';
                };
            ` }} />
        </PortalLayout>
    );
};
