@extends('errors.layout')

@section('code', '403')
@section('title', 'Acesso Negado')
@section('heading', 'Você não tem permissão para acessar esta área')
@section('message')
    {{ $exception?->getMessage() ?: 'Seu perfil atual não possui autorização para visualizar ou executar esta ação. Caso precise de acesso, fale com a administração da GundjaTech.' }}
@endsection

@section('actions')
    @auth
        <a href="{{ Auth::user()->isStaff() ? route('admin.dashboard') : route('portal.dashboard') }}" class="gt-btn-primary">
            Voltar ao Meu Painel &rarr;
        </a>
    @else
        <a href="{{ route('login') }}" class="gt-btn-primary">
            Fazer Login &rarr;
        </a>
    @endauth
    <a href="{{ url('/') }}" class="gt-btn-secondary">Página Inicial</a>
@endsection
