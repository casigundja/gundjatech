@extends('layouts.admin')
@section('title', 'Solicitações • GundjaTech')
@section('header_title', 'Central de Solicitações')

@section('content')
<div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-3 max-w-3xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar por protocolo, título, empresa ou cliente..." class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318] grow">
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Todos os status</option>
                <option value="new" {{ request('status') === 'new' ? 'selected' : '' }}>Nova</option>
                <option value="analyzing" {{ request('status') === 'analyzing' ? 'selected' : '' }}>Em Análise</option>
                <option value="awaiting_info" {{ request('status') === 'awaiting_info' ? 'selected' : '' }}>Aguardando Info</option>
                <option value="quotation_sent" {{ request('status') === 'quotation_sent' ? 'selected' : '' }}>Orçamento Enviado</option>
                <option value="awaiting_approval" {{ request('status') === 'awaiting_approval' ? 'selected' : '' }}>Aguardando Aprovação</option>
                <option value="approved" {{ request('status') === 'approved' ? 'selected' : '' }}>Aprovada</option>
                <option value="in_progress" {{ request('status') === 'in_progress' ? 'selected' : '' }}>Em Execução</option>
                <option value="completed" {{ request('status') === 'completed' ? 'selected' : '' }}>Concluída</option>
                <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Cancelada</option>
            </select>
            <select name="service_id" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Todos os serviços</option>
                @foreach($services as $svc)
                    <option value="{{ $svc->id }}" {{ request('service_id') == $svc->id ? 'selected' : '' }}>{{ $svc->name }}</option>
                @endforeach
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Protocolo / Data</th>
                        <th class="px-6 py-4">Título & Serviço</th>
                        <th class="px-6 py-4">Solicitante</th>
                        <th class="px-6 py-4">Responsável</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($requests as $r)
                        <tr class="hover:bg-[#161616] transition">
                            <td class="px-6 py-4">
                                <span class="font-mono font-bold text-[#E4A318] block">{{ $r->protocol }}</span>
                                <span class="text-[11px] text-gray-400">{{ $r->created_at->format('d/m/Y H:i') }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <a href="{{ route('admin.requests.show', $r) }}" class="font-bold text-white hover:text-[#E4A318] block">{{ $r->title ?: 'Solicitação ' . $r->protocol }}</a>
                                <span class="text-[11px] text-gray-400">{{ $r->service ? $r->service->name : 'Serviço Geral' }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-white">{{ $r->name }}</div>
                                <div class="text-[11px] text-gray-400">{{ $r->company ?? 'Pessoa Física' }}{{ $r->phone ? ' • ' . $r->phone : '' }}</div>
                            </td>
                            <td class="px-6 py-4 text-gray-300">
                                {{ $r->assignedUser?->name ?? 'Não atribuído' }}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                @php
                                    $statusBadgeClass = match ($r->status) {
                                        'new' => 'bg-[#F2C230]/20 text-[#F2C230] border border-[#F2C230]/40',
                                        'analyzing', 'awaiting_info' => 'bg-[#121AFF]/20 text-[#93A3FF] border border-[#121AFF]/30',
                                        'quotation_sent', 'awaiting_approval', 'in_progress' => 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
                                        'approved', 'completed' => 'bg-emerald-500/15 text-[#6EE7B7] border border-emerald-500/30',
                                        'cancelled' => 'bg-red-500/15 text-red-400 border border-red-500/30',
                                        default => 'bg-white/10 text-[#D5DCEB] border border-white/15',
                                    };
                                @endphp
                                <span class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold {{ $statusBadgeClass }}">
                                    {{ $r->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                <div class="inline-flex items-center justify-end gap-2">
                                    <a href="{{ route('admin.requests.show', $r) }}" class="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center no-underline">
                                        Gerenciar &rarr;
                                    </a>
                                    @if(Auth::user()->hasPermission('requests.manage'))
                                        @if(! in_array($r->status, ['cancelled', 'completed'], true))
                                            <form
                                                action="{{ route('admin.requests.cancel', $r) }}"
                                                method="POST"
                                                data-confirm-title="Cancelar solicitação"
                                                data-confirm-message="Deseja marcar esta solicitação como cancelada? Ela permanecerá registrada no histórico com status Cancelada."
                                                data-confirm-target="{{ $r->protocol }} • {{ $r->name }}"
                                                data-confirm-button="Sim, cancelar"
                                                data-confirm-tone="warning"
                                            >
                                                @csrf
                                                <button type="submit" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35 hover:bg-amber-500/25 transition cursor-pointer">
                                                    Cancelar
                                                </button>
                                            </form>
                                        @endif
                                        <form
                                            action="{{ route('admin.requests.destroy', $r) }}"
                                            method="POST"
                                            data-confirm-title="Excluir solicitação"
                                            data-confirm-message="Tem certeza que deseja excluir esta solicitação definitivamente do banco de dados? Anexos e histórico vinculados serão removidos e essa ação não pode ser desfeita."
                                            data-confirm-target="{{ $r->protocol }} • {{ $r->title ?: $r->name }}"
                                            data-confirm-button="Sim, excluir do banco"
                                            data-confirm-tone="danger"
                                        >
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer">
                                                Excluir
                                            </button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhuma solicitação encontrada.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-[#222222]">{{ $requests->links() }}</div>
    </div>
</div>
@endsection
