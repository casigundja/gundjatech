@extends('layouts.admin')
@section('title', 'Atendimento & Chat • GundjaTech')
@section('header_title', 'Central de Atendimento em Tempo Real')

@section('content')
<div class="space-y-4" x-data="{ newChatModal: false }">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-xs">
            <a href="{{ route('admin.chat.index') }}" class="px-3 py-1.5 rounded-lg {{ ! request('status') ? 'bg-[#E4A318] text-[#0B0B0B] font-bold' : 'bg-[#141414] text-gray-300 border border-[#2E2D2C]' }}">Todas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'open']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'open' ? 'bg-[#E4A318] text-[#0B0B0B] font-bold' : 'bg-[#141414] text-gray-300 border border-[#2E2D2C]' }}">Abertas</a>
            <a href="{{ route('admin.chat.index', ['status' => 'waiting_client']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'waiting_client' ? 'bg-[#E4A318] text-[#0B0B0B] font-bold' : 'bg-[#141414] text-gray-300 border border-[#2E2D2C]' }}">Aguardando Cliente</a>
            <a href="{{ route('admin.chat.index', ['status' => 'closed']) }}" class="px-3 py-1.5 rounded-lg {{ request('status') === 'closed' ? 'bg-[#E4A318] text-[#0B0B0B] font-bold' : 'bg-[#141414] text-gray-300 border border-[#2E2D2C]' }}">Encerradas</a>
        </div>
        @if(Auth::user()->hasPermission('chat.manage'))
            <button @click="newChatModal = true" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold">+ Novo Atendimento</button>
        @endif
    </div>

    <div class="glass-card rounded-3xl border border-[#222222] overflow-hidden flex flex-col md:flex-row min-h-[540px] md:h-[calc(100vh-230px)]">
        <!-- Left Conversation List -->
        <div class="w-full md:w-72 lg:w-80 max-h-60 md:max-h-none border-b md:border-b-0 md:border-r border-[#222222] flex flex-col bg-[#111111] shrink-0">
            <div class="p-4 border-b border-[#222222] flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Conversas ({{ $conversations->count() }})</h3>
            </div>
            <div class="overflow-y-auto flex-1 divide-y divide-[#1C1C1C]">
                @forelse($conversations as $conv)
                    <a href="{{ route('admin.chat.index', ['conversation_id' => $conv->id]) }}" class="block p-4 hover:bg-[#181818] transition {{ (isset($activeConversation) && $activeConversation->id === $conv->id) ? 'bg-[#1C1C1C] border-l-4 border-[#E4A318]' : '' }}">
                        <div class="flex items-center justify-between mb-1 gap-2">
                            <span class="text-xs font-bold text-white truncate">{{ $conv->client?->display_name ?? 'Cliente' }}</span>
                            <span class="text-[10px] text-gray-500 shrink-0">{{ $conv->updated_at->format('H:i') }}</span>
                        </div>
                        <div class="text-[11px] font-semibold text-[#E4A318] truncate">{{ $conv->subject }}</div>
                        <p class="text-[11px] text-gray-400 truncate mt-0.5">{{ $conv->latestMessage ? $conv->latestMessage->message : 'Nenhuma mensagem' }}</p>
                    </a>
                @empty
                    <div class="p-6 text-center text-xs text-gray-500">Nenhuma conversa encontrada.</div>
                @endforelse
            </div>
        </div>

        <!-- Right Chat Area -->
        <div class="flex-1 flex flex-col bg-[#0B0B0B] min-w-0">
            @if($activeConversation)
                <!-- Chat Header -->
                <div class="min-h-16 py-3 border-b border-[#222222] px-6 flex items-center justify-between gap-4 bg-[#111111]">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <h4 class="text-sm font-bold text-white truncate">{{ $activeConversation->client?->display_name ?? 'Cliente' }}</h4>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded {{ $activeConversation->status === 'closed' ? 'bg-gray-800 text-gray-400' : 'bg-emerald-500/15 text-emerald-400' }}">
                                {{ $activeConversation->status_label }}
                            </span>
                        </div>
                        <span class="text-[10px] text-gray-400 block truncate">{{ $activeConversation->subject }} • {{ $activeConversation->client?->email }}</span>
                    </div>
                    @if(Auth::user()->hasPermission('chat.manage'))
                        @if($activeConversation->status !== 'closed')
                            <form action="{{ route('admin.chat.close', $activeConversation) }}" method="POST">
                                @csrf
                                <button type="submit" class="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                                    Encerrar Atendimento
                                </button>
                            </form>
                        @else
                            <form action="{{ route('admin.chat.reopen', $activeConversation) }}" method="POST">
                                @csrf
                                <button type="submit" class="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
                                    Reabrir Atendimento
                                </button>
                            </form>
                        @endif
                    @endif
                </div>

                <!-- Messages Stream -->
                <div class="flex-1 overflow-y-auto p-6 space-y-4">
                    @forelse($activeConversation->messages as $msg)
                        @php
                            $isStaff = $msg->sender_type === 'staff';
                        @endphp
                        <div class="flex {{ $isStaff ? 'justify-end' : 'justify-start' }}">
                            <div class="max-w-md p-3.5 rounded-2xl text-xs space-y-1 {{ $isStaff ? 'bg-[#E4A318] text-[#0B0B0B] font-medium' : 'bg-[#181818] text-white border border-[#2E2D2C]' }}">
                                <div class="text-[10px] font-bold opacity-75">{{ $msg->sender?->name ?? ($isStaff ? 'Equipe GundjaTech' : 'Cliente') }}</div>
                                <p class="leading-relaxed whitespace-pre-line">{{ $msg->message }}</p>
                                <span class="text-[9px] block text-right opacity-70">{{ $msg->created_at->format('d/m H:i') }}</span>
                            </div>
                        </div>
                    @empty
                        <div class="text-center text-xs text-gray-500 py-8">Nenhuma mensagem nesta conversa ainda.</div>
                    @endforelse
                </div>

                <!-- Send Input -->
                @if(Auth::user()->hasPermission('chat.manage'))
                    <div class="p-4 border-t border-[#222222] bg-[#111111]">
                        <form action="{{ route('admin.chat.send', $activeConversation) }}" method="POST" class="flex gap-2">
                            @csrf
                            <input type="text" name="message" required placeholder="Digite sua resposta em tempo real..." class="flex-1 bg-[#181818] border border-[#2E2D2C] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                            <button type="submit" class="btn-primary px-5 py-3 rounded-xl text-xs font-bold shrink-0">
                                Enviar
                            </button>
                        </form>
                    </div>
                @endif
            @else
                <div class="flex-1 flex items-center justify-center text-gray-500 text-xs">
                    Selecione uma conversa ao lado ou inicie um novo atendimento.
                </div>
            @endif
        </div>
    </div>

    <!-- Modal Start Conversation -->
    <div x-show="newChatModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Iniciar Atendimento com Cliente</h3>
            <form action="{{ route('admin.chat.start') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Cliente *</label>
                    <select name="client_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                        @foreach($clients as $c)
                            <option value="{{ $c->id }}">{{ $c->display_name }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Assunto *</label>
                    <input type="text" name="subject" required placeholder="Ex: Atualização de entrega do projeto" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Mensagem Inicial *</label>
                    <textarea name="message" rows="3" required placeholder="Escreva a mensagem ao cliente..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white"></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="newChatModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Iniciar Conversa</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
