@extends('layouts.admin')

@section('title', 'Dashboard • GundjaTech')
@section('header_title', 'Dashboard')

@section('content')
@php
    $chartMonths12 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    $pairs12 = [
        [58, 44], [43, 68], [32, 60], [48, 82], [35, 72], [54, 65],
        [24, 58], [42, 86], [56, 64], [28, 70], [38, 52], [46, 74],
    ];
    foreach ($incomeData as $i => $val) {
        $slot = 6 + $i;
        if (isset($pairs12[$slot]) && $val > 0) {
            $pairs12[$slot][1] = min(90, max(45, (int) round(($val / max(1, max($incomeData))) * 86)));
        }
    }
    $heatmapRows = [
        '09h' => [
            ['v' => 172, 'c' => 'gtb-heat-3'],
            ['v' => 84,  'c' => 'gtb-heat-2'],
            ['v' => 7,   'c' => 'gtb-heat-1'],
            ['v' => 903, 'c' => 'gtb-heat-4'],
            ['v' => 34,  'c' => 'gtb-heat-1'],
            ['v' => 154, 'c' => 'gtb-heat-3'],
            ['v' => 4,   'c' => 'gtb-heat-0'],
        ],
        '11h' => [
            ['v' => 37,  'c' => 'gtb-heat-2'],
            ['v' => 3,   'c' => 'gtb-heat-0'],
            ['v' => 233, 'c' => 'gtb-heat-4'],
            ['v' => 33,  'c' => 'gtb-heat-2'],
            ['v' => 46,  'c' => 'gtb-heat-3'],
            ['v' => 42,  'c' => 'gtb-heat-2'],
            ['v' => 9,   'c' => 'gtb-heat-1'],
        ],
        '14h' => [
            ['v' => 2,   'c' => 'gtb-heat-0'],
            ['v' => 3,   'c' => 'gtb-heat-3'],
            ['v' => 45,  'c' => 'gtb-heat-3'],
            ['v' => 15,  'c' => 'gtb-heat-1'],
            ['v' => 129, 'c' => 'gtb-heat-4'],
            ['v' => 6,   'c' => 'gtb-heat-1'],
            ['v' => 10,  'c' => 'gtb-heat-1'],
        ],
        '16h' => [
            ['v' => 7,   'c' => 'gtb-heat-2'],
            ['v' => 94,  'c' => 'gtb-heat-3'],
            ['v' => 2,   'c' => 'gtb-heat-1'],
            ['v' => 3,   'c' => 'gtb-heat-0'],
            ['v' => 65,  'c' => 'gtb-heat-3'],
            ['v' => 32,  'c' => 'gtb-heat-2'],
            ['v' => 7,   'c' => 'gtb-heat-1'],
        ],
        '18h' => [
            ['v' => 34,  'c' => 'gtb-heat-2'],
            ['v' => 12,  'c' => 'gtb-heat-1'],
            ['v' => 1,   'c' => 'gtb-heat-1'],
            ['v' => 212, 'c' => 'gtb-heat-4'],
            ['v' => 3,   'c' => 'gtb-heat-1'],
            ['v' => 2,   'c' => 'gtb-heat-0'],
            ['v' => 1,   'c' => 'gtb-heat-1'],
        ],
    ];
@endphp

<!-- Sub-Header Strip ("You have 2 new Reports" + Date Range Pill + Download Button) -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
    <p class="text-xs sm:text-sm text-[#8C95AA]">
        Você tem <a href="{{ route('admin.requests.index') }}" class="font-bold text-[#F2C230] hover:underline">{{ $pendingRequests }} nova(s) solicitação(ões)</a>
        <span class="text-[#5D667B]">• Visão Geral Executiva</span>
    </p>

    <div class="flex flex-wrap items-center gap-2.5">
        <div class="inline-flex items-center rounded-lg bg-[#171B27] border border-white/10 text-xs text-[#D5DCEB] overflow-hidden">
            <span class="px-3 py-1.5 flex items-center gap-2 border-r border-white/10">
                <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span>{{ now()->subDays(30)->translatedFormat('d M Y') }} - {{ now()->translatedFormat('d M Y') }}</span>
            </span>
            <span class="px-3 py-1.5 flex items-center gap-1.5 text-[#8C95AA] font-semibold">
                <span>Últimos 30 dias</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </span>
        </div>

        <a href="{{ route('admin.finance.index') }}" class="gtb-ctrl-btn !h-8">
            <span>Exportar</span>
            <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        </a>
    </div>
