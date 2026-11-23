import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminServicesProps {
    currentUser: any;
    services: any[];
    categories: any[];
    isCreate?: boolean;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    sites: 'Websites & Portais',
    ecommerce: 'E-commerce B2B/B2C',
    software: 'Software & SaaS',
    infra: 'Infra & Cloudflare'
};

function formatBRL(val: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val || 0));
}

export const AdminServicesView: FC<AdminServicesProps> = ({
    currentUser,
    services = [],
    categories = [],
    isCreate = false,
    successMessage,
    errorMessage
}) => {
    if (isCreate) {
        return (
            <AdminLayout
                title="Novo Serviço • Painel Administrativo"
                activeNav="services"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div class="gt-detail-toolbar">
                    <a href="/admin/servicos" class="gt-back-link">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        <span>Voltar para Serviços</span>
                    </a>
                </div>

                <form action="/admin/servicos" method="post" class="gt-grid-detail items-start">
                    {/* Coluna Principal: Dados do Pacote */}
                    <section class="gtb-card gtb-kpi-gold space-y-5 min-w-0">
                        <div>
                            <h1 class="gt-font-display text-xl font-extrabold text-white">Cadastrar Novo Pacote de Serviço</h1>
                            <p class="text-xs text-[#8C95AA] mt-1">
                                Configure título, categoria, descrição comercial e valor base exibidos no site e nos orçamentos.
                            </p>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Categoria do Serviço *</label>
                                <select name="category_id" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="">Selecione uma categoria...</option>
                                    {categories.map((c: any) => (
                                        <option value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Preço Base de Referência (R$)</label>
                                <input type="number" step="0.01" min="0" name="base_price" placeholder="4800.00" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Pacote *</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Ex: Criação de E-commerce B2B com Checkout Customizado"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição Resumida (Subtítulo Comercial)</label>
                            <input
                                type="text"
                                name="short_description"
                                placeholder="Ex: Arquitetura completa, catálogo dinâmico e integração com ERP"
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                            />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Escopo Detalhado (Opcional)</label>
                            <textarea
                                name="description"
                                rows={4}
                                placeholder="Detalhe entregáveis, tecnologias, SLA e diferenciais deste pacote..."
                                class="w-full rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                            ></textarea>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <a href="/admin/servicos" class="gt-btn-outline gt-btn-sm">Cancelar</a>
                            <button type="submit" data-loading-text="Cadastrando..." class="gt-btn-primary gt-btn-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Cadastrar Pacote</span>
                            </button>
                        </div>
                    </section>

                    {/* Coluna Lateral: Publicação & Referência */}
                    <aside class="gtb-card space-y-4 min-w-0">
                        <div>
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Publicação &amp; Visibilidade</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Defina como este pacote aparece no catálogo.</p>
                        </div>

                        <div class="gtb-surface-box rounded-xl divide-y divide-white/10 overflow-hidden">
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Pacote Ativo</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Disponível imediatamente no site e orçamentos</div>
                                </div>
                                <input type="checkbox" name="is_active" value="1" checked class="gt-switch" />
                            </label>
                            <label class="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                                <div>
                                    <div class="text-xs font-bold text-white">Destaque Comercial</div>
                                    <div class="text-[10.5px] text-[#8C95AA]">Prioriza este pacote nas recomendações da IA</div>
                                </div>
                                <input type="checkbox" name="is_featured" value="1" class="gt-switch" />
                            </label>
                        </div>

                        <div class="gtb-surface-box rounded-xl p-4 space-y-2 text-[11.5px] text-[#8C95AA] leading-relaxed">
                            <div class="font-extrabold text-white text-xs">Dica GundjaTech</div>
                            <p class="m-0">
                                Use nomes claros e objetivos com o benefício principal no subtítulo. O preço base serve como referência para o Agente IA gerar pré-orçamentos precisos.
                            </p>
                        </div>
                    </aside>
                </form>
            </AdminLayout>
        );
    }

    const activeCount = services.filter((s) => s.is_active).length;
    const inactiveCount = services.length - activeCount;
    const avgPrice =
        services.length > 0
            ? services.reduce((acc, s) => acc + Number(s.base_price ?? s.price ?? 0), 0) / services.length
            : 0;

    return (
        <AdminLayout
            title="Serviços & Catálogo • Painel Administrativo GundjaTech"
            activeNav="services"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">
                        Catálogo de Pacotes
                    </h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Gerencie os serviços ofertados no site institucional e disponíveis no formulário de orçamento.
                    </p>
                </div>
                <a href="/admin/servicos/novo" class="gt-btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Pacote</span>
                </a>
            </div>

            {/* 4 KPIs Executivos Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total de Pacotes</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{services.length}</span>
                    </div>
                    <span class="text-[11px] font-bold text-[#8C95AA]">Catálogo</span>
                </div>
                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Serviços Ativos</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{activeCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Ativo</span>
                </div>
                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Pausados / Inativos</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{inactiveCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Inativo</span>
                </div>
                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Ticket Médio Base</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{formatBRL(avgPrice)}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Média</span>
                </div>
            </div>

            {/* Tabela de Serviços com Filtros Integrados */}
            <div class="gtb-card !p-0 overflow-hidden">
                <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div id="gt-svc-tabs" class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" data-tab="all" onclick="window.gtFilterServiceTab('all')" class="gt-btn-xs gt-btn-primary">
                            Todos ({services.length})
                        </button>
                        <button type="button" data-tab="active" onclick="window.gtFilterServiceTab('active')" class="gt-btn-xs gt-btn-outline">
                            Ativos ({activeCount})
                        </button>
                        <button type="button" data-tab="inactive" onclick="window.gtFilterServiceTab('inactive')" class="gt-btn-xs gt-btn-outline">
                            Inativos ({inactiveCount})
                        </button>
                    </div>

                    <div style="width: 240px; max-width: 100%;">
                        <input
                            type="text"
                            placeholder="Filtrar serviço ou categoria..."
                            oninput="window.gtFilterServiceSearch(this.value)"
                            class="rounded-xl px-3 py-1.5 text-xs w-full"
                        />
                    </div>
                </div>

                {services.length === 0 ? (
                    <div class="gt-empty-state">Nenhum serviço cadastrado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-2.5 px-4">Serviço / Pacote</th>
                                    <th class="py-2.5 px-4">Categoria</th>
                                    <th class="py-2.5 px-4">Preço Base</th>
                                    <th class="py-2.5 px-4">Status</th>
                                    <th class="py-2.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {services.map((s: any) => {
                                    const title = s.name || s.title || 'Serviço';
                                    const desc = s.short_description || s.summary || s.slug || '';
                                    const lowerTitle = String(title).toLowerCase();
                                    const inferredLabel =
                                        lowerTitle.includes('tráfego') || lowerTitle.includes('ads')
                                            ? 'Tráfego Pago'
                                            : lowerTitle.includes('domínio') || lowerTitle.includes('dns')
                                            ? 'Domínios & DNS'
                                            : lowerTitle.includes('e-commerce') || lowerTitle.includes('loja')
                                            ? 'E-Commerce'
                                            : lowerTitle.includes('ciber') || lowerTitle.includes('segurança')
                                            ? 'Cibersegurança'
                                            : 'Websites & Portais';
                                    const catKey = s.category || 'sites';
                                    const catLabel =
                                        s.category_name && s.category_name !== 'Websites & Portais'
                                            ? s.category_name
                                            : s.category && s.category !== 'sites' && CATEGORY_LABELS[s.category]
                                            ? CATEGORY_LABELS[s.category]
                                            : inferredLabel;
                                    const price = Number(s.base_price ?? s.price ?? 0);
                                    const isActive = Boolean(s.is_active);
                                    const searchBlob = `${title} ${desc} ${catLabel}`.toLowerCase();

                                    return (
                                        <tr
                                            data-svc-row="1"
                                            data-svc-state={isActive ? 'active' : 'inactive'}
                                            data-svc-search={searchBlob}
                                            class="hover:bg-white/[0.02] transition"
                                        >
                                            <td class="py-2.5 px-4">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <span class="gtb-icon-box !w-7 !h-7" aria-hidden="true">
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                                        </svg>
                                                    </span>
                                                    <div class="min-w-0">
                                                        <div class="font-bold text-white text-[12.5px] leading-tight truncate max-w-[340px]">{title}</div>
                                                        {desc && <div class="text-[11px] text-[#8C95AA] mt-0.5 truncate max-w-[380px]" title={desc}>{desc}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class="text-xs font-semibold text-[#8C95AA]">{catLabel}</span>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class="font-extrabold text-[12.5px] text-white" style="font-variant-numeric: tabular-nums;">
                                                    {formatBRL(price)}
                                                </span>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class={`gt-badge ${isActive ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                                    {isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td class="py-2.5 px-4 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        class="gt-btn-outline gt-btn-xs"
                                                        data-svc-id={s.id}
                                                        data-svc-title={title}
                                                        data-svc-category={catKey}
                                                        data-svc-summary={desc}
                                                        data-svc-price={price}
                                                        data-svc-active={isActive ? '1' : '0'}
                                                        onclick="window.gtOpenEditService(this)"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                        </svg>
                                                        <span>Editar</span>
                                                    </button>

                                                    <form action={`/admin/servicos/${s.id}/toggle`} method="post" class="inline-block m-0">
                                                        <button
                                                            type="submit"
                                                            data-loading-text="..."
                                                            class={isActive ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}
                                                        >
                                                            {isActive ? 'Desativar' : 'Reativar'}
                                                        </button>
                                                    </form>

                                                    <form
                                                        action={`/admin/servicos/${s.id}/excluir`}
                                                        method="post"
                                                        class="inline-block m-0"
                                                        data-confirm="Deseja realmente excluir este pacote de serviço permanentemente?"
                                                    >
                                                        <button
                                                            type="submit"
                                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                                            title="Excluir pacote"
                                                            aria-label="Excluir pacote"
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

            {/* Modal Editar Pacote de Serviço */}
            <div
                id="modal-editar-servico"
                class="gt-modal-overlay hidden"
                onclick="if(event.target===this)this.classList.add('hidden')"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Editar Pacote de Serviço</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-servico').classList.add('hidden')"
                            class="gtb-icon-btn !w-8 !h-8 rounded-lg"
                            aria-label="Fechar"
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <form id="form-editar-servico" action="/admin/servicos/0/editar" method="post" data-dirty-guard="1" class="space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome do Pacote *</label>
                            <input type="text" id="edit-svc-title" name="title" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Categoria</label>
                                <select id="edit-svc-category" name="category" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    {categories.map((c: any) => (
                                        <option value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Preço Base (R$)</label>
                                <input type="number" step="0.01" min="0" id="edit-svc-price" name="price" class="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Descrição Resumida</label>
                            <textarea id="edit-svc-summary" name="summary" rows={3} class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"></textarea>
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status</label>
                            <select id="edit-svc-active" name="is_active" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                <option value="1">Ativo</option>
                                <option value="0">Inativo</option>
                            </select>
                        </div>

                        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-editar-servico').classList.add('hidden')"
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
                        (function() {
                            var currentSvcTab = 'all';
                            var currentSvcQuery = '';

                            function applySvcFilters() {
                                document.querySelectorAll('tr[data-svc-row="1"]').forEach(function(row) {
                                    var st = row.getAttribute('data-svc-state');
                                    var blob = row.getAttribute('data-svc-search') || '';
                                    var matchTab = (currentSvcTab === 'all' || st === currentSvcTab);
                                    var matchQ = (!currentSvcQuery || blob.indexOf(currentSvcQuery) !== -1);
                                    row.style.display = (matchTab && matchQ) ? '' : 'none';
                                });
                            }

                            window.gtFilterServiceTab = function(tab) {
                                currentSvcTab = tab || 'all';
                                document.querySelectorAll('#gt-svc-tabs button[data-tab]').forEach(function(btn) {
                                    var active = btn.getAttribute('data-tab') === currentSvcTab;
                                    btn.className = 'gt-btn-xs ' + (active ? 'gt-btn-primary' : 'gt-btn-outline');
                                });
                                applySvcFilters();
                            };

                            window.gtFilterServiceSearch = function(val) {
                                currentSvcQuery = String(val || '').toLowerCase().trim();
                                applySvcFilters();
                            };

                            window.gtOpenEditService = function(btn) {
                                var id = btn.getAttribute('data-svc-id');
                                document.getElementById('form-editar-servico').action = '/admin/servicos/' + id + '/editar';
                                document.getElementById('edit-svc-title').value = btn.getAttribute('data-svc-title') || '';
                                document.getElementById('edit-svc-category').value = btn.getAttribute('data-svc-category') || 'sites';
                                document.getElementById('edit-svc-summary').value = btn.getAttribute('data-svc-summary') || '';
                                document.getElementById('edit-svc-price').value = btn.getAttribute('data-svc-price') || '0';
                                document.getElementById('edit-svc-active').value = btn.getAttribute('data-svc-active') || '1';
                                if (window.GT_ResetDirtyForm) window.GT_ResetDirtyForm('form-editar-servico');
                                document.getElementById('modal-editar-servico').classList.remove('hidden');
                            };

                            document.addEventListener('keydown', function(e) {
                                if (e.key === 'Escape') {
                                    var m = document.getElementById('modal-editar-servico');
                                    if (m) m.classList.add('hidden');
                                }
                            });
                        })();
                    `
                }}
            />
        </AdminLayout>
    );
};
