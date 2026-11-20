@extends('layouts.portal')
@section('title', 'Minhas Solicitações • GundjaTech')
@section('header_title', 'Minhas Solicitações de Serviço')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p class="text-xs text-gray-400">Acompanhe todos os seus chamados e pedidos de orçamento.</p>
        <a href="{{ route('portal.requests.create') }}" class="btn-primary px-4 py-2 rounded-xl text-xs font-bold self-start sm:self-auto">
            + Nova Solicitação
        </a>
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Protocolo</th>
                        <th class="px-6 py-4">Demanda</th>
                        <th class="px-6 py-4">Serviço</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($requests as $r)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-6 py-4 font-mono font-bold text-[#E4A318] whitespace-nowrap">{{ $r->protocol }}</td>
                            <td class="px-6 py-4 font-bold text-white">{{ $r->title ?: 'Solicitação ' . $r->protocol }}</td>
                            <td class="px-6 py-4 text-gray-300">{{ $r->service?->name ?? 'Serviço Geral' }}</td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1C1C1C] text-gray-300 border border-[#333333] whitespace-nowrap">
                                    {{ $r->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                <a href="{{ route('portal.requests.show', $r) }}" class="text-[#E4A318] hover:underline font-bold">Ver Andamento &rarr;</a>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Nenhuma solicitação cadastrada.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-[#222222]">{{ $requests->links() }}</div>
    </div>
</div>
@endsection
