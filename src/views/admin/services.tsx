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
                        Catálogo de Pacotes e Soluções Digitais
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

            {/* 4 KPIs Executivos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div class="gtb-card gtb-kpi-gold !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Total de Pacotes</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{services.length}</div>
                    <div class="text-[11px] text-[#8C95AA]">no catálogo comercial</div>
                </div>
                <div class="gtb-card gtb-kpi-petrol !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Serviços Ativos</span>
                    <div class="gt-font-display text-2xl font-extrabold text-[#34D399]">{activeCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">visíveis para clientes</div>
                </div>
                <div class="gtb-card !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Pausados / Inativos</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{inactiveCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">ocultos no site</div>
                </div>
                <div class="gtb-card gtb-kpi-blue !p-5 flex flex-col justify-between gap-1.5">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Ticket Médio Base</span>
                    <div class="gt-font-display text-xl sm:text-2xl font-extrabold text-[#F2C230]">{formatBRL(avgPrice)}</div>
                    <div class="text-[11px] text-[#8C95AA]">média dos pacotes</div>
                </div>
            </div>

            {/* Tabela de Serviços */}
            <div class="gtb-card !p-0 overflow-hidden">
                {services.length === 0 ? (
                    <div class="gt-empty-state">Nenhum serviço cadastrado.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Serviço / Pacote</th>
                                    <th class="py-3.5 px-5">Categoria</th>
                                    <th class="py-3.5 px-5">Preço Base</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {services.map((s: any) => {
                                    const title = s.name || s.title || 'Serviço';
                                    const desc = s.short_description || s.summary || s.slug || '';
                                    const catKey = s.category || 'sites';
                                    const catLabel = s.category_name || CATEGORY_LABELS[catKey] || 'Geral';
                                    const price = Number(s.base_price ?? s.price ?? 0);

                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5 min-w-[240px]">
                                                <div class="font-bold text-white text-[13px]">{title}</div>
                                                {desc && <div class="text-[11px] text-[#8C95AA] mt-0.5 leading-snug">{desc}</div>}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class="gt-badge gt-badge-info">{catLabel}</span>
                                            </td>
                                            <td class="py-3.5 px-5 font-mono font-extrabold text-[#F2C230] whitespace-nowrap">
                                                {formatBRL(price)}
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`gt-badge ${s.is_active ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                                    {s.is_active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                <div class="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        class="gt-btn-outline gt-btn-xs"
                                                        data-svc-id={s.id}
                                                        data-svc-title={title}
                                                        data-svc-category={catKey}
                                                        data-svc-summary={desc}
                                                        data-svc-price={price}
                                                        data-svc-active={s.is_active ? '1' : '0'}
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
                                                            class={s.is_active ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}
                                                        >
                                                            {s.is_active ? 'Desativar' : 'Reativar'}
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
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-lg p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-5">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Editar Pacote de Serviço</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-servico').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form id="form-editar-servico" action="/admin/servicos/0/editar" method="post" class="space-y-4">
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
                                onclick="document.getElementById('modal-editar-servico').style.display='none'"
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
                        window.gtOpenEditService = function(btn) {
                            var id = btn.getAttribute('data-svc-id');
                            document.getElementById('form-editar-servico').action = '/admin/servicos/' + id + '/editar';
                            document.getElementById('edit-svc-title').value = btn.getAttribute('data-svc-title') || '';
                            document.getElementById('edit-svc-category').value = btn.getAttribute('data-svc-category') || 'sites';
                            document.getElementById('edit-svc-summary').value = btn.getAttribute('data-svc-summary') || '';
                            document.getElementById('edit-svc-price').value = btn.getAttribute('data-svc-price') || '0';
                            document.getElementById('edit-svc-active').value = btn.getAttribute('data-svc-active') || '1';
                            document.getElementById('modal-editar-servico').style.display = 'flex';
                        };
                    `
                }}
            />
        </AdminLayout>
    );
};
