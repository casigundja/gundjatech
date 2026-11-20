@extends('layouts.admin')
@section('title', 'Novo Cliente • GundjaTech')
@section('header_title', 'Cadastrar Novo Cliente')

@section('content')
<div class="max-w-3xl mx-auto glass-card p-8 rounded-3xl border border-[#222222]">
    <form action="{{ route('admin.clients.store') }}" method="POST" class="space-y-5">
        @csrf
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Razão Social / Nome Oficial *</label>
                <input type="text" name="company_name" required value="{{ old('company_name') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Nome Fantasia</label>
                <input type="text" name="trade_name" value="{{ old('trade_name') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Nome do Contato Principal *</label>
                <input type="text" name="contact_name" required value="{{ old('contact_name') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">CPF ou CNPJ</label>
                <input type="text" name="document" value="{{ old('document') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">E-mail *</label>
                <input type="email" name="email" required value="{{ old('email') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Telefone / WhatsApp</label>
                <input type="tel" name="phone" value="{{ old('phone') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Cidade</label>
                <input type="text" name="city" value="{{ old('city') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Estado</label>
                <input type="text" name="state" value="{{ old('state') }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Status</label>
                <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                    <option value="active">Ativo</option>
                    <option value="lead">Lead</option>
                    <option value="inactive">Inativo</option>
                </select>
            </div>
        </div>

        <!-- Create user account checkbox -->
        <div class="p-4 bg-[#141414] rounded-xl border border-[#2E2D2C] space-y-3" x-data="{ createAccount: true }">
            <label class="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                <input type="checkbox" name="create_user_account" value="1" x-model="createAccount" class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318] focus:ring-0">
                <span>Criar credencial de acesso ao Portal do Cliente</span>
            </label>
            <div x-show="createAccount" class="pt-2">
                <label class="block text-[11px] text-gray-400 mb-1">Senha de Acesso (Opcional — gerada automaticamente)</label>
                <input type="password" name="password" placeholder="Deixe em branco para gerar senha temporária segura" class="w-full bg-[#0B0B0B] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('admin.clients.index') }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Salvar Cliente</button>
        </div>
    </form>
</div>
@endsection
