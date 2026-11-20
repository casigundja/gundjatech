<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\BlogPost;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\PortfolioProject;
use App\Models\RequestAttachment;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Services\AutonomousCrmAgent;
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
        $defaultService = $this->resolveServiceForText($data['subject'].' '.$data['message']);

        DB::transaction(function () use ($data, $protocol, $defaultService, $request): void {
            $client = $this->resolveLeadClient(
                $data['email'],
                $data['name'],
                $data['phone'] ?? null,
                null
            );

            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $client->id,
                'user_id' => Auth::id(),
                'service_id' => $defaultService?->id,
                'name' => $data['name'],
                'email' => strtolower(trim($data['email'])),
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

            $this->recordPublicActivity($request, 'public.contact.created', $serviceRequest, [
                'protocol' => $protocol,
                'email' => $serviceRequest->email,
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
            $client = $this->resolveLeadClient(
                $validated['email'],
                $validated['contact_name'],
                $validated['phone'],
                $validated['company_name'] ?? null
            );

            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $client->id,
                'user_id' => Auth::id(),
                'service_id' => $validated['service_id'],
                'name' => $validated['contact_name'],
                'company' => $validated['company_name'] ?? null,
                'email' => strtolower(trim($validated['email'])),
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

            $this->recordPublicActivity($request, 'public.quote.created', $serviceRequest, [
                'protocol' => $protocol,
                'email' => $serviceRequest->email,
            ]);

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
            'telefone' => ['nullable', 'string', 'max:40'],
            'empresa' => ['nullable', 'string', 'max:255'],
            'site' => ['nullable', 'string', 'max:255'],
            'origem' => ['nullable', 'string', 'max:100'],
            'campanha' => ['nullable', 'string', 'max:120'],
            'pagina' => ['nullable', 'string', 'max:500'],
            'mensagem' => ['nullable', 'string', 'max:4000'],
            'arquivo' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip'],
        ]);

        $protocol = 'GNDJ-'.date('Ymd').'-'.strtoupper(Str::random(4));
        $origem = trim((string) ($validated['origem'] ?? 'site')) ?: 'site';
        $campanha = trim((string) ($validated['campanha'] ?? ''));
        $leadName = trim((string) ($validated['nome'] ?? '')) ?: 'Lead do Site';
        $leadEmail = strtolower(trim($validated['email']));
        $service = $this->resolveServiceForText($origem.' '.$campanha.' '.($validated['mensagem'] ?? ''));

        $conversation = null;

        DB::transaction(function () use ($validated, $protocol, $origem, $campanha, $leadName, $leadEmail, $service, $request, &$conversation): void {
            $client = $this->resolveLeadClient(
                $leadEmail,
                $leadName,
                $validated['telefone'] ?? null,
                $validated['empresa'] ?? null
            );

            $detailsParts = [];
            if (! empty($validated['site'])) {
                $detailsParts[] = 'Site: '.$validated['site'];
            }
            if ($campanha !== '') {
                $detailsParts[] = 'Campanha: '.$campanha;
            }
            if (! empty($validated['mensagem'])) {
                $detailsParts[] = $validated['mensagem'];
            }
            if (! empty($validated['pagina'])) {
                $detailsParts[] = 'Página: '.$validated['pagina'];
            }

            $description = trim(implode(' | ', $detailsParts));
            if ($description === '') {
                $description = 'Solicitação de diagnóstico recebida pelo site GundjaTech.';
            }

            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $client->id,
                'user_id' => Auth::id(),
                'service_id' => $service?->id,
                'name' => $leadName,
                'company' => $validated['empresa'] ?? null,
                'email' => $leadEmail,
                'phone' => $validated['telefone'] ?? null,
                'service_title' => 'Solicitação Digital ('.$origem.')',
                'description' => $description,
                'status' => 'new',
            ]);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => null,
                'new_status' => 'new',
                'comment' => "Lead recebido automaticamente via formulário ({$origem}).",
                'user_id' => Auth::id(),
            ]);

            if ($request->hasFile('arquivo')) {
                $file = $request->file('arquivo');
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

            if (str_starts_with(strtolower($origem), 'chat')) {
                $conversation = Conversation::create([
                    'client_id' => $client->id,
                    'subject' => 'Chat do Site • '.$leadName,
                    'channel' => 'website_chat',
                    'visitor_token' => Str::random(48),
                    'visitor_name' => $leadName,
                    'visitor_email' => $leadEmail,
                    'visitor_phone' => $validated['telefone'] ?? null,
                    'status' => 'waiting_staff',
                ]);

                ConversationMessage::create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => Auth::id(),
                    'sender_type' => 'client',
                    'sender_name' => $leadName,
                    'message' => $description,
                    'is_read' => false,
                ]);
            }

            $this->recordPublicActivity($request, 'public.lead.created', $serviceRequest, [
                'protocol' => $protocol,
                'origem' => $origem,
                'email' => $leadEmail,
            ]);
        });

        return response()->json([
            'ok' => true,
            'protocol' => $protocol,
            'track_url' => route('track.request', ['protocol' => $protocol]),
            'conversation_id' => $conversation?->id,
            'visitor_token' => $conversation?->visitor_token,
        ]);
    }

    public function apiWhatsapp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nome' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:40'],
            'empresa' => ['nullable', 'string', 'max:255'],
            'site' => ['nullable', 'string', 'max:255'],
            'qualificado' => ['nullable', 'boolean'],
            'lingua' => ['nullable', 'string', 'max:20'],
        ]);

        $protocol = null;

        DB::transaction(function () use ($validated, $request, &$protocol): void {
            if (! empty($validated['email'])) {
                $email = strtolower(trim($validated['email']));
                $alreadyLogged = ServiceRequest::where('email', $email)
                    ->where('created_at', '>=', now()->subMinutes(2))
                    ->exists();

                if (! $alreadyLogged) {
                    $name = trim((string) ($validated['nome'] ?? '')) ?: 'Contato WhatsApp';
                    $client = $this->resolveLeadClient(
                        $email,
                        $name,
                        $validated['telefone'] ?? null,
                        $validated['empresa'] ?? null
                    );
                    $service = $this->resolveServiceForText('whatsapp');
                    $protocol = 'WPP-'.date('Ymd').'-'.strtoupper(Str::random(4));

                    $serviceRequest = ServiceRequest::create([
                        'protocol' => $protocol,
                        'client_id' => $client->id,
                        'user_id' => Auth::id(),
                        'service_id' => $service?->id,
                        'name' => $name,
                        'company' => $validated['empresa'] ?? null,
                        'email' => $email,
                        'phone' => $validated['telefone'] ?? null,
                        'service_title' => 'Contato via WhatsApp do Site',
                        'description' => trim('Qualificação WhatsApp'.(! empty($validated['site']) ? ' | Site: '.$validated['site'] : '')),
                        'status' => 'new',
                    ]);

                    RequestStatusHistory::create([
                        'service_request_id' => $serviceRequest->id,
                        'old_status' => null,
                        'new_status' => 'new',
                        'comment' => 'Lead qualificado no modal de WhatsApp do site.',
                        'user_id' => Auth::id(),
                    ]);
                }
            }

            ActivityLog::create([
                'user_id' => Auth::id(),
                'action' => 'public.whatsapp.clicked',
                'details' => [
                    'nome' => $validated['nome'] ?? null,
                    'telefone' => $validated['telefone'] ?? null,
                    'qualificado' => (bool) ($validated['qualificado'] ?? false),
                    'lingua' => $validated['lingua'] ?? null,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => Str::limit((string) $request->userAgent(), 255),
            ]);
        });

        return response()->json([
            'ok' => true,
            'protocol' => $protocol,
        ]);
    }

    public function apiChatStart(Request $request, AutonomousCrmAgent $crmAgent): JsonResponse
    {
        if ($request->filled('sobrenome_hp')) {
            return response()->json(['ok' => true]);
        }

        $validated = $request->validate([
            'nome' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:40'],
            'assunto' => ['nullable', 'string', 'max:200'],
            'mensagem' => ['required', 'string', 'max:3000'],
            'tema' => ['nullable', 'string', 'max:60'],
            'visitor_token' => ['nullable', 'string', 'min:24', 'max:64'],
        ]);

        $leadName = trim($validated['nome']);
        $leadEmail = strtolower(trim($validated['email']));
        $tema = trim((string) ($validated['tema'] ?? 'geral'));
        $subject = trim((string) ($validated['assunto'] ?? '')) ?: ('Chat do Site • '.$leadName);
        $protocol = null;
        $aiEnabledDefault = $crmAgent->isGloballyEnabled();
        $initialVisitorMessage = null;

        /** @var Conversation $conversation */
        $conversation = DB::transaction(function () use ($validated, $leadName, $leadEmail, $tema, $subject, $request, $aiEnabledDefault, &$protocol, &$initialVisitorMessage): Conversation {
            $client = $this->resolveLeadClient(
                $leadEmail,
                $leadName,
                $validated['telefone'] ?? null,
                null
            );

            $serviceRequest = ServiceRequest::where('email', $leadEmail)
                ->where('created_at', '>=', now()->subMinutes(2))
                ->latest('id')
                ->first();

            if ($serviceRequest === null) {
                $protocol = 'CHAT-'.date('Ymd').'-'.strtoupper(Str::random(4));
                $service = $this->resolveServiceForText($tema.' '.$subject.' '.$validated['mensagem']);

                $serviceRequest = ServiceRequest::create([
                    'protocol' => $protocol,
                    'client_id' => $client->id,
                    'user_id' => Auth::id(),
                    'service_id' => $service?->id,
                    'name' => $leadName,
                    'email' => $leadEmail,
                    'phone' => $validated['telefone'] ?? null,
                    'service_title' => $subject,
                    'description' => trim($validated['mensagem']),
                    'status' => 'new',
                ]);

                RequestStatusHistory::create([
                    'service_request_id' => $serviceRequest->id,
                    'old_status' => null,
                    'new_status' => 'new',
                    'comment' => 'Conversa iniciada pelo chat online do site.',
                    'user_id' => Auth::id(),
                ]);
            } else {
                $protocol = $serviceRequest->protocol;
            }

            $conversation = null;
            if (! empty($validated['visitor_token'])) {
                $conversation = Conversation::where('visitor_token', $validated['visitor_token'])
                    ->where('status', '!=', 'closed')
                    ->first();
            }

            if ($conversation === null) {
                $conversation = Conversation::create([
                    'client_id' => $client->id,
                    'service_request_id' => $serviceRequest->id,
                    'subject' => $subject,
                    'channel' => 'website_chat',
                    'visitor_token' => Str::random(48),
                    'visitor_name' => $leadName,
                    'visitor_email' => $leadEmail,
                    'visitor_phone' => $validated['telefone'] ?? null,
                    'status' => 'waiting_staff',
                    'ai_enabled' => $aiEnabledDefault,
                    'crm_stage' => 'new',
                ]);
            } else {
                $conversation->update([
                    'service_request_id' => $conversation->service_request_id ?? $serviceRequest->id,
                    'visitor_name' => $leadName,
                    'visitor_email' => $leadEmail,
                    'visitor_phone' => $validated['telefone'] ?? $conversation->visitor_phone,
                    'status' => 'waiting_staff',
                    'closed_at' => null,
                    'updated_at' => now(),
                ]);
            }

            $initialVisitorMessage = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'client',
                'sender_name' => $leadName,
                'is_ai' => false,
                'message' => trim($validated['mensagem']),
                'is_read' => false,
            ]);

            $conversation->setRelation('client', $client);
            $conversation->setRelation('serviceRequest', $serviceRequest);
            $conversation->setRelation('messages', collect([$initialVisitorMessage]));

            $this->recordPublicActivity($request, 'public.chat.started', $conversation, [
                'email' => $leadEmail,
                'protocol' => $protocol,
                'tema' => $tema,
            ]);

            return $conversation;
        });

        $aiReply = $crmAgent->handleIncomingVisitorMessage($conversation, trim($validated['mensagem']));

        $formattedMessages = [];
        if ($initialVisitorMessage instanceof ConversationMessage) {
            $formattedMessages[] = $this->formatChatMessage($initialVisitorMessage);
        }
        if ($aiReply instanceof ConversationMessage) {
            $formattedMessages[] = $this->formatChatMessage($aiReply);
        }

        return response()->json([
            'ok' => true,
            'conversation_id' => $conversation->id,
            'visitor_token' => $conversation->visitor_token,
            'protocol' => $protocol,
            'track_url' => $protocol ? route('track.request', ['protocol' => $protocol]) : null,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
            'ai_enabled' => (bool) $conversation->ai_enabled,
            'crm_stage' => $conversation->crm_stage,
            'lead_score' => (int) $conversation->lead_score,
            'ai_reply' => $aiReply ? $this->formatChatMessage($aiReply) : null,
            'messages' => $formattedMessages,
        ], 201);
    }

    public function apiChatMessage(Request $request, AutonomousCrmAgent $crmAgent): JsonResponse
    {
        $validated = $request->validate([
            'visitor_token' => ['required', 'string', 'min:24', 'max:64'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $conversation = Conversation::where('visitor_token', $validated['visitor_token'])->first();
        if ($conversation === null) {
            return response()->json([
                'ok' => false,
                'message' => 'Sessão de atendimento não localizada.',
            ], 404);
        }

        $senderName = $conversation->visitor_name ?: 'Visitante';
        $cleanMessage = trim($validated['message']);

        /** @var ConversationMessage $msg */
        $msg = DB::transaction(function () use ($conversation, $cleanMessage, $senderName): ConversationMessage {
            $msg = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'client',
                'sender_name' => $senderName,
                'is_ai' => false,
                'message' => $cleanMessage,
                'is_read' => false,
            ]);

            $conversation->update([
                'status' => 'waiting_staff',
                'closed_at' => null,
                'updated_at' => now(),
            ]);

            return $msg;
        });

        $aiReply = $crmAgent->handleIncomingVisitorMessage($conversation, $cleanMessage);

        return response()->json([
            'ok' => true,
            'message' => $this->formatChatMessage($msg),
            'ai_reply' => $aiReply ? $this->formatChatMessage($aiReply) : null,
            'ai_enabled' => (bool) $conversation->ai_enabled,
            'crm_stage' => $conversation->crm_stage,
            'lead_score' => (int) $conversation->lead_score,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
        ]);
    }

    public function apiChatMessages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'min:24', 'max:64'],
            'after_id' => ['nullable', 'integer', 'min:0'],
        ]);

        $conversation = Conversation::where('visitor_token', $validated['token'])->first();
        if ($conversation === null) {
            return response()->json([
                'ok' => false,
                'message' => 'Sessão de atendimento não localizada.',
            ], 404);
        }

        $conversation->messages()
            ->where('sender_type', 'staff')
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $query = $conversation->messages()->with('sender');
        if (! empty($validated['after_id'])) {
            $query->where('id', '>', (int) $validated['after_id']);
        }

        $messages = $query->get()
            ->map(fn (ConversationMessage $msg): array => $this->formatChatMessage($msg))
            ->values()
            ->all();

        return response()->json([
            'ok' => true,
            'conversation_id' => $conversation->id,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
            'messages' => $messages,
        ]);
    }

    private function resolveLeadClient(string $email, string $name, ?string $phone, ?string $company): Client
    {
        if (Auth::check() && Auth::user()->client !== null) {
            return Auth::user()->client;
        }

        $normalizedEmail = strtolower(trim($email));
        $client = Client::whereRaw('LOWER(email) = ?', [$normalizedEmail])->first();

        if ($client !== null) {
            $updates = [];
            if (empty($client->phone) && ! empty($phone)) {
                $updates['phone'] = $phone;
            }
            if ((empty($client->company_name) || $client->company_name === $client->name) && ! empty($company)) {
                $updates['company_name'] = $company;
            }
            if ($updates !== []) {
                $client->update($updates);
            }

            return $client;
        }

        return Client::create([
            'name' => $name,
            'company_name' => $company ?: $name,
            'email' => $normalizedEmail,
            'phone' => $phone,
            'status' => 'lead',
        ]);
    }

    private function resolveServiceForText(string $text): ?Service
    {
        $haystack = Str::lower($text);

        if (Str::contains($haystack, ['seguranca', 'segurança', 'ciber', 'dominio', 'domínio', 'dns', 'invadido', 'ssl'])) {
            $match = Service::where('is_active', true)
                ->whereHas('category', fn ($q) => $q->where('slug', 'gerenciamento-de-dominios'))
                ->first();
            if ($match !== null) {
                return $match;
            }
        }

        if (Str::contains($haystack, ['trafego', 'tráfego', 'ads', 'operacao', 'operação', 'google ads', 'meta ads'])) {
            $match = Service::where('is_active', true)
                ->whereHas('category', fn ($q) => $q->where('slug', 'gestao-de-trafego-pago'))
                ->first();
            if ($match !== null) {
                return $match;
            }
        }

        if (Str::contains($haystack, ['ecommerce', 'e-commerce', 'loja virtual', 'loja'])) {
            $match = Service::where('is_active', true)->where('slug', 'loja-virtual-alta-conversao')->first();
            if ($match !== null) {
                return $match;
            }
        }

        if (Str::contains($haystack, ['landing'])) {
            $match = Service::where('is_active', true)->where('slug', 'landing-page-alta-performance')->first();
            if ($match !== null) {
                return $match;
            }
        }

        return Service::where('is_active', true)->orderBy('id')->first();
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function recordPublicActivity(Request $request, string $action, object $subject, array $details = []): void
    {
        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'subject_type' => $subject::class,
            'subject_id' => $subject->id ?? null,
            'details' => $details,
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatChatMessage(ConversationMessage $msg): array
    {
        return [
            'id' => $msg->id,
            'sender_type' => $msg->sender_type,
            'sender_name' => $msg->sender?->name ?? $msg->sender_name ?? ($msg->sender_type === 'staff' ? 'Equipe GundjaTech' : 'Visitante'),
            'is_ai' => (bool) $msg->is_ai,
            'message' => $msg->message,
            'created_at' => $msg->created_at?->format('d/m H:i') ?? '',
        ];
    }
}
