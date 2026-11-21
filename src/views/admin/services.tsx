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
                <div style="margin-bottom: 20px;">
                    <a href="/admin/servicos" style="font-size: 13px; font-weight: 700; color: #F2C230; text-decoration: none;">&larr; Voltar para Serviços</a>
                </div>

                <div class="gt-card" style="max-width: 680px; padding: 32px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px;">Cadastrar Novo Pacote de Serviço</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-bottom: 24px;">Configure o título, descrição, categoria e valores de referência.</p>

                    <form action="/admin/servicos" method="post" style="display: flex; flex-direction: column; gap: 18px;">
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Categoria do Serviço *</label>
                            <select name="category_id" required style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;">
                                <option value="">Selecione uma categoria...</option>
                                {categories.map((c: any) => (
                                    <option value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Nome do Pacote *</label>
                            <input type="text" name="name" required placeholder="Ex: Criação de E-commerce B2B com Checkout Customizado" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Descrição Resumida</label>
                            <input type="text" name="short_description" placeholder="Ex: Arquitetura completa, catálogo dinâmico e integração com ERP" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Preço Base de Referência (R$)</label>
                                <input type="number" step="0.01" name="base_price" placeholder="4800.00" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8CAAB9; margin-bottom: 6px;">Prazo Estimado (Dias)</label>
                                <input type="number" name="estimated_days" placeholder="30" style="width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--gt-border); background: #032033; color: #FFFFFF; font-size: 13px;" />
                            </div>
                        </div>

                        <button type="submit" class="gt-btn-primary" style="justify-content: center; padding: 12px; margin-top: 8px;">
                            Cadastrar Pacote &rarr;
                        </button>
                    </form>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Serviços & Catálogo • Painel Administrativo GundjaTech"
            activeNav="services"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF;">Catálogo de Pacotes e Soluções Digitais</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">Gerencie os serviços ofertados no site institucional e disponíveis no formulário de orçamento.</p>
                </div>
                <a href="/admin/servicos/novo" class="gt-btn-primary">+ Novo Pacote</a>
            </div>

            <div class="gt-card" style="overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                        <tr style="background: rgba(3, 32, 51, 0.8); border-bottom: 1px solid var(--gt-border); text-align: left; color: #8CAAB9; font-size: 11px; text-transform: uppercase;">
                            <th style="padding: 14px 20px;">Serviço / Pacote</th>
                            <th style="padding: 14px 20px;">Categoria</th>
                            <th style="padding: 14px 20px;">Preço Base</th>
                            <th style="padding: 14px 20px;">Status</th>
                            <th style="padding: 14px 20px; text-align: right;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.length === 0 ? (
                            <tr>
                                <td colSpan={5} style="padding: 32px; text-align: center; color: #8CAAB9;">Nenhum serviço cadastrado.</td>
                            </tr>
                        ) : (
                            services.map((s: any) => (
                                <tr style="border-bottom: 1px solid var(--gt-border);">
                                    <td style="padding: 14px 20px;">
                                        <div style="font-weight: 700; color: #FFFFFF;">{s.name}</div>
                                        <div style="font-size: 11px; color: #8CAAB9;">{s.short_description || s.slug}</div>
                                    </td>
                                    <td style="padding: 14px 20px; color: #B5D1E2;">{s.category_name || 'Geral'}</td>
                                    <td style="padding: 14px 20px; font-weight: 700; color: #F2C230;">
                                        R$ {Number(s.base_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td style="padding: 14px 20px;">
                                        <span class={`gt-badge ${s.is_active ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                            {s.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td style="padding: 14px 20px; text-align: right;">
                                        <form action={`/admin/servicos/${s.id}/excluir`} method="post" style="display: inline-block;">
                                            <button type="submit" onclick="return confirm('Deseja desativar este serviço?')" style="background: none; border: none; color: #F87171; font-size: 12px; cursor: pointer; padding: 4px 8px;">
                                                Desativar
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};
