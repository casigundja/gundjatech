@extends('errors.layout')

@section('code', '500')
@section('title', 'Erro Interno')
@section('heading', 'Algo inesperado aconteceu no servidor')
@section('message', 'Nossa equipe técnica já foi notificada para investigar o ocorrido. Tente novamente em alguns instantes ou entre em contato conosco se o problema persistir.')

@section('actions')
    <a href="{{ url('/') }}" class="gt-btn-primary">Voltar para o Início &rarr;</a>
    <a href="https://wa.me/5511995204050" class="gt-btn-secondary">Suporte WhatsApp</a>
@endsection
