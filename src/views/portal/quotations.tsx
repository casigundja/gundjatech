import type { FC } from 'hono/jsx';
import { PortalLayout } from './layout';

interface PortalQuotationsProps {
    currentUser: any;
    clientName?: string;
    quotations: any[];
    quotationDetail?: any;
    items?: any[];
    successMessage?: string | null;
    errorMessage?: string | null;
}

export const PortalQuotationsView: FC<PortalQuotationsProps> = ({
    currentUser,
    clientName,
    quotations,
    quotationDetail,
    items = [],
    successMessage,
    errorMessage
}) => {
    if (quotationDetail) {
        const canAct = quotationDetail.status === 'sent';

        return (
            <PortalLayout
                title={`Orçamento ${quotationDetail.reference_code} • Portal do Cliente`}
                activeNav="quotations"
                currentUser={currentUser}
                clientName={clientName}
                successMessage={successMessage}
                errorMessage={errorMessage}
            >
                <div style="margin-bottom: 20px;">
                    <a href="/portal/orcamentos" style="font-size: 13px; font-weight: 700; color: #16749A; text-decoration: none;">&larr; Voltar para Orçamentos</a>
                </div>

                <div class="gt-card" style="padding: 32px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--gt-border); padding-bottom: 20px; margin-bottom: 24px;">
                        <div>
                            <span class={`gt-badge ${quotationDetail.status === 'approved' ? 'gt-badge-success' : quotationDetail.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`} style="margin-bottom: 8px;">
                                {quotationDetail.status === 'approved' ? 'Aprovado' : quotationDetail.status === 'rejected' ? 'Recusado' : 'Aguardando Aprovação'}
                            </span>
                            <h1 style="font-size: 22px; font-weight: 800; color: #063B5C;">{quotationDetail.title}</h1>
                            <div style="font-size: 12px; color: #8CAAB9; margin-top: 4px;">Código: <strong>{quotationDetail.reference_code}</strong> | Validade: {quotationDetail.expires_at || '15 dias'}</div>
                        </div>

                        {canAct && (
                            <div style="display: flex; gap: 12px;">
                                <form action={`/portal/orcamentos/${quotationDetail.id}/recusar`} method="post">
                                    <button type="submit" class="gt-btn-outline" style="color: #991B1B; border-color: #FECACA;">
                                        Recusar Proposta
                                    </button>
                                </form>
                                <form action={`/portal/orcamentos/${quotationDetail.id}/aprovar`} method="post">
                                    <button type="submit" class="gt-btn-primary">
                                        ✓ Aprovar Orçamento
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>

                    <h2 style="font-size: 15px; font-weight: 800; color: #063B5C; margin-bottom: 16px;">Itens & Serviços Contemplados</h2>
                    <div style="overflow-x: auto; margin-bottom: 24px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead>
                                <tr style="background: #F4F8FA; border-bottom: 1px solid var(--gt-border); text-align: left; color: #67879C; font-size: 11px; text-transform: uppercase;">
                                    <th style="padding: 12px 16px;">Descrição do Serviço</th>
                                    <th style="padding: 12px 16px; text-align: center;">Qtd</th>
                                    <th style="padding: 12px 16px; text-align: right;">Valor Unitário</th>
                                    <th style="padding: 12px 16px; text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style="padding: 16px; text-align: center; color: #8CAAB9;">Pacote fechado de engenharia web.</td>
                                    </tr>
                                ) : (
                                    items.map((it: any) => (
                                        <tr style="border-bottom: 1px solid var(--gt-border);">
                                            <td style="padding: 14px 16px; font-weight: 600; color: #063B5C;">{it.description}</td>
                                            <td style="padding: 14px 16px; text-align: center; color: #527287;">{it.quantity || 1}</td>
                                            <td style="padding: 14px 16px; text-align: right; color: #527287;">R$ {Number(it.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: #063B5C;">R$ {Number(it.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <div style="width: 280px; background: #F8FAFC; border: 1px solid var(--gt-border); border-radius: 12px; padding: 18px;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #527287; margin-bottom: 8px;">
                                <span>Subtotal</span>
                                <span>R$ {Number(quotationDetail.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {Number(quotationDetail.discount_amount || 0) > 0 && (
                                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #166534; margin-bottom: 8px;">
                                    <span>Desconto comercial</span>
                                    <span>- R$ {Number(quotationDetail.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #063B5C; border-top: 1px solid var(--gt-border); padding-top: 10px;">
                                <span>Investimento Final</span>
                                <span style="color: #063B5C;">R$ {Number(quotationDetail.final_amount || quotationDetail.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </PortalLayout>
        );
    }

    return (
        <PortalLayout
            title="Orçamentos Recebidos • Portal do Cliente GundjaTech"
            activeNav="quotations"
            currentUser={currentUser}
            clientName={clientName}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div style="margin-bottom: 24px;">
                <h1 style="font-size: 20px; font-weight: 800; color: #063B5C;">Orçamentos e Propostas</h1>
                <p style="font-size: 13px; color: #527287; margin-top: 4px;">Analise os escopos e aprove suas propostas com segurança jurídica e garantia em contrato.</p>
            </div>

            {quotations.length === 0 ? (
                <div class="gt-card" style="padding: 48px; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 12px;">📑</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #063B5C;">Nenhum orçamento disponível no momento.</h3>
                    <p style="font-size: 13px; color: #527287; margin-top: 8px;">Assim que nossa equipe enviar uma proposta para o seu projeto, ela aparecerá aqui.</p>
                </div>
            ) : (
                <div class="gt-card" style="overflow: hidden;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="background: #F4F8FA; border-bottom: 1px solid var(--gt-border); text-align: left; color: #67879C; font-size: 11px; text-transform: uppercase;">
                                <th style="padding: 14px 20px;">Referência</th>
                                <th style="padding: 14px 20px;">Título / Escopo</th>
                                <th style="padding: 14px 20px;">Valor</th>
                                <th style="padding: 14px 20px;">Status</th>
                                <th style="padding: 14px 20px; text-align: right;">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotations.map((q: any) => (
                                <tr style="border-bottom: 1px solid var(--gt-border);">
                                    <td style="padding: 14px 20px; font-weight: 700; color: #063B5C;">{q.reference_code}</td>
                                    <td style="padding: 14px 20px; font-weight: 600; color: #063B5C;">{q.title}</td>
                                    <td style="padding: 14px 20px; font-weight: 700; color: #16749A;">R$ {Number(q.final_amount || q.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td style="padding: 14px 20px;">
                                        <span class={`gt-badge ${q.status === 'approved' ? 'gt-badge-success' : q.status === 'rejected' ? 'gt-badge-danger' : 'gt-badge-warning'}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                    <td style="padding: 14px 20px; text-align: right;">
                                        <a href={`/portal/orcamentos/${q.id}`} class="gt-btn-outline" style="font-size: 12px; padding: 6px 12px;">
                                            Ver Proposta &rarr;
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </PortalLayout>
    );
};
