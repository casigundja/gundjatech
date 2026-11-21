@extends('layouts.portal')
@section('title', 'Resumo • Portal do Cliente GundjaTech')
@section('header_title', 'Visão Geral do Cliente')

@section('content')
@php
    $canPortal = static fn (string $perm): bool => Auth::user()->hasPermission($perm);
@endphp
<!-- Signature GundjaTech Paleta 3 Client Welcome Banner -->
<div class="gt-hero-gold flex flex-col lg:flex-row lg:items-center justify-between gap-5">
    <div class="space-y-2">
        <span class="gt-hero-badge">
            <span class="gt-hero-dots" aria-hidden="true">
                <i style="background:#F2C230"></i>
                <i style="background:#16749A"></i>
                <i style="background:#FFFFFF"></i>
            </span>
            Portal do Cliente GundjaTech
        </span>
        <h2 class="gt-font-display text-xl sm:text-2xl font-bold tracking-tight">
            Bem-vindo, {{ explode(' ', Auth::user()->name)[0] }}<span class="gt-hero-dot">.</span>
        </h2>
        <p class="text-xs sm:text-sm gt-hero-muted max-w-2xl">
            Acompanhe seus projetos em execução, aprove orçamentos e fale diretamente com nossa equipe técnica em um só lugar.
        </p>
    </div>
    <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        @if($canPortal('portal.requests.manage'))
            <a href="{{ route('portal.requests.create') }}" class="gt-hero-cta">
                + Nova Demanda
            </a>
        @endif
        @if($canPortal('portal.chat.manage'))
            <a href="{{ route('portal.chat.index') }}" class="gt-hero-cta-ghost">
                Falar com Atendimento
            </a>
        @endif
    </div>
</div>

<!-- Metric Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <a href="{{ $canPortal('portal.projects.view') ? route('portal.projects.index') : '#' }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all group">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Projetos em Andamento</span>
            <div class="w-9 h-9 rounded-xl bg-[#F2C230]/10 text-[#F2C230] flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-[#F2C230] mt-2.5">{{ $activeProjects }}</div>
        @if($canPortal('portal.projects.view'))
            <span class="text-[11px] text-gray-400 group-hover:text-white mt-1 block font-medium">Acompanhar etapas &rarr;</span>
        @endif
    </a>

    <a href="{{ $canPortal('portal.requests.manage') ? route('portal.requests.index') : '#' }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline hover:border-amber-400/50 hover:-translate-y-0.5 transition-all group">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Solicitações Ativas</span>
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-white mt-2.5">{{ $pendingRequests }}</div>
        @if($canPortal('portal.requests.manage'))
            <span class="text-[11px] text-gray-400 group-hover:text-white mt-1 block font-medium">Ver histórico de status &rarr;</span>
        @endif
    </a>

    <a href="{{ $canPortal('portal.domains.view') ? route('portal.domains.index') : '#' }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline hover:border-sky-400/50 hover:-translate-y-0.5 transition-all group">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Domínios sob Custódia</span>
            <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-white mt-2.5">{{ $totalDomains }}</div>
        @if($canPortal('portal.domains.view'))
            <span class="text-[11px] text-gray-400 group-hover:text-white mt-1 block font-medium">DNS &amp; Vencimentos &rarr;</span>
        @endif
    </a>

    <a href="{{ $canPortal('portal.campaigns.view') ? route('portal.campaigns.index') : '#' }}" class="glass-card p-5 rounded-2xl border border-[#222222] block no-underline hover:border-emerald-400/50 hover:-translate-y-0.5 transition-all group">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Campanhas de Tráfego</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-2.5">{{ $activeCampaigns }}</div>
        @if($canPortal('portal.campaigns.view'))
            <span class="text-[11px] text-gray-400 group-hover:text-white mt-1 block font-medium">Relatório de leads &rarr;</span>
        @endif
    </a>
</div>

<!-- Pending Quotation Banner if Available -->
@if($quotationsPending->isNotEmpty() && $canPortal('portal.quotations.approve'))
    <div class="bg-gradient-to-r from-[#F2C230]/15 to-[#16749A]/15 border border-[#F2C230]/40 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <span class="text-xs font-bold text-[#F2C230] uppercase tracking-wider block">Você possui {{ $quotationsPending->count() }} orçamento(s) aguardando aprovação</span>
            <h3 class="text-lg font-bold text-white mt-0.5">Revise os detalhes técnicos e aprove com um clique para iniciar a execução.</h3>
        </div>
        <a href="{{ route('portal.quotations.index') }}" class="btn-primary text-xs px-6 py-3 rounded-xl font-bold shrink-0">
            Revisar Orçamentos &rarr;
        </a>
    </div>
@endif

<!-- Projects Progress & Recent Requests -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Projects Progress -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Meus Projetos em Execução</h3>
            @if($canPortal('portal.projects.view'))
                <a href="{{ route('portal.projects.index') }}" class="text-xs text-[#F2C230] hover:underline font-bold">Ver todos</a>
            @endif
        </div>
        <div class="space-y-4">
            @forelse($recentProjects as $p)
                <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] space-y-3">
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            @if($canPortal('portal.projects.view'))
                                <a href="{{ route('portal.projects.show', $p) }}" class="text-xs font-bold text-white hover:text-[#F2C230] block truncate">{{ $p->name }}</a>
                            @else
                                <span class="text-xs font-bold text-white block truncate">{{ $p->name }}</span>
                            @endif
                            <span class="text-[10px] text-gray-400 block mt-0.5">{{ $p->code }} • Previsão: {{ $p->deadline ? $p->deadline->format('d/m/Y') : 'Em definição' }}</span>
                        </div>
                        <span class="text-xs font-extrabold text-[#F2C230] shrink-0">{{ $p->progress_percentage }}%</span>
                    </div>
                    <div class="w-full bg-[#0B0B0B] h-2 rounded-full overflow-hidden border border-[#2E2D2C]">
                        <div class="bg-gradient-to-r from-[#F2C230] to-[#16749A] h-full rounded-full" style="width: {{ $p->progress_percentage }}%"></div>
                    </div>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhum projeto ativo no momento.</div>
            @endforelse
        </div>
    </div>

    <!-- Recent Requests -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Últimas Solicitações Enviadas</h3>
            @if($canPortal('portal.requests.manage'))
                <a href="{{ route('portal.requests.index') }}" class="text-xs text-[#F2C230] hover:underline font-bold">Ver todas</a>
            @endif
        </div>
        <div class="divide-y divide-[#222222]">
            @forelse($recentRequests as $req)
                <div class="py-3 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        @if($canPortal('portal.requests.manage'))
                            <a href="{{ route('portal.requests.show', $req) }}" class="text-xs font-bold text-white hover:text-[#F2C230] block truncate">{{ $req->title ?: 'Solicitação ' . $req->protocol }}</a>
                        @else
                            <span class="text-xs font-bold text-white block truncate">{{ $req->title ?: 'Solicitação ' . $req->protocol }}</span>
                        @endif
                        <span class="text-[10px] text-gray-400 block truncate">{{ $req->protocol }} • {{ $req->service?->name ?? 'Serviço Geral' }}</span>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300 shrink-0">
                        {{ $req->status_label }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhuma solicitação enviada recentemente.</div>
            @endforelse
        </div>
    </div>
</div>
@endsection
