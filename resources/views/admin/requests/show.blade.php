@extends('layouts.admin')
@section('title', $serviceRequest->protocol . ' • GundjaTech')
@section('header_title', 'Detalhes da Solicitação: ' . $serviceRequest->protocol)

@section('content')
<div class="space-y-6" x-data="{ quoteModal: false, convertModal: false }">
    <!-- Top Action Banner -->
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <span class="text-xs text-gray-400 font-mono">Protocolo: {{ $serviceRequest->protocol }}</span>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $serviceRequest->title ?: 'Solicitação ' . $serviceRequest->protocol }}</h2>
            <div class="text-xs text-gray-300 mt-1">
                Serviço: <span class="text-[#E4A318] font-bold">{{ $serviceRequest->service?->name ?? 'Serviço Personalizado' }}</span> • Aberto em {{ $serviceRequest->created_at->format('d/m/Y H:i') }}
            </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
            @if(Auth::user()->hasPermission('requests.manage'))
                <button @click="quoteModal = true" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span>Gerar Orçamento</span>
                </button>
                @if($serviceRequest->project)
                    <a href="{{ route('admin.projects.show', $serviceRequest->project) }}" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold">
                        Abrir Projeto {{ $serviceRequest->project->code }} &rarr;
                    </a>
                @elseif(in_array($serviceRequest->status, ['approved', 'quotation_sent', 'awaiting_approval', 'analyzing'], true))
                    <button @click="convertModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        <span>Converter em Projeto</span>
                    </button>
                @endif
            @endif
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Details -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Briefing description -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Descrição / Briefing do Cliente</h3>
                <div class="p-4 bg-[#141414] rounded-xl text-xs text-gray-200 leading-relaxed whitespace-pre-line border border-[#2E2D2C]">
                    {{ $serviceRequest->description }}
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2">
                    <div>
                        <span class="text-gray-400 block">Orçamento Estimado:</span>
                        <span class="font-bold text-white">{{ $serviceRequest->estimated_budget ? 'R$ ' . number_format($serviceRequest->estimated_budget, 2, ',', '.') : 'Não especificado' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-400 block">Prazo Desejado:</span>
                        <span class="font-bold text-white">{{ $serviceRequest->desired_deadline ? $serviceRequest->desired_deadline->format('d/m/Y') : 'A combinar' }}</span>
                    </div>
                    <div>
                        <span class="text-gray-400 block">Cliente Vinculado:</span>
                        @if($serviceRequest->client)
                            <a href="{{ route('admin.clients.show', $serviceRequest->client) }}" class="font-bold text-[#E4A318] hover:underline">{{ $serviceRequest->client->display_name }}</a>
                        @else
                            <span class="font-bold text-gray-400">Lead (Será criado automaticamente)</span>
                        @endif
                    </div>
                </div>
            </div>

            <!-- Request Attachments -->
            @if($serviceRequest->attachments->isNotEmpty())
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-3">
                    <h3 class="text-sm font-bold text-white uppercase tracking-wider">Anexos do Briefing ({{ $serviceRequest->attachments->count() }})</h3>
                    <div class="space-y-2">
                        @foreach($serviceRequest->attachments as $att)
                            <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between gap-4">
                                <div class="text-xs truncate">
                                    <span class="font-bold text-white block truncate">{{ $att->file_name }}</span>
                                    <span class="text-[10px] text-gray-400">{{ $att->file_size ? round($att->file_size / 1024) . ' KB' : '' }}</span>
                                </div>
                                <a href="{{ route('admin.requests.attachments.download', [$serviceRequest, $att]) }}" class="text-xs text-[#E4A318] hover:underline font-bold shrink-0">Baixar Anexo</a>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            <!-- Quotation if exists -->
            @if($serviceRequest->quotation)
                <div class="glass-card p-6 rounded-2xl border border-[#E4A318]/30 space-y-4">
                    <div class="flex items-center justify-between gap-4">
                        <div>
                            <h3 class="text-sm font-bold text-white">Orçamento Vinculado ({{ $serviceRequest->quotation->quotation_number }})</h3>
                            <span class="text-[11px] text-gray-400">Status: {{ $serviceRequest->quotation->status_label }}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-sm font-extrabold text-[#E4A318]">R$ {{ number_format($serviceRequest->quotation->total, 2, ',', '.') }}</span>
                            <a href="{{ route('admin.quotations.show', $serviceRequest->quotation) }}" class="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold">Abrir</a>
                        </div>
                    </div>
                    <div class="divide-y divide-[#222222] text-xs">
                        @foreach($serviceRequest->quotation->items as $item)
                            <div class="py-2 flex items-center justify-between">
                                <span class="text-gray-300">{{ $item->description }} (x{{ $item->quantity }})</span>
                                <span class="font-bold text-white">R$ {{ number_format($item->total_price, 2, ',', '.') }}</span>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            <!-- Status history timeline -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white">Histórico de Alterações</h3>
                <div class="space-y-4 border-l-2 border-[#2E2D2C] pl-5 relative">
                    @forelse($serviceRequest->statusHistories as $h)
                        <div class="relative text-xs">
                            <span class="w-2.5 h-2.5 rounded-full bg-[#E4A318] absolute -left-[26px] top-1"></span>
                            <div class="font-bold text-white">{{ $h->new_status_label }} <span class="text-[10px] font-normal text-gray-400">{{ $h->user ? '• ' . $h->user->name : '' }}</span></div>
                            <p class="text-gray-400 mt-0.5">{{ $h->comment }}</p>
                            <span class="text-[10px] text-gray-500 mt-1 block">{{ $h->created_at->format('d/m/Y H:i') }}</span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Nenhuma movimentação registrada ainda.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <!-- Sidebar Actions: Update Status & Staff -->
        <div class="space-y-6">
            @if(Auth::user()->hasPermission('requests.manage'))
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                    <h3 class="text-sm font-bold text-white">Atualizar Status & Atribuição</h3>
                    <form action="{{ route('admin.requests.update-status', $serviceRequest) }}" method="POST" class="space-y-4">
                        @csrf
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Status Atual</label>
                            <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                                <option value="new" {{ $serviceRequest->status === 'new' ? 'selected' : '' }}>Nova Solicitação</option>
                                <option value="analyzing" {{ $serviceRequest->status === 'analyzing' ? 'selected' : '' }}>Em Análise</option>
                                <option value="awaiting_info" {{ $serviceRequest->status === 'awaiting_info' ? 'selected' : '' }}>Aguardando Informações</option>
                                <option value="quotation_sent" {{ $serviceRequest->status === 'quotation_sent' ? 'selected' : '' }}>Orçamento Enviado</option>
                                <option value="awaiting_approval" {{ $serviceRequest->status === 'awaiting_approval' ? 'selected' : '' }}>Aguardando Aprovação</option>
                                <option value="approved" {{ $serviceRequest->status === 'approved' ? 'selected' : '' }}>Aprovada</option>
                                <option value="in_progress" {{ $serviceRequest->status === 'in_progress' ? 'selected' : '' }}>Em Execução</option>
                                <option value="completed" {{ $serviceRequest->status === 'completed' ? 'selected' : '' }}>Concluída</option>
                                <option value="cancelled" {{ $serviceRequest->status === 'cancelled' ? 'selected' : '' }}>Cancelada</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Responsável Técnico</label>
                            <select name="assigned_user_id" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                                <option value="">Nenhum atribuído</option>
                                @foreach($staffMembers as $staff)
                                    <option value="{{ $staff->id }}" {{ $serviceRequest->assigned_user_id == $staff->id ? 'selected' : '' }}>{{ $staff->name }} ({{ $staff->roleEnum()->label() }})</option>
                                @endforeach
                            </select>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Comentário da Mudança</label>
                            <textarea name="comment" rows="2" placeholder="Observação para o histórico..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]"></textarea>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Notas Internas (Privadas)</label>
                            <textarea name="internal_notes" rows="3" placeholder="Anotações visíveis apenas pela equipe..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">{{ $serviceRequest->internal_notes }}</textarea>
                        </div>

                        <button type="submit" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold">Salvar Atualização</button>
                    </form>
                </div>
            @endif
        </div>
    </div>

    <!-- Modal Generate Quotation -->
    <div x-show="quoteModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-lg w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Emitir Orçamento para esta Solicitação</h3>
            <form action="{{ route('admin.requests.quotation', $serviceRequest) }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Título da Proposta</label>
                    <input type="text" name="title" required value="Orçamento - {{ $serviceRequest->title ?: $serviceRequest->protocol }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Validade da Proposta</label>
                        <input type="date" name="valid_until" required value="{{ date('Y-m-d', strtotime('+15 days')) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Desconto (R$)</label>
                        <input type="number" step="0.01" min="0" name="discount" value="0" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Item do Orçamento</label>
                    <input type="text" name="items[0][description]" required value="{{ $serviceRequest->service?->name ?? $serviceRequest->title }}" placeholder="Descrição do item" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white mb-2">
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" min="1" name="items[0][quantity]" value="1" required class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-1.5 text-xs text-white" placeholder="Qtd">
                        <input type="number" step="0.01" min="0" name="items[0][unit_price]" value="{{ $serviceRequest->service?->base_price ?? $serviceRequest->estimated_budget ?? 0 }}" required class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-1.5 text-xs text-white" placeholder="Valor R$">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Condições / Observações</label>
                    <textarea name="notes" rows="2" placeholder="Condições de pagamento e entrega..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white"></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-3">
                    <button type="button" @click="quoteModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Emitir Orçamento</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Convert to Project -->
    <div x-show="convertModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Converter em Projeto</h3>
            <p class="text-xs text-gray-300">Isso criará automaticamente o projeto correspondente, configurará as 5 etapas padrão de execução e vinculará o orçamento/cliente.</p>
            <form action="{{ route('admin.requests.convert', $serviceRequest) }}" method="POST" class="pt-2">
                @csrf
                <div class="flex items-center justify-end gap-3">
                    <button type="button" @click="convertModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Confirmar & Criar Projeto</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
