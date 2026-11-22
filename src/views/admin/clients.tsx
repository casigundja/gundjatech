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

function getClientCategory(c: any): 'active' | 'whatsapp' | 'lead' {
    if (c.status === 'active') return 'active';
    if (String(c.email || '').endsWith('.local')) return 'whatsapp';
    return 'lead';
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

    const activeClients = clients.filter((c) => getClientCategory(c) === 'active');
    const siteLeads = clients.filter((c) => getClientCategory(c) === 'lead');
    const whatsappLeads = clients.filter((c) => getClientCategory(c) === 'whatsapp');

    // Ordena: Ativos -> Leads do Site -> Leads WhatsApp
    const sortedClients = [...activeClients, ...siteLeads, ...whatsappLeads];

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
                    <p class="text-xs text-[#8C95AA] mt-0.5">
                        Gestão centralizada de Clientes Ativos, Leads do Site e Contatos via WhatsApp.
                    </p>
                </div>
                <a href="/admin/clientes/novo" class="gt-btn-primary gt-btn-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Cliente</span>
                </a>
            </div>

            {/* 4 KPIs Compactos Clicáveis */}
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <button
                    type="button"
                    data-cat-trigger="all"
                    onclick="window.gtFilterClientTab('all')"
                    class="gtb-card gtb-kpi-gold !p-4 text-left cursor-pointer border-0 flex items-center justify-between gap-2 hover:-translate-y-0.5 transition"
                >
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total Geral</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{clients.length}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-[#D5DCEB]">Todos</span>
                </button>

                <button
                    type="button"
                    data-cat-trigger="active"
                    onclick="window.gtFilterClientTab('active')"
                    class="gtb-card gtb-kpi-petrol !p-4 text-left cursor-pointer border-0 flex items-center justify-between gap-2 hover:-translate-y-0.5 transition"
                >
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Clientes Ativos</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#34D399] mt-0.5 block">{activeClients.length}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Ativo</span>
                </button>

                <button
                    type="button"
                    data-cat-trigger="lead"
                    onclick="window.gtFilterClientTab('lead')"
                    class="gtb-card gtb-kpi-blue !p-4 text-left cursor-pointer border-0 flex items-center justify-between gap-2 hover:-translate-y-0.5 transition"
                >
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Leads do Site</span>
                        <span class="gt-font-display text-xl font-extrabold text-[#F2C230] mt-0.5 block">{siteLeads.length}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Lead</span>
                </button>

                <button
                    type="button"
                    data-cat-trigger="whatsapp"
                    onclick="window.gtFilterClientTab('whatsapp')"
                    class="gtb-card !p-4 text-left cursor-pointer border-0 flex items-center justify-between gap-2 hover:-translate-y-0.5 transition"
                >
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Leads WhatsApp</span>
                        <span class="gt-font-display text-xl font-extrabold text-white mt-0.5 block">{whatsappLeads.length}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">WhatsApp</span>
                </button>
            </div>

            {/* Card Único Otimizado: Abas de Categoria + Busca Instantânea + Tabela Compacta */}
            <div class="gtb-card !p-0 overflow-hidden">
                {/* Barra Integrada de Abas & Busca */}
                <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-1.5 flex-wrap" id="gt-client-tabs">
                        <button
                            type="button"
                            data-tab="all"
                            onclick="window.gtFilterClientTab('all')"
                            class={`gt-btn-xs ${!statusFilter ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            <span>Todos ({clients.length})</span>
                        </button>
                        <button
                            type="button"
                            data-tab="active"
                            onclick="window.gtFilterClientTab('active')"
                            class={`gt-btn-xs ${statusFilter === 'active' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            <span>Ativos ({activeClients.length})</span>
                        </button>
                        <button
                            type="button"
                            data-tab="lead"
                            onclick="window.gtFilterClientTab('lead')"
                            class={`gt-btn-xs ${statusFilter === 'lead' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            <span>Leads Site ({siteLeads.length})</span>
                        </button>
                        <button
                            type="button"
                            data-tab="whatsapp"
                            onclick="window.gtFilterClientTab('whatsapp')"
                            class={`gt-btn-xs ${statusFilter === 'whatsapp' ? 'gt-btn-primary' : 'gt-btn-outline'}`}
                        >
                            <span>WhatsApp ({whatsappLeads.length})</span>
                        </button>
                    </div>

                    <form action="/admin/clientes" method="get" class="flex items-center gap-2 flex-1 sm:flex-initial min-w-[220px] max-w-xs m-0">
                        <input
                            type="text"
                            id="gt-client-search"
                            name="search"
                            value={search}
                            oninput="window.gtFilterClientSearch(this.value)"
                            placeholder="Filtrar por nome, empresa, e-mail..."
                            class="w-full rounded-lg px-3 py-1.5 text-xs"
                        />
                        {search && (
                            <a href="/admin/clientes" class="text-[11px] font-bold text-[#F2C230] underline shrink-0">
                                Limpar
                            </a>
                        )}
                    </form>
                </div>

                {sortedClients.length === 0 ? (
                    <div class="gt-empty-state !py-8">Nenhum cliente ou lead encontrado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-2.5 px-4">Empresa / Contato</th>
                                    <th class="py-2.5 px-4">Canal / E-mail</th>
                                    <th class="py-2.5 px-4">Telefone</th>
                                    <th class="py-2.5 px-4">Categoria</th>
                                    <th class="py-2.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5" id="gt-clients-tbody">
                                {sortedClients.map((c: any) => {
                                    const cat = getClientCategory(c);
                                    const displayName = c.company || c.name || 'Cliente';
                                    const initials = displayName.slice(0, 2).toUpperCase();
                                    const isSyntheticWa = cat === 'whatsapp';
                                    const isActive = cat === 'active';
                                    const searchBlob = `${c.company || ''} ${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();

                                    const badgeMeta =
                                        cat === 'active'
                                            ? { label: 'Ativo', cls: 'gt-badge-success' }
                                            : cat === 'whatsapp'
                                            ? { label: 'WhatsApp', cls: 'gt-badge-info' }
                                            : { label: 'Lead Site', cls: 'gt-badge-warning' };

                                    return (
                                        <tr
                                            data-client-row="1"
                                            data-client-cat={cat}
                                            data-client-search={searchBlob}
                                            style={statusFilter && statusFilter !== cat ? 'display: none;' : ''}
                                            class="hover:bg-white/[0.02] transition"
                                        >
                                            <td class="py-2.5 px-4">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="gtb-avatar-inner w-8 h-8 rounded-lg border border-[#16749A]/40 flex items-center justify-center font-extrabold text-[11px] shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="font-bold text-white truncate max-w-[240px] leading-tight">{displayName}</div>
                                                        {c.company && c.name && c.company !== c.name && (
                                                            <div class="text-[10.5px] text-[#8C95AA] truncate max-w-[240px]">Contato: {c.name}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                {isSyntheticWa ? (
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 text-[#6EE7B7] text-[10px] font-bold">
                                                        WhatsApp Direto
                                                    </span>
                                                ) : (
                                                    <span class="text-[#D5DCEB] text-xs">{c.email || '—'}</span>
                                                )}
                                            </td>
                                            <td class="py-2.5 px-4 font-mono text-[11.5px] text-[#8C95AA] whitespace-nowrap">{c.phone || '—'}</td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class={`gt-badge ${badgeMeta.cls}`}>{badgeMeta.label}</span>
                                            </td>
                                            <td class="py-2.5 px-4 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <form action={`/admin/clientes/${c.id}/status`} method="post" class="inline-block m-0">
                                                        <input type="hidden" name="status" value={isActive ? 'lead' : 'active'} />
                                                        <button
                                                            type="submit"
                                                            data-loading-text="..."
                                                            class={isActive ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-primary gt-btn-xs'}
                                                            title={isActive ? 'Mover para Lead' : 'Promover para Cliente Ativo'}
                                                        >
                                                            {isActive ? 'Mover p/ Lead' : 'Ativar'}
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
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            var currentCat = ${JSON.stringify(statusFilter || 'all')};
                            var currentQuery = '';

                            function applyClientFilters() {
                                var rows = document.querySelectorAll('tr[data-client-row="1"]');
                                rows.forEach(function(row) {
                                    var rCat = row.getAttribute('data-client-cat');
                                    var rSearch = row.getAttribute('data-client-search') || '';
                                    var matchCat = (currentCat === 'all' || !currentCat || rCat === currentCat);
                                    var matchQuery = (!currentQuery || rSearch.indexOf(currentQuery) !== -1);
                                    row.style.display = (matchCat && matchQuery) ? '' : 'none';
                                });
                            }

                            window.gtFilterClientTab = function(cat) {
                                currentCat = cat || 'all';
                                document.querySelectorAll('#gt-client-tabs button[data-tab]').forEach(function(btn) {
                                    var active = btn.getAttribute('data-tab') === currentCat;
                                    btn.className = 'gt-btn-xs ' + (active ? 'gt-btn-primary' : 'gt-btn-outline');
                                });
                                applyClientFilters();
                            };

                            window.gtFilterClientSearch = function(val) {
                                currentQuery = String(val || '').toLowerCase().trim();
                                applyClientFilters();
                            };
                        })();
                    `
                }}
            />
        </AdminLayout>
    );
};
