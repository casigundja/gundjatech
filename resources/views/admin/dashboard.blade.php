@extends('layouts.admin')

@section('title', 'Dashboard • GundjaTech')
@section('header_title', 'Dashboard')

@section('content')
@php
    $periodLabels = [
        7 => 'Últimos 7 dias',
        30 => 'Últimos 30 dias',
        90 => 'Últimos 90 dias',
        365 => 'Últimos 12 meses',
    ];
    $currentPeriodLabel = $periodLabels[$periodDays] ?? 'Últimos 30 dias';
@endphp

<!-- Sub-Header Strip (Real Notifications Summary + Working Period Filter + Real CSV Export) -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
    <p class="text-xs sm:text-sm text-[#8C95AA]">
        Você tem
        <a href="{{ route('admin.requests.index') }}" class="font-bold text-[#F2C230] hover:underline">{{ $pendingRequests }} nova(s) solicitação(ões)</a>
        e
        <a href="{{ route('admin.chat.index') }}" class="font-bold text-[#F2C230] hover:underline">{{ $openConversations }} atendimento(s) aberto(s)</a>
        <span class="text-[#5D667B]">• Visão Geral Executiva</span>
    </p>

    <div class="flex flex-wrap items-center gap-2.5">
        <form action="{{ route('admin.dashboard') }}" method="GET" class="inline-flex items-center rounded-lg bg-[#171B27] border border-white/10 text-xs text-[#D5DCEB] overflow-hidden">
            <span class="px-3 py-1.5 flex items-center gap-2 border-r border-white/10">
                <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span>{{ $periodStart->translatedFormat('d M Y') }} - {{ now()->translatedFormat('d M Y') }}</span>
            </span>
            <select name="period" onchange="this.form.submit()" aria-label="Período do relatório" class="!bg-transparent !border-0 !rounded-none px-3 py-1.5 text-xs font-semibold text-[#D5DCEB] focus:outline-none cursor-pointer">
                @foreach($periodLabels as $days => $label)
                    <option value="{{ $days }}" @selected($periodDays === $days) class="bg-[#121623] text-white">{{ $label }}</option>
                @endforeach
            </select>
        </form>

        <a href="{{ route('admin.dashboard.export', ['period' => $periodDays]) }}" class="gtb-ctrl-btn !h-8" title="Exportar relatório CSV real">
            <span>Exportar CSV</span>
            <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </a>
    </div>
</div>

