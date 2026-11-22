import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminClientsProps {
    currentUser: any;
    clients?: any[];
    clientDetail?: any;
    isCreate?: boolean;
    search?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

function renderClientRow(c: any, categoryKey: 'active' | 'lead' | 'whatsapp') {
    const displayName = c.company || c.name || 'Cliente';
    const initials = displayName.slice(0, 2).toUpperCase();
    const isSyntheticWa = String(c.email || '').endsWith('.local');
    const isActive = c.status === 'active';

    const badgeMeta =
        categoryKey === 'active'
            ? { label: 'Cliente Ativo', cls: 'gt-badge-success' }
            : categoryKey === 'whatsapp'
            ? { label: 'Lead WhatsApp', cls: 'gt-badge-info' }
            : { label: 'Lead Comercial', cls: 'gt-badge-warning' };

    return (
        <tr class="hover:bg-white/[0.02] transition">
            <td class="py-3.5 px-5">
                <div class="flex items-center gap-3">
                    <div class="gtb-avatar-inner w-9 h-9 rounded-xl border border-[#16749A]/40 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {initials}
                    </div>
                    <div class="min-w-0">
                        <div class="font-bold text-white truncate max-w-[240px]">{displayName}</div>
                        {c.company && c.name && c.company !== c.name && (
                            <div class="text-[11px] text-[#8C95AA]">Contato: {c.name}</div>
                        )}
                    </div>
                </div>
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                {isSyntheticWa ? (
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-[#6EE7B7] text-[10.5px] font-bold">
                        <span>WhatsApp Direto</span>
                    </span>
                ) : (
                    <span class="text-[#D5DCEB]">{c.email || '—'}</span>
                )}
            </td>
            <td class="py-3.5 px-5 font-mono text-[#8C95AA] whitespace-nowrap">{c.phone || '—'}</td>
            <td class="py-3.5 px-5 whitespace-nowrap">
                <span class={`gt-badge ${badgeMeta.cls}`}>{badgeMeta.label}</span>
            </td>
            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                    <form action={`/admin/clientes/${c.id}/status`} method="post" class="inline-block m-0">
                        <input type="hidden" name="status" value={isActive ? 'lead' : 'active'} />
                        <button
                            type="submit"
                            data-loading-text="..."
                            class={isActive ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-primary gt-btn-xs'}
                            title={isActive ? 'Mover para Leads' : 'Promover para Cliente Ativo'}
                        >
                            {isActive ? (
                                <span>Mover p/ Lead</span>
                            ) : (
                                <>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Ativar Cliente</span>
                                </>
                            )}
                        </button>
                    </form>

                    <form
                        action={`/admin/clientes/${c.id}/excluir`}
                        method="post"
                        class="inline-block m-0"
                        data-confirm="Deseja realmente excluir este cadastro permanentemente?"
                    >
                        <button
                            type="submit"
                            class="gt-btn-danger-ghost gt-btn-icon-only"
                            title="Excluir cadastro"
                            aria-label="Excluir cadastro"
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
}

function renderCategorySection(
    title: string,
    subtitle: string,
    accentClass: string,
    badgeText: string,
    items: any[],
    categoryKey: 'active' | 'lead' | 'whatsapp'
) {
    return (
        <section class={`gtb-card ${accentClass} !p-0 overflow-hidden`}>
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <div class="flex items-center gap-2.5">
                        <h2 class="gt-font-display text-sm sm:text-base font-extrabold text-white">{title}</h2>
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-white/10 text-white">
                            {items.length}
                        </span>
                    </div>
                    <p class="text-[11.5px] text-[#8C95AA] mt-0.5">{subtitle}</p>
                </div>
                <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">{badgeText}</span>
            </div>

            {items.length === 0 ? (
                <div class="gt-empty-state !py-7">Nenhum registro nesta categoria.</div>
            ) : (
                <div class="gt-table-wrap">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                <th class="py-3 px-5">Empresa / Contato</th>
                                <th class="py-3 px-5">E-mail / Canal</th>
                                <th class="py-3 px-5">Telefone</th>
                                <th class="py-3 px-5">Categoria</th>
                                <th class="py-3 px-5 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-white/5">
                            {items.map((c: any) => renderClientRow(c, categoryKey))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export const AdminClientsView: FC<AdminClientsProps> = ({
    currentUser,
    clients = [],
    isCreate = false,
    search = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    if (isCreate) {
        return (
            <AdminLayout
                title="Novo Cliente • Painel Administrativo"
                activeNav="clients"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/admin/clientes" class="gt-back-link">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        <span>Voltar para Clientes</span>
                    </a>
                </div>

                <form action="/admin/clientes" method="post" class="gt-grid-detail items-start">
                    <section class="gtb-card gtb-kpi-gold space-y-5 min-w-0">
                        <div>
                            <h1 class="gt-font-display text-xl font-extrabold text-white">Cadastrar Novo Cliente / Lead</h1>
                            <p class="text-xs text-[#8C95AA] mt-1">Preencha os dados corporativos e de contato do cliente.</p>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Razão Social / Empresa *</label>
                                <input type="text" name="company" required placeholder="Ex: Acronis Brasil Ltda" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Contato Principal *</label>
                                <input type="text" name="name" required placeholder="Ex: Roberto Silva" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail Corporativo *</label>
                                <input type="email" name="email" required placeholder="contato@empresa.com" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone / WhatsApp</label>
                                <input type="text" name="phone" placeholder="(19) 99999-8888" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Categoria Inicial</label>
                            <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="active">Cliente Ativo (Contrato ou projeto em andamento)</option>
                                <option value="lead">Lead Comercial (Prospecção / Orçamento)</option>
                            </select>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <a href="/admin/clientes" class="gt-btn-outline gt-btn-sm">Cancelar</a>
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                Salvar Cliente
                            </button>
                        </div>
                    </section>

                    <aside class="gtb-card space-y-4 min-w-0">
                        <div>
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Acesso ao Portal</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Credenciais de acompanhamento para o cliente.</p>
                        </div>

                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Criar conta no Portal do Cliente</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Permite acompanhar projetos, faturas e chamados</div>
                                </div>
                                <input type="checkbox" name="create_user_account" value="1" checked class="gt-switch" />
                            </label>
                        </div>
                    </aside>
                </form>
            </AdminLayout>
        );
    }

    // Separa os registros nas 3 categorias claras: Ativos, Leads (Site/Form) e Leads (WhatsApp)
    const activeClients = clients.filter((c) => c.status === 'active');
    const whatsappLeads = clients.filter((c) => c.status !== 'active' && String(c.email || '').endsWith('.local'));
    const siteLeads = clients.filter((c) => c.status !== 'active' && !String(c.email || '').endsWith('.local'));

    return (
        <AdminLayout
            title="Clientes & Contas • Painel Administrativo GundjaTech"
            activeNav="clients"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Diretório de Clientes &amp; Leads</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Organizado por categoria: Clientes Ativos, Leads do Site e Contatos via WhatsApp.
                    </p>
                </div>
                <a href="/admin/clientes/novo" class="gt-btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Cliente</span>
                </a>
            </div>

            {/* 4 KPIs Executivos Clicáveis por Categoria */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <a href="/admin/clientes" class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-1.5 no-underline hover:-translate-y-0.5 transition">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total Geral</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{clients.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">todos os registros</div>
                </a>
                <a href="/admin/clientes?status=active" class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-1.5 no-underline hover:-translate-y-0.5 transition">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">1. Clientes Ativos</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#34D399]">{activeClients.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">com contrato ou entrega</div>
                </a>
                <a href="/admin/clientes?status=lead" class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-1.5 no-underline hover:-translate-y-0.5 transition">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">2. Leads (Site / E-mail)</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#F2C230]">{siteLeads.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">prospecção e formulários</div>
                </a>
                <a href="/admin/clientes?status=whatsapp" class="gtb-card !p-5 flex flex-col justify-between gap-1.5 no-underline hover:-translate-y-0.5 transition">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">3. Leads WhatsApp</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{whatsappLeads.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">captados direto no WhatsApp</div>
                </a>
            </div>

            {/* Abas de Categoria + Busca */}
            <div class="gtb-card !p-4 space-y-3.5">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-2 flex-wrap">
                        <a
                            href="/admin/clientes"
                            class={statusFilter === '' ? 'gt-btn-primary gt-btn-xs' : 'gt-btn-outline gt-btn-xs'}
                        >
                            Todos ({clients.length})
                        </a>
                        <a
                            href="/admin/clientes?status=active"
                            class={statusFilter === 'active' ? 'gt-btn-primary gt-btn-xs' : 'gt-btn-outline gt-btn-xs'}
                        >
                            Clientes Ativos ({activeClients.length})
                        </a>
                        <a
                            href="/admin/clientes?status=lead"
                            class={statusFilter === 'lead' ? 'gt-btn-primary gt-btn-xs' : 'gt-btn-outline gt-btn-xs'}
                        >
                            Leads do Site ({siteLeads.length})
                        </a>
                        <a
                            href="/admin/clientes?status=whatsapp"
                            class={statusFilter === 'whatsapp' ? 'gt-btn-primary gt-btn-xs' : 'gt-btn-outline gt-btn-xs'}
                        >
                            Leads WhatsApp ({whatsappLeads.length})
                        </a>
                    </div>
                </div>

                <form action="/admin/clientes" method="get" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por empresa, nome, e-mail ou telefone..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todas as Categorias</option>
                            <option value="active" selected={statusFilter === 'active'}>1. Clientes Ativos</option>
                            <option value="lead" selected={statusFilter === 'lead'}>2. Leads (Site / E-mail)</option>
                            <option value="whatsapp" selected={statusFilter === 'whatsapp'}>3. Leads WhatsApp</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/clientes" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Seções Separadas por Categoria */}
            <div class="space-y-6">
                {(!statusFilter || statusFilter === 'active') &&
                    renderCategorySection(
                        '1. Clientes Ativos',
                        'Empresas e clientes com contrato ativo, projeto em andamento ou operação recorrente.',
                        'gtb-kpi-petrol',
                        'Carteira Ativa',
                        activeClients,
                        'active'
                    )}

                {(!statusFilter || statusFilter === 'lead') &&
                    renderCategorySection(
                        '2. Leads Comerciais (Site & Formulários)',
                        'Contatos que solicitaram orçamento ou iniciaram atendimento pelo site institucional.',
                        'gtb-kpi-gold',
                        'Funil do Site',
                        siteLeads,
                        'lead'
                    )}

                {(!statusFilter || statusFilter === 'whatsapp') &&
                    renderCategorySection(
                        '3. Contatos & Leads via WhatsApp',
                        'Visitantes captados automaticamente pelo canal oficial de WhatsApp.',
                        'gtb-kpi-blue',
                        'Canal WhatsApp',
                        whatsappLeads,
                        'whatsapp'
                    )}
            </div>
        </AdminLayout>
    );
};
