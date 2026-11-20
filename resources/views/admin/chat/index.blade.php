@extends('layouts.admin')
@section('title', 'Atendimento & Chat • GundjaTech')
@section('header_title', 'Central de Atendimento em Tempo Real')

@section('content')
<div class="space-y-4" x-data="{ newChatModal: false }">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 text-xs">
            <a href="{{ route('admin.chat.index') }}" class="px-3 py-1.5 rounded-lg {{ ! request('status') ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Todas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'open']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'open' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Abertas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'waiting_staff']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'waiting_staff' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Aguardando Equipe</a>
            <a href="{{ route('admin.chat.index', ['status' => 'waiting_client']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'waiting_client' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Aguardando Cliente</a>
            <a href="{{ route('admin.chat.index', ['status' => 'closed']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'closed' ? 'bg-[#F2C230] text-[#063B5C] font-extrabold' : 'bg-[#171B27] text-[#D5DCEB] border border-white/10' }}">Encerradas</a>
        </div>
        @if(Auth::user()->hasPermission('chat.manage'))
            <button @click="newChatModal = true" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">+ Novo Atendimento</button>
        @endif
    </div>

    <div class="glass-card rounded-3xl border border-white/10 overflow-hidden flex flex-col md:flex-row min-h-[540px] md:h-[calc(100vh-230px)]">
        <!-- Left Conversation List -->
        <div class="w-full md:w-72 lg:w-80 max-h-64 md:max-h-none border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#121623] shrink-0">
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Conversas ({{ $conversations->count() }})</h3>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-[#6EE7B7]">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span> Ao vivo
                </span>
            </div>
            <div class="overflow-y-auto flex-1 divide-y divide-white/5">
                @forelse($conversations as $conv)
                    @php
                        $convName = $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante');
                        $isActive = isset($activeConversation) && $activeConversation->id === $conv->id;
                    @endphp
                    <a href="{{ route('admin.chat.index', array_filter(['conversation_id' => $conv->id, 'status' => request('status')])) }}" class="block p-4 hover:bg-white/5 transition {{ $isActive ? 'bg-white/5 border-l-4 border-[#F2C230]' : '' }}">
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
                            <span class="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-[#8C95AA] shrink-0">
                                {{ $conv->channel === 'website_chat' ? 'Site' : 'Portal' }}
                            </span>
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
                        @if($activeConversation->status !== 'closed')
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
                    @endif
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
                                <div class="text-[10px] font-bold opacity-80">{{ $senderLabel }}</div>
                                <p class="leading-relaxed whitespace-pre-line">{{ $msg->message }}</p>
                                <span class="text-[9px] block text-right opacity-70">{{ $msg->created_at->format('d/m H:i') }}</span>
                            </div>
                        </div>
                    @empty
                        <div id="admin-chat-empty" class="text-center text-xs text-[#8C95AA] py-8">Nenhuma mensagem nesta conversa ainda.</div>
                    @endforelse
                </div>

                <!-- Send Input -->
                @if(Auth::user()->hasPermission('chat.manage'))
                    <div class="p-4 border-t border-white/10 bg-[#121623]">
                        <form action="{{ route('admin.chat.send', $activeConversation) }}" method="POST" class="flex gap-2">
                            @csrf
                            <input type="text" name="message" required placeholder="Digite sua resposta em tempo real..." class="flex-1 bg-[#171B27] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F2C230]">
                            <button type="submit" class="btn-primary px-5 py-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer">
                                Enviar
                            </button>
                        </form>
                    </div>
                @endif
            @else
                <div class="flex-1 flex items-center justify-center text-[#8C95AA] text-xs p-6 text-center">
                    Selecione uma conversa ao lado ou inicie um novo atendimento.
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
    const stream = document.getElementById('admin-chat-stream');
    if (!stream) return;

    const pollUrl = stream.dataset.pollUrl;
    let lastId = parseInt(stream.dataset.lastId || '0', 10) || 0;
    stream.scrollTop = stream.scrollHeight;

    function appendMessage(msg) {
        if (stream.querySelector('[data-msg-id="' + msg.id + '"]')) return;
        const empty = document.getElementById('admin-chat-empty');
        if (empty) empty.remove();

        const isStaff = msg.sender_type === 'staff';
        const row = document.createElement('div');
        row.className = 'flex ' + (isStaff ? 'justify-end' : 'justify-start');
        row.dataset.msgId = String(msg.id);

        const bubble = document.createElement('div');
        bubble.className = 'max-w-md p-3.5 rounded-2xl text-xs space-y-1 ' + (isStaff ? 'bg-[#F2C230] text-[#063B5C] font-semibold' : 'bg-[#171B27] text-white border border-white/10');

        const senderEl = document.createElement('div');
        senderEl.className = 'text-[10px] font-bold opacity-80';
        senderEl.textContent = msg.sender_name || (isStaff ? 'Equipe GundjaTech' : 'Visitante');

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
    }

    async function pollMessages() {
        try {
            const resp = await fetch(pollUrl + '?after_id=' + lastId, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin'
            });
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
                data.messages.forEach(function (m) {
                    appendMessage(m);
                    if (m.id > lastId) lastId = m.id;
                });
            }
            const badge = document.getElementById('admin-chat-status-badge');
            if (badge && data && data.status_label) {
                badge.textContent = data.status_label;
            }
        } catch (e) {}
    }

    setInterval(pollMessages, 5000);
})();
</script>
@endpush
