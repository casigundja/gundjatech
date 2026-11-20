@extends('layouts.admin')
@section('title', $campaign->name . ' • GundjaTech')
@section('header_title', $campaign->name)

@section('content')
<div class="space-y-6" x-data="{ metricsModal: false }">
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold px-3 py-0.5 rounded-full bg-[#E4A318]/10 text-[#E4A318] border border-[#E4A318]/30">
                    {{ $campaign->platform_label }}
                </span>
                <span class="text-xs text-gray-400">Cliente: {{ $campaign->client?->display_name ?? 'N/A' }}</span>
            </div>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $campaign->name }}</h2>
        </div>

        @if(Auth::user()->hasPermission('campaigns.manage'))
            <div class="flex flex-wrap items-center gap-3 self-start md:self-auto">
                <form action="{{ route('admin.campaigns.status', $campaign) }}" method="POST" class="flex items-center gap-2">
                    @csrf
                    @method('PUT')
                    <select name="status" onchange="this.form.submit()" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2.5 text-xs text-white">
                        <option value="draft" {{ $campaign->status === 'draft' ? 'selected' : '' }}>Rascunho</option>
                        <option value="active" {{ $campaign->status === 'active' ? 'selected' : '' }}>Ativa</option>
                        <option value="paused" {{ $campaign->status === 'paused' ? 'selected' : '' }}>Pausada</option>
                        <option value="ended" {{ $campaign->status === 'ended' ? 'selected' : '' }}>Encerrada</option>
                    </select>
                </form>
                <button @click="metricsModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <span>+ Lançar Métricas</span>
                </button>
            </div>
        @endif
    </div>

    <!-- Aggregate Metrics -->
    @php
        $totSpend = (float) $campaign->metrics->sum('spend');
        $totClicks = (int) $campaign->metrics->sum('clicks');
        $totConv = (int) $campaign->metrics->sum('conversions');
        $avgCpa = $totConv > 0 ? $totSpend / $totConv : 0;
        $avgRoas = $campaign->metrics->count() > 0 ? (float) $campaign->metrics->avg('roas') : 0;
    @endphp

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div class="glass-card p-4 rounded-xl border border-[#222222]">
            <span class="text-[10px] text-gray-400 uppercase font-bold">Investimento</span>
            <div class="text-xl font-extrabold text-white mt-1">R$ {{ number_format($totSpend, 2, ',', '.') }}</div>
        </div>
        <div class="glass-card p-4 rounded-xl border border-[#222222]">
            <span class="text-[10px] text-gray-400 uppercase font-bold">Cliques Totais</span>
            <div class="text-xl font-extrabold text-white mt-1">{{ number_format($totClicks, 0, ',', '.') }}</div>
        </div>
        <div class="glass-card p-4 rounded-xl border border-[#222222]">
            <span class="text-[10px] text-gray-400 uppercase font-bold">Conversões</span>
            <div class="text-xl font-extrabold text-[#E4A318] mt-1">{{ $totConv }}</div>
        </div>
        <div class="glass-card p-4 rounded-xl border border-[#222222]">
            <span class="text-[10px] text-gray-400 uppercase font-bold">CPA Médio</span>
            <div class="text-xl font-extrabold text-emerald-400 mt-1">R$ {{ number_format($avgCpa, 2, ',', '.') }}</div>
        </div>
        <div class="glass-card p-4 rounded-xl border border-[#222222]">
            <span class="text-[10px] text-gray-400 uppercase font-bold">ROAS Médio</span>
            <div class="text-xl font-extrabold text-sky-400 mt-1">{{ number_format($avgRoas, 2, ',', '.') }}x</div>
        </div>
    </div>

    <!-- Metrics Table -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Histórico de Performance & Rastreabilidade</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-4 py-3">Data</th>
                        <th class="px-4 py-3">Impressões</th>
                        <th class="px-4 py-3">Cliques</th>
                        <th class="px-4 py-3">Conversões</th>
                        <th class="px-4 py-3">Gasto</th>
                        <th class="px-4 py-3">CPC</th>
                        <th class="px-4 py-3">CPA</th>
                        <th class="px-4 py-3">ROAS</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($campaign->metrics as $m)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-4 py-3 text-white font-mono">{{ $m->date->format('d/m/Y') }}</td>
                            <td class="px-4 py-3 text-gray-300">{{ number_format($m->impressions, 0, ',', '.') }}</td>
                            <td class="px-4 py-3 text-gray-300">{{ number_format($m->clicks, 0, ',', '.') }}</td>
                            <td class="px-4 py-3 font-bold text-[#E4A318]">{{ $m->conversions }}</td>
                            <td class="px-4 py-3 text-white font-bold">R$ {{ number_format($m->spend, 2, ',', '.') }}</td>
                            <td class="px-4 py-3 text-gray-300">R$ {{ number_format($m->cpc, 2, ',', '.') }}</td>
                            <td class="px-4 py-3 text-emerald-400">R$ {{ number_format($m->cpa, 2, ',', '.') }}</td>
                            <td class="px-4 py-3 font-bold text-white">{{ number_format($m->roas, 2, ',', '.') }}x</td>
                        </tr>
                    @empty
                        <tr><td colspan="8" class="px-4 py-6 text-center text-gray-500">Nenhuma métrica lançada ainda.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Add Metrics -->
    <div x-show="metricsModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Lançar Métricas de Desempenho</h3>
            <form action="{{ route('admin.campaigns.metrics', $campaign) }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Data da Métrica *</label>
                    <input type="date" name="date" value="{{ date('Y-m-d') }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Impressões</label>
                        <input type="number" min="0" name="impressions" required value="1000" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Cliques</label>
                        <input type="number" min="0" name="clicks" required value="50" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Conversões (Leads)</label>
                        <input type="number" min="0" name="conversions" required value="5" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Gasto (R$)</label>
                        <input type="number" step="0.01" min="0" name="spend" required value="100.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Valor Convertido Estimado (R$)</label>
                    <input type="number" step="0.01" min="0" name="conversion_value" value="450.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="metricsModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Salvar Métricas</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
