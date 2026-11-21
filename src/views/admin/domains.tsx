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

    return (
        <AdminLayout
            title="Domínios & DNS • Painel Administrativo"
            activeNav="domains"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF;">Gestão de Domínios & Zonas DNS</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">
                        Monitoramento de vencimentos, certificados SSL e registros DNS dos clientes.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('modal-novo-dominio').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Registrar / Cadastrar Domínio</span>
                </button>
            </div>

            {/* Filtros */}
            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 24px;">
                <form method="get" action="/admin/dominios" style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 240px;">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por domínio ou cliente..."
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        />
                    </div>
                    <div style="width: 200px;">
                        <select
                            name="status"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Todos os Status</option>
                            <option value="active" selected={statusFilter === 'active'}>Ativo</option>
                            <option value="pending_dns" selected={statusFilter === 'pending_dns'}>Aguardando DNS</option>
                            <option value="expired" selected={statusFilter === 'expired'}>Expirado</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline" style="font-size: 13px;">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/dominios" style="font-size: 12px; color: #F2C230; text-decoration: underline;">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Domínios */}
            <div class="gt-card" style="overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--gt-border); background: rgba(3, 32, 51, 0.6); color: #8CAAB9; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                            <th style="padding: 16px 20px;">Domínio</th>
                            <th style="padding: 16px 20px;">Cliente</th>
                            <th style="padding: 16px 20px;">Registrador / DNS</th>
                            <th style="padding: 16px 20px;">Expiração</th>
                            <th style="padding: 16px 20px;">Renovação Auto</th>
                            <th style="padding: 16px 20px;">Status</th>
                            <th style="padding: 16px 20px; text-align: right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {domains.length === 0 ? (
                            <tr>
                                <td colspan={7} style="padding: 40px; text-align: center; color: #8CAAB9;">
                                    Nenhum domínio gerenciado no momento.
                                </td>
                            </tr>
                        ) : (
                            domains.map((d) => {
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
                                    <tr style="border-bottom: 1px solid rgba(22, 116, 154, 0.15);">
                                        <td style="padding: 16px 20px;">
                                            <div style="font-weight: 800; color: #FFFFFF; font-size: 14px;">
                                                🌐 {d.domain_name}
                                            </div>
                                            {isExpiringSoon && (
                                                <div style="font-size: 11px; color: #F2C230; font-weight: 700; margin-top: 2px;">
                                                    ⚠️ Expira em {daysLeft} dias
                                                </div>
                                            )}
                                        </td>
                                        <td style="padding: 16px 20px;">
                                            <div style="color: #FFFFFF;">{d.company || d.client_name || '—'}</div>
                                            <div style="font-size: 11px; color: #8CAAB9;">{d.client_email || ''}</div>
                                        </td>
                                        <td style="padding: 16px 20px;">
                                            <div style="color: #FFFFFF;">{d.registrar || 'Cloudflare / Registro.br'}</div>
                                            <div style="font-size: 11px; color: #8CAAB9;">DNS: {d.dns_provider || 'Cloudflare Edge'}</div>
                                        </td>
                                        <td style="padding: 16px 20px; color: #8CAAB9;">
                                            {expDate ? expDate.toLocaleDateString('pt-BR') : '—'}
                                        </td>
                                        <td style="padding: 16px 20px;">
                                            {d.auto_renew ? (
                                                <span style="color: #34D399; font-size: 12px; font-weight: 700;">Sim (Ativa)</span>
                                            ) : (
                                                <span style="color: #8CAAB9; font-size: 12px;">Manual</span>
                                            )}
                                        </td>
                                        <td style="padding: 16px 20px;">
                                            <span class={`gt-badge ${statusMeta.badgeClass}`}>
                                                {statusMeta.label}
                                            </span>
                                        </td>
                                        <td style="padding: 16px 20px; text-align: right;">
                                            <form action={`/admin/dominios/${d.id}/excluir`} method="post" style="margin: 0; display: inline-block;">
                                                <button
                                                    type="submit"
                                                    class="gt-btn-outline"
                                                    style="font-size: 11px; padding: 4px 8px; color: #F87171;"
                                                    title="Remover monitoramento do domínio"
                                                >
                                                    Excluir
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Novo Domínio */}
            <div
                id="modal-novo-dominio"
                style="display: none; position: fixed; inset: 0; background: rgba(3, 32, 51, 0.85); backdrop-filter: blur(4px); z-index: 100; align-items: center; justify-content: center; padding: 20px;"
            >
                <div class="gt-card" style="width: 100%; max-width: 520px; padding: 32px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Cadastrar Domínio para Monitoramento</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-dominio').style.display='none'"
                            style="background: none; border: none; font-size: 20px; color: #8CAAB9; cursor: pointer;"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/dominios" method="post">
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Cliente Titular *</label>
                                <select
                                    name="client_id"
                                    required
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                >
                                    <option value="">Selecione o cliente...</option>
                                    {clients.map((c) => (
                                        <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Nome do Domínio (FQDN) *</label>
                                <input
                                    type="text"
                                    name="domain_name"
                                    required
                                    placeholder="exemplo.com.br"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Registrador</label>
                                    <input
                                        type="text"
                                        name="registrar"
                                        placeholder="Registro.br / Cloudflare"
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Data de Expiração</label>
                                    <input
                                        type="date"
                                        name="expires_at"
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                </div>
                            </div>

                            <div>
                                <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #FFFFFF; cursor: pointer; margin-top: 6px;">
                                    <input type="checkbox" name="auto_renew" value="1" defaultChecked />
                                    <span>Habilitar renovação automática pela GundjaTech</span>
                                </label>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--gt-border); padding-top: 20px;">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-dominio').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" class="gt-btn-primary">
                                Salvar Domínio
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
