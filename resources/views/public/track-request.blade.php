@extends('layouts.public')

@section('title', 'Acompanhar Solicitação | GundjaTech')

@section('content')
<section class="hm-contato ct-topo" id="acompanhar" aria-labelledby="acompanhar-titulo">
  <div class="container hm-contato-grid">
    <div class="hm-contato-txt">
      <p class="ct-kicker">Rastreabilidade GundjaTech</p>
      <h1 id="acompanhar-titulo">Acompanhe seu <em>protocolo em tempo real</em></h1>
      <p>Informe o número do protocolo gerado na sua solicitação para consultar o status técnico, histórico de etapas e propostas emitidas.</p>

      <form action="{{ route('track.request') }}" method="GET" class="form hm-form" style="margin-top:24px;padding:24px">
        <label class="campo cheio">Número do protocolo*
          <input type="text" name="protocol" value="{{ $protocol ?? '' }}" placeholder="Ex.: GNDJ-20261119-XXXX" required style="font-family:monospace;text-transform:uppercase">
        </label>
        <div class="cheio hm-form-acoes">
          <button type="submit" class="btn">Consultar protocolo <svg><use href="#i-seta"/></svg></button>
        </div>
      </form>
    </div>

    <div>
      @if(session('success'))
        <div role="status" class="gt-auto-alert" style="margin-bottom:18px;padding:14px 18px;border-radius:14px;background:rgba(16,185,129,.16);border:1px solid rgba(16,185,129,.42);color:#ecfdf5;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:opacity .35s ease,transform .35s ease">
          <div style="display:flex;align-items:center;gap:10px">
            <svg style="width:16px;height:16px;color:#34d399;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            <span>{{ session('success') }}</span>
          </div>
          <button type="button" onclick="this.closest('.gt-auto-alert').remove()" style="background:none;border:none;color:#ecfdf5;font-size:18px;line-height:1;cursor:pointer;opacity:0.7;padding:2px 6px" title="Fechar aviso">&times;</button>
        </div>
      @endif
      @if(session('error'))
        <div role="alert" class="gt-auto-alert" style="margin-bottom:18px;padding:14px 18px;border-radius:14px;background:rgba(242,46,62,.16);border:1px solid rgba(242,46,62,.42);color:#fff;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:opacity .35s ease,transform .35s ease">
          <div style="display:flex;align-items:center;gap:10px">
            <svg style="width:16px;height:16px;color:#f87171;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <span>{{ session('error') }}</span>
          </div>
          <button type="button" onclick="this.closest('.gt-auto-alert').remove()" style="background:none;border:none;color:#fff;font-size:18px;line-height:1;cursor:pointer;opacity:0.7;padding:2px 6px" title="Fechar aviso">&times;</button>
        </div>
      @endif

      @php
        $statusLabels = [
            'new' => 'Nova Solicitação',
            'analyzing' => 'Em Análise Técnica',
            'awaiting_info' => 'Aguardando Informações',
            'waiting_info' => 'Aguardando Informações',
            'quotation_sent' => 'Orçamento Enviado',
            'quoted' => 'Orçamento Enviado',
            'awaiting_approval' => 'Aguardando Aprovação',
            'approved' => 'Aprovada',
            'in_progress' => 'Em Execução / Projeto',
            'completed' => 'Concluída com Sucesso',
            'cancelled' => 'Cancelada',
        ];
      @endphp

      @if($serviceRequest)
        <div class="form hm-form" style="display:block">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,.12)">
            <div>
              <small style="color:#8F9BB7;font-family:monospace;font-size:12px">Protocolo: {{ $serviceRequest->protocol }}</small>
              <h2 style="font-size:22px;color:#fff;margin-top:4px">{{ $serviceRequest->service_title ?? $serviceRequest->title }}</h2>
              <p style="font-size:13px;color:#A9B1CC;margin-top:4px">
                Serviço: {{ $serviceRequest->service?->name ?? 'Personalizado' }} · Aberto em {{ $serviceRequest->created_at->format('d/m/Y H:i') }}
              </p>
            </div>
            <span style="background:rgba(228,163,24,.22);border:1px solid rgba(228,163,24,.45);color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700">
              {{ $statusLabels[$serviceRequest->status] ?? $serviceRequest->status }}
            </span>
          </div>

          @if($serviceRequest->quotation && $serviceRequest->quotation->status !== 'draft')
            <div style="margin-top:20px;padding:18px;border-radius:14px;background:rgba(228,163,24,.15);border:1px solid rgba(228,163,24,.4);display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px">
              <div>
                <small style="color:#F4C44E;font-weight:700;text-transform:uppercase;font-size:11px">Proposta Comercial Disponível</small>
                <h3 style="color:#fff;font-size:17px;margin-top:4px">
                  {{ $serviceRequest->quotation->title ?? $serviceRequest->quotation->quotation_number }} — R$ {{ number_format($serviceRequest->quotation->total ?? $serviceRequest->quotation->total_amount ?? 0, 2, ',', '.') }}
                </h3>
                <p style="color:#A9B1CC;font-size:12px;margin-top:2px">
                  Válida até {{ $serviceRequest->quotation->valid_until ? $serviceRequest->quotation->valid_until->format('d/m/Y') : 'Data não informada' }}
                </p>
              </div>
              <a href="{{ route('login') }}" class="btn btn-pequeno">Acessar Portal <svg><use href="#i-seta"/></svg></a>
            </div>
          @endif

          <div style="margin-top:24px">
            <h3 style="color:#fff;font-size:15px;margin-bottom:14px">Histórico de Movimentações</h3>
            <div style="border-left:2px solid rgba(255,255,255,.15);padding-left:18px;display:grid;gap:16px">
              @foreach($serviceRequest->statusHistories as $history)
                <div>
                  <small style="color:#8F9BB7;font-size:11px">{{ $history->created_at->format('d/m/Y H:i') }}</small>
                  <div style="color:#fff;font-weight:700;font-size:14px;margin-top:2px">
                    Status: {{ $statusLabels[$history->new_status] ?? $history->new_status }}
                  </div>
                  @if($history->comment)
                    <p style="color:#A9B1CC;font-size:13px;margin-top:4px">{{ $history->comment }}</p>
                  @endif
                </div>
              @endforeach
            </div>
          </div>
        </div>
      @elseif($protocol)
        <div class="form hm-form" style="display:block;text-align:center;padding:40px 24px">
          <h3 style="color:#fff;font-size:18px">Nenhuma solicitação encontrada</h3>
          <p style="color:#A9B1CC;font-size:14px;margin-top:8px">
            Verifique se o código de protocolo informado (<strong>{{ $protocol }}</strong>) está correto.
          </p>
        </div>
      @else
        <div class="form hm-form" style="display:block;padding:36px 28px">
          <h3 style="color:#fff;font-size:18px">Precisa de um novo orçamento?</h3>
          <p style="color:#A9B1CC;font-size:14px;margin-top:8px;margin-bottom:20px">
            Envie os detalhes do seu projeto e receba seu protocolo de atendimento na hora.
          </p>
          <a href="{{ route('request.quote') }}" class="btn">Solicitar orçamento <svg><use href="#i-seta"/></svg></a>
        </div>
      @endif
    </div>
  </div>
</section>

<script>
  (function () {
    var alerts = document.querySelectorAll('.gt-auto-alert');
    alerts.forEach(function (el) {
      var timer = setTimeout(function () { dismiss(el); }, 5000);
      el.addEventListener('mouseenter', function () { clearTimeout(timer); });
      el.addEventListener('mouseleave', function () {
        timer = setTimeout(function () { dismiss(el); }, 2500);
      });
    });
    function dismiss(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }
  })();
</script>
@endsection
