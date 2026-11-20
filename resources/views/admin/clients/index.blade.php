@extends('layouts.admin')
@section('title', 'Clientes • GundjaTech')
@section('header_title', 'Gestão de Clientes')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2 max-w-xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar por empresa, contato, documento ou email..." class="grow bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Todos os status</option>
                <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Ativo</option>
                <option value="lead" {{ request('status') === 'lead' ? 'selected' : '' }}>Lead</option>
                <option value="inactive" {{ request('status') === 'inactive' ? 'selected' : '' }}>Inativo</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>
        @if(Auth::user()->hasPermission('clients.manage'))
            <a href="{{ route('admin.clients.create') }}" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Novo Cliente</span>
            </a>
        @endif
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Empresa / Razão</th>
                        <th class="px-6 py-4">Contato</th>
                        <th class="px-6 py-4">Documento</th>
                        <th class="px-6 py-4">Ativos</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($clients as $c)
                        <tr class="hover:bg-[#161616] transition">
                            <td class="px-6 py-4">
                                <a href="{{ route('admin.clients.show', $c) }}" class="font-bold text-white hover:text-[#E4A318] block">{{ $c->display_name }}</a>
                                <span class="text-[11px] text-gray-400">{{ $c->city ? $c->city . ($c->state ? ' - ' . $c->state : '') : 'Localização não informada' }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-white">{{ $c->name }}</div>
                                <div class="text-[11px] text-gray-400">{{ $c->email }}{{ $c->phone ? ' • ' . $c->phone : '' }}</div>
                            </td>
                            <td class="px-6 py-4 text-gray-300 font-mono whitespace-nowrap">{{ $c->document ?? 'Não informado' }}</td>
                            <td class="px-6 py-4 text-[11px] text-gray-400 whitespace-nowrap">
                                {{ $c->projects_count }} proj. • {{ $c->quotations_count }} orç. • {{ $c->domains_count }} dom.
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold {{ $c->status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : ($c->status === 'lead' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-gray-800 text-gray-400') }}">
                                    {{ $c->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                <div class="inline-flex items-center gap-3">
                                    <a href="{{ route('admin.clients.show', $c) }}" class="text-[#E4A318] hover:underline font-bold">Perfil 360°</a>
                                    @if(Auth::user()->hasPermission('clients.manage'))
                                        <a href="{{ route('admin.clients.edit', $c) }}" class="text-gray-400 hover:text-white">Editar</a>
                                        <form action="{{ route('admin.clients.destroy', $c) }}" method="POST" onsubmit="return confirm('Excluir cliente {{ addslashes($c->display_name) }}?');">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="text-red-400 hover:text-red-300">Excluir</button>
                                        </form>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($clients->hasPages())
            <div class="p-4 border-t border-[#222222]">{{ $clients->links() }}</div>
        @endif
    </div>
</div>
@endsection
