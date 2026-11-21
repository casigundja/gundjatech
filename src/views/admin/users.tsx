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
    superadmin: { label: 'Super Admin', badgeClass: 'gt-badge-warning' },
    admin: { label: 'Administrador', badgeClass: 'gt-badge-warning' },
    manager: { label: 'Gerente Operações', badgeClass: 'gt-badge-info' },
    attendant: { label: 'Atendente CRM', badgeClass: 'gt-badge-info' },
    developer: { label: 'Dev / Técnico', badgeClass: 'gt-badge-info' },
    financial: { label: 'Financeiro', badgeClass: 'gt-badge-info' },
    client: { label: 'Cliente', badgeClass: 'gt-badge-success' }
};

export const AdminUsersView: FC<AdminUsersProps> = ({
    currentUser,
    users = [],
    search = '',
    roleFilter = '',
    successMessage,
    errorMessage
}) => {
    return (
        <AdminLayout
            title="Equipe & Permissões • Painel Administrativo"
            activeNav="users"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF;">Equipe, Colaboradores & Usuários</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">
                        Gestão de acesso, credenciais, papéis de autorização (RBAC) e status de contas.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('modal-novo-usuario').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Convidar / Criar Usuário</span>
                </button>
            </div>

            {/* Filtros */}
            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 24px;">
                <form method="get" action="/admin/usuarios" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar por nome, email ou empresa..."
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="role"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
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
                    <button type="submit" class="gt-btn-outline" style="font-size: 13px;">Filtrar</button>
                    {(search || roleFilter) && (
                        <a href="/admin/usuarios" style="font-size: 12px; color: #F2C230; text-decoration: underline;">Limpar</a>
                    )}
                </form>
            </div>

            {/* Tabela de Usuários */}
            <div class="gt-card" style="overflow: hidden;">
                {users.length === 0 ? (
                    <div class="gt-empty-state">Nenhum usuário localizado para os filtros informados.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                            <thead>
                                <tr style="border-bottom: 1px solid var(--gt-border); background: rgba(3, 32, 51, 0.6); color: #8CAAB9; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                                    <th style="padding: 16px 20px;">Usuário</th>
                                    <th style="padding: 16px 20px;">Papel / Função</th>
                                    <th style="padding: 16px 20px;">Contato / Empresa</th>
                                    <th style="padding: 16px 20px;">Status</th>
                                    <th style="padding: 16px 20px;">Cadastro</th>
                                    <th style="padding: 16px 20px; text-align: right;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const roleMeta = ROLE_LABELS[u.role] || { label: u.role, badgeClass: 'gt-badge-info' };
                                    const initials = (u.name || 'U').slice(0, 2).toUpperCase();
                                    const isSelf = u.id === currentUser.id;

                                    return (
                                        <tr style="border-bottom: 1px solid rgba(22, 116, 154, 0.15);">
                                            <td style="padding: 16px 20px;">
                                                <div style="display: flex; align-items: center; gap: 12px;">
                                                    <div style="width: 36px; height: 36px; border-radius: 8px; background: #063B5C; border: 1px solid #16749A; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #F2C230; font-size: 12px; flex-shrink: 0;">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div style="font-weight: 700; color: #FFFFFF; white-space: nowrap;">
                                                            {u.name} {isSelf && <span style="font-size: 10px; color: #F2C230;">(Você)</span>}
                                                        </div>
                                                        <div style="font-size: 12px; color: #8CAAB9;">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding: 16px 20px; white-space: nowrap;">
                                                <span class={`gt-badge ${roleMeta.badgeClass}`}>
                                                    {roleMeta.label}
                                                </span>
                                            </td>
                                            <td style="padding: 16px 20px; white-space: nowrap;">
                                                <div style="color: #FFFFFF;">{u.company || '—'}</div>
                                                <div style="font-size: 11px; color: #8CAAB9;">{u.phone || 'Sem telefone'}</div>
                                            </td>
                                            <td style="padding: 16px 20px; white-space: nowrap;">
                                                {u.is_active ? (
                                                    <span class="gt-badge gt-badge-success">Ativo</span>
                                                ) : (
                                                    <span class="gt-badge gt-badge-danger">Inativo</span>
                                                )}
                                            </td>
                                            <td style="padding: 16px 20px; color: #8CAAB9; font-size: 12px; white-space: nowrap;">
                                                {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td style="padding: 16px 20px; text-align: right; white-space: nowrap;">
                                                <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                                                    {/* Alternar Status (Ativar/Desativar) */}
                                                    {!isSelf && (
                                                        <form action={`/admin/usuarios/${u.id}/status`} method="post" style="margin: 0;">
                                                            <input type="hidden" name="is_active" value={u.is_active ? '0' : '1'} />
                                                            <button
                                                                type="submit"
                                                                class="gt-btn-outline"
                                                                style={`font-size: 11px; padding: 4px 8px; ${u.is_active ? 'color: #F87171;' : 'color: #34D399;'}`}
                                                                title={u.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                                                            >
                                                                {u.is_active ? 'Desativar' : 'Ativar'}
                                                            </button>
                                                        </form>
                                                    )}
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

            {/* Modal Novo Usuário */}
            <div
                id="modal-novo-usuario"
                style="display: none; position: fixed; inset: 0; background: rgba(3, 32, 51, 0.85); backdrop-filter: blur(4px); z-index: 100; align-items: center; justify-content: center; padding: 16px;"
            >
                <div class="gt-card gt-modal-card" style="max-width: 560px; padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Cadastrar Novo Usuário</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-usuario').style.display='none'"
                            style="background: none; border: none; font-size: 20px; color: #8CAAB9; cursor: pointer;"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/usuarios" method="post">
                        <div class="gt-grid-2" style="margin-bottom: 16px;">
                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Nome Completo *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="Ex: Carlos Silva"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">E-mail Corporativo *</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="carlos@empresa.com"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Telefone / WhatsApp</label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="(11) 99999-9999"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Papel / Permissão *</label>
                                <select
                                    name="role"
                                    required
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                >
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
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Empresa / Organização</label>
                                <input
                                    type="text"
                                    name="company"
                                    placeholder="GundjaTech ou Cliente"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Senha Provisória *</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={8}
                                    placeholder="Mínimo 8 caracteres"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--gt-border); padding-top: 20px;">
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
