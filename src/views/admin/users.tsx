import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminUsersProps {
    currentUser: any;
    users: any[];
    search?: string;
    roleFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const ROLE_LABELS: Record<string, { label: string; badgeClass: string }> = {
    superadmin: { label: 'Super Admin', badgeClass: 'bg-[#F2C230]/15 text-[#F2C230]' },
    admin: { label: 'Administrador', badgeClass: 'bg-[#F2C230]/15 text-[#F2C230]' },
    manager: { label: 'Gerente Operações', badgeClass: 'bg-sky-500/15 text-sky-300' },
    attendant: { label: 'Atendente CRM', badgeClass: 'bg-sky-500/15 text-sky-300' },
    developer: { label: 'Dev / Técnico', badgeClass: 'bg-sky-500/15 text-sky-300' },
    financial: { label: 'Financeiro', badgeClass: 'bg-sky-500/15 text-sky-300' },
    client: { label: 'Cliente', badgeClass: 'bg-emerald-500/15 text-[#6EE7B7]' }
};

export const AdminUsersView: FC<AdminUsersProps> = ({
    currentUser,
    users = [],
    search = '',
    roleFilter = '',
    successMessage,
    errorMessage
}) => {
    const activeUsers = users.filter((u) => u.is_active);
    const superAdminCount = activeUsers.filter((u) => u.role === 'superadmin').length;
    const adminCount = activeUsers.filter((u) => u.role === 'admin').length;
    const teamCount = activeUsers.filter((u) => ['manager', 'attendant', 'developer', 'financial'].includes(u.role)).length;
    const clientCount = activeUsers.filter((u) => u.role === 'client').length;

    return (
        <AdminLayout
            title="Equipe & Permissões • Painel Administrativo"
            activeNav="users"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Equipe, Colaboradores &amp; Usuários</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Gestão de acesso, credenciais, papéis de autorização (RBAC) e status de contas.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-novo-usuario').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Convidar / Criar Usuário</span>
                </button>
            </div>

            {/* 4 KPI Cards de Papéis (RBAC Executive Overview) */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="gtb-card gtb-kpi-gold flex flex-col justify-between gap-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#F2C230]">Super Administrador</span>
                        <span class="w-2 h-2 rounded-full bg-[#F2C230]"></span>
                    </div>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{superAdminCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">usuário(s) ativo(s)</div>
                </div>

                <div class="gtb-card gtb-kpi-blue flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Administrador</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{adminCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">usuário(s) ativo(s)</div>
                </div>

                <div class="gtb-card gtb-kpi-petrol flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Equipe Operacional</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{teamCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">usuário(s) ativo(s)</div>
                </div>

                <div class="gtb-card flex flex-col justify-between gap-2">
                    <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Cliente</span>
                    <div class="gt-font-display text-2xl font-extrabold text-white">{clientCount}</div>
                    <div class="text-[11px] text-[#8C95AA]">usuário(s) ativo(s)</div>
                </div>
            </div>

            {/* Filtros */}
            <div class="gtb-card !p-4">
                <form method="get" action="/admin/usuarios" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, email ou empresa..."
                            class="w-full rounded-xl px-3.5 py-2.5 text-[13px]"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select name="role" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                            <option value="">Todos os Papéis</option>
                            <option value="superadmin" selected={roleFilter === 'superadmin'}>Super Admin</option>
                            <option value="admin" selected={roleFilter === 'admin'}>Administrador</option>
                            <option value="manager" selected={roleFilter === 'manager'}>Gerente Operações</option>
                            <option value="attendant" selected={roleFilter === 'attendant'}>Atendente CRM</option>
                            <option value="developer" selected={roleFilter === 'developer'}>Dev / Técnico</option>
                            <option value="financial" selected={roleFilter === 'financial'}>Financeiro</option>
                            <option value="client" selected={roleFilter === 'client'}>Cliente</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline">Filtrar</button>
                    {(search || roleFilter) && (
                        <a href="/admin/usuarios" class="text-xs font-bold text-[#F2C230] underline">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Usuários */}
            <div class="gtb-card !p-0 overflow-hidden">
                {users.length === 0 ? (
                    <div class="gt-empty-state">Nenhum usuário localizado para os filtros informados.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-3.5 px-5">Usuário</th>
                                    <th class="py-3.5 px-5">Papel / Função</th>
                                    <th class="py-3.5 px-5">Contato / Empresa</th>
                                    <th class="py-3.5 px-5">Status</th>
                                    <th class="py-3.5 px-5">Cadastro</th>
                                    <th class="py-3.5 px-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {users.map((u) => {
                                    const roleMeta = ROLE_LABELS[u.role] || { label: u.role, badgeClass: 'bg-sky-500/15 text-sky-300' };
                                    const initials = (u.name || 'U').slice(0, 2).toUpperCase();
                                    const isSelf = u.id === currentUser.id;

                                    return (
                                        <tr class="hover:bg-white/[0.02] transition">
                                            <td class="py-3.5 px-5">
                                                <div class="flex items-center gap-3">
                                                    <div class="gtb-avatar-inner w-9 h-9 rounded-xl border border-[#16749A]/40 flex items-center justify-center font-extrabold text-xs shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="font-bold text-white whitespace-nowrap">
                                                            {u.name} {isSelf && <span class="text-[10px] font-extrabold text-[#F2C230]">(Você)</span>}
                                                        </div>
                                                        <div class="text-[11.5px] text-[#8C95AA]">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <span class={`inline-flex px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold uppercase ${roleMeta.badgeClass}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                <div class="font-semibold text-white">{u.company || '—'}</div>
                                                <div class="text-[11px] text-[#8C95AA]">{u.phone || 'Sem telefone'}</div>
                                            </td>
                                            <td class="py-3.5 px-5 whitespace-nowrap">
                                                {u.is_active ? (
                                                    <span class="inline-flex px-2.5 py-1 rounded-lg bg-emerald-500/15 text-[#6EE7B7] text-[10.5px] font-extrabold uppercase">Ativo</span>
                                                ) : (
                                                    <span class="inline-flex px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10.5px] font-extrabold uppercase">Inativo</span>
                                                )}
                                            </td>
                                            <td class="py-3.5 px-5 text-[#8C95AA] whitespace-nowrap">
                                                {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td class="py-3.5 px-5 text-right whitespace-nowrap">
                                                {!isSelf && (
                                                    <form action={`/admin/usuarios/${u.id}/status`} method="post" class="inline-block m-0">
                                                        <input type="hidden" name="is_active" value={u.is_active ? '0' : '1'} />
                                                        <button
                                                            type="submit"
                                                            class={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                                                                u.is_active
                                                                    ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
                                                                    : 'bg-emerald-500/15 text-[#6EE7B7] hover:bg-emerald-500/25'
                                                            }`}
                                                        >
                                                            {u.is_active ? 'Desativar' : 'Ativar'}
                                                        </button>
                                                    </form>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Novo Usuário */}
            <div
                id="modal-novo-usuario"
                style="display: none; position: fixed; inset: 0; z-index: 100; align-items: center; justify-content: center; padding: 16px;"
                class="bg-black/80 backdrop-blur-xs"
            >
                <div class="gtb-card gt-modal-card max-w-xl p-6 sm:p-8">
                    <div class="flex items-center justify-between gap-3 mb-6">
                        <h2 class="gt-font-display text-lg font-extrabold text-white">Cadastrar Novo Usuário</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-usuario').style.display='none'"
                            class="text-[#8C95AA] hover:text-white text-xl leading-none cursor-pointer bg-transparent border-0"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/usuarios" method="post" class="space-y-4">
                        <div class="gt-grid-2">
                            <div style="grid-column: span 2;">
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome Completo *</label>
                                <input type="text" name="name" required placeholder="Ex: Carlos Silva" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail Corporativo *</label>
                                <input type="email" name="email" required placeholder="carlos@empresa.com" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone / WhatsApp</label>
                                <input type="text" name="phone" placeholder="(11) 99999-9999" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Papel / Permissão *</label>
                                <select name="role" required class="w-full rounded-xl px-3.5 py-2.5 text-[13px]">
                                    <option value="admin">Administrador Geral</option>
                                    <option value="manager">Gerente Operações</option>
                                    <option value="attendant">Atendente CRM</option>
                                    <option value="developer">Desenvolvedor / Técnico</option>
                                    <option value="financial">Financeiro</option>
                                    <option value="client">Cliente</option>
                                    {currentUser.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                                </select>
                            </div>

                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Empresa / Organização</label>
                                <input type="text" name="company" placeholder="GundjaTech ou Cliente" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>

                            <div style="grid-column: span 2;">
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Senha Provisória *</label>
                                <input type="password" name="password" required minLength={8} placeholder="Mínimo 8 caracteres" class="w-full rounded-xl px-3.5 py-2.5 text-[13px]" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-usuario').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" class="gt-btn-primary">
                                Criar Usuário
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
