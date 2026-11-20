@extends('layouts.admin')
@section('title', $project->name . ' • GundjaTech')
@section('header_title', '[' . $project->code . '] ' . $project->name)

@section('content')
<div class="space-y-6">
    <!-- Project Header -->
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold text-[#E4A318]">{{ $project->code }}</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1C1C1C] text-gray-300 border border-[#333333]">
                    {{ $project->status_label }}
                </span>
            </div>
            <h2 class="text-2xl font-extrabold text-white mt-1">{{ $project->name }}</h2>
            <p class="text-xs text-gray-400 mt-1">
                Cliente:
                @if($project->client)
                    <a href="{{ route('admin.clients.show', $project->client) }}" class="text-[#E4A318] hover:underline font-bold">{{ $project->client->display_name }}</a>
                @else
                    <span class="text-gray-300">N/A</span>
                @endif
                • Gerente: {{ $project->manager?->name ?? 'Não atribuído' }}
            </p>
        </div>

        <!-- Progress Indicator -->
        <div class="w-full md:w-64 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold">
                <span class="text-gray-300">Progresso Geral</span>
                <span class="text-[#E4A318] text-base">{{ $project->progress_percentage }}%</span>
            </div>
            <div class="w-full bg-[#141414] h-3 rounded-full overflow-hidden border border-[#2E2D2C]">
                <div class="bg-gradient-to-r from-[#E4A318] to-[#C68B0E] h-full rounded-full" style="width: {{ $project->progress_percentage }}%"></div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Column: Stages & Files -->
        <div class="lg:col-span-2 space-y-6">
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Etapas de Execução do Projeto</h3>
                <div class="space-y-3">
                    @forelse($project->stages as $stage)
                        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h4 class="text-sm font-bold text-white">{{ $stage->title }}</h4>
                                <span class="text-[11px] text-gray-400">
                                    Etapa nº {{ $stage->order }}
                                    @if($stage->deadline) • Prazo: {{ $stage->deadline->format('d/m/Y') }} @endif
                                </span>
                                @if($stage->description)
                                    <p class="text-xs text-gray-300 mt-1">{{ $stage->description }}</p>
                                @endif
                            </div>
                            @if(Auth::user()->hasPermission('projects.manage'))
                                <form action="{{ route('admin.projects.stage', $stage) }}" method="POST" class="flex items-center gap-2 shrink-0">
                                    @csrf
                                    <select name="status" onchange="this.form.submit()" class="bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                                        <option value="pending" {{ $stage->status === 'pending' ? 'selected' : '' }}>Pendente</option>
                                        <option value="in_progress" {{ $stage->status === 'in_progress' ? 'selected' : '' }}>Em Andamento</option>
                                        <option value="completed" {{ $stage->status === 'completed' ? 'selected' : '' }}>Concluído</option>
                                    </select>
                                </form>
                            @else
                                <span class="text-[10px] font-bold px-2.5 py-1 rounded bg-[#1C1C1C] text-gray-300">{{ $stage->status_label }}</span>
                            @endif
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Nenhuma etapa cadastrada.</div>
                    @endforelse
                </div>

                @if(Auth::user()->hasPermission('projects.manage'))
                    <form action="{{ route('admin.projects.stages.store', $project) }}" method="POST" class="pt-4 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        @csrf
                        <div class="sm:col-span-5">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nova Etapa</label>
                            <input type="text" name="title" required placeholder="Ex: 6. Treinamento da Equipe" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        </div>
                        <div class="sm:col-span-4">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição</label>
                            <input type="text" name="description" placeholder="Entregável esperado" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        </div>
                        <div class="sm:col-span-3">
                            <button type="submit" class="btn-secondary w-full py-2 rounded-xl text-xs font-bold">+ Adicionar</button>
                        </div>
                    </form>
                @endif
            </div>

            <!-- Project Files & Deliverables -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Arquivos & Entregáveis</h3>
                <div class="space-y-2">
                    @forelse($project->attachments as $att)
                        <div class="p-3 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between gap-4">
                            <div class="text-xs truncate">
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-white block truncate">{{ $att->file_name }}</span>
                                    <span class="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 {{ $att->is_client_visible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400' }}">
                                        {{ $att->is_client_visible ? 'Cliente' : 'Interno' }}
                                    </span>
                                </div>
                                <span class="text-[10px] text-gray-400">
                                    {{ $att->file_size ? round($att->file_size / 1024) . ' KB' : '' }}
                                    {{ $att->uploader ? ' • Enviado por ' . $att->uploader->name : '' }}
                                </span>
                            </div>
                            <a href="{{ route('admin.projects.attachments.download', [$project, $att]) }}" class="text-xs text-[#E4A318] hover:underline font-bold shrink-0">Download</a>
                        </div>
                    @empty
                        <div class="text-xs text-gray-500 py-2">Nenhum arquivo anexado ainda.</div>
                    @endforelse
                </div>

                @if(Auth::user()->hasPermission('projects.manage'))
                    <form action="{{ route('admin.projects.attachment', $project) }}" method="POST" enctype="multipart/form-data" class="pt-4 border-t border-[#222222] space-y-3">
                        @csrf
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1">Título do Entregável</label>
                            <input type="text" name="title" placeholder="Ex: Layout Figma Aprovado, Código Fonte, Relatório" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                        </div>
                        <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                            <input type="hidden" name="is_client_visible" value="0">
                            <input type="checkbox" name="is_client_visible" value="1" checked class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                            <span>Disponibilizar download no Portal do Cliente</span>
                        </label>
                        <div class="flex flex-wrap items-center gap-3">
                            <input type="file" name="file" required class="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#E4A318] file:text-[#0B0B0B]">
                            <button type="submit" class="btn-primary text-xs px-4 py-2 rounded-xl font-bold">Enviar Arquivo</button>
                        </div>
                    </form>
                @endif
            </div>
        </div>

        <!-- Sidebar: Progress, Team & Contract Info -->
        <div class="space-y-6">
            @if(Auth::user()->hasPermission('projects.manage'))
                <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                    <h3 class="text-sm font-bold text-white">Ajustar Progresso & Status</h3>
                    <form action="{{ route('admin.projects.progress', $project) }}" method="POST" class="space-y-3">
                        @csrf
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1">Progresso (0 a 100%)</label>
                            <input type="number" name="progress_percentage" min="0" max="100" value="{{ $project->progress_percentage }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-1">Status Geral</label>
                            <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                                <option value="planning" {{ $project->status === 'planning' ? 'selected' : '' }}>Planejamento</option>
                                <option value="in_progress" {{ $project->status === 'in_progress' ? 'selected' : '' }}>Em Andamento</option>
                                <option value="reviewing" {{ $project->status === 'reviewing' ? 'selected' : '' }}>Em Revisão</option>
                                <option value="on_hold" {{ $project->status === 'on_hold' ? 'selected' : '' }}>Em Espera</option>
                                <option value="completed" {{ $project->status === 'completed' ? 'selected' : '' }}>Concluído</option>
                                <option value="cancelled" {{ $project->status === 'cancelled' ? 'selected' : '' }}>Cancelado</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-primary w-full py-2.5 rounded-xl text-xs font-bold">Salvar Progresso</button>
                    </form>
                </div>
            @endif

            <!-- Team Members -->
            <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
                <h3 class="text-sm font-bold text-white">Equipe Alocada ({{ $project->members->count() }})</h3>
                <div class="space-y-2 text-xs">
                    @forelse($project->members as $member)
                        <div class="p-2.5 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between gap-2">
                            <div class="truncate">
                                <div class="font-bold text-white truncate">{{ $member->user?->name ?? 'Usuário' }}</div>
                                <div class="text-[10px] text-[#E4A318]">{{ $member->role_in_project }}</div>
                            </div>
                            @if(Auth::user()->hasPermission('projects.manage'))
                                <form action="{{ route('admin.projects.members.destroy', $member) }}" method="POST">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-[11px] text-red-400 hover:text-red-300 px-1.5" title="Remover">&times;</button>
                                </form>
                            @endif
                        </div>
                    @empty
                        <div class="text-xs text-gray-500">Nenhum membro alocado.</div>
                    @endforelse
                </div>

                @if(Auth::user()->hasPermission('projects.manage'))
                    <form action="{{ route('admin.projects.members.store', $project) }}" method="POST" class="pt-3 border-t border-[#222222] space-y-2.5">
                        @csrf
                        <select name="user_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="">Selecionar profissional...</option>
                            @foreach($staffMembers as $staff)
                                <option value="{{ $staff->id }}">{{ $staff->name }} ({{ $staff->roleEnum()->label() }})</option>
                            @endforeach
                        </select>
                        <input type="text" name="role_in_project" required placeholder="Função (Ex: Tech Lead, Designer)" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        <button type="submit" class="btn-secondary w-full py-2 rounded-xl text-xs font-bold">+ Alocar na Equipe</button>
                    </form>
                @endif
            </div>

            <div class="glass-card p-6 rounded-2xl border border-[#222222] text-xs space-y-2">
                <h3 class="text-sm font-bold text-white mb-2">Informações Contratuais</h3>
                <div><span class="text-gray-400">Valor Orçado:</span> <span class="font-bold text-white">R$ {{ number_format($project->budget ?? 0, 2, ',', '.') }}</span></div>
                <div><span class="text-gray-400">Início:</span> <span class="text-white">{{ $project->start_date ? $project->start_date->format('d/m/Y') : 'Não definido' }}</span></div>
                <div><span class="text-gray-400">Prazo Final:</span> <span class="text-white">{{ $project->deadline ? $project->deadline->format('d/m/Y') : 'Não definido' }}</span></div>
                @if($project->quotation)
                    <div>
                        <span class="text-gray-400">Orçamento:</span>
                        <a href="{{ route('admin.quotations.show', $project->quotation) }}" class="text-[#E4A318] hover:underline font-mono font-bold">{{ $project->quotation->quotation_number }}</a>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