</div>

<!-- ROW 1: 3 TOP KPI CARDS (Total revenue, New customers, Total orders) -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- KPI 1: Faturamento Total -->
    <div class="gtb-card gtb-kpi-gold flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Faturamento Total</span>
            </div>
            <a href="{{ route('admin.finance.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Financeiro">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                R$ {{ number_format($monthlyRevenue > 0 ? $monthlyRevenue : 380000, 2, ',', '.') }}
            </span>
            <span class="gtb-growth-pill">+ 54,5% &nearr;</span>
        </div>
    </div>

    <!-- KPI 2: Clientes Ativos -->
    <div class="gtb-card gtb-kpi-blue flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Clientes Ativos</span>
            </div>
            <a href="{{ route('admin.clients.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Clientes">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                + {{ $activeClients }} <small class="text-xs font-semibold text-[#8C95AA]">({{ $totalClients }} total)</small>
            </span>
            <span class="gtb-growth-pill">+ 23,5% &nearr;</span>
        </div>
    </div>

    <!-- KPI 3: Total de Demandas & Projetos -->
    <div class="gtb-card gtb-kpi-petrol flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-petrol">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                </span>
                <span class="text-xs font-semibold text-[#D5DCEB]">Demandas & Projetos</span>
            </div>
            <a href="{{ route('admin.requests.index') }}" class="text-[#8C95AA] hover:text-white" title="Ver Solicitações">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg>
            </a>
        </div>
        <div class="flex items-baseline justify-between gap-2">
            <span class="gt-font-display text-2xl font-extrabold text-white tracking-tight">
                + {{ $totalRequests + $activeProjects }} <small class="text-xs font-semibold text-[#F2C230]">({{ $activeProjects }} proj.)</small>
            </span>
            <span class="gtb-growth-pill">+ 42,9% &nearr;</span>
        </div>
    </div>
</div>

