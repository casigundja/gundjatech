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
    const statusLabels: Record<string, string> = {
        new: 'Recebido',
        pending: 'Recebido',
        analyzing: 'Em Análise Técnica',
        in_review: 'Em Análise Técnica',
        quotation_sent: 'Orçamento Enviado',
        quoted: 'Orçamento Enviado',
        approved: 'Aprovado pelo Cliente',
        in_progress: 'Em Execução',
        completed: 'Concluído',
        cancelled: 'Cancelado',
        rejected: 'Cancelado',
    };

    const steps = [
        { key: 'new', label: 'Recebido' },
        { key: 'analyzing', label: 'Análise' },
        { key: 'quotation_sent', label: 'Orçamento' },
        { key: 'approved', label: 'Aprovado' },
        { key: 'in_progress', label: 'Execução' },
        { key: 'completed', label: 'Concluído' },
    ];

    const normalizeStatus = (st?: string | null) => {
        if (!st || st === 'pending') return 'new';
        if (st === 'in_review') return 'analyzing';
        if (st === 'quoted') return 'quotation_sent';
        if (st === 'rejected') return 'cancelled';
        return st;
    };

    const formatBrt = (raw?: string | null) => {
        if (!raw) return '—';
        const norm = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`;
        const dt = new Date(norm);
        if (Number.isNaN(dt.getTime())) return raw;
        try {
            const parts = new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            }).formatToParts(dt);
            const g = (t: string) => parts.find((p) => p.type === t)?.value || '';
            return `${g('day')}/${g('month')}/${g('year')} às ${g('hour')}:${g('minute')}`;
        } catch {
            return raw;
        }
    };

    const normStatus = serviceRequest ? normalizeStatus(serviceRequest.status) : null;
    const currentStatusLabel = serviceRequest ? (statusLabels[serviceRequest.status] || serviceRequest.status) : null;
    const currentStepIdx = normStatus ? steps.findIndex((s) => s.key === normStatus) : -1;

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
                        <div style="background: #04253a; border: 1px solid rgba(22, 116, 154, 0.45); border-top: 3px solid #F2C230; border-radius: 16px; padding: 30px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid rgba(231, 240, 245, 0.1); padding-bottom: 20px; margin-bottom: 24px;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                                        <span style="padding: 3px 10px; border-radius: 7px; background: rgba(231, 240, 245, 0.08); border: 1px solid rgba(231, 240, 245, 0.18); color: #E7F0F5; font-size: 11px; font-weight: 800; font-family: monospace;">
                                            {serviceRequest.tracking_code}
                                        </span>
                                        <span style={`padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; ${normStatus === 'cancelled' ? 'background: rgba(239,68,68,0.16); color: #FCA5A5; border: 1px solid rgba(239,68,68,0.3);' : 'background: rgba(22,116,154,0.22); color: #E7F0F5; border: 1px solid rgba(22,116,154,0.45);'}`}>
                                            {currentStatusLabel}
                                        </span>
                                    </div>
                                    <h3 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0;">{serviceRequest.title}</h3>
                                    <div style="font-size: 12px; color: rgba(231,240,245,0.65); margin-top: 4px;">
                                        Aberta em {formatBrt(serviceRequest.created_at)}
                                    </div>
                                </div>
                            </div>

                            {normStatus !== 'cancelled' && (
                                <div style="margin-bottom: 26px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(231,240,245,0.65);">Progresso no Pipeline</span>
                                        <span style="font-size: 11px; font-weight: 700; color: rgba(231,240,245,0.65);">Etapa {Math.max(1, currentStepIdx + 1)} de {steps.length}</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; padding: 14px; border-radius: 12px; background: rgba(6, 59, 92, 0.55); border: 1px solid rgba(231,240,245,0.08);">
                                        {steps.map((step, idx) => {
                                            const isDoneAll = normStatus === 'completed';
                                            const isDone = isDoneAll || (currentStepIdx >= 0 && idx < currentStepIdx);
                                            const isActive = !isDoneAll && idx === currentStepIdx;
                                            const dotStyle = isDone
                                                ? 'background: #16749A; border-color: #16749A; color: #FFFFFF;'
                                                : isActive
                                                ? 'background: #F2C230; border-color: #F2C230; color: #063B5C;'
                                                : 'background: rgba(255,255,255,0.05); border-color: rgba(231,240,245,0.2); color: rgba(231,240,245,0.5);';
                                            return (
                                                <div style="display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px;">
                                                    <span style={`width: 26px; height: 26px; border-radius: 999px; border: 2px solid; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; ${dotStyle}`}>
                                                        {isDone ? '✓' : idx + 1}
                                                    </span>
                                                    <span style={`font-size: 11px; font-weight: ${isActive ? '800' : '600'}; color: ${isActive ? '#F2C230' : isDone ? '#E7F0F5' : 'rgba(231,240,245,0.5)'};`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div style="margin-bottom: 26px;">
                                <h4 style="font-size: 11px; font-weight: 800; color: rgba(231,240,245,0.65); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.07em;">Descrição da Demanda</h4>
                                <p style="font-size: 14px; color: #E7F0F5; line-height: 1.6; background: rgba(6, 59, 92, 0.55); padding: 15px 18px; border-radius: 12px; border: 1px solid rgba(231,240,245,0.08); border-left: 3px solid #16749A; white-space: pre-wrap;">
                                    {serviceRequest.description}
                                </p>
                            </div>

                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h4 style="font-size: 11px; font-weight: 800; color: rgba(231,240,245,0.65); margin: 0; text-transform: uppercase; letter-spacing: 0.07em;">Histórico de Atividades</h4>
                                    <span style="font-size: 11px; color: rgba(231,240,245,0.6);">{histories.length} {histories.length === 1 ? 'evento' : 'eventos'}</span>
                                </div>
                                <div style="border-radius: 12px; border: 1px solid rgba(231,240,245,0.1); background: rgba(6, 59, 92, 0.4); padding: 4px 16px;">
                                    {histories.length > 0 ? (
                                        histories.map((h, i) => (
                                            <div key={i} style={`display: flex; gap: 12px; align-items: flex-start; padding: 12px 0; ${i > 0 ? 'border-top: 1px solid rgba(231,240,245,0.08);' : ''}`}>
                                                <div style={`width: 22px; height: 22px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 800; ${i === 0 ? 'background: #F2C230; color: #063B5C;' : 'background: rgba(231,240,245,0.08); color: #A9C2D4; border: 1px solid rgba(231,240,245,0.16);'}`}>
                                                    {i === 0 ? '✓' : '•'}
                                                </div>
                                                <div style="flex: 1; min-width: 0;">
                                                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap;">
                                                        <strong style="font-size: 13px; color: #FFFFFF;">
                                                            {statusLabels[h.status_to] || h.status_to}
                                                        </strong>
                                                        <span style="font-size: 11px; color: rgba(231,240,245,0.55);">
                                                            {formatBrt(h.created_at)}
                                                        </span>
                                                    </div>
                                                    {h.notes && (
                                                        <div style="font-size: 12px; color: #A9C2D4; margin-top: 4px; line-height: 1.5;">
                                                            {h.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style="padding: 14px 0; font-size: 13px; color: #E7F0F5;">
                                            Solicitação registrada em {formatBrt(serviceRequest.created_at)}. Em análise pela equipe GundjaTech.
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
