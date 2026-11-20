<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AdvertisingCampaign;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\DnsRecord;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\Quotation;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPanelCompleteTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        $this->superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
    }

    public function test_all_twelve_admin_modules_render_for_superadmin(): void
    {
        $this->actingAs($this->superAdmin);

        $routes = [
            '/admin',
            '/admin/clientes',
            '/admin/clientes/novo',
            '/admin/solicitacoes',
            '/admin/orcamentos',
            '/admin/orcamentos/novo',
            '/admin/projetos',
            '/admin/projetos/novo',
            '/admin/servicos',
            '/admin/servicos/novo',
            '/admin/dominios',
            '/admin/campanhas',
            '/admin/financeiro',
            '/admin/atendimento',
            '/admin/usuarios',
            '/admin/permissoes',
        ];

        foreach ($routes as $uri) {
            $this->get($uri)->assertStatus(200);
        }
    }

    public function test_admin_clients_full_crud_with_portal_account(): void
    {
        $this->actingAs($this->superAdmin);

        $storeResp = $this->post('/admin/clientes', [
            'company_name' => 'Kwanza Digital Lda',
            'contact_name' => 'Domingos Neto',
            'email' => 'domingos@kwanzadigital.ao',
            'phone' => '+244 923 456 789',
            'document' => '5417012345',
            'city' => 'Luanda',
            'state' => 'LA',
            'status' => 'active',
            'create_user_account' => '1',
            'password' => 'secret123',
        ]);

        $storeResp->assertSessionHasNoErrors()->assertRedirect();

        $client = Client::where('email', 'domingos@kwanzadigital.ao')->firstOrFail();
        $this->assertNotNull($client->user_id);

        $this->get("/admin/clientes/{$client->id}")->assertStatus(200)->assertSee('Kwanza Digital Lda');
        $this->get("/admin/clientes/{$client->id}/editar")->assertStatus(200);

        $this->put("/admin/clientes/{$client->id}", [
            'company_name' => 'Kwanza Digital Group',
            'contact_name' => 'Domingos Neto',
            'email' => 'domingos@kwanzadigital.ao',
            'status' => 'lead',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'company_name' => 'Kwanza Digital Group',
            'status' => 'lead',
        ]);

        $this->delete("/admin/clientes/{$client->id}")->assertRedirect(route('admin.clients.index'));
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_admin_requests_and_quotations_convert_to_project(): void
    {
        $this->actingAs($this->superAdmin);

        $client = Client::firstOrFail();
        $service = Service::firstOrFail();

        // Create a quotation directly
        $quoteResp = $this->post('/admin/orcamentos', [
            'client_id' => $client->id,
            'title' => 'Proposta Plataforma Corporativa',
            'valid_until' => now()->addDays(20)->toDateString(),
            'discount' => 500.00,
            'status' => 'sent',
            'notes' => 'Pagamento em duas parcelas.',
            'items' => [
                [
                    'service_id' => $service->id,
                    'description' => 'Desenvolvimento Full-Stack',
                    'quantity' => 1,
                    'unit_price' => 8000.00,
                ],
                [
                    'description' => 'Setup Cloud & Monitoramento',
                    'quantity' => 2,
                    'unit_price' => 750.00,
                ],
            ],
        ]);

        $quoteResp->assertSessionHasNoErrors()->assertRedirect();

        $quotation = Quotation::where('title', 'Proposta Plataforma Corporativa')->firstOrFail();
        $this->assertEquals(9500.00, (float) $quotation->subtotal);
        $this->assertEquals(500.00, (float) $quotation->discount);
        $this->assertEquals(9000.00, (float) $quotation->total);
        $this->assertEquals(2, $quotation->items()->count());

        $this->get("/admin/orcamentos/{$quotation->id}")->assertStatus(200)->assertSee($quotation->quotation_number);

        // Approve quotation status
        $this->post("/admin/orcamentos/{$quotation->id}/status", [
            'status' => 'approved',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertNotNull($quotation->fresh()->approved_at);

        // Convert quotation to project
        $convertResp = $this->post("/admin/orcamentos/{$quotation->id}/converter");
        $convertResp->assertSessionHasNoErrors()->assertRedirect();

        $project = Project::where('quotation_id', $quotation->id)->firstOrFail();
        $this->assertEquals(5, $project->stages()->count());
        $this->assertEquals(9000.00, (float) $project->budget);

        // Also test converting a lead service request (without client_id) into quotation and project
        $leadRequest = ServiceRequest::factory()->create([
            'client_id' => null,
            'email' => 'novo.lead@empresa.ao',
            'name' => 'Joana Lead',
            'company' => 'Lead Corp',
            'service_id' => $service->id,
            'service_title' => 'Portal Institucional Lead',
            'status' => 'new',
        ]);

        $this->post("/admin/solicitacoes/{$leadRequest->id}/orcamento", [
            'title' => 'Orçamento Lead Corp',
            'valid_until' => now()->addDays(10)->toDateString(),
            'discount' => 100,
            'items' => [
                ['description' => 'Site Institucional', 'quantity' => 1, 'unit_price' => 4100],
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $leadRequest->refresh();
        $this->assertNotNull($leadRequest->client_id);
        $this->assertEquals('quotation_sent', $leadRequest->status);

        $this->post("/admin/solicitacoes/{$leadRequest->id}/converter")
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'service_request_id' => $leadRequest->id,
            'client_id' => $leadRequest->client_id,
        ]);
    }

    public function test_admin_projects_stages_members_and_attachments(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $this->actingAs($this->superAdmin);

        $client = Client::firstOrFail();
        $dev = User::where('role', UserRole::Developer->value)->firstOrFail();

        $this->post('/admin/projetos', [
            'client_id' => $client->id,
            'manager_id' => $this->superAdmin->id,
            'name' => 'Sistema ERP GundjaTech',
            'deadline' => now()->addDays(45)->toDateString(),
            'budget' => 18000,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $project = Project::where('name', 'Sistema ERP GundjaTech')->firstOrFail();
        $this->get("/admin/projetos/{$project->id}")->assertStatus(200)->assertSee('Sistema ERP GundjaTech');

        // Add custom stage and update stage status
        $this->post("/admin/projetos/{$project->id}/etapas", [
            'title' => '6. Treinamento Final',
            'description' => 'Workshop com usuários chave.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $stage = $project->stages()->firstOrFail();
        $this->post("/admin/projetos/etapas/{$stage->id}", [
            'status' => 'completed',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertGreaterThan(0, $project->fresh()->progress_percentage);

        // Update progress & reviewing status
        $this->post("/admin/projetos/{$project->id}/progresso", [
            'progress_percentage' => 85,
            'status' => 'reviewing',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'progress_percentage' => 85,
            'status' => 'reviewing',
        ]);

        // Add & remove member
        $this->post("/admin/projetos/{$project->id}/membros", [
            'user_id' => $dev->id,
            'role_in_project' => 'Backend Engineer',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $member = ProjectMember::where('project_id', $project->id)->where('user_id', $dev->id)->firstOrFail();
        $this->delete("/admin/projetos/membros/{$member->id}")->assertRedirect();
        $this->assertDatabaseMissing('project_members', ['id' => $member->id]);

        // Upload attachment
        $file = UploadedFile::fake()->create('arquitetura.pdf', 120, 'application/pdf');
        $this->post("/admin/projetos/{$project->id}/anexos", [
            'title' => 'Documento de Arquitetura',
            'file' => $file,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertEquals(1, $project->attachments()->count());
    }

    public function test_admin_services_domains_campaigns_finance_and_chat_workflows(): void
    {
        $this->actingAs($this->superAdmin);

        $client = Client::firstOrFail();
        $category = ServiceCategory::firstOrFail();

        // 1. Services & Category
        $this->post('/admin/servicos/categorias', [
            'name' => 'Automação & IA',
            'description' => 'Agentes inteligentes e automações.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->post('/admin/servicos', [
            'category_id' => $category->id,
            'name' => 'Auditoria de Segurança Web',
            'short_description' => 'Pentest e blindagem completa.',
            'full_description' => 'Análise detalhada de vulnerabilidades OWASP.',
            'base_price' => 3500,
            'billing_type' => 'one_time',
            'estimated_days' => 5,
            'is_active' => '1',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $service = Service::where('name', 'Auditoria de Segurança Web')->firstOrFail();
        $this->put("/admin/servicos/{$service->id}", [
            'category_id' => $category->id,
            'name' => 'Auditoria OWASP Pro',
            'full_description' => 'Revisão completa de segurança.',
            'base_price' => 4200,
            'billing_type' => 'yearly',
            'estimated_days' => 7,
            'is_active' => '1',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('services', ['id' => $service->id, 'name' => 'Auditoria OWASP Pro', 'billing_type' => 'yearly']);

        // 2. Domains, DNS & Renewal + Finance
        $this->post('/admin/dominios', [
            'client_id' => $client->id,
            'domain_name' => 'gundjatech-test.co.ao',
            'registrar' => 'Cloudflare',
            'registration_date' => now()->toDateString(),
            'expiration_date' => now()->addYear()->toDateString(),
            'renewal_price' => 149.90,
            'auto_renew' => '1',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $domain = Domain::where('domain_name', 'gundjatech-test.co.ao')->firstOrFail();
        $this->get("/admin/dominios/{$domain->id}")->assertStatus(200)->assertSee('gundjatech-test.co.ao');

        $this->post("/admin/dominios/{$domain->id}/dns", [
            'type' => 'TXT',
            'host' => '@',
            'value' => 'v=spf1 include:_spf.gundjatech.com ~all',
            'ttl' => 3600,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $dnsRecord = DnsRecord::where('domain_id', $domain->id)->where('type', 'TXT')->firstOrFail();
        $this->delete("/admin/dominios/dns/{$dnsRecord->id}")->assertRedirect();
        $this->assertDatabaseMissing('dns_records', ['id' => $dnsRecord->id]);

        $this->post("/admin/dominios/{$domain->id}/renovar", [
            'years' => 1,
            'amount' => 149.90,
            'register_finance' => '1',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('domain_renewals', ['domain_id' => $domain->id, 'amount' => 149.90]);
        $this->assertDatabaseHas('financial_transactions', ['category' => 'Renovação de Domínio', 'status' => 'paid']);

        // 3. Campaigns & Metrics
        $this->post('/admin/campanhas', [
            'client_id' => $client->id,
            'name' => 'Campanha Expansão Angola',
            'platform' => 'google_ads',
            'budget' => 6000,
            'start_date' => now()->toDateString(),
        ])->assertSessionHasNoErrors()->assertRedirect();

        $campaign = AdvertisingCampaign::where('name', 'Campanha Expansão Angola')->firstOrFail();
        $this->get("/admin/campanhas/{$campaign->id}")->assertStatus(200);

        $this->post("/admin/campanhas/{$campaign->id}/metricas", [
            'date' => now()->toDateString(),
            'impressions' => 5000,
            'clicks' => 250,
            'conversions' => 25,
            'spend' => 500.00,
            'conversion_value' => 2500.00,
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('campaign_metrics', [
            'campaign_id' => $campaign->id,
            'cpc' => 2.00,
            'cpa' => 20.00,
            'roas' => 5.00,
        ]);
        $this->assertEquals(500.00, (float) $campaign->fresh()->spent);

        $this->put("/admin/campanhas/{$campaign->id}/status", ['status' => 'paused'])
            ->assertSessionHasNoErrors()
            ->assertRedirect();
        $this->assertEquals('paused', $campaign->fresh()->status);

        // 4. Finance: Create pending, mark as paid (creates Payment), delete
        $this->post('/admin/financeiro/transacoes', [
            'client_id' => $client->id,
            'type' => 'income',
            'category' => 'Consultoria',
            'title' => 'Fatura Consultoria Cloud',
            'amount' => 2400.00,
            'due_date' => now()->addDays(5)->toDateString(),
            'payment_method' => 'PIX',
            'status' => 'pending',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $tx = FinancialTransaction::where('title', 'Fatura Consultoria Cloud')->firstOrFail();
        $this->post("/admin/financeiro/transacoes/{$tx->id}/pagar")
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertEquals('paid', $tx->fresh()->status);
        $this->assertDatabaseHas('payments', ['financial_transaction_id' => $tx->id, 'status' => 'approved']);

        $this->delete("/admin/financeiro/transacoes/{$tx->id}")->assertRedirect();
        $this->assertDatabaseMissing('financial_transactions', ['id' => $tx->id]);

        // 5. Chat / Support
        $this->post('/admin/atendimento/iniciar', [
            'client_id' => $client->id,
            'subject' => 'Alinhamento de Sprint',
            'message' => 'Olá! Sua entrega já está em ambiente de homologação.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $conversation = Conversation::where('subject', 'Alinhamento de Sprint')->firstOrFail();
        $this->post("/admin/atendimento/{$conversation->id}/mensagem", [
            'message' => 'Aguardamos sua validação para o Go-Live.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('conversation_messages', [
            'conversation_id' => $conversation->id,
            'sender_type' => 'staff',
            'message' => 'Aguardamos sua validação para o Go-Live.',
        ]);

        $this->post("/admin/atendimento/{$conversation->id}/fechar")->assertRedirect();
        $this->assertEquals('closed', $conversation->fresh()->status);
        $this->assertNotNull($conversation->fresh()->closed_at);

        $this->post("/admin/atendimento/{$conversation->id}/reabrir")->assertRedirect();
        $this->assertEquals('open', $conversation->fresh()->status);
    }

    public function test_rbac_route_enforcement_and_dynamic_permissions_matrix(): void
    {
        $financial = User::where('role', UserRole::Financial->value)->firstOrFail();

        // Financial user can access Financeiro & Orçamentos, but is blocked (403) on Permissões, Usuários & Projetos
        $this->actingAs($financial);
        $this->get('/admin')->assertStatus(200);
        $this->get('/admin/financeiro')->assertStatus(200);
        $this->get('/admin/orcamentos')->assertStatus(200);
        $this->get('/admin/permissoes')->assertStatus(403);
        $this->get('/admin/usuarios')->assertStatus(403);
        $this->get('/admin/projetos')->assertStatus(403);

        // SuperAdmin updates RBAC matrix to grant projects.view to financial
        $this->actingAs($this->superAdmin);
        $dashboardPermId = Permission::where('slug', 'admin.dashboard.view')->value('id');
        $projectsViewId = Permission::where('slug', 'projects.view')->value('id');
        $financeViewId = Permission::where('slug', 'finance.view')->value('id');

        $this->put('/admin/permissoes', [
            'permissions' => [
                UserRole::Financial->value => [$dashboardPermId, $projectsViewId, $financeViewId],
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        // Now Financial user CAN view /admin/projetos, but still CANNOT create projects (projects.manage)
        $freshFinancial = $financial->fresh();
        $this->actingAs($freshFinancial);
        $this->get('/admin/projetos')->assertStatus(200);
        $this->get('/admin/projetos/novo')->assertStatus(403);

        // SuperAdmin resets default permissions
        $this->actingAs($this->superAdmin);
        $this->post('/admin/permissoes/padrao')->assertRedirect();

        $this->actingAs($financial->fresh());
        $this->get('/admin/projetos')->assertStatus(403);
        $this->get('/admin/financeiro')->assertStatus(200);
    }
}
