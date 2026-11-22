import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalCampaignsProps {
    currentUser: any;
    clientName?: string;
    campaigns: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalCampaignsView: FC<PortalCampaignsProps> = ({
    currentUser,
    clientName,
    campaigns,
    successMessage,
    errorMessage
}) => {
    return (
        <PortalLayout
            title="Tráfego & Anúncios • Portal do Cliente GundjaTech"
            activeNav="campaigns"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Gestão de Campanhas de Tráfego Pago</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Acompanhe investimento, conversões e ROI de campanhas no Meta Ads e Google Ads.</p>
                </div>
            </div>

            {campaigns.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#F2C230]/15 border border-[#F2C230]/30 flex items-center justify-center text-[#F2C230] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Nenhuma campanha de mídia ativa no momento.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1">Deseja atrair mais clientes qualificados para o seu site? Converse com nosso time de Growth.</p>
                </div>
            ) : (
                <div class="gt-cards-grid">
                    {campaigns.map((c: any) => (
                        <div class="gtb-card !p-5">
                            <div class="gtb-card-accent-top gtb-card-accent-gold"></div>
                            <div class="flex items-center justify-between gap-2 mb-3">
                                <span class="gt-badge gt-badge-info">{c.platform}</span>
                                <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                    {c.status === 'active' ? 'Ativa' : c.status}
                                </span>
                            </div>

                            <h3 class="text-base font-extrabold text-white mb-1">{c.name}</h3>
                            <div class="text-xs text-[#8C95AA] mb-4">Objetivo: {c.objective || 'Captação de Leads Qualificados'}</div>

                            <div class="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#032033]/40 border border-white/10">
                                <div>
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-[#8C95AA]">Orçamento</div>
                                    <div class="text-sm font-extrabold text-white mt-0.5">
                                        R$ {Number(c.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div>
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-[#8C95AA]">Investido</div>
                                    <div class="text-sm font-extrabold text-[#F2C230] mt-0.5">
                                        R$ {Number(c.spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
};
