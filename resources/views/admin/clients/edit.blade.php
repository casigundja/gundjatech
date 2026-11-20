@extends('layouts.admin')
@section('title', 'Editar Cliente • GundjaTech')
@section('header_title', 'Editar Cliente')

@section('content')
<div class="max-w-3xl mx-auto glass-card p-8 rounded-3xl border border-[#222222]">
    <form action="{{ route('admin.clients.update', $client) }}" method="POST" class="space-y-5">
        @csrf
        @method('PUT')
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Razão Social *</label>
                <input type="text" name="company_name" required value="{{ old('company_name', $client->company_name) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Nome Fantasia</label>
                <input type="text" name="trade_name" value="{{ old('trade_name', $client->trade_name) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Contato Principal *</label>
                <input type="text" name="contact_name" required value="{{ old('contact_name', $client->contact_name) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Documento (CPF/CNPJ)</label>
                <input type="text" name="document" value="{{ old('document', $client->document) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">E-mail *</label>
                <input type="email" name="email" required value="{{ old('email', $client->email) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Telefone</label>
                <input type="tel" name="phone" value="{{ old('phone', $client->phone) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Cidade</label>
                <input type="text" name="city" value="{{ old('city', $client->city) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Estado</label>
                <input type="text" name="state" value="{{ old('state', $client->state) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Status</label>
                <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                    <option value="active" {{ $client->status === 'active' ? 'selected' : '' }}>Ativo</option>
                    <option value="lead" {{ $client->status === 'lead' ? 'selected' : '' }}>Lead</option>
                    <option value="inactive" {{ $client->status === 'inactive' ? 'selected' : '' }}>Inativo</option>
                </select>
            </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('admin.clients.show', $client) }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Atualizar Cliente</button>
        </div>
    </form>
</div>
@endsection
