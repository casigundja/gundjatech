import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminChatProps {
    currentUser: any;
    conversations: any[];
    activeConversation?: any;
    messages?: any[];
    statusFilter?: string;
    successMessage?: string | null;
    errorMessage?: string | null;
}

const STAGE_LABELS: Record<string, string> = {
    greeting: 'Boas-vindas',
    discovery: 'Diagnóstico',
    qualification: 'Qualificação',
    scheduling: 'Agendamento',
    proposal: 'Proposta',
    support: 'Suporte',
    closed: 'Encerrado'
};

export const AdminChatView: FC<AdminChatProps> = ({
    currentUser,
    conversations = [],
    activeConversation,
    messages = [],
    statusFilter = 'open',
    successMessage,
    errorMessage
}) => {
    return (
        <AdminLayout
            title="CRM & Atendimento ao Vivo • Painel Administrativo"
            activeNav="chat"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            <div class="gt-chat-layout" data-has-active={activeConversation ? '1' : '0'}>
                {/* Coluna Esquerda: Lista de Conversas (Inbox) */}
                <div class="gt-card gt-chat-inbox">
                    <div style="padding: 16px 20px; border-bottom: 1px solid var(--gt-border); background: #032033;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <h2 style="font-size: 16px; font-weight: 800; color: #FFFFFF;">Inbox de Atendimento</h2>
                            <span class="gt-badge gt-badge-info">{conversations.length} conversas</span>
                        </div>
                        {/* Filtros de Status */}
                        <div style="display: flex; gap: 6px;">
                            <a
                                href="/admin/atendimento?status=open"
                                class={`gt-btn-outline ${statusFilter === 'open' ? 'active' : ''}`}
                                style={`flex: 1; text-align: center; font-size: 11px; padding: 6px 0; text-decoration: none; ${statusFilter === 'open' ? 'background: #063B5C; color: #F2C230; border-color: #F2C230;' : ''}`}
                            >
                                Abertas
                            </a>
                            <a
                                href="/admin/atendimento?status=closed"
                                class={`gt-btn-outline ${statusFilter === 'closed' ? 'active' : ''}`}
                                style={`flex: 1; text-align: center; font-size: 11px; padding: 6px 0; text-decoration: none; ${statusFilter === 'closed' ? 'background: #063B5C; color: #F2C230; border-color: #F2C230;' : ''}`}
                            >
                                Encerradas
                            </a>
                            <a
                                href="/admin/atendimento?status=all"
                                class={`gt-btn-outline ${statusFilter === 'all' ? 'active' : ''}`}
                                style={`flex: 1; text-align: center; font-size: 11px; padding: 6px 0; text-decoration: none; ${statusFilter === 'all' ? 'background: #063B5C; color: #F2C230; border-color: #F2C230;' : ''}`}
                            >
                                Todas
                            </a>
                        </div>
                    </div>

                    {/* Lista com Scroll */}
                    <div style="flex: 1; overflow-y: auto;">
                        {conversations.length === 0 ? (
                            <div style="padding: 40px 20px; text-align: center; color: #8CAAB9; font-size: 13px;">
                                Nenhuma conversa nesta visualização.
                            </div>
                        ) : (
                            conversations.map((c) => {
                                const isSelected = activeConversation?.id === c.id;
                                const stageText = STAGE_LABELS[c.crm_stage] || c.crm_stage || 'Geral';
                                const clientName = c.visitor_name || c.visitor_company || `Sessão #${c.id}`;

                                return (
                                    <a
                                        href={`/admin/atendimento?id=${c.id}&status=${statusFilter}`}
                                        style={`display: block; padding: 16px 20px; border-bottom: 1px solid rgba(22, 116, 154, 0.15); text-decoration: none; transition: background 0.15s ease; ${isSelected ? 'background: rgba(242, 194, 48, 0.08); border-left: 4px solid #F2C230;' : 'background: transparent;'}`}
                                    >
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                                            <span style="font-size: 14px; font-weight: 700; color: #FFFFFF;">
                                                {clientName}
                                            </span>
                                            {c.lead_score > 0 && (
                                                <span class="gt-badge" style="background: rgba(242, 194, 48, 0.15); color: #F2C230; font-size: 10px;">
                                                    Score {c.lead_score}
                                                </span>
                                            )}
                                        </div>

                                        <div style="font-size: 12px; color: #8CAAB9; margin-bottom: 8px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                                            {c.visitor_objective || c.visitor_email || 'Visitante no site'}
                                        </div>

                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; gap: 6px; flex-wrap: wrap;">
                                            <span style="color: #16749A; font-weight: 600;">
                                                {c.ai_enabled ? '🤖 IA Ativa' : '👤 Humano'}
                                            </span>
                                            <div style="display: flex; align-items: center; gap: 6px;">
                                                {c.channel === 'whatsapp' && (
                                                    <span class="gt-badge gt-badge-success" style="font-size: 10px;">
                                                        WhatsApp
                                                    </span>
                                                )}
                                                <span class="gt-badge gt-badge-info" style="font-size: 10px;">
                                                    {stageText}
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Coluna Direita: Thread da Conversa Ativa */}
                <div class="gt-card gt-chat-thread">
                    {activeConversation ? (
                        <>
                            {/* Topo da Conversa */}
                            <div style="padding: 14px 18px; border-bottom: 1px solid var(--gt-border); background: #032033; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
                                <div style="min-width: 0;">
                                    <a href={`/admin/atendimento?status=${statusFilter}`} class="gt-chat-mobile-back">
                                        &larr; Voltar para Inbox
                                    </a>
                                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <h3 style="font-size: 16px; font-weight: 800; color: #FFFFFF;">
                                            {activeConversation.visitor_name || activeConversation.visitor_company || 'Visitante Web'}
                                        </h3>
                                        <span class={`gt-badge ${activeConversation.status === 'open' ? 'gt-badge-success' : 'gt-badge-danger'}`}>
                                            {activeConversation.status === 'open' ? 'Aberta' : 'Encerrada'}
                                        </span>
                                    </div>
                                    <div style="font-size: 12px; color: #8CAAB9; margin-top: 4px;">
                                        {activeConversation.visitor_email && <span>{activeConversation.visitor_email} &bull; </span>}
                                        {activeConversation.visitor_phone && <span>{activeConversation.visitor_phone} &bull; </span>}
                                        {activeConversation.visitor_company && <span>Empresa: {activeConversation.visitor_company} &bull; </span>}
                                        <span>Etapa: <strong>{STAGE_LABELS[activeConversation.crm_stage] || activeConversation.crm_stage}</strong></span>
                                    </div>
                                </div>

                                <div style="display: flex; gap: 10px; align-items: center;">
                                    {/* Toggle IA Autônoma */}
                                    <form action={`/admin/atendimento/${activeConversation.id}/toggle-ai`} method="post" style="margin: 0;">
                                        <button
                                            type="submit"
                                            class="gt-btn-outline"
                                            style={`font-size: 12px; ${activeConversation.ai_enabled ? 'border-color: #F2C230; color: #F2C230;' : ''}`}
                                            title={activeConversation.ai_enabled ? 'Pausar IA e assumir controle manual' : 'Reativar atendimento autônomo por IA'}
                                        >
                                            {activeConversation.ai_enabled ? '🤖 IA Ativa (Pausar)' : '👤 Manual (Ativar IA)'}
                                        </button>
                                    </form>

                                    {/* Fechar ou Reabrir */}
                                    <form
                                        action={`/admin/atendimento/${activeConversation.id}/${activeConversation.status === 'open' ? 'fechar' : 'reabrir'}`}
                                        method="post"
                                        style="margin: 0;"
                                    >
                                        <button type="submit" class="gt-btn-outline" style="font-size: 12px;">
                                            {activeConversation.status === 'open' ? 'Encerrar' : 'Reabrir'}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Mensagens com Rolagem */}
                            <div id="admin-chat-messages" data-conv-id={activeConversation.id} data-last-id={messages.length > 0 ? messages[messages.length - 1].id : 0} style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #032033;">
                                {messages.length === 0 ? (
                                    <div style="margin: auto; text-align: center; color: #8CAAB9; font-size: 13px;">
                                        Nenhuma mensagem registrada nesta conversa.
                                    </div>
                                ) : (
                                    messages.map((m) => {
                                        const isClient = m.sender_type === 'visitor' || m.sender_type === 'client';
                                        const isAi = !!m.is_ai;

                                        return (
                                            <div style={`display: flex; flex-direction: column; align-items: ${isClient ? 'flex-start' : 'flex-end'};`}>
                                                <div style="font-size: 11px; color: #8CAAB9; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                                    <span>{isClient ? (activeConversation.visitor_name || 'Visitante') : (isAi ? '🤖 IA Gundja CRM' : 'Equipe Staff')}</span>
                                                    <span>&bull;</span>
                                                    <span>{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>

                                                <div
                                                    style={`max-width: 75%; padding: 12px 16px; border-radius: 12px; font-size: 13px; line-height: 1.5; ${
                                                        isClient
                                                            ? 'background: #063B5C; color: #FFFFFF; border-bottom-left-radius: 2px;'
                                                            : isAi
                                                            ? 'background: #04263D; border: 1px solid rgba(242, 194, 48, 0.4); color: #FFFFFF; border-bottom-right-radius: 2px;'
                                                            : 'background: #16749A; color: #FFFFFF; border-bottom-right-radius: 2px;'
                                                    }`}
                                                >
                                                    {m.message}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Input de Envio de Resposta Manual */}
                            <div style="padding: 14px 16px; border-top: 1px solid var(--gt-border); background: #041B2B;">
                                <form action={`/admin/atendimento/${activeConversation.id}/mensagem`} method="post" style="display: flex; flex-wrap: wrap; gap: 10px;">
                                    <input
                                        type="text"
                                        name="message"
                                        required
                                        placeholder="Digite a resposta para o cliente..."
                                        style="flex: 1 1 200px; min-width: 0; background: #032033; border: 1px solid var(--gt-border); border-radius: 8px; padding: 12px 14px; color: #FFFFFF; font-size: 13px;"
                                    />
                                    <button type="submit" class="gt-btn-primary" style="white-space: nowrap;">
                                        Enviar
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style="margin: auto; text-align: center; color: #8CAAB9; padding: 40px;">
                            <div style="font-size: 40px; margin-bottom: 16px;">💬</div>
                            <h3 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">Central de Atendimento ao Vivo</h3>
                            <p style="font-size: 13px; max-width: 400px; line-height: 1.5;">
                                Selecione uma conversa na lista à esquerda para acompanhar em tempo real, intervir nas respostas da IA ou assumir o atendimento.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {activeConversation && (
                <script dangerouslySetInnerHTML={{ __html: `
                    (function () {
                        var box = document.getElementById('admin-chat-messages');
                        if (!box) return;
                        box.scrollTop = box.scrollHeight;
                        var convId = box.dataset.convId;
                        var lastId = parseInt(box.dataset.lastId || '0', 10) || 0;
                        async function pollAdminChat() {
                            try {
                                var r = await fetch('/admin/atendimento/' + convId + '/mensagens?after_id=' + lastId, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
                                if (!r.ok) return;
                                var d = await r.json();
                                if (d && d.ok && Array.isArray(d.messages) && d.messages.length > 0) {
                                    var hasClientMsg = false;
                                    d.messages.forEach(function (m) {
                                        if (m.id > lastId) lastId = m.id;
                                        var isClient = m.sender_type === 'visitor' || m.sender_type === 'client';
                                        if (isClient) hasClientMsg = true;
                                        var wrap = document.createElement('div');
                                        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (isClient ? 'flex-start' : 'flex-end') + ';';
                                        var bubble = document.createElement('div');
                                        bubble.style.cssText = 'max-width:75%;padding:12px 16px;border-radius:12px;font-size:13px;line-height:1.5;color:#fff;' + (isClient ? 'background:#063B5C;' : (m.is_ai ? 'background:#04263D;border:1px solid rgba(242,194,48,0.4);' : 'background:#16749A;'));
                                        bubble.textContent = m.message;
                                        wrap.appendChild(bubble);
                                        box.appendChild(wrap);
                                    });
                                    box.scrollTop = box.scrollHeight;
                                    if (hasClientMsg && window.GT_AdminNotify) {
                                        window.GT_AdminNotify.playChime();
                                    }
                                }
                            } catch (e) {
                            } finally {
                                setTimeout(pollAdminChat, 4000);
                            }
                        }
                        setTimeout(pollAdminChat, 4000);
                    })();
                ` }} />
            )}
        </AdminLayout>
    );
};
