@extends('errors.layout')

@section('code', '404')
@section('title', 'Página Não Encontrada')
@section('heading', 'Não encontramos a página solicitada')
@section('message', 'O endereço informado pode ter sido movido, removido ou digitado incorretamente. Use os atalhos abaixo para continuar navegando na plataforma GundjaTech.')

@section('actions')
    <a href="{{ url('/') }}" class="gt-btn-primary">Voltar para o Início &rarr;</a>
    <a href="{{ url('/servicos') }}" class="gt-btn-secondary">Ver Serviços</a>
    <a href="{{ url('/contato') }}" class="gt-btn-secondary">Contato</a>
@endsection
