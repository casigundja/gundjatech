@extends('layouts.admin')
@section('title', 'Controle de Permissões (RBAC) • GundjaTech')
@section('header_title', 'Controle de Permissões & Matriz RBAC')

@section('content')
<div class="space-y-6">
    <!-- Top Info & Role Cards -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <p class="text-xs text-gray-400">Defina exatamente quais módulos e ações cada cargo pode visualizar ou gerenciar em tempo real no banco de dados.</p>
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('admin.users.index') }}" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Gerenciar Usuários</a>
            <form
                action="{{ route('admin.permissions.reset') }}"
                method="POST"
                data-confirm-title="Restaurar permissões padrão"
                data-confirm-message="Deseja restaurar todas as permissões de cargos para a configuração original da GundjaTech? Ajustes manuais anteriores serão substituídos."
                data-confirm-button="Restaurar padrões"
                data-confirm-tone="warning"
            >
                @csrf
                <button type="submit" class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer">
                    Restaurar Padrões
                </button>
            </form>
        </div>
    </div>

    <!-- Role Summary Strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        @foreach($roles as $role)
            <div class="glass-card p-3.5 rounded-xl border border-[#222222]">
                <div class="text-[10px] font-bold uppercase text-[#E4A318] truncate">{{ $role->label() }}</div>
                <div class="text-lg font-extrabold text-white mt-1">{{ $roleUserCounts[$role->value] ?? 0 }}</div>
                <div class="text-[10px] text-gray-400">usuário(s)</div>
            </div>
        @endforeach
    </div>

    <!-- RBAC Matrix Form -->
    <form action="{{ route('admin.permissions.update') }}" method="POST" class="space-y-6">
        @csrf
        @method('PUT')

        <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                        <tr>
                            <th class="px-5 py-4 min-w-[260px]">Módulo / Permissão</th>
                            @foreach($roles as $role)
                                <th class="px-3 py-4 text-center whitespace-nowrap">
                                    <span class="block text-white font-bold">{{ $role->label() }}</span>
                                    <span class="text-[9px] text-gray-500 font-mono">{{ $role->value }}</span>
                                </th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-[#222222]">
                        @foreach($permissionsByModule as $module => $modulePermissions)
                            <tr class="bg-[#121212]">
                                <td colspan="{{ count($roles) + 1 }}" class="px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-[#E4A318]">
                                    {{ $moduleLabels[$module] ?? ucfirst($module) }}
                                </td>
                            </tr>
                            @foreach($modulePermissions as $perm)
                                <tr class="hover:bg-[#161616] transition">
                                    <td class="px-5 py-3">
                                        <div class="font-bold text-white">{{ $perm->name }}</div>
                                        <div class="text-[10px] text-gray-400">{{ $perm->description }} <span class="font-mono text-gray-500">({{ $perm->slug }})</span></div>
                                    </td>
                                    @foreach($roles as $role)
                                        @php
                                            $isSuper = $role === \App\Enums\UserRole::SuperAdmin;
                                            $isChecked = $isSuper || in_array((int) $perm->id, $assignedMatrix[$role->value] ?? [], true);
                                        @endphp
                                        <td class="px-3 py-3 text-center">
                                            @if($isSuper)
                                                <input type="checkbox" checked disabled title="Super Administrador possui acesso irrestrito" class="rounded bg-[#0B0B0B] border-[#E4A318]/50 text-[#E4A318] opacity-70 cursor-not-allowed">
                                            @else
                                                <input
                                                    type="checkbox"
                                                    name="permissions[{{ $role->value }}][]"
                                                    value="{{ $perm->id }}"
                                                    {{ $isChecked ? 'checked' : '' }}
                                                    class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318] focus:ring-[#E4A318] cursor-pointer"
                                                >
                                            @endif
                                        </td>
                                    @endforeach
                                </tr>
                            @endforeach
                        @endforeach
                    </tbody>
                </table>
            </div>

            <div class="p-5 bg-[#111111] border-t border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p class="text-[11px] text-gray-400">Alterações entram em vigor imediatamente na próxima requisição de cada usuário. O perfil <strong class="text-[#E4A318]">Super Administrador</strong> mantém acesso total protegido.</p>
                <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shrink-0">
                    Salvar Matriz de Permissões
                </button>
            </div>
        </div>
    </form>

    <!-- Audit Log -->
    @if($recentAuditLogs->isNotEmpty())
        <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-300">Auditoria Recente de Permissões</h3>
            <div class="divide-y divide-[#222222] text-xs">
                @foreach($recentAuditLogs as $log)
                    <div class="py-2.5 flex items-center justify-between gap-4">
                        <div>
                            <span class="font-mono text-[#E4A318] font-bold">{{ $log->action }}</span>
                            <span class="text-gray-400">por {{ $log->user?->name ?? 'Sistema' }}</span>
                        </div>
                        <span class="text-[11px] text-gray-500">{{ $log->created_at->format('d/m/Y H:i') }}</span>
                    </div>
                @endforeach
            </div>
        </div>
    @endif
</div>
@endsection
