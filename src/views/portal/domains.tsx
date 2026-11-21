import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalDomainsProps {
    currentUser: any;
    clientName?: string;
    domains: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalDomainsView: FC<PortalDomainsProps> = ({
    currentUser,
    clientName,
    domains,
    successMessage,
    errorMessage
}) => {
    return (
        <PortalLayout
            title="Meus Domínios • Portal do Cliente GundjaTech"
            activeNav="domains"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Gestão de Domínios & DNS Blindado</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Monitore o vencimento dos seus domínios, certificados SSL corporativos e zonas DNS.</p>
            </div>

            {domains.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🌐</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Nenhum domínio registrado ou delegado.</h3>
                    <p style="font-size: 13px; color: #527287; margin-top: 8px;">Caso sua empresa tenha adquirido um domínio conosco, solicite a vinculação pelo suporte.</p>
                </div>
            ) : (
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                    {domains.map((d: any) => (
                        <div class="gt-card" style="padding: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <span class="gt-badge gt-badge-success">{d.status}</span>
                                <span style="font-size: 11px; color: #8CAAB9;">SSL Ativo</span>
                            </div>

                            <h3 style="font-size: 18px; font-weight: 800; color: #063B5C; margin-bottom: 4px;">{d.domain_name}</h3>
                            <div style="font-size: 12px; color: #527287; margin-bottom: 16px;">Registrar: {d.registrar || 'GundjaTech Cloud DNS'}</div>

                            <div style="padding: 12px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--gt-border); font-size: 12px; color: #063B5C; margin-bottom: 18px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                    <span style="color: #67879C;">Expiração:</span>
                                    <strong>{d.expires_at || 'Em monitoramento'}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <span style="color: #67879C;">Renovação automática:</span>
                                    <span>{d.auto_renew ? 'Ativada' : 'Manual'}</span>
                                </div>
                            </div>

                            <form action={`/portal/dominios/${d.id}/renovacao`} method="post">
                                <button type="submit" class="gt-btn-outline" style="width: 100%; justify-content: center; font-size: 12px;">
                                    Solicitar Renovação Anual &rarr;
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
};
