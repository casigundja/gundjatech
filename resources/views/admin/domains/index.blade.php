@extends('layouts.admin')
@section('title', 'Domínios • GundjaTech')
@section('header_title', 'Gerenciamento de Domínios & DNS')

@section('content')
<div class="space-y-6" x-data="{ domainModal: false }">
    <!-- KPIs (Clickable Filter Cards) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="{{ route('admin.domains.index') }}" class="glass-card p-4 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-[#F2C230]/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400">Total de Domínios Sob Gestão</span>
            <div class="text-2xl font-extrabold text-white mt-1">{{ $totalDomains }}</div>
        </a>
        <a href="{{ route('admin.domains.index', ['status' => 'expiring_soon']) }}" class="glass-card p-4 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-amber-400/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400">Expirando em 30 dias</span>
            <div class="text-2xl font-extrabold text-amber-400 mt-1">{{ $expiringCount }}</div>
        </a>
        <a href="{{ route('admin.domains.index', ['status' => 'expired']) }}" class="glass-card p-4 rounded-2xl border border-[#222222] block no-underline cursor-pointer hover:border-red-400/50 hover:-translate-y-0.5 transition-all">
            <span class="text-xs text-gray-400">Expirados</span>
            <div class="text-2xl font-extrabold text-red-400 mt-1">{{ $expiredCount }}</div>
        </a>
    </div>

    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2 max-w-xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar domínio ou registrador..." class="grow bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todos os status</option>
                <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Ativo</option>
                <option value="expiring_soon" {{ request('status') === 'expiring_soon' ? 'selected' : '' }}>Expirando</option>
                <option value="expired" {{ request('status') === 'expired' ? 'selected' : '' }}>Expirado</option>
                <option value="pending" {{ request('status') === 'pending' ? 'selected' : '' }}>Pendente</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>

        @if(Auth::user()->hasPermission('domains.manage'))
            <button @click="domainModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start md:self-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Cadastrar Domínio</span>
            </button>
        @endif
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Nome do Domínio</th>
                        <th class="px-6 py-4">Cliente Responsável</th>
                        <th class="px-6 py-4">Registrador / DNS</th>
                        <th class="px-6 py-4">Expiração</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($domains as $d)
                        @php
                            $daysLeft = $d->days_until_expiration;
                        @endphp
                        <tr class="hover:bg-[#161616] transition">
                            <td class="px-6 py-4 font-mono font-bold text-white">
                                <a href="{{ route('admin.domains.show', $d) }}" class="hover:text-[#E4A318]">{{ $d->domain_name }}</a>
                            </td>
                            <td class="px-6 py-4 text-gray-300">{{ $d->client?->display_name ?? 'N/A' }}</td>
                            <td class="px-6 py-4 text-gray-400">
                                <div>{{ $d->registrar ?? 'Registro.br' }}</div>
                                <span class="text-[10px] text-gray-500">{{ $d->dns_records_count }} registro(s) DNS</span>
                            </td>
                            <td class="px-6 py-4">
                                <span class="block text-white">{{ $d->expiration_date ? $d->expiration_date->format('d/m/Y') : 'Em definição' }}</span>
                                @if($daysLeft === null)
                                    <span class="text-[10px] text-gray-400">Sem data definida</span>
                                @elseif($daysLeft <= 30 && $daysLeft >= 0)
                                    <span class="text-[10px] text-amber-400 font-bold">Vence em {{ $daysLeft }} dia(s)!</span>
                                @elseif($daysLeft < 0)
                                    <span class="text-[10px] text-red-400 font-bold">Expirado há {{ abs($daysLeft) }} dia(s)!</span>
                                @else
                                    <span class="text-[10px] text-emerald-400 font-semibold">{{ $daysLeft }} dias restantes</span>
                                @endif
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold {{ $d->status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : ($d->status === 'expiring_soon' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30') }}">
                                    {{ $d->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                <div class="inline-flex items-center gap-3">
                                    <a href="{{ route('admin.domains.show', $d) }}" class="text-[#E4A318] hover:underline font-bold">Gerenciar DNS &rarr;</a>
                                    @if(Auth::user()->hasPermission('domains.manage'))
                                        <form
                                            action="{{ route('admin.domains.destroy', $d) }}"
                                            method="POST"
                                            class="inline"
                                            data-confirm-title="Excluir domínio"
                                            data-confirm-message="Tem certeza que deseja excluir este domínio e toda a sua zona DNS e histórico de renovações?"
                                            data-confirm-target="{{ $d->domain_name }}"
                                            data-confirm-button="Sim, excluir domínio"
                                            data-confirm-tone="danger"
                                        >
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="text-red-400 hover:text-red-300 font-semibold cursor-pointer">Excluir</button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhum domínio cadastrado.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($domains->hasPages())
            <div class="p-4 border-t border-[#222222]">{{ $domains->links() }}</div>
        @endif
    </div>

    <!-- Modal Create Domain -->
    <div x-show="domainModal" x-cloak @click.self="domainModal = false" @keydown.escape.window="domainModal = false" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Cadastrar Domínio para Custódia</h3>
            <form action="{{ route('admin.domains.store') }}" method="POST" class="space-y-4">
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
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Domínio *</label>
                    <input type="text" name="domain_name" required placeholder="seudominio.com.br" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white font-mono">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Registrador</label>
                        <input type="text" name="registrar" value="Registro.br" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Valor Renovação (R$)</label>
                        <input type="number" step="0.01" min="0" name="renewal_price" value="89.90" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Data Registro</label>
                        <input type="date" name="registration_date" value="{{ date('Y-m-d') }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Data Expiração</label>
                        <input type="date" name="expiration_date" value="{{ date('Y-m-d', strtotime('+1 year')) }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                </div>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input type="checkbox" name="auto_renew" value="1" class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                    <span>Ativar renovação automática</span>
                </label>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="domainModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Cadastrar</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
