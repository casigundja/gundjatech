<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use App\Models\PortfolioProject;
use App\Models\RequestAttachment;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\View\View;

class PublicController extends Controller
{
    /**
     * @var list<string>
     */
    private const STATIC_BLOG_SLUGS = [
        'conteudo-tecnico-atraia-e-converta-clientes-com-expertise',
        'area-do-cliente-como-criar-uma-conta-de-usuario-perfeita',
        'entenda-o-que-e-aplicacao-web',
        'o-que-e-site-um-site-one-page',
        'drupal-vs-wordpress-qual-e-a-melhor-plataforma-para-o-seu-negocio',
    ];

    public function index(): View
    {
        $categories = ServiceCategory::with(['services' => function ($q): void {
            $q->where('is_active', true)->orderBy('name');
        }])->where('is_active', true)->orderBy('order')->get();

        $featuredProjects = PortfolioProject::where('is_featured', true)
            ->where('is_published', true)
            ->orderBy('id', 'desc')
            ->take(6)
            ->get();

        $latestPosts = BlogPost::where('is_published', true)
            ->orderBy('published_at', 'desc')
            ->take(3)
            ->get();

        return view('public.home', compact('categories', 'featuredProjects', 'latestPosts'));
    }

    public function about(): View
    {
        return view('public.about');
    }

    public function services(): View
    {
        $categories = ServiceCategory::with(['services' => function ($q): void {
            $q->where('is_active', true)->orderBy('name');
        }])->where('is_active', true)->orderBy('order')->get();

        return view('public.services.index', compact('categories'));
    }

    public function serviceDetail(string $slug): View
    {
        $sinnapseServiceMap = [
            'criacao-de-sites' => 'public.sinnapse.criacao-de-sites',
            'gerenciamento-de-dominios' => 'public.sinnapse.ciberseguranca',
            'ciberseguranca' => 'public.sinnapse.ciberseguranca',
            'gestao-de-trafego-pago' => 'public.sinnapse.operacao',
            'operacao' => 'public.sinnapse.operacao',
            'desenvolvimento-de-sites' => 'public.sinnapse.desenvolvimento-de-sites',
            'criacao-de-sites-wordpress' => 'public.sinnapse.criacao-de-sites-wordpress',
            'criacao-de-sites-alphaville' => 'public.sinnapse.criacao-de-sites-alphaville',
            'quanto-custa-um-site' => 'public.sinnapse.quanto-custa-um-site',
        ];

        if (isset($sinnapseServiceMap[$slug]) && view()->exists($sinnapseServiceMap[$slug])) {
            return view($sinnapseServiceMap[$slug]);
        }

        $service = Service::with('category')->where('slug', $slug)->first();

        if (! $service) {
            $category = ServiceCategory::with('services')->where('slug', $slug)->firstOrFail();

            return view('public.services.category', compact('category'));
        }

        $relatedServices = Service::where('category_id', $service->category_id)
            ->where('id', '!=', $service->id)
            ->take(3)
            ->get();

        return view('public.services.show', compact('service', 'relatedServices'));
    }

    public function caseDetail(string $slug): View|RedirectResponse
    {
        if (preg_match('/^[a-z0-9-]+$/', $slug) === 1) {
            $viewName = 'public.sinnapse.case-'.$slug;
            if (view()->exists($viewName)) {
                return view($viewName);
            }
        }

        return redirect()->route('portfolio');
    }

    public function authorDetail(string $slug): View|RedirectResponse
    {
        if (preg_match('/^[a-z0-9-]+$/', $slug) === 1) {
            $viewName = 'public.sinnapse.autor-'.$slug;
            if (view()->exists($viewName)) {
                return view($viewName);
            }
        }

        return redirect()->route('about');
    }

    public function portfolio(Request $request): View
    {
        $query = PortfolioProject::where('is_published', true)->orderBy('id', 'desc');
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        $projects = $query->paginate(9);

        return view('public.portfolio', compact('projects'));
    }

    public function blog(Request $request): View
    {
        $query = BlogPost::where('is_published', true)->orderBy('published_at', 'desc');
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        $posts = $query->paginate(6);

        return view('public.blog.index', compact('posts'));
    }

