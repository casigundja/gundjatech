@extends('layouts.admin')
@section('title', $quotation->quotation_number . ' • GundjaTech')
@section('header_title', 'Orçamento ' . $quotation->quotation_number)

@section('content')
@php
    $statusBadgeClass = match ($quotation->status) {
        'approved' => 'bg-emerald-500/15 text-[#6EE7B7] border border-emerald-500/35',
        'sent' => 'bg-[#F2C230]/20 text-[#F2C230] border border-[#F2C230]/40',
        'rejected' => 'bg-red-500/15 text-red-400 border border-red-500/35',
        'expired' => 'bg-white/10 text-[#D5DCEB] border border-white/15',
        default => 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    };
@endphp
<div class="space-y-6">
    <!-- Proposal Header -->
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $quotation->quotation_number }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold {{ $statusBadgeClass }}">
                    {{ $quotation->status_label }}
                </span>
            </div>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $quotation->title }}</h2>
            <p class="text-xs text-gray-400 mt-1">
                Para:
                @if($quotation->client)
                    <a href="{{ route('admin.clients.show', $quotation->client) }}" class="text-[#E4A318] hover:underline font-bold">{{ $recipientContact['name'] }}</a>
                @else
                    <span class="text-white font-bold">{{ $recipientContact['name'] }}</span>
                @endif
                @if($recipientContact['company'])
                    <span class="text-gray-300">({{ $recipientContact['company'] }})</span>
                @endif
                @if($recipientContact['email'])
                    • <a href="mailto:{{ $recipientContact['email'] }}" class="hover:underline">{{ $recipientContact['email'] }}</a>
                @endif
                @if($recipientContact['phone'])
                    • {{ $recipientContact['phone'] }}
                @endif
                • Emitido por {{ $quotation->creator?->name ?? 'Equipe' }}
                • Validade: {{ $quotation->valid_until ? $quotation->valid_until->format('d/m/Y') : 'A combinar' }}
            </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            @if($quotation->project)
                <a href="{{ route('admin.projects.show', $quotation->project) }}" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold">
                    Ver Projeto {{ $quotation->project->code }} &rarr;
                </a>
            @elseif(Auth::user()->hasPermission('quotations.manage') && Auth::user()->hasPermission('projects.manage') && ! in_array($quotation->status, ['rejected', 'expired'], true))
                <form action="{{ route('admin.quotations.convert', $quotation) }}" method="POST">
                    @csrf
                    <button type="submit" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold">
                        Converter em Projeto
                    </button>
                </form>
            @endif
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Itemized Proposal -->
        <div class="lg:col-span-2 space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Escopo & Itens Orçados</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                            <tr>
                                <th class="px-4 py-3">Descrição</th>
                                <th class="px-4 py-3 text-center">Qtd</th>
                                <th class="px-4 py-3 text-right">Valor Unit.</th>
                                <th class="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#222222]">
                            @forelse($quotation->items as $item)
                                <tr>
                                    <td class="px-4 py-3">
                                        <span class="font-semibold text-white block">{{ $item->description }}</span>
                                        @if($item->service)
                                            <span class="text-[10px] text-[#E4A318]">Serviço: {{ $item->service->name }}</span>
                                        @endif
                                    </td>
                                    <td class="px-4 py-3 text-center text-gray-300">{{ $item->quantity }}</td>
                                    <td class="px-4 py-3 text-right text-gray-300 whitespace-nowrap">R$ {{ number_format($item->unit_price, 2, ',', '.') }}</td>
                                    <td class="px-4 py-3 text-right font-bold text-white whitespace-nowrap">R$ {{ number_format($item->total_price, 2, ',', '.') }}</td>
                                </tr>
                            @empty
                                <tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">Nenhum item cadastrado.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>

                <!-- Summary Box -->
                <div class="pt-4 border-t border-[#222222] flex flex-col items-end space-y-1 text-xs">
                    <div class="flex justify-between w-64">
                        <span class="text-gray-400">Subtotal:</span>
                        <span class="text-white font-semibold">R$ {{ number_format($quotation->subtotal, 2, ',', '.') }}</span>
                    </div>
                    <div class="flex justify-between w-64">
                        <span class="text-gray-400">Desconto:</span>
                        <span class="text-emerald-400 font-semibold">- R$ {{ number_format($quotation->discount, 2, ',', '.') }}</span>
                    </div>
                    <div class="flex justify-between w-64 pt-2 border-t border-[#2E2D2C] text-base font-extrabold">
                        <span class="text-white">Total:</span>
                        <span class="text-[#E4A318]">R$ {{ number_format($quotation->total, 2, ',', '.') }}</span>
                    </div>
                </div>
            </div>

            @if($quotation->notes)
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-2">
                    <h3 class="text-sm font-bold text-white uppercase tracking-wider">Condições & Observações</h3>
                    <p class="text-xs text-gray-300 whitespace-pre-line leading-relaxed">{{ $quotation->notes }}</p>
                </div>
            @endif
        </div>

        <!-- Sidebar Controls -->
        <div class="space-y-6">
            <!-- Destinatário & Contato -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="text-sm font-bold text-white">Destinatário &amp; Contato</h3>
                    @if($quotation->client)
                        <a href="{{ route('admin.clients.show', $quotation->client) }}" class="text-[11px] font-bold text-[#E4A318] hover:underline">
                            Perfil 360° &rarr;
                        </a>
                    @endif
                </div>

                <div class="space-y-2.5 text-xs">
                    <div class="gtb-surface-box p-3 rounded-xl space-y-1">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Orçamento feito para</span>
                        <div class="text-sm font-extrabold text-white">{{ $recipientContact['name'] }}</div>
                        @if($recipientContact['company'])
                            <div class="text-[11px] font-semibold text-[#E4A318]">Empresa: {{ $recipientContact['company'] }}</div>
                        @endif
                    </div>

                    <div class="space-y-2 pt-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-gray-400">E-mail:</span>
                            @if($recipientContact['email'])
                                <a href="mailto:{{ $recipientContact['email'] }}?subject={{ rawurlencode('Orçamento ' . $quotation->quotation_number . ' - GundjaTech') }}" class="font-semibold text-white hover:text-[#E4A318] truncate max-w-[200px]">
                                    {{ $recipientContact['email'] }}
                                </a>
                            @else
                                <span class="text-gray-400">Não informado</span>
                            @endif
                        </div>

                        <div class="flex items-center justify-between gap-2">
                            <span class="text-gray-400">WhatsApp / Tel.:</span>
                            @if($recipientContact['phone'])
                                <span class="font-bold text-white">{{ $recipientContact['phone'] }}</span>
                            @else
                                <span class="text-gray-400">Não informado</span>
                            @endif
                        </div>

                        @if($recipientContact['location'])
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-gray-400">Localidade:</span>
                                <span class="font-semibold text-white">{{ $recipientContact['location'] }}</span>
                            </div>
                        @endif

                        @if($recipientContact['document'])
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-gray-400">CPF / CNPJ:</span>
                                <span class="font-mono font-semibold text-white">{{ $recipientContact['document'] }}</span>
                            </div>
                        @endif
                    </div>
                </div>

                <div class="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                    @if($recipientContact['whatsapp_url'])
                        <a href="{{ $recipientContact['whatsapp_url'] }}" target="_blank" rel="noopener noreferrer" class="btn-primary flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center no-underline">
                            Enviar no WhatsApp
                        </a>
                    @endif
                    @if($recipientContact['email'])
                        <a href="mailto:{{ $recipientContact['email'] }}?subject={{ rawurlencode('Orçamento ' . $quotation->quotation_number . ' - GundjaTech') }}" class="btn-secondary flex-1 py-2 px-3 rounded-xl text-xs font-bold text-center no-underline">
                            Enviar E-mail
                        </a>
                    @endif
                    @if($linkedConversation && Auth::user()->hasPermission('chat.view'))
                        <a href="{{ route('admin.chat.index', ['conversation_id' => $linkedConversation->id]) }}" class="btn-secondary w-full py-2 px-3 rounded-xl text-xs font-bold text-center no-underline">
                            Abrir Conversa no Chat &rarr;
                        </a>
                    @endif
                </div>
            </div>

            @if(Auth::user()->hasPermission('quotations.manage'))
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                    <h3 class="text-sm font-bold text-white">Atualizar Status da Proposta</h3>
                    <form action="{{ route('admin.quotations.status', $quotation) }}" method="POST" class="space-y-4">
                        @csrf
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Status</label>
                            <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                                <option value="draft" {{ $quotation->status === 'draft' ? 'selected' : '' }}>Rascunho</option>
                                <option value="sent" {{ $quotation->status === 'sent' ? 'selected' : '' }}>Enviado ao Cliente</option>
                                <option value="approved" {{ $quotation->status === 'approved' ? 'selected' : '' }}>Aprovado</option>
                                <option value="rejected" {{ $quotation->status === 'rejected' ? 'selected' : '' }}>Recusado</option>
                                <option value="expired" {{ $quotation->status === 'expired' ? 'selected' : '' }}>Expirado</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Observações</label>
                            <textarea name="notes" rows="3" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">{{ $quotation->notes }}</textarea>
                        </div>
                        <button type="submit" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold">Salvar Status</button>
                    </form>
                </div>
            @endif

            <div class="glass-card p-6 rounded-2xl border border-[#222222] text-xs space-y-2.5">
                <h3 class="text-sm font-bold text-white mb-2">Rastreabilidade</h3>
                <div><span class="text-gray-400">Criado em:</span> <span class="text-white">{{ $quotation->created_at->format('d/m/Y H:i') }}</span></div>
                @if($quotation->approved_at)
                    <div><span class="text-gray-400">Aprovado em:</span> <span class="text-emerald-400 font-bold">{{ $quotation->approved_at->format('d/m/Y H:i') }}</span></div>
                @endif
                @if($quotation->serviceRequest)
                    <div>
                        <span class="text-gray-400">Solicitação:</span>
                        <a href="{{ route('admin.requests.show', $quotation->serviceRequest) }}" class="text-[#E4A318] hover:underline font-mono font-bold">{{ $quotation->serviceRequest->protocol }}</a>
                    </div>
                @endif
                @if(Auth::user()->hasPermission('quotations.manage'))
                    <form
                        action="{{ route('admin.quotations.destroy', $quotation) }}"
                        method="POST"
                        data-confirm-title="Excluir orçamento"
                        data-confirm-message="Tem certeza que deseja excluir esta proposta comercial e seus itens? Essa ação não pode ser desfeita."
                        data-confirm-target="{{ $quotation->quotation_number ?? ('Orçamento #' . $quotation->id) }}"
                        data-confirm-button="Sim, excluir orçamento"
                        data-confirm-tone="danger"
                        class="pt-4 border-t border-[#222222]"
                    >
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="w-full py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer">
                            Excluir Orçamento
                        </button>
                    </form>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