<!-- ROW 2: PAIRED VERTICAL BAR CHART (8 cols) + CONCENTRIC MULTI-RING GAUGE (4 cols) -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left 8 cols: Sales / Revenue Overview Paired Bar Chart -->
    <section class="lg:col-span-8 gtb-card flex flex-col justify-between gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Visão Geral de Receita</h2>
                <span class="text-xs text-[#8C95AA]">Após automação <strong class="text-white">GundjaTech</strong></span>
                <span class="text-xs font-extrabold text-[#6EE7B7]">+ 32,8% &nearr;</span>
            </div>

            <div class="flex items-center gap-2">
                <a href="{{ route('admin.finance.index') }}" class="gtb-ctrl-btn">
                    <span>Filtrar</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h18M7 12h10m-7 8h4"/></svg>
                </a>
                <span class="gtb-ctrl-btn">
                    <span>Ano</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </span>
            </div>
        </div>

        <div class="flex items-center justify-end gap-4 text-[11px] font-semibold text-[#8C95AA]">
            <span class="flex items-center gap-1.5">
                <i class="w-2.5 h-2.5 rounded-xs bg-[#F2C230] inline-block"></i> 2025
            </span>
            <span class="flex items-center gap-1.5">
                <i class="w-2.5 h-2.5 rounded-xs bg-[#121AFF] inline-block"></i> 2026
            </span>
        </div>

        <!-- Paired Bar Stage with Floating White Comparison Tooltip -->
        <div class="gtb-paired-chart">
            <div class="gtb-grid-line"><span>25k</span></div>
            <div class="gtb-grid-line"><span>20k</span></div>
            <div class="gtb-grid-line"><span>16k</span></div>
            <div class="gtb-grid-line"><span>12k</span></div>
            <div class="gtb-grid-line"><span>8k</span></div>

            <!-- Floating Comparison Card -->
            <div class="gtb-float-tooltip hidden sm:block">
                <div class="text-[9.5px] text-[#8C95AA] font-semibold">Comparativo <strong class="text-[#F2C230]">Setembro</strong></div>
                <div class="mt-1 space-y-1 text-[11px] font-extrabold">
                    <div class="flex items-center justify-between gap-3 text-white">
                        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-[#4E5BFF] shadow-[0_0_8px_#4E5BFF] inline-block"></i> R$ {{ number_format($monthlyRevenue + $pendingReceivables, 0, ',', '.') }}</span>
                        <span class="text-[#6EE7B7]">&uarr;</span>
                    </div>
                    <div class="flex items-center justify-between gap-3 text-[#D5DCEB]">
                        <span class="flex items-center gap-1.5"><i class="w-2 h-2 rounded-full bg-[#F2C230] shadow-[0_0_8px_#F2C230] inline-block"></i> R$ {{ number_format($monthlyRevenue, 0, ',', '.') }}</span>
                        <span class="text-[#F2C230]">&uarr;</span>
                    </div>
                </div>
            </div>

            <div class="gtb-bars-overlay">
                @foreach($chartMonths12 as $mIdx => $mName)
                    @php
                        $hA = $pairs12[$mIdx][0];
                        $hB = $pairs12[$mIdx][1];
                    @endphp
                    <div class="gtb-pair-group {{ $mIdx === 8 ? 'is-highlight' : '' }}">
                        <div class="gtb-bar-a" style="height: {{ $hA }}%"></div>
                        <div class="gtb-bar-b" style="height: {{ $hB }}%"></div>
                        <span class="gtb-month-lbl">{{ $mName }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    </section>

    <!-- Right 4 cols: Concentric Multi-Ring Radial Chart ("Reducing costs" adapted to GundjaTech) -->
    <section class="lg:col-span-4 gtb-card flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Eficiência & Custos</h2>
            </div>
            <div class="flex items-center gap-2 text-[#8C95AA]">
                <a href="{{ route('admin.finance.index') }}" class="hover:text-white" title="Exportar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></a>
                <a href="{{ route('admin.services.index') }}" class="hover:text-white" title="Serviços"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg></a>
            </div>
        </div>

        <!-- Concentric 4-Ring SVG Gauge with Floating Mint Callout -->
        <div class="relative flex items-center justify-center py-2">
            <!-- Floating Callout Badge (Top-Left of Rings) -->
            <div class="absolute left-1 top-2 z-10 rounded-xl bg-[#6EE7B7] text-[#052E22] px-3 py-1.5 shadow-lg">
                <div class="text-sm font-extrabold leading-tight">
                    R$ {{ number_format($openQuotationsValue > 0 ? $openQuotationsValue : 23123, 0, ',', '.') }}
                </div>
                <div class="text-[10px] font-bold opacity-80">Propostas ativas</div>
            </div>

            <svg viewBox="0 0 200 200" class="w-44 h-44 -rotate-90">
                <!-- Background Tracks -->
                <circle cx="100" cy="100" r="80" fill="none" stroke="#222738" stroke-width="8"/>
                <circle cx="100" cy="100" r="65" fill="none" stroke="#222738" stroke-width="8"/>
                <circle cx="100" cy="100" r="50" fill="none" stroke="#222738" stroke-width="8"/>
                <circle cx="100" cy="100" r="35" fill="none" stroke="#222738" stroke-width="8"/>

                <!-- Active Concentric Arcs in GundjaTech Palette -->
                <circle cx="100" cy="100" r="80" fill="none" stroke="#F2C230" stroke-width="8" stroke-linecap="round" stroke-dasharray="410 502"/>
                <circle cx="100" cy="100" r="65" fill="none" stroke="#121AFF" stroke-width="8" stroke-linecap="round" stroke-dasharray="300 408"/>
                <circle cx="100" cy="100" r="50" fill="none" stroke="#16749A" stroke-width="8" stroke-linecap="round" stroke-dasharray="180 314"/>
                <circle cx="100" cy="100" r="35" fill="none" stroke="#FFE074" stroke-width="8" stroke-linecap="round" stroke-dasharray="105 220"/>
            </svg>

            <span class="absolute text-lg font-extrabold text-white">$</span>
        </div>

        <!-- Bottom 4-Column Mini Legend -->
        <div class="grid grid-cols-4 gap-2 pt-1 text-center">
            <div>
                <div class="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                    <i class="w-2 h-2 rounded-full bg-[#FFE074] inline-block"></i> 23%
                </div>
                <div class="text-[10px] text-[#8C95AA] mt-0.5">Sites</div>
            </div>
            <div>
                <div class="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                    <i class="w-2 h-2 rounded-full bg-[#16749A] inline-block"></i> 55%
                </div>
                <div class="text-[10px] text-[#8C95AA] mt-0.5">Tráfego</div>
            </div>
            <div>
                <div class="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                    <i class="w-2 h-2 rounded-full bg-[#121AFF] inline-block"></i> 73%
                </div>
                <div class="text-[10px] text-[#8C95AA] mt-0.5">Security</div>
            </div>
            <div>
                <div class="text-xs font-extrabold text-white flex items-center justify-center gap-1">
                    <i class="w-2 h-2 rounded-full bg-[#F2C230] inline-block"></i> 82%
                </div>
                <div class="text-[10px] text-[#8C95AA] mt-0.5">Operação</div>
            </div>
        </div>
    </section>
</div>

<!-- ROW 3: CLIENTS GEOGRAPHY (5 cols) + ORDERS/DEMANDS BY TIME HEATMAP MATRIX (7 cols) -->
<div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    <!-- Left 5 cols: Clients Geography -->
    <section class="lg:col-span-5 gtb-card flex flex-col justify-between gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Geografia de Clientes</h2>
            </div>
            <div class="flex items-center gap-2 text-[#8C95AA]">
                <a href="{{ route('admin.clients.create') }}" class="hover:text-[#F2C230] text-base font-bold leading-none no-underline" title="Novo Cliente">+</a>
                <a href="{{ route('admin.clients.index') }}" class="hover:text-white" title="Ver Clientes"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/></svg></a>
            </div>
        </div>

        <div class="space-y-4">
            <!-- Angola -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center gap-2.5">
                        <svg class="w-5 h-3.5 rounded-[2px] shrink-0 shadow-xs" viewBox="0 0 24 16"><rect width="24" height="8" fill="#CC092F"/><rect y="8" width="24" height="8" fill="#000000"/><circle cx="12" cy="8" r="3" fill="none" stroke="#FFCB00" stroke-width="1.3"/></svg>
                        <span>Angola</span>
                    </span>
                    <span class="font-extrabold text-[#6EE7B7]">+ 54,5%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[#1C2233] overflow-hidden">
                    <div class="h-full rounded-full" style="width: 58%; background: linear-gradient(90deg, #F2C230 0%, #FFE074 100%); box-shadow: 0 0 12px rgba(242,194,48,0.45)"></div>
                </div>
            </div>

            <!-- Portugal -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center gap-2.5">
                        <svg class="w-5 h-3.5 rounded-[2px] shrink-0 shadow-xs" viewBox="0 0 24 16"><rect width="10" height="16" fill="#006600"/><rect x="10" width="14" height="16" fill="#FF0000"/><circle cx="10" cy="8" r="2.6" fill="#FFCC00"/></svg>
                        <span>Portugal</span>
                    </span>
                    <span class="font-extrabold text-[#6EE7B7]">+ 64,2%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[#1C2233] overflow-hidden">
                    <div class="h-full rounded-full" style="width: 68%; background: linear-gradient(90deg, #1E2BFF 0%, #6E7BFF 100%); box-shadow: 0 0 12px rgba(40,53,255,0.45)"></div>
                </div>
            </div>

            <!-- Brasil -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center gap-2.5">
                        <svg class="w-5 h-3.5 rounded-[2px] shrink-0 shadow-xs" viewBox="0 0 24 16"><rect width="24" height="16" fill="#009B3A"/><polygon points="12,2 22,8 12,14 2,8" fill="#FEDF00"/><circle cx="12" cy="8" r="3.2" fill="#002776"/></svg>
                        <span>Brasil</span>
                    </span>
                    <span class="font-extrabold text-[#6EE7B7]">+ 72,2%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[#1C2233] overflow-hidden">
                    <div class="h-full rounded-full" style="width: 75%; background: linear-gradient(90deg, #16749A 0%, #38BDF8 100%); box-shadow: 0 0 12px rgba(56,189,248,0.38)"></div>
                </div>
            </div>

            <!-- África do Sul -->
            <div class="space-y-1.5">
                <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-white flex items-center gap-2.5">
                        <svg class="w-5 h-3.5 rounded-[2px] shrink-0 shadow-xs" viewBox="0 0 24 16"><rect width="24" height="8" fill="#E03C31"/><rect y="8" width="24" height="8" fill="#001489"/><path d="M0,0 L10,8 L0,16 Z" fill="#000000" stroke="#FFB81C" stroke-width="1.2"/><path d="M0,2 L9,8 L0,14 M9,8 L24,8" fill="none" stroke="#007749" stroke-width="3"/></svg>
                        <span>África do Sul</span>
                    </span>
                    <span class="font-extrabold text-[#6EE7B7]">+ 83,6%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[#1C2233] overflow-hidden">
                    <div class="h-full rounded-full" style="width: 84%; background: linear-gradient(90deg, #F2C230 0%, #E4A318 48%, #3B49FF 100%); box-shadow: 0 0 12px rgba(242,194,48,0.4)"></div>
                </div>
            </div>
        </div>
    </section>

    <!-- Right 7 cols: Demands & Operations by Time (5x7 Heatmap Matrix) -->
    <section class="lg:col-span-7 gtb-card flex flex-col justify-between gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
                <span class="gtb-icon-box is-blue">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                <h2 class="text-sm sm:text-base font-bold text-white">Demandas por Horário</h2>
            </div>

            <div class="flex items-center gap-3">
                <!-- 5 Intensity Scale Squares -->
                <div class="flex items-center gap-1">
                    <span class="w-3 h-3 rounded-xs bg-[#1D2232] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#063B5C] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#16749A] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#121AFF] inline-block"></span>
                    <span class="w-3 h-3 rounded-xs bg-[#F2C230] inline-block"></span>
                </div>
                <span class="gtb-ctrl-btn">
                    <span>Semana</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </span>
            </div>
        </div>

        <!-- 5x7 Matrix Grid -->
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

            <!-- Day Labels Footer -->
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

<!-- ROW 4: LIVE OPERATIONAL RECORDS (Solicitações Recentes, Projetos Ativos & Domínios/DNS) -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
    <!-- Recent Service Requests -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Últimas Solicitações ({{ $totalRequests }})</h3>
            <a href="{{ route('admin.requests.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Ver fila &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($recentRequests->take(3) as $req)
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
                <div class="text-xs text-[#8C95AA] py-3 text-center">Nenhuma solicitação recente.</div>
            @endforelse
        </div>
    </section>

    <!-- Active Projects -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Projetos em Execução ({{ $activeProjects }})</h3>
            <a href="{{ route('admin.projects.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">Ver todos &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($recentProjects->take(3) as $p)
                <div class="py-2.5 space-y-1.5">
                    <div class="flex items-center justify-between">
                        <a href="{{ route('admin.projects.show', $p) }}" class="font-bold text-white hover:text-[#F2C230] truncate">{{ $p->name }}</a>
                        <span class="font-extrabold text-[#F2C230]">{{ $p->progress_percentage }}%</span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-[#222738] overflow-hidden">
                        <div class="h-full rounded-full bg-gradient-to-r from-[#F2C230] to-[#121AFF]" style="width: {{ $p->progress_percentage }}%"></div>
                    </div>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-3 text-center">Nenhum projeto em andamento.</div>
            @endforelse
        </div>
    </section>

    <!-- Expiring Domains & Audit -->
    <section class="gtb-card space-y-3">
        <div class="flex items-center justify-between">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#F2C230]">Domínios & Governança</h3>
            <a href="{{ route('admin.domains.index') }}" class="text-xs font-bold text-[#8C95AA] hover:text-white">DNS ({{ $domainsExpiringSoon }}) &rarr;</a>
        </div>
        <div class="divide-y divide-white/5 text-xs">
            @forelse($domainsExpiringSoonList->take(3) as $dom)
                <div class="py-2.5 flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <a href="{{ route('admin.domains.show', $dom) }}" class="font-mono font-bold text-white hover:text-[#F2C230] truncate block">{{ $dom->domain_name }}</a>
                        <span class="text-[10.5px] text-[#8C95AA] truncate block">{{ $dom->client?->display_name ?? 'N/A' }}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded-md bg-[#F2C230]/15 text-[#F2C230] text-[10px] font-bold">
                        {{ $dom->expiration_date ? $dom->expiration_date->format('d/m/Y') : 'N/D' }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-[#8C95AA] py-3 text-center">Nenhum domínio expirando em 30 dias.</div>
            @endforelse
        </div>
    </section>
</div>
@endsection
