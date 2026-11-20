@extends('layouts.portal')
@section('title', $project->name . ' • Portal GundjaTech')
@section('header_title', 'Projeto: ' . $project->name)

@section('content')
<div class="space-y-6">
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $project->code }}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1C1C1C] text-gray-300 border border-[#333333]">{{ $project->status_label }}</span>
            </div>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $project->name }}</h2>
            <p class="text-xs text-gray-400 mt-1">
                Gerente da Conta: {{ $project->manager?->name ?? 'Equipe GundjaTech' }}
                @if($project->manager?->email) ({{ $project->manager->email }}) @endif
            </p>
        </div>
        <div class="w-full md:w-56 space-y-1">
            <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-gray-300">Progresso</span>
                <span class="text-[#E4A318]">{{ $project->progress_percentage }}%</span>
            </div>
            <div class="w-full bg-[#141414] h-2.5 rounded-full overflow-hidden border border-[#2E2D2C]">
                <div class="bg-gradient-to-r from-[#E4A318] to-[#C68B0E] h-full rounded-full" style="width: {{ $project->progress_percentage }}%"></div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Stages -->
        <div class="lg:col-span-2 space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Etapas de Execução</h3>
                <div class="space-y-3">
                    @forelse($project->stages as $stage)
                        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h4 class="text-sm font-bold text-white">{{ $stage->title }}</h4>
                                <span class="text-[11px] text-gray-400">Etapa nº {{ $stage->order }}</span>
                                @if($stage->description)
                                    <p class="text-xs text-gray-300 mt-1">{{ $stage->description }}</p>
                                @endif
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto shrink-0 {{ $stage->status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : ($stage->status === 'in_progress' ? 'bg-[#E4A318]/10 text-[#E4A318] border border-[#E4A318]/30' : 'bg-gray-800 text-gray-400') }}">
                                {{ $stage->status === 'completed' ? 'Concluída' : ($stage->status === 'in_progress' ? 'Em Execução' : 'Aguardando') }}
                            </span>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Nenhuma etapa cadastrada ainda.</div>
                    @endforelse
                </div>
            </div>

            <!-- Deliverables -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Arquivos & Entregáveis Disponíveis</h3>
                <div class="space-y-2">
                    @forelse($project->attachments as $att)
                        <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between gap-3">
                            <div class="text-xs truncate">
                                <span class="font-bold text-white block truncate">{{ $att->file_name }}</span>
                                <span class="text-[10px] text-gray-400">{{ $att->file_size ? round($att->file_size / 1024) . ' KB' : '' }}</span>
                            </div>
                            <a href="{{ route('portal.projects.attachments.download', [$project, $att]) }}" class="btn-primary text-xs px-3 py-1.5 rounded-lg font-bold shrink-0">Baixar Arquivo</a>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500 py-2">Nenhum arquivo entregue ainda nesta fase.</div>
                    @endforelse
                </div>
            </div>
        </div>

        <div class="space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] text-xs space-y-3">
                <h3 class="text-sm font-bold text-white mb-2">Canal Direto</h3>
                <p class="text-gray-400">Fale com seu gerente de projeto para alinhar dúvidas ou novidades.</p>
                <a href="{{ route('portal.chat.index') }}" class="btn-secondary w-full py-2.5 rounded-xl text-center font-bold block">
                    Conversar com Gerente
                </a>
            </div>
        </div>
    </div>
</div>
@endsection
