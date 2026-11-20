@extends('layouts.admin')
@section('title', 'Editar Serviço • GundjaTech')
@section('header_title', 'Editar: ' . $service->name)

@section('content')
<div class="max-w-3xl mx-auto glass-card p-8 rounded-3xl border border-[#222222]">
    <form action="{{ route('admin.services.update', $service) }}" method="POST" class="space-y-5">
        @csrf
        @method('PUT')
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Categoria *</label>
                <select name="category_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                    @foreach($categories as $cat)
                        <option value="{{ $cat->id }}" {{ old('category_id', $service->category_id) == $cat->id ? 'selected' : '' }}>{{ $cat->name }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Nome do Serviço *</label>
                <input type="text" name="name" required value="{{ old('name', $service->name) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Breve Descrição</label>
            <input type="text" name="short_description" value="{{ old('short_description', $service->short_description) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Preço Base (R$)</label>
                <input type="number" step="0.01" min="0" name="base_price" value="{{ old('base_price', $service->base_price) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Modelo de Cobrança</label>
                <select name="billing_type" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                    <option value="one_time" {{ old('billing_type', $service->billing_type) === 'one_time' ? 'selected' : '' }}>Taxa Única</option>
                    <option value="monthly" {{ old('billing_type', $service->billing_type) === 'monthly' ? 'selected' : '' }}>Mensalidade / Recorrente</option>
                    <option value="yearly" {{ old('billing_type', $service->billing_type) === 'yearly' ? 'selected' : '' }}>Anual</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Prazo Estimado (Dias)</label>
                <input type="number" min="1" name="estimated_days" value="{{ old('estimated_days', $service->estimated_days) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Descrição Completa</label>
            <textarea name="full_description" rows="5" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">{{ old('full_description', $service->full_description) }}</textarea>
        </div>

        <div class="flex items-center gap-6">
            <label class="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input type="checkbox" name="is_active" value="1" {{ $service->is_active ? 'checked' : '' }} class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                <span>Publicar Serviço no Site</span>
            </label>
            <label class="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input type="checkbox" name="is_featured" value="1" {{ $service->is_featured ? 'checked' : '' }} class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                <span>Destacar na Página Inicial</span>
            </label>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('admin.services.index') }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Atualizar Serviço</button>
        </div>
    </form>
</div>
@endsection
