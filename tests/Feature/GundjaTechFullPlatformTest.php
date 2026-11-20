<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Quotation;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GundjaTechFullPlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_public_pages_load_successfully(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('GundjaTech');
        $response->assertSee('Transformamos');
        $response->assertSee('snp-canvas');
        $response->assertSee('hm3-pin');
        $response->assertSee('hm-projetos');
        $response->assertSee('s2-tambor');

        $this->get('/sobre')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/servicos')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/servicos/criacao-de-sites')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/servicos/gerenciamento-de-dominios')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/servicos/gestao-de-trafego-pago')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/portfolio')
            ->assertStatus(200)
            ->assertSee('topo-fixo')
            ->assertSee('globo')
            ->assertSee('KLASSE')
            ->assertSee('Instituto Paraíso do Saber')
            ->assertSee('Cotech Contabilidade');
        $this->get('/cases/klasse')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo')->assertSee('https://klasse.ao/');
        $this->get('/cases/instituto-paraiso-do-saber')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo')->assertSee('https://institutoparaisodosaber.com/');
        $this->get('/cases/cotech-contabilidade')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo')->assertSee('https://cotechcontabilidade.com/');
        $this->get('/blog')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/contato')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/solicitar-orcamento')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');
        $this->get('/acompanhar-solicitacao')->assertStatus(200)->assertSee('topo-fixo')->assertSee('globo');

        $leadResponse = $this->postJson('/api/lead', [
            'nome' => 'Mariana Lead',
            'email' => 'mariana@empresa.com.br',
            'telefone' => '(11) 98888-7777',
            'empresa' => 'Empresa Alpha',
            'site' => 'www.empresa.com.br',
            'origem' => 'contato',
            'mensagem' => 'Quero refazer nosso site corporativo.',
        ]);

        $leadResponse->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertDatabaseHas('service_requests', [
            'email' => 'mariana@empresa.com.br',
            'name' => 'Mariana Lead',
        ]);
    }

    public function test_client_can_submit_service_request_and_track_it(): void
    {
        $service = Service::first();

        $data = [
            'contact_name' => 'Carlos Tester',
            'company_name' => 'Tester Ltda',
            'email' => 'carlos@tester.com',
            'phone' => '(11) 99999-8888',
            'service_id' => $service->id,
            'title' => 'Criação de Plataforma SaaS',
            'description' => 'Preciso de um sistema completo com autenticação e pagamentos.',
            'estimated_budget' => 15000,
            'desired_deadline' => date('Y-m-d', strtotime('+30 days')),
        ];

        $response = $this->post('/solicitar-orcamento', $data);
        $response->assertRedirect();

        $this->assertDatabaseHas('service_requests', [
            'email' => 'carlos@tester.com',
            'service_title' => 'Criação de Plataforma SaaS',
            'status' => 'new',
        ]);

        $created = ServiceRequest::where('email', 'carlos@tester.com')->first();
        $this->assertNotNull($created);
        $this->assertStringStartsWith('GNDJ-', $created->protocol);

        // Track request
        $trackResponse = $this->get('/acompanhar-solicitacao?protocol='.$created->protocol);
        $trackResponse->assertStatus(200);
        $trackResponse->assertSee($created->protocol);
    }

    public function test_auth_and_role_based_redirection(): void
    {
        // Guest denied on admin
        $this->get('/admin')->assertRedirect('/login');

        // Guest denied on portal
        $this->get('/portal')->assertRedirect('/login');

        // Admin login redirects to /admin
        $this->flushSession();
        $loginAdmin = $this->post('/login', [
            'email' => 'admin@gundjatech.com',
            'password' => 'password',
        ]);
        $loginAdmin->assertRedirect(route('admin.dashboard'));

        // Client login redirects to /portal
        $this->post('/logout');
        $this->flushSession();
        $loginClient = $this->post('/login', [
            'email' => 'cliente@acmecorp.com',
            'password' => 'password',
        ]);
        $loginClient->assertRedirect(route('portal.dashboard'));
    }

    public function test_admin_can_access_modules_and_manage_requests(): void
    {
        $admin = User::where('role', 'superadmin')->first();
        $this->actingAs($admin);

        // Check modules
        $this->get('/admin')->assertStatus(200)->assertSee('Visão Geral Executiva');
        $this->get('/admin/clientes')->assertStatus(200);
        $this->get('/admin/solicitacoes')->assertStatus(200);
        $this->get('/admin/projetos')->assertStatus(200);
        $this->get('/admin/servicos')->assertStatus(200);
        $this->get('/admin/dominios')->assertStatus(200);
        $this->get('/admin/campanhas')->assertStatus(200);
        $this->get('/admin/financeiro')->assertStatus(200);
        $this->get('/admin/atendimento')->assertStatus(200);
        $this->get('/admin/usuarios')->assertStatus(200);

        // Update Request Status
        $request = ServiceRequest::first();
        $this->post("/admin/solicitacoes/{$request->id}/status", [
            'status' => 'analyzing',
            'comment' => 'Iniciando análise técnica da equipe.',
        ])->assertRedirect();

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'analyzing',
        ]);

        // Generate Quotation
        $resp = $this->post("/admin/solicitacoes/{$request->id}/orcamento", [
            'title' => 'Orçamento Projeto Teste',
            'valid_until' => date('Y-m-d', strtotime('+10 days')),
            'items' => [
                [
                    'description' => 'Desenvolvimento Frontend & Backend',
                    'quantity' => 1,
                    'unit_price' => 7500.00,
                ],
            ],
        ]);
        $resp->assertSessionHasNoErrors();
        $resp->assertRedirect();

        $this->assertDatabaseHas('quotations', [
            'title' => 'Orçamento Projeto Teste',
            'total' => 7500.00,
        ]);
    }

    public function test_client_can_access_portal_and_approve_quotation(): void
    {
        $clientUser = User::where('email', 'cliente@acmecorp.com')->first();
        $this->actingAs($clientUser);

        // Check Portal Pages
        $this->get('/portal')->assertStatus(200)->assertSee('Visão Geral do Cliente');
        $this->get('/portal/solicitacoes')->assertStatus(200);
        $this->get('/portal/projetos')->assertStatus(200);
        $this->get('/portal/orcamentos')->assertStatus(200);
        $this->get('/portal/dominios')->assertStatus(200);
        $this->get('/portal/campanhas')->assertStatus(200);
        $this->get('/portal/financeiro')->assertStatus(200);
        $this->get('/portal/atendimento')->assertStatus(200);

        // Approve quotation
        $quotation = Quotation::where('client_id', $clientUser->client->id)->first();
        if ($quotation) {
            $this->post("/portal/orcamentos/{$quotation->id}/aprovar")->assertRedirect();
            $this->assertDatabaseHas('quotations', [
                'id' => $quotation->id,
                'status' => 'approved',
            ]);
        }
    }
}
