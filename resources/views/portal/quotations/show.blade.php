@extends('layouts.portal')
@section('title', 'Orçamento ' . $quotation->quotation_number . ' • GundjaTech')
@section('header_title', 'Orçamento: ' . $quotation->quotation_number)

@section('content')
<div class="max-w-4xl mx-auto space-y-6" x-data="{ rejectModal: false }">
    <div class="glass-card p-6 sm:p-8 rounded-3xl border border-[#E4A318]/30 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#222222] gap-4">
            <div>
                <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $quotation->quotation_number }}</span>
                <h2 class="text-2xl font-extrabold text-white mt-1">{{ $quotation->title }}</h2>
                <span class="text-xs text-gray-400">Válido até {{ $quotation->valid_until ? $quotation->valid_until->format('d/m/Y') : 'Data não informada' }}</span>
            </div>
            <div class="sm:text-right">
                <span class="text-[10px] uppercase text-gray-400 font-bold block">Valor Total</span>
                <span class="text-3xl font-extrabold text-[#E4A318]">R$ {{ number_format($quotation->total, 2, ',', '.') }}</span>
                @if((float) $quotation->discount > 0)
                    <span class="text-[11px] text-emerald-400 block">Inclui desconto de R$ {{ number_format($quotation->discount, 2, ',', '.') }}</span>
                @endif
            </div>
        </div>

        <!-- Items Table -->
        <div class="space-y-4">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Itens do Orçamento</h3>
            <div class="divide-y divide-[#222222] text-xs">
                @foreach($quotation->items as $item)
                    <div class="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <span class="font-bold text-white block">{{ $item->description }}</span>
                            <span class="text-gray-400">Quantidade: {{ $item->quantity }} • Valor Unitário: R$ {{ number_format($item->unit_price, 2, ',', '.') }}</span>
                        </div>
                        <span class="font-extrabold text-white shrink-0">R$ {{ number_format($item->total_price, 2, ',', '.') }}</span>
                    </div>
                @endforeach
            </div>
        </div>

        @if($quotation->notes)
            <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] text-xs text-gray-300 whitespace-pre-line">
                <span class="font-bold text-white block mb-1">Observações da Proposta:</span>
                {{ $quotation->notes }}
            </div>
        @endif

        <!-- Approval / Rejection Actions -->
        @php
            $isExpired = $quotation->valid_until !== null && $quotation->valid_until->endOfDay()->isPast();
        @endphp
        <div class="pt-4 border-t border-[#222222] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span class="text-xs text-gray-400">Ao aprovar, nosso time inicia o kickoff do projeto e emite o contrato.</span>
            @if($quotation->status === 'sent' && ! $isExpired)
                <div class="flex flex-wrap items-center gap-3">
                    <button type="button" @click="rejectModal = true" class="px-5 py-3 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition">
                        Solicitar Revisão / Recusar
                    </button>
                    <form action="{{ route('portal.quotations.approve', $quotation) }}" method="POST">
                        @csrf
                        <button type="submit" class="btn-primary px-8 py-3 rounded-xl text-sm font-bold">
                            Aprovar Orçamento Agora
                        </button>
                    </form>
                </div>
            @elseif($quotation->status === 'sent' && $isExpired)
                <span class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Proposta Expirada — solicite atualização no atendimento
                </span>
            @elseif($quotation->status === 'approved')
                <span class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ✓ Orçamento Aprovado com Sucesso
                </span>
            @else
                <span class="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                    Status: {{ $quotation->status_label }}
                </span>
            @endif
        </div>
    </div>

    <!-- Modal Reject Quotation -->
    <div x-show="rejectModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-red-500/40 space-y-4">
            <h3 class="text-base font-bold text-white">Recusar ou Solicitar Ajuste</h3>
            <p class="text-xs text-gray-400">Conte o motivo ou o que gostaria de ajustar para que nossa equipe comercial prepare uma nova proposta.</p>
            <form action="{{ route('portal.quotations.reject', $quotation) }}" method="POST" class="space-y-4">
                @csrf
                <textarea name="reason" rows="3" placeholder="Ex: Precisamos ajustar o prazo ou dividir em mais parcelas..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white"></textarea>
                <div class="flex items-center justify-end gap-3">
                    <button type="button" @click="rejectModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="px-5 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">Confirmar Recusa</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
