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
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                                    <th class="py-2.5 px-4">Portal</th>
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
                                    const hasPortal = Boolean(c.portal_user_id || c.user_id);
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
                                                        <div
                                                            title={displayName}
                                                            class="font-bold text-white leading-tight"
                                                            style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                                                        >
                                                            {displayName}
                                                        </div>
                                                        {c.company && c.name && c.company !== c.name && (
                                                            <div
                                                                title={`Contato: ${c.name}`}
                                                                class="text-[10.5px] text-[#8C95AA]"
                                                                style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                                                            >
                                                                Contato: {c.name}
                                                            </div>
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
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                {hasPortal ? (
                                                    <span class="gt-req-pill-neutral">Portal Ativo</span>
                                                ) : (
                                                    <span class="text-[11px] font-semibold text-[#8C95AA]">Sem acesso</span>
                                                )}
                                            </td>
                                            <td class="py-2.5 px-4 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onclick={`window.gtOpenPortalModal(${JSON.stringify({
                                                            id: c.id,
                                                            name: displayName,
                                                            email: isSyntheticWa ? '' : (c.email || ''),
                                                            phone: c.phone || '',
                                                            isActive,
                                                            hasPortal,
                                                        })})`}
                                                        class={hasPortal ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}
                                                        title={hasPortal ? 'Gerar novo link de acesso ao Portal' : 'Ativar acesso ao Portal do Cliente'}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                                        </svg>
                                                        <span>{hasPortal ? 'Enviar Acesso' : 'Ativar Portal'}</span>
                                                    </button>

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

                                                    <button
                                                        type="button"
                                                        data-id={String(c.id)}
                                                        data-name={String(c.name || '')}
                                                        data-company={String(c.company || '')}
                                                        data-email={isSyntheticWa ? '' : String(c.email || '')}
                                                        data-phone={String(c.phone || '')}
                                                        data-document={String(c.document || '')}
                                                        data-segment={String(c.segment || '')}
                                                        data-status={isActive ? 'active' : 'lead'}
                                                        onclick="window.GT_OpenEditClientModal && window.GT_OpenEditClientModal(this)"
                                                        class="gt-btn-outline gt-btn-xs"
                                                        title="Editar cadastro do cliente"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M12 20h9" />
                                                            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                                        </svg>
                                                        <span>Editar</span>
                                                    </button>

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

            {/* Modal Ativar / Enviar Acesso ao Portal do Cliente */}
            <div
                id="gt-portal-access-modal"
                class="gt-modal-overlay hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gt-portal-modal-title"
                onclick="if(event.target===this)window.gtClosePortalModal()"
            >
                <div class="gtb-card gt-modal-card max-w-lg !p-0 overflow-hidden">
                    {/* Cabeçalho Limpo */}
                    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="gtb-icon-box !w-10 !h-10 !rounded-xl shrink-0" aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                            </span>
                            <div class="min-w-0">
                                <h2 id="gt-portal-modal-title" class="gt-font-display text-[15px] font-extrabold text-white leading-tight">
                                    Ativar Acesso ao Portal
                                </h2>
                                <p id="gt-portal-modal-subtitle" class="text-xs text-[#8C95AA] mt-0.5 truncate">
                                    Convite seguro com link único de definição de senha
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick="window.gtClosePortalModal()"
                            class="gtb-icon-btn !w-8 !h-8 !rounded-lg shrink-0"
                            aria-label="Fechar modal"
                            title="Fechar (Esc)"
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    {/* Etapa 1: Configuração */}
                    <form id="gt-portal-access-form" class="px-6 py-5 space-y-4">
                        <input type="hidden" id="gt-pa-client-id" />

                        <div id="gt-pa-error" class="hidden rounded-xl p-3 border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400"></div>

                        {/* E-mail full-width para nunca cortar endereços longos */}
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                E-mail de Acesso *
                            </label>
                            <input
                                type="email"
                                id="gt-pa-email"
                                required
                                placeholder="cliente@empresa.com"
                                class="gt-modal-input"
                            />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                WhatsApp / Telefone
                            </label>
                            <input
                                type="text"
                                id="gt-pa-phone"
                                placeholder="+55 (11) 99999-9999"
                                class="gt-modal-input"
                                style="font-variant-numeric: tabular-nums;"
                            />
                        </div>

                        {/* Opções em lista limpa sem caixas duplas */}
                        <div class="pt-3 border-t border-white/10 space-y-3">
                            <label class="flex items-center justify-between gap-4 cursor-pointer">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white">Enviar convite automaticamente por E-mail</div>
                                    <div class="text-[11px] text-[#8C95AA] mt-0.5">Dispara o link de primeiro acesso para o endereço informado</div>
                                </div>
                                <input type="checkbox" id="gt-pa-send-email" checked class="gt-switch shrink-0" />
                            </label>

                            <label id="gt-pa-promote-row" class="flex items-center justify-between gap-4 pt-3 border-t border-white/10 cursor-pointer">
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white">Promover Lead para Cliente Ativo</div>
                                    <div class="text-[11px] text-[#8C95AA] mt-0.5">Atualiza automaticamente a categoria ao liberar o acesso</div>
                                </div>
                                <input type="checkbox" id="gt-pa-promote" checked class="gt-switch shrink-0" />
                            </label>
                        </div>

                        {/* Rodapé com selo de segurança e ações */}
                        <div class="pt-4 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
                            <span class="inline-flex items-center gap-1.5 text-[11px] text-[#8C95AA]">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <span>Link único seguro</span>
                            </span>
                            <div class="flex items-center gap-2 ml-auto">
                                <button type="button" onclick="window.gtClosePortalModal()" class="gt-btn-outline gt-btn-sm">
                                    Cancelar
                                </button>
                                <button type="submit" id="gt-pa-submit-btn" class="gt-btn-primary gt-btn-sm">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Gerar Acesso</span>
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Etapa 2: Entrega Multicanal */}
                    <div id="gt-portal-access-result" class="hidden px-6 py-5 space-y-4">
                        <div id="gt-pa-result-status" class="gtb-surface-box rounded-xl px-4 py-3 text-xs font-semibold leading-relaxed"></div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                Link Único de Primeiro Acesso
                            </label>
                            <div class="flex items-center gap-2">
                                <input
                                    type="text"
                                    id="gt-pa-link-output"
                                    readonly
                                    onclick="this.select()"
                                    class="gt-modal-input font-mono text-[11.5px] flex-1"
                                />
                                <button
                                    type="button"
                                    onclick="window.gtCopyPortalLink()"
                                    class="gt-btn-outline gt-btn-sm shrink-0"
                                    title="Copiar apenas o link"
                                >
                                    <span id="gt-pa-copy-link-lbl">Copiar</span>
                                </button>
                            </div>
                            <p class="text-[11px] text-[#8C95AA] mt-1.5">
                                Ao clicar, o cliente define sua própria senha pessoal e acessa o Portal imediatamente.
                            </p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            <a
                                id="gt-pa-wa-btn"
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="gt-btn-primary gt-btn-sm justify-center"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                <span>Enviar via WhatsApp</span>
                            </a>

                            <button
                                type="button"
                                id="gt-pa-copy-msg-btn"
                                onclick="window.gtCopyPortalMessage()"
                                class="gt-btn-petrol gt-btn-sm justify-center"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                <span id="gt-pa-copy-msg-lbl">Copiar Mensagem</span>
                            </button>
                        </div>

                        <div class="pt-3 border-t border-white/10 flex items-center justify-end">
                            <button
                                type="button"
                                onclick="window.location.reload()"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            var currentCat = ${JSON.stringify(statusFilter || 'all')};
                            var currentQuery = '';
                            var lastPortalPayload = null;

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

                            window.gtOpenPortalModal = function(data) {
                                var p = document.getElementById('gt-profile-menu'); if (p) p.classList.add('hidden');
                                var n = document.getElementById('gt-notif-dropdown'); if (n) n.classList.add('hidden');
                                var modal = document.getElementById('gt-portal-access-modal');
                                var form = document.getElementById('gt-portal-access-form');
                                var result = document.getElementById('gt-portal-access-result');
                                var err = document.getElementById('gt-pa-error');
                                if (!modal || !form || !result) return;

                                lastPortalPayload = null;
                                form.classList.remove('hidden');
                                result.classList.add('hidden');
                                if (err) { err.classList.add('hidden'); err.textContent = ''; }

                                document.getElementById('gt-pa-client-id').value = data.id;
                                document.getElementById('gt-pa-email').value = data.email || '';
                                document.getElementById('gt-pa-phone').value = data.phone || '';
                                document.getElementById('gt-pa-send-email').checked = true;

                                var titleEl = document.getElementById('gt-portal-modal-title');
                                var subEl = document.getElementById('gt-portal-modal-subtitle');
                                var promoteRow = document.getElementById('gt-pa-promote-row');
                                var promoteInput = document.getElementById('gt-pa-promote');

                                if (titleEl) titleEl.textContent = data.hasPortal ? 'Enviar Novo Acesso ao Portal' : 'Ativar Acesso ao Portal do Cliente';
                                if (subEl) subEl.textContent = 'Cliente: ' + (data.name || 'Cadastro') + ' — link seguro de definição de senha.';
                                if (promoteRow) promoteRow.style.display = data.isActive ? 'none' : '';
                                if (promoteInput) promoteInput.checked = !data.isActive;

                                modal.classList.remove('hidden');
                                setTimeout(function() {
                                    var em = document.getElementById('gt-pa-email');
                                    if (em && !em.value) em.focus();
                                }, 50);
                            };

                            window.gtClosePortalModal = function() {
                                var modal = document.getElementById('gt-portal-access-modal');
                                if (modal) modal.classList.add('hidden');
                            };

                            window.gtCopyPortalMessage = function() {
                                if (!lastPortalPayload || !lastPortalPayload.whatsapp_message) return;
                                navigator.clipboard.writeText(lastPortalPayload.whatsapp_message).then(function() {
                                    var lbl = document.getElementById('gt-pa-copy-msg-lbl');
                                    if (lbl) { lbl.textContent = 'Mensagem copiada!'; setTimeout(function() { lbl.textContent = 'Copiar Mensagem'; }, 2000); }
                                });
                            };

                            window.gtCopyPortalLink = function() {
                                if (!lastPortalPayload || !lastPortalPayload.activate_url) return;
                                navigator.clipboard.writeText(lastPortalPayload.activate_url).then(function() {
                                    var lbl = document.getElementById('gt-pa-copy-link-lbl');
                                    if (lbl) { lbl.textContent = 'Copiado!'; setTimeout(function() { lbl.textContent = 'Copiar'; }, 2000); }
                                });
                            };

                            document.addEventListener('keydown', function(e) {
                                if (e.key === 'Escape') window.gtClosePortalModal();
                            });

                            var paForm = document.getElementById('gt-portal-access-form');
                            if (paForm) {
                                paForm.addEventListener('submit', function(e) {
                                    e.preventDefault();
                                    var clientId = document.getElementById('gt-pa-client-id').value;
                                    var email = document.getElementById('gt-pa-email').value.trim();
                                    var phone = document.getElementById('gt-pa-phone').value.trim();
                                    var sendEmail = document.getElementById('gt-pa-send-email').checked;
                                    var promote = document.getElementById('gt-pa-promote').checked;
                                    var btn = document.getElementById('gt-pa-submit-btn');
                                    var err = document.getElementById('gt-pa-error');

                                    if (err) { err.classList.add('hidden'); err.textContent = ''; }
                                    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Gerando...'; }

                                    fetch('/admin/clientes/' + encodeURIComponent(clientId) + '/ativar-portal', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                        body: JSON.stringify({
                                            email: email,
                                            phone: phone,
                                            send_email: sendEmail,
                                            promote_active: promote
                                        })
                                    })
                                    .then(function(r) { return r.json().then(function(d) { return { status: r.status, data: d }; }); })
                                    .then(function(res) {
                                        if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Gerar Acesso Seguro'; }
                                        if (!res.data || !res.data.ok) {
                                            if (err) {
                                                err.textContent = (res.data && res.data.error) || 'Não foi possível ativar o acesso.';
                                                err.classList.remove('hidden');
                                            }
                                            return;
                                        }
                                        lastPortalPayload = res.data;
                                        document.getElementById('gt-portal-access-form').classList.add('hidden');
                                        document.getElementById('gt-portal-access-result').classList.remove('hidden');
                                        document.getElementById('gt-pa-link-output').value = res.data.activate_url || '';
                                        document.getElementById('gt-pa-wa-btn').href = res.data.whatsapp_url || '#';

                                        var statusBox = document.getElementById('gt-pa-result-status');
                                        if (statusBox) {
                                            var lines = ['Acesso ao Portal ativado para ' + res.data.email + '.'];
                                            if (res.data.promoted) lines.push('Lead promovido para Cliente Ativo.');
                                            if (sendEmail) {
                                                lines.push(res.data.email_sent
                                                    ? 'Convite enviado por e-mail com sucesso!'
                                                    : 'E-mail não entregue automaticamente (' + (res.data.email_error || 'verifique o domínio no Resend') + '). Use o botão WhatsApp ou Copiar abaixo.');
                                            }
                                            statusBox.textContent = lines.join(' ');
                                        }
                                    })
                                    .catch(function() {
                                        if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Gerar Acesso Seguro'; }
                                        if (err) {
                                            err.textContent = 'Erro de conexão ao ativar acesso.';
                                            err.classList.remove('hidden');
                                        }
                                    });
                                });
                            }

                            window.GT_OpenEditClientModal = function(btn) {
                                var modal = document.getElementById('modal-editar-cliente');
                                var form = document.getElementById('gt-edit-client-form');
                                if (!modal || !form || !btn) return;
                                var id = btn.getAttribute('data-id') || '';
                                form.setAttribute('action', '/admin/clientes/' + encodeURIComponent(id) + '/editar');
                                var nameEl = document.getElementById('gt-edit-client-name');
                                var companyEl = document.getElementById('gt-edit-client-company');
                                var emailEl = document.getElementById('gt-edit-client-email');
                                var phoneEl = document.getElementById('gt-edit-client-phone');
                                var docEl = document.getElementById('gt-edit-client-document');
                                var segEl = document.getElementById('gt-edit-client-segment');
                                var statusEl = document.getElementById('gt-edit-client-status');
                                if (nameEl) nameEl.value = btn.getAttribute('data-name') || '';
                                if (companyEl) companyEl.value = btn.getAttribute('data-company') || '';
                                if (emailEl) emailEl.value = btn.getAttribute('data-email') || '';
                                if (phoneEl) phoneEl.value = btn.getAttribute('data-phone') || '';
                                if (docEl) docEl.value = btn.getAttribute('data-document') || '';
                                if (segEl) segEl.value = btn.getAttribute('data-segment') || '';
                                if (statusEl) statusEl.value = btn.getAttribute('data-status') || 'active';
                                modal.style.display = 'flex';
                                if (companyEl) setTimeout(function() { companyEl.focus(); }, 40);
                            };
                        })();
                    `
                }}
            />

            {/* Modal Editar Cliente */}
            <div
                id="modal-editar-cliente"
                onclick="if(event.target===this)this.style.display='none'"
                style="display: none; position: fixed; inset: 0; margin: 0; z-index: 200; align-items: center; justify-content: center; padding: 16px;"
                class="gt-modal-overlay bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-5 sm:p-6">
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Editar Cadastro do Cliente</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-cliente').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form id="gt-edit-client-form" action="/admin/clientes/0/editar" method="post" class="space-y-3.5">
                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Empresa / Razão Social</label>
                                <input id="gt-edit-client-company" type="text" name="company" placeholder="Nome da empresa" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Contato *</label>
                                <input id="gt-edit-client-name" type="text" name="name" required placeholder="Responsável" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail</label>
                                <input id="gt-edit-client-email" type="email" name="email" placeholder="contato@empresa.com" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone / WhatsApp</label>
                                <input id="gt-edit-client-phone" type="text" name="phone" placeholder="+244 / +55 ..." class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">CPF / CNPJ / NIF</label>
                                <input id="gt-edit-client-document" type="text" name="document" placeholder="Documento fiscal" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Segmento</label>
                                <input id="gt-edit-client-segment" type="text" name="segment" placeholder="Ex: Saúde, Varejo, Contabilidade" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Categoria</label>
                            <select id="gt-edit-client-status" name="status" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="active">Cliente Ativo</option>
                                <option value="lead">Lead</option>
                            </select>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-editar-cliente').style.display='none'"
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
        </AdminLayout>
    );
};
