<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Domain;
use App\Models\Project;
use App\Models\ProjectAttachment;
use App\Models\Quotation;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityAndPortalAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_security_headers_are_present_on_responses(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy');
    }

    public function test_portal_idor_protection_blocks_other_clients_and_orphan_users(): void
    {
        $client1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $client2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();

        // User with client role but NO client record (previously bypassed authorization!)
        $orphanClient = User::factory()->create([
            'role' => UserRole::Client->value,
            'is_active' => true,
        ]);

        $project1 = Project::where('client_id', $client1->client->id)->firstOrFail();
        $request1 = ServiceRequest::where('client_id', $client1->client->id)->firstOrFail();
        $quotation1 = Quotation::factory()->create(['client_id' => $client1->client->id, 'status' => 'sent']);
        $domain1 = Domain::where('client_id', $client1->client->id)->firstOrFail();
        $conversation1 = Conversation::where('client_id', $client1->client->id)->firstOrFail();

        foreach ([$client2, $orphanClient] as $unauthorizedUser) {
            $this->actingAs($unauthorizedUser);

            $this->get("/portal/projetos/{$project1->id}")->assertStatus(403);
            $this->get("/portal/solicitacoes/{$request1->id}")->assertStatus(403);
            $this->get("/portal/orcamentos/{$quotation1->id}")->assertStatus(403);
            $this->post("/portal/orcamentos/{$quotation1->id}/aprovar")->assertStatus(403);
            $this->post("/portal/orcamentos/{$quotation1->id}/recusar")->assertStatus(403);
            $this->post("/portal/dominios/{$domain1->id}/renovacao")->assertStatus(403);
            $this->post("/portal/atendimento/{$conversation1->id}/mensagem", [
                'message' => 'Tentativa indevida',
            ])->assertStatus(403);
        }
    }

    public function test_portal_hides_internal_only_project_attachments(): void
    {
        $client1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $project = Project::where('client_id', $client1->client->id)->firstOrFail();

        ProjectAttachment::create([
            'project_id' => $project->id,
            'file_name' => 'entrega-publica-cliente.pdf',
            'file_path' => 'project_files/public.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'is_client_visible' => true,
        ]);

        ProjectAttachment::create([
            'project_id' => $project->id,
            'file_name' => 'credenciais-internas-confidencial.txt',
            'file_path' => 'project_files/secret.txt',
            'file_size' => 512,
            'mime_type' => 'text/plain',
            'is_client_visible' => false,
        ]);

        $this->actingAs($client1);
        $response = $this->get("/portal/projetos/{$project->id}");
        $response->assertStatus(200);
        $response->assertSee('entrega-publica-cliente.pdf');
        $response->assertDontSee('credenciais-internas-confidencial.txt');
    }

    public function test_file_upload_endpoints_reject_unsafe_file_types(): void
    {
        Storage::fake('public');

        $service = Service::firstOrFail();
        $maliciousPhp = UploadedFile::fake()->create('shell.php', 10, 'application/x-httpd-php');

        // 1. Public quote request rejects PHP upload
        $this->post('/solicitar-orcamento', [
            'contact_name' => 'Attacker',
            'email' => 'attacker@example.com',
            'phone' => '11999990000',
            'service_id' => $service->id,
            'title' => 'Teste Upload',
            'description' => 'Tentativa de upload de script.',
            'attachment' => $maliciousPhp,
        ])->assertSessionHasErrors('attachment');

        // 2. Portal request rejects PHP upload
        $client1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $this->actingAs($client1);
        $this->post('/portal/solicitacoes', [
            'service_id' => $service->id,
            'title' => 'Upload Malicioso Portal',
            'description' => 'Teste segurança upload.',
            'attachment' => UploadedFile::fake()->create('xss.svg', 5, 'image/svg+xml'),
        ])->assertSessionHasErrors('attachment');

        // 3. Admin project attachment rejects PHP upload
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $project = Project::firstOrFail();
        $this->actingAs($admin);
        $this->post("/admin/projetos/{$project->id}/anexos", [
            'title' => 'Script',
            'file' => UploadedFile::fake()->create('payload.php', 5, 'application/x-httpd-php'),
        ])->assertSessionHasErrors('file');
    }

    public function test_login_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->post('/login', [
                'email' => 'admin@gundjatech.com',
                'password' => 'wrong-password',
            ])->assertStatus(302);
        }

        // 11th request within 1 minute hits throttle:10,1
        $this->post('/login', [
            'email' => 'admin@gundjatech.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_portal_campaigns_chat_domain_renewal_and_quotation_rejection_workflows(): void
    {
        // 1. Client 2 owns campaigns with metrics -> /portal/campanhas must load on PostgreSQL/SQLite without metric_date error
        $client2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();
        $this->actingAs($client2);

        $this->get('/portal/campanhas')
            ->assertStatus(200)
            ->assertSee('Escala SaaS Q4')
            ->assertSee('5,05x');

        // 2. Domain renewal request creates real ServiceRequest in DB
        $domain2 = Domain::where('client_id', $client2->client->id)->firstOrFail();
        $this->post("/portal/dominios/{$domain2->id}/renovacao")
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('service_requests', [
            'client_id' => $client2->client->id,
            'service_title' => 'Renovação de Domínio: '.$domain2->domain_name,
        ]);

        // 3. Portal Chat sends message with sender_type = client and the autonomous CRM AI replies
        $this->get('/portal/atendimento')->assertStatus(200);
        $conversation = Conversation::where('client_id', $client2->client->id)->firstOrFail();

        $this->post("/portal/atendimento/{$conversation->id}/mensagem", [
            'message' => 'Olá equipe, gostaria de aumentar o orçamento de mídia.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('conversation_messages', [
            'conversation_id' => $conversation->id,
            'sender_type' => 'client',
            'message' => 'Olá equipe, gostaria de aumentar o orçamento de mídia.',
        ]);
        $this->assertDatabaseHas('conversation_messages', [
            'conversation_id' => $conversation->id,
            'sender_type' => 'staff',
            'is_ai' => true,
        ]);
        $this->assertContains($conversation->fresh()->status, ['open', 'waiting_staff']);

        // 4. Portal Quotation Rejection workflow
        $quotation = Quotation::factory()->create([
            'client_id' => $client2->client->id,
            'status' => 'sent',
            'total' => 5000,
        ]);

        $this->post("/portal/orcamentos/{$quotation->id}/recusar", [
            'reason' => 'Precisamos dividir em 3 parcelas.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertEquals('rejected', $quotation->fresh()->status);

        // Cannot approve an already rejected quotation
        $this->post("/portal/orcamentos/{$quotation->id}/aprovar")
            ->assertSessionHas('error');
        $this->assertEquals('rejected', $quotation->fresh()->status);
    }

    public function test_public_contact_persists_and_api_lead_validates(): void
    {
        $this->post('/contato', [
            'name' => 'Eduardo Contato',
            'email' => 'eduardo@contato.com',
            'phone' => '(11) 97777-6666',
            'subject' => 'Parceria Estratégica',
            'message' => 'Gostaria de agendar uma reunião com a diretoria.',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('service_requests', [
            'email' => 'eduardo@contato.com',
            'service_title' => 'Contato: Parceria Estratégica',
        ]);

        // Invalid email rejected with 422 JSON
        $this->postJson('/api/lead', [
            'nome' => 'Invalido',
            'email' => 'nao-e-email',
        ])->assertStatus(422);
    }
}
