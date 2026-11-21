<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AdvertisingCampaign;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\Domain;
use App\Models\FinancialTransaction;
use App\Models\Project;
use App\Models\ProjectAttachment;
use App\Models\Quotation;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\ServiceRequest;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AutonomousCrmAgent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ComprehensiveAuditHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_registration_normalizes_email_blocks_active_client_hijack_and_links_only_unowned_lead(): void
    {
        $activeClient = Client::factory()->create([
            'user_id' => null,
            'email' => 'activecorp@example.com',
            'status' => 'active',
        ]);

        $response = $this->post('/cadastro', [
            'name' => 'Tentativa Active',
            'email' => 'ActiveCorp@Example.COM',
            'phone' => '11999990001',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ]);

        $response->assertRedirect(route('portal.dashboard'));

        $registeredUser = User::where('email', 'activecorp@example.com')->firstOrFail();
        $this->assertSame('activecorp@example.com', $registeredUser->email);
        $this->assertNull($activeClient->fresh()->user_id);

        // Case-variant duplicate email must be blocked on registration
        $this->post('/logout');
        $this->post('/cadastro', [
            'name' => 'Duplicado',
            'email' => 'ACTIVECORP@EXAMPLE.COM',
            'phone' => '11999990002',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ])->assertSessionHasErrors('email');

        // Unowned lead client with matching email IS safely linked
        $leadClient = Client::factory()->create([
            'user_id' => null,
            'email' => 'leadprospect@example.com',
            'status' => 'lead',
        ]);

        $this->post('/cadastro', [
            'name' => 'Lead Prospect',
            'email' => 'LeadProspect@Example.COM',
            'phone' => '11999990003',
            'password' => 'Secret1234!',
            'password_confirmation' => 'Secret1234!',
        ])->assertRedirect(route('portal.dashboard'));

        $leadUser = User::where('email', 'leadprospect@example.com')->firstOrFail();
        $this->assertSame($leadUser->id, $leadClient->fresh()->user_id);
    }

    public function test_public_chat_isolation_protects_owned_portal_client_and_blocks_reopening_closed_chat(): void
    {
        $portalUser = User::factory()->create([
            'role' => UserRole::Client->value,
            'email' => 'cliente.seguro@example.com',
            'is_active' => true,
        ]);

        $ownedClient = Client::factory()->create([
            'user_id' => $portalUser->id,
            'contact_name' => 'Cliente Oficial',
            'company_name' => 'Empresa Oficial Ltda',
            'email' => 'cliente.seguro@example.com',
            'notes' => 'Notas confidenciais originais',
            'status' => 'active',
        ]);

        // Unauthenticated visitor uses the portal client's email in website chat
        $startResp = $this->postJson('/api/chat/start', [
            'nome' => 'Visitante Spoof',
            'email' => 'CLIENTE.SEGURO@EXAMPLE.COM',
            'telefone' => '11988887777',
            'assunto' => 'Quero um site novo',
            'mensagem' => 'Interesse informado no chat',
        ]);

        $startResp->assertCreated()->assertJsonPath('ok', true);
        $visitorToken = (string) $startResp->json('visitor_token');
        $websiteConversationId = (int) $startResp->json('conversation_id');

        // Owned client metadata must remain untouched
        $ownedClient->refresh();
        $this->assertSame('Cliente Oficial', $ownedClient->contact_name);
        $this->assertSame('Notas confidenciais originais', $ownedClient->notes);

        // Portal client must NOT see or interact with the public website_chat conversation
        $this->actingAs($portalUser);
        $this->get('/portal/atendimento')->assertOk();

        $portalChat = Conversation::where('client_id', $ownedClient->id)
            ->where('channel', 'web_chat')
            ->whereNull('visitor_token')
            ->first();
        $this->assertNotNull($portalChat);
        $this->assertNotSame($websiteConversationId, $portalChat->id);
        $this->assertTrue((bool) $portalChat->ai_enabled);

        // Sending a message inside the Portal Chat invokes the Autonomous CRM AI automatically
        $portalReplyResp = $this->postJson("/portal/atendimento/{$portalChat->id}/mensagem", [
            'message' => 'Olá, preciso criar um site institucional novo para minha empresa',
        ]);
        $portalReplyResp->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('ai_reply.sender_type', 'staff')
            ->assertJsonPath('ai_reply.is_ai', true);
        $this->assertNotEmpty($portalReplyResp->json('ai_reply.message'));

        $this->getJson("/portal/atendimento/{$websiteConversationId}/mensagens")->assertForbidden();
        $this->postJson("/portal/atendimento/{$websiteConversationId}/mensagem", [
            'message' => 'Tentativa indevida',
        ])->assertForbidden();

        // Staff closes the website chat; unauthenticated visitor gets HTTP 409 and cannot reopen it
        $websiteConversation = Conversation::findOrFail($websiteConversationId);
        $websiteConversation->update([
            'status' => 'closed',
            'closed_at' => now(),
            'ai_enabled' => false,
        ]);

        $this->post('/logout');

        $this->postJson('/api/chat/message', [
            'visitor_token' => $visitorToken,
            'message' => 'Tentando reabrir conversa fechada',
        ])->assertStatus(409)->assertJson([
            'ok' => false,
            'status' => 'closed',
        ]);

        $this->assertSame('closed', $websiteConversation->fresh()->status);
    }

    public function test_rbac_hierarchy_blocks_privilege_escalation_unauthorized_exports_and_cross_module_conversions(): void
    {
        $admin = User::factory()->create([
            'role' => UserRole::Admin->value,
            'is_active' => true,
        ]);
        $peerAdmin = User::factory()->create([
            'role' => UserRole::Admin->value,
            'is_active' => true,
        ]);

        $this->actingAs($admin);

        // Admin cannot create SuperAdmin or peer Admin
        $this->post('/admin/usuarios', [
            'name' => 'Novo Super',
            'email' => 'novosuper@example.com',
            'role' => UserRole::SuperAdmin->value,
            'password' => 'Secret1234!',
        ])->assertRedirect()->assertSessionHas('error');
        $this->assertDatabaseMissing('users', ['email' => 'novosuper@example.com']);

        $this->post('/admin/usuarios', [
            'name' => 'Novo Peer Admin',
            'email' => 'peeradmin@example.com',
            'role' => UserRole::Admin->value,
            'password' => 'Secret1234!',
        ])->assertRedirect()->assertSessionHas('error');
        $this->assertDatabaseMissing('users', ['email' => 'peeradmin@example.com']);

        // Admin cannot delete peer Admin
        $this->delete("/admin/usuarios/{$peerAdmin->id}")
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertDatabaseHas('users', ['id' => $peerAdmin->id]);

        // Non-SuperAdmin cannot reset RBAC defaults
        $this->post('/admin/permissoes/padrao')->assertForbidden();

        // Developer (has dashboard.view but lacks finance.view/requests.view) gets 403 on CSV export
        $developer = User::factory()->create([
            'role' => UserRole::Developer->value,
            'is_active' => true,
        ]);
        $this->actingAs($developer);
        $this->get('/admin/relatorio/exportar')->assertForbidden();

        // Attendant (has requests.manage, lacks quotations.manage/projects.manage) gets 403 on conversions
        $attendant = User::factory()->create([
            'role' => UserRole::Attendant->value,
            'is_active' => true,
        ]);
        $client = Client::factory()->create(['company_name' => '=SUM(A1:A5)']);
        $serviceRequest = ServiceRequest::factory()->create([
            'client_id' => $client->id,
            'company' => '=SUM(A1:A5)',
            'service_title' => '+cmd|calc',
            'status' => 'analyzing',
        ]);

        $this->actingAs($attendant);
        $this->post("/admin/solicitacoes/{$serviceRequest->id}/orcamento", [
            'title' => 'Proposta Nao Autorizada',
            'unit_price' => 1500,
        ])->assertForbidden();
        $this->post("/admin/solicitacoes/{$serviceRequest->id}/converter")->assertForbidden();

        // Financial (has quotations.manage, lacks projects.manage) gets 403 converting quotation to project
        $financial = User::factory()->create([
            'role' => UserRole::Financial->value,
            'is_active' => true,
        ]);
        $quotation = Quotation::factory()->create([
            'client_id' => $client->id,
            'status' => 'approved',
        ]);
        $this->actingAs($financial);
        $this->post("/admin/orcamentos/{$quotation->id}/converter")->assertForbidden();

        // SuperAdmin export neutralizes CSV formula injection cells
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);
        $csvResponse = $this->get('/admin/relatorio/exportar');
        $csvResponse->assertOk();
        $csvBody = $csvResponse->streamedContent();
        $this->assertStringContainsString("'+cmd|calc", $csvBody);
        $this->assertStringContainsString("'=SUM(A1:A5)", $csvBody);
    }

    public function test_safe_crud_deletions_cleanup_disk_files_and_protect_active_clients_and_cancelled_finance(): void
    {
        Storage::fake('local');
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);

        $clientUser = User::factory()->create([
            'role' => UserRole::Client->value,
            'is_active' => true,
        ]);
        $client = Client::factory()->create([
            'user_id' => $clientUser->id,
            'status' => 'active',
        ]);

        // Project with two attachments: delete single attachment then delete entire project
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status' => 'in_progress',
        ]);

        $path1 = 'project_attachments/doc1.pdf';
        $path2 = 'project_attachments/doc2.pdf';
        Storage::disk('local')->put($path1, 'PDF1');
        Storage::disk('local')->put($path2, 'PDF2');

        $att1 = ProjectAttachment::create([
            'project_id' => $project->id,
            'uploaded_by_user_id' => $superAdmin->id,
            'file_name' => 'Doc 1',
            'file_path' => $path1,
            'mime_type' => 'application/pdf',
            'file_size' => 4,
            'is_client_visible' => true,
        ]);
        $att2 = ProjectAttachment::create([
            'project_id' => $project->id,
            'uploaded_by_user_id' => $superAdmin->id,
            'file_name' => 'Doc 2',
            'file_path' => $path2,
            'mime_type' => 'application/pdf',
            'file_size' => 4,
            'is_client_visible' => true,
        ]);

        // Client deletion blocked while active project exists
        $this->delete("/admin/clientes/{$client->id}")
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertDatabaseHas('clients', ['id' => $client->id]);

        // Delete single attachment -> removes DB row and disk file
        $this->delete("/admin/projetos/{$project->id}/anexos/{$att1->id}")
            ->assertRedirect()
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('project_attachments', ['id' => $att1->id]);
        Storage::disk('local')->assertMissing($path1);

        // Delete entire project -> removes project and remaining attachment file
        $this->delete("/admin/projetos/{$project->id}")
            ->assertRedirect(route('admin.projects.index'))
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('project_attachments', ['id' => $att2->id]);
        Storage::disk('local')->assertMissing($path2);

        // Domain deletion removes domain + DNS records
        $domain = Domain::factory()->create(['client_id' => $client->id]);
        $dns = $domain->dnsRecords()->create([
            'type' => 'A',
            'host' => '@',
            'value' => '192.0.2.10',
            'ttl' => 3600,
        ]);
        $this->delete("/admin/dominios/{$domain->id}")
            ->assertRedirect(route('admin.domains.index'))
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('domains', ['id' => $domain->id]);
        $this->assertDatabaseMissing($dns->getTable(), ['id' => $dns->id]);

        // Campaign deletion removes campaign
        $campaign = AdvertisingCampaign::create([
            'client_id' => $client->id,
            'name' => 'Campanha Teste Delete',
            'platform' => 'google_ads',
            'objective' => 'Leads',
            'budget' => 2500,
            'status' => 'active',
        ]);
        $this->delete("/admin/campanhas/{$campaign->id}")
            ->assertRedirect(route('admin.campaigns.index'))
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('advertising_campaigns', ['id' => $campaign->id]);

        // Quotation deletion clears draft_quotation_id in conversations.extracted_data
        $quotation = Quotation::factory()->create([
            'client_id' => $client->id,
            'status' => 'draft',
        ]);
        $conv = Conversation::create([
            'client_id' => $client->id,
            'subject' => 'Qualificacao IA',
            'channel' => 'website_chat',
            'status' => 'open',
            'extracted_data' => [
                'draft_quotation_id' => $quotation->id,
                'interest' => 'Site',
            ],
        ]);

        $this->delete("/admin/orcamentos/{$quotation->id}")
            ->assertRedirect(route('admin.quotations.index'))
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('quotations', ['id' => $quotation->id]);
        $this->assertArrayNotHasKey('draft_quotation_id', $conv->fresh()->extracted_data ?? []);

        // Cancelled financial transaction cannot be marked as paid
        $cancelledTx = FinancialTransaction::create([
            'client_id' => $client->id,
            'title' => 'Cobranca Cancelada',
            'description' => 'Cobranca Cancelada',
            'type' => 'income',
            'category' => 'Projeto',
            'amount' => 1200,
            'due_date' => now()->addDays(5),
            'status' => 'cancelled',
        ]);
        $this->post("/admin/financeiro/transacoes/{$cancelledTx->id}/pagar")
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertSame('cancelled', $cancelledTx->fresh()->status);

        // Paid transaction blocks client deletion; removing it lets client delete and deactivates portal user
        $paidTx = FinancialTransaction::create([
            'client_id' => $client->id,
            'title' => 'Parcela Paga',
            'description' => 'Parcela Paga',
            'type' => 'income',
            'category' => 'Projeto',
            'amount' => 3000,
            'due_date' => now(),
            'paid_at' => now(),
            'status' => 'paid',
        ]);
        $this->delete("/admin/clientes/{$client->id}")
            ->assertRedirect()
            ->assertSessionHas('error');

        $paidTx->delete();
        $cancelledTx->delete();

        $this->delete("/admin/clientes/{$client->id}")
            ->assertRedirect(route('admin.clients.index'))
            ->assertSessionHas('success');
        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
        $this->assertFalse($clientUser->fresh()->is_active);
    }

    public function test_project_attachment_with_slashes_in_title_downloads_safely(): void
    {
        Storage::fake('local');
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);

        $client = Client::factory()->create();
        $project = Project::factory()->create(['client_id' => $client->id]);

        $this->post("/admin/projetos/{$project->id}/anexos", [
            'title' => 'Layout UI/UX Final',
            'file' => UploadedFile::fake()->create('briefing.pdf', 32, 'application/pdf'),
            'visible_to_client' => '1',
        ])->assertRedirect()->assertSessionHas('success');

        $attachment = ProjectAttachment::where('project_id', $project->id)->firstOrFail();

        $downloadResp = $this->get("/admin/projetos/{$project->id}/anexos/{$attachment->id}");
        $downloadResp->assertOk();
        $disposition = (string) $downloadResp->headers->get('content-disposition');
        $this->assertStringNotContainsString('UI/UX', $disposition);
    }

    public function test_crm_ai_model_validation_strips_api_key_from_view_and_enforces_max_turns_handoff(): void
    {
        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($superAdmin);

        // Malicious model string with path traversal is rejected
        $this->put('/admin/crm-autonomo/configuracoes', [
            'crm_ai_enabled' => '1',
            'crm_ai_provider' => 'gemini',
            'crm_ai_model' => '../v1/secret?key=1',
        ])->assertSessionHasErrors('crm_ai_model');

        // Stored API key must never be passed into the view config or rendered HTML
        SystemSetting::set('crm_ai_api_key', Crypt::encryptString('AIzaSy-TEST-SUPER-SECRET-KEY-999'), 'crm_ai');
        AutonomousCrmAgent::flushCache();

        $indexResp = $this->get('/admin/crm-autonomo');
        $indexResp->assertOk();
        $indexResp->assertDontSee('AIzaSy-TEST-SUPER-SECRET-KEY-999');
        $viewConfig = $indexResp->viewData('config');
        $this->assertIsArray($viewConfig);
        $this->assertArrayNotHasKey('api_key', $viewConfig);
        $this->assertTrue($viewConfig['has_api_key']);

        // Enforces MAX_AI_TURNS_PER_CONVERSATION automatic handoff
        SystemSetting::set('crm_ai_enabled', '1', 'crm_ai');
        SystemSetting::set('crm_ai_api_key', '', 'crm_ai');
        AutonomousCrmAgent::flushCache();

        $client = Client::factory()->create(['status' => 'lead']);
        $conv = Conversation::create([
            'client_id' => $client->id,
            'subject' => 'Chat Longo',
            'channel' => 'website_chat',
            'status' => 'open',
            'ai_enabled' => true,
            'crm_stage' => 'qualifying',
        ]);

        for ($i = 0; $i < 30; $i++) {
            ConversationMessage::create([
                'conversation_id' => $conv->id,
                'sender_type' => 'staff',
                'sender_name' => 'Assistente IA GundjaTech',
                'message' => 'Resposta IA #'.$i,
                'is_ai' => true,
                'is_read' => true,
            ]);
        }

        $agent = app(AutonomousCrmAgent::class);
        $reply = $agent->handleIncomingVisitorMessage($conv, 'Mais uma pergunta no turno 31');

        $this->assertNull($reply);
        $conv->refresh();
        $this->assertFalse($conv->ai_enabled);
        $this->assertSame('waiting_staff', $conv->status);
        $this->assertSame('handoff_human', $conv->crm_stage);
    }

    public function test_self_service_account_updates_profile_and_password_and_revokes_other_sessions(): void
    {
        $user = User::factory()->create([
            'role' => UserRole::Client->value,
            'email' => 'conta.teste@example.com',
            'password' => Hash::make('OldPass1234!'),
            'is_active' => true,
        ]);
        $client = Client::factory()->create([
            'user_id' => $user->id,
            'email' => 'conta.teste@example.com',
            'status' => 'active',
        ]);

        $this->actingAs($user);

        $this->get('/minha-conta')->assertOk();

        // Update profile (syncs name, phone & company_name to client; ignores email tampering)
        $this->from('/minha-conta')->put('/minha-conta/perfil', [
            'name' => 'Cliente Atualizado',
            'email' => 'CONTA.NOVA@EXAMPLE.COM',
            'phone' => '(11) 98765-4321',
            'company_name' => 'Gundja Partner Tech',
        ])->assertRedirect('/minha-conta')->assertSessionHas('success');

        $user->refresh();
        $client->refresh();
        $this->assertSame('Cliente Atualizado', $user->name);
        $this->assertSame('(11) 98765-4321', $user->phone);
        $this->assertSame('conta.teste@example.com', $user->email);
        $this->assertSame('Cliente Atualizado', $client->name);
        $this->assertSame('Gundja Partner Tech', $client->company_name);

        // Wrong current password rejected
        $this->from('/minha-conta')->put('/minha-conta/senha', [
            'current_password' => 'SenhaErrada!',
            'password' => 'NewPass5678!',
            'password_confirmation' => 'NewPass5678!',
        ])->assertSessionHasErrors('current_password');

        // Insert another active session row to verify revocation on password change
        DB::table('sessions')->insert([
            'id' => 'other-device-session-id',
            'user_id' => $user->id,
            'ip_address' => '203.0.113.42',
            'user_agent' => 'OtherDevice/1.0',
            'payload' => base64_encode('a:0:{}'),
            'last_activity' => time(),
        ]);

        $this->from('/minha-conta')->put('/minha-conta/senha', [
            'current_password' => 'OldPass1234!',
            'password' => 'NewPass5678!',
            'password_confirmation' => 'NewPass5678!',
        ])->assertRedirect('/minha-conta')->assertSessionHas('success');

        $this->assertTrue(Hash::check('NewPass5678!', $user->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'other-device-session-id']);
    }

    public function test_public_inactive_service_returns_404_and_lowercase_protocol_lookup_succeeds(): void
    {
        $category = ServiceCategory::firstOrFail();
        $inactiveService = Service::create([
            'category_id' => $category->id,
            'name' => 'Servico Desativado Interno',
            'slug' => 'servico-desativado-interno',
            'short_description' => 'Nao deve aparecer',
            'description' => 'Detalhes internos',
            'starting_price' => 1000,
            'estimated_delivery_days' => 10,
            'is_active' => false,
            'is_featured' => false,
        ]);

        $this->get('/servicos/'.$inactiveService->slug)->assertNotFound();

        $request = ServiceRequest::factory()->create([
            'protocol' => 'GNDJ-20261120-ABCD',
            'service_title' => 'Landing Page Corporativa',
            'status' => 'analyzing',
        ]);

        $this->get('/acompanhar-solicitacao?protocol=gndj-20261120-abcd')
            ->assertOk()
            ->assertSee($request->protocol)
            ->assertSee('Landing Page Corporativa');
    }
}
