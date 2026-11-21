<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Admin\AdminAutonomousCrmController;
use App\Http\Controllers\Admin\AdminCampaignController;
use App\Http\Controllers\Admin\AdminChatController;
use App\Http\Controllers\Admin\AdminClientController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDomainController;
use App\Http\Controllers\Admin\AdminFinanceController;
use App\Http\Controllers\Admin\AdminPermissionController;
use App\Http\Controllers\Admin\AdminProjectController;
use App\Http\Controllers\Admin\AdminQuotationController;
use App\Http\Controllers\Admin\AdminRequestController;
use App\Http\Controllers\Admin\AdminServiceController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Portal\PortalCampaignController;
use App\Http\Controllers\Portal\PortalChatController;
use App\Http\Controllers\Portal\PortalDashboardController;
use App\Http\Controllers\Portal\PortalDomainController;
use App\Http\Controllers\Portal\PortalFinanceController;
use App\Http\Controllers\Portal\PortalProjectController;
use App\Http\Controllers\Portal\PortalQuotationController;
use App\Http\Controllers\Portal\PortalRequestController;
use App\Http\Controllers\PublicController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes (Institutional & Commercial Website)
|--------------------------------------------------------------------------
*/
Route::get('/', [PublicController::class, 'index'])->name('home');
Route::get('/sobre', [PublicController::class, 'about'])->name('about');
Route::get('/servicos', [PublicController::class, 'services'])->name('services');
Route::get('/servicos/{slug}', [PublicController::class, 'serviceDetail'])->name('services.show');
Route::get('/portfolio', [PublicController::class, 'portfolio'])->name('portfolio');
Route::get('/blog', [PublicController::class, 'blog'])->name('blog');
Route::get('/blog/{slug}', [PublicController::class, 'blogPost'])->name('blog.show');
Route::get('/feed.xml', [PublicController::class, 'feed'])->name('feed');
Route::get('/sitemap.xml', [PublicController::class, 'sitemap'])->name('sitemap');
Route::get('/contato', [PublicController::class, 'contact'])->name('contact');
Route::post('/contato', [PublicController::class, 'sendContact'])->middleware('throttle:20,1')->name('contact.send');
Route::get('/solicitar-orcamento', [PublicController::class, 'requestQuote'])->name('request.quote');
Route::post('/solicitar-orcamento', [PublicController::class, 'storeRequest'])->middleware('throttle:20,1')->name('request.store');
Route::get('/acompanhar-solicitacao', [PublicController::class, 'trackRequest'])->middleware('throttle:30,1')->name('track.request');
Route::post('/api/lead', [PublicController::class, 'apiLead'])->middleware('throttle:20,1')->name('api.lead');
Route::post('/api/whatsapp', [PublicController::class, 'apiWhatsapp'])->middleware('throttle:30,1')->name('api.whatsapp');
Route::post('/api/chat/start', [PublicController::class, 'apiChatStart'])->middleware('throttle:20,1')->name('api.chat.start');
Route::post('/api/chat/message', [PublicController::class, 'apiChatMessage'])->middleware('throttle:30,1')->name('api.chat.message');
Route::get('/api/chat/messages', [PublicController::class, 'apiChatMessages'])->middleware('throttle:60,1')->name('api.chat.messages');
Route::get('/sobre-nos', [PublicController::class, 'about']);
Route::get('/cases', [PublicController::class, 'portfolio']);
Route::get('/cases/{slug}', [PublicController::class, 'caseDetail']);
Route::get('/portfolio/{slug}', [PublicController::class, 'caseDetail']);
Route::get('/criacao-de-sites', fn () => view('public.sinnapse.criacao-de-sites'));
Route::get('/desenvolvimento-de-sites', fn () => view('public.sinnapse.desenvolvimento-de-sites'));
Route::get('/criacao-de-sites-wordpress', fn () => view('public.sinnapse.criacao-de-sites-wordpress'));
Route::get('/criacao-de-sites-alphaville', fn () => view('public.sinnapse.criacao-de-sites-alphaville'));
Route::get('/ciberseguranca', fn () => view('public.sinnapse.ciberseguranca'));
Route::get('/operacao', fn () => view('public.sinnapse.operacao'));
Route::get('/quanto-custa-um-site', fn () => view('public.sinnapse.quanto-custa-um-site'));
Route::get('/politica-de-privacidade', fn () => view('public.sinnapse.politica-de-privacidade'));
Route::get('/autor-{slug}', [PublicController::class, 'authorDetail']);
Route::get('/pt-pt/{path?}', fn (?string $path = null) => redirect('/'.ltrim((string) $path, '/'), 301))->where('path', '.*');
Route::get('/en/{path?}', fn (?string $path = null) => redirect('/'.ltrim((string) $path, '/'), 301))->where('path', '.*');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::get('/cadastro', [AuthController::class, 'showRegister'])->name('register');
Route::post('/cadastro', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::redirect('/cadastrar', '/cadastro');
Route::redirect('/cliente', '/portal');
Route::get('/esqueci-minha-senha', [AuthController::class, 'showForgotPassword'])->name('password.request');
Route::post('/esqueci-minha-senha', [AuthController::class, 'sendResetLink'])->middleware('throttle:10,1')->name('password.email');
Route::get('/redefinir-senha/{token}', [AuthController::class, 'showResetPassword'])->name('password.reset');
Route::post('/redefinir-senha', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1')->name('password.update');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

/*
|--------------------------------------------------------------------------
| Self-Service Account & Security Routes (Authenticated Staff & Clients)
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->prefix('minha-conta')->name('account.')->group(function () {
    Route::get('/', [AccountController::class, 'edit'])->name('edit');
    Route::put('/perfil', [AccountController::class, 'updateProfile'])->name('profile.update');
    Route::put('/senha', [AccountController::class, 'updatePassword'])->middleware('throttle:10,1')->name('password.update');
});

/*
|--------------------------------------------------------------------------
| Admin Panel Routes (Staff Only)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])
        ->middleware('permission:admin.dashboard.view')
        ->name('dashboard');
    Route::get('/relatorio/exportar', [AdminDashboardController::class, 'exportReport'])
        ->middleware('permission:admin.dashboard.view')
        ->name('dashboard.export');

    // Clients
    Route::middleware('permission:clients.manage')->group(function () {
        Route::get('/clientes/novo', [AdminClientController::class, 'create'])->name('clients.create');
        Route::post('/clientes', [AdminClientController::class, 'store'])->name('clients.store');
        Route::get('/clientes/{client}/editar', [AdminClientController::class, 'edit'])->name('clients.edit');
        Route::put('/clientes/{client}', [AdminClientController::class, 'update'])->name('clients.update');
        Route::delete('/clientes/{client}', [AdminClientController::class, 'destroy'])->name('clients.destroy');
    });
    Route::middleware('permission:clients.view')->group(function () {
        Route::get('/clientes', [AdminClientController::class, 'index'])->name('clients.index');
        Route::get('/clientes/{client}', [AdminClientController::class, 'show'])->name('clients.show');
    });

    // Service Requests
    Route::middleware('permission:requests.view')->group(function () {
        Route::get('/solicitacoes', [AdminRequestController::class, 'index'])->name('requests.index');
        Route::get('/solicitacoes/{serviceRequest}', [AdminRequestController::class, 'show'])->name('requests.show');
        Route::get('/solicitacoes/{serviceRequest}/anexos/{attachment}', [AdminRequestController::class, 'downloadAttachment'])->name('requests.attachments.download');
    });
    Route::middleware('permission:requests.manage')->group(function () {
        Route::post('/solicitacoes/{serviceRequest}/status', [AdminRequestController::class, 'updateStatus'])->name('requests.update-status');
        Route::post('/solicitacoes/{serviceRequest}/cancelar', [AdminRequestController::class, 'cancel'])->name('requests.cancel');
        Route::post('/solicitacoes/{serviceRequest}/orcamento', [AdminRequestController::class, 'generateQuotation'])->name('requests.quotation');
        Route::post('/solicitacoes/{serviceRequest}/converter', [AdminRequestController::class, 'convertToProject'])->name('requests.convert');
        Route::delete('/solicitacoes/{serviceRequest}', [AdminRequestController::class, 'destroy'])->name('requests.destroy');
    });

    // Quotations
    Route::middleware('permission:quotations.manage')->group(function () {
        Route::get('/orcamentos/novo', [AdminQuotationController::class, 'create'])->name('quotations.create');
        Route::post('/orcamentos', [AdminQuotationController::class, 'store'])->name('quotations.store');
        Route::post('/orcamentos/{quotation}/status', [AdminQuotationController::class, 'updateStatus'])->name('quotations.status');
        Route::post('/orcamentos/{quotation}/converter', [AdminQuotationController::class, 'convertToProject'])->name('quotations.convert');
        Route::delete('/orcamentos/{quotation}', [AdminQuotationController::class, 'destroy'])->name('quotations.destroy');
    });
    Route::middleware('permission:quotations.view')->group(function () {
        Route::get('/orcamentos', [AdminQuotationController::class, 'index'])->name('quotations.index');
        Route::get('/orcamentos/{quotation}', [AdminQuotationController::class, 'show'])->name('quotations.show');
    });

    // Projects
    Route::middleware('permission:projects.manage')->group(function () {
        Route::get('/projetos/novo', [AdminProjectController::class, 'create'])->name('projects.create');
        Route::post('/projetos', [AdminProjectController::class, 'store'])->name('projects.store');
        Route::post('/projetos/{project}/progresso', [AdminProjectController::class, 'updateProgress'])->name('projects.progress');
        Route::post('/projetos/{project}/etapas', [AdminProjectController::class, 'addStage'])->name('projects.stages.store');
        Route::post('/projetos/etapas/{stage}', [AdminProjectController::class, 'updateStage'])->name('projects.stage');
        Route::post('/projetos/{project}/membros', [AdminProjectController::class, 'addMember'])->name('projects.members.store');
        Route::delete('/projetos/membros/{member}', [AdminProjectController::class, 'removeMember'])->name('projects.members.destroy');
        Route::post('/projetos/{project}/anexos', [AdminProjectController::class, 'uploadAttachment'])->name('projects.attachment');
        Route::delete('/projetos/{project}/anexos/{attachment}', [AdminProjectController::class, 'deleteAttachment'])->name('projects.attachments.destroy');
        Route::delete('/projetos/{project}', [AdminProjectController::class, 'destroy'])->name('projects.destroy');
    });
    Route::middleware('permission:projects.view')->group(function () {
        Route::get('/projetos', [AdminProjectController::class, 'index'])->name('projects.index');
        Route::get('/projetos/{project}', [AdminProjectController::class, 'show'])->name('projects.show');
        Route::get('/projetos/{project}/anexos/{attachment}', [AdminProjectController::class, 'downloadAttachment'])->name('projects.attachments.download');
    });

    // Services
    Route::middleware('permission:services.manage')->group(function () {
        Route::get('/servicos/novo', [AdminServiceController::class, 'create'])->name('services.create');
        Route::post('/servicos', [AdminServiceController::class, 'store'])->name('services.store');
        Route::post('/servicos/categorias', [AdminServiceController::class, 'storeCategory'])->name('services.categories.store');
        Route::get('/servicos/{service}/editar', [AdminServiceController::class, 'edit'])->name('services.edit');
        Route::put('/servicos/{service}', [AdminServiceController::class, 'update'])->name('services.update');
        Route::delete('/servicos/{service}', [AdminServiceController::class, 'destroy'])->name('services.destroy');
    });
    Route::middleware('permission:services.view')->group(function () {
        Route::get('/servicos', [AdminServiceController::class, 'index'])->name('services.index');
    });

    // Domains
    Route::middleware('permission:domains.manage')->group(function () {
        Route::post('/dominios', [AdminDomainController::class, 'store'])->name('domains.store');
        Route::post('/dominios/{domain}/dns', [AdminDomainController::class, 'addDnsRecord'])->name('domains.dns');
        Route::delete('/dominios/dns/{dnsRecord}', [AdminDomainController::class, 'deleteDnsRecord'])->name('domains.dns.destroy');
        Route::post('/dominios/{domain}/renovar', [AdminDomainController::class, 'renewDomain'])->name('domains.renew');
        Route::delete('/dominios/{domain}', [AdminDomainController::class, 'destroy'])->name('domains.destroy');
    });
    Route::middleware('permission:domains.view')->group(function () {
        Route::get('/dominios', [AdminDomainController::class, 'index'])->name('domains.index');
        Route::get('/dominios/{domain}', [AdminDomainController::class, 'show'])->name('domains.show');
    });

    // Advertising Campaigns
    Route::middleware('permission:campaigns.manage')->group(function () {
        Route::post('/campanhas', [AdminCampaignController::class, 'store'])->name('campaigns.store');
        Route::put('/campanhas/{campaign}/status', [AdminCampaignController::class, 'updateStatus'])->name('campaigns.status');
        Route::post('/campanhas/{campaign}/metricas', [AdminCampaignController::class, 'addMetrics'])->name('campaigns.metrics');
        Route::delete('/campanhas/{campaign}', [AdminCampaignController::class, 'destroy'])->name('campaigns.destroy');
    });
    Route::middleware('permission:campaigns.view')->group(function () {
        Route::get('/campanhas', [AdminCampaignController::class, 'index'])->name('campaigns.index');
        Route::get('/campanhas/{campaign}', [AdminCampaignController::class, 'show'])->name('campaigns.show');
    });

    // Finance
    Route::middleware('permission:finance.view')->group(function () {
        Route::get('/financeiro', [AdminFinanceController::class, 'index'])->name('finance.index');
    });
    Route::middleware('permission:finance.manage')->group(function () {
        Route::post('/financeiro/transacoes', [AdminFinanceController::class, 'store'])->name('finance.store');
        Route::post('/financeiro/transacoes/{transaction}/pagar', [AdminFinanceController::class, 'markAsPaid'])->name('finance.pay');
        Route::delete('/financeiro/transacoes/{transaction}', [AdminFinanceController::class, 'destroy'])->name('finance.destroy');
    });

    // Chat / Support & Autonomous CRM
    Route::middleware('permission:chat.view')->group(function () {
        Route::get('/atendimento', [AdminChatController::class, 'index'])->name('chat.index');
        Route::get('/atendimento/resumo', [AdminChatController::class, 'summary'])->name('chat.summary');
        Route::get('/atendimento/{conversation}/mensagens', [AdminChatController::class, 'messages'])->name('chat.messages');
        Route::get('/crm-autonomo', [AdminAutonomousCrmController::class, 'index'])->name('crm.index');
    });
    Route::middleware('permission:chat.manage')->group(function () {
        Route::post('/atendimento/iniciar', [AdminChatController::class, 'startConversation'])->name('chat.start');
        Route::post('/atendimento/{conversation}/mensagem', [AdminChatController::class, 'sendMessage'])->name('chat.send');
        Route::post('/atendimento/{conversation}/toggle-ai', [AdminChatController::class, 'toggleAi'])->name('chat.toggle-ai');
        Route::post('/atendimento/{conversation}/fechar', [AdminChatController::class, 'closeConversation'])->name('chat.close');
        Route::post('/atendimento/{conversation}/reabrir', [AdminChatController::class, 'reopenConversation'])->name('chat.reopen');
        Route::delete('/atendimento/{conversation}', [AdminChatController::class, 'destroy'])->name('chat.destroy');
    });
    Route::middleware('permission:settings.manage')->group(function () {
        Route::put('/crm-autonomo/configuracoes', [AdminAutonomousCrmController::class, 'updateSettings'])->name('crm.settings');
        Route::post('/crm-autonomo/testar', [AdminAutonomousCrmController::class, 'testConnection'])->name('crm.test');
    });

    // Users & Roles
    Route::middleware('permission:users.view')->group(function () {
        Route::get('/usuarios', [AdminUserController::class, 'index'])->name('users.index');
    });
    Route::middleware('permission:users.manage')->group(function () {
        Route::post('/usuarios', [AdminUserController::class, 'store'])->name('users.store');
        Route::put('/usuarios/{user}', [AdminUserController::class, 'update'])->name('users.update');
        Route::delete('/usuarios/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
    });

    // RBAC Permissions Control
    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('/permissoes', [AdminPermissionController::class, 'index'])->name('permissions.index');
        Route::put('/permissoes', [AdminPermissionController::class, 'update'])->name('permissions.update');
        Route::post('/permissoes/padrao', [AdminPermissionController::class, 'resetDefaults'])->name('permissions.reset');
    });
});

/*
|--------------------------------------------------------------------------
| Client Portal Routes
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'client'])->prefix('portal')->name('portal.')->group(function () {
    Route::get('/', [PortalDashboardController::class, 'index'])->name('dashboard');

    // Requests
    Route::middleware('permission:portal.requests.manage')->group(function () {
        Route::get('/solicitacoes', [PortalRequestController::class, 'index'])->name('requests.index');
        Route::get('/solicitacoes/nova', [PortalRequestController::class, 'create'])->name('requests.create');
        Route::post('/solicitacoes', [PortalRequestController::class, 'store'])->name('requests.store');
        Route::get('/solicitacoes/{serviceRequest}', [PortalRequestController::class, 'show'])->name('requests.show');
        Route::get('/solicitacoes/{serviceRequest}/anexos/{attachment}', [PortalRequestController::class, 'downloadAttachment'])->name('requests.attachments.download');
    });

    // Projects
    Route::middleware('permission:portal.projects.view')->group(function () {
        Route::get('/projetos', [PortalProjectController::class, 'index'])->name('projects.index');
        Route::get('/projetos/{project}', [PortalProjectController::class, 'show'])->name('projects.show');
        Route::get('/projetos/{project}/anexos/{attachment}', [PortalProjectController::class, 'downloadAttachment'])->name('projects.attachments.download');
    });

    // Quotations
    Route::middleware('permission:portal.quotations.approve')->group(function () {
        Route::get('/orcamentos', [PortalQuotationController::class, 'index'])->name('quotations.index');
        Route::get('/orcamentos/{quotation}', [PortalQuotationController::class, 'show'])->name('quotations.show');
        Route::post('/orcamentos/{quotation}/aprovar', [PortalQuotationController::class, 'approve'])->name('quotations.approve');
        Route::post('/orcamentos/{quotation}/recusar', [PortalQuotationController::class, 'reject'])->name('quotations.reject');
    });

    // Domains
    Route::middleware('permission:portal.domains.view')->group(function () {
        Route::get('/dominios', [PortalDomainController::class, 'index'])->name('domains.index');
        Route::post('/dominios/{domain}/renovacao', [PortalDomainController::class, 'requestRenewal'])->middleware('throttle:15,1')->name('domains.renew');
    });

    // Campaigns
    Route::middleware('permission:portal.campaigns.view')->group(function () {
        Route::get('/campanhas', [PortalCampaignController::class, 'index'])->name('campaigns.index');
    });

    // Finance
    Route::middleware('permission:portal.finance.view')->group(function () {
        Route::get('/financeiro', [PortalFinanceController::class, 'index'])->name('finance.index');
    });

    // Chat
    Route::middleware('permission:portal.chat.manage')->group(function () {
        Route::get('/atendimento', [PortalChatController::class, 'index'])->name('chat.index');
        Route::get('/atendimento/{conversation}/mensagens', [PortalChatController::class, 'messages'])->name('chat.messages');
        Route::post('/atendimento/{conversation}/mensagem', [PortalChatController::class, 'sendMessage'])->name('chat.send');
    });
});

Route::get('/{slug}', [PublicController::class, 'blogPost'])
    ->where('slug', '[a-z0-9]+(?:-[a-z0-9]+)+');
