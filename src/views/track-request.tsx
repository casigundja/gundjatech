import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface TrackRequestProps {
    currentUser?: { name: string; role: string } | null;
    protocol?: string | null;
    serviceRequest?: {
        id: number;
        title: string;
        description: string;
        tracking_code: string;
        status: string;
        created_at: string;
        service_name?: string | null;
        estimated_budget?: number | null;
    } | null;
    histories?: Array<{
        status_to: string;
        notes: string | null;
        created_at: string;
    }>;
}

export const TrackRequestView: FC<TrackRequestProps> = ({ currentUser, protocol, serviceRequest, histories = [] }) => {
    const statusLabels: Record<string, { label: string; color: string }> = {
        'new': { label: 'Recebida', color: '#16749A' },
        'pending': { label: 'Em Análise Inicial', color: '#F2C230' },
        'in_review': { label: 'Elaborando Proposta', color: '#38bdf8' },
        'quoted': { label: 'Orçamento Enviado', color: '#4ade80' },
        'approved': { label: 'Aprovada / Em Produção', color: '#22c55e' },
        'rejected': { label: 'Recusada / Cancelada', color: '#f87171' },
        'completed': { label: 'Concluída', color: '#10b981' }
    };

    const currentStatus = serviceRequest ? (statusLabels[serviceRequest.status] || { label: serviceRequest.status, color: '#F2C230' }) : null;

    return (
        <BaseLayout
            title="Acompanhar Solicitação • GundjaTech"
            description="Consulte em tempo real o status e a evolução da sua proposta comercial na GundjaTech."
            currentUser={currentUser}
        >
            <section style="padding: 70px 0;">
                <div class="gt-container" style="max-width: 760px;">
                    <div style="text-align: center; margin-bottom: 36px;">
                        <h1 style="font-size: 34px; font-weight: 800; margin-bottom: 12px; color: #FFFFFF;">
                            Acompanhar Solicitação
                        </h1>
                        <p style="color: #E7F0F5; font-size: 15px;">
                            Digite o código de protocolo fornecido no momento do envio para acompanhar o status da proposta.
                        </p>
                    </div>

                    <div style="background: #04253a; border: 1px solid #16749A; border-radius: 14px; padding: 30px; margin-bottom: 30px;">
                        <form action="/acompanhar-solicitacao" method="get" style="display: flex; gap: 12px;">
                            <input
                                type="text"
                                name="protocol"
                                value={protocol || ''}
                                placeholder="Ex: GNDJ-20261121-AB12"
                                required
                                style="flex: 1; padding: 13px 16px; border-radius: 8px; border: 1px solid #16749A; background: #063B5C; color: #fff; font-size: 15px; outline: none; font-weight: bold; letter-spacing: 0.5px;"
                            />
                            <button type="submit" class="gt-btn-cta" style="border: none; padding: 13px 26px; cursor: pointer;">
                                Consultar
                            </button>
                        </form>
                    </div>

                    {protocol && !serviceRequest && (
                        <div style="background: rgba(220, 38, 38, 0.15); border: 1px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 24px; text-align: center; color: #fca5a5;">
                            <h3>Nenhuma solicitação encontrada</h3>
                            <p style="font-size: 14px; margin-top: 6px;">
                                Verifique se o código <b>{protocol}</b> foi digitado corretamente ou entre em contato com nosso suporte via WhatsApp.
                            </p>
                        </div>
                    )}

                    {serviceRequest && (
                        <div style="background: #04253a; border: 1px solid #16749A; border-radius: 14px; padding: 32px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 20px; margin-bottom: 24px;">
                                <div>
                                    <div style="font-size: 13px; color: var(--gt-ice);">Protocolo</div>
                                    <div style="font-size: 22px; font-weight: 800; color: #F2C230; font-family: monospace;">
                                        {serviceRequest.tracking_code}
                                    </div>
                                    <h3 style="font-size: 18px; margin-top: 8px; color: #fff;">{serviceRequest.title}</h3>
                                </div>
                                <div style={{ background: currentStatus?.color || '#F2C230', color: '#063B5C', padding: '6px 14px', borderRadius: '50px', fontWeight: '800', fontSize: '13px' }}>
                                    {currentStatus?.label}
                                </div>
                            </div>

                            <div style="margin-bottom: 28px;">
                                <h4 style="font-size: 14px; color: #F2C230; margin-bottom: 8px; text-transform: uppercase;">Descrição do Pedido</h4>
                                <p style="font-size: 14px; color: #E7F0F5; line-height: 1.6; background: #063B5C; padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                                    {serviceRequest.description}
                                </p>
                            </div>

                            <div>
                                <h4 style="font-size: 14px; color: #F2C230; margin-bottom: 16px; text-transform: uppercase;">Linha do Tempo</h4>
                                <div style="display: flex; flex-direction: column; gap: 14px;">
                                    {histories.length > 0 ? (
                                        histories.map((h, i) => (
                                            <div key={i} style="display: flex; gap: 14px; align-items: flex-start;">
                                                <div style="width: 10px; height: 10px; border-radius: 50%; background: #F2C230; margin-top: 6px;"></div>
                                                <div>
                                                    <div style="font-size: 14px; font-weight: 700; color: #fff;">
                                                        {statusLabels[h.status_to]?.label || h.status_to}
                                                    </div>
                                                    <div style="font-size: 13px; color: #E7F0F5; margin-top: 2px;">
                                                        {h.notes || 'Atualização de status registrada pela equipe técnica.'}
                                                    </div>
                                                    <div style="font-size: 12px; color: rgba(231,240,245,0.6); margin-top: 4px;">
                                                        {new Date(h.created_at).toLocaleString('pt-BR')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style="font-size: 13px; color: #E7F0F5;">
                                            Solicitação registrada em {new Date(serviceRequest.created_at).toLocaleString('pt-BR')}. Em análise pela diretoria.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </BaseLayout>
    );
};
