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

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente Operações',
    attendant: 'Atendente CRM',
    developer: 'Dev / Técnico',
    financial: 'Financeiro',
    client: 'Cliente'
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
    const inactiveUsers = users.filter((u) => !u.is_active);
    const superAdminCount = activeUsers.filter((u) => u.role === 'superadmin').length;
    const adminCount = activeUsers.filter((u) => u.role === 'admin').length;
    const teamCount = activeUsers.filter((u) => ['superadmin', 'admin', 'manager', 'attendant', 'developer', 'financial'].includes(u.role)).length;
    const staffOnlyCount = activeUsers.filter((u) => ['manager', 'attendant', 'developer', 'financial'].includes(u.role)).length;
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
                        Gestão de contas, papéis de permissão (RBAC), redefinição de acesso e sessões ativas.
                    </p>
                </div>
                <button
                    type="button"
                    onclick="document.getElementById('modal-novo-usuario').classList.remove('hidden')"
                    class="gt-btn-primary"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                    </svg>
                    <span>Novo Usuário</span>
                </button>
            </div>

            {/* 4 KPI Cards Compactos */}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Super Admin</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{superAdminCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-warning">Super</span>
                </div>

                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Administradores</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{adminCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-info">Admin</span>
                </div>

                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Equipe Operacional</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{staffOnlyCount}</span>
                    </div>
                    <span class="text-[11px] font-bold text-[#8C95AA]">Equipe</span>
                </div>

                <div class="gtb-card !p-3.5 flex items-center justify-between gap-2">
                    <div>
                        <span class="block text-[10px] font-extrabold uppercase tracking-wider text-[#8C95AA]">Clientes no Portal</span>
                        <span class="gt-font-display text-lg font-extrabold text-white mt-0.5 block">{clientCount}</span>
                    </div>
                    <span class="gt-badge gt-badge-success">Portal</span>
                </div>
            </div>

            {/* Tabela Unificada com Filtros Integrados */}
            <div class="gtb-card !p-0 overflow-hidden">
                <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                    <div id="gt-user-tabs" class="flex items-center gap-1.5 flex-wrap">
                        <button type="button" data-tab="all" onclick="window.gtFilterUserTab('all')" class="gt-btn-xs gt-btn-primary">
                            Todos ({users.length})
                        </button>
                        <button type="button" data-tab="team" onclick="window.gtFilterUserTab('team')" class="gt-btn-xs gt-btn-outline">
                            Equipe ({teamCount})
                        </button>
                        <button type="button" data-tab="client" onclick="window.gtFilterUserTab('client')" class="gt-btn-xs gt-btn-outline">
                            Clientes ({clientCount})
                        </button>
                        <button type="button" data-tab="inactive" onclick="window.gtFilterUserTab('inactive')" class="gt-btn-xs gt-btn-outline">
                            Inativos ({inactiveUsers.length})
                        </button>
                    </div>

                    <div class="flex items-center gap-2 flex-wrap">
                        <div style="width: 230px; max-width: 100%;">
                            <input
                                type="text"
                                value={search}
                                placeholder="Filtrar nome, e-mail ou empresa..."
                                oninput="window.gtFilterUserSearch(this.value)"
                                class="rounded-xl px-3 py-1.5 text-xs w-full"
                            />
                        </div>
                        <form method="get" action="/admin/usuarios" class="m-0">
                            <select name="role" onchange="this.form.submit()" class="rounded-xl px-3 py-1.5 text-xs">
                                <option value="">Todos os papéis</option>
                                <option value="superadmin" selected={roleFilter === 'superadmin'}>Super Admin</option>
                                <option value="admin" selected={roleFilter === 'admin'}>Administrador</option>
                                <option value="manager" selected={roleFilter === 'manager'}>Gerente Operações</option>
                                <option value="attendant" selected={roleFilter === 'attendant'}>Atendente CRM</option>
                                <option value="developer" selected={roleFilter === 'developer'}>Dev / Técnico</option>
                                <option value="financial" selected={roleFilter === 'financial'}>Financeiro</option>
                                <option value="client" selected={roleFilter === 'client'}>Cliente</option>
                            </select>
                        </form>
                        {(search || roleFilter) && (
                            <a href="/admin/usuarios" class="text-[11px] font-bold text-[#16749A] hover:underline">Limpar</a>
                        )}
                    </div>
                </div>

                {users.length === 0 ? (
                    <div class="gt-empty-state">Nenhum usuário localizado para os filtros informados.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                    <th class="py-2.5 px-4">Usuário</th>
                                    <th class="py-2.5 px-4">Papel / Função</th>
                                    <th class="py-2.5 px-4">Contato / Empresa</th>
                                    <th class="py-2.5 px-4">Status</th>
                                    <th class="py-2.5 px-4">Cadastro</th>
                                    <th class="py-2.5 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-white/5">
                                {users.map((u) => {
                                    const roleLabel = ROLE_LABELS[u.role] || u.role;
                                    const initials = (u.name || 'U').slice(0, 2).toUpperCase();
                                    const isSelf = u.id === currentUser.id;
                                    const isActive = Boolean(u.is_active);
                                    const groupKey = !isActive ? 'inactive' : u.role === 'client' ? 'client' : 'team';
                                    const searchBlob = `${u.name || ''} ${u.email || ''} ${u.company || ''} ${u.phone || ''} ${roleLabel}`.toLowerCase();

                                    return (
                                        <tr
                                            data-user-row="1"
                                            data-user-group={groupKey}
                                            data-user-active={isActive ? '1' : '0'}
                                            data-user-search={searchBlob}
                                            class="hover:bg-white/[0.02] transition"
                                        >
                                            <td class="py-2.5 px-4">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="gtb-avatar-inner w-8 h-8 rounded-lg border border-[#16749A]/40 flex items-center justify-center font-extrabold text-[11px] shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="font-bold text-white text-[12.5px] leading-tight whitespace-nowrap">
                                                            {u.name} {isSelf && <span class="text-[10px] font-bold text-[#8C95AA]">(Você)</span>}
                                                        </div>
                                                        <div class="text-[11px] text-[#8C95AA] truncate max-w-[230px]">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class="gt-badge gt-badge-info">{roleLabel}</span>
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                {u.company ? (
                                                    <>
                                                        <div class="font-semibold text-white text-xs">{u.company}</div>
                                                        {u.phone && <div class="text-[11px] text-[#8C95AA]" style="font-variant-numeric: tabular-nums;">{u.phone}</div>}
                                                    </>
                                                ) : (
                                                    <div class="text-xs text-[#8C95AA]" style="font-variant-numeric: tabular-nums;">{u.phone || '—'}</div>
                                                )}
                                            </td>
                                            <td class="py-2.5 px-4 whitespace-nowrap">
                                                <span class={`gt-badge ${isActive ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                                    {isActive ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td class="py-2.5 px-4 text-[#8C95AA] whitespace-nowrap" style="font-variant-numeric: tabular-nums;">
                                                {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                                            </td>
                                            <td class="py-2.5 px-4 text-right whitespace-nowrap">
                                                {isSelf ? (
                                                    <a href="/minha-conta" class="gt-btn-outline gt-btn-xs">
                                                        Minha Conta
                                                    </a>
                                                ) : (
                                                    <div class="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onclick={`window.gtOpenEditUser(${JSON.stringify({
                                                                id: u.id,
                                                                name: u.name || '',
                                                                email: u.email || '',
                                                                phone: u.phone || '',
                                                                company: u.company || '',
                                                                role: u.role || 'client',
                                                                is_active: isActive ? '1' : '0',
                                                            })})`}
                                                            class="gt-btn-outline gt-btn-xs"
                                                            title="Editar dados, papel ou senha"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                            </svg>
                                                            <span>Editar</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onclick={`window.gtOpenUserReset(${JSON.stringify({
                                                                id: u.id,
                                                                name: u.name || '',
                                                                email: u.email || '',
                                                            })})`}
                                                            class="gt-btn-outline gt-btn-xs"
                                                            title="Enviar link de redefinição de senha"
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                                                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                                            </svg>
                                                            <span>Acesso</span>
                                                        </button>

                                                        <form action={`/admin/usuarios/${u.id}/status`} method="post" class="inline-block m-0">
                                                            <input type="hidden" name="is_active" value={isActive ? '0' : '1'} />
                                                            <button
                                                                type="submit"
                                                                data-loading-text="..."
                                                                class={isActive ? 'gt-btn-outline gt-btn-xs' : 'gt-btn-petrol gt-btn-xs'}
                                                            >
                                                                {isActive ? 'Desativar' : 'Ativar'}
                                                            </button>
                                                        </form>

                                                        <form
                                                            action={`/admin/usuarios/${u.id}/excluir`}
                                                            method="post"
                                                            class="inline-block m-0"
                                                            data-confirm="Deseja realmente excluir este usuário permanentemente?"
                                                        >
                                                            <button
                                                                type="submit"
                                                                class="gt-btn-danger-ghost gt-btn-icon-only"
                                                                title="Excluir usuário"
                                                                aria-label="Excluir usuário"
                                                            >
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                                    <path d="M3 6h18" />
                                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </form>
                                                    </div>
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

            {/* Modal Editar Usuário */}
            <div
                id="modal-editar-usuario"
                class="gt-modal-overlay hidden"
                role="dialog"
                aria-modal="true"
                onclick="if(event.target===this)this.classList.add('hidden')"
            >
                <div class="gtb-card gt-modal-card max-w-lg !p-0 overflow-hidden">
                    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="gtb-icon-box !w-10 !h-10 !rounded-xl shrink-0" aria-hidden="true">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                            </span>
                            <div class="min-w-0">
                                <h2 class="gt-font-display text-[15px] font-extrabold text-white">Editar Usuário</h2>
                                <p class="text-xs text-[#8C95AA] mt-0.5">Altere dados cadastrais, papel de permissão, status ou senha.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-editar-usuario').classList.add('hidden')"
                            class="gtb-icon-btn !w-8 !h-8 !rounded-lg shrink-0"
                            aria-label="Fechar"
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form id="form-editar-usuario" action="/admin/usuarios/0/editar" method="post" data-dirty-guard="1" class="px-6 py-5 space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome Completo *</label>
                            <input type="text" id="edit-usr-name" name="name" required class="gt-modal-input" />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail de Acesso *</label>
                            <input type="email" id="edit-usr-email" name="email" required class="gt-modal-input" />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone / WhatsApp</label>
                                <input type="text" id="edit-usr-phone" name="phone" class="gt-modal-input" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Empresa / Organização</label>
                                <input type="text" id="edit-usr-company" name="company" class="gt-modal-input" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Papel / Permissão *</label>
                                <select id="edit-usr-role" name="role" required class="gt-modal-input">
                                    <option value="admin">Administrador</option>
                                    <option value="manager">Gerente Operações</option>
                                    <option value="attendant">Atendente CRM</option>
                                    <option value="developer">Dev / Técnico</option>
                                    <option value="financial">Financeiro</option>
                                    <option value="client">Cliente</option>
                                    {currentUser.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                                </select>
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Status da Conta</label>
                                <select id="edit-usr-active" name="is_active" class="gt-modal-input">
                                    <option value="1">Ativa</option>
                                    <option value="0">Inativa (Bloqueada)</option>
                                </select>
                            </div>
                        </div>

                        <div class="pt-3 border-t border-white/10">
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">
                                Nova Senha (opcional)
                            </label>
                            <input
                                type="password"
                                id="edit-usr-password"
                                name="new_password"
                                minLength={8}
                                autocomplete="new-password"
                                placeholder="Deixe vazio para manter a senha atual"
                                class="gt-modal-input"
                            />
                        </div>

                        <div class="pt-4 border-t border-white/10 flex items-center justify-between gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onclick="window.gtSubmitRevokeSessions()"
                                class="gt-btn-outline gt-btn-xs"
                                title="Desconectar este usuário de todos os dispositivos"
                            >
                                Encerrar Sessões
                            </button>
                            <div class="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onclick="document.getElementById('modal-editar-usuario').classList.add('hidden')"
                                    class="gt-btn-outline gt-btn-sm"
                                >
                                    Cancelar
                                </button>
                                <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                    <span>Salvar Alterações</span>
                                </button>
                            </div>
                        </div>
                    </form>

                    <form id="form-revogar-sessoes" action="/admin/usuarios/0/revogar-sessoes" method="post" class="hidden"></form>
                </div>
            </div>

            {/* Modal Redefinir Acesso / Enviar Link */}
            <div
                id="modal-reset-usuario"
                class="gt-modal-overlay hidden"
                role="dialog"
                aria-modal="true"
                onclick="if(event.target===this)this.classList.add('hidden')"
            >
                <div class="gtb-card gt-modal-card max-w-lg !p-0 overflow-hidden">
                    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="gtb-icon-box !w-10 !h-10 !rounded-xl shrink-0" aria-hidden="true">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                </svg>
                            </span>
                            <div class="min-w-0">
                                <h2 class="gt-font-display text-[15px] font-extrabold text-white">Redefinir Acesso</h2>
                                <p id="gt-ur-subtitle" class="text-xs text-[#8C95AA] mt-0.5 truncate"></p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-reset-usuario').classList.add('hidden')"
                            class="gtb-icon-btn !w-8 !h-8 !rounded-lg shrink-0"
                            aria-label="Fechar"
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div id="gt-ur-step1" class="px-6 py-5 space-y-4">
                        <input type="hidden" id="gt-ur-id" />
                        <div id="gt-ur-error" class="hidden rounded-xl p-3 border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400"></div>
                        <label class="flex items-center justify-between gap-4 cursor-pointer">
                            <div>
                                <div class="text-xs font-bold text-white">Enviar link automaticamente por E-mail</div>
                                <div class="text-[11px] text-[#8C95AA] mt-0.5">Gera um link único seguro para o usuário definir uma nova senha</div>
                            </div>
                            <input type="checkbox" id="gt-ur-send-email" checked class="gt-switch shrink-0" />
                        </label>
                        <div class="pt-4 border-t border-white/10 flex items-center justify-end gap-2">
                            <button type="button" onclick="document.getElementById('modal-reset-usuario').classList.add('hidden')" class="gt-btn-outline gt-btn-sm">Cancelar</button>
                            <button type="button" id="gt-ur-gen-btn" onclick="window.gtGenerateUserReset()" class="gt-btn-primary gt-btn-sm">
                                <span>Gerar Link Seguro</span>
                            </button>
                        </div>
                    </div>

                    <div id="gt-ur-step2" class="hidden px-6 py-5 space-y-4">
                        <div id="gt-ur-status" class="gtb-surface-box rounded-xl px-4 py-3 text-xs font-semibold leading-relaxed"></div>
                        <div class="flex items-center gap-2">
                            <input type="text" id="gt-ur-link" readonly onclick="this.select()" class="gt-modal-input font-mono text-[11.5px] flex-1" />
                            <button type="button" onclick="window.gtCopyUserResetLink()" class="gt-btn-outline gt-btn-sm shrink-0">
                                <span id="gt-ur-copy-lbl">Copiar</span>
                            </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <a id="gt-ur-wa-btn" href="#" target="_blank" rel="noopener noreferrer" class="gt-btn-primary gt-btn-sm justify-center">
                                <span>Enviar via WhatsApp</span>
                            </a>
                            <button type="button" onclick="window.gtCopyUserResetMsg()" class="gt-btn-petrol gt-btn-sm justify-center">
                                <span id="gt-ur-msg-lbl">Copiar Mensagem</span>
                            </button>
                        </div>
                        <div class="pt-3 border-t border-white/10 flex justify-end">
                            <button type="button" onclick="document.getElementById('modal-reset-usuario').classList.add('hidden')" class="gt-btn-outline gt-btn-sm">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Novo Usuário */}
            <div
                id="modal-novo-usuario"
                class="gt-modal-overlay hidden"
                role="dialog"
                aria-modal="true"
                onclick="if(event.target===this)this.classList.add('hidden')"
            >
                <div class="gtb-card gt-modal-card max-w-lg !p-0 overflow-hidden">
                    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-white/10">
                        <div>
                            <h2 class="gt-font-display text-[15px] font-extrabold text-white">Cadastrar Novo Usuário</h2>
                            <p class="text-xs text-[#8C95AA] mt-0.5">Defina as credenciais iniciais e o papel de acesso.</p>
                        </div>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-usuario').classList.add('hidden')"
                            class="gtb-icon-btn !w-8 !h-8 !rounded-lg shrink-0"
                            aria-label="Fechar"
                        >
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form action="/admin/usuarios" method="post" class="px-6 py-5 space-y-4">
                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Nome Completo *</label>
                            <input type="text" name="name" required placeholder="Ex: Carlos Silva" class="gt-modal-input" />
                        </div>

                        <div>
                            <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">E-mail Corporativo *</label>
                            <input type="email" name="email" required placeholder="carlos@empresa.com" class="gt-modal-input" />
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Telefone / WhatsApp</label>
                                <input type="text" name="phone" placeholder="(11) 99999-9999" class="gt-modal-input" />
                            </div>
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Empresa / Organização</label>
                                <input type="text" name="company" placeholder="GundjaTech ou Cliente" class="gt-modal-input" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Papel / Permissão *</label>
                                <select name="role" required class="gt-modal-input">
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
                                <label class="block text-[10.5px] font-extrabold uppercase tracking-wider text-[#8C95AA] mb-1.5">Senha Provisória *</label>
                                <input type="password" name="password" required minLength={8} placeholder="Mínimo 8 caracteres" class="gt-modal-input" />
                            </div>
                        </div>

                        <div class="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-usuario').classList.add('hidden')"
                                class="gt-btn-outline gt-btn-sm"
                            >
                                Cancelar
                            </button>
                            <button type="submit" data-loading-text="Criando..." class="gt-btn-primary gt-btn-sm">
                                Criar Usuário
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            var currentTab = 'all';
                            var currentQuery = ${JSON.stringify(String(search || '').toLowerCase())};
                            var lastUserReset = null;

                            function applyUserFilters() {
                                document.querySelectorAll('tr[data-user-row="1"]').forEach(function(row) {
                                    var grp = row.getAttribute('data-user-group');
                                    var blob = row.getAttribute('data-user-search') || '';
                                    var matchTab = (currentTab === 'all' || grp === currentTab);
                                    var matchQ = (!currentQuery || blob.indexOf(currentQuery) !== -1);
                                    row.style.display = (matchTab && matchQ) ? '' : 'none';
                                });
                            }

                            window.gtFilterUserTab = function(tab) {
                                currentTab = tab || 'all';
                                document.querySelectorAll('#gt-user-tabs button[data-tab]').forEach(function(btn) {
                                    var active = btn.getAttribute('data-tab') === currentTab;
                                    btn.className = 'gt-btn-xs ' + (active ? 'gt-btn-primary' : 'gt-btn-outline');
                                });
                                applyUserFilters();
                            };

                            window.gtFilterUserSearch = function(val) {
                                currentQuery = String(val || '').toLowerCase().trim();
                                applyUserFilters();
                            };

                            window.gtOpenEditUser = function(u) {
                                document.getElementById('form-editar-usuario').action = '/admin/usuarios/' + u.id + '/editar';
                                document.getElementById('form-revogar-sessoes').action = '/admin/usuarios/' + u.id + '/revogar-sessoes';
                                document.getElementById('edit-usr-name').value = u.name || '';
                                document.getElementById('edit-usr-email').value = u.email || '';
                                document.getElementById('edit-usr-phone').value = u.phone || '';
                                document.getElementById('edit-usr-company').value = u.company || '';
                                document.getElementById('edit-usr-role').value = u.role || 'client';
                                document.getElementById('edit-usr-active').value = u.is_active || '1';
                                document.getElementById('edit-usr-password').value = '';
                                if (window.GT_ResetDirtyForm) window.GT_ResetDirtyForm('form-editar-usuario');
                                document.getElementById('modal-editar-usuario').classList.remove('hidden');
                            };

                            window.gtSubmitRevokeSessions = function() {
                                var f = document.getElementById('form-revogar-sessoes');
                                if (f) f.submit();
                            };

                            window.gtOpenUserReset = function(u) {
                                lastUserReset = null;
                                document.getElementById('gt-ur-id').value = u.id;
                                document.getElementById('gt-ur-subtitle').textContent = (u.name || 'Usuário') + ' • ' + (u.email || '');
                                document.getElementById('gt-ur-send-email').checked = true;
                                document.getElementById('gt-ur-error').classList.add('hidden');
                                document.getElementById('gt-ur-step1').classList.remove('hidden');
                                document.getElementById('gt-ur-step2').classList.add('hidden');
                                document.getElementById('modal-reset-usuario').classList.remove('hidden');
                            };

                            window.gtGenerateUserReset = function() {
                                var id = document.getElementById('gt-ur-id').value;
                                var sendEmail = document.getElementById('gt-ur-send-email').checked;
                                var btn = document.getElementById('gt-ur-gen-btn');
                                var err = document.getElementById('gt-ur-error');
                                err.classList.add('hidden');
                                btn.disabled = true;
                                btn.querySelector('span').textContent = 'Gerando...';

                                fetch('/admin/usuarios/' + encodeURIComponent(id) + '/reset-link', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                                    body: JSON.stringify({ send_email: sendEmail })
                                })
                                .then(function(r) { return r.json(); })
                                .then(function(data) {
                                    btn.disabled = false;
                                    btn.querySelector('span').textContent = 'Gerar Link Seguro';
                                    if (!data || !data.ok) {
                                        err.textContent = (data && data.error) || 'Não foi possível gerar o link.';
                                        err.classList.remove('hidden');
                                        return;
                                    }
                                    lastUserReset = data;
                                    document.getElementById('gt-ur-step1').classList.add('hidden');
                                    document.getElementById('gt-ur-step2').classList.remove('hidden');
                                    document.getElementById('gt-ur-link').value = data.reset_url || '';
                                    document.getElementById('gt-ur-wa-btn').href = data.whatsapp_url || '#';
                                    var st = document.getElementById('gt-ur-status');
                                    st.textContent = sendEmail
                                        ? (data.email_sent
                                            ? 'Link gerado e enviado por e-mail para ' + data.email + '!'
                                            : 'Link gerado! (E-mail não entregue automaticamente: ' + (data.email_error || 'verifique o Resend') + '). Use WhatsApp ou Copiar abaixo.')
                                        : 'Link seguro gerado para ' + data.email + '.';
                                })
                                .catch(function() {
                                    btn.disabled = false;
                                    btn.querySelector('span').textContent = 'Gerar Link Seguro';
                                    err.textContent = 'Erro de conexão ao gerar link.';
                                    err.classList.remove('hidden');
                                });
                            };

                            window.gtCopyUserResetLink = function() {
                                if (!lastUserReset || !lastUserReset.reset_url) return;
                                navigator.clipboard.writeText(lastUserReset.reset_url).then(function() {
                                    var el = document.getElementById('gt-ur-copy-lbl');
                                    if (el) { el.textContent = 'Copiado!'; setTimeout(function() { el.textContent = 'Copiar'; }, 2000); }
                                });
                            };

                            window.gtCopyUserResetMsg = function() {
                                if (!lastUserReset || !lastUserReset.whatsapp_message) return;
                                navigator.clipboard.writeText(lastUserReset.whatsapp_message).then(function() {
                                    var el = document.getElementById('gt-ur-msg-lbl');
                                    if (el) { el.textContent = 'Copiada!'; setTimeout(function() { el.textContent = 'Copiar Mensagem'; }, 2000); }
                                });
                            };

                            document.addEventListener('keydown', function(e) {
                                if (e.key === 'Escape') {
                                    ['modal-editar-usuario', 'modal-reset-usuario', 'modal-novo-usuario'].forEach(function(id) {
                                        var m = document.getElementById(id);
                                        if (m) m.classList.add('hidden');
                                    });
                                }
                            });
                        })();
                    `
                }}
            />
        </AdminLayout>
    );
};
