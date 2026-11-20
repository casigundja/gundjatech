@extends('layouts.portal')
@section('title', 'Meus Projetos • GundjaTech')
@section('header_title', 'Acompanhamento de Projetos')

@section('content')
<div class="space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @forelse($projects as $p)
            <div class="glass-card rounded-2xl p-6 border border-[#222222] flex flex-col justify-between group hover:border-[#E4A318]/60 transition">
                <div class="space-y-4">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $p->code }}</span>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1C1C1C] text-gray-300">
                            {{ $p->status_label }}
                        </span>
                    </div>

                    <div>
                        <a href="{{ route('portal.projects.show', $p) }}" class="text-base font-bold text-white group-hover:text-[#E4A318] transition block">{{ $p->name }}</a>
                        <span class="text-xs text-gray-400 mt-1 block">Gerente: {{ $p->manager?->name ?? 'Equipe GundjaTech' }}</span>
                    </div>

                    <!-- Progress -->
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

                <div class="pt-6 border-t border-[#222222] flex items-center justify-between text-xs mt-6">
                    <span class="text-gray-400">Entrega: {{ $p->deadline ? $p->deadline->format('d/m/Y') : 'Em definição' }}</span>
                    <a href="{{ route('portal.projects.show', $p) }}" class="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold">Ver Etapas &rarr;</a>
                </div>
            </div>
        @empty
            <div class="col-span-3 text-center py-12 text-gray-500 text-xs">Nenhum projeto ativo no momento.</div>
        @endforelse
    </div>

    <div>{{ $projects->links() }}</div>
</div>
@endsection
