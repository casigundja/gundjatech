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
            <div class="gt-page-header">
                <div>
                    <h1 class="gt-font-display text-xl font-extrabold text-white">Gestão de Domínios &amp; DNS Blindado</h1>
                    <p class="text-xs text-[#8C95AA] mt-1">Monitore o vencimento dos seus domínios, certificados SSL corporativos e zonas DNS.</p>
                </div>
            </div>

            {domains.length === 0 ? (
                <div class="gtb-card !p-10 text-center">
                    <div class="w-12 h-12 rounded-2xl bg-[#16749A]/15 border border-[#16749A]/30 flex items-center justify-center text-[#16749A] mx-auto mb-3">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                    </div>
                    <h3 class="text-sm font-extrabold text-white">Nenhum domínio registrado ou delegado.</h3>
                    <p class="text-xs text-[#8C95AA] mt-1">Caso sua empresa tenha adquirido um domínio conosco, solicite a vinculação pelo suporte.</p>
                </div>
            ) : (
                <div class="gt-cards-grid">
                    {domains.map((d: any) => (
                        <div class="gtb-card !p-5 flex flex-col justify-between">
                            <div class="gtb-card-accent-top gtb-card-accent-emerald"></div>
                            <div>
                                <div class="flex items-center justify-between gap-2 mb-3">
                                    <span class="gt-badge gt-badge-success">{d.status === 'active' ? 'Ativo' : d.status}</span>
                                    <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                        <span>SSL Ativo</span>
                                    </span>
                                </div>

                                <h3 class="text-base font-extrabold text-white mb-1">{d.domain_name}</h3>
                                <div class="text-xs text-[#8C95AA] mb-4">Registrar: {d.registrar || 'GundjaTech Cloud DNS'}</div>

                                <div class="p-3.5 rounded-xl bg-[#032033]/40 border border-white/10 text-xs space-y-1.5 mb-4">
                                    <div class="flex items-center justify-between">
                                        <span class="text-[#8C95AA]">Expiração:</span>
                                        <strong class="text-white">{d.expires_at || 'Em monitoramento'}</strong>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-[#8C95AA]">Renovação automática:</span>
                                        <span class="font-bold text-white">{d.auto_renew ? 'Ativada' : 'Manual'}</span>
                                    </div>
                                </div>
                            </div>

                            <form action={`/portal/dominios/${d.id}/renovacao`} method="post" class="m-0">
                                <button type="submit" class="gt-btn-outline gt-btn-sm w-full justify-center">
                                    <span>Solicitar Renovação Anual</span>
                                    <span>&rarr;</span>
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
};
