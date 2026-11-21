@extends($layout)

@section('title', 'Minha Conta')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">
    @if($layout === 'layouts.portal')
        <div class="gt-panel-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-[#063B5C] text-[#F2C230] font-extrabold flex items-center justify-center text-lg uppercase shrink-0">
                    {{ substr($user->name, 0, 2) }}
                </div>
                <div>
                    <h1 class="text-xl font-extrabold text-[#063B5C]">Minha Conta</h1>
                    <p class="text-sm text-[#4F687B]">Atualize seus dados cadastrais e proteja seu acesso ao Portal do Cliente.</p>
                </div>
            </div>
            <a href="{{ route('portal.dashboard') }}" class="text-sm font-semibold text-[#16749A] hover:underline">&larr; Voltar ao Portal</a>
        </div>
    @else
        <div class="gt-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-[#063B5C] text-[#F2C230] font-extrabold flex items-center justify-center text-lg uppercase shrink-0">
                    {{ substr($user->name, 0, 2) }}
                </div>
                <div>
                    <h1 class="text-xl font-extrabold text-white">Minha Conta</h1>
                    <p class="text-sm text-gray-400">{{ $user->email }} &bull; {{ $user->role_label }}</p>
                </div>
            </div>
            <a href="{{ route('admin.dashboard') }}" class="btn-secondary text-sm">&larr; Voltar ao Dashboard</a>
        </div>
    @endif

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Dados Pessoais -->
        <div class="{{ $layout === 'layouts.portal' ? 'gt-panel-card' : 'gt-card' }} p-6">
            <h2 class="text-base font-bold {{ $layout === 'layouts.portal' ? 'text-[#063B5C]' : 'text-white' }} mb-1">Dados do Perfil</h2>
            <p class="text-xs {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-5">Mantenha seu nome e telefone atualizados para atendimento rápido.</p>

            <form action="{{ route('account.profile.update') }}" method="POST" class="space-y-4">
                @csrf
                @method('PUT')

                <div>
                    <label for="account_name" class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">Nome Completo *</label>
                    <input id="account_name" type="text" name="name" value="{{ old('name', $user->name) }}" required
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none' : 'gt-input text-sm' }}">
                    @error('name')
                        <p class="mt-1 text-xs text-red-500 font-medium">{{ $message }}</p>
                    @enderror
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">E-mail de Acesso</label>
                    <input type="email" value="{{ $user->email }}" disabled
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#E2ECF2] bg-[#F4F8FB] px-3.5 py-2.5 text-sm text-[#6B8294] cursor-not-allowed' : 'gt-input text-sm opacity-60 cursor-not-allowed' }}">
                    <p class="mt-1 text-[11px] {{ $layout === 'layouts.portal' ? 'text-[#6B8294]' : 'text-gray-500' }}">Para alterar o e-mail de login, solicite suporte à equipe GundjaTech.</p>
                </div>

                <div>
                    <label for="account_phone" class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">Telefone / WhatsApp</label>
                    <input id="account_phone" type="text" name="phone" value="{{ old('phone', $user->phone) }}" placeholder="(19) 99999-9999"
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none' : 'gt-input text-sm' }}">
                    @error('phone')
                        <p class="mt-1 text-xs text-red-500 font-medium">{{ $message }}</p>
                    @enderror
                </div>

                @if($user->isClient() && $user->client)
                    <div>
                        <label for="account_company" class="block text-xs font-bold uppercase tracking-wider text-[#4F687B] mb-1.5">Empresa / Razão Social</label>
                        <input id="account_company" type="text" name="company_name" value="{{ old('company_name', $user->client->company_name) }}"
                               class="w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none">
                        @error('company_name')
                            <p class="mt-1 text-xs text-red-500 font-medium">{{ $message }}</p>
                        @enderror
                    </div>
                @endif

                <div class="pt-2">
                    <button type="submit" class="{{ $layout === 'layouts.portal' ? 'w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#F2C230] hover:bg-[#E0B020] text-[#063B5C] font-extrabold text-sm px-5 py-2.5 transition cursor-pointer' : 'btn-primary text-sm' }}">
                        Salvar Dados do Perfil
                    </button>
                </div>
            </form>
        </div>

        <!-- Segurança & Senha -->
        <div class="{{ $layout === 'layouts.portal' ? 'gt-panel-card' : 'gt-card' }} p-6">
            <h2 class="text-base font-bold {{ $layout === 'layouts.portal' ? 'text-[#063B5C]' : 'text-white' }} mb-1">Alterar Senha</h2>
            <p class="text-xs {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-5">Recomendamos usar uma senha forte com no mínimo 8 caracteres. Ao alterar, outras sessões ativas serão encerradas.</p>

            <form action="{{ route('account.password.update') }}" method="POST" class="space-y-4">
                @csrf
                @method('PUT')

                <div>
                    <label for="current_password" class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">Senha Atual *</label>
                    <input id="current_password" type="password" name="current_password" required autocomplete="current-password"
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none' : 'gt-input text-sm' }}">
                    @error('current_password')
                        <p class="mt-1 text-xs text-red-500 font-medium">{{ $message }}</p>
                    @enderror
                </div>

                <div>
                    <label for="new_password" class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">Nova Senha * (mín. 8 caracteres)</label>
                    <input id="new_password" type="password" name="password" required minlength="8" autocomplete="new-password"
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none' : 'gt-input text-sm' }}">
                    @error('password')
                        <p class="mt-1 text-xs text-red-500 font-medium">{{ $message }}</p>
                    @enderror
                </div>

                <div>
                    <label for="new_password_confirmation" class="block text-xs font-bold uppercase tracking-wider {{ $layout === 'layouts.portal' ? 'text-[#4F687B]' : 'text-gray-400' }} mb-1.5">Confirmar Nova Senha *</label>
                    <input id="new_password_confirmation" type="password" name="password_confirmation" required minlength="8" autocomplete="new-password"
                           class="{{ $layout === 'layouts.portal' ? 'w-full rounded-xl border border-[#CBDCE6] bg-white px-3.5 py-2.5 text-sm text-[#063B5C] focus:border-[#16749A] focus:outline-none' : 'gt-input text-sm' }}">
                </div>

                <div class="pt-2">
                    <button type="submit" class="{{ $layout === 'layouts.portal' ? 'w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#063B5C] hover:bg-[#0A4E78] text-white font-bold text-sm px-5 py-2.5 transition cursor-pointer' : 'btn-primary text-sm' }}">
                        Atualizar Senha com Segurança
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
