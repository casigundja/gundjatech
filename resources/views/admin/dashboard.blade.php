@extends('layouts.admin')

@section('title', 'Dashboard • GundjaTech')
@section('header_title', 'Visão Geral Executiva')

@section('content')
<!-- Signature Golden-Bronze Executive Welcome Banner -->
<div class="gt-hero-gold flex flex-col lg:flex-row lg:items-center justify-between gap-5">
    <div class="space-y-2">
        <span class="gt-hero-badge">
            <span class="gt-hero-dots" aria-hidden="true">
                <i style="background:#E4A318"></i>
                <i style="background:#121AFF"></i>
                <i style="background:#FFFFFF"></i>
            </span>
            Central Executiva GundjaTech
        </span>
        <h2 class="gt-font-display text-xl sm:text-2xl font-bold tracking-tight">
            Olá, {{ explode(' ', Auth::user()->name)[0] }}<span class="gt-hero-dot">.</span>
        </h2>
        <p class="text-xs sm:text-sm gt-hero-muted max-w-2xl">
            Você tem <strong class="text-white">{{ $pendingRequests }}</strong> solicitação(ões) pendente(s), <strong class="text-white">{{ $activeProjects }}</strong> projeto(s) em andamento e <strong class="text-white">{{ $openConversations }}</strong> atendimento(s) aberto(s).
        </p>
    </div>
    <div class="flex flex-wrap items-center gap-2.5 shrink-0">
        <a href="{{ route('admin.requests.index') }}" class="gt-hero-cta">
            Gerenciar Solicitações
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
        </a>
        <a href="{{ route('admin.chat.index') }}" class="gt-hero-cta-ghost">
            Atendimento
        </a>
    </div>
</div>

<!-- Primary KPI Metric Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
    <div class="glass-card p-5 rounded-2xl border border-[#222222]">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Clientes Ativos</span>
            <div class="w-9 h-9 rounded-xl bg-[#E4A318]/10 text-[#E4A318] flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-white mt-2.5">{{ $activeClients }}</div>
        <span class="text-[11px] text-emerald-400 font-semibold mt-0.5 block">{{ $totalClients }} cadastrado(s) na base</span>
    </div>

    <div class="glass-card p-5 rounded-2xl border border-[#222222]">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Solicitações Pendentes</span>
            <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-white mt-2.5">{{ $pendingRequests }}</div>
        <a href="{{ route('admin.requests.index') }}" class="text-[11px] text-[#E4A318] font-semibold hover:underline mt-0.5 block">{{ $totalRequests }} no total • Ver fila &rarr;</a>
    </div>

    <div class="glass-card p-5 rounded-2xl border border-[#222222]">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Projetos em Andamento</span>
            <div class="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold text-white mt-2.5">{{ $activeProjects }}</div>
        <span class="text-[11px] text-gray-400 mt-0.5 block">{{ $completedProjects }} concluído(s) no histórico</span>
    </div>

    <div class="glass-card p-5 rounded-2xl border border-[#222222]">
        <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400 font-medium">Faturamento Mensal</span>
            <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
        </div>
        <div class="text-2xl font-extrabold gt-gold-value mt-2.5">R$ {{ number_format($monthlyRevenue, 2, ',', '.') }}</div>
        <span class="text-[11px] text-gray-400 mt-0.5 block">A receber: R$ {{ number_format($pendingReceivables, 2, ',', '.') }}</span>
    </div>
</div>

