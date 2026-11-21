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
    new: 'Novo Lead',
    greeting: 'Boas-vindas',
    discovery: 'Diagnóstico',
    qualifying: 'Qualificação',
    qualification: 'Qualificação',
    scheduling: 'Agendamento',
    proposal: 'Proposta',
    proposal_ready: 'Proposta Pronta',
    support: 'Suporte',
    handoff_human: 'Handoff Humano',
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
    const activeName = activeConversation
        ? activeConversation.visitor_name || activeConversation.visitor_company || 'Visitante Web'
        : '';
    const activeStage = activeConversation
        ? STAGE_LABELS[activeConversation.crm_stage] || activeConversation.crm_stage || 'Novo Lead'
        : '';
    const activeScore = Number(activeConversation?.lead_score || 0);

    return (
        <AdminLayout
            title="Atendimento & Chat ao Vivo • Painel Administrativo"
            activeNav="chat"
            currentUser={currentUser}
            successMessage={successMessage}
            errorMessage={errorMessage}
        >
            {/* Top Filter Pill Bar (Modern Executive Style — Dark & Light) */}
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2">
                    <a
                        href="/admin/atendimento?status=all"
                        class={`px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'all'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        Todas
                    </a>
                    <a
                        href="/admin/atendimento?status=open"
                        class={`px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'open'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        Abertas
                    </a>
                    <a
                        href="/admin/atendimento?status=closed"
                        class={`px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'closed'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        Encerradas
                    </a>
                </div>

                <div class="flex items-center gap-2">
                    <a href="/admin/crm-autonomo" class="gtb-ctrl-btn">
                        <span>Configurar Agente IA</span>
                        <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </a>
                </div>
            </div>

            {/* Unified Modern Split Chat Workspace */}
            <div class="gtb-card !p-0 gt-chat-layout !gap-0" data-has-active={activeConversation ? '1' : '0'}>
                {/* Coluna Esquerda: Lista de Conversas (Inbox) */}
                <aside class="gtb-chat-sidebar gt-chat-inbox border-r">
                    <div class="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
                        <span class="text-[11px] font-extrabold uppercase tracking-wider text-white">
                            Inbox de Atendimento ({conversations.length})
                        </span>
                        <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#34D399]">
                            <span class="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
                            Ao vivo
                        </span>
                    </div>

                    <div class="flex-1 overflow-y-auto divide-y divide-white/5">
                        {conversations.length === 0 ? (
                            <div class="gt-empty-state">
                                Nenhuma conversa nesta visualização.
                            </div>
                        ) : (
                            conversations.map((c) => {
                                const isSelected = activeConversation?.id === c.id;
                                const stageText = STAGE_LABELS[c.crm_stage] || c.crm_stage || 'Novo Lead';
                                const clientName = c.visitor_name || c.visitor_company || `Sessão #${c.id}`;
                                const timeStr = c.last_message_at
                                    ? new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    : '';

                                return (
                                    <a
                                        href={`/admin/atendimento?id=${c.id}&status=${statusFilter}`}
                                        class={`gtb-chat-item block px-4 py-3.5 no-underline transition ${isSelected ? 'is-active' : ''}`}
                                    >
                                        <div class="flex items-center justify-between gap-2 mb-1">
                                            <span class="text-[13px] font-extrabold text-white truncate">
                                                {clientName}
                                            </span>
                                            {timeStr && (
                                                <span class="text-[10.5px] text-[#8C95AA] shrink-0 font-semibold">
                                                    {timeStr}
                                                </span>
                                            )}
                                        </div>

                                        <div class="text-[11.5px] text-[#8C95AA] truncate mb-2">
                                            {c.visitor_objective || c.subject || c.visitor_email || 'Atendimento ao vivo'}
                                        </div>

                                        <div class="flex items-center justify-between gap-1.5 flex-wrap">
                                            <div class="flex items-center gap-1.5">
                                                {c.ai_enabled ? (
                                                    <span class="px-2 py-0.5 rounded-md bg-[#F2C230]/15 text-[#F2C230] text-[10px] font-extrabold">
                                                        IA
                                                    </span>
                                                ) : (
                                                    <span class="px-2 py-0.5 rounded-md bg-white/10 text-[#D5DCEB] text-[10px] font-bold">
                                                        Humano
                                                    </span>
                                                )}
                                                {c.channel === 'whatsapp' ? (
                                                    <span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-[#6EE7B7] text-[10px] font-extrabold">
                                                        WhatsApp
                                                    </span>
                                                ) : (
                                                    <span class="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 text-[10px] font-bold">
                                                        Site
                                                    </span>
                                                )}
                                            </div>
                                            <span class="text-[10px] font-bold text-[#8C95AA]">
                                                {stageText}
                                            </span>
                                        </div>
                                    </a>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* Coluna Direita: Thread da Conversa Ativa */}
                <section class="gtb-chat-main gt-chat-thread">
                    {activeConversation ? (
                        <>
                            {/* Topo da Conversa */}
                            <div class="gtb-chat-header px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0">
                                <div class="min-w-0">
                                    <a href={`/admin/atendimento?status=${statusFilter}`} class="gt-chat-mobile-back">
                                        &larr; Voltar para Conversas
                                    </a>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <h3 class="text-[15px] font-extrabold text-white truncate">
                                            {activeName}
                                        </h3>
                                        <span class={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                            activeConversation.status === 'open'
                                                ? 'bg-emerald-500/15 text-[#6EE7B7]'
                                                : 'bg-red-500/15 text-red-300'
                                        }`}>
                                            {activeConversation.status === 'open' ? 'Aberto' : 'Encerrado'}
                                        </span>
                                        <span class={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                            activeConversation.channel === 'whatsapp'
                                                ? 'bg-emerald-500/15 text-[#6EE7B7]'
                                                : 'bg-sky-500/15 text-sky-300'
                                        }`}>
                                            {activeConversation.channel === 'whatsapp' ? 'WhatsApp Oficial' : 'Chat do Site'}
                                        </span>
                                    </div>
                                    <div class="text-[11.5px] text-[#8C95AA] mt-0.5 truncate">
                                        {activeConversation.visitor_phone && <span>{activeConversation.visitor_phone} • </span>}
                                        {activeConversation.visitor_email && !String(activeConversation.visitor_email).endsWith('.local') && (
                                            <span>{activeConversation.visitor_email} • </span>
                                        )}
                                        <span>{activeConversation.subject || 'Atendimento Comercial'}</span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 flex-wrap">
                                    <form action={`/admin/atendimento/${activeConversation.id}/toggle-ai`} method="post" class="m-0">
                                        <button
                                            type="submit"
                                            class={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                                                activeConversation.ai_enabled
                                                    ? 'bg-[#F2C230]/15 border border-[#F2C230]/40 text-[#F2C230]'
                                                    : 'gt-btn-outline !py-1.5 !px-3 !text-xs'
                                            }`}
                                        >
                                            {activeConversation.ai_enabled ? 'Assumir (Pausar IA)' : 'Reativar IA'}
                                        </button>
                                    </form>

                                    <form
                                        action={`/admin/atendimento/${activeConversation.id}/${activeConversation.status === 'open' ? 'fechar' : 'reabrir'}`}
                                        method="post"
                                        class="m-0"
                                    >
                                        <button type="submit" class="gt-btn-outline !py-1.5 !px-3 !text-xs">
                                            {activeConversation.status === 'open' ? 'Encerrar Atendimento' : 'Reabrir'}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Sub-barra de Inteligência CRM */}
                            <div class="gtb-ai-bar px-5 py-2 flex flex-wrap items-center gap-2 text-[11px] shrink-0">
                                <span class="px-2.5 py-0.5 rounded-full bg-[#F2C230]/15 border border-[#F2C230]/35 text-[#F2C230] font-extrabold">
                                    {activeConversation.ai_enabled ? 'Piloto Automático IA' : 'Atendimento Humano'}
                                </span>
                                <span class="px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 font-bold">
                                    {activeStage} · Score {activeScore}/100
                                </span>
                            </div>

                            {/* Mensagens com Rolagem */}
                            <div
                                id="admin-chat-messages"
                                data-conv-id={activeConversation.id}
                                data-last-id={messages.length > 0 ? messages[messages.length - 1].id : 0}
                                class="flex-1 overflow-y-auto p-5 space-y-4"
                            >
                                {messages.length === 0 ? (
                                    <div class="gt-empty-state">
                                        Nenhuma mensagem registrada nesta conversa.
                                    </div>
                                ) : (
                                    messages.map((m) => {
                                        const isClient = m.sender_type === 'visitor' || m.sender_type === 'client';
                                        const isAi = !!m.is_ai;
                                        const senderLabel = isClient
                                            ? activeName
                                            : isAi
                                            ? 'Assistente IA GundjaTech'
                                            : `${currentUser?.name || 'Equipe'} (Atendimento)`;
                                        const msgTime = m.created_at
                                            ? new Date(m.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                            : '';

                                        return (
                                            <div class={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                                                <div
                                                    class={`max-w-[78%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                                                        isClient
                                                            ? 'gtb-chat-bubble-client rounded-tl-xs'
                                                            : 'gtb-chat-bubble-staff rounded-tr-xs'
                                                    }`}
                                                >
                                                    <div class={`text-[10.5px] font-bold mb-1 ${isClient ? 'text-[#8C95AA]' : 'opacity-80'}`}>
                                                        {senderLabel}
                                                    </div>
                                                    <div class="whitespace-pre-wrap break-words">{m.message}</div>
                                                    {msgTime && (
                                                        <div class={`text-[10px] mt-1.5 text-right ${isClient ? 'text-[#8C95AA]' : 'opacity-75'}`}>
                                                            {msgTime}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Composer de Resposta Manual */}
                            <div class="gtb-chat-composer px-4 py-3 border-t shrink-0">
                                <form action={`/admin/atendimento/${activeConversation.id}/mensagem`} method="post" class="flex items-center gap-2.5">
                                    <input
                                        type="text"
                                        name="message"
                                        required
                                        placeholder="Digite sua resposta em tempo real..."
                                        class="flex-1 min-w-0 rounded-xl px-4 py-2.5 text-[13px]"
                                    />
                                    <button type="submit" class="btn-primary px-5 py-2.5 text-xs shrink-0">
                                        Enviar
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div class="m-auto text-center px-6 py-12 max-w-md">
                            <div class="gtb-notif-empty-icon mx-auto mb-4">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                            </div>
                            <h3 class="gt-font-display text-base font-extrabold text-white mb-1.5">Central de Atendimento ao Vivo</h3>
                            <p class="text-xs text-[#8C95AA] leading-relaxed">
                                Selecione uma conversa à esquerda para acompanhar o atendimento do site e do WhatsApp em tempo real, pausar a IA ou responder diretamente ao cliente.
                            </p>
                        </div>
                    )}
                </section>
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
                                        wrap.className = 'flex flex-col ' + (isClient ? 'items-start' : 'items-end');
                                        var bubble = document.createElement('div');
                                        bubble.className = 'max-w-[78%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ' + (isClient ? 'gtb-chat-bubble-client rounded-tl-xs' : 'gtb-chat-bubble-staff rounded-tr-xs');
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
