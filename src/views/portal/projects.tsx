import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalProjectsProps {
    currentUser: any;
    clientName?: string;
    projects: any[];
    projectDetail?: any;
    stages?: any[];
    attachments?: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalProjectsView: FC<PortalProjectsProps> = ({
    currentUser,
    clientName,
    projects,
    projectDetail,
    stages = [],
    attachments = [],
    successMessage,
    errorMessage
}) => {
    if (projectDetail) {
        return (
            <PortalLayout
                title={`${projectDetail.title} • Portal do Cliente`}
                activeNav="projects"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/portal/projetos" style="font-size: 13px; font-weight: 700; color: #16749A; text-decoration: none;">&larr; Voltar para Meus Projetos</a>
                </div>

                <div class="gt-card" style="padding: 28px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div>
                            <span class="gt-badge gt-badge-info" style="margin-bottom: 8px;">{projectDetail.status}</span>
                            <h1 style="font-size: 22px; font-weight: 800; color: #063B5C;">{projectDetail.title}</h1>
                            <p style="font-size: 14px; color: #527287; margin-top: 6px;">{projectDetail.description || 'Sem descrição cadastrada.'}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 12px; color: #8CAAB9;">Progresso Geral</div>
                            <div style="font-size: 28px; font-weight: 800; color: #063B5C;">{projectDetail.progress_percentage || 0}%</div>
                        </div>
                    </div>

                    <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 99px; overflow: hidden; margin-top: 10px;">
                        <div style={`width: ${projectDetail.progress_percentage || 0}%; height: 100%; background: #16749A;`}></div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                    <div class="gt-card" style="padding: 24px;">
                        <h2 style="font-size: 16px; font-weight: 800; color: #063B5C; margin-bottom: 16px;">Etapas & Entregas</h2>
                        {stages.length === 0 ? (
                            <p style="font-size: 13px; color: #8CAAB9;">Nenhuma etapa detalhada no momento.</p>
                        ) : (
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                {stages.map((st: any, idx: number) => (
                                    <div style="display: flex; gap: 14px; padding: 14px; background: #F8FAFC; border-radius: 10px; border: 1px solid var(--gt-border);">
                                        <div style="width: 28px; height: 28px; border-radius: 99px; background: #063B5C; color: #F2C230; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; shrink-0;">
                                            {idx + 1}
                                        </div>
                                        <div style="flex: 1;">
                                            <div style="display: flex; justify-content: space-between;">
                                                <strong style="font-size: 13px; color: #063B5C;">{st.title}</strong>
                                                <span class={`gt-badge ${st.status === 'completed' ? 'gt-badge-success' : 'gt-badge-warning'}`}>{st.status}</span>
                                            </div>
                                            {st.description && <p style="font-size: 12px; color: #527287; margin-top: 4px;">{st.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div class="gt-card" style="padding: 24px;">
                        <h2 style="font-size: 16px; font-weight: 800; color: #063B5C; margin-bottom: 16px;">Arquivos & Entregáveis</h2>
                        {attachments.length === 0 ? (
                            <p style="font-size: 13px; color: #8CAAB9;">Nenhum arquivo disponibilizado ainda.</p>
                        ) : (
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                {attachments.map((att: any) => (
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #F8FAFC; border-radius: 8px; border: 1px solid var(--gt-border);">
                                        <span style="font-size: 12px; font-weight: 600; color: #063B5C; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">📄 {att.file_name}</span>
                                        <a href={`/portal/projetos/${projectDetail.id}/anexos/${att.id}`} class="gt-btn-outline" style="font-size: 11px; padding: 4px 10px;">Baixar</a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Meus Projetos • Portal do Cliente GundjaTech"
            activeNav="projects"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Meus Projetos em Andamento</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Acompanhe o status técnico, sprints e entregas dos seus produtos contratados.</p>
            </div>

            {projects.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🚀</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Você ainda não possui projetos ativos.</h3>
                    <p style="font-size: 13px; color: #527287; margin: 8px 0 20px;">Abra uma nova solicitação para iniciarmos o planejamento do seu projeto.</p>
                    <a href="/portal/solicitacoes/nova" class="gt-btn-primary">+ Criar Solicitação</a>
                </div>
            ) : (
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
                    {projects.map((p: any) => (
                        <div class="gt-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                    <span class="gt-badge gt-badge-info">{p.status}</span>
                                    <span style="font-size: 12px; font-weight: 700; color: #063B5C;">{p.progress_percentage || 0}% Concluído</span>
                                </div>
                                <h3 style="font-size: 17px; font-weight: 800; color: #063B5C; margin-bottom: 8px;">{p.title}</h3>
                                <p style="font-size: 13px; color: #527287; line-height: 1.5; margin-bottom: 16px;">
                                    {p.description || 'Desenvolvimento contínuo e infraestrutura sob medida.'}
                                </p>
                                <div style="width: 100%; height: 6px; background: #E2E8F0; border-radius: 99px; overflow: hidden; margin-bottom: 16px;">
                                    <div style={`width: ${p.progress_percentage || 0}%; height: 100%; background: #16749A;`}></div>
                                </div>
                            </div>
                            <div style="border-top: 1px solid var(--gt-border); padding-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 11px; color: #8CAAB9;">Iniciado: {p.start_date || 'N/D'}</span>
                                <a href={`/portal/projetos/${p.id}`} class="gt-btn-outline" style="font-size: 12px;">
                                    Detalhes &rarr;
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PortalLayout>
    );
};
