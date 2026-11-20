@extends('layouts.admin')
@section('title', 'Atendimento & Chat • GundjaTech')
@section('header_title', 'Central de Atendimento em Tempo Real')

@section('content')
<div class="space-y-4" x-data="{ newChatModal: false }">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs">
            <a href="{{ route('admin.chat.index') }}" class="px-3 py-1.5 rounded-lg {{ ! request('status') ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Todas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'open']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'open' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Abertas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'ai_active']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'ai_active' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Piloto IA</a>
            <a href="{{ route('admin.chat.index', ['status' => 'waiting_staff']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'waiting_staff' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Aguardando Equipe</a>
            <a href="{{ route('admin.chat.index', ['status' => 'waiting_client']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'waiting_client' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Aguardando Cliente</a>
            <a href="{{ route('admin.chat.index', ['status' => 'closed']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'closed' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Encerradas</a>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <button type="button" id="gt-chat-sound-btn" class="gtb-ctrl-btn cursor-pointer" title="Ativar ou silenciar alerta sonoro de novas mensagens">
                <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                <span id="gt-chat-sound-lbl">Som: Ativo</span>
            </button>

            <button type="button" id="gt-chat-notif-btn" class="gtb-ctrl-btn cursor-pointer hidden" title="Ativar notificações do navegador">
                <svg class="w-3.5 h-3.5 text-[#34D399]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                <span>Avisos Desktop</span>
            </button>

            @if(Auth::user()->hasPermission('chat.manage'))
                <button @click="newChatModal = true" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">+ Novo Atendimento</button>
            @endif
        </div>
    </div>

    <div
        id="admin-chat-workspace"
        data-summary-url="{{ route('admin.chat.summary', array_filter(['status' => request('status')])) }}"
        data-active-id="{{ $activeConversation?->id ?? 0 }}"
        class="glass-card rounded-3xl border border-white/10 overflow-hidden flex flex-col md:flex-row min-h-[540px] md:h-[calc(100vh-230px)]"
    >
        <!-- Left Conversation List (Live auto-refresh every 5s) -->
        <div class="w-full md:w-72 lg:w-80 max-h-64 md:max-h-none border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#121623] shrink-0">
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Conversas (<span id="admin-chat-count">{{ $conversations->count() }}</span>)</h3>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#6EE7B7]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span> Ao vivo
                </span>
            </div>
            <div id="admin-chat-list" class="overflow-y-auto flex-1 divide-y divide-white/5">
                @forelse($conversations as $conv)
                    @php
                        $convName = $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante');
                        $isActive = isset($activeConversation) && $activeConversation->id === $conv->id;
                    @endphp
                    <a href="{{ route('admin.chat.index', array_filter(['conversation_id' => $conv->id, 'status' => request('status')])) }}" data-conv-id="{{ $conv->id }}" class="block p-4 hover:bg-white/5 transition {{ $isActive ? 'bg-white/5 border-l-4 border-[#F2C230]' : '' }}">
                        <div class="flex items-center justify-between mb-1 gap-2">
                            <span class="text-xs font-bold text-white truncate">{{ $convName }}</span>
                            <span class="text-[10px] text-[#8C95AA] shrink-0">{{ $conv->updated_at->format('H:i') }}</span>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-[11px] font-semibold text-[#F2C230] truncate">{{ $conv->subject }}</span>
                            @if(($conv->unread_client_count ?? 0) > 0 && ! $isActive)
                                <span class="gtb-count-circle shrink-0">{{ $conv->unread_client_count }}</span>
                            @endif
                        </div>
                        <div class="flex items-center justify-between gap-2 mt-1">
                            <p class="text-[11px] text-[#8C95AA] truncate">{{ $conv->latestMessage ? $conv->latestMessage->message : 'Nenhuma mensagem' }}</p>
                            <div class="flex items-center gap-1 shrink-0">
                                @if($conv->ai_enabled && $conv->status !== 'closed')
                                    <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#F2C230]/20 text-[#F2C230]">IA</span>
                                @endif
                                <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-[#8C95AA]">
                                    {{ $conv->channel === 'website_chat' ? 'Site' : 'Portal' }}
                                </span>
                            </div>
                        </div>
                    </a>
                @empty
                    <div class="p-6 text-center text-xs text-[#8C95AA]">Nenhuma conversa encontrada.</div>
                @endforelse
            </div>
        </div>

        <!-- Right Chat Area -->
        <div class="flex-1 flex flex-col bg-[#0C0F18] min-w-0">
            @if($activeConversation)
                @php
                    $activeName = $activeConversation->visitor_name ?: ($activeConversation->client?->display_name ?? 'Visitante');
                    $activeEmail = $activeConversation->visitor_email ?: $activeConversation->client?->email;
                    $activePhone = $activeConversation->visitor_phone ?: $activeConversation->client?->phone;
                    $lastMsgId = (int) ($activeConversation->messages->last()?->id ?? 0);
                @endphp
                <!-- Chat Header -->
                <div class="min-h-16 py-3 border-b border-white/10 px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 bg-[#121623]">
                    <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                            <h4 class="text-sm font-bold text-white truncate">{{ $activeName }}</h4>
                            <span id="admin-chat-status-badge" class="text-[10px] font-bold px-2 py-0.5 rounded {{ $activeConversation->status === 'closed' ? 'bg-gray-800 text-gray-400' : ($activeConversation->status === 'waiting_staff' ? 'bg-[#F2C230]/20 text-[#F2C230]' : 'bg-emerald-500/15 text-emerald-400') }}">
                                {{ $activeConversation->status_label }}
                            </span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-[#8C95AA]">
                                {{ $activeConversation->channel === 'website_chat' ? 'Chat do Site' : 'Portal do Cliente' }}
                            </span>
                        </div>
                        <span class="text-[10.5px] text-[#8C95AA] block truncate">
                            {{ $activeConversation->subject }}
                            @if($activeEmail) • {{ $activeEmail }} @endif
                            @if($activePhone) • {{ $activePhone }} @endif
                        </span>
                    </div>
                    @if(Auth::user()->hasPermission('chat.manage'))
                        <div class="flex flex-wrap items-center gap-2 shrink-0">
                            @if($activeConversation->status !== 'closed')
                                <form action="{{ route('admin.chat.toggle-ai', $activeConversation) }}" method="POST">
                                    @csrf
                                    <button type="submit" class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer {{ $activeConversation->ai_enabled ? 'bg-[#F2C230]/15 border border-[#F2C230]/40 text-[#F2C230] hover:bg-[#F2C230]/25' : 'bg-[#171B27] border border-white/10 text-[#D5DCEB] hover:border-[#F2C230]' }}">
                                        {{ $activeConversation->ai_enabled ? 'Assumir (Pausar IA)' : 'Ativar Piloto IA' }}
                                    </button>
                                </form>
                                <form action="{{ route('admin.chat.close', $activeConversation) }}" method="POST">
                                    @csrf
                                    <button type="submit" class="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer">
                                        Encerrar Atendimento
                                    </button>
                                </form>
                            @else
                                <form action="{{ route('admin.chat.reopen', $activeConversation) }}" method="POST">
                                    @csrf
                                    <button type="submit" class="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer">
                                        Reabrir Atendimento
                                    </button>
                                </form>
                            @endif
                        </div>
                    @endif
                </div>

                @php
                    $crmExtracted = is_array($activeConversation->extracted_data) ? $activeConversation->extracted_data : [];
                    $draftQuotationId = $crmExtracted['draft_quotation_id'] ?? $activeConversation->serviceRequest?->quotation?->id;
                @endphp
                <!-- Autonomous CRM Live Intelligence Bar -->
                <div class="px-4 sm:px-6 py-2.5 border-b border-white/10 bg-[#171B27]/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div class="flex flex-wrap items-center gap-2 min-w-0">
                        <span id="admin-chat-ai-badge" class="px-2 py-0.5 rounded-full font-extrabold text-[10px] {{ $activeConversation->ai_enabled ? 'bg-[#F2C230]/20 text-[#F2C230]' : 'bg-white/10 text-[#D5DCEB]' }}">
                            {{ $activeConversation->ai_enabled ? 'Piloto Automático IA' : 'Controle Humano' }}
                        </span>
                        <span class="px-2 py-0.5 rounded-full bg-[#121AFF]/20 text-[#93A3FF] font-bold text-[10px]">
                            {{ $activeConversation->crm_stage_label }} · Score {{ (int) $activeConversation->lead_score }}/100
                        </span>
                        @if($activeConversation->ai_summary)
                            <span id="admin-chat-ai-summary" class="text-[#D5DCEB] truncate max-w-md" title="{{ $activeConversation->ai_summary }}">{{ $activeConversation->ai_summary }}</span>
                        @endif
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        @if($activeConversation->service_request_id)
                            <a href="{{ route('admin.requests.show', $activeConversation->service_request_id) }}" class="font-bold text-[#F2C230] hover:underline">Solicitação &rarr;</a>
                        @endif
                        @if($draftQuotationId)
                            <a href="{{ route('admin.quotations.show', $draftQuotationId) }}" class="font-bold text-[#6EE7B7] hover:underline">Pré-Orçamento IA &rarr;</a>
                        @endif
                    </div>
                </div>

                <!-- Messages Stream -->
                <div
                    id="admin-chat-stream"
                    data-poll-url="{{ route('admin.chat.messages', $activeConversation) }}"
                    data-last-id="{{ $lastMsgId }}"
                    class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                >
                    @forelse($activeConversation->messages as $msg)
                        @php
                            $isStaff = $msg->sender_type === 'staff';
                            $senderLabel = $msg->sender?->name ?? $msg->sender_name ?? ($isStaff ? 'Equipe GundjaTech' : $activeName);
                        @endphp
                        <div class="flex {{ $isStaff ? 'justify-end' : 'justify-start' }}" data-msg-id="{{ $msg->id }}">
                            <div class="max-w-md p-3.5 rounded-2xl text-xs space-y-1 {{ $isStaff ? 'bg-[#F2C230] text-[#063B5C] font-semibold' : 'bg-[#171B27] text-white border border-white/10' }}">
                                <div class="text-[10px] font-bold opacity-80 flex items-center gap-1.5">
                                    <span>{{ $senderLabel }}</span>
                                    @if($msg->is_ai)
                                        <span class="px-1.5 py-0.2 rounded bg-[#063B5C]/15 text-[9px] font-extrabold uppercase">IA</span>
                                    @endif
                                </div>
                                <p class="leading-relaxed whitespace-pre-line">{{ $msg->message }}</p>
                                <span class="text-[9px] block text-right opacity-70">{{ $msg->created_at->format('d/m H:i') }}</span>
                            </div>
                        </div>
                    @empty
                        <div id="admin-chat-empty" class="text-center text-xs text-[#8C95AA] py-8">Nenhuma mensagem nesta conversa ainda.</div>
                    @endforelse
                </div>

                <!-- Send Input (AJAX live send with progressive fallback) -->
                @if(Auth::user()->hasPermission('chat.manage'))
                    <div class="p-4 border-t border-white/10 bg-[#121623]">
                        <form id="admin-chat-reply-form" action="{{ route('admin.chat.send', $activeConversation) }}" method="POST" class="flex gap-2">
                            @csrf
                            <input id="admin-chat-reply-input" type="text" name="message" required placeholder="Digite sua resposta em tempo real..." class="flex-1 bg-[#171B27] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F2C230]">
                            <button id="admin-chat-reply-btn" type="submit" class="btn-primary px-5 py-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer">
                                Enviar
                            </button>
                        </form>
                    </div>
                @endif
            @else
                <div class="flex-1 flex items-center justify-center text-[#8C95AA] text-xs p-6 text-center">
                    Aguardando novos atendimentos em tempo real. Quando um visitante chamar no chat do site, a conversa aparecerá automaticamente ao lado com alerta sonoro.
                </div>
            @endif
        </div>
    </div>

    <!-- Modal Start Conversation -->
    <div x-show="newChatModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#F2C230]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Iniciar Atendimento com Cliente</h3>
            <form action="{{ route('admin.chat.start') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-[#8C95AA] uppercase mb-1">Cliente ou Lead *</label>
                    <select name="client_id" required class="w-full bg-[#171B27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white">
                        @forelse($clients as $c)
                            <option value="{{ $c->id }}">{{ $c->display_name }} ({{ $c->status_label }})</option>
                        @empty
                            <option value="" disabled>Cadastre um cliente primeiro</option>
                        @endforelse
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-[#8C95AA] uppercase mb-1">Assunto *</label>
                    <input type="text" name="subject" required placeholder="Ex: Atualização de entrega do projeto" class="w-full bg-[#171B27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div>
                    <label class="block text-xs font-bold text-[#8C95AA] uppercase mb-1">Mensagem Inicial *</label>
                    <textarea name="message" rows="3" required placeholder="Escreva a mensagem ao cliente..." class="w-full bg-[#171B27] border border-white/10 rounded-xl px-4 py-2 text-xs text-white"></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="newChatModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Iniciar Conversa</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
(function () {
    const workspace = document.getElementById('admin-chat-workspace');
    const listEl = document.getElementById('admin-chat-list');
    const countEl = document.getElementById('admin-chat-count');
    const stream = document.getElementById('admin-chat-stream');
    const notify = window.GT_AdminNotify;

    // 1. Sound & Desktop Notification Controls
    const soundBtn = document.getElementById('gt-chat-sound-btn');
    const soundLbl = document.getElementById('gt-chat-sound-lbl');
    function syncSoundLabel() {
        if (!soundLbl || !notify) return;
        soundLbl.textContent = notify.isSoundEnabled() ? 'Som: Ativo' : 'Som: Mudo';
    }
    if (soundBtn && notify) {
        syncSoundLabel();
        soundBtn.addEventListener('click', function () {
            const next = !notify.isSoundEnabled();
            notify.setSoundEnabled(next);
            syncSoundLabel();
            if (next) notify.playChime();
        });
    }

    const notifBtn = document.getElementById('gt-chat-notif-btn');
    if (notifBtn && 'Notification' in window && Notification.permission === 'default') {
        notifBtn.classList.remove('hidden');
        notifBtn.addEventListener('click', function () {
            Notification.requestPermission().then(function (perm) {
                if (perm !== 'default') notifBtn.classList.add('hidden');
            });
        });
    }

    // 2. Append Message Helper (XSS-safe textContent)
    let lastMsgId = stream ? (parseInt(stream.dataset.lastId || '0', 10) || 0) : 0;
    if (stream) {
        stream.scrollTop = stream.scrollHeight;
    }

    function appendMessage(msg) {
        if (!stream || stream.querySelector('[data-msg-id="' + msg.id + '"]')) return false;
        const empty = document.getElementById('admin-chat-empty');
        if (empty) empty.remove();

        const isStaff = msg.sender_type === 'staff';
        const row = document.createElement('div');
        row.className = 'flex ' + (isStaff ? 'justify-end' : 'justify-start');
        row.dataset.msgId = String(msg.id);

        const bubble = document.createElement('div');
        bubble.className = 'max-w-md p-3.5 rounded-2xl text-xs space-y-1 ' + (isStaff ? 'bg-[#F2C230] text-[#063B5C] font-semibold' : 'bg-[#171B27] text-white border border-white/10');

        const senderEl = document.createElement('div');
        senderEl.className = 'text-[10px] font-bold opacity-80 flex items-center gap-1.5';
        senderEl.textContent = msg.sender_name || (isStaff ? 'Equipe GundjaTech' : 'Visitante');
        if (msg.is_ai) {
            const aiTag = document.createElement('span');
            aiTag.className = 'px-1.5 py-0.2 rounded bg-[#063B5C]/15 text-[9px] font-extrabold uppercase';
            aiTag.textContent = 'IA';
            senderEl.appendChild(aiTag);
        }

        const textEl = document.createElement('p');
        textEl.className = 'leading-relaxed whitespace-pre-line';
        textEl.textContent = msg.message;

        const timeEl = document.createElement('span');
        timeEl.className = 'text-[9px] block text-right opacity-70';
        timeEl.textContent = msg.created_at || '';

        bubble.appendChild(senderEl);
        bubble.appendChild(textEl);
        bubble.appendChild(timeEl);
        row.appendChild(bubble);
        stream.appendChild(row);
        stream.scrollTop = stream.scrollHeight;
        return true;
    }

    // 3. AJAX Reply Submission (instant feedback without page reload)
    const replyForm = document.getElementById('admin-chat-reply-form');
    const replyInput = document.getElementById('admin-chat-reply-input');
    const replyBtn = document.getElementById('admin-chat-reply-btn');
    if (replyForm && replyInput) {
        replyForm.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            const message = replyInput.value.trim();
            if (!message) return;

            const csrf = replyForm.querySelector('input[name="_token"]')?.value || '';
            if (replyBtn) replyBtn.disabled = true;

            try {
                const resp = await fetch(replyForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrf,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ message: message })
                });
                if (!resp.ok) {
                    replyForm.submit();
                    return;
                }
                const data = await resp.json();
                if (data && data.ok && data.message) {
                    replyInput.value = '';
                    appendMessage(data.message);
                    if (data.message.id > lastMsgId) lastMsgId = data.message.id;
                    const badge = document.getElementById('admin-chat-status-badge');
                    if (badge && data.status_label) badge.textContent = data.status_label;
                    pollSidebarSummary();
                }
            } catch (e) {
                replyForm.submit();
            } finally {
                if (replyBtn) replyBtn.disabled = false;
                replyInput.focus();
            }
        });
    }

    // 4. Render Live Sidebar Conversation List (XSS-safe DOM nodes)
    const activeConvId = workspace ? (parseInt(workspace.dataset.activeId || '0', 10) || 0) : 0;

    function renderSidebarList(conversations) {
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!conversations || conversations.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'p-6 text-center text-xs text-[#8C95AA]';
            empty.textContent = 'Nenhuma conversa encontrada.';
            listEl.appendChild(empty);
            return;
        }

        conversations.forEach(function (conv) {
            const isActive = conv.id === activeConvId;
            const link = document.createElement('a');
            link.href = conv.url;
            link.dataset.convId = String(conv.id);
            link.className = 'block p-4 hover:bg-white/5 transition' + (isActive ? ' bg-white/5 border-l-4 border-[#F2C230]' : '');

            const row1 = document.createElement('div');
            row1.className = 'flex items-center justify-between mb-1 gap-2';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'text-xs font-bold text-white truncate';
            nameSpan.textContent = conv.name;
            const timeSpan = document.createElement('span');
            timeSpan.className = 'text-[10px] text-[#8C95AA] shrink-0';
            timeSpan.textContent = conv.updated_at || '';
            row1.appendChild(nameSpan);
            row1.appendChild(timeSpan);

            const row2 = document.createElement('div');
            row2.className = 'flex items-center justify-between gap-2';
            const subjSpan = document.createElement('span');
            subjSpan.className = 'text-[11px] font-semibold text-[#F2C230] truncate';
            subjSpan.textContent = conv.subject || '';
            row2.appendChild(subjSpan);

            if ((conv.unread_client_count || 0) > 0 && !isActive) {
                const badge = document.createElement('span');
                badge.className = 'gtb-count-circle shrink-0';
                badge.textContent = String(conv.unread_client_count);
                row2.appendChild(badge);
            }

            const row3 = document.createElement('div');
            row3.className = 'flex items-center justify-between gap-2 mt-1';
            const msgP = document.createElement('p');
            msgP.className = 'text-[11px] text-[#8C95AA] truncate';
            msgP.textContent = conv.latest_message || 'Nenhuma mensagem';
            const badgesWrap = document.createElement('div');
            badgesWrap.className = 'flex items-center gap-1 shrink-0';
            if (conv.ai_enabled && conv.status !== 'closed') {
                const aiSpan = document.createElement('span');
                aiSpan.className = 'text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#F2C230]/20 text-[#F2C230]';
                aiSpan.textContent = 'IA';
                badgesWrap.appendChild(aiSpan);
            }
            const chanSpan = document.createElement('span');
            chanSpan.className = 'text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-[#8C95AA]';
            chanSpan.textContent = conv.channel_label || 'Portal';
            badgesWrap.appendChild(chanSpan);
            row3.appendChild(msgP);
            row3.appendChild(badgesWrap);

            link.appendChild(row1);
            link.appendChild(row2);
            link.appendChild(row3);
            listEl.appendChild(link);
        });
    }

    // 5. Poll Active Conversation Messages + Full Sidebar List every 5s
    let knownLatestConvId = null;
    let knownLatestClientMsgId = null;

    async function pollActiveConversation() {
        if (!stream) return;
        try {
            const resp = await fetch(stream.dataset.pollUrl + '?after_id=' + lastMsgId, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin'
            });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
                let gotClientMsg = false;
                data.messages.forEach(function (m) {
                    if (appendMessage(m) && m.sender_type === 'client') {
                        gotClientMsg = true;
                    }
                    if (m.id > lastMsgId) lastMsgId = m.id;
                });
                if (gotClientMsg && notify) {
                    notify.playChime();
                }
            }
            const badge = document.getElementById('admin-chat-status-badge');
            if (badge && data && data.status_label) {
                badge.textContent = data.status_label;
            }
        } catch (e) {}
    }

    async function pollSidebarSummary() {
        if (!workspace || !workspace.dataset.summaryUrl) return;
        try {
            const resp = await fetch(workspace.dataset.summaryUrl, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin'
            });
            if (!resp.ok) return;
            const data = await resp.json();
            if (!data || !data.ok) return;

            if (notify) notify.updateGlobalCounters(data);
            if (countEl && Array.isArray(data.conversations)) {
                countEl.textContent = String(data.conversations.length);
            }
            if (Array.isArray(data.conversations)) {
                renderSidebarList(data.conversations);
            }

            if (knownLatestConvId === null) {
                knownLatestConvId = data.latest_conversation_id;
                knownLatestClientMsgId = data.latest_client_message_id;
                return;
            }

            if (data.latest_conversation_id > knownLatestConvId) {
                knownLatestConvId = data.latest_conversation_id;
                knownLatestClientMsgId = Math.max(knownLatestClientMsgId, data.latest_client_message_id);
                const newest = (data.conversations || [])[0];
                const title = 'Novo atendimento: ' + (newest ? newest.name : 'Visitante');
                const body = newest ? newest.subject + ' — ' + newest.latest_message : 'Nova conversa recebida no chat do site.';
                const url = newest ? newest.url : @json(route('admin.chat.index'));
                if (notify) {
                    notify.playChime();
                    notify.showToast(title, body, url);
                    notify.notifyDesktop(title, body, url);
                }
            } else if (data.latest_client_message_id > knownLatestClientMsgId) {
                knownLatestClientMsgId = data.latest_client_message_id;
                const newest = (data.conversations || []).find(function (c) { return c.unread_client_count > 0; }) || (data.conversations || [])[0];
                if (newest && newest.id !== activeConvId && notify) {
                    const title = 'Nova mensagem de ' + newest.name;
                    notify.playChime();
                    notify.showToast(title, newest.latest_message, newest.url);
                    notify.notifyDesktop(title, newest.latest_message, newest.url);
                }
            }
        } catch (e) {}
    }

    pollSidebarSummary();
    setInterval(function () {
        pollActiveConversation();
        pollSidebarSummary();
    }, 5000);
})();
</script>
@endpush
