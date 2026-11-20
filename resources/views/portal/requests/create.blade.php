@extends('layouts.portal')
@section('title', 'Nova Demanda • Portal GundjaTech')
@section('header_title', 'Abrir Nova Demanda de Serviço')

@section('content')
<div class="max-w-3xl mx-auto glass-card p-6 sm:p-8 rounded-3xl border border-[#222222]">
    <form action="{{ route('portal.requests.store') }}" method="POST" enctype="multipart/form-data" class="space-y-5">
        @csrf
        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Serviço Desejado *</label>
            <select name="service_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                <option value="">Selecione o serviço...</option>
                @foreach($services as $s)
                    <option value="{{ $s->id }}" {{ old('service_id') == $s->id ? 'selected' : '' }}>[{{ $s->category?->name ?? 'Geral' }}] {{ $s->name }}</option>
                @endforeach
            </select>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Título da Demanda *</label>
            <input type="text" name="title" required value="{{ old('title') }}" placeholder="Ex: Criação de Landing Page para Lançamento" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Orçamento Estimado (R$)</label>
                <input type="number" step="0.01" min="0" name="estimated_budget" value="{{ old('estimated_budget') }}" placeholder="0.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Prazo Desejado</label>
                <input type="date" name="desired_deadline" value="{{ old('desired_deadline') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Descrição Completa da Necessidade *</label>
            <textarea name="description" rows="5" required placeholder="Explique os objetivos, referências e funcionalidades que espera..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">{{ old('description') }}</textarea>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Anexo / Briefing (PDF, Imagens, Office ou ZIP — máx. 10MB)</label>
            <input type="file" name="attachment" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip" class="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#E4A318] file:text-[#0B0B0B]">
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('portal.requests.index') }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Enviar Solicitação</button>
        </div>
    </form>
</div>
@endsection
