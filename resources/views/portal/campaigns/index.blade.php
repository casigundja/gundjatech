@extends('layouts.portal')
@section('title', 'Tráfego Pago • GundjaTech')
@section('header_title', 'Desempenho de Tráfego Pago & Anúncios')

@section('content')
<div class="space-y-6">
    @forelse($campaigns as $camp)
        @php
            $totSpend = (float) ($camp->metrics->sum('spend') ?: $camp->spent);
            $totClicks = (int) $camp->metrics->sum('clicks');
            $totConv = (int) $camp->metrics->sum('conversions');
            $avgRoas = $camp->metrics->count() > 0 ? (float) $camp->metrics->avg('roas') : 0.0;
        @endphp
        <div class="glass-card rounded-3xl p-6 border border-[#222222] space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222222] gap-3">
                <div>
                    <span class="text-xs font-bold text-[#E4A318] uppercase">{{ $camp->platform_label }}</span>
                    <h3 class="text-xl font-bold text-white mt-0.5">{{ $camp->name }}</h3>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto {{ $camp->status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-300' }}">
                    {{ $camp->status === 'active' ? 'Ativa & Otimizada' : $camp->status_label }}
                </span>
            </div>

            <!-- Aggregate numbers -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C]">
                    <span class="text-[10px] text-gray-400 uppercase font-bold">Total Investido</span>
                    <div class="text-lg font-extrabold text-white mt-1">R$ {{ number_format($totSpend, 2, ',', '.') }}</div>
                </div>
                <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C]">
                    <span class="text-[10px] text-gray-400 uppercase font-bold">Cliques Gerados</span>
                    <div class="text-lg font-extrabold text-white mt-1">{{ number_format($totClicks, 0, ',', '.') }}</div>
                </div>
                <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C]">
                    <span class="text-[10px] text-gray-400 uppercase font-bold">Leads / Conversões</span>
                    <div class="text-lg font-extrabold text-[#E4A318] mt-1">{{ $totConv }}</div>
                </div>
                <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C]">
                    <span class="text-[10px] text-gray-400 uppercase font-bold">ROAS Médio</span>
                    <div class="text-lg font-extrabold text-emerald-400 mt-1">{{ number_format($avgRoas, 2, ',', '.') }}x</div>
                </div>
            </div>

            @if($camp->metrics->isNotEmpty())
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                            <tr>
                                <th class="px-4 py-3">Data</th>
                                <th class="px-4 py-3">Impressões</th>
                                <th class="px-4 py-3">Cliques</th>
                                <th class="px-4 py-3">Conversões</th>
                                <th class="px-4 py-3">Gasto</th>
                                <th class="px-4 py-3">CPA</th>
                                <th class="px-4 py-3">ROAS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-[#222222]">
                            @foreach($camp->metrics->take(10) as $m)
                                <tr class="hover:bg-[#161616]">
                                    <td class="px-4 py-2.5 font-mono text-white">{{ $m->date->format('d/m/Y') }}</td>
                                    <td class="px-4 py-2.5 text-gray-300">{{ number_format($m->impressions, 0, ',', '.') }}</td>
                                    <td class="px-4 py-2.5 text-gray-300">{{ number_format($m->clicks, 0, ',', '.') }}</td>
                                    <td class="px-4 py-2.5 font-bold text-[#E4A318]">{{ $m->conversions }}</td>
                                    <td class="px-4 py-2.5 text-white">R$ {{ number_format($m->spend, 2, ',', '.') }}</td>
                                    <td class="px-4 py-2.5 text-emerald-400">R$ {{ number_format($m->cpa, 2, ',', '.') }}</td>
                                    <td class="px-4 py-2.5 font-bold text-white">{{ number_format($m->roas, 2, ',', '.') }}x</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </div>
    @empty
        <div class="glass-card p-12 text-center rounded-3xl border border-[#222222] text-gray-400 text-xs">
            Nenhuma campanha de tráfego ativa no momento. Deseja escalar suas vendas com Google ou Meta Ads? Fale com nosso atendimento!
        </div>
    @endforelse
</div>
@endsection
