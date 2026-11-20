@extends('layouts.admin')
@section('title', $client->display_name . ' • GundjaTech')
@section('header_title', 'Visão 360° do Cliente')

@section('content')
<div class="space-y-6">
    <!-- Client Header Card -->
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <h2 class="text-2xl font-extrabold text-white">{{ $client->display_name }}</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {{ $client->status_label }}
                </span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
                Contato: {{ $client->name }} • E-mail: {{ $client->email }} • Tel: {{ $client->phone ?? 'Não informado' }}
                @if($client->document) • Doc: {{ $client->document }} @endif
            </p>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
            @if(Auth::user()->hasPermission('quotations.manage'))
                <a href="{{ route('admin.quotations.create', ['client_id' => $client->id]) }}" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold">+ Orçamento</a>
            @endif
            @if(Auth::user()->hasPermission('clients.manage'))
                <a href="{{ route('admin.clients.edit', $client) }}" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Editar Dados</a>
            @endif
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Column: Projects, Quotations, Requests -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Projects -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Projetos ({{ $client->projects->count() }})</h3>
                <div class="space-y-3">
                    @forelse($client->projects as $p)
                        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between">
                            <div>
                                <a href="{{ route('admin.projects.show', $p) }}" class="text-xs font-bold text-white hover:text-[#E4A318]">{{ $p->name }}</a>
                                <span class="text-[10px] text-gray-400 block">{{ $p->code }} • {{ $p->status_label }}</span>
                            </div>
                            <span class="text-xs font-extrabold text-[#E4A318]">{{ $p->progress_percentage }}%</span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500 py-3">Nenhum projeto registrado.</div>
                    @endforelse
                </div>
            </div>

            <!-- Quotations -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Orçamentos Emitidos ({{ $client->quotations->count() }})</h3>
                <div class="space-y-3">
                    @forelse($client->quotations as $q)
                        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between">
                            <div>
                                <a href="{{ route('admin.quotations.show', $q) }}" class="text-xs font-bold text-white hover:text-[#E4A318]">{{ $q->title }}</a>
                                <span class="text-[10px] text-gray-400 block font-mono">{{ $q->quotation_number }} • {{ $q->status_label }}</span>
                            </div>
                            <span class="text-xs font-extrabold text-[#E4A318]">R$ {{ number_format($q->total, 2, ',', '.') }}</span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500 py-3">Nenhum orçamento emitido.</div>
                    @endforelse
                </div>
            </div>

            <!-- Requests -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Histórico de Solicitações ({{ $client->serviceRequests->count() }})</h3>
                <div class="space-y-3">
                    @forelse($client->serviceRequests as $req)
                        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between">
                            <div>
                                <a href="{{ route('admin.requests.show', $req) }}" class="text-xs font-bold text-white hover:text-[#E4A318]">{{ $req->title ?: 'Solicitação ' . $req->protocol }}</a>
                                <span class="text-[10px] text-gray-400 block">{{ $req->protocol }} • {{ $req->service?->name ?? 'Serviço Geral' }}</span>
                            </div>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300">{{ $req->status_label }}</span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500 py-3">Nenhuma solicitação registrada.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <!-- Sidebar: Domains, Campaigns & Finance -->
        <div class="space-y-6">
            <!-- Domains -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Domínios Registrados</h3>
                <div class="space-y-2">
                    @forelse($client->domains as $d)
                        <a href="{{ route('admin.domains.show', $d) }}" class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between hover:border-[#E4A318]/40 transition">
                            <span class="text-xs font-bold text-white font-mono">{{ $d->domain_name }}</span>
                            <span class="text-[10px] text-gray-400">Vence: {{ $d->expiration_date ? $d->expiration_date->format('d/m/Y') : 'N/D' }}</span>
                        </a>
                    @empty
                        <div class="text-xs text-gray-500">Nenhum domínio cadastrado.</div>
                    @endforelse
                </div>
            </div>

            <!-- Campaigns -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Campanhas de Tráfego</h3>
                <div class="space-y-2">
                    @forelse($client->advertisingCampaigns as $camp)
                        <a href="{{ route('admin.campaigns.show', $camp) }}" class="block p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] hover:border-[#E4A318]/40 transition">
                            <div class="text-xs font-bold text-white">{{ $camp->name }}</div>
                            <span class="text-[10px] text-[#E4A318]">{{ $camp->platform_label }} • {{ $camp->status_label }}</span>
                        </a>
                    @empty
                        <div class="text-xs text-gray-500">Nenhuma campanha cadastrada.</div>
                    @endforelse
                </div>
            </div>

            <!-- Recent Financial Transactions -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222]">
                <h3 class="text-sm font-bold text-white mb-4">Histórico Financeiro</h3>
                <div class="space-y-2">
                    @forelse($client->financialTransactions->take(5) as $tx)
                        <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between text-xs">
                            <div class="truncate pr-2">
                                <div class="font-bold text-white truncate">{{ $tx->title }}</div>
                                <span class="text-[10px] text-gray-400">{{ $tx->due_date->format('d/m/Y') }} • {{ $tx->status_label }}</span>
                            </div>
                            <span class="font-bold shrink-0 {{ $tx->type === 'income' ? 'text-emerald-400' : 'text-red-400' }}">
                                R$ {{ number_format($tx->amount, 2, ',', '.') }}
                            </span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Nenhum lançamento financeiro.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
