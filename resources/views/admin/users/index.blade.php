@extends('layouts.admin')
@section('title', 'Usuários & Equipe • GundjaTech')
@section('header_title', 'Gestão de Usuários & Perfis')

@section('content')
<div class="space-y-6" x-data="{ userModal: false, editModal: false, editUser: { id: null, name: '', email: '', phone: '', role: 'attendant', is_active: true } }">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2 max-w-xl w-full">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Buscar por nome ou e-mail..." class="grow bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            <select name="role" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todos os perfis</option>
                @foreach($roles as $role)
                    <option value="{{ $role->value }}" {{ request('role') === $role->value ? 'selected' : '' }}>{{ $role->label() }}</option>
                @endforeach
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>

        <div class="flex items-center gap-3 self-start md:self-auto">
            @if(Auth::user()->hasPermission('settings.manage'))
                <a href="{{ route('admin.permissions.index') }}" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold">Matriz de Permissões (RBAC)</a>
            @endif
            @if(Auth::user()->hasPermission('users.manage'))
                <button @click="userModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    <span>Novo Usuário</span>
                </button>
            @endif
        </div>
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Nome & E-mail</th>
                        <th class="px-6 py-4">Telefone</th>
                        <th class="px-6 py-4">Perfil / Cargo</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @foreach($users as $u)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-6 py-4">
                                <span class="font-bold text-white block">{{ $u->name }}</span>
                                <span class="text-[11px] text-gray-400">{{ $u->email }}</span>
                            </td>
                            <td class="px-6 py-4 text-gray-300">{{ $u->phone ?? 'Não informado' }}</td>
                            <td class="px-6 py-4">
                                @php
                                    $roleBadgeClass = match ($u->role) {
                                        'superadmin', 'admin' => 'bg-[#F2C230]/20 text-[#F2C230] border border-[#F2C230]/40',
                                        'client' => 'bg-white/10 text-[#D5DCEB] border border-white/15',
                                        default => 'bg-[#121AFF]/20 text-[#93A3FF] border border-[#121AFF]/30',
                                    };
                                @endphp
                                <span class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold {{ $roleBadgeClass }}">
                                    {{ $u->roleEnum()->label() }}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                <span class="text-[10px] font-bold {{ $u->is_active ? 'text-emerald-400' : 'text-red-400' }}">
                                    {{ $u->is_active ? '● Ativo' : '● Desativado' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                @if(Auth::user()->hasPermission('users.manage'))
                                    @if(! $u->isSuperAdmin() || Auth::user()->isSuperAdmin())
                                        <div class="inline-flex items-center justify-end gap-3">
                                            <button
                                                type="button"
                                                @click="editUser = {{ json_encode(['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone ?? '', 'role' => $u->role, 'is_active' => (bool) $u->is_active]) }}; editModal = true"
                                                class="text-[#E4A318] hover:underline font-bold cursor-pointer"
                                            >
                                                Editar
                                            </button>
                                            @if($u->id !== Auth::id())
                                                <form
                                                    action="{{ route('admin.users.destroy', $u) }}"
                                                    method="POST"
                                                    data-confirm-title="Excluir usuário"
                                                    data-confirm-message="Tem certeza que deseja excluir esta conta permanentemente? O acesso ao sistema será revogado imediatamente e esta ação não pode ser desfeita."
                                                    data-confirm-target="{{ $u->name }} • {{ $u->email }} ({{ $u->roleEnum()->label() }})"
                                                    data-confirm-button="Sim, excluir usuário"
                                                    data-confirm-tone="danger"
                                                >
                                                    @csrf
                                                    @method('DELETE')
                                                    <button type="submit" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition cursor-pointer">
                                                        Excluir
                                                    </button>
                                                </form>
                                            @endif
                                        </div>
                                    @else
                                        <span class="text-[10px] text-gray-400 font-semibold">Protegido</span>
                                    @endif
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
        @if($users->hasPages())
            <div class="p-4 border-t border-[#222222]">{{ $users->links() }}</div>
        @endif
    </div>

    <!-- Modal Create User -->
    <div x-show="userModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Criar Usuário</h3>
            <form action="{{ route('admin.users.store') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                    <input type="text" name="name" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail *</label>
                        <input type="email" name="email" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                        <input type="text" name="phone" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Perfil / Cargo *</label>
                    <select name="role" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        @foreach($roles as $role)
                            @if($role !== \App\Enums\UserRole::SuperAdmin || Auth::user()->isSuperAdmin())
                                <option value="{{ $role->value }}">{{ $role->label() }}</option>
                            @endif
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Senha Provisória *</label>
                    <input type="password" name="password" required placeholder="Mínimo 6 dígitos" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <input type="hidden" name="is_active" value="1">
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="userModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Salvar Usuário</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Edit User -->
    <div x-show="editModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Editar Usuário</h3>
            <form :action="`{{ url('/admin/usuarios') }}/${editUser.id}`" method="POST" class="space-y-4">
                @csrf
                @method('PUT')
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                    <input type="text" name="name" x-model="editUser.name" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail *</label>
                        <input type="email" name="email" x-model="editUser.email" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                        <input type="text" name="phone" x-model="editUser.phone" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Perfil / Cargo *</label>
                    <select name="role" x-model="editUser.role" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        @foreach($roles as $role)
                            @if($role !== \App\Enums\UserRole::SuperAdmin || Auth::user()->isSuperAdmin())
                                <option value="{{ $role->value }}">{{ $role->label() }}</option>
                            @endif
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nova Senha (Opcional)</label>
                    <input type="password" name="password" placeholder="Deixe em branco para manter a atual" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <label class="flex items-center gap-2 text-xs text-white cursor-pointer">
                    <input type="checkbox" name="is_active" value="1" x-model="editUser.is_active" class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                    <span>Conta Ativa</span>
                </label>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="editModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Atualizar Usuário</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
