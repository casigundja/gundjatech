import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminCampaignsProps {
    currentUser: any;
    campaigns: any[];
    clients?: any[];
    totalBudget: number;
    totalSpent: number;
    search?: string;
    platformFilter?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const PLATFORM_LABELS: Record<string, { label: string; icon: string }> = {
    google_ads: { label: 'Google Search & Display', icon: '🔍' },
    meta_ads: { label: 'Meta (Instagram & Facebook)', icon: '📱' },
    linkedin_ads: { label: 'LinkedIn B2B Ads', icon: '💼' }
};

export const AdminCampaignsView: FC<AdminCampaignsProps> = ({
    currentUser,
    campaigns = [],
    clients = [],
    totalBudget = 0,
    totalSpent = 0,
    search = '',
    platformFilter = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    return (
        <AdminLayout
            title="Campanhas & Anúncios • Painel Administrativo"
            activeNav="campaigns"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF;">Gestão de Campanhas de Performance & Ads</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">
                        Supervisão de investimentos em mídia paga, Google Ads, Meta Ads e geração de leads.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('modal-nova-campanha').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Nova Campanha</span>
                </button>
            </div>

            {/* Métricas Topo */}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Orçamento Total Ativo</div>
                    <div style="font-size: 24px; font-weight: 800; color: #FFFFFF; margin-top: 6px;">
                        {formatCurrency(totalBudget)}
                    </div>
                </div>

                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Investimento Executado</div>
                    <div style="font-size: 24px; font-weight: 800; color: #F2C230; margin-top: 6px;">
                        {formatCurrency(totalSpent)}
                    </div>
                </div>

                <div class="gt-card" style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #8CAAB9;">Campanhas no Ar</div>
                    <div style="font-size: 24px; font-weight: 800; color: #34D399; margin-top: 6px;">
                        {campaigns.filter(c => c.status === 'active').length}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 24px;">
                <form method="get" action="/admin/campanhas" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome da campanha ou cliente..."
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="platform"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Todas as Plataformas</option>
                            <option value="google_ads" selected={platformFilter === 'google_ads'}>Google Ads</option>
                            <option value="meta_ads" selected={platformFilter === 'meta_ads'}>Meta Ads</option>
                            <option value="linkedin_ads" selected={platformFilter === 'linkedin_ads'}>LinkedIn Ads</option>
                        </select>
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="status"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Status (Todos)</option>
                            <option value="active" selected={statusFilter === 'active'}>Ativa</option>
                            <option value="paused" selected={statusFilter === 'paused'}>Pausada</option>
                            <option value="completed" selected={statusFilter === 'completed'}>Finalizada</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline" style="font-size: 13px;">Filtrar</button>
                    {(search || platformFilter || statusFilter) && (
                        <a href="/admin/campanhas" style="font-size: 12px; color: #F2C230; text-decoration: underline;">Limpar</a>
                    )}
                </form>
            </div>

            {/* Grid de Campanhas */}
            <div class="gt-cards-grid">
                {campaigns.length === 0 ? (
                    <div class="gt-card" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #8CAAB9;">
                        Nenhuma campanha de mídia ativa no momento.
                    </div>
                ) : (
                    campaigns.map((c) => {
                        const plat = PLATFORM_LABELS[c.platform] || { label: c.platform, icon: '📊' };
                        const isActive = c.status === 'active';
                        const budget = c.budget || 0;
                        const spent = c.spent_amount || 0;
                        const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                        return (
                            <div class="gt-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                        <span class="gt-badge gt-badge-info">
                                            {plat.icon} {plat.label}
                                        </span>
                                        <span class={`gt-badge ${isActive ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                            {isActive ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Finalizada'}
                                        </span>
                                    </div>

                                    <h3 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px;">
                                        {c.name}
                                    </h3>
                                    <div style="font-size: 12px; color: #8CAAB9; margin-bottom: 16px;">
                                        Cliente: <strong style="color: #FFFFFF;">{c.company || c.client_name || 'GundjaTech'}</strong>
                                    </div>

                                    {/* Barra de Consumo de Orçamento */}
                                    <div style="margin-bottom: 16px;">
                                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                                            <span style="color: #8CAAB9;">Executado: {formatCurrency(spent)}</span>
                                            <span style="color: #F2C230; font-weight: 700;">{percentage}% do Orçamento</span>
                                        </div>
                                        <div style="width: 100%; height: 6px; background: #032033; border-radius: 999px; overflow: hidden;">
                                            <div style={`width: ${percentage}%; height: 100%; background: #F2C230;`} />
                                        </div>
                                        <div style="text-align: right; font-size: 10px; color: #8CAAB9; margin-top: 4px;">
                                            Teto: {formatCurrency(budget)}
                                        </div>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--gt-border); padding-top: 14px;">
                                    <span style="font-size: 11px; color: #8CAAB9;">
                                        {c.start_date ? `Início: ${new Date(c.start_date).toLocaleDateString('pt-BR')}` : 'Início imediato'}
                                    </span>
                                    <form action={`/admin/campanhas/${c.id}/toggle`} method="post" style="margin: 0;">
                                        <button
                                            type="submit"
                                            class="gt-btn-outline"
                                            style={`font-size: 11px; padding: 4px 10px; ${isActive ? 'color: #FBBF24;' : 'color: #34D399;'}`}
                                        >
                                            {isActive ? 'Pausar' : 'Reativar'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Nova Campanha */}
            <div
                id="modal-nova-campanha"
                style="display: none; position: fixed; inset: 0; background: rgba(3, 32, 51, 0.85); backdrop-filter: blur(4px); z-index: 100; align-items: center; justify-content: center; padding: 16px;"
            >
                <div class="gt-card gt-modal-card" style="max-width: 520px; padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Cadastrar Nova Campanha de Tráfego</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-campanha').style.display='none'"
                            style="background: none; border: none; font-size: 20px; color: #8CAAB9; cursor: pointer;"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/campanhas" method="post">
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Cliente *</label>
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
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Nome da Campanha *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Ex: Captação B2B Google Search São Paulo"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Canal / Plataforma *</label>
                                    <select
                                        name="platform"
                                        required
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    >
                                        <option value="google_ads">Google Ads</option>
                                        <option value="meta_ads">Meta Ads (Instagram)</option>
                                        <option value="linkedin_ads">LinkedIn Ads</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Orçamento Previsto (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="budget"
                                        placeholder="3000.00"
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--gt-border); padding-top: 20px;">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-nova-campanha').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" class="gt-btn-primary">
                                Criar Campanha
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
