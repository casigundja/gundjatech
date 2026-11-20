@extends('layouts.portal')
@section('title', 'Orçamentos Recebidos • GundjaTech')
@section('header_title', 'Orçamentos & Propostas')

@section('content')
<div class="space-y-6">
    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Nº Orçamento</th>
                        <th class="px-6 py-4">Proposta</th>
                        <th class="px-6 py-4">Valor Total</th>
                        <th class="px-6 py-4">Validade</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($quotations as $q)
                        @php
                            $badgeClass = match ($q->status) {
                                'approved' => 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                                'rejected' => 'bg-red-500/10 text-red-400 border-red-500/30',
                                'expired' => 'bg-gray-800 text-gray-400 border-gray-700',
                                default => 'bg-[#E4A318]/10 text-[#E4A318] border-[#E4A318]/30',
                            };
                        @endphp
                        <tr class="hover:bg-[#161616]">
                            <td class="px-6 py-4 font-mono font-bold text-[#E4A318] whitespace-nowrap">{{ $q->quotation_number }}</td>
                            <td class="px-6 py-4 font-bold text-white">{{ $q->title }}</td>
                            <td class="px-6 py-4 font-extrabold text-white whitespace-nowrap">R$ {{ number_format($q->total, 2, ',', '.') }}</td>
                            <td class="px-6 py-4 text-gray-400 whitespace-nowrap">{{ $q->valid_until ? $q->valid_until->format('d/m/Y') : 'Sem data' }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border {{ $badgeClass }}">
                                    {{ $q->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                <a href="{{ route('portal.quotations.show', $q) }}" class="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold inline-block">Revisar &rarr;</a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhum orçamento recebido ainda.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-[#222222]">{{ $quotations->links() }}</div>
    </div>
</div>
@endsection
