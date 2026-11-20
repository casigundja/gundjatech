@extends('layouts.public')

@section('title', ($post->title ?? 'Artigo') . ' | Blog GundjaTech')
@section('meta_description', $post->excerpt ?: \Illuminate\Support\Str::limit(strip_tags((string) $post->content), 155))

@section('content')
<div class="ps-progresso js-progresso" aria-hidden="true"></div>

<section class="in-hero ps-hero">
  <div class="in-hero-fx" aria-hidden="true"><i></i><i></i><b></b></div>
  <div class="container ps-hero-txt">
    <nav class="ps-trilha" aria-label="Você está em">
      <a href="/">Início</a> / <a href="{{ route('blog') }}">Blog</a> / {{ $post->category ?? 'Desenvolvimento web' }}
    </nav>
    <h1>{{ $post->title }}</h1>
    <div class="ps-meta-linha">
      <a class="au-mini au-mini-claro" href="/autor-casimiro-gundja" rel="author">
        <img src="/img/time/Jorge.webp?v=2" alt="Casimiro Gundja" width="44" height="44">
        <span><b>Casimiro Gundja</b><small>Engenheiro de Software e Desenvolvedor de Sistemas</small></span>
      </a>
      <span class="ps-meta">
        <time datetime="{{ $post->published_at ? $post->published_at->format('Y-m-d') : date('Y-m-d') }}">
          {{ $post->published_at ? $post->published_at->format('d/m/Y') : date('d/m/Y') }}
        </time> · 6 min de leitura
      </span>
      <button type="button" class="ps-ouvir js-ouvir" aria-pressed="false">
        <span class="ps-ouvir-ic" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="js-ouvir-txt">Ouvir o artigo</span>
      </button>
    </div>
  </div>
</section>

<div class="container ps-grid">
  <article class="ps-artigo">
    <div class="ps-corpo js-corpo">
      {!! nl2br(e($post->content)) !!}
    </div>

    @if(isset($relatedPosts) && $relatedPosts->isNotEmpty())
      <section style="margin-top:48px;padding-top:32px;border-top:1px solid rgba(15,23,42,.12)">
        <h2 style="font-size:20px;margin-bottom:16px">Artigos relacionados</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
          @foreach($relatedPosts as $rel)
            <a href="{{ route('blog.show', $rel->slug) }}" style="display:block;padding:18px;border-radius:14px;border:1px solid rgba(15,23,42,.12);text-decoration:none;color:inherit">
              <small style="color:#8F6107;font-weight:700;font-size:11px;text-transform:uppercase">{{ $rel->category ?? 'Blog' }}</small>
              <strong style="display:block;margin-top:6px;font-size:15px;line-height:1.35">{{ $rel->title }}</strong>
            </a>
          @endforeach
        </div>
      </section>
    @endif
  </article>
</div>
@endsection
