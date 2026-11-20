@extends('layouts.admin')
@section('title', 'Projetos • GundjaTech')
@section('header_title', 'Gestão de Projetos')

@section('content')
<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2 max-w-xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar por código ou nome do projeto..." class="grow bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Todos os status</option>
                <option value="planning" {{ request('status') === 'planning' ? 'selected' : '' }}>Planejamento</option>
                <option value="in_progress" {{ request('status') === 'in_progress' ? 'selected' : '' }}>Em Andamento</option>
                <option value="reviewing" {{ request('status') === 'reviewing' ? 'selected' : '' }}>Em Revisão</option>
                <option value="on_hold" {{ request('status') === 'on_hold' ? 'selected' : '' }}>Em Espera</option>
                <option value="completed" {{ request('status') === 'completed' ? 'selected' : '' }}>Concluído</option>
                <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Cancelado</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>
        @if(Auth::user()->hasPermission('projects.manage'))
            <a href="{{ route('admin.projects.create') }}" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>Novo Projeto</span>
            </a>
        @endif
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($projects as $p)
            <div class="glass-card rounded-2xl p-6 border border-[#222222] flex flex-col justify-between group hover:border-[#E4A318]/60 transition">
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $p->code }}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300 border border-[#333333]">
                            {{ $p->status_label }}
                        </span>
                    </div>

                    <div>
                        <a href="{{ route('admin.projects.show', $p) }}" class="text-base font-bold text-white group-hover:text-[#E4A318] transition block">{{ $p->name }}</a>
                        <span class="text-xs text-gray-400 mt-1 block">Cliente: {{ $p->client?->display_name ?? 'N/A' }}</span>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-400">Progresso</span>
                            <span class="font-extrabold text-[#E4A318]">{{ $p->progress_percentage }}%</span>
                        </div>
                        <div class="w-full bg-[#141414] h-2 rounded-full overflow-hidden border border-[#2E2D2C]">
                            <div class="bg-gradient-to-r from-[#E4A318] to-[#C68B0E] h-full rounded-full" style="width: {{ $p->progress_percentage }}%"></div>
                        </div>
                    </div>
                </div>

                <div class="pt-6 border-t border-[#222222] flex items-center justify-between text-xs text-gray-400 mt-6">
                    <span>Prazo: {{ $p->deadline ? $p->deadline->format('d/m/Y') : 'Não definido' }}</span>
                    <a href="{{ route('admin.projects.show', $p) }}" class="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold">Ver Projeto &rarr;</a>
                </div>
            </div>
        @empty
            <div class="col-span-3 text-center py-12 text-gray-500">Nenhum projeto registrado.</div>
        @endforelse
    </div>
    <div>{{ $projects->links() }}</div>
</div>
@endsection
