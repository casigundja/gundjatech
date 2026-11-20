@extends('layouts.portal')
@section('title', 'Financeiro & Faturas • GundjaTech')
@section('header_title', 'Histórico Financeiro')

@section('content')
<div class="space-y-6">
    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Vencimento</th>
                        <th class="px-6 py-4">Descrição</th>
                        <th class="px-6 py-4">Valor</th>
                        <th class="px-6 py-4">Forma</th>
                        <th class="px-6 py-4">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($transactions as $t)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-6 py-4 text-gray-400 whitespace-nowrap">
                                <span class="text-white block">{{ $t->due_date->format('d/m/Y') }}</span>
                                @if($t->paid_date)
                                    <span class="text-[10px] text-emerald-400">Pago em {{ $t->paid_date->format('d/m/Y') }}</span>
                                @endif
                            </td>
                            <td class="px-6 py-4">
                                <span class="font-bold text-white block">{{ $t->title }}</span>
                                <span class="text-[10px] text-gray-400">{{ $t->category }}{{ $t->project ? ' • ' . $t->project->code : '' }}</span>
                            </td>
                            <td class="px-6 py-4 font-bold text-white whitespace-nowrap">R$ {{ number_format($t->amount, 2, ',', '.') }}</td>
                            <td class="px-6 py-4 text-gray-300">{{ $t->payment_method ?? 'PIX / Boleto' }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold {{ $t->status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : ($t->status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400') }}">
                                    {{ $t->status_label }}
                                </span>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Nenhum lançamento financeiro registrado.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($transactions->hasPages())
            <div class="p-4 border-t border-[#222222]">{{ $transactions->links() }}</div>
        @endif
    </div>
</div>
@endsection