<!-- Secondary Operational KPIs -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <a href="{{ route('admin.quotations.index') }}" class="glass-card p-4 rounded-xl border border-[#222222] hover:border-[#E4A318]/50 transition">
        <div class="text-[10px] font-bold uppercase text-gray-400">Orçamentos em Aberto</div>
        <div class="text-lg font-extrabold text-white mt-1">{{ $openQuotations }} <span class="text-xs font-semibold text-[#E4A318]">(R$ {{ number_format($openQuotationsValue, 2, ',', '.') }})</span></div>
    </a>
    <a href="{{ route('admin.domains.index', ['expiring' => 1]) }}" class="glass-card p-4 rounded-xl border border-[#222222] hover:border-[#E4A318]/50 transition">
        <div class="text-[10px] font-bold uppercase text-gray-400">Domínios Expirando (30d)</div>
        <div class="text-lg font-extrabold {{ $domainsExpiringSoon > 0 ? 'text-amber-400' : 'text-emerald-400' }} mt-1">{{ $domainsExpiringSoon }}</div>
    </a>
    <a href="{{ route('admin.campaigns.index') }}" class="glass-card p-4 rounded-xl border border-[#222222] hover:border-[#E4A318]/50 transition">
        <div class="text-[10px] font-bold uppercase text-gray-400">Campanhas Ativas</div>
        <div class="text-lg font-extrabold text-white mt-1">{{ $activeCampaigns }}</div>
    </a>
    <a href="{{ route('admin.chat.index') }}" class="glass-card p-4 rounded-xl border border-[#222222] hover:border-[#E4A318]/50 transition">
        <div class="text-[10px] font-bold uppercase text-gray-400">Atendimentos Abertos</div>
        <div class="text-lg font-extrabold text-emerald-400 mt-1">{{ $openConversations }}</div>
    </a>
</div>

<!-- Charts Row -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Chart 1: Revenue vs Requests -->
    <div class="lg:col-span-2 glass-card p-6 rounded-2xl border border-[#222222]">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h3 class="text-sm font-bold text-white">Evolução de Faturamento & Demandas</h3>
                <p class="text-xs text-gray-400">Últimos 6 meses de performance</p>
            </div>
        </div>
        <div class="h-64">
            <canvas id="revenueChart"></canvas>
        </div>
    </div>

    <!-- Chart 2: Category Breakdown -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222]">
        <h3 class="text-sm font-bold text-white mb-1">Serviços Mais Demandados</h3>
        <p class="text-xs text-gray-400 mb-4">Distribuição de solicitações</p>
        <div class="h-64 flex items-center justify-center">
            <canvas id="categoriesChart"></canvas>
        </div>
    </div>
</div>

