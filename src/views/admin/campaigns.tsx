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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                <path d="M12 18h.01" />
            </svg>
        );
    }
    if (platform === 'linkedin_ads') {
        return (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        );
    }
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    const pausedCount = campaigns.filter((c) => c.status === 'paused').length;
    const completedCount = campaigns.filter((c) => c.status === 'completed').length;
    const remainingBudget = Math.max(0, Number(totalBudget || 0) - Number(totalSpent || 0));
    const overallPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

    const buildFilterUrl = (nextStatus: string) => {
        const params = new URLSearchParams();
        if (nextStatus) params.set('status', nextStatus);
        if (platformFilter) params.set('platform', platformFilter);
        if (search) params.set('search', search);
        const qs = params.toString();
        return qs ? `/admin/campanhas?${qs}` : '/admin/campanhas';
    };

    return (
        <AdminLayout
            title="Campanhas & Anúncios • Painel Administrativo"
            activeNav="campaigns"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-list-shell">
            {/* Header */}
            <div class="flex flex-wrap items-center justify-between gap-3" style="flex-shrink: 0;">
                <div class="min-w-0">
                    <h1 class="gt-font-display text-lg sm:text-xl font-extrabold text-white">
                        Gestão de Campanhas &amp; Mídia Paga
                    </h1>
                    <p class="text-xs text-[#8C95AA] mt-0.5">
                        Supervisão de investimentos em Google Ads, Meta Ads, LinkedIn Ads e consumo de orçamento.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-nova-campanha').style.display='flex'"
                    class="gt-btn-primary gt-btn-sm shrink-0"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Nova Campanha</span>
                </button>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" style="flex-shrink: 0;">
                <div class="gtb-card gtb-kpi-gold !py-3 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Orçamento Total</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block" style="font-variant-numeric: tabular-nums;">{formatCurrency(totalBudget)}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">{campaigns.length} camp.</span>
                </div>

                <div class="gtb-card gtb-kpi-blue !py-3 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Investimento Executado</span>
                        <span class="gt-font-display text-lg font-extrabold text-[#F2C230] mt-0.5 block" style="font-variant-numeric: tabular-nums;">{formatCurrency(totalSpent)}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">{overallPct}%</span>
                </div>

                <div class="gtb-card !py-3 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Saldo Disponível</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block" style="font-variant-numeric: tabular-nums;">{formatCurrency(remainingBudget)}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Saldo</span>
                </div>

                <div class="gtb-card gtb-kpi-petrol !py-3 !px-4 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Campanhas no Ar</span>
                        <span class="gt-font-display text-lg font-extrabold text-[#34D399] mt-0.5 block" style="font-variant-numeric: tabular-nums;">{activeCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Ativas</span>
                </div>
            </div>

            {/* Card Unificado: Toolbar de Filtros + Tabela Executiva com Scroll Interno */}
            <section class="gtb-card gt-list-table-card !p-0 overflow-hidden">
                {/* Toolbar integrada */}
                <div class="px-4 py-3 flex flex-wrap items-center justify-between gap-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14); flex-shrink: 0;">
                    <div class="flex flex-wrap items-center gap-1.5">
                        <a
                            href={buildFilterUrl('')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                !statusFilter ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Todas ({campaigns.length})
                        </a>
                        <a
                            href={buildFilterUrl('active')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'active' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Ativas ({activeCount})
                        </a>
                        <a
                            href={buildFilterUrl('paused')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'paused' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Pausadas ({pausedCount})
                        </a>
                        <a
                            href={buildFilterUrl('completed')}
                            class={`px-3 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                                statusFilter === 'completed' ? 'btn-primary shadow-sm' : 'gtb-ctrl-btn !h-auto !py-1.5'
                            }`}
                        >
                            Finalizadas ({completedCount})
                        </a>
                    </div>

                    <form method="get" action="/admin/campanhas" class="flex flex-wrap sm:flex-nowrap items-center gap-2 m-0">
                        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                        <select name="platform" onchange="this.form.submit()" class="rounded-xl px-3 py-1.5 text-xs" style="min-width: 150px; width: auto;">
                            <option value="">Todas as Plataformas</option>
                            <option value="google_ads" selected={platformFilter === 'google_ads'}>Google Ads</option>
                            <option value="meta_ads" selected={platformFilter === 'meta_ads'}>Meta Ads</option>
                            <option value="linkedin_ads" selected={platformFilter === 'linkedin_ads'}>LinkedIn Ads</option>
                        </select>
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar campanha ou cliente..."
                            class="rounded-xl px-3 py-1.5 text-xs"
                            style="width: 200px; max-width: 100%;"
                        />
                        <button type="submit" class="gt-btn-outline gt-btn-xs">Filtrar</button>
                        {(search || platformFilter || statusFilter) && (
                            <a href="/admin/campanhas" class="gt-btn-outline gt-btn-xs">Limpar</a>
                        )}
                    </form>
                </div>

                {/* Tabela Executiva de Campanhas */}
                {campaigns.length === 0 ? (
                    <div class="p-5">
                        <div class="gt-crm-empty-frame" style="margin-top: 0;">
                            <span class="gt-crm-empty-icon" aria-hidden="true">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 3v18h18" />
                                    <path d="m19 9-5 5-4-4-3 3" />
                                </svg>
                            </span>
                            <h3 class="gt-font-display text-sm sm:text-base font-extrabold text-white" style="margin: 0 0 6px 0;">
                                Nenhuma campanha encontrada
                            </h3>
                            <p class="text-xs text-[#8C95AA]" style="max-width: 400px; line-height: 1.6; margin: 0 0 18px 0;">
                                Cadastre sua primeira campanha de Google Ads, Meta Ads ou LinkedIn Ads para acompanhar orçamento e execução em tempo real.
                            </p>
                            <button
                                type="button"
                                onclick="document.getElementById('modal-nova-campanha').style.display='flex'"
                                class="gt-btn-primary gt-btn-xs"
                            >
                                + Cadastrar Campanha
                            </button>
                        </div>
                    </div>
                ) : (
                    <div class="gt-table-wrap gt-list-table-scroll">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3 px-4">Campanha / Cliente</th>
                                    <th class="py-3 px-4">Plataforma</th>
                                    <th class="py-3 px-4" style="min-width: 210px;">Execução do Orçamento</th>
                                    <th class="py-3 px-4">Saldo</th>
                                    <th class="py-3 px-4">Status</th>
                                    <th class="py-3 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {campaigns.map((c) => {
                                    const plat = PLATFORM_META[c.platform] || { label: c.platform || 'Mídia Paga', short: c.platform || 'Mídia' };
                                    const isActive = c.status === 'active';
                                    const isCompleted = c.status === 'completed';
                                    const budget = Number(c.budget || 0);
                                    const spent = Number(c.spent_amount || 0);
                                    const remaining = Math.max(0, budget - spent);
                                    const percentage = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                                    const startLabel = c.start_date
                                        ? new Date(c.start_date).toLocaleDateString('pt-BR')
                                        : 'Início imediato';

                                    return (
                                        <tr class="hover:bg-white/[0.02]">
                                            <td class="py-3.5 px-4 align-middle">
                                                <div class="flex items-center gap-3">
                                                    <span class="gtb-icon-box !w-9 !h-9 shrink-0" aria-hidden="true">
                                                        <PlatformIcon platform={c.platform} />
                                                    </span>
                                                    <div class="min-w-0">
                                                        <div
                                                            title={c.name}
                                                            class="font-extrabold text-white text-[13px] leading-snug"
                                                            style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                                                        >
                                                            {c.name}
                                                        </div>
                                                        <div
                                                            title={`${c.company || c.client_name || 'GundjaTech'} · ${startLabel}`}
                                                            class="text-[11px] text-[#8C95AA] mt-0.5"
                                                            style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                                                        >
                                                            Cliente: <strong class="text-white font-semibold">{c.company || c.client_name || 'GundjaTech'}</strong>
                                                            <span> · {startLabel}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                                                <div class="font-bold text-white">{plat.short}</div>
                                                <div class="text-[10.5px] text-[#8C95AA]">{plat.label}</div>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle">
                                                <div class="flex items-center justify-between gap-2 text-[11px] mb-1" style="font-variant-numeric: tabular-nums;">
                                                    <span class="font-bold text-white">{formatCurrency(spent)}</span>
                                                    <span class="text-[#8C95AA]">de {formatCurrency(budget)} ({percentage}%)</span>
                                                </div>
                                                <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: rgba(140, 149, 170, 0.22);">
                                                    <div style={`width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #063B5C 0%, #16749A 60%, #F2C230 100%); border-radius: 999px;`} />
                                                </div>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap font-bold text-white" style="font-variant-numeric: tabular-nums;">
                                                {formatCurrency(remaining)}
                                            </td>

                                            <td class="py-3.5 px-4 align-middle whitespace-nowrap">
                                                <span class={`gt-badge ${isActive ? 'gt-badge-success' : isCompleted ? 'gt-badge-info' : 'gt-badge-warning'}`}>
                                                    {isActive ? 'Ativa' : isCompleted ? 'Finalizada' : 'Pausada'}
                                                </span>
                                            </td>

                                            <td class="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
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

                                                    <form action={`/admin/campanhas/${c.id}/toggle`} method="post" class="inline-block m-0">
                                                        <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs">
                                                            {isActive ? 'Pausar' : 'Reativar'}
                                                        </button>
                                                    </form>

                                                    <form
                                                        action={`/admin/campanhas/${c.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente excluir esta campanha?"
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
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            </div>

            {/* Modal Nova Campanha */}
            <div
                id="modal-nova-campanha"
                style="display: none;"
                class="gt-modal-overlay"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-7">
                    <div class="flex items-center justify-between gap-3 pb-4 mb-5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                        <div>
                            <h2 class="gt-font-display text-base sm:text-lg font-extrabold text-white">Cadastrar Nova Campanha</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Defina cliente, plataforma e orçamento teto da campanha.</p>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-nova-campanha').style.display='none'"
                            class="gtb-ctrl-btn !w-8 !h-8 !p-0 justify-center"
                            aria-label="Fechar"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/campanhas" method="post" class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Cliente *</label>
                            <select name="client_id" required class="w-full rounded-xl px-3.5 py-2 text-xs">
                                <option value="">Selecione o cliente...</option>
                                {clients.map((cl) => (
                                    <option value={cl.id}>{cl.company ? `${cl.company} (${cl.name})` : cl.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Campanha *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Ex: Captação B2B Google Search São Paulo"
                                class="w-full rounded-xl px-3.5 py-2 text-xs"
                            />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Plataforma *</label>
                                <select name="platform" required class="w-full rounded-xl px-3.5 py-2 text-xs">
                                    <option value="google_ads">Google Ads</option>
                                    <option value="meta_ads">Meta Ads (Instagram / Facebook)</option>
                                    <option value="linkedin_ads">LinkedIn Ads</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Orçamento Previsto (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    name="budget"
                                    placeholder="3000.00"
                                    class="w-full rounded-xl px-3.5 py-2 text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
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
                style="display: none;"
                class="gt-modal-overlay"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-7">
                    <div class="flex items-center justify-between gap-3 pb-4 mb-5" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                        <div>
                            <h2 class="gt-font-display text-base sm:text-lg font-extrabold text-white">Editar Campanha</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Atualize status, plataforma ou valores executados.</p>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-campanha').style.display='none'"
                            class="gtb-ctrl-btn !w-8 !h-8 !p-0 justify-center"
                            aria-label="Fechar"
                        >
                            &times;
                        </button>
                    </div>

                    <form id="form-editar-campanha" action="/admin/campanhas/0/editar" method="post" data-dirty-guard="1" class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome da Campanha *</label>
                            <input type="text" id="edit-camp-name" name="name" required class="w-full rounded-xl px-3.5 py-2 text-xs" />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Plataforma</label>
                                <select id="edit-camp-platform" name="platform" class="w-full rounded-xl px-3.5 py-2 text-xs">
                                    <option value="google_ads">Google Ads</option>
                                    <option value="meta_ads">Meta Ads (Instagram / Facebook)</option>
                                    <option value="linkedin_ads">LinkedIn Ads</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                                <select id="edit-camp-status" name="status" class="w-full rounded-xl px-3.5 py-2 text-xs">
                                    <option value="active">Ativa</option>
                                    <option value="paused">Pausada</option>
                                    <option value="completed">Finalizada</option>
                                </select>
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Orçamento Teto (R$)</label>
                                <input type="number" step="0.01" min="0" id="edit-camp-budget" name="budget" class="w-full rounded-xl px-3.5 py-2 text-xs font-mono" />
                            </div>
                            <div>
                                <label class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Investimento Executado (R$)</label>
                                <input type="number" step="0.01" min="0" id="edit-camp-spent" name="spent_amount" class="w-full rounded-xl px-3.5 py-2 text-xs font-mono" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
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
                            if (window.GT_ResetDirtyForm) window.GT_ResetDirtyForm('form-editar-campanha');
                            document.getElementById('modal-editar-campanha').style.display = 'flex';
                        };
                    `
                }}
            />
        </AdminLayout>
    );
};
