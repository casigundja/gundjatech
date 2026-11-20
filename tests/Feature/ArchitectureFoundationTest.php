<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\BlogPost;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\Domain;
use App\Models\Permission;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ArchitectureFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_all_core_tables_exist_after_migrations(): void
    {
        $expectedTables = [
            'users',
            'password_reset_tokens',
            'permissions',
            'role_permissions',
            'clients',
            'service_categories',
            'services',
            'service_requests',
            'request_status_histories',
            'request_attachments',
            'quotations',
            'quotation_items',
            'projects',
            'project_stages',
            'project_members',
            'project_attachments',
            'contracts',
            'domains',
            'domain_renewals',
            'dns_records',
            'advertising_campaigns',
            'campaign_metrics',
            'financial_transactions',
            'payments',
            'conversations',
            'conversation_messages',
            'notifications_custom',
            'blog_posts',
            'portfolio_projects',
            'activity_logs',
            'system_settings',
        ];

        foreach ($expectedTables as $table) {
            $this->assertTrue(Schema::hasTable($table), "Missing expected table: {$table}");
        }

        $this->assertTrue(Schema::hasColumn('blog_posts', 'views_count'));
    }

    public function test_eloquent_models_factories_and_relationships_work(): void
    {
        $category = ServiceCategory::factory()->create();
        $service = Service::factory()->create(['category_id' => $category->id]);
        $client = Client::factory()->create();
        $request = ServiceRequest::factory()->create([
            'client_id' => $client->id,
            'user_id' => $client->user_id,
            'service_id' => $service->id,
        ]);
        $quotation = Quotation::factory()->create([
            'client_id' => $client->id,
            'service_request_id' => $request->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'service_id' => $service->id,
            'quotation_id' => $quotation->id,
            'service_request_id' => $request->id,
        ]);
        $domain = Domain::factory()->create(['client_id' => $client->id]);

        $this->assertEquals($category->id, $service->category->id);
        $this->assertEquals($client->id, $client->user->client->id);
        $this->assertEquals($request->id, $client->serviceRequests()->first()->id);
        $this->assertEquals($quotation->id, $client->quotations()->first()->id);
        $this->assertEquals($project->id, $client->projects()->first()->id);
        $this->assertEquals($domain->id, $client->domains()->first()->id);
    }

    public function test_registration_and_password_recovery_flows(): void
    {
        $registerResponse = $this->post('/cadastro', [
            'name' => 'Ana Construtora',
            'email' => 'ana@construtora.com.br',
            'phone' => '(11) 91111-2222',
            'company_name' => 'Construtora Horizonte',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $registerResponse->assertRedirect(route('portal.dashboard'));
        $this->assertDatabaseHas('users', [
            'email' => 'ana@construtora.com.br',
            'role' => UserRole::Client->value,
        ]);
        $this->assertDatabaseHas('clients', [
            'email' => 'ana@construtora.com.br',
            'name' => 'Ana Construtora',
            'company_name' => 'Construtora Horizonte',
        ]);

        $this->post('/logout');

        // Forgot & Reset Password flow
        $this->get('/esqueci-minha-senha')->assertStatus(200);
        $this->post('/esqueci-minha-senha', ['email' => 'ana@construtora.com.br'])
            ->assertSessionHas('status');

        $user = User::where('email', 'ana@construtora.com.br')->firstOrFail();
        $token = Password::createToken($user);

        $this->get("/redefinir-senha/{$token}?email=ana@construtora.com.br")->assertStatus(200);

        $resetResponse = $this->post('/redefinir-senha', [
            'token' => $token,
            'email' => 'ana@construtora.com.br',
            'password' => 'novaSenha123',
            'password_confirmation' => 'novaSenha123',
        ]);

        $resetResponse->assertRedirect(route('login'));
        $this->assertTrue(Hash::check('novaSenha123', $user->fresh()->password));
    }

    public function test_rbac_permissions_gates_and_policies_enforce_boundaries(): void
    {
        $this->assertGreaterThanOrEqual(25, Permission::count());

        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $financial = User::where('role', UserRole::Financial->value)->firstOrFail();
        $client1User = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $client2User = User::where('email', 'contato@innovasolutions.com')->firstOrFail();

        // Gates via RBAC
        $this->assertTrue(Gate::forUser($superAdmin)->allows('users.manage'));
        $this->assertTrue(Gate::forUser($financial)->allows('finance.manage'));
        $this->assertFalse(Gate::forUser($financial)->allows('users.manage'));
        $this->assertTrue(Gate::forUser($client1User)->allows('portal.access'));
        $this->assertFalse(Gate::forUser($client1User)->allows('admin.dashboard.view'));

        // Policy ownership isolation between clients
        $project1 = Project::factory()->create(['client_id' => $client1User->client->id]);
        $quotation1 = Quotation::factory()->create(['client_id' => $client1User->client->id]);
        $domain1 = Domain::factory()->create(['client_id' => $client1User->client->id]);
        $conversation1 = Conversation::create([
            'client_id' => $client1User->client->id,
            'subject' => 'Suporte Projeto 1',
            'status' => 'open',
        ]);

        $this->assertTrue(Gate::forUser($client1User)->allows('view', $project1));
        $this->assertFalse(Gate::forUser($client2User)->allows('view', $project1));

        $this->assertTrue(Gate::forUser($client1User)->allows('approve', $quotation1));
        $this->assertFalse(Gate::forUser($client2User)->allows('approve', $quotation1));

        $this->assertTrue(Gate::forUser($client1User)->allows('view', $domain1));
        $this->assertFalse(Gate::forUser($client2User)->allows('view', $domain1));

        $this->assertTrue(Gate::forUser($client1User)->allows('reply', $conversation1));
        $this->assertFalse(Gate::forUser($client2User)->allows('reply', $conversation1));
    }

    public function test_admin_search_and_public_service_and_blog_detail_queries_work(): void
    {
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($admin);

        // Search queries on real schema columns
        $this->get('/admin/clientes?search=Acme')->assertStatus(200)->assertSee('Acme');
        $this->get('/admin/solicitacoes?search=Loja')->assertStatus(200)->assertSee('GJT-2026-0001');

        // Public service detail (non-Sinnapse dynamic slug) and database blog post
        $service = Service::where('slug', 'site-institucional-premium')->firstOrFail();
        $this->get('/servicos/'.$service->slug)->assertStatus(200)->assertSee($service->name);

        $post = BlogPost::firstOrFail();
        $initialViews = (int) $post->views_count;
        $this->get('/blog/'.$post->slug)->assertStatus(200)->assertSee($post->title);
        $this->assertEquals($initialViews + 1, $post->fresh()->views_count);
    }
}
