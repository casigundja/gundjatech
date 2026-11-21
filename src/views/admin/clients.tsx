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
    clientDetail,
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
                <div style="margin-bottom: 20px;">
                    <a href="/admin/clientes" style="font-size: 13px; font-weight: 700; color: #F2C230; text-decoration: none;">&larr; Voltar para Clientes</a>
                </div>

                <div class="gt-card" style="max-width: 680px; padding: 32px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">Cadastrar Novo Cliente</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-bottom: 24px;">Preencha os dados corporativos e de contato do cliente.</p>

                    <form action="/admin/clientes" method="post" style="display: flex; flex-direction: column; gap: 18px;">
                        <div class="gt-grid-2">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Razão Social / Empresa *</label>
                                <input type="text" name="company" required placeholder="Ex: Acronis Brasil Ltda" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Nome do Contato Principal *</label>
                                <input type="text" name="name" required placeholder="Ex: Roberto Silva" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                        </div>

                        <div class="gt-grid-2">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">E-mail Corporativo *</label>
                                <input type="email" name="email" required placeholder="contato@empresa.com" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Telefone / WhatsApp</label>
                                <input type="text" name="phone" placeholder="(11) 98888-7777" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Status Inicial</label>
                            <select name="status" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;">
                                <option value="active">Ativo (Cliente com contrato ou demanda em curso)</option>
                                <option value="lead">Lead (Prospecção comercial)</option>
                            </select>
                        </div>

                        <div style="padding: 14px; background: rgba(3, 32, 51, 0.6); border-radius: 10px; border: 1px solid var(--gt-border); display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" name="create_user_account" value="1" id="chk_acc" checked style="width: 16px; height: 16px; accent-color: var(--gt-gold);" />
                            <label for="chk_acc" style="font-size: 13px; color: #FFFFFF; cursor: pointer;">
                                Criar credencial de acesso ao <strong>Portal do Cliente</strong> com senha provisória
                            </label>
                        </div>

                        <button type="submit" class="gt-btn-primary" style="justify-content: center; padding: 12px; margin-top: 8px;">
                            Salvar Cliente &rarr;
                        </button>
                    </form>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Clientes & Contas • Painel Administrativo GundjaTech"
            activeNav="clients"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF;">Diretório de Clientes & Leads</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">Gerencie empresas, dados de faturamento e acessos ao portal exclusivo.</p>
                </div>
                <a href="/admin/clientes/novo" class="gt-btn-primary">+ Novo Cliente</a>
            </div>

            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 20px;">
                <form action="/admin/clientes" method="get" class="gt-filter-bar">
                    <input
                        type="text"
                        name="search"
                        value={search}
                        placeholder="Buscar por razão social, nome ou e-mail..."
                        class="gt-filter-input"
                        style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;"
                    />
                    <select name="status" class="gt-filter-select" style="padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;">
                        <option value="">Todos os status</option>
                        <option value="active" selected={statusFilter === 'active'}>Ativos</option>
                        <option value="lead" selected={statusFilter === 'lead'}>Leads</option>
                    </select>
                    <button type="submit" class="gt-btn-outline">Filtrar</button>
                </form>
            </div>

            <div class="gt-card" style="overflow: hidden;">
                {clients.length === 0 ? (
                    <div class="gt-empty-state">Nenhum cliente encontrado com os filtros aplicados.</div>
                ) : (
                    <div class="gt-table-wrap">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: rgba(3, 32, 51, 0.8); border-bottom: 1px solid var(--gt-border); text-align: left; color: #8CAAB9; font-size: 11px; text-transform: uppercase;">
                                    <th style="padding: 14px 20px;">Empresa / Contato</th>
                                    <th style="padding: 14px 20px;">E-mail</th>
                                    <th style="padding: 14px 20px;">Telefone</th>
                                    <th style="padding: 14px 20px;">Status</th>
                                    <th style="padding: 14px 20px; text-align: right;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((c: any) => (
                                    <tr style="border-bottom: 1px solid var(--gt-border);">
                                        <td style="padding: 14px 20px;">
                                            <div style="font-weight: 700; color: #FFFFFF;">{c.company || c.name}</div>
                                            <div style="font-size: 11px; color: #8CAAB9;">Contato: {c.name}</div>
                                        </td>
                                        <td style="padding: 14px 20px; color: #B5D1E2; white-space: nowrap;">{c.email}</td>
                                        <td style="padding: 14px 20px; color: #8CAAB9; white-space: nowrap;">{c.phone || 'N/D'}</td>
                                        <td style="padding: 14px 20px; white-space: nowrap;">
                                            <span class={`gt-badge ${c.status === 'active' ? 'gt-badge-success' : 'gt-badge-info'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td style="padding: 14px 20px; text-align: right; white-space: nowrap;">
                                            <form action={`/admin/clientes/${c.id}/excluir`} method="post" style="display: inline-block;">
                                                <button type="submit" onclick="return confirm('Deseja realmente inativar este cliente?')" style="background: none; border: none; color: #F87171; font-size: 12px; cursor: pointer; padding: 4px 8px;">
                                                    Excluir
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};
