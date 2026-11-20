@extends('layouts.public')

@section('title', $category->name . ' | GundjaTech')

@section('content')
<section class="in-hero ps-hero">
  <div class="in-hero-fx" aria-hidden="true"><i></i><i></i><b></b></div>
  <div class="container ps-hero-txt">
    <nav class="ps-trilha" aria-label="Você está em">
      <a href="/">Início</a> / <a href="{{ route('services') }}">Serviços</a> / {{ $category->name }}
    </nav>
    <h1>{{ $category->name }}</h1>
    <p style="font-size:18px;color:#3A3F55;max-width:680px;margin-top:16px;line-height:1.6">
      {{ $category->description }}
    </p>
  </div>
</section>

<section class="hm-contato">
  <div class="container">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px">
      @foreach($category->services as $service)
        <div class="form hm-form" style="display:flex;flex-direction:column;justify-content:space-between;padding:28px">
          <div>
            <small style="color:#8F9BB7;font-size:12px;text-transform:uppercase;letter-spacing:.08em">{{ $category->name }}</small>
            <h3 style="color:#fff;font-size:22px;margin-top:8px">{{ $service->name }}</h3>
            <p style="color:#A9B1CC;font-size:14px;margin-top:10px;line-height:1.6">
              {{ $service->short_description ?? \Illuminate\Support\Str::limit($service->description, 140) }}
            </p>
          </div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:space-between;gap:12px">
            <strong style="color:#fff;font-size:16px">R$ {{ number_format($service->starting_price, 2, ',', '.') }}</strong>
            <a href="{{ route('services.show', $service->slug) }}" class="btn btn-pequeno">Ver detalhes <svg><use href="#i-seta"/></svg></a>
          </div>
        </div>
      @endforeach
    </div>
  </div>
</section>
@endsection
