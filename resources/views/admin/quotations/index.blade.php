@extends('layouts.admin')
@section('title', 'Orçamentos • GundjaTech')
@section('header_title', 'Gestão de Orçamentos & Propostas')

@section('content')
<div class="space-y-6">
    <!-- KPI Row (Clickable Filter Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <a href="{{ route('admin.quotations.index') }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400 font-medium">Volume Total Orçado</span>
            <div class="text-2xl font-extrabold text-white mt-2">R$ {{ number_format($totalValue, 2, ',', '.') }}</div>
            <span class="text-[10px] text-gray-400">Todas as propostas emitidas</span>
        </a>
        <a href="{{ route('admin.quotations.index', ['status' => 'approved']) }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-emerald-400/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400 font-medium">Propostas Aprovadas</span>
            <div class="text-2xl font-extrabold text-emerald-400 mt-2">R$ {{ number_format($approvedValue, 2, ',', '.') }}</div>
            <span class="text-[10px] text-emerald-400 font-semibold">Receita contratada</span>
        </a>
        <a href="{{ route('admin.quotations.index', ['status' => 'open']) }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400 font-medium">Em Aberto / Aguardando</span>
            <div class="text-2xl font-extrabold text-[#E4A318] mt-2">{{ $pendingCount }}</div>
            <span class="text-[10px] text-gray-400">Rascunhos e enviadas</span>
        </a>
        <a href="{{ route('admin.quotations.index', ['status' => 'approved']) }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-sky-400/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400 font-medium">Taxa de Conversão</span>
            <div class="text-2xl font-extrabold text-sky-400 mt-2">{{ number_format($conversionRate, 1, ',', '.') }}%</div>
            <span class="text-[10px] text-gray-400">Orçamentos aprovados</span>
        </a>
    </div>

    <!-- Filters & CTA -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-3 max-w-2xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar por número, título ou cliente..." class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318] grow">
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Todos os status</option>
                <option value="draft" {{ request('status') === 'draft' ? 'selected' : '' }}>Rascunho</option>
                <option value="sent" {{ request('status') === 'sent' ? 'selected' : '' }}>Enviado</option>
                <option value="approved" {{ request('status') === 'approved' ? 'selected' : '' }}>Aprovado</option>
                <option value="rejected" {{ request('status') === 'rejected' ? 'selected' : '' }}>Recusado</option>
                <option value="expired" {{ request('status') === 'expired' ? 'selected' : '' }}>Expirado</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>

        @if(Auth::user()->hasPermission('quotations.manage'))
            <a href="{{ route('admin.quotations.create') }}" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start md:self-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Novo Orçamento</span>
            </a>
        @endif
    </div>

    <!-- Table -->
    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Nº Proposta / Validade</th>
                        <th class="px-6 py-4">Título & Origem</th>
                        <th class="px-6 py-4">Cliente &amp; Contato</th>
                        <th class="px-6 py-4">Valor Total</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($quotations as $q)
                        @php
                            $badgeClass = match ($q->status) {
                                'approved' => 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                                'sent' => 'bg-[#E4A318]/10 text-[#E4A318] border-[#E4A318]/30',
                                'rejected' => 'bg-red-500/10 text-red-400 border-red-500/30',
                                'expired' => 'bg-gray-800 text-gray-400 border-gray-700',
                                default => 'bg-sky-500/10 text-sky-400 border-sky-500/30',
                            };
                        @endphp
                        <tr class="hover:bg-[#161616] transition">
                            <td class="px-6 py-4">
                                <a href="{{ route('admin.quotations.show', $q) }}" class="font-mono font-bold text-[#E4A318] hover:underline block">{{ $q->quotation_number }}</a>
                                <span class="text-[11px] text-gray-400">Validade: {{ $q->valid_until ? $q->valid_until->format('d/m/Y') : 'Não definida' }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <a href="{{ route('admin.quotations.show', $q) }}" class="font-bold text-white hover:text-[#E4A318] block">{{ $q->title }}</a>
                                <span class="text-[11px] text-gray-400">
                                    {{ $q->items_count }} {{ $q->items_count === 1 ? 'item' : 'itens' }}
                                    @if($q->serviceRequest)
                                        • Protocolo {{ $q->serviceRequest->protocol }}
                                    @endif
                                    @if($q->project)
                                        • Projeto {{ $q->project->code }}
                                    @endif
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                @php
                                    $qName = $q->serviceRequest?->name ?: ($q->client?->display_name ?? 'Cliente removido');
                                    $qCompany = $q->client?->company_name ?: $q->serviceRequest?->company;
                                    $qEmail = $q->client?->email ?: $q->serviceRequest?->email;
                                    $qPhone = $q->client?->phone ?: $q->serviceRequest?->phone;
                                @endphp
                                <div class="text-white font-semibold">
                                    {{ $qName }}
                                    @if($qCompany && strcasecmp($qCompany, $qName) !== 0)
                                        <span class="text-[11px] font-normal text-[#E4A318]">({{ $qCompany }})</span>
                                    @endif
                                </div>
                                <div class="text-[11px] text-gray-400">
                                    {{ $qEmail ?: 'Sem e-mail' }}{{ $qPhone ? ' • ' . $qPhone : '' }}
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="font-extrabold text-white block">R$ {{ number_format($q->total, 2, ',', '.') }}</span>
                                @if((float) $q->discount > 0)
                                    <span class="text-[10px] text-emerald-400">Desc.: R$ {{ number_format($q->discount, 2, ',', '.') }}</span>
                                @endif
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border {{ $badgeClass }}">
                                    {{ $q->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <a href="{{ route('admin.quotations.show', $q) }}" class="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold inline-block">Abrir Proposta &rarr;</a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-10 text-center text-gray-500">Nenhum orçamento emitido ainda.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-[#222222]">{{ $quotations->links() }}</div>
    </div>
</div>
@endsection
