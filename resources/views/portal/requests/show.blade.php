@extends('layouts.portal')
@section('title', $serviceRequest->protocol . ' • GundjaTech')
@section('header_title', 'Protocolo: ' . $serviceRequest->protocol)

@section('content')
<div class="space-y-6">
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <span class="text-xs text-gray-400 font-mono">Protocolo: {{ $serviceRequest->protocol }}</span>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $serviceRequest->title ?: 'Solicitação ' . $serviceRequest->protocol }}</h2>
            <p class="text-xs text-gray-400 mt-1">Serviço: {{ $serviceRequest->service?->name ?? 'Serviço Geral' }} • Criado em {{ $serviceRequest->created_at->format('d/m/Y H:i') }}</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#1C1C1C] text-gray-300 border border-[#333333] self-start md:self-auto">
            Status: {{ $serviceRequest->status_label }}
        </span>
    </div>

    <!-- Quotation if Sent -->
    @if($serviceRequest->quotation && $serviceRequest->quotation->status !== 'draft')
        <div class="bg-gradient-to-r from-[#E4A318]/15 to-[#2E2D2C]/15 border border-[#E4A318]/40 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <span class="text-xs font-bold text-[#E4A318] uppercase tracking-wider block">Proposta Comercial Disponível</span>
                <h4 class="text-lg font-bold text-white">{{ $serviceRequest->quotation->quotation_number }} — Valor: R$ {{ number_format($serviceRequest->quotation->total, 2, ',', '.') }}</h4>
            </div>
            <a href="{{ route('portal.quotations.show', $serviceRequest->quotation) }}" class="btn-primary text-xs px-6 py-3 rounded-xl font-bold shrink-0">
                Visualizar Orçamento
            </a>
        </div>
    @endif

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-3">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição Enviada</h3>
                <div class="p-4 bg-[#141414] rounded-xl text-xs text-gray-200 leading-relaxed whitespace-pre-line border border-[#2E2D2C]">
                    {{ $serviceRequest->description }}
                </div>
            </div>

            @if($serviceRequest->attachments->isNotEmpty())
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-3">
                    <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Anexos Enviados</h3>
                    <div class="space-y-2">
                        @foreach($serviceRequest->attachments as $att)
                            <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between gap-3">
                                <div class="text-xs truncate">
                                    <span class="font-bold text-white block truncate">{{ $att->file_name }}</span>
                                    <span class="text-[10px] text-gray-400">{{ $att->file_size ? round($att->file_size / 1024) . ' KB' : '' }}</span>
                                </div>
                                <a href="{{ route('portal.requests.attachments.download', [$serviceRequest, $att]) }}" class="btn-secondary text-xs px-3 py-1.5 rounded-lg font-bold shrink-0">Baixar</a>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            <!-- Timeline -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Andamento da Solicitação</h3>
                <div class="space-y-4 border-l-2 border-[#2E2D2C] pl-5 relative">
                    @forelse($serviceRequest->statusHistories as $h)
                        <div class="relative text-xs">
                            <span class="w-2.5 h-2.5 rounded-full bg-[#E4A318] absolute -left-[26px] top-1"></span>
                            <div class="font-bold text-white">{{ $h->new_status_label }}</div>
                            <p class="text-gray-400 mt-0.5">{{ $h->comment }}</p>
                            <span class="text-[10px] text-gray-500 mt-1 block">{{ $h->created_at->format('d/m/Y H:i') }}</span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Aguardando primeira atualização da equipe.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <div class="space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] text-xs space-y-3">
                <h3 class="text-xs font-bold text-white uppercase tracking-wider mb-2">Suporte Direto</h3>
                <p class="text-gray-400">Tem alguma dúvida urgente sobre esta solicitação?</p>
                <a href="{{ route('portal.chat.index') }}" class="btn-secondary w-full py-2.5 rounded-xl text-center font-bold block">
                    Abrir Chat com a Equipe
                </a>
            </div>
        </div>
    </div>
</div>
@endsection
