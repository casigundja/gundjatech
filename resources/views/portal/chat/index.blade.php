@extends('layouts.portal')
@section('title', 'Chat com a Equipe • GundjaTech')
@section('header_title', 'Atendimento Direto GundjaTech')

@section('content')
@if($conversation)
    @php
        $lastMsgId = (int) ($conversation->messages->last()?->id ?? 0);
    @endphp
    <div class="glass-card rounded-3xl border border-[#222222] overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[460px] bg-[#0B0B0B]">
        <!-- Chat Header -->
        @php
            $isClosed = $conversation->status === 'closed';
        @endphp
        <div class="min-h-16 py-3 border-b border-[#222222] px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 bg-[#111111]">
            <div>
                <h4 class="text-sm font-bold text-white">{{ $conversation->subject }}</h4>
                <span class="text-[10px] text-gray-400">Tempo médio de resposta: menos de 15 minutos</span>
            </div>
            <span id="portal-chat-status-badge" class="inline-flex items-center gap-1.5 text-xs font-semibold {{ $isClosed ? 'text-amber-400' : 'text-emerald-400' }}">
                <span id="portal-chat-status-dot" class="w-2 h-2 rounded-full {{ $isClosed ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse' }}"></span>
                <span id="portal-chat-status-text">{{ $isClosed ? 'Atendimento Encerrado' : 'Equipe Online' }}</span>
            </span>
        </div>

        <!-- Messages List -->
        <div
            id="portal-chat-stream"
            data-poll-url="{{ route('portal.chat.messages', $conversation) }}"
            data-last-id="{{ $lastMsgId }}"
            class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
            @forelse($conversation->messages as $msg)
                @php
                    $isMe = $msg->sender_type === 'client';
                    $senderLabel = $msg->sender?->name ?? $msg->sender_name ?? ($isMe ? 'Você' : 'Equipe GundjaTech');
                @endphp
                <div class="flex {{ $isMe ? 'justify-end' : 'justify-start' }}" data-msg-id="{{ $msg->id }}">
                    <div class="max-w-md p-3.5 rounded-2xl text-xs space-y-1 {{ $isMe ? 'bg-[#F2C230] text-[#063B5C] font-semibold' : 'bg-[#181818] text-white border border-[#2E2D2C]' }}">
                        <div class="text-[10px] font-bold opacity-80">{{ $senderLabel }}</div>
                        <p class="leading-relaxed whitespace-pre-line">{{ $msg->message }}</p>
                        <span class="text-[9px] block text-right opacity-70">{{ $msg->created_at->format('d/m H:i') }}</span>
                    </div>
                </div>
            @empty
                <div id="portal-chat-empty" class="text-center text-xs text-gray-500 py-8">Inicie uma conversa enviando sua mensagem abaixo.</div>
            @endforelse
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t border-[#222222] bg-[#111111] space-y-2">
            <div id="portal-chat-error" class="hidden text-[11px] font-semibold text-red-400 px-1"></div>
            <form id="portal-chat-form" action="{{ route('portal.chat.send', $conversation) }}" method="POST" class="flex gap-2">
                @csrf
                <input id="portal-chat-input" type="text" name="message" required maxlength="3000" placeholder="Digite sua mensagem para a equipe..." class="flex-1 bg-[#181818] border border-[#2E2D2C] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#F2C230]">
                <button id="portal-chat-submit" type="submit" class="btn-primary px-5 sm:px-6 py-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer">
                    Enviar
                </button>
            </form>
        </div>
    </div>
@else
    <div class="glass-card rounded-3xl border border-[#222222] p-10 text-center max-w-xl mx-auto space-y-4">
        <h3 class="text-lg font-bold text-white">Pré-visualização Administrativa</h3>
        <p class="text-xs text-gray-400 leading-relaxed">
            Sua conta possui perfil administrativo e não está vinculada a um cadastro de cliente final. Para responder conversas de clientes, acesse a Central de Atendimento no Painel Admin.
        </p>
        <div class="pt-2">
            <a href="{{ route('admin.chat.index') }}" class="btn-primary inline-flex px-5 py-2.5 rounded-xl text-xs font-bold">
                Abrir Central de Atendimento Admin &rarr;
            </a>
        </div>
    </div>
@endif
@endsection

@push('scripts')
<script>
(function () {
    const stream = document.getElementById('portal-chat-stream');
    if (!stream) return;

    const pollUrl = stream.dataset.pollUrl;
    const form = document.getElementById('portal-chat-form');
    const input = document.getElementById('portal-chat-input');
    const submitBtn = document.getElementById('portal-chat-submit');
    const errorBox = document.getElementById('portal-chat-error');
    const statusBadge = document.getElementById('portal-chat-status-badge');
    const statusDot = document.getElementById('portal-chat-status-dot');
    const statusText = document.getElementById('portal-chat-status-text');

    let lastId = parseInt(stream.dataset.lastId || '0', 10) || 0;
    let pollTimeout = null;
    let sending = false;
    stream.scrollTop = stream.scrollHeight;

    function updateStatusBadge(status) {
        if (!statusBadge || !statusDot || !statusText) return;
        const closed = status === 'closed';
        statusBadge.className = 'inline-flex items-center gap-1.5 text-xs font-semibold ' + (closed ? 'text-amber-400' : 'text-emerald-400');
        statusDot.className = 'w-2 h-2 rounded-full ' + (closed ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse');
        statusText.textContent = closed ? 'Atendimento Encerrado' : 'Equipe Online';
    }

    function appendMessage(msg) {
        if (stream.querySelector('[data-msg-id="' + msg.id + '"]')) return;
        const empty = document.getElementById('portal-chat-empty');
        if (empty) empty.remove();

        const isMe = msg.sender_type === 'client';
        const row = document.createElement('div');
        row.className = 'flex ' + (isMe ? 'justify-end' : 'justify-start');
        row.dataset.msgId = String(msg.id);

        const bubble = document.createElement('div');
        bubble.className = 'max-w-md p-3.5 rounded-2xl text-xs space-y-1 ' + (isMe ? 'bg-[#F2C230] text-[#063B5C] font-semibold' : 'bg-[#181818] text-white border border-[#2E2D2C]');

        const senderEl = document.createElement('div');
        senderEl.className = 'text-[10px] font-bold opacity-80';
        senderEl.textContent = msg.sender_name || (isMe ? 'Você' : 'Equipe GundjaTech');

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
        if (!sending) {
            try {
                const resp = await fetch(pollUrl + '?after_id=' + lastId, {
                    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    credentials: 'same-origin'
                });
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.ok) {
                        if (data.status) {
                            updateStatusBadge(data.status);
                        }
                        if (Array.isArray(data.messages) && data.messages.length > 0) {
                            data.messages.forEach(function (m) {
                                appendMessage(m);
                                if (m.id > lastId) lastId = m.id;
                            });
                        }
                    }
                }
            } catch (e) {}
        }
        pollTimeout = setTimeout(pollMessages, 5000);
    }

    if (form && input && submitBtn) {
        form.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            const text = input.value.trim();
            if (!text || sending) return;

            sending = true;
            submitBtn.disabled = true;
            if (errorBox) {
                errorBox.textContent = '';
                errorBox.classList.add('hidden');
            }

            try {
                const csrfInput = form.querySelector('input[name="_token"]');
                const resp = await fetch(form.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfInput ? csrfInput.value : ''
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ message: text })
                });

                const data = await resp.json().catch(function () { return null; });
                if (resp.ok && data && data.ok && data.message) {
                    appendMessage(data.message);
                    if (data.message.id > lastId) lastId = data.message.id;
                    if (data.ai_reply && data.ai_reply.message) {
                        appendMessage(data.ai_reply);
                        if (data.ai_reply.id > lastId) lastId = data.ai_reply.id;
                    }
                    if (data.status) updateStatusBadge(data.status);
                    input.value = '';
                    input.focus();
                } else if (errorBox) {
                    errorBox.textContent = (data && data.message) ? data.message : 'Não foi possível enviar sua mensagem. Tente novamente.';
                    errorBox.classList.remove('hidden');
                }
            } catch (e) {
                if (errorBox) {
                    errorBox.textContent = 'Erro de conexão ao enviar sua mensagem. Verifique sua internet e tente novamente.';
                    errorBox.classList.remove('hidden');
                }
            } finally {
                sending = false;
                submitBtn.disabled = false;
            }
        });
    }

    pollTimeout = setTimeout(pollMessages, 5000);
})();
</script>
@endpush
