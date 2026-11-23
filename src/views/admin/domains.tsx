import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminDomainsProps {
    currentUser: any;
    domains: any[];
    clients?: any[];
    search?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
    active: { label: 'Ativo & Configurado', badgeClass: 'gt-badge-success' },
    pending_dns: { label: 'Aguardando DNS', badgeClass: 'gt-badge-warning' },
    expiring: { label: 'Expirando', badgeClass: 'gt-badge-danger' },
    expired: { label: 'Expirado', badgeClass: 'gt-badge-danger' }
};

export const AdminDomainsView: FC<AdminDomainsProps> = ({
    currentUser,
    domains = [],
    clients = [],
    search = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    const now = new Date();
    const activeCount = domains.filter((d) => d.status === 'active').length;
    const autoRenewCount = domains.filter((d) => d.auto_renew).length;
    const expiringCount = domains.filter((d) => {
        if (!d.expires_at) return false;
        const days = Math.ceil((new Date(d.expires_at).getTime() - now.getTime()) / (1000 * 3600 * 24));
        return days <= 30;
    }).length;

    return (
        <AdminLayout
            title="Domínios & DNS • Painel Administrativo"
            activeNav="domains"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">
                        Gestão de Domínios &amp; Zonas DNS
                    </h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Monitoramento de vencimentos, certificados SSL e registros DNS dos clientes.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-novo-dominio').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Registrar / Cadastrar Domínio</span>
                </button>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Domínios Monitorados</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{domains.length}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#D5DCEB]">Zonas DNS</span>
                </div>
                <div class="gtb-card gtb-kpi-petrol !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Ativos &amp; SSL</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block">{activeCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Ativo</span>
                </div>
                <div class="gtb-card gtb-kpi-blue !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Renovação Automática</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{autoRenewCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Auto</span>
                </div>
                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Expirando (30 dias)</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block">{expiringCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Alerta</span>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/dominios" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por domínio ou cliente..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Status</option>
                            <option value="active" selected={statusFilter === 'active'}>Ativo</option>
                            <option value="pending_dns" selected={statusFilter === 'pending_dns'}>Aguardando DNS</option>
                            <option value="expired" selected={statusFilter === 'expired'}>Expirado</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/dominios" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Domínios */}
            <div class="gtb-card !p-0 overflow-hidden">
                {domains.length === 0 ? (
                    <div class="gt-empty-state">Nenhum domínio gerenciado no momento.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Domínio</th>
                                    <th class="py-3.5 px-5">Cliente</th>
                                    <th class="py-3.5 px-5">Registrador / DNS</th>
                                    <th class="py-3.5 px-5">Expiração</th>
                                    <th class="py-3.5 px-5">Renovação Auto</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {domains.map((d) => {
                                    const expDate = d.expires_at ? new Date(d.expires_at) : null;
                                    const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;
                                    const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
                                    const isExpired = daysLeft !== null && daysLeft <= 0;

                                    const statusMeta = isExpired
                                        ? STATUS_LABELS.expired
                                        : isExpiringSoon
                                        ? STATUS_LABELS.expiring
                                        : STATUS_LABELS[d.status] || STATUS_LABELS.active;

                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <div class="flex items-center gap-2 font-mono font-extrabold text-white text-[13px]">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16749A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                                                        <path d="M2 12h20" />
                                                    </svg>
                                                    <span>{d.domain_name}</span>
                                                </div>
                                                {isExpiringSoon && (
                                                    <div class="text-[11px] font-bold text-[#F2C230] mt-0.5">
                                                        Expira em {daysLeft} dias
                                                    </div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <div class="font-semibold text-white">{d.company || d.client_name || '—'}</div>
                                                {d.client_email && !String(d.client_email).endsWith('.local') && (
                                                    <div class="text-[11px] text-[#8C95AA]">{d.client_email}</div>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5">
                                                <div class="font-semibold text-white">{d.registrar || 'Cloudflare / Registro.br'}</div>
                                                <div class="text-[11px] text-[#8C95AA]">DNS: {d.dns_provider || 'Cloudflare Edge'}</div>
                                            </td>
                                            <td class="py-3.5 px-5 text-[#8C95AA] whitespace-nowrap">
                                                {expDate ? expDate.toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                {d.auto_renew ? (
                                                    <span class="font-bold text-[#34D399]">Sim (Ativa)</span>
                                                ) : (
                                                    <span class="text-[#8C95AA]">Manual</span>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        data-id={String(d.id)}
                                                        data-client-id={String(d.client_id || '')}
                                                        data-domain-name={String(d.domain_name || '')}
                                                        data-registrar={String(d.registrar || '')}
                                                        data-dns-provider={String(d.dns_provider || 'Cloudflare Edge')}
                                                        data-expires-at={d.expires_at ? String(d.expires_at).slice(0, 10) : ''}
                                                        data-auto-renew={d.auto_renew ? '1' : '0'}
                                                        data-status={String(d.status || 'active')}
                                                        onclick="window.GT_OpenEditDomainModal && window.GT_OpenEditDomainModal(this)"
                                                        class="gt-btn-outline gt-btn-xs"
                                                        title="Editar domínio"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M12 20h9" />
                                                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                                        </svg>
                                                        <span>Editar</span>
                                                    </button>
                                                    <form
                                                        action={`/admin/dominios/${d.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente remover este domínio do monitoramento?"
                                                    >
                                                        <button
                                                            type="submit"
                                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                                            title="Excluir domínio"
                                                            aria-label="Excluir domínio"
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M3 6h18" />
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                            </svg>
                                                        </button>
                                                    </form>
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

            {/* Modal Novo Domínio */}
            <div
                id="modal-novo-dominio"
                onclick="if(event.target===this)this.style.display='none'"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Cadastrar Domínio para Monitoramento</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-dominio').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/dominios" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente Titular *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((c) => (
                                    <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Domínio (FQDN) *</label>
                            <input
                                type="text"
                                name="domain_name"
                                required
                                placeholder="exemplo.com.br"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Registrador</label>
                                <input type="text" name="registrar" placeholder="Registro.br / Cloudflare" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Expiração</label>
                                <input type="date" name="expires_at" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Renovação Automática GundjaTech</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Renova preventivamente antes do vencimento</div>
                                </div>
                                <input type="checkbox" name="auto_renew" value="1" checked class="gt-switch" />
                            </label>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-dominio').style.display='none'"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                Salvar Domínio
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Editar Domínio */}
            <div
                id="modal-editar-dominio"
                onclick="if(event.target===this)this.style.display='none'"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Editar Domínio &amp; DNS</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-dominio').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form id="gt-edit-domain-form" action="/admin/dominios/0/editar" method="post" class="space-y-3.5">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente Titular *</label>
                            <select id="gt-edit-domain-client" name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((c) => (
                                    <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Domínio (FQDN) *</label>
                            <input
                                id="gt-edit-domain-name"
                                type="text"
                                name="domain_name"
                                required
                                placeholder="exemplo.com.br"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Registrador</label>
                                <input id="gt-edit-domain-registrar" type="text" name="registrar" placeholder="Registro.br / Cloudflare" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Provedor DNS</label>
                                <input id="gt-edit-domain-dns" type="text" name="dns_provider" placeholder="Cloudflare Edge" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Data de Expiração</label>
                                <input id="gt-edit-domain-expires" type="date" name="expires_at" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                                <select id="gt-edit-domain-status" name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="active">Ativo &amp; Configurado</option>
                                    <option value="pending_dns">Aguardando DNS</option>
                                    <option value="expiring">Expirando</option>
                                    <option value="expired">Expirado</option>
                                </select>
                            </div>
                        </div>

                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Renovação Automática GundjaTech</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Renova preventivamente antes do vencimento</div>
                                </div>
                                <input id="gt-edit-domain-autorenew" type="checkbox" name="auto_renew" value="1" class="gt-switch" />
                            </label>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-editar-dominio').style.display='none'"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: `
                window.GT_OpenEditDomainModal = function (btn) {
                    var modal = document.getElementById('modal-editar-dominio');
                    var form = document.getElementById('gt-edit-domain-form');
                    if (!modal || !form || !btn) return;
                    var id = btn.getAttribute('data-id') || '';
                    form.setAttribute('action', '/admin/dominios/' + encodeURIComponent(id) + '/editar');
                    var clientEl = document.getElementById('gt-edit-domain-client');
                    var nameEl = document.getElementById('gt-edit-domain-name');
                    var regEl = document.getElementById('gt-edit-domain-registrar');
                    var dnsEl = document.getElementById('gt-edit-domain-dns');
                    var expEl = document.getElementById('gt-edit-domain-expires');
                    var statusEl = document.getElementById('gt-edit-domain-status');
                    var autoEl = document.getElementById('gt-edit-domain-autorenew');
                    if (clientEl) clientEl.value = btn.getAttribute('data-client-id') || '';
                    if (nameEl) nameEl.value = btn.getAttribute('data-domain-name') || '';
                    if (regEl) regEl.value = btn.getAttribute('data-registrar') || '';
                    if (dnsEl) dnsEl.value = btn.getAttribute('data-dns-provider') || 'Cloudflare Edge';
                    if (expEl) expEl.value = btn.getAttribute('data-expires-at') || '';
                    if (statusEl) statusEl.value = btn.getAttribute('data-status') || 'active';
                    if (autoEl) autoEl.checked = btn.getAttribute('data-auto-renew') === '1';
                    modal.style.display = 'flex';
                    if (nameEl) setTimeout(function () { nameEl.focus(); }, 40);
                };
            ` }} />
        </AdminLayout>
    );
};
