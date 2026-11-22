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

                <section class="gtb-card gtb-kpi-gold max-w-2xl space-y-5">
                    <div>
                        <h1 class="gt-font-display text-xl font-extrabold text-white">Cadastrar Novo Cliente</h1>
                        <p class="text-xs text-[#8C95AA] mt-1">Preencha os dados corporativos e de contato do cliente.</p>
                    </div>

                    <form action="/admin/clientes" method="post" class="space-y-4">
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
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status Inicial</label>
                            <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="active">Ativo (Cliente com contrato ou demanda em curso)</option>
                                <option value="lead">Lead (Prospecção comercial)</option>
                            </select>
                        </div>

                        <div class="gtb-surface-box rounded-xl overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Criar acesso ao Portal do Cliente</div>
                                    <div class="text-[11px] text-[#8C95AA]">Gera credencial com senha provisória para acompanhamento de projetos</div>
                                </div>
                                <input type="checkbox" name="create_user_account" value="1" checked class="gt-switch" />
                            </label>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                            <a href="/admin/clientes" class="gt-btn-outline gt-btn-sm">Cancelar</a>
                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                Salvar Cliente
                            </button>
                        </div>
                    </form>
                </section>
            </AdminLayout>
        );
    }

    const activeCount = clients.filter((c) => c.status === 'active').length;
    const leadCount = clients.filter((c) => c.status !== 'active').length;
    const whatsappOriginCount = clients.filter((c) => String(c.email || '').endsWith('.local')).length;

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
                        Gerencie empresas, dados de faturamento, leads de WhatsApp e acessos ao portal exclusivo.
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

            {/* 4 KPIs Executivos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total de Contas</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{clients.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">na base comercial</div>
                </div>
                <div class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Clientes Ativos</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#34D399]">{activeCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">com contrato ou entrega</div>
                </div>
                <div class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Leads em Prospecção</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#F2C230]">{leadCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">em qualificação</div>
                </div>
                <div class="gtb-card !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Origem WhatsApp</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{whatsappOriginCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">captados via canal WA</div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form action="/admin/clientes" method="get" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por razão social, nome ou e-mail..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os status</option>
                            <option value="active" selected={statusFilter === 'active'}>Ativos</option>
                            <option value="lead" selected={statusFilter === 'lead'}>Leads</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline gt-btn-sm">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/clientes" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Clientes */}
            <div class="gtb-card !p-0 overflow-hidden">
                {clients.length === 0 ? (
                    <div class="gt-empty-state">Nenhum cliente encontrado com os filtros aplicados.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Empresa / Contato</th>
                                    <th class="py-3.5 px-5">E-mail / Canal</th>
                                    <th class="py-3.5 px-5">Telefone</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {clients.map((c: any) => {
                                    const displayName = c.company || c.name || 'Cliente';
                                    const initials = displayName.slice(0, 2).toUpperCase();
                                    const isSyntheticWa = String(c.email || '').endsWith('.local');

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
                                                    <span class="inline-flex px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-[#6EE7B7] text-[10.5px] font-bold">
                                                        WhatsApp Direto
                                                    </span>
                                                ) : (
                                                    <span class="text-[#D5DCEB]">{c.email || '—'}</span>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 font-mono text-[#8C95AA] whitespace-nowrap">{c.phone || '—'}</td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-info'}`}>
                                                    {c.status === 'active' ? 'Ativo' : 'Lead'}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <form
                                                    action={`/admin/clientes/${c.id}/excluir`}
                                                    method="post"
                                                    class="inline-block m-0"
                                                    onsubmit="return confirm('Deseja realmente excluir este cliente?')"
                                                >
                                                    <button
                                                        type="submit"
                                                        class="gt-btn-danger-ghost gt-btn-icon-only"
                                                        title="Excluir cliente"
                                                        aria-label="Excluir cliente"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M3 6h18" />
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