<!-- Recent Requests & Projects Tables -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Recent Requests -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Últimas Solicitações Recebidas</h3>
            <a href="{{ route('admin.requests.index') }}" class="text-xs text-[#E4A318] hover:underline font-bold">Ver todas</a>
        </div>
        <div class="divide-y divide-[#222222]">
            @forelse($recentRequests as $req)
                <div class="py-3 flex items-center justify-between gap-3">
                    <div class="min-w-0">
                        <a href="{{ route('admin.requests.show', $req) }}" class="text-xs font-bold text-white hover:text-[#E4A318] transition block truncate">{{ $req->title ?: 'Solicitação ' . $req->protocol }}</a>
                        <div class="text-[11px] text-gray-400 truncate">{{ $req->name }} ({{ $req->company ?? 'Pessoa Física' }}) • {{ $req->protocol }}</div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300 border border-[#333333] shrink-0">
                        {{ $req->status_label }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhuma solicitação recente.</div>
            @endforelse
        </div>
    </div>

    <!-- Active Projects -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Projetos Recentes</h3>
            <a href="{{ route('admin.projects.index') }}" class="text-xs text-[#E4A318] hover:underline font-bold">Ver todos</a>
        </div>
        <div class="divide-y divide-[#222222]">
            @forelse($recentProjects as $p)
                <div class="py-3 space-y-2">
                    <div class="flex items-center justify-between">
                        <a href="{{ route('admin.projects.show', $p) }}" class="text-xs font-bold text-white hover:text-[#E4A318] transition">{{ $p->name }}</a>
                        <span class="text-xs font-extrabold text-[#E4A318]">{{ $p->progress_percentage }}%</span>
                    </div>
                    <div class="w-full bg-[#1C1C1C] h-2 rounded-full overflow-hidden border border-[#333333]">
                        <div class="bg-gradient-to-r from-[#E4A318] to-[#C68B0E] h-full rounded-full" style="width: {{ $p->progress_percentage }}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-gray-400">
                        <span>Cliente: {{ $p->client?->display_name ?? 'N/A' }}</span>
                        <span>Entrega: {{ $p->deadline ? $p->deadline->format('d/m/Y') : 'Não definido' }}</span>
                    </div>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhum projeto ativo.</div>
            @endforelse
        </div>
    </div>
</div>

<!-- Expiring Domains & Recent Activity -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Alertas de Vencimento de Domínios</h3>
            <a href="{{ route('admin.domains.index') }}" class="text-xs text-[#E4A318] hover:underline font-bold">Gerenciar DNS</a>
        </div>
        <div class="divide-y divide-[#222222]">
            @forelse($domainsExpiringSoonList as $dom)
                <div class="py-2.5 flex items-center justify-between text-xs">
                    <div>
                        <a href="{{ route('admin.domains.show', $dom) }}" class="font-mono font-bold text-white hover:text-[#E4A318]">{{ $dom->domain_name }}</a>
                        <div class="text-[11px] text-gray-400">{{ $dom->client?->display_name ?? 'N/A' }}</div>
                    </div>
                    <span class="text-[11px] font-bold text-amber-400">
                        {{ $dom->expiration_date ? $dom->expiration_date->format('d/m/Y') : 'N/D' }}
                    </span>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhum domínio expirando nos próximos 30 dias.</div>
            @endforelse
        </div>
    </div>

    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Registro de Atividades do Painel</h3>
            @if(Auth::user()->hasPermission('settings.manage'))
                <a href="{{ route('admin.permissions.index') }}" class="text-xs text-[#E4A318] hover:underline font-bold">Permissões RBAC</a>
            @endif
        </div>
        <div class="divide-y divide-[#222222]">
            @forelse($recentActivities as $log)
                <div class="py-2.5 flex items-center justify-between text-xs gap-3">
                    <div class="truncate">
                        <span class="font-mono text-[#E4A318] font-bold">{{ $log->action }}</span>
                        <span class="text-gray-400">• {{ $log->user?->name ?? 'Sistema' }}</span>
                    </div>
                    <span class="text-[10px] text-gray-500 shrink-0">{{ $log->created_at->diffForHumans() }}</span>
                </div>
            @empty
                <div class="text-xs text-gray-500 py-4 text-center">Nenhuma atividade registrada ainda.</div>
            @endforelse
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
document.addEventListener('DOMContentLoaded', function () {
    if (typeof Chart === 'undefined') return;

    const ctxRevenue = document.getElementById('revenueChart');
    if (ctxRevenue) {
        new Chart(ctxRevenue, {
            type: 'line',
            data: {
                labels: @json($months),
                datasets: [
                    {
                        label: 'Faturamento (R$)',
                        data: @json($incomeData),
                        borderColor: '#B87D0A',
                        backgroundColor: 'rgba(198, 139, 14, 0.14)',
                        pointBackgroundColor: '#8F6107',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2.5,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Solicitações',
                        data: @json($requestsData),
                        borderColor: '#121AFF',
                        pointBackgroundColor: '#121AFF',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        borderWidth: 2.2,
                        tension: 0.35,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#544630', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, usePointStyle: true, boxWidth: 8 } }
                },
                scales: {
                    x: { grid: { color: '#EFE8D9' }, ticks: { color: '#766852', font: { family: 'Plus Jakarta Sans', size: 11 } } },
                    y: { grid: { color: '#EFE8D9' }, ticks: { color: '#766852', font: { family: 'Plus Jakarta Sans', size: 11 } } },
                    y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#766852', font: { family: 'Plus Jakarta Sans', size: 11 } } }
                }
            }
        });
    }

    const ctxCat = document.getElementById('categoriesChart');
    if (ctxCat) {
        const catLabels = @json($servicesBreakdown->pluck('name'));
        const catData = @json($servicesBreakdown->pluck('total'));
        new Chart(ctxCat, {
            type: 'doughnut',
            data: {
                labels: catLabels.length ? catLabels : ['Sites', 'Tráfego', 'Domínios'],
                datasets: [{
                    data: catData.length ? catData : [1, 1, 1],
                    backgroundColor: ['#B87D0A', '#121AFF', '#2C1D02', '#E4A318', '#9A8B74'],
                    borderColor: '#FFFFFF',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '64%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#544630', font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 }, usePointStyle: true, padding: 14 } }
                }
            }
        });
    }
});
</script>
@endpush
