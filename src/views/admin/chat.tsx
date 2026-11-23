import type { FC } from 'hono/jsx';
import { AdminLayout } from './layout';

interface AdminChatProps {
    currentUser: any;
    conversations: any[];
    activeConversation?: any;
    linkedRequest?: any;
    messages?: any[];
    statusFilter?: string;
    counts?: {
        all: number;
        open: number;
        handoff: number;
        closed: number;
    };
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
    active_client: 'Cliente Portal',
    handoff_human: 'Aguardando Humano',
    closed: 'Encerrado'
};

export const AdminChatView: FC<AdminChatProps> = ({
    currentUser,
    conversations = [],
    activeConversation,
    linkedRequest = null,
    messages = [],
    statusFilter = 'open',
    counts = { all: 0, open: 0, handoff: 0, closed: 0 },
    successMessage,
    errorMessage
}) => {
    const activeName = activeConversation
        ? activeConversation.visitor_name || activeConversation.client_name || activeConversation.visitor_company || `Sessão #${activeConversation.id}`
        : '';
    const activeEmail = activeConversation
        ? activeConversation.visitor_email || activeConversation.client_email || ''
        : '';
    const activePhone = activeConversation
        ? activeConversation.visitor_phone || activeConversation.client_phone || ''
        : '';
    const activeStage = activeConversation
        ? STAGE_LABELS[activeConversation.crm_stage] || activeConversation.crm_stage || 'Novo Lead'
        : '';
    const activeScore = Number(activeConversation?.lead_score || 0);
    const isActiveClosed = activeConversation?.status === 'closed';
    const isActiveHandoff = Boolean(
        activeConversation &&
        !isActiveClosed &&
        (activeConversation.status === 'waiting_staff' || activeConversation.crm_stage === 'handoff_human')
    );
    const activeChannelLabel =
        activeConversation?.channel === 'whatsapp'
            ? 'WhatsApp Oficial'
            : activeConversation?.channel === 'web_chat'
            ? 'Portal do Cliente'
            : 'Chat do Site';

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
                        class={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'all'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        <span>Todas</span>
                        <span id="gt-chat-count-all" class="gt-chat-tab-count">{counts.all}</span>
                    </a>
                    <a
                        href="/admin/atendimento?status=open"
                        class={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'open'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        <span>Abertas</span>
                        <span id="gt-chat-count-open" class="gt-chat-tab-count">{counts.open}</span>
                    </a>
                    <a
                        href="/admin/atendimento?status=handoff"
                        class={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'handoff'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        <span>Aguardando Humano</span>
                        <span id="gt-chat-count-handoff" class="gt-chat-tab-count">{counts.handoff}</span>
                    </a>
                    <a
                        href="/admin/atendimento?status=closed"
                        class={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold no-underline transition ${
                            statusFilter === 'closed'
                                ? 'btn-primary shadow-sm'
                                : 'gtb-ctrl-btn !h-auto !py-1.5'
                        }`}
                    >
                        <span>Encerradas</span>
                        <span id="gt-chat-count-closed" class="gt-chat-tab-count">{counts.closed}</span>
                    </a>
                </div>

                <div class="flex items-center gap-2">
                    <a href="/admin/configuracoes" class="gtb-ctrl-btn">
                        <span>Canais WhatsApp</span>
                    </a>
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
                    <div class="px-4 py-3 border-b border-white/10 space-y-2.5 shrink-0">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-[11px] font-extrabold uppercase tracking-wider text-white">
                                Inbox de Atendimento (<span id="gt-inbox-count">{conversations.length}</span>)
                            </span>
                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#34D399]">
                                <span class="w-2 h-2 rounded-full bg-[#34D399] animate-pulse"></span>
                                Ao vivo
                            </span>
                        </div>
                        <div style="position: relative;">
                            <input
                                id="gt-inbox-search"
                                type="search"
                                placeholder="Buscar cliente, assunto ou canal..."
                                oninput="var q=this.value.toLowerCase().trim();document.querySelectorAll('#gt-inbox-list .gtb-chat-item').forEach(function(el){el.style.display=!q||el.textContent.toLowerCase().indexOf(q)!==-1?'':'none';});"
                                class="w-full rounded-xl px-3 py-1.5 text-xs"
                            />
                        </div>
                    </div>

                    <div
                        id="gt-inbox-list"
                        data-status-filter={statusFilter}
                        data-active-id={activeConversation ? String(activeConversation.id) : ''}
                        class="flex-1 overflow-y-auto divide-y divide-white/5"
                    >
                        {conversations.length === 0 ? (
                            <div class="flex flex-col items-center justify-center text-center px-5 py-12">
                                <span class="gtb-icon-box !w-10 !h-10 !rounded-xl" style="margin-bottom: 12px;" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </span>
                                <div class="text-xs font-extrabold text-white" style="margin-bottom: 4px;">Fila limpa por aqui</div>
                                <p class="text-[11px] text-[#8C95AA]" style="line-height: 1.5; max-width: 210px;">
                                    Novas conversas do site, WhatsApp e Portal aparecerão automaticamente aqui.
                                </p>
                            </div>
                        ) : (
                            conversations.map((c) => {
                                const isSelected = activeConversation?.id === c.id;
                                const isHandoff = c.status !== 'closed' && (c.status === 'waiting_staff' || c.crm_stage === 'handoff_human');
                                const stageText = isHandoff ? 'Aguardando Humano' : (STAGE_LABELS[c.crm_stage] || c.crm_stage || 'Novo Lead');
                                const clientName = c.visitor_name || c.client_name || c.visitor_company || `Sessão #${c.id}`;
                                const initials = String(clientName || 'GT').trim().slice(0, 2).toUpperCase();
                                const channelLabel = c.channel === 'whatsapp' ? 'WhatsApp' : c.channel === 'web_chat' ? 'Portal' : 'Site';
                                const timeStr = c.last_message_at
                                    ? new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    : '';

                                return (
                                    <a
                                        href={`/admin/atendimento?id=${c.id}&status=${statusFilter}`}
                                        style={isHandoff ? 'border-left: 3px solid #F2C230;' : ''}
                                        class={`gtb-chat-item block px-4 py-3.5 no-underline transition ${isSelected ? 'is-active' : ''}`}
                                    >
                                        <div class="flex items-start gap-2.5">
                                            <span class="gt-chat-avatar">{initials}</span>
                                            <div class="min-w-0 flex-1">
                                                <div class="flex items-center justify-between gap-2 mb-0.5">
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
                                                    {c.last_message_preview || c.visitor_objective || c.subject || c.visitor_email || 'Atendimento ao vivo'}
                                                </div>

                                                <div class="flex items-center justify-between gap-1.5 flex-wrap">
                                                    <div class="flex items-center gap-1.5">
                                                        <span class={`gt-badge ${isHandoff ? 'gt-badge-warning' : c.ai_enabled ? 'gt-badge-success' : 'gt-badge-info'}`}>
                                                            {isHandoff ? 'Humano Solicitado' : c.ai_enabled ? 'IA' : 'Humano'}
                                                        </span>
                                                        <span class="text-[10.5px] font-semibold text-[#8C95AA]">· {channelLabel}</span>
                                                    </div>
                                                    <span class="text-[10px] font-bold text-[#8C95AA]">
                                                        {stageText}
                                                    </span>
                                                </div>
                                            </div>
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
                                    <div class="flex items-center gap-2.5 flex-wrap">
                                        <h3 class="text-[15px] font-extrabold text-white truncate">
                                            {activeName}
                                        </h3>
                                        <span class={`gt-badge ${
                                            isActiveClosed
                                                ? 'gt-badge-danger'
                                                : isActiveHandoff
                                                ? 'gt-badge-warning'
                                                : 'gt-badge-success'
                                        }`}>
                                            {isActiveClosed ? 'Encerrado' : isActiveHandoff ? 'Aguardando Humano' : 'Aberto'}
                                        </span>
                                        <span class="text-[11px] font-semibold text-[#8C95AA]">
                                            · {activeChannelLabel}
                                        </span>
                                    </div>
                                    <div class="text-[11.5px] text-[#8C95AA] mt-0.5 truncate">
                                        {activePhone && <span>{activePhone} • </span>}
                                        {activeEmail && !String(activeEmail).endsWith('.local') && (
                                            <span>{activeEmail} • </span>
                                        )}
                                        <span>{activeConversation.subject || 'Atendimento Comercial'}</span>
                                    </div>
                                </div>

                                <div class="flex items-center gap-2 flex-wrap">
                                    {linkedRequest?.id ? (
                                        <a
                                            href={`/admin/solicitacoes/${linkedRequest.id}`}
                                            class="gt-btn-primary gt-btn-xs"
                                            title="Abrir Solicitação e Orçamento vinculados a este atendimento"
                                        >
                                            <span>Solicitação {linkedRequest.protocol} →</span>
                                        </a>
                                    ) : (
                                        <form action={`/admin/atendimento/${activeConversation.id}/gerar-solicitacao`} method="post" class="m-0">
                                            <button
                                                type="submit"
                                                data-loading-text="Gerando..."
                                                class="gt-btn-primary gt-btn-xs"
                                                title="Formalizar este atendimento em Solicitação e Orçamento"
                                            >
                                                <span>+ Gerar Solicitação / Orçamento</span>
                                            </button>
                                        </form>
                                    )}

                                    {!isActiveClosed && (
                                        <form action={`/admin/atendimento/${activeConversation.id}/toggle-ai`} method="post" class="m-0">
                                            <button
                                                type="submit"
                                                data-loading-text="..."
                                                class={activeConversation.ai_enabled ? 'gt-btn-petrol gt-btn-xs' : 'gt-btn-outline gt-btn-xs'}
                                            >
                                                {activeConversation.ai_enabled ? 'Assumir (Pausar IA)' : 'Reativar IA'}
                                            </button>
                                        </form>
                                    )}

                                    <form
                                        action={`/admin/atendimento/${activeConversation.id}/${!isActiveClosed ? 'fechar' : 'reabrir'}`}
                                        method="post"
                                        class="m-0"
                                    >
                                        <button type="submit" data-loading-text="..." class="gt-btn-outline gt-btn-xs">
                                            {!isActiveClosed ? 'Encerrar' : 'Reabrir'}
                                        </button>
                                    </form>

                                    <form
                                        action={`/admin/atendimento/${activeConversation.id}/excluir`}
                                        method="post"
                                        class="m-0"
                                        data-confirm="Deseja realmente excluir esta conversa e todo o histórico de mensagens?"
                                    >
                                        <button
                                            type="submit"
                                            class="gt-btn-danger-ghost gt-btn-icon-only"
                                            title="Excluir conversa"
                                            aria-label="Excluir conversa"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Sub-barra de Inteligência CRM */}
                            <div class="gtb-ai-bar px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
                                <div class="flex flex-wrap items-center gap-3">
                                    <span class={`gt-badge ${activeConversation.ai_enabled ? 'gt-badge-success' : 'gt-badge-warning'}`}>
                                        {activeConversation.ai_enabled ? 'Piloto Automático IA' : 'Atendimento Humano'}
                                    </span>
                                    <span class="text-[#8C95AA] font-semibold">
                                        {activeStage} · Score {activeScore}/100
                                    </span>
                                </div>
                                {isActiveHandoff && (
                                    <form action={`/admin/atendimento/${activeConversation.id}/assumir`} method="post" class="m-0">
                                        <button type="submit" data-loading-text="Assumindo..." class="gt-btn-primary gt-btn-xs">
                                            Assumir Atendimento Humano
                                        </button>
                                    </form>
                                )}
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
                                                    style="max-width: min(76%, 620px);"
                                                    class={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
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
                                    <button type="submit" data-loading-text="..." class="gt-btn-primary gt-btn-sm shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="m22 2-7 20-4-9-9-4Z" />
                                            <path d="M22 2 11 13" />
                                        </svg>
                                        <span>Enviar</span>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div class="gt-chat-empty-stage">
                            <span class="gt-crm-empty-icon" aria-hidden="true">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </span>
                            <h3 class="gt-font-display text-base font-extrabold text-white" style="margin: 0 0 6px 0;">
                                Central de Atendimento Omnichannel
                            </h3>
                            <p class="text-xs text-[#8C95AA]" style="max-width: 440px; line-height: 1.6; margin: 0;">
                                Selecione uma conversa à esquerda para acompanhar em tempo real, assumir um pedido de atendimento humano ou responder direto ao cliente.
                            </p>

                            <div class="gt-chat-channel-grid">
                                <div class="gt-chat-channel-card">
                                    <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]" style="margin-bottom: 4px;">Canal 01 · Site</div>
                                    <div class="text-xs font-extrabold text-white">Chat ao Vivo</div>
                                    <p class="text-[11px] text-[#8C95AA]" style="margin-top: 3px; line-height: 1.45;">Visitantes qualificados pela IA ou transferidos para humano.</p>
                                </div>
                                <div class="gt-chat-channel-card">
                                    <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]" style="margin-bottom: 4px;">Canal 02 · WhatsApp</div>
                                    <div class="text-xs font-extrabold text-white">WhatsApp Oficial</div>
                                    <p class="text-[11px] text-[#8C95AA]" style="margin-top: 3px; line-height: 1.45;">Mensagens sincronizadas com resposta manual ou IA.</p>
                                </div>
                                <div class="gt-chat-channel-card">
                                    <div class="text-[10px] font-extrabold uppercase tracking-wider text-[#16749A]" style="margin-bottom: 4px;">Canal 03 · Clientes</div>
                                    <div class="text-xs font-extrabold text-white">Portal do Cliente</div>
                                    <p class="text-[11px] text-[#8C95AA]" style="margin-top: 3px; line-height: 1.45;">Chamados e dúvidas enviadas por clientes autenticados.</p>
                                </div>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-top: 22px;">
                                <a href="/admin/crm-autonomo" class="gt-btn-petrol gt-btn-xs">
                                    Gerenciar Agente IA
                                </a>
                                <a href="/admin/configuracoes" class="gt-btn-outline gt-btn-xs">
                                    Configurar WhatsApp
                                </a>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Polling em tempo real da lista do Inbox (sem precisar dar F5) */}
            <script dangerouslySetInnerHTML={{ __html: `
                (function () {
                    var listEl = document.getElementById('gt-inbox-list');
                    if (!listEl) return;
                    var statusFilter = listEl.dataset.statusFilter || 'open';
                    var activeId = listEl.dataset.activeId || '';
                    var stageLabels = ${JSON.stringify(STAGE_LABELS)};

                    function esc(s) {
                        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    }

                    async function pollInboxList() {
                        try {
                            var r = await fetch('/admin/atendimento/lista?status=' + encodeURIComponent(statusFilter), {
                                headers: { 'Accept': 'application/json' },
                                credentials: 'same-origin'
                            });
                            if (!r.ok) return;
                            var d = await r.json();
                            if (!d || !d.ok) return;

                            if (d.counts) {
                                var cAll = document.getElementById('gt-chat-count-all');
                                var cOpen = document.getElementById('gt-chat-count-open');
                                var cHand = document.getElementById('gt-chat-count-handoff');
                                var cClosed = document.getElementById('gt-chat-count-closed');
                                if (cAll) cAll.textContent = String(d.counts.all || 0);
                                if (cOpen) cOpen.textContent = String(d.counts.open || 0);
                                if (cHand) cHand.textContent = String(d.counts.handoff || 0);
                                if (cClosed) cClosed.textContent = String(d.counts.closed || 0);
                            }

                            var items = Array.isArray(d.conversations) ? d.conversations : [];
                            var inboxCountEl = document.getElementById('gt-inbox-count');
                            if (inboxCountEl) inboxCountEl.textContent = String(items.length);

                            if (items.length === 0) {
                                listEl.innerHTML = '<div class="flex flex-col items-center justify-center text-center px-5 py-12"><span class="gtb-icon-box !w-10 !h-10 !rounded-xl" style="margin-bottom: 12px;" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><div class="text-xs font-extrabold text-white" style="margin-bottom: 4px;">Fila limpa por aqui</div><p class="text-[11px] text-[#8C95AA]" style="line-height: 1.5; max-width: 210px;">Novas conversas do site, WhatsApp e Portal aparecerão automaticamente aqui.</p></div>';
                                return;
                            }

                            var searchInput = document.getElementById('gt-inbox-search');
                            var q = searchInput ? String(searchInput.value || '').toLowerCase().trim() : '';

                            var html = items.map(function (c) {
                                var isSelected = String(c.id) === String(activeId);
                                var isHandoff = c.status !== 'closed' && (c.status === 'waiting_staff' || c.crm_stage === 'handoff_human');
                                var stageText = isHandoff ? 'Aguardando Humano' : (stageLabels[c.crm_stage] || c.crm_stage || 'Novo Lead');
                                var name = c.visitor_name || c.client_name || c.visitor_company || ('Sessão #' + c.id);
                                var initials = String(name || 'GT').trim().slice(0, 2).toUpperCase();
                                var channelLabel = c.channel === 'whatsapp' ? 'WhatsApp' : c.channel === 'web_chat' ? 'Portal' : 'Site';
                                var preview = c.last_message_preview || c.visitor_objective || c.subject || c.visitor_email || 'Atendimento ao vivo';
                                var timeStr = '';
                                if (c.last_message_at) {
                                    try {
                                        timeStr = new Date(c.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    } catch (e) {}
                                }
                                var badgeCls = isHandoff ? 'gt-badge-warning' : c.ai_enabled ? 'gt-badge-success' : 'gt-badge-info';
                                var badgeTxt = isHandoff ? 'Humano Solicitado' : c.ai_enabled ? 'IA' : 'Humano';
                                var matchesSearch = !q || (name + ' ' + preview + ' ' + channelLabel + ' ' + stageText).toLowerCase().indexOf(q) !== -1;
                                var rowStyle = (isHandoff ? 'border-left: 3px solid #F2C230;' : '') + (matchesSearch ? '' : 'display:none;');
                                return '<a href="/admin/atendimento?id=' + encodeURIComponent(c.id) + '&status=' + encodeURIComponent(statusFilter) + '" style="' + rowStyle + '" class="gtb-chat-item block px-4 py-3.5 no-underline transition ' + (isSelected ? 'is-active' : '') + '">'
                                    + '<div class="flex items-start gap-2.5"><span class="gt-chat-avatar">' + esc(initials) + '</span><div class="min-w-0 flex-1">'
                                    + '<div class="flex items-center justify-between gap-2 mb-0.5">'
                                    + '<span class="text-[13px] font-extrabold text-white truncate">' + esc(name) + '</span>'
                                    + (timeStr ? '<span class="text-[10.5px] text-[#8C95AA] shrink-0 font-semibold">' + esc(timeStr) + '</span>' : '')
                                    + '</div>'
                                    + '<div class="text-[11.5px] text-[#8C95AA] truncate mb-2">' + esc(preview) + '</div>'
                                    + '<div class="flex items-center justify-between gap-1.5 flex-wrap">'
                                    + '<div class="flex items-center gap-1.5"><span class="gt-badge ' + badgeCls + '">' + badgeTxt + '</span><span class="text-[10.5px] font-semibold text-[#8C95AA]">· ' + esc(channelLabel) + '</span></div>'
                                    + '<span class="text-[10px] font-bold text-[#8C95AA]">' + esc(stageText) + '</span>'
                                    + '</div></div></div></a>';
                            }).join('');
                            listEl.innerHTML = html;
                        } catch (e) {
                        } finally {
                            setTimeout(pollInboxList, 5000);
                        }
                    }
                    setTimeout(pollInboxList, 5000);
                })();
            ` }} />

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
                                        bubble.style.maxWidth = 'min(76%, 620px)';
                                        bubble.className = 'px-4 py-3 rounded-2xl text-[13px] leading-relaxed ' + (isClient ? 'gtb-chat-bubble-client rounded-tl-xs' : 'gtb-chat-bubble-staff rounded-tr-xs');
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
