@extends('layouts.admin')
@section('title', 'Serviços • GundjaTech')
@section('header_title', 'Catálogo de Serviços')

@section('content')
<div class="space-y-6" x-data="{ catModal: false }">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p class="text-xs text-gray-400">Gerencie os pacotes de serviços e categorias disponíveis no site institucional, orçamentos e portal do cliente.</p>
        @if(Auth::user()->hasPermission('services.manage'))
            <div class="flex items-center gap-3 self-start sm:self-auto">
                <button @click="catModal = true" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold">+ Nova Categoria</button>
                <a href="{{ route('admin.services.create') }}" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    <span>Novo Serviço</span>
                </a>
            </div>
        @endif
    </div>

    <!-- Categories Strip -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        @foreach($categories as $cat)
            <div class="glass-card p-4 rounded-xl border border-[#222222]">
                <div class="text-xs font-bold text-white truncate">{{ $cat->name }}</div>
                <div class="text-[11px] text-[#E4A318] font-semibold mt-1">{{ $cat->services_count }} serviço(s)</div>
            </div>
        @endforeach
    </div>

    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Serviço / Categoria</th>
                        <th class="px-6 py-4">Preço Base</th>
                        <th class="px-6 py-4">Cobrança</th>
                        <th class="px-6 py-4">Prazo Médio</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($services as $s)
                        @php
                            $billingLabel = match ($s->billing_type) {
                                'monthly' => 'Mensal',
                                'yearly' => 'Anual',
                                default => 'Taxa Única',
                            };
                        @endphp
                        <tr class="hover:bg-[#161616] transition">
                            <td class="px-6 py-4">
                                <span class="font-bold text-white block">{{ $s->name }}</span>
                                <span class="text-[10px] text-[#E4A318]">{{ $s->category?->name ?? 'Sem categoria' }}</span>
                            </td>
                            <td class="px-6 py-4 font-bold text-white">R$ {{ number_format($s->base_price ?? 0, 2, ',', '.') }}</td>
                            <td class="px-6 py-4 text-gray-300">{{ $billingLabel }}</td>
                            <td class="px-6 py-4 text-gray-300">{{ $s->estimated_days ?? 10 }} dias úteis</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold {{ $s->is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400' }}">
                                    {{ $s->is_active ? 'Ativo' : 'Inativo' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                @if(Auth::user()->hasPermission('services.manage'))
                                    <div class="inline-flex items-center gap-3">
                                        <a href="{{ route('admin.services.edit', $s) }}" class="text-[#E4A318] hover:underline font-bold">Editar</a>
                                        <form
                                            action="{{ route('admin.services.destroy', $s) }}"
                                            method="POST"
                                            data-confirm-title="Excluir serviço"
                                            data-confirm-message="Tem certeza que deseja remover este serviço do catálogo oficial da GundjaTech?"
                                            data-confirm-target="{{ $s->name }}"
                                            data-confirm-button="Sim, excluir serviço"
                                            data-confirm-tone="danger"
                                        >
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="text-red-400 hover:text-red-300 cursor-pointer">Excluir</button>
                                        </form>
                                    </div>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Nenhum serviço cadastrado.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-[#222222]">{{ $services->links() }}</div>
    </div>

    <!-- Modal New Category -->
    <div x-show="catModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Nova Categoria de Serviço</h3>
            <form action="{{ route('admin.services.categories.store') }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Categoria *</label>
                    <input type="text" name="name" required placeholder="Ex: Automação & IA" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição</label>
                    <textarea name="description" rows="3" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white"></textarea>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="catModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Criar Categoria</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
