import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminProjectsProps {
    currentUser: any;
    projects: any[];
    projectDetail?: any;
    stages?: any[];
    attachments?: any[];
    clients?: any[];
    search?: string;
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
    planning: { label: 'Planejamento', badgeClass: 'gt-badge-info' },
    in_progress: { label: 'Em Desenvolvimento', badgeClass: 'gt-badge-warning' },
    reviewing: { label: 'Em Homologação', badgeClass: 'gt-badge-warning' },
    completed: { label: 'Entregue / Concluído', badgeClass: 'gt-badge-success' },
    canceled: { label: 'Cancelado', badgeClass: 'gt-badge-danger' }
};

export const AdminProjectsView: FC<AdminProjectsProps> = ({
    currentUser,
    projects = [],
    projectDetail,
    stages = [],
    attachments = [],
    clients = [],
    search = '',
    statusFilter = '',
    successMessage,
    errorMessage
}) => {
    // ----------------------------------------------------
    // VISÃO DE DETALHE DE PROJETO
    // ----------------------------------------------------
    if (projectDetail) {
        const statusMeta = STATUS_LABELS[projectDetail.status] || { label: projectDetail.status, badgeClass: 'gt-badge-info' };

        return (
            <AdminLayout
                title={`${projectDetail.title} • Painel Administrativo`}
                activeNav="projects"
                currentUser={currentUser}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/admin/projetos" style="font-size: 13px; font-weight: 700; color: #F2C230; text-decoration: none;">&larr; Voltar para Projetos</a>
                </div>

                {/* Cabeçalho do Projeto */}
                <div class="gt-card" style="padding: 28px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                                <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                <span style="font-size: 12px; color: #8CAAB9;">Cliente: <strong>{projectDetail.client_name || projectDetail.company || 'Geral'}</strong></span>
                            </div>
                            <h1 style="font-size: 22px; font-weight: 800; color: #FFFFFF;">{projectDetail.title}</h1>
                            {projectDetail.description && (
                                <p style="font-size: 13px; color: #8CAAB9; margin-top: 6px; max-width: 800px; line-height: 1.5;">
                                    {projectDetail.description}
                                </p>
                            )}
                        </div>

                        <div style="text-align: right;">
                            <div style="font-size: 28px; font-weight: 800; color: #F2C230;">{projectDetail.progress_percentage || 0}%</div>
                            <div style="font-size: 11px; text-transform: uppercase; color: #8CAAB9; font-weight: 700;">Progresso Geral</div>
                        </div>
                    </div>

                    {/* Barra de Progresso Visual */}
                    <div style="width: 100%; height: 10px; background: #032033; border-radius: 999px; overflow: hidden; border: 1px solid var(--gt-border);">
                        <div style={`height: 100%; width: ${projectDetail.progress_percentage || 0}%; background: linear-gradient(90deg, #16749A, #F2C230); border-radius: 999px;`} />
                    </div>

                    {/* Formulário de Atualização de Status & Progresso */}
                    <form action={`/admin/projetos/${projectDetail.id}`} method="post" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) auto; gap: 14px; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--gt-border); align-items: flex-end;">
                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Status</label>
                            <select name="status" style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 12px;">
                                <option value="planning" selected={projectDetail.status === 'planning'}>Planejamento</option>
                                <option value="in_progress" selected={projectDetail.status === 'in_progress'}>Em Desenvolvimento</option>
                                <option value="reviewing" selected={projectDetail.status === 'reviewing'}>Em Homologação</option>
                                <option value="completed" selected={projectDetail.status === 'completed'}>Entregue / Concluído</option>
                                <option value="canceled" selected={projectDetail.status === 'canceled'}>Cancelado</option>
                            </select>
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Progresso (%)</label>
                            <input
                                type="number"
                                name="progress_percentage"
                                min="0"
                                max="100"
                                value={projectDetail.progress_percentage || 0}
                                style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 12px;"
                            />
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Início</label>
                            <input
                                type="date"
                                name="start_date"
                                value={projectDetail.start_date || ''}
                                style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 12px;"
                            />
                        </div>

                        <div>
                            <label style="display: block; font-size: 11px; font-weight: 700; color: #8CAAB9; margin-bottom: 6px;">Previsão Entrega</label>
                            <input
                                type="date"
                                name="expected_end_date"
                                value={projectDetail.expected_end_date || ''}
                                style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 12px;"
                            />
                        </div>

                        <button type="submit" class="gt-btn-primary" style="height: 38px;">
                            Salvar Alterações
                        </button>
                    </form>
                </div>

                {/* Duas colunas: Etapas & Anexos */}
                <div class="gt-grid-detail">
                    {/* Etapas do Projeto */}
                    <div class="gt-card" style="padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h2 style="font-size: 16px; font-weight: 800; color: #FFFFFF;">Etapas do Cronograma ({stages.length})</h2>
                        </div>

                        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                            {stages.length === 0 ? (
                                <p style="color: #8CAAB9; font-size: 13px;">Nenhuma etapa cadastrada ainda.</p>
                            ) : (
                                stages.map((s, idx) => {
                                    const isDone = s.status === 'completed';
                                    return (
                                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #032033; border: 1px solid var(--gt-border); border-radius: 10px;">
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                <div style={`width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; ${isDone ? 'background: #10B981; color: #041B2B;' : 'background: #063B5C; color: #F2C230; border: 1px solid #16749A;'}`}>
                                                    {isDone ? '✓' : idx + 1}
                                                </div>
                                                <div>
                                                    <div style={`font-size: 13px; font-weight: 700; ${isDone ? 'text-decoration: line-through; color: #8CAAB9;' : 'color: #FFFFFF;'}`}>
                                                        {s.title}
                                                    </div>
                                                    {s.description && <div style="font-size: 11px; color: #8CAAB9;">{s.description}</div>}
                                                </div>
                                            </div>

                                            <form action={`/admin/projetos/${projectDetail.id}/etapas/${s.id}/toggle`} method="post" style="margin: 0;">
                                                <button
                                                    type="submit"
                                                    class="gt-btn-outline"
                                                    style={`font-size: 11px; padding: 4px 10px; ${isDone ? 'color: #8CAAB9;' : 'color: #34D399; border-color: rgba(16, 185, 129, 0.4);'}`}
                                                >
                                                    {isDone ? 'Reabrir' : 'Concluir'}
                                                </button>
                                            </form>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Adicionar Nova Etapa */}
                        <form action={`/admin/projetos/${projectDetail.id}/etapas`} method="post" style="background: #032033; padding: 16px; border-radius: 10px; border: 1px dashed var(--gt-border);">
                            <div style="font-size: 12px; font-weight: 700; color: #F2C230; margin-bottom: 10px;">+ Adicionar Etapa</div>
                            <div style="display: flex; gap: 10px;">
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Nome da etapa (ex: Configuração DNS e SSL Cloudflare)"
                                    style="flex: 1; background: #041B2B; border: 1px solid var(--gt-border); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 12px;"
                                />
                                <button type="submit" class="gt-btn-primary" style="font-size: 12px; padding: 8px 14px;">
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Anexos & Arquivos */}
                    <div class="gt-card" style="padding: 24px;">
                        <h2 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin-bottom: 16px;">Arquivos & Anexos ({attachments.length})</h2>

                        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                            {attachments.length === 0 ? (
                                <p style="color: #8CAAB9; font-size: 12px;">Nenhum documento ou anexo vinculado.</p>
                            ) : (
                                attachments.map((att) => (
                                    <div style="padding: 12px; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            <div style="font-size: 12px; font-weight: 700; color: #FFFFFF;">📎 {att.file_name}</div>
                                            <div style="font-size: 10px; color: #8CAAB9;">{new Date(att.created_at).toLocaleDateString('pt-BR')}</div>
                                        </div>
                                        <a href={att.file_path} target="_blank" class="gt-btn-outline" style="font-size: 11px; padding: 4px 8px;">
                                            Baixar
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    // ----------------------------------------------------
    // LISTAGEM GERAL DE PROJETOS
    // ----------------------------------------------------
    return (
        <AdminLayout
            title="Projetos & Entregas • Painel Administrativo"
            activeNav="projects"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-page-header">
                <div>
                    <h1 style="font-size: 24px; font-weight: 800; color: #FFFFFF;">Projetos & Gestão de Entregas</h1>
                    <p style="font-size: 13px; color: #8CAAB9; margin-top: 4px;">
                        Acompanhamento de escopos, progresso percentual, etapas e entrega das soluções.
                    </p>
                </div>
                <button
                    onclick="document.getElementById('modal-novo-projeto').style.display='flex'"
                    class="gt-btn-primary"
                >
                    <span>+ Novo Projeto</span>
                </button>
            </div>

            {/* Filtros */}
            <div class="gt-card" style="padding: 16px 20px; margin-bottom: 24px;">
                <form method="get" action="/admin/projetos" class="gt-filter-bar">
                    <div class="gt-filter-input">
                        <input
                            type="text"
                            name="search"
                            value={search}
                            placeholder="Buscar projeto por título ou cliente..."
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        />
                    </div>
                    <div class="gt-filter-select">
                        <select
                            name="status"
                            style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                        >
                            <option value="">Todos os Status</option>
                            <option value="planning" selected={statusFilter === 'planning'}>Planejamento</option>
                            <option value="in_progress" selected={statusFilter === 'in_progress'}>Em Desenvolvimento</option>
                            <option value="reviewing" selected={statusFilter === 'reviewing'}>Em Homologação</option>
                            <option value="completed" selected={statusFilter === 'completed'}>Entregue</option>
                            <option value="canceled" selected={statusFilter === 'canceled'}>Cancelado</option>
                        </select>
                    </div>
                    <button type="submit" class="gt-btn-outline" style="font-size: 13px;">Filtrar</button>
                    {(search || statusFilter) && (
                        <a href="/admin/projetos" style="font-size: 12px; color: #F2C230; text-decoration: underline;">Limpar</a>
                    )}
                </form>
            </div>

            {/* Grid de Cards de Projetos */}
            <div class="gt-cards-grid">
                {projects.length === 0 ? (
                    <div class="gt-card" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: #8CAAB9;">
                        Nenhum projeto encontrado.
                    </div>
                ) : (
                    projects.map((p) => {
                        const statusMeta = STATUS_LABELS[p.status] || { label: p.status, badgeClass: 'gt-badge-info' };
                        const progress = p.progress_percentage || 0;

                        return (
                            <div class="gt-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                        <span class={`gt-badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                                        <span style="font-size: 11px; color: #8CAAB9;">{p.company || p.client_name || 'Cliente'}</span>
                                    </div>

                                    <h3 style="font-size: 16px; font-weight: 800; color: #FFFFFF; margin-bottom: 8px;">
                                        <a href={`/admin/projetos/${p.id}`} style="color: inherit; text-decoration: none;">
                                            {p.title}
                                        </a>
                                    </h3>

                                    {p.description && (
                                        <p style="font-size: 12px; color: #8CAAB9; line-height: 1.5; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                            {p.description}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    {/* Barra de Progresso */}
                                    <div style="margin-bottom: 16px;">
                                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                                            <span style="color: #8CAAB9;">Progresso</span>
                                            <span style="color: #F2C230; font-weight: 700;">{progress}%</span>
                                        </div>
                                        <div style="width: 100%; height: 6px; background: #032033; border-radius: 999px; overflow: hidden;">
                                            <div style={`width: ${progress}%; height: 100%; background: #16749A;`} />
                                        </div>
                                    </div>

                                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--gt-border); padding-top: 14px;">
                                        <span style="font-size: 11px; color: #8CAAB9;">
                                            Início: {p.start_date ? new Date(p.start_date).toLocaleDateString('pt-BR') : '—'}
                                        </span>
                                        <a href={`/admin/projetos/${p.id}`} class="gt-btn-outline" style="font-size: 11px; padding: 6px 12px;">
                                            Gerenciar &rarr;
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Novo Projeto */}
            <div
                id="modal-novo-projeto"
                style="display: none; position: fixed; inset: 0; background: rgba(3, 32, 51, 0.85); backdrop-filter: blur(4px); z-index: 100; align-items: center; justify-content: center; padding: 16px;"
            >
                <div class="gt-card gt-modal-card" style="max-width: 540px; padding: 32px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: 800; color: #FFFFFF;">Cadastrar Novo Projeto</h2>
                        <button
                            type="button"
                            onclick="document.getElementById('modal-novo-projeto').style.display='none'"
                            style="background: none; border: none; font-size: 20px; color: #8CAAB9; cursor: pointer;"
                        >
                            &times;
                        </button>
                    </div>

                    <form action="/admin/projetos" method="post">
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Cliente Vinculado *</label>
                                <select
                                    name="client_id"
                                    required
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                >
                                    <option value="">Selecione o cliente...</option>
                                    {clients.map((c) => (
                                        <option value={c.id}>{c.company ? `${c.company} (${c.name})` : c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Título do Projeto *</label>
                                <input
                                    type="text"
                                    name="title"
                                    required
                                    placeholder="Ex: Portal Fullstack Cloudflare Workers"
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                />
                            </div>

                            <div>
                                <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Descrição do Escopo</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    placeholder="Resumo dos objetivos e entregas técnicas..."
                                    style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px; font-family: inherit;"
                                />
                            </div>

                            <div class="gt-grid-2">
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Data de Início</label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                </div>
                                <div>
                                    <label style="display: block; font-size: 12px; font-weight: 700; color: #E7F0F5; margin-bottom: 6px;">Previsão de Entrega</label>
                                    <input
                                        type="date"
                                        name="expected_end_date"
                                        style="width: 100%; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 10px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; border-top: 1px solid var(--gt-border); padding-top: 20px;">
                            <button
                                type="button"
                                onclick="document.getElementById('modal-novo-projeto').style.display='none'"
                                class="gt-btn-outline"
                            >
                                Cancelar
                            </button>
                            <button type="submit" class="gt-btn-primary">
                                Criar Projeto
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};
