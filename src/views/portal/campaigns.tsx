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
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Gestão de Campanhas de Tráfego Pago</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Acompanhe investimento, conversões e ROI de campanhas no Meta Ads e Google Ads.</p>
            </div>

            {campaigns.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">📈</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Nenhuma campanha de mídia ativa no momento.</h3>
                    <p style="font-size: 13px; color: #527287; margin-top: 8px;">Deseja atrair mais clientes qualificados para o seu site? Converse com nosso time de Growth.</p>
                </div>
            ) : (
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                    {campaigns.map((c: any) => (
                        <div class="gt-card" style="padding: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span class="gt-badge gt-badge-info">{c.platform}</span>
                                <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-warning'}`}>{c.status}</span>
                            </div>

                            <h3 style="font-size: 17px; font-weight: 800; color: #063B5C; margin-bottom: 6px;">{c.name}</h3>
                            <div style="font-size: 12px; color: #527287; margin-bottom: 16px;">Objetivo: {c.objective || 'Captação de Leads Qualificados'}</div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--gt-border); margin-bottom: 16px;">
                                <div>
                                    <div style="font-size: 10px; color: #67879C; text-transform: uppercase; font-weight: 700;">Orçamento</div>
                                    <div style="font-size: 14px; font-weight: 800; color: #063B5C;">R$ {Number(c.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                    <div style="font-size: 10px; color: #67879C; text-transform: uppercase; font-weight: 700;">Investido</div>
                                    <div style="font-size: 14px; font-weight: 800; color: #16749A;">R$ {Number(c.spent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
};
