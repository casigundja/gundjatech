<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectAttachment;
use App\Models\ProjectStage;
use App\Models\Quotation;
use App\Models\RequestAttachment;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FullPlatformAuditVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_non_superadmin_cannot_modify_or_take_over_superadmin_account(): void
    {
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $originalPasswordHash = $superAdmin->password;
        $originalEmail = $superAdmin->email;

        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
            'is_active' => true,
        ]);

        $this->actingAs($admin);

        $response = $this->put("/admin/usuarios/{$superAdmin->id}", [
            'name' => 'Hacked SuperAdmin',
            'email' => 'hacked@evil.com',
            'role' => UserRole::Client->value,
            'is_active' => '0',
            'password' => 'attacker123',
        ]);

        $response->assertRedirect()->assertSessionHas('error');

        $freshSuper = $superAdmin->fresh();
        $this->assertSame($originalEmail, $freshSuper->email);
        $this->assertSame(UserRole::SuperAdmin->value, $freshSuper->role);
        $this->assertTrue($freshSuper->is_active);
        $this->assertSame($originalPasswordHash, $freshSuper->password);
    }

    public function test_non_superadmin_cannot_revoke_own_settings_manage_permission(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
            'is_active' => true,
        ]);

        $dashboardPermId = Permission::where('slug', 'admin.dashboard.view')->value('id');

        $this->actingAs($admin);

        $this->put('/admin/permissoes', [
            'permissions' => [
                UserRole::Admin->value => [$dashboardPermId],
            ],
        ])->assertRedirect()->assertSessionHas('error');

        $this->assertTrue($admin->fresh()->hasPermission('settings.manage'));
    }

    public function test_admin_client_creation_generates_strong_random_password_instead_of_hardcoded_default(): void
    {
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);

        $response = $this->post('/admin/clientes', [
            'company_name' => 'Segura Tech Lda',
            'contact_name' => 'Helena Segura',
            'email' => 'helena@seguratech.ao',
            'status' => 'active',
            'create_user_account' => '1',
            'password' => '',
        ]);

        $response->assertSessionHasNoErrors()->assertRedirect();
        $flash = (string) session('success');
        $this->assertStringContainsString('Senha temporária gerada', $flash);

        $createdUser = User::where('email', 'helena@seguratech.ao')->firstOrFail();
        $this->assertFalse(Hash::check('12345678', $createdUser->password));

        preg_match('/Portal:\s*([^\s]+)/', $flash, $matches);
        $this->assertNotEmpty($matches[1] ?? null);
        $this->assertTrue(Hash::check($matches[1], $createdUser->password));
    }

    public function test_portal_blocks_viewing_approving_and_rejecting_draft_and_expired_quotations(): void
    {
        $clientUser = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $service = Service::firstOrFail();

        $sr = ServiceRequest::factory()->create([
            'client_id' => $clientUser->client->id,
            'user_id' => $clientUser->id,
            'service_id' => $service->id,
            'protocol' => 'GNDJ-DRAFT-001',
        ]);

        $draftQuotation = Quotation::factory()->create([
            'client_id' => $clientUser->client->id,
            'service_request_id' => $sr->id,
            'title' => 'Rascunho Interno Sigiloso',
            'status' => 'draft',
            'valid_until' => now()->addDays(10)->toDateString(),
        ]);

        $expiredQuotation = Quotation::factory()->create([
            'client_id' => $clientUser->client->id,
            'status' => 'sent',
            'valid_until' => now()->subDays(2)->toDateString(),
        ]);

        // Public protocol tracking must NOT expose draft quotation details
        $this->get('/acompanhar-solicitacao?protocol=GNDJ-DRAFT-001')
            ->assertStatus(200)
            ->assertDontSee('Rascunho Interno Sigiloso');

        $this->actingAs($clientUser);

        $this->get("/portal/orcamentos/{$draftQuotation->id}")->assertStatus(403);
        $this->post("/portal/orcamentos/{$draftQuotation->id}/aprovar")->assertSessionHas('error');
        $this->post("/portal/orcamentos/{$draftQuotation->id}/recusar")->assertSessionHas('error');
        $this->assertSame('draft', $draftQuotation->fresh()->status);

        $this->get("/portal/orcamentos/{$expiredQuotation->id}")
            ->assertStatus(200)
            ->assertSee('Proposta Expirada')
            ->assertDontSee('Aprovar Orçamento Agora');

        $this->post("/portal/orcamentos/{$expiredQuotation->id}/aprovar")->assertSessionHas('error');
        $this->post("/portal/orcamentos/{$expiredQuotation->id}/recusar")->assertSessionHas('error');
        $this->assertSame('sent', $expiredQuotation->fresh()->status);
    }

    public function test_portal_finance_isolates_internal_agency_expenses_from_client(): void
    {
        $clientUser = User::where('email', 'cliente@acmecorp.com')->firstOrFail();

        FinancialTransaction::create([
            'client_id' => $clientUser->client->id,
            'type' => 'income',
            'category' => 'Mensalidade',
            'title' => 'Fatura Visível ao Cliente',
            'amount' => 1500.00,
            'due_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        FinancialTransaction::create([
            'client_id' => $clientUser->client->id,
            'type' => 'expense',
            'category' => 'Custo Freelancer',
            'title' => 'Custo Interno Confidencial Agência',
            'amount' => 450.00,
            'due_date' => now()->toDateString(),
            'status' => 'paid',
        ]);

        $this->actingAs($clientUser);

        $this->get('/portal/financeiro')
            ->assertStatus(200)
            ->assertSee('Fatura Visível ao Cliente')
            ->assertDontSee('Custo Interno Confidencial Agência');
    }

    public function test_portal_granular_rbac_permissions_enforce_access_control(): void
    {
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $clientUser = User::where('email', 'cliente@acmecorp.com')->firstOrFail();

        $allowedClientPermIds = Permission::whereIn('slug', [
            'portal.access',
            'portal.projects.view',
        ])->pluck('id')->all();

        $this->actingAs($superAdmin);
        $this->put('/admin/permissoes', [
            'permissions' => [
                UserRole::Client->value => $allowedClientPermIds,
            ],
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->actingAs($clientUser->fresh());
        $this->get('/portal')->assertStatus(200);
        $this->get('/portal/projetos')->assertStatus(200);
        $this->get('/portal/financeiro')->assertStatus(403);
        $this->get('/portal/atendimento')->assertStatus(403);
        $this->get('/portal/dominios')->assertStatus(403);
        $this->get('/portal/campanhas')->assertStatus(403);
        $this->get('/portal/solicitacoes')->assertStatus(403);
        $this->get('/portal/orcamentos')->assertStatus(403);
    }

    public function test_protected_attachment_downloads_enforce_ownership_and_visibility(): void
    {
        Storage::fake('local');

        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $client1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $client2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();
        $project = Project::where('client_id', $client1->client->id)->firstOrFail();
        $service = Service::firstOrFail();

        // Admin uploads one visible and one internal-only project attachment
        $this->actingAs($superAdmin);
        $this->post("/admin/projetos/{$project->id}/anexos", [
            'title' => 'Entrega Cliente',
            'is_client_visible' => '1',
            'file' => UploadedFile::fake()->create('entrega.pdf', 10, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $this->post("/admin/projetos/{$project->id}/anexos", [
            'title' => 'Credenciais Internas',
            'is_client_visible' => '0',
            'file' => UploadedFile::fake()->create('segredo.txt', 5, 'text/plain'),
        ])->assertSessionHasNoErrors();

        $visibleAtt = ProjectAttachment::where('project_id', $project->id)->where('is_client_visible', true)->firstOrFail();
        $internalAtt = ProjectAttachment::where('project_id', $project->id)->where('is_client_visible', false)->firstOrFail();

        Storage::disk('local')->assertExists($visibleAtt->file_path);
        Storage::disk('local')->assertExists($internalAtt->file_path);

        // Staff downloads both internal and visible attachments
        $this->get(route('admin.projects.attachments.download', [$project, $internalAtt]))->assertStatus(200);
        $this->get(route('admin.projects.attachments.download', [$project, $visibleAtt]))->assertStatus(200);

        // Client 1 uploads a request briefing attachment
        $this->actingAs($client1);
        $this->post('/portal/solicitacoes', [
            'service_id' => $service->id,
            'title' => 'Briefing Protegido',
            'description' => 'Segue anexo confidencial do briefing.',
            'attachment' => UploadedFile::fake()->create('briefing.pdf', 12, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $sr = ServiceRequest::where('service_title', 'Briefing Protegido')->firstOrFail();
        $reqAtt = RequestAttachment::where('service_request_id', $sr->id)->firstOrFail();
        Storage::disk('local')->assertExists($reqAtt->file_path);

        // Owner client can download visible project attachment & own request attachment, but NOT internal attachment
        $this->get(route('portal.projects.attachments.download', [$project, $visibleAtt]))->assertStatus(200);
        $this->get(route('portal.projects.attachments.download', [$project, $internalAtt]))->assertStatus(403);
        $this->get(route('portal.requests.attachments.download', [$sr, $reqAtt]))->assertStatus(200);

        // Other client is blocked from downloading Client 1's attachments
        $this->actingAs($client2);
        $this->get(route('portal.projects.attachments.download', [$project, $visibleAtt]))->assertStatus(403);
        $this->get(route('portal.requests.attachments.download', [$sr, $reqAtt]))->assertStatus(403);

        // Admin can download client's request attachment via admin route
        $this->actingAs($superAdmin);
        $this->get(route('admin.requests.attachments.download', [$sr, $reqAtt]))->assertStatus(200);

        // Guest is redirected to login
        $this->post('/logout');
        $this->get(route('portal.projects.attachments.download', [$project, $visibleAtt]))->assertRedirect(route('login'));
    }

    public function test_deactivated_user_forced_logout_invalidates_session(): void
    {
        $inactiveStaff = User::factory()->create([
            'role' => UserRole::Developer->value,
            'is_active' => false,
            'password' => Hash::make('secret123'),
        ]);

        // Login rejected and remains guest
        $this->post('/login', [
            'email' => $inactiveStaff->email,
            'password' => 'secret123',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        // Already authenticated user deactivated mid-session is logged out by middleware
        $this->actingAs($inactiveStaff);
        $this->get('/admin')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_project_and_finance_data_integrity_boundaries(): void
    {
        Storage::fake('local');

        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $client1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $client2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();
        $project1 = Project::where('client_id', $client1->client->id)->firstOrFail();
        $project2 = Project::factory()->create(['client_id' => $client2->client->id]);
        $otherProjectStage = ProjectStage::create([
            'project_id' => $project2->id,
            'title' => 'Etapa Outro Projeto',
            'order' => 1,
            'status' => 'pending',
        ]);

        $this->actingAs($superAdmin);

        // 1. Adding a stage recalculates project progress percentage
        $project1->stages()->update(['status' => 'completed']);
        $firstStage = $project1->stages()->firstOrFail();
        $this->post("/admin/projetos/etapas/{$firstStage->id}", ['status' => 'completed']);
        $this->assertSame(100, $project1->fresh()->progress_percentage);

        $this->post("/admin/projetos/{$project1->id}/etapas", [
            'title' => 'Etapa Extra QA',
            'description' => 'Validação final',
        ])->assertSessionHasNoErrors();
        $this->assertLessThan(100, $project1->fresh()->progress_percentage);

        // 2. Client user cannot be allocated as internal project team member
        $this->post("/admin/projetos/{$project1->id}/membros", [
            'user_id' => $client1->id,
            'role_in_project' => 'Cliente Infiltrando Equipe',
        ])->assertSessionHasErrors('user_id');

        // 3. Cross-project stage_id rejected on attachment upload
        $this->post("/admin/projetos/{$project1->id}/anexos", [
            'stage_id' => $otherProjectStage->id,
            'file' => UploadedFile::fake()->create('doc.pdf', 5, 'application/pdf'),
        ])->assertSessionHasErrors('stage_id');

        // 4. Finance rejects mismatched client_id vs project_id and auto-fills client_id when omitted
        $this->post('/admin/financeiro/transacoes', [
            'client_id' => $client2->client->id,
            'project_id' => $project1->id,
            'type' => 'income',
            'category' => 'Desenvolvimento',
            'title' => 'Lançamento Cruzado Inválido',
            'amount' => 1000,
            'due_date' => now()->toDateString(),
            'status' => 'pending',
        ])->assertSessionHasErrors('project_id');

        $this->post('/admin/financeiro/transacoes', [
            'client_id' => '',
            'project_id' => $project1->id,
            'type' => 'income',
            'category' => 'Desenvolvimento',
            'title' => 'Auto Link Cliente Projeto',
            'amount' => 1200,
            'due_date' => now()->toDateString(),
            'status' => 'pending',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('financial_transactions', [
            'title' => 'Auto Link Cliente Projeto',
            'project_id' => $project1->id,
            'client_id' => $project1->client_id,
        ]);
    }

    public function test_case_insensitive_search_and_duplicate_domain_renewal_protection(): void
    {
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);

        $this->get('/admin/clientes?search=aCmE')->assertStatus(200)->assertSee('Acme');
        $this->get('/admin/solicitacoes?search=lOjA')->assertStatus(200)->assertSee('GJT-2026-0001');
        $this->get('/admin/orcamentos?search=e-CoMmErCe')->assertStatus(200)->assertSee('ORC-2026-0001');
        $this->get('/admin/projetos?search=aCmE')->assertStatus(200)->assertSee('PRJ-2026-0001');
        $this->get('/admin/dominios?search=aCmE')->assertStatus(200)->assertSee('acmecorp.com.br');
        $this->get('/admin/usuarios?search=DiReToRiA')->assertStatus(200)->assertSee('Diretoria');

        // Duplicate renewal protection in client portal
        $client2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();
        $domain2 = Domain::where('client_id', $client2->client->id)->firstOrFail();

        $this->actingAs($client2);
        $this->post("/portal/dominios/{$domain2->id}/renovacao")->assertSessionHas('success');
        $this->post("/portal/dominios/{$domain2->id}/renovacao")->assertSessionHas('success');

        $renewalCount = ServiceRequest::where('client_id', $client2->client->id)
            ->where('service_title', 'Renovação de Domínio: '.$domain2->domain_name)
            ->count();
        $this->assertSame(1, $renewalCount);
    }

    public function test_registration_links_existing_unowned_client_and_admin_can_preview_portal_chat(): void
    {
        $existingLeadClient = Client::create([
            'user_id' => null,
            'name' => 'Lead Pré-Cadastrado',
            'company_name' => 'Empresa Lead Original',
            'email' => 'lead.original@empresa.ao',
            'status' => 'lead',
        ]);

        $this->post('/cadastro', [
            'name' => 'Lead Pré-Cadastrado',
            'email' => 'lead.original@empresa.ao',
            'company_name' => 'Empresa Lead Original',
            'password' => 'segura123',
            'password_confirmation' => 'segura123',
        ])->assertRedirect(route('portal.dashboard'));

        $registeredUser = User::where('email', 'lead.original@empresa.ao')->firstOrFail();
        $this->assertSame($existingLeadClient->id, $registeredUser->client?->id);
        $this->assertSame(1, Client::where('email', 'lead.original@empresa.ao')->count());

        // Admin preview of /portal/atendimento renders gracefully without 403
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);
        $this->get('/portal/atendimento')
            ->assertStatus(200)
            ->assertSee('Pré-visualização Administrativa');
    }

    public function test_public_seo_endpoints_404_enforcement_honeypot_and_xss_escaping(): void
    {
        // 1. site.webmanifest exists and is valid JSON
        $manifestPath = public_path('site.webmanifest');
        $this->assertFileExists($manifestPath);
        $manifest = json_decode((string) file_get_contents($manifestPath), true);
        $this->assertSame('GundjaTech', $manifest['short_name'] ?? null);

        // 2. Dynamic RSS feed & XML sitemap
        $this->get('/feed.xml')
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'application/rss+xml; charset=UTF-8')
            ->assertSee('<rss version="2.0">', false)
            ->assertSee('Blog GundjaTech');

        $this->get('/sitemap.xml')
            ->assertStatus(200)
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->assertSee('<urlset', false)
            ->assertSee('/servicos');

        // 3. Unknown multi-word slug returns real HTTP 404 (not 200 blog-sample)
        $this->get('/esta-pagina-definitivamente-nao-existe')
            ->assertStatus(404)
            ->assertSee('Não encontramos a página solicitada');

        // 4. Legacy language prefix redirects cleanly (301)
        $this->get('/pt-pt/contato')->assertRedirect('/contato');
        $this->get('/en/servicos')->assertRedirect('/servicos');

        // 5. Honeypot spam submission ignored without creating DB record
        $beforeCount = ServiceRequest::count();
        $this->postJson('/api/lead', [
            'nome' => 'Spam Bot',
            'email' => 'bot@spam.example',
            'sobrenome_hp' => 'triggered-bot-value',
        ])->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertSame($beforeCount, ServiceRequest::count());

        // 6. XSS payload in chart data on Admin Dashboard is safely hex-escaped by @json
        $xssCategory = ServiceCategory::create([
            'name' => 'Cat</script><script>alert(1)</script>',
            'slug' => 'cat-xss-test',
            'order' => 99,
            'is_active' => true,
        ]);
        $xssService = Service::create([
            'category_id' => $xssCategory->id,
            'name' => 'Serviço XSS',
            'slug' => 'servico-xss-test',
            'base_price' => 1000,
            'billing_type' => 'one_time',
            'estimated_days' => 5,
            'is_active' => true,
        ]);
        ServiceRequest::factory()->create(['service_id' => $xssService->id]);

        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);
        $dashboard = $this->get('/admin');
        $dashboard->assertStatus(200);
        $dashboard->assertDontSee('Cat</script><script>alert(1)</script>', false);
    }
}
