@extends('layouts.public')

@section('title', 'Solicitar Orçamento | GundjaTech')

@section('content')
<section class="hm-contato ct-topo" id="orcamento" aria-labelledby="orcamento-titulo">
  <div class="container hm-contato-grid">
    <div class="hm-contato-txt">
      <p class="ct-kicker">Orçamento &amp; Diagnóstico GundjaTech</p>
      <h1 id="orcamento-titulo">Solicite sua <em>proposta sob medida</em></h1>
      <p>Conte o que você precisa. Nosso sistema gera um protocolo único imediato e um diretor da GundjaTech responde em até 4 horas úteis.</p>

      <ul class="hm-contato-canais">
        <li>
          <a class="ct-whats-destaque" href="https://wa.me/5519953248420">
            <svg><use href="#i-whats"/></svg>
            <span><small>Prefere conversar agora?</small>Chamar no WhatsApp</span>
          </a>
        </li>
        <li>
          <a href="{{ route('track.request') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span><small>Já possui protocolo?</small>Acompanhar solicitação</span>
          </a>
        </li>
      </ul>

      <p class="ct-prova"><b>5.0</b> <span aria-label="5 estrelas">★★★★★</span> no Google · Mais de 500 projetos em 4 continentes</p>
    </div>

    <form action="{{ route('request.store') }}" method="POST" enctype="multipart/form-data" class="form hm-form">
      @csrf

      @if(session('error'))
        <div class="cheio" style="background:rgba(242,46,62,.15);border:1px solid rgba(242,46,62,.4);color:#fff;padding:12px 16px;border-radius:12px;font-size:13px">
          {{ session('error') }}
        </div>
      @endif

      @if($errors->any())
        <div class="cheio" style="background:rgba(242,46,62,.15);border:1px solid rgba(242,46,62,.4);color:#fff;padding:12px 16px;border-radius:12px;font-size:13px">
          <ul style="margin:0;padding-left:18px">
            @foreach($errors->all() as $error)
              <li>{{ $error }}</li>
            @endforeach
          </ul>
        </div>
      @endif

      <label class="campo">Nome completo*
        <input type="text" name="contact_name" autocomplete="name" value="{{ old('contact_name', Auth::user()?->name) }}" required>
      </label>

      <label class="campo">Empresa
        <input type="text" name="company_name" autocomplete="organization" value="{{ old('company_name') }}">
      </label>

      <label class="campo">E-mail corporativo*
        <input type="email" name="email" autocomplete="email" value="{{ old('email', Auth::user()?->email) }}" required>
      </label>

      <label class="campo">Telefone / WhatsApp*
        <input type="tel" name="phone" autocomplete="tel" placeholder="(11) 90000-0000" value="{{ old('phone', Auth::user()?->phone) }}" required>
      </label>

      <label class="campo cheio">Serviço desejado*
        <select name="service_id" required style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;color:#fff;font:inherit;margin-top:6px">
          <option value="" style="color:#000">Selecione o serviço...</option>
          @foreach($services as $s)
            <option value="{{ $s->id }}" style="color:#000" {{ (isset($selectedServiceId) && $selectedServiceId == $s->id) ? 'selected' : '' }}>
              [{{ $s->category->name }}] {{ $s->name }} — A partir de R$ {{ number_format($s->starting_price, 2, ',', '.') }}
            </option>
          @endforeach
        </select>
      </label>

      <label class="campo cheio">Título resumido do projeto*
        <input type="text" name="title" placeholder="Ex.: Criação de site institucional ou loja virtual" value="{{ old('title') }}" required>
      </label>

      <label class="campo">Orçamento estimado (R$)
        <input type="number" step="0.01" name="estimated_budget" placeholder="Ex.: 15000" value="{{ old('estimated_budget') }}">
      </label>

      <label class="campo">Prazo desejado
        <input type="date" name="desired_deadline" value="{{ old('desired_deadline') }}">
      </label>

      <label class="campo cheio">Descrição do projeto*
        <textarea name="description" rows="4" placeholder="Conte um pouco sobre os objetivos, funcionalidades e referências do projeto" required>{{ old('description') }}</textarea>
      </label>

      <div class="cheio hm-form-acoes">
        <label class="hm-anexo">
          <input type="file" name="attachment" class="js-anexo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/></svg>
          <span class="js-anexo-nome">Anexar briefing (opcional)</span>
        </label>

        <button type="submit" class="btn">Enviar solicitação <svg><use href="#i-seta"/></svg></button>
      </div>

      <p class="cheio hm-lgpd">Seus dados são usados só para responder à sua solicitação (LGPD).</p>
    </form>
  </div>
</section>
@endsection