<!-- ROW 1: 3 REAL TOP KPI CARDS -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- KPI 1: Receita Recebida no Período -->
    <div class="gtb-card gtb-kpi-gold flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Receita Recebida ({{ $periodDays }}d)</span>
            </div>
            <a href="{{ route('admin.finance.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Financeiro">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                R$ {{ number_format($monthlyRevenue, 2, ',', '.') }}
            </span>
            @if($revenueGrowthPct !== null)
                <span class="gtb-growth-pill {{ $revenueGrowthPct < 0 ? '!bg-red-400/20 !text-red-300' : '' }}">
                    {{ $revenueGrowthPct >= 0 ? '+' : '' }}{{ number_format($revenueGrowthPct, 1, ',', '.') }}% {{ $revenueGrowthPct >= 0 ? '↗' : '↘' }}
                </span>
            @else
                <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                    A receber: R$ {{ number_format($pendingReceivables, 2, ',', '.') }}
                </span>
            @endif
        </div>
    </div>

    <!-- KPI 2: Clientes & Leads -->
    <div class="gtb-card gtb-kpi-blue flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Clientes & Leads</span>
            </div>
            <a href="{{ route('admin.clients.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Clientes">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                {{ $totalClients }} <small class="text-xs font-semibold text-[#8C95AA]">({{ $activeClients }} ativos · {{ $leadClients }} leads)</small>
            </span>
            @if($clientsGrowthPct !== null)
                <span class="gtb-growth-pill {{ $clientsGrowthPct < 0 ? '!bg-red-400/20 !text-red-300' : '' }}">
                    {{ $clientsGrowthPct >= 0 ? '+' : '' }}{{ number_format($clientsGrowthPct, 1, ',', '.') }}% {{ $clientsGrowthPct >= 0 ? '↗' : '↘' }}
                </span>
            @else
                <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                    +{{ $newClientsCurrent }} em {{ $periodDays }}d
                </span>
            @endif
        </div>
    </div>

    <!-- KPI 3: Solicitações & Projetos -->
    <div class="gtb-card gtb-kpi-petrol flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-petrol">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Solicitações & Projetos</span>
            </div>
            <a href="{{ route('admin.requests.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Solicitações">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2 flex-wrap">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                {{ $totalRequests }} <small class="text-xs font-semibold text-[#F2C230]">({{ $activeProjects }} proj. · {{ $pendingRequests }} pend.)</small>
            </span>
            @if($requestsGrowthPct !== null)
                <span class="gtb-growth-pill {{ $requestsGrowthPct < 0 ? '!bg-red-400/20 !text-red-300' : '' }}">
                    {{ $requestsGrowthPct >= 0 ? '+' : '' }}{{ number_format($requestsGrowthPct, 1, ',', '.') }}% {{ $requestsGrowthPct >= 0 ? '↗' : '↘' }}
                </span>
            @else
                <span class="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10.5px] font-bold text-[#8C95AA]">
                    +{{ $requestsCurrentPeriod }} em {{ $periodDays }}d
                </span>
            @endif
        </div>
    </div>
</div>

<!-- ROW 2: REAL 12-MONTH REVENUE BAR CHART (8 cols) + REAL CATEGORY CONCENTRIC RINGS (4 cols) -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left 8 cols: Real 12-Month Revenue Overview -->
    <section class="lg:col-span-8 gtb-card flex flex-col justify-between gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Visão Geral de Receita (12 meses)</h2>
                <span class="text-xs text-[#8C95AA]">Dados reais em <strong class="text-white">tempo real</strong></span>
            </div>

            <div class="flex items-center gap-2">
                <a href="{{ route('admin.finance.index') }}" class="gtb-ctrl-btn">
                    <span>Financeiro</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </a>
            </div>
        </div>

        <div class="flex items-center justify-end gap-4 text-[11px] font-semibold text-[#8C95AA]">
            <span class="flex items-center gap-1.5">
                <i class="w-2.5 h-2.5 rounded-xs bg-[#F2C230] inline-block"></i> Recebido (R$)
            </span>
            <span class="flex items-center gap-1.5">
                <i class="w-2.5 h-2.5 rounded-xs bg-[#121AFF] inline-block"></i> A Receber (R$)
            </span>
        </div>

        <!-- Paired Bar Stage with Live Current Month Tooltip -->
        <div class="gtb-paired-chart">
            @foreach($yAxisTicks as $tick)
                <div class="gtb-grid-line"><span>{{ $tick }}</span></div>
            @endforeach

            <!-- Live Current Month Summary Card -->
            <div class="gtb-float-tooltip hidden sm:block">
                <div class="text-[9.5px] text-[#8C95AA] font-semibold">Resumo <strong class="text-[#F2C230]">{{ $currentMonthLabel }}</strong></div>
                <div class="mt-1 space-y-1 text-[11px] font-extrabold">
                    <div class="flex items-center justify-between gap-3 text-white">
                        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-[#F2C230] shadow-[0_0_8px_#F2C230] inline-block"></i> R$ {{ number_format($currentMonthRevenue, 2, ',', '.') }}</span>
                        <span class="text-[9.5px] text-[#8C95AA] font-semibold">pago</span>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-[#D5DCEB]">
                        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-[#4E5BFF] shadow-[0_0_8px_#4E5BFF] inline-block"></i> R$ {{ number_format($currentMonthPending, 2, ',', '.') }}</span>
                        <span class="text-[9.5px] text-[#8C95AA] font-semibold">aberto</span>
                    </div>
                    <div class="pt-1 border-t border-white/10 text-[10px] text-[#8C95AA] font-semibold">
                        {{ $currentMonthRequests }} solicitação(ões) no mês
                    </div>
                </div>
            </div>

            <div class="gtb-bars-overlay">
                @foreach($chart12Series as $slot)
                    <div class="gtb-pair-group {{ $slot['is_current'] ? 'is-highlight' : '' }}" title="{{ $slot['full_label'] }} — Recebido: R$ {{ number_format($slot['paid'], 2, ',', '.') }} | A receber: R$ {{ number_format($slot['pending'], 2, ',', '.') }} | Solicitações: {{ $slot['requests'] }}">
                        <div class="gtb-bar-a" style="height: {{ $slot['paid_pct'] }}%"></div>
                        <div class="gtb-bar-b" style="height: {{ $slot['pending_pct'] }}%"></div>
                        <span class="gtb-month-lbl">{{ $slot['label'] }}</span>
                    </div>
                @endforeach
            </div>
        </div>
        @if($chartMaxValue <= 0)
            <p class="text-[11px] text-[#8C95AA] text-center -mt-1">
                Nenhuma receita lançada nos últimos 12 meses. <a href="{{ route('admin.finance.index') }}" class="text-[#F2C230] font-bold hover:underline">Registrar primeira transação &rarr;</a>
            </p>
        @endif
    </section>

    <!-- Right 4 cols: Real Concentric Multi-Ring Gauge (Service Categories & Active Quotations) -->
    <section class="lg:col-span-4 gtb-card flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Demandas por Categoria</h2>
            </div>
            <div class="flex items-center gap-2 text-[#8C95AA]">
                <a href="{{ route('admin.quotations.index') }}" class="hover:text-white" title="Ver Orçamentos">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
                </a>
            </div>
        </div>

        <!-- Concentric 4-Ring SVG Gauge with Real Open Quotations Callout -->
        <div class="relative flex items-center justify-center py-2">
            <div class="absolute left-1 top-2 z-10 rounded-xl bg-[#6EE7B7] text-[#052E22] px-3 py-1.5 shadow-lg">
                <div class="text-sm font-extrabold leading-tight">
                    R$ {{ number_format($openQuotationsValue, 2, ',', '.') }}
                </div>
                <div class="text-[10px] font-bold opacity-80">{{ $openQuotations }} proposta(s) ativa(s)</div>
            </div>

            <svg viewBox="0 0 200 200" class="w-44 h-44 -rotate-90">
                @foreach($categoryRings as $ring)
                    <circle cx="100" cy="100" r="{{ $ring['radius'] }}" fill="none" stroke="#222738" stroke-width="8"/>
                    @if($ring['dash'] > 0)
                        <circle cx="100" cy="100" r="{{ $ring['radius'] }}" fill="none" stroke="{{ $ring['color'] }}" stroke-width="8" stroke-linecap="round" stroke-dasharray="{{ $ring['dash'] }} {{ $ring['circumference'] }}"/>
                    @endif
                @endforeach
            </svg>

            <span class="absolute text-base font-extrabold text-white">{{ $totalRequests }}</span>
        </div>

        <!-- Bottom 4-Column Real Category Legend -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            @foreach($categoryRings as $ring)
                <div title="{{ $ring['name'] }} ({{ $ring['count'] }} solicitações)">
                    <div class="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                        <i class="w-2 h-2 rounded-full inline-block" style="background-color: {{ $ring['color'] }}"></i> {{ $ring['pct'] }}%
                    </div>
                    <div class="text-[10px] text-[#8C95AA] mt-0.5 truncate">{{ $ring['short_name'] }}</div>
                </div>
            @endforeach
        </div>
    </section>
</div>

<!-- ROW 3: REAL CLIENT DISTRIBUTION (5 cols) + REAL DEMANDS BY TIME HEATMAP MATRIX (7 cols) -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left 5 cols: Real Clients Distribution -->
    <section class="lg:col-span-5 gtb-card flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Base de Clientes por Região</h2>
            </div>
            <div class="flex items-center gap-2 text-[#8C95AA]">
                @if(Auth::user()->hasPermission('clients.manage'))
                    <a href="{{ route('admin.clients.create') }}" class="hover:text-[#F2C230] text-base font-bold leading-none no-underline" title="Novo Cliente">+</a>
                @endif
                <a href="{{ route('admin.clients.index') }}" class="hover:text-white" title="Ver Clientes"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg></a>
            </div>
        </div>

        <div class="space-y-4">
            @forelse($clientsByLocation as $loc)
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs gap-2">
                        <span class="font-bold text-white truncate">{{ $loc['label'] }}</span>
                        <span class="font-extrabold text-[#6EE7B7] shrink-0">{{ $loc['count'] }} ({{ number_format($loc['pct'], 1, ',', '.') }}%)</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-[#1C2233] overflow-hidden">
                        <div class="h-full rounded-full" style="width: {{ max(4, $loc['pct']) }}%; background: {{ $loc['gradient'] }};"></div>
                    </div>
                </div>
            @empty
                <div class="py-8 text-center space-y-2.5">
                    <p class="text-xs text-[#8C95AA]">Nenhum cliente cadastrado na base ainda.</p>
                    <p class="text-[11px] text-[#647087]">Novos contatos vindos dos formulários e chat do site aparecerão aqui automaticamente.</p>
                    @if(Auth::user()->hasPermission('clients.manage'))
                        <a href="{{ route('admin.clients.create') }}" class="btn-primary inline-flex px-4 py-2 text-xs no-underline">+ Cadastrar Cliente</a>
                    @endif
                </div>
            @endforelse
        </div>
    </section>

    <!-- Right 7 cols: Real Demands by Time (5x7 Heatmap Matrix) -->
    <section class="lg:col-span-7 gtb-card flex flex-col justify-between gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Demandas por Horário ({{ $currentPeriodLabel }})</h2>
            </div>

            <div class="flex items-center gap-3">
                <div class="flex items-center gap-1" title="Intensidade de solicitações">
                    <span class="w-3 h-3 rounded-xs bg-[#1D2232] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#063B5C] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#16749A] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#121AFF] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#F2C230] inline-block"></span>
                </div>
                <span class="text-[11px] font-bold text-[#8C95AA]">{{ $requestsCurrentPeriod }} total</span>
            </div>
        </div>

        <!-- Real 5x7 Matrix Grid -->
        <div class="space-y-1.5">
            @foreach($heatmapRows as $hourLabel => $cells)
                <div class="grid grid-cols-8 items-center gap-1.5">
                    <span class="text-[10.5px] font-semibold text-[#8C95AA]">{{ $hourLabel }}</span>
                    @foreach($cells as $cell)
                        <div class="gtb-heat-cell {{ $cell['c'] }}">
                            {{ $cell['v'] }}
                        </div>
                    @endforeach
                </div>
            @endforeach

            <div class="grid grid-cols-8 items-center gap-1.5 pt-1 text-center text-[10.5px] font-semibold text-[#8C95AA]">
                <span></span>
                <span>Dom</span>
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
            </div>
        </div>
    </section>
</div>

<!-- ROW 4: LIVE OPERATIONAL RECORDS (Solicitações, Chat ao Vivo, Projetos & Domínios) -->
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
    <!-- Recent Service Requests (Site Forms + Quote Requests) -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Solicitações ({{ $totalRequests }})</h3>
            <a href="{{ route('admin.requests.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Ver fila &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($recentRequests->take(4) as $req)
                <div class="py-2.5 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <a href="{{ route('admin.requests.show', $req) }}" class="font-bold text-white hover:text-[#F2C230] truncate block">
                            {{ $req->title ?: ($req->name . ' • ' . $req->protocol) }}
                        </a>
                        <span class="text-[10.5px] text-[#8C95AA] truncate block">{{ $req->name }} • #{{ $req->protocol }}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-[#D5DCEB] shrink-0">
                        {{ $req->status_label }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-4 text-center">Nenhuma solicitação recebida ainda.</div>
            @endforelse
        </div>
    </section>

    <!-- Live Chat & Support Queue -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Atendimento & Chat ({{ $openConversations }})</h3>
            <a href="{{ route('admin.chat.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Abrir &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($recentConversations->take(4) as $conv)
                <div class="py-2.5 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <a href="{{ route('admin.chat.index', ['conversation_id' => $conv->id]) }}" class="font-bold text-white hover:text-[#F2C230] truncate block">
                            {{ $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante') }}
                        </a>
                        <span class="text-[10.5px] text-[#8C95AA] truncate block">{{ $conv->latestMessage?->message ?? $conv->subject }}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md {{ $conv->status === 'waiting_staff' ? 'bg-[#F2C230]/20 text-[#F2C230]' : 'bg-white/5 text-[#D5DCEB]' }} border border-white/10 text-[10px] font-bold shrink-0">
                        {{ $conv->status_label }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-4 text-center">Nenhuma conversa ativa no chat.</div>
            @endforelse
        </div>
    </section>

    <!-- Active Projects -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Projetos Ativos ({{ $activeProjects }})</h3>
            <a href="{{ route('admin.projects.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Ver todos &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($recentProjects->take(4) as $p)
                <div class="py-2.5 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <a href="{{ route('admin.projects.show', $p) }}" class="font-bold text-white hover:text-[#F2C230] truncate">{{ $p->name }}</a>
                        <span class="font-extrabold text-[#F2C230] shrink-0">{{ $p->progress_percentage }}%</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-[#222738] overflow-hidden">
                        <div class="h-full rounded-full" style="width: {{ $p->progress_percentage }}%; background: linear-gradient(90deg, #F2C230 0%, #121AFF 100%);"></div>
                    </div>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-4 text-center">Nenhum projeto em andamento.</div>
            @endforelse
        </div>
    </section>

    <!-- Expiring Domains & Audit -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Domínios & DNS ({{ $domainsExpiringSoon }})</h3>
            <a href="{{ route('admin.domains.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Gerenciar &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($domainsExpiringSoonList->take(4) as $dom)
                <div class="py-2.5 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <a href="{{ route('admin.domains.show', $dom) }}" class="font-mono font-bold text-white hover:text-[#F2C230] truncate block">{{ $dom->domain_name }}</a>
                        <span class="text-[10.5px] text-[#8C95AA] truncate block">{{ $dom->client?->display_name ?? 'N/A' }}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-[#F2C230]/15 text-[#F2C230] text-[10px] font-bold shrink-0">
                        {{ $dom->expiration_date ? $dom->expiration_date->format('d/m/Y') : 'N/D' }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-4 text-center">Nenhum domínio expirando em 30 dias.</div>
            @endforelse
        </div>
    </section>
</div>
@endsection
