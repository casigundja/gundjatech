@extends('layouts.public')

@section('title', $service->name . ' | GundjaTech')

@section('content')
<section class="in-hero ps-hero">
  <div class="in-hero-fx" aria-hidden="true"><i></i><i></i><b></b></div>
  <div class="container ps-hero-txt">
    <nav class="ps-trilha" aria-label="Você está em">
      <a href="/">Início</a> / <a href="{{ route('services') }}">Serviços</a> / {{ $service->category->name }}
    </nav>
    <h1>{{ $service->name }}</h1>
    <p style="font-size:18px;color:#3A3F55;max-width:680px;margin-top:16px;line-height:1.6">
      {{ $service->short_description }}
    </p>
  </div>
</section>

<section class="hm-contato" id="detalhes-servico">
  <div class="container hm-contato-grid">
    <div class="hm-contato-txt">
      <p class="ct-kicker">{{ $service->category->name }}</p>
      <h2>O que está incluso na <em>entrega</em></h2>
      <p style="white-space:pre-line">{{ $service->description }}</p>

      <ul class="hm-contato-canais" style="margin-top:24px">
        <li>
          <a class="ct-whats-destaque" href="{{ route('request.quote', ['service_id' => $service->id]) }}">
            <svg><use href="#i-seta"/></svg>
            <span>
              <small>Prazo estimado: {{ $service->estimated_delivery_days }} dias úteis</small>
              @if($service->starting_price > 0)
                Solicitar proposta (a partir de R$ {{ number_format($service->starting_price, 2, ',', '.') }})
              @else
                Solicitar proposta personalizada
              @endif
            </span>
          </a>
        </li>
      </ul>
    </div>

    <form class="form hm-form js-form" novalidate>
      <label class="campo">Nome*<input type="text" name="nome" autocomplete="name" required></label>
      <label class="campo">E-mail corporativo*<input type="email" name="email" autocomplete="email" required></label>
      <label class="campo">Telefone*<input type="tel" name="telefone" autocomplete="tel" placeholder="(11) 90000-0000" required></label>
      <label class="campo">Site da empresa (se tiver)<input type="text" name="site" inputmode="url" placeholder="www.suaempresa.com.br"></label>
      <label class="campo cheio">Empresa<input type="text" name="empresa" autocomplete="organization"></label>
      <label class="campo cheio">Mensagem<textarea name="mensagem" placeholder="Conte um pouco sobre o projeto de {{ $service->name }}"></textarea></label>
      <input type="hidden" name="origem" value="servico-{{ $service->slug }}">
      <div class="cheio hm-form-acoes">
        <button type="submit" class="btn">Falar com especialista <svg><use href="#i-seta"/></svg></button>
      </div>
      <p class="cheio hm-lgpd">Seus dados são usados só para responder ao seu contato (LGPD).</p>
      <div class="ok" role="status"><h3>Recebido!</h3><p>Um diretor da GundjaTech responde em até 4 horas úteis.</p></div>
    </form>
  </div>
</section>
@endsection
