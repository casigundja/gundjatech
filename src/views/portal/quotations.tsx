import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalQuotationsProps {
    currentUser: any;
    clientName?: string;
    quotations: any[];
    quotationDetail?: any;
    items?: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalQuotationsView: FC<PortalQuotationsProps> = ({
    currentUser,
    clientName,
    quotations,
    quotationDetail,
    items = [],
    successMessage,
    errorMessage
}) => {
    if (quotationDetail) {
        const canAct = quotationDetail.status === 'sent';

        return (
            <PortalLayout
                title={`Orçamento ${quotationDetail.reference_code} • Portal do Cliente`}
                activeNav="quotations"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/portal/orcamentos" class="gt-back-link">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                        <span>Voltar para Orçamentos</span>
                    </a>
                </div>

                <div class="gtb-card !p-6">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div class="flex items-start justify-between gap-4 flex-wrap pb-5 mb-5 border-b border-white/10">
                        <div class="min-w-0">
                            <span class={`gt-badge ${quotationDetail.status === 'approved' ? 'gt-badge-success' : quotationDetail.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'} mb-2`}>
                                {quotationDetail.status === 'approved' ? 'Aprovado' : quotationDetail.status === 'rejected' ? 'Recusado' : 'Aguardando Aprovação'}
                            </span>
                            <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">{quotationDetail.title}</h1>
                            <div class="text-xs text-[#8C95AA] mt-1">
                                Código: <strong class="text-white font-mono">{quotationDetail.reference_code}</strong> • Validade: {quotationDetail.expires_at || '15 dias'}
                            </div>
                        </div>

                        {canAct && (
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <form action={`/portal/orcamentos/${quotationDetail.id}/recusar`} method="post" class="m-0">
                                    <button type="submit" class="gt-btn-danger-ghost gt-btn-sm">
                                        <span>Recusar Proposta</span>
                                    </button>
                                </form>
                                <form action={`/portal/orcamentos/${quotationDetail.id}/aprovar`} method="post" class="m-0">
                                    <button type="submit" class="gt-btn-primary gt-btn-sm">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                        <span>Aprovar Orçamento</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    {quotationDetail.notes && (
                        <div class="mb-6">
                            <h2 class="text-xs font-extrabold uppercase tracking-wider text-[#8C95AA] mb-2">Escopo Técnico, Entregáveis &amp; Condições Comerciais</h2>
                            <div class="gt-req-briefing text-xs text-white leading-relaxed whitespace-pre-wrap">
                                {quotationDetail.notes}
                            </div>
                        </div>
                    )}

                    <h2 class="text-sm font-extrabold text-white mb-3">Itens &amp; Serviços Contemplados</h2>
                    <div class="gt-table-wrap mb-6">
                        <table>
                            <thead>
                                <tr class="border-b border-white/10 text-left text-[11px] uppercase text-[#8C95AA]">
                                    <th class="py-3 px-4">Descrição do Serviço</th>
                                    <th class="py-3 px-4 text-center">Qtd</th>
                                    <th class="py-3 px-4 text-right">Valor Unitário</th>
                                    <th class="py-3 px-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} class="py-4 px-4 text-center text-xs text-[#8C95AA]">Pacote fechado de engenharia web.</td>
                                    </tr>
                                ) : (
                                    items.map((it: any) => (
                                        <tr class="border-b border-white/5">
                                            <td class="py-3.5 px-4 text-xs font-bold text-white">{it.description}</td>
                                            <td class="py-3.5 px-4 text-xs text-center text-[#8C95AA]">{it.quantity || 1}</td>
                                            <td class="py-3.5 px-4 text-xs text-right text-[#8C95AA]">R$ {Number(it.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td class="py-3.5 px-4 text-xs text-right font-extrabold text-white">R$ {Number(it.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div class="flex justify-end">
                        <div class="w-full sm:w-80 p-4 rounded-xl bg-[#032033]/50 border border-white/10 space-y-2">
                            <div class="flex justify-between text-xs text-[#8C95AA]">
                                <span>Subtotal</span>
                                <span>R$ {Number(quotationDetail.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {Number(quotationDetail.discount_amount || 0) > 0 && (
                                <div class="flex justify-between text-xs text-emerald-400">
                                    <span>Desconto comercial</span>
                                    <span>- R$ {Number(quotationDetail.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div class="flex justify-between text-sm font-extrabold text-white pt-2.5 border-t border-white/10">
                                <span>Investimento Final</span>
                                <span class="text-[#F2C230]">R$ {Number(quotationDetail.final_amount || quotationDetail.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    const pendingCount = quotations.filter((q: any) => q.status === 'sent').length;
    const approvedCount = quotations.filter((q: any) => q.status === 'approved').length;

    return (
        <PortalLayout
            title="Orçamento • Portal do Cliente GundjaTech"
            activeNav="quotations"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Orçamentos Recebidos</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Analise os escopos técnicos e aprove suas propostas com segurança e garantia em contrato.</p>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-blue"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Total de Propostas</div>
                        <div class="text-xl font-extrabold text-white mt-0.5">{quotations.length}</div>
                    </div>
                    <span class="w-9 h-9 rounded-xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                    </span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Aguardando Aprovação</div>
                        <div class="text-xl font-extrabold text-[#F2C230] mt-0.5">{pendingCount}</div>
                    </div>
                    <span class="w-9 h-9 rounded-xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div class="gtb-card-accent-top gtb-card-accent-emerald"></div>
                    <div>
                        <div class="text-[10.5px] font-bold uppercase tracking-wider text-[#8C95AA]">Propostas Aprovadas</div>
                        <div class="text-xl font-extrabold text-emerald-400 mt-0.5">{approvedCount}</div>
                    </div>
                    <span class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    </span>
                </div>
            </div>

            {quotations.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Nenhum orçamento disponível no momento.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1 mb-5 max-w-md mx-auto">Assim que nossa equipe enviar uma proposta comercial para o seu projeto, ela aparecerá aqui pronta para aprovação digital.</p>
                    <div class="flex items-center justify-center gap-2.5 flex-wrap">
                        <a href="/portal/solicitacoes/nova" class="gt-btn-primary gt-btn-sm">+ Solicitar Novo Orçamento</a>
                        <a href="/portal/atendimento" class="gt-btn-outline gt-btn-sm">Falar com Consultor</a>
                    </div>
                </div>
            ) : (
                <div class="gtb-card !p-0 overflow-hidden">
                    <div class="gt-table-wrap">
                        <table>
                            <thead>
                                <tr class="border-b border-white/10 text-left text-[11px] uppercase text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Referência</th>
                                    <th class="py-3.5 px-5">Título / Escopo</th>
                                    <th class="py-3.5 px-5">Valor</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.map((q: any) => (
                                    <tr class="border-b border-white/5">
                                        <td class="py-3.5 px-5 text-xs font-extrabold font-mono text-white">{q.reference_code}</td>
                                        <td class="py-3.5 px-5 text-xs font-bold text-white">{q.title}</td>
                                        <td class="py-3.5 px-5 text-xs font-extrabold text-[#F2C230]">
                                            R$ {Number(q.final_amount || q.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td class="py-3.5 px-5">
                                            <span class={`gt-badge ${q.status === 'approved' ? 'gt-badge-success' : q.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                                {q.status === 'approved' ? 'Aprovado' : q.status === 'rejected' ? 'Recusado' : 'Aguardando'}
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-5 text-right">
                                            <a href={`/portal/orcamentos/${q.id}`} class="gt-btn-outline gt-btn-xs">
                                                <span>Ver Proposta</span>
                                                <span>&rarr;</span>
                                            </a>
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
