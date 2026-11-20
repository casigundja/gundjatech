@extends('layouts.admin')
@section('title', 'Novo Projeto • GundjaTech')
@section('header_title', 'Iniciar Novo Projeto')

@section('content')
<div class="max-w-3xl mx-auto glass-card p-8 rounded-3xl border border-[#222222]">
    <form action="{{ route('admin.projects.store') }}" method="POST" class="space-y-5">
        @csrf
        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Cliente *</label>
            <select name="client_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                <option value="">Selecione o cliente...</option>
                @foreach($clients as $c)
                    <option value="{{ $c->id }}" {{ old('client_id') == $c->id ? 'selected' : '' }}>{{ $c->display_name }} ({{ $c->name }})</option>
                @endforeach
            </select>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Nome do Projeto *</label>
            <input type="text" name="name" required value="{{ old('name') }}" placeholder="Ex: Criação de E-commerce e Estruturação de Tráfego" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Serviço Principal</label>
                <select name="service_id" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                    <option value="">Nenhum específico</option>
                    @foreach($services as $s)
                        <option value="{{ $s->id }}" {{ old('service_id') == $s->id ? 'selected' : '' }}>{{ $s->name }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Gerente do Projeto *</label>
                <select name="manager_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                    @foreach($managers as $m)
                        <option value="{{ $m->id }}" {{ old('manager_id', Auth::id()) == $m->id ? 'selected' : '' }}>{{ $m->name }} ({{ $m->roleEnum()->label() }})</option>
                    @endforeach
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Data de Início</label>
                <input type="date" name="start_date" value="{{ old('start_date', date('Y-m-d')) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Prazo de Entrega</label>
                <input type="date" name="deadline" value="{{ old('deadline') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Orçamento / Valor do Contrato (R$)</label>
            <input type="number" step="0.01" min="0" name="budget" value="{{ old('budget') }}" placeholder="0.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Escopo & Descrição</label>
            <textarea name="description" rows="4" placeholder="Detalhes do que será entregue..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">{{ old('description') }}</textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('admin.projects.index') }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Criar Projeto</button>
        </div>
    </form>
</div>
@endsection
