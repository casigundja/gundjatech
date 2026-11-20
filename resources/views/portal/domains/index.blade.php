@extends('layouts.portal')
@section('title', 'Meus Domínios • GundjaTech')
@section('header_title', 'Gestão de Domínios & DNS')

@section('content')
<div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @forelse($domains as $d)
            @php $daysLeft = $d->expiration_date ? (int) now()->startOfDay()->diffInDays($d->expiration_date->startOfDay(), false) : 0; @endphp
            <div class="glass-card rounded-2xl p-6 border border-[#222222] space-y-4">
                <div class="flex items-center justify-between gap-2">
                    <h3 class="text-lg font-mono font-bold text-white truncate">{{ $d->domain_name }}</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 {{ $d->status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400' }}">
                        {{ $d->status_label }}
                    </span>
                </div>

                <div class="text-xs text-gray-300 space-y-1">
                    <div><span class="text-gray-400">Registrador:</span> {{ $d->registrar }}</div>
                    <div><span class="text-gray-400">Vencimento:</span> {{ $d->expiration_date ? $d->expiration_date->format('d/m/Y') : 'Em definição' }} ({{ $daysLeft >= 0 ? $daysLeft . ' dias restantes' : 'Expirado' }})</div>
                    <div><span class="text-gray-400">Registros DNS ativos:</span> {{ $d->dnsRecords->count() }} apontamento(s)</div>
                </div>

                <div class="pt-4 border-t border-[#222222] flex flex-wrap items-center justify-between gap-3">
                    <span class="text-xs text-gray-400">
                        Renovação Anual: <strong class="text-white">R$ {{ number_format($d->renewal_price ?? 89.90, 2, ',', '.') }}</strong>
                    </span>
                    <form action="{{ route('portal.domains.renew', $d) }}" method="POST">
                        @csrf
                        <button type="submit" class="btn-primary text-xs px-4 py-2 rounded-xl font-bold">
                            Solicitar Renovação
                        </button>
                    </form>
                </div>
            </div>
        @empty
            <div class="col-span-2 text-center py-12 text-gray-500 text-xs">Nenhum domínio vinculado à sua conta.</div>
        @endforelse
    </div>
</div>
@endsection