    public function blogPost(string $slug): View
    {
        $post = BlogPost::where('slug', $slug)->where('is_published', true)->first();

        if (! $post) {
            if (in_array($slug, self::STATIC_BLOG_SLUGS, true) && view()->exists('public.sinnapse.blog-sample')) {
                return view('public.sinnapse.blog-sample');
            }
            abort(404);
        }

        $post->increment('views_count');
        $relatedPosts = BlogPost::where('is_published', true)
            ->where('id', '!=', $post->id)
            ->take(3)
            ->get();

        return view('public.blog.show', compact('post', 'relatedPosts'));
    }

    public function feed(): Response
    {
        $posts = BlogPost::where('is_published', true)
            ->orderByDesc('published_at')
            ->take(20)
            ->get();

        $appUrl = rtrim(url('/'), '/');
        $xmlEscape = static fn (string $v): string => htmlspecialchars($v, ENT_XML1 | ENT_COMPAT, 'UTF-8');

        $itemsXml = '';
        foreach ($posts as $post) {
            $link = $xmlEscape(route('blog.show', $post->slug));
            $title = $xmlEscape((string) $post->title);
            $description = $xmlEscape((string) ($post->excerpt ?: Str::limit(strip_tags((string) $post->content), 220)));
            $pubDate = ($post->published_at ?? $post->created_at ?? now())->toRfc2822String();

            $itemsXml .= "<item><title>{$title}</title><link>{$link}</link><guid>{$link}</guid><description>{$description}</description><pubDate>{$pubDate}</pubDate></item>\n";
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            ."<rss version=\"2.0\"><channel>\n"
            ."<title>Blog GundjaTech</title>\n"
            .'<link>'.$xmlEscape($appUrl.'/blog')."</link>\n"
            ."<description>Artigos práticos sobre criação de sites, tecnologia, cibersegurança, SEO e marketing digital.</description>\n"
            ."<language>pt-BR</language>\n"
            .$itemsXml
            ."</channel></rss>\n";

        return response($xml, 200, ['Content-Type' => 'application/rss+xml; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $appUrl = rtrim(url('/'), '/');
        $xmlEscape = static fn (string $v): string => htmlspecialchars($v, ENT_XML1 | ENT_COMPAT, 'UTF-8');

        $staticPaths = [
            '/',
            '/sobre',
            '/servicos',
            '/servicos/criacao-de-sites',
            '/servicos/gerenciamento-de-dominios',
            '/servicos/gestao-de-trafego-pago',
            '/portfolio',
            '/cases/klasse',
            '/cases/instituto-paraiso-do-saber',
            '/cases/cotech-contabilidade',
            '/blog',
            '/contato',
            '/solicitar-orcamento',
            '/acompanhar-solicitacao',
            '/ciberseguranca',
            '/operacao',
            '/quanto-custa-um-site',
            '/politica-de-privacidade',
        ];

        $urls = [];
        foreach ($staticPaths as $path) {
            $urls[$appUrl.$path] = now()->toAtomString();
        }

        foreach (Service::where('is_active', true)->get(['slug', 'updated_at']) as $service) {
            $urls[route('services.show', $service->slug)] = ($service->updated_at ?? now())->toAtomString();
        }

        foreach (BlogPost::where('is_published', true)->get(['slug', 'updated_at', 'published_at']) as $post) {
            $urls[route('blog.show', $post->slug)] = ($post->updated_at ?? $post->published_at ?? now())->toAtomString();
        }

        $entriesXml = '';
        foreach ($urls as $loc => $lastmod) {
            $entriesXml .= '<url><loc>'.$xmlEscape($loc).'</loc><lastmod>'.$xmlEscape($lastmod)."</lastmod></url>\n";
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            ."<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
            .$entriesXml
            ."</urlset>\n";

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function contact(): View
    {
        return view('public.contact');
    }

    public function sendContact(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $protocol = 'CNT-'.date('Ymd').'-'.strtoupper(Str::random(4));
        $defaultService = Service::where('is_active', true)->first();

        DB::transaction(function () use ($data, $protocol, $defaultService): void {
            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => Auth::check() && Auth::user()->client ? Auth::user()->client->id : null,
                'user_id' => Auth::id(),
                'service_id' => $defaultService?->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'service_title' => 'Contato: '.$data['subject'],
                'description' => $data['message'],
                'status' => 'new',
            ]);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => null,
                'new_status' => 'new',
                'comment' => 'Mensagem enviada pelo formulário de contato do site.',
                'user_id' => Auth::id(),
            ]);
        });

        return back()->with('success', "Mensagem enviada com sucesso (Protocolo {$protocol})! Nossa equipe entrará em contato em até 2 horas úteis.");
    }

    public function requestQuote(Request $request): View
    {
        $services = Service::where('is_active', true)->with('category')->get();
        $selectedServiceId = $request->query('service_id');

        return view('public.request-quote', compact('services', 'selectedServiceId'));
    }

    public function storeRequest(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'contact_name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'service_id' => ['required', 'exists:services,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'estimated_budget' => ['nullable', 'numeric', 'min:0'],
            'desired_deadline' => ['nullable', 'date', 'after:today'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip'],
        ]);

        $protocol = 'GNDJ-'.date('Ymd').'-'.strtoupper(Str::random(4));

        DB::beginTransaction();
        try {
            $clientId = null;
            if (Auth::check() && Auth::user()->client) {
                $clientId = Auth::user()->client->id;
            }

            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $clientId,
                'user_id' => Auth::id(),
                'service_id' => $validated['service_id'],
                'name' => $validated['contact_name'],
                'company' => $validated['company_name'] ?? null,
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'service_title' => $validated['title'],
                'description' => $validated['description'],
                'estimated_budget' => $validated['estimated_budget'] ?? null,
                'desired_deadline' => $validated['desired_deadline'] ?? null,
                'status' => 'new',
            ]);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => null,
                'new_status' => 'new',
                'comment' => 'Solicitação criada através do portal online.',
                'user_id' => Auth::id(),
            ]);

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $path = $file->store('attachments', 'local');

                RequestAttachment::create([
                    'service_request_id' => $serviceRequest->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                    'uploaded_by_user_id' => Auth::id(),
                ]);
            }

            DB::commit();

            return redirect()->route('track.request', ['protocol' => $protocol])
                ->with('success', 'Sua solicitação foi registrada com sucesso! Guarde seu número de protocolo para acompanhamento.');
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Falha ao registrar solicitação pública de orçamento.', [
                'exception' => $e->getMessage(),
                'email' => $validated['email'] ?? null,
            ]);

            return back()->withInput()->with('error', 'Não foi possível processar sua solicitação no momento. Tente novamente em instantes ou fale conosco pelo WhatsApp.');
        }
    }

    public function trackRequest(Request $request): View
    {
        $protocol = $request->query('protocol');
        $serviceRequest = null;

        if ($protocol) {
            $serviceRequest = ServiceRequest::with(['service', 'statusHistories', 'attachments', 'quotation'])
                ->where('protocol', trim((string) $protocol))
                ->first();
        }

        return view('public.track-request', compact('serviceRequest', 'protocol'));
    }

    public function apiLead(Request $request): JsonResponse
    {
        if ($request->filled('sobrenome_hp')) {
            return response()->json(['ok' => true]);
        }

        $validated = $request->validate([
            'nome' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'empresa' => ['nullable', 'string', 'max:255'],
            'site' => ['nullable', 'string', 'max:255'],
            'origem' => ['nullable', 'string', 'max:100'],
            'mensagem' => ['nullable', 'string', 'max:3000'],
        ]);

        $protocol = 'GNDJ-'.date('Ymd').'-'.strtoupper(Str::random(4));
        $service = Service::where('is_active', true)->first();

        if ($service) {
            DB::transaction(function () use ($validated, $protocol, $service): void {
                $sitePrefix = ! empty($validated['site']) ? 'Site: '.$validated['site'].' | ' : '';
                $serviceRequest = ServiceRequest::create([
                    'protocol' => $protocol,
                    'client_id' => Auth::check() && Auth::user()->client ? Auth::user()->client->id : null,
                    'user_id' => Auth::id(),
                    'service_id' => $service->id,
                    'name' => $validated['nome'] ?? 'Cliente Site',
                    'company' => $validated['empresa'] ?? null,
                    'email' => $validated['email'],
                    'phone' => $validated['telefone'] ?? '',
                    'service_title' => 'Solicitação Digital ('.($validated['origem'] ?? 'home').')',
                    'description' => trim($sitePrefix.($validated['mensagem'] ?? 'Solicitação de diagnóstico pelo site.')),
                    'status' => 'new',
                ]);

                RequestStatusHistory::create([
                    'service_request_id' => $serviceRequest->id,
                    'old_status' => null,
                    'new_status' => 'new',
                    'comment' => 'Lead recebido via formulário interativo da home.',
                    'user_id' => Auth::id(),
                ]);
            });
        }

        return response()->json([
            'ok' => true,
            'protocol' => $protocol,
        ]);
    }

    public function apiWhatsapp(Request $request): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}
