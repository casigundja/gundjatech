@extends('layouts.admin')
@section('title', 'Tráfego Pago • GundjaTech')
@section('header_title', 'Gestão de Tráfego Pago & Performance')

@section('content')
<div class="space-y-6" x-data="{ campModal: false }">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2 max-w-xl w-full">
            <select name="platform" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todas as plataformas</option>
                <option value="google_ads" {{ request('platform') === 'google_ads' ? 'selected' : '' }}>Google Ads</option>
                <option value="meta_ads" {{ request('platform') === 'meta_ads' ? 'selected' : '' }}>Meta Ads</option>
                <option value="tiktok_ads" {{ request('platform') === 'tiktok_ads' ? 'selected' : '' }}>TikTok Ads</option>
                <option value="linkedin_ads" {{ request('platform') === 'linkedin_ads' ? 'selected' : '' }}>LinkedIn Ads</option>
            </select>
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todos os status</option>
                <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Ativa</option>
                <option value="paused" {{ request('status') === 'paused' ? 'selected' : '' }}>Pausada</option>
                <option value="draft" {{ request('status') === 'draft' ? 'selected' : '' }}>Rascunho</option>
                <option value="ended" {{ request('status') === 'ended' ? 'selected' : '' }}>Encerrada</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>

        @if(Auth::user()->hasPermission('campaigns.manage'))
            <button @click="campModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start md:self-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Nova Campanha</span>
            </button>
        @endif
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($campaigns as $camp)
            @php
                $totalSpent = $camp->metrics->sum('spend') ?: (float) $camp->spent;
            @endphp
            <div class="glass-card rounded-2xl p-6 border border-[#222222] flex flex-col justify-between group hover:border-[#E4A318]/60 transition">
                <div class="space-y-4">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-[#E4A318]">{{ $camp->platform_label }}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded {{ $camp->status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : ($camp->status === 'paused' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700') }}">
                            {{ $camp->status_label }}
                        </span>
                    </div>

                    <div>
                        <a href="{{ route('admin.campaigns.show', $camp) }}" class="text-base font-bold text-white group-hover:text-[#E4A318] transition block">{{ $camp->name }}</a>
                        <span class="text-xs text-gray-400 mt-1 block">Cliente: {{ $camp->client?->display_name ?? 'N/A' }}</span>
                    </div>

                    <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span class="text-gray-400 block text-[10px]">Orçamento</span>
                            <span class="font-bold text-white">R$ {{ number_format($camp->budget, 2, ',', '.') }}</span>
                        </div>
                        <div>
                            <span class="text-gray-400 block text-[10px]">Investido</span>
                            <span class="font-bold text-[#E4A318]">R$ {{ number_format($totalSpent, 2, ',', '.') }}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-6 border-t border-[#222222] flex items-center justify-between text-xs mt-6">
                    <span class="text-gray-400">{{ $camp->metrics->sum('conversions') }} conversões</span>
                    <a href="{{ route('admin.campaigns.show', $camp) }}" class="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold">Ver Métricas &rarr;</a>
                </div>
            </div>
        @empty
            <div class="col-span-3 text-center py-12 text-gray-500">Nenhuma campanha cadastrada.</div>
        @endforelse
    </div>

    <div>{{ $campaigns->links() }}</div>

    <!-- Modal Create Campaign -->
    <div x-show="campModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Cadastrar Campanha de Tráfego</h3>
            <form action="{{ route('admin.campaigns.store') }}" method="POST" class="space-y-4">
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
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Campanha *</label>
                    <input type="text" name="name" required placeholder="Ex: Google Ads - Captação de Leads B2B" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Plataforma</label>
                        <select name="platform" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="google_ads">Google Ads</option>
                            <option value="meta_ads">Meta Ads (Insta/Face)</option>
                            <option value="tiktok_ads">TikTok Ads</option>
                            <option value="linkedin_ads">LinkedIn Ads</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Orçamento Mensal (R$)</label>
                        <input type="number" step="0.01" min="0" name="budget" required value="1500.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Data Início</label>
                        <input type="date" name="start_date" value="{{ date('Y-m-d') }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Objetivo</label>
                        <input type="text" name="objective" placeholder="Geração de Leads" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="campModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Iniciar Campanha</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
