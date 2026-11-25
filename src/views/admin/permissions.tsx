import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';
import {
    CONFIGURABLE_STAFF_ROLES,
    DEFAULT_ROLE_PERMISSIONS,
    DynamicRbacConfig,
    RBAC_MODULES,
    resolveEffectivePermissions
} from '../../lib/rbac';
import { UserRole } from '../../types/env';

interface AdminPermissionsProps {
    currentUser: any;
    staffUsers: any[];
    rbacConfig: DynamicRbacConfig;
    selectedTab?: 'roles' | 'users';
    selectedRole?: UserRole;
    selectedUserId?: number | null;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Super Admin',
    admin: 'Administrador',
    manager: 'Gerente de Operações',
    attendant: 'Atendente CRM',
    developer: 'Dev / Técnico',
    financial: 'Financeiro',
    client: 'Cliente'
};

export const AdminPermissionsView: FC<AdminPermissionsProps> = ({
    currentUser,
    staffUsers = [],
    rbacConfig,
    selectedTab = 'roles',
    selectedRole = 'manager',
    selectedUserId = null,
    successMessage,
    errorMessage
}) => {
    const isSuperAdmin = currentUser?.role === 'superadmin';
    const activeRoleMeta = CONFIGURABLE_STAFF_ROLES.find((r) => r.key === selectedRole) || CONFIGURABLE_STAFF_ROLES[1];
    const activeRolePerms = new Set(resolveEffectivePermissions(activeRoleMeta.key, null, rbacConfig));
    const isRoleCustomized = Array.isArray(rbacConfig.roleOverrides[activeRoleMeta.key]);
    const canEditSelectedRole = activeRoleMeta.key !== 'admin' || isSuperAdmin;

    const editableUsers = staffUsers.filter((u) => u.role !== 'superadmin');
    const activeUser = editableUsers.find((u) => Number(u.id) === Number(selectedUserId)) || editableUsers[0] || null;
    const activeUserHasOverride = activeUser ? Array.isArray(rbacConfig.userOverrides[String(activeUser.id)]) : false;
    const activeUserPerms = activeUser
        ? new Set(resolveEffectivePermissions(activeUser.role as UserRole, activeUser.id, rbacConfig))
        : new Set<string>();
    const canEditSelectedUser = Boolean(activeUser && (activeUser.role !== 'admin' || isSuperAdmin));

    return (
        <AdminLayout
            title="Acessos & Permissões • Painel Administrativo"
            activeNav="permissions"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header !mb-0">
                <div>
                    <h1 class="gt-font-display text-xl sm:text-2xl font-extrabold text-white">Acessos &amp; Permissões</h1>
                    <p class="text-xs sm:text-sm text-[#8C95AA] mt-1">
                        Defina exatamente quais páginas do menu cada cargo ou usuário específico pode visualizar, editar e excluir.
                    </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 flex-wrap">
                    <a
                        href={`/admin/permissoes?tab=roles&role=${activeRoleMeta.key}`}
                        class={selectedTab === 'roles' ? 'gt-btn-primary gt-btn-sm' : 'gt-btn-outline gt-btn-sm'}
                    >
                        <span>Permissões por Cargo</span>
                    </a>
                    <a
                        href={`/admin/permissoes?tab=users${activeUser ? `&user_id=${activeUser.id}` : ''}`}
                        class={selectedTab === 'users' ? 'gt-btn-primary gt-btn-sm' : 'gt-btn-outline gt-btn-sm'}
                    >
                        <span>Acesso Individual por Usuário</span>
                    </a>
                </div>
            </div>

            {selectedTab === 'roles' ? (
                <div class="gt-grid-detail items-start">
                    {/* Coluna Principal: Matriz de Páginas & Ações do Cargo Selecionado */}
                    <section class="gtb-card !p-5 space-y-4 min-w-0">
                        <div class="flex items-center justify-between gap-3 flex-wrap pb-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h2 class="gt-font-display text-base font-extrabold text-white">{activeRoleMeta.label}</h2>
                                    <span class={`gt-badge ${isRoleCustomized ? 'gt-badge-warning' : 'gt-badge-info'}`}>
                                        {isRoleCustomized ? 'Personalizado' : 'Padrão do Sistema'}
                                    </span>
                                </div>
                                <p class="text-xs text-[#8C95AA] mt-0.5">{activeRoleMeta.summary}</p>
                            </div>
                            {isRoleCustomized && canEditSelectedRole && (
                                <form action="/admin/permissoes/cargo/reset" method="post" class="m-0">
                                    <input type="hidden" name="role" value={activeRoleMeta.key} />
                                    <button type="submit" class="gt-btn-outline gt-btn-xs">
                                        Restaurar Padrão
                                    </button>
                                </form>
                            )}
                        </div>

                        {!canEditSelectedRole && (
                            <div class="gtb-surface-box rounded-xl px-4 py-3 text-xs text-[#8C95AA]">
                                Apenas um <strong class="text-white">Super Admin</strong> pode alterar as permissões do cargo <strong class="text-white">Administrador</strong>.
                            </div>
                        )}

                        <form action="/admin/permissoes/cargo" method="post" class="space-y-4 m-0">
                            <input type="hidden" name="role" value={activeRoleMeta.key} />
                            <div class="gt-table-wrap">
                                <table class="w-full text-left text-xs">
                                    <thead>
                                        <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                            <th class="py-2.5 px-3">Página / Módulo do Menu</th>
                                            <th class="py-2.5 px-3 text-center">Visualizar</th>
                                            <th class="py-2.5 px-3 text-center">Editar / Gerenciar</th>
                                            <th class="py-2.5 px-3 text-center">Excluir</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-white/5">
                                        {RBAC_MODULES.map((mod) => (
                                            <tr>
                                                <td class="py-3 px-3">
                                                    <div class="font-bold text-white">{mod.label}</div>
                                                    <div class="text-[11px] text-[#8C95AA] mt-0.5">{mod.description}</div>
                                                </td>
                                                <td class="py-3 px-3 text-center">
                                                    {mod.viewPerm ? (
                                                        <input
                                                            type="checkbox"
                                                            name="permissions"
                                                            value={mod.viewPerm}
                                                            checked={activeRolePerms.has(mod.viewPerm)}
                                                            disabled={!canEditSelectedRole}
                                                            class="gt-switch"
                                                            aria-label={`Visualizar ${mod.label}`}
                                                        />
                                                    ) : (
                                                        <span class="text-[#8C95AA]">—</span>
                                                    )}
                                                </td>
                                                <td class="py-3 px-3 text-center">
                                                    {mod.managePerm ? (
                                                        <input
                                                            type="checkbox"
                                                            name="permissions"
                                                            value={mod.managePerm}
                                                            checked={activeRolePerms.has(mod.managePerm)}
                                                            disabled={!canEditSelectedRole}
                                                            class="gt-switch"
                                                            aria-label={`Gerenciar ${mod.label}`}
                                                        />
                                                    ) : (
                                                        <span class="text-[#8C95AA]">—</span>
                                                    )}
                                                </td>
                                                <td class="py-3 px-3 text-center">
                                                    {mod.deletePerm ? (
                                                        <input
                                                            type="checkbox"
                                                            name="permissions"
                                                            value={mod.deletePerm}
                                                            checked={activeRolePerms.has(mod.deletePerm)}
                                                            disabled={!canEditSelectedRole}
                                                            class="gt-switch"
                                                            aria-label={`Excluir em ${mod.label}`}
                                                        />
                                                    ) : (
                                                        <span class="text-[#8C95AA]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {canEditSelectedRole && (
                                <div class="flex items-center justify-between gap-3 pt-2 flex-wrap" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                                    <span class="text-[11px] text-[#8C95AA]">
                                        As alterações refletem imediatamente no menu lateral e nas rotas protegidas.
                                    </span>
                                    <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                        <span>Salvar Permissões de {activeRoleMeta.label}</span>
                                    </button>
                                </div>
                            )}
                        </form>
                    </section>

                    {/* Coluna Lateral: Seletor de Cargos */}
                    <aside class="gtb-card !p-4 space-y-2.5 min-w-0">
                        <div class="pb-2" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Selecionar Cargo</h2>
                            <p class="text-[11px] text-[#8C95AA] mt-0.5">Escolha o perfil para configurar as páginas visíveis.</p>
                        </div>

                        <div class="space-y-1.5">
                            {CONFIGURABLE_STAFF_ROLES.map((r) => {
                                const isSel = r.key === activeRoleMeta.key;
                                const count = resolveEffectivePermissions(r.key, null, rbacConfig).length;
                                const isCustom = Array.isArray(rbacConfig.roleOverrides[r.key]);
                                return (
                                    <a
                                        href={`/admin/permissoes?tab=roles&role=${r.key}`}
                                        class={`gt-quick-action-btn !py-2.5 !px-3 ${isSel ? 'border-[#F2C230]' : ''}`}
                                        style={isSel ? 'border-color: #F2C230; background: rgba(242, 194, 48, 0.10);' : ''}
                                    >
                                        <span class="min-w-0">
                                            <span class="block text-xs font-extrabold truncate">{r.label}</span>
                                            <span class="block text-[10.5px] text-[#8C95AA]">{count} permissões ativas</span>
                                        </span>
                                        <span class="gt-quick-action-tag">{isCustom ? 'CUSTOM' : 'PADRÃO'}</span>
                                    </a>
                                );
                            })}
                        </div>

                        <div class="gtb-surface-box rounded-xl p-3 text-[11px] text-[#8C95AA] leading-relaxed">
                            <strong class="text-white">Super Admin:</strong> possui acesso irrestrito permanente (<code class="font-mono">*</code>) para evitar bloqueio acidental da diretoria.
                        </div>
                    </aside>
                </div>
            ) : (
                <div class="gt-grid-detail items-start">
                    {/* Coluna Principal: Sobrescrita Individual por Usuário */}
                    <section class="gtb-card !p-5 space-y-4 min-w-0">
                        {activeUser ? (
                            <>
                                <div class="flex items-center justify-between gap-3 flex-wrap pb-3" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                                    <div>
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <h2 class="gt-font-display text-base font-extrabold text-white">{activeUser.name}</h2>
                                            <span class="gt-badge gt-badge-info">{ROLE_LABELS[activeUser.role] || activeUser.role}</span>
                                            <span class={`gt-badge ${activeUserHasOverride ? 'gt-badge-warning' : 'gt-badge-success'}`}>
                                                {activeUserHasOverride ? 'Acesso Personalizado' : 'Herdando do Cargo'}
                                            </span>
                                        </div>
                                        <p class="text-xs text-[#8C95AA] mt-0.5">{activeUser.email}</p>
                                    </div>
                                    {activeUserHasOverride && canEditSelectedUser && (
                                        <form action="/admin/permissoes/usuario/reset" method="post" class="m-0">
                                            <input type="hidden" name="user_id" value={activeUser.id} />
                                            <button type="submit" class="gt-btn-outline gt-btn-xs">
                                                Voltar ao Padrão do Cargo
                                            </button>
                                        </form>
                                    )}
                                </div>

                                {!canEditSelectedUser && (
                                    <div class="gtb-surface-box rounded-xl px-4 py-3 text-xs text-[#8C95AA]">
                                        Apenas um <strong class="text-white">Super Admin</strong> pode personalizar acessos de outro <strong class="text-white">Administrador</strong>.
                                    </div>
                                )}

                                <form action="/admin/permissoes/usuario" method="post" class="space-y-4 m-0">
                                    <input type="hidden" name="user_id" value={activeUser.id} />
                                    <div class="gt-table-wrap">
                                        <table class="w-full text-left text-xs">
                                            <thead>
                                                <tr class="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8C95AA]">
                                                    <th class="py-2.5 px-3">Página / Módulo do Menu</th>
                                                    <th class="py-2.5 px-3 text-center">Visualizar</th>
                                                    <th class="py-2.5 px-3 text-center">Editar / Gerenciar</th>
                                                    <th class="py-2.5 px-3 text-center">Excluir</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-white/5">
                                                {RBAC_MODULES.map((mod) => (
                                                    <tr>
                                                        <td class="py-3 px-3">
                                                            <div class="font-bold text-white">{mod.label}</div>
                                                            <div class="text-[11px] text-[#8C95AA] mt-0.5">{mod.description}</div>
                                                        </td>
                                                        <td class="py-3 px-3 text-center">
                                                            {mod.viewPerm ? (
                                                                <input
                                                                    type="checkbox"
                                                                    name="permissions"
                                                                    value={mod.viewPerm}
                                                                    checked={activeUserPerms.has(mod.viewPerm)}
                                                                    disabled={!canEditSelectedUser}
                                                                    class="gt-switch"
                                                                    aria-label={`Visualizar ${mod.label}`}
                                                                />
                                                            ) : (
                                                                <span class="text-[#8C95AA]">—</span>
                                                            )}
                                                        </td>
                                                        <td class="py-3 px-3 text-center">
                                                            {mod.managePerm ? (
                                                                <input
                                                                    type="checkbox"
                                                                    name="permissions"
                                                                    value={mod.managePerm}
                                                                    checked={activeUserPerms.has(mod.managePerm)}
                                                                    disabled={!canEditSelectedUser}
                                                                    class="gt-switch"
                                                                    aria-label={`Gerenciar ${mod.label}`}
                                                                />
                                                            ) : (
                                                                <span class="text-[#8C95AA]">—</span>
                                                            )}
                                                        </td>
                                                        <td class="py-3 px-3 text-center">
                                                            {mod.deletePerm ? (
                                                                <input
                                                                    type="checkbox"
                                                                    name="permissions"
                                                                    value={mod.deletePerm}
                                                                    checked={activeUserPerms.has(mod.deletePerm)}
                                                                    disabled={!canEditSelectedUser}
                                                                    class="gt-switch"
                                                                    aria-label={`Excluir em ${mod.label}`}
                                                                />
                                                            ) : (
                                                                <span class="text-[#8C95AA]">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {canEditSelectedUser && (
                                        <div class="flex items-center justify-between gap-3 pt-2 flex-wrap" style="border-top: 1px solid rgba(22, 116, 154, 0.14);">
                                            <span class="text-[11px] text-[#8C95AA]">
                                                Sobrescreve apenas as permissões deste colaborador, sem alterar outros usuários do mesmo cargo.
                                            </span>
                                            <button type="submit" data-loading-text="Salvando..." class="gt-btn-primary gt-btn-sm">
                                                <span>Salvar Acesso de {activeUser.name}</span>
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </>
                        ) : (
                            <div class="gt-empty-state">
                                Nenhum colaborador (além de Super Admin) cadastrado ainda. Cadastre membros da equipe em <a href="/admin/usuarios" class="text-[#F2C230] underline">Equipe &amp; Usuários</a>.
                            </div>
                        )}
                    </section>

                    {/* Coluna Lateral: Lista de Colaboradores */}
                    <aside class="gtb-card !p-4 space-y-2.5 min-w-0">
                        <div class="pb-2" style="border-bottom: 1px solid rgba(22, 116, 154, 0.14);">
                            <h2 class="gt-font-display text-sm font-extrabold text-white">Colaboradores da Equipe</h2>
                            <p class="text-[11px] text-[#8C95AA] mt-0.5">Selecione um usuário para personalizar as telas visíveis.</p>
                        </div>

                        {editableUsers.length === 0 ? (
                            <p class="text-xs text-[#8C95AA]">Somente contas Super Admin cadastradas.</p>
                        ) : (
                            <div class="space-y-1.5">
                                {editableUsers.map((u) => {
                                    const isSel = activeUser && Number(u.id) === Number(activeUser.id);
                                    const hasCustom = Array.isArray(rbacConfig.userOverrides[String(u.id)]);
                                    return (
                                        <a
                                            href={`/admin/permissoes?tab=users&user_id=${u.id}`}
                                            class="gt-quick-action-btn !py-2.5 !px-3"
                                            style={isSel ? 'border-color: #F2C230; background: rgba(242, 194, 48, 0.10);' : ''}
                                        >
                                            <span class="min-w-0">
                                                <span class="block text-xs font-extrabold truncate">{u.name}</span>
                                                <span class="block text-[10.5px] text-[#8C95AA] truncate">{ROLE_LABELS[u.role] || u.role}</span>
                                            </span>
                                            <span class="gt-quick-action-tag">{hasCustom ? 'CUSTOM' : 'CARGO'}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </AdminLayout>
    );
};
