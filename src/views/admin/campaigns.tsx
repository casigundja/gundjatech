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

const PLATFORM_META: Record<string, { label: string; short: string }> = {
    google_ads: { label: 'Google Search & Display', short: 'Google Ads' },
    meta_ads: { label: 'Meta (Instagram & Facebook)', short: 'Meta Ads' },
    linkedin_ads: { label: 'LinkedIn B2B Ads', short: 'LinkedIn Ads' }
};

function PlatformIcon({ platform }: { platform: string }) {
    if (platform === 'meta_ads') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
            </svg>
        );
    }
    if (platform === 'linkedin_ads') {
        return (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        );
    }
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

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
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));

    const activeCount = campaigns.filter((c) => c.status === 'active').length;
    const remainingBudget = Math.max(0, Number(totalBudget || 0) - Number(totalSpent || 0));
    const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

    return (
        <AdminLayout
            title="Campanhas & Anúncios • Painel Administrativo"
            activeNav="campaigns"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">
                        Gestão de Campanhas de Performance &amp; Ads
                    </h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Supervisão de investimentos em mídia paga, Google Ads, Meta Ads e geração de leads.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-nova-campanha').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Nova Campanha</span>
                </button>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Orçamento Total</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(totalBudget)}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#D5DCEB]">{campaigns.length} camp.</span>
                </div>

                <div class="gtb-card gtb-kpi-blue !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Investimento Executado</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-[#F2C230] mt-0.5 block">{formatCurrency(totalSpent)}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">{overallPct}%</span>
                </div>

                <div class="gtb-card !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Saldo Disponível</span>
                        <span class="gt-font-display text-lg sm:text-xl font-extrabold text-white mt-0.5 block">{formatCurrency(remainingBudget)}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Saldo</span>
                </div>

                <div class="gtb-card gtb-kpi-petrol !p-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Campanhas no Ar</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block">{activeCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Ativa</span>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/campanhas" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome da campanha ou cliente..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="platform" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todas as Plataformas</option>
                            <option value="google_ads" selected={platformFilter === 'google_ads'}>Google Ads</option>
                            <option value="meta_ads" selected={platformFilter === 'meta_ads'}>Meta Ads</option>
                            <option value="linkedin_ads" selected={platformFilter === 'linkedin_ads'}>LinkedIn Ads</option>
                        </select>
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Status</option>
                            <option value="active" selected={statusFilter === 'active'}>Ativa</option>
                            <option value="paused" selected={statusFilter === 'paused'}>Pausada</option>
                            <option value="completed" selected={statusFilter === 'completed'}>Finalizada</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || platformFilter || statusFilter) && (
                        <a href="/admin/campanhas" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Grid de Campanhas */}
            <div class="gt-cards-grid">
                {campaigns.length === 0 ? (
                    <div class="gtb-card gt-empty-state" style="grid-column: 1 / -1;">
                        Nenhuma campanha de mídia encontrada. Clique em <strong>+ Nova Campanha</strong> para cadastrar.
                    </div>
                ) : (
                    campaigns.map((c) => {
                        const plat = PLATFORM_META[c.platform] || { label: c.platform || 'Mídia Paga', short: c.platform };
                        const isActive = c.status === 'active';
                        const isCompleted = c.status === 'completed';
                        const budget = Number(c.budget || 0);
                        const spent = Number(c.spent_amount || 0);
                        const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

                        return (
                            <article class="gtb-card !p-5 flex flex-col justify-between gap-4 min-w-0">
                                <div class="space-y-3.5">
                                    <div class="flex items-center justify-between gap-2 flex-wrap">
                                        <span class="gt-badge gt-badge-info inline-flex items-center gap-1.5">
                                            <PlatformIcon platform={c.platform} />
                                            <span>{plat.label}</span>
                                        </span>
                                        <span class={`gt-badge ${isActive ? 'gt-badge-success' : isCompleted ? 'gt-badge-info' : 'gt-badge-warning'}`}>
                                            {isActive ? 'Ativa' : isCompleted ? 'Finalizada' : 'Pausada'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 class="gt-font-display text-base font-extrabold text-white leading-snug">{c.name}</h3>
                                        <p class="text-xs text-[#8C95AA] mt-0.5">
                                            Cliente: <strong class="text-white">{c.company || c.client_name || 'GundjaTech'}</strong>
                                        </p>
                                    </div>

                                    {/* Barra de Consumo de Orçamento */}
                                    <div class="gtb-surface-box rounded-xl p-3.5 space-y-2">
                                        <div class="flex items-center justify-between text-[11px]">
                                            <span class="text-[#8C95AA]">
                                                Executado: <strong class="text-white">{formatCurrency(spent)}</strong>
                                            </span>
                                            <span class="font-extrabold text-[#F2C230]">{percentage}%</span>
                                        </div>
                                        <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                                            <div style={`width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #F2C230, #E0B020); border-radius: 999px;`} />
                                        </div>
                                        <div class="flex items-center justify-between text-[10.5px] text-[#8C95AA]">
                                            <span>{c.start_date ? `Início: ${new Date(c.start_date).toLocaleDateString('pt-BR')}` : 'Início imediato'}</span>
                                            <span>Teto: <strong class="text-white">{formatCurrency(budget)}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rodapé de Ações */}
                                <div class="flex items-center justify-between gap-2 pt-3 border-t border-white/10 flex-wrap">
                                    <button
                                        type="button"
                                        class="gt-btn-outline gt-btn-xs"
                                        data-camp-id={c.id}
                                        data-camp-name={c.name || ''}
                                        data-camp-platform={c.platform || 'google_ads'}
                                        data-camp-budget={budget}
                                        data-camp-spent={spent}
                                        data-camp-status={c.status || 'active'}
                                        onclick="window.gtOpenEditCampaign(this)"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                        </svg>
                                        <span>Editar</span>
                                    </button>

                                    <div class="flex items-center gap-1.5">
                                        <form action={`/admin/campanhas/${c.id}/toggle`} method="post" class="m-0">
                                            <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs">
                                                {isActive ? (
                                                    <>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                                            <rect width="4" height="16" x="6" y="4" />
                                                            <rect width="4" height="16" x="14" y="4" />
                                                        </svg>
                                                        <span>Pausar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                                            <polygon points="6 3 20 12 6 21 6 3" />
                                                        </svg>
                                                        <span>Reativar</span>
                                                    </>
                                                )}
                                            </button>
                                        </form>

                                        <form
                                            action={`/admin/campanhas/${c.id}/excluir`}
                                            method="post"
                                            class="m-0"
                                            onsubmit="return confirm('Deseja realmente excluir esta campanha?')"
                                        >
                                            <button
                                                type="submit"
                                                class="gt-btn-danger-ghost gt-btn-icon-only"
                                                title="Excluir campanha"
                                                aria-label="Excluir campanha"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M3 6h18" />
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </article>
                        );
                    })
                )}
            </div>

            {/* Modal Nova Campanha */}
            <div
                id="modal-nova-campanha"
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Cadastrar Nova Campanha</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-campanha').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/campanhas" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((cl) => (
                                    <option value={cl.id}>{cl.company ? `${cl.company} (${cl.name})` : cl.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Campanha *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Ex: Captação B2B Google Search São Paulo"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Plataforma *</label>
                                <select name="platform" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="google_ads">Google Ads</option>
                                    <option value="meta_ads">Meta Ads (Instagram / Facebook)</option>
                                    <option value="linkedin_ads">LinkedIn Ads</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Orçamento Previsto (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="budget"
                                    placeholder="3000.00"
                                    class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-nova-campanha').style.display='none'"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Criando..." class="gt-btn-primary gt-btn-sm">
                                Criar Campanha
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Editar Campanha */}
            <div
                id="modal-editar-campanha"
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Editar Campanha</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-campanha').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form id="form-editar-campanha" action="/admin/campanhas/0/editar" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Campanha *</label>
                            <input type="text" id="edit-camp-name" name="name" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Plataforma</label>
                                <select id="edit-camp-platform" name="platform" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="google_ads">Google Ads</option>
                                    <option value="meta_ads">Meta Ads (Instagram / Facebook)</option>
                                    <option value="linkedin_ads">LinkedIn Ads</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                                <select id="edit-camp-status" name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="active">Ativa</option>
                                    <option value="paused">Pausada</option>
                                    <option value="completed">Finalizada</option>
                                </select>
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Orçamento Teto (R$)</label>
                                <input type="number" step="0.01" min="0" id="edit-camp-budget" name="budget" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Investimento Executado (R$)</label>
                                <input type="number" step="0.01" min="0" id="edit-camp-spent" name="spent_amount" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-editar-campanha').style.display='none'"
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

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        window.gtOpenEditCampaign = function(btn) {
                            var id = btn.getAttribute('data-camp-id');
                            document.getElementById('form-editar-campanha').action = '/admin/campanhas/' + id + '/editar';
                            document.getElementById('edit-camp-name').value = btn.getAttribute('data-camp-name') || '';
                            document.getElementById('edit-camp-platform').value = btn.getAttribute('data-camp-platform') || 'google_ads';
                            document.getElementById('edit-camp-status').value = btn.getAttribute('data-camp-status') || 'active';
                            document.getElementById('edit-camp-budget').value = btn.getAttribute('data-camp-budget') || '0';
                            document.getElementById('edit-camp-spent').value = btn.getAttribute('data-camp-spent') || '0';
                            document.getElementById('modal-editar-campanha').style.display = 'flex';
                        };
                    `
                }}
            />
        </AdminLayout>
    );
};
