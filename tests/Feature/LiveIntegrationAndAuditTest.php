<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\BlogPost;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ProductionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LiveIntegrationAndAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_lead_api_creates_request_attachment_lead_client_activity_and_appears_on_admin_dashboard(): void
    {
        $this->seed(ProductionSeeder::class);
        Storage::fake('local');

        $attachment = UploadedFile::fake()->create('briefing-site.pdf', 120, 'application/pdf');

        $response = $this->post('/api/lead', [
            'nome' => 'Ana Beatriz',
            'email' => 'ana.beatriz@empresa-real.com',
            'telefone' => '(11) 98888-7777',
            'empresa' => 'Empresa Real Ltda',
            'site' => 'https://empresa-real.com',
            'origem' => 'pagina-contato',
            'mensagem' => 'Precisamos de um novo portal corporativo com area do cliente.',
            'arquivo' => $attachment,
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertStatus(200)
            ->assertJson(['ok' => true])
            ->assertJsonStructure(['ok', 'protocol', 'track_url']);

        $protocol = (string) $response->json('protocol');
        $this->assertNotEmpty($protocol);

        $serviceRequest = ServiceRequest::where('protocol', $protocol)->firstOrFail();
        $this->assertSame('ana.beatriz@empresa-real.com', $serviceRequest->email);
        $this->assertNotNull($serviceRequest->client_id);
        $this->assertSame(1, $serviceRequest->attachments()->count());
        $this->assertDatabaseHas('clients', [
            'email' => 'ana.beatriz@empresa-real.com',
            'status' => 'lead',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'public.lead.created',
            'subject_id' => $serviceRequest->id,
        ]);

        $this->get('/acompanhar-solicitacao?protocol='.$protocol)
            ->assertStatus(200)
            ->assertSee($protocol)
            ->assertSee('Solicitação Digital (pagina-contato)')
            ->assertDontSee('ana.beatriz@empresa-real.com');

        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($admin)
            ->get('/admin')
            ->assertStatus(200)
            ->assertSee($protocol)
            ->assertSee('Ana Beatriz');
    }

    public function test_public_lead_api_still_saves_request_even_when_services_catalog_is_empty(): void
    {
        $this->seed(ProductionSeeder::class);
        Service::query()->delete();

        $response = $this->postJson('/api/lead', [
            'nome' => 'Lead Sem Servico',
            'email' => 'semservico@empresa.com',
            'telefone' => '(11) 97777-6666',
            'origem' => 'home',
            'mensagem' => 'Contato enviado mesmo sem servico cadastrado.',
        ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);

        $this->assertDatabaseHas('service_requests', [
            'protocol' => $response->json('protocol'),
            'email' => 'semservico@empresa.com',
            'service_id' => null,
        ]);
    }

    public function test_public_chat_end_to_end_two_way_flow_with_admin_panel_and_dashboard(): void
    {
        $this->seed(ProductionSeeder::class);

        // 1. Visitor starts live chat from the public website widget
        $startResp = $this->postJson('/api/chat/start', [
            'nome' => 'Marcos Paulo',
            'email' => 'marcos@horizontetech.com',
            'telefone' => '(11) 96666-5555',
            'assunto' => 'Quero um site novo',
            'mensagem' => 'Ola, quero conversar sobre um portal sob medida.',
            'tema' => 'geral',
        ]);

        $startResp->assertStatus(201)
            ->assertJson(['ok' => true])
            ->assertJsonStructure(['ok', 'conversation_id', 'visitor_token', 'protocol', 'messages']);

        $token = (string) $startResp->json('visitor_token');
        $conversationId = (int) $startResp->json('conversation_id');
        $lastInitialMessageId = (int) collect($startResp->json('messages'))->max('id');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversationId,
            'channel' => 'website_chat',
            'ai_enabled' => true,
            'visitor_email' => 'marcos@horizontetech.com',
        ]);

        // 2. SuperAdmin sees the conversation on Dashboard and Admin Chat ('open' and 'ai_active' tabs)
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();

        $this->actingAs($admin)
            ->get('/admin')
            ->assertStatus(200)
            ->assertSee('Marcos Paulo');

        $this->actingAs($admin)
            ->get('/admin/atendimento?status=open')
            ->assertStatus(200)
            ->assertSee('Marcos Paulo')
            ->assertSee('Quero um site novo');

        $this->actingAs($admin)
            ->get('/admin/atendimento?status=ai_active')
            ->assertStatus(200)
            ->assertSee('Marcos Paulo');

        // 3. Admin sends a real-time reply (automatically takes over from AI)
        $this->actingAs($admin)
            ->post("/admin/atendimento/{$conversationId}/mensagem", [
                'message' => 'Ola Marcos! Nossa diretoria esta online para te atender agora.',
            ])
            ->assertRedirect(route('admin.chat.index', ['conversation_id' => $conversationId]));

        // 4. Public visitor polls for staff replies using visitor_token
        $pollVisitor = $this->getJson('/api/chat/messages?token='.$token.'&after_id='.$lastInitialMessageId);
        $pollVisitor->assertStatus(200)
            ->assertJson(['ok' => true])
            ->assertJsonFragment([
                'sender_type' => 'staff',
                'message' => 'Ola Marcos! Nossa diretoria esta online para te atender agora.',
            ]);

        $staffMsgId = (int) $pollVisitor->json('messages.0.id');

        // 5. Public visitor sends follow-up live message (AI paused after human takeover -> waiting_staff)
        $followUp = $this->postJson('/api/chat/message', [
            'visitor_token' => $token,
            'message' => 'Perfeito! Podemos agendar uma demonstracao hoje as 15h?',
        ]);
        $followUp->assertStatus(200)
            ->assertJson(['ok' => true, 'status' => 'waiting_staff', 'ai_enabled' => false]);

        // 6. Admin polls for visitor follow-up via live endpoint
        $this->actingAs($admin)
            ->getJson("/admin/atendimento/{$conversationId}/mensagens?after_id={$staffMsgId}")
            ->assertStatus(200)
            ->assertJson(['ok' => true])
            ->assertJsonFragment([
                'sender_type' => 'client',
                'message' => 'Perfeito! Podemos agendar uma demonstracao hoje as 15h?',
            ]);

        // 7. Admin polls live sidebar summary endpoint (/admin/atendimento/resumo)
        $this->actingAs($admin)
            ->getJson('/admin/atendimento/resumo?status=waiting_staff')
            ->assertStatus(200)
            ->assertJson([
                'ok' => true,
                'open_chats' => 1,
                'waiting_staff' => 1,
            ])
            ->assertJsonFragment([
                'id' => $conversationId,
                'name' => 'Marcos Paulo',
                'channel_label' => 'Site',
            ]);

        // 8. Admin sends AJAX JSON reply without full page reload
        $this->actingAs($admin)
            ->postJson("/admin/atendimento/{$conversationId}/mensagem", [
                'message' => 'Confirmado para as 15h!',
            ])
            ->assertStatus(200)
            ->assertJson([
                'ok' => true,
                'status' => 'waiting_client',
            ])
            ->assertJsonFragment([
                'message' => 'Confirmado para as 15h!',
            ]);
    }

    public function test_public_chat_rejects_invalid_visitor_token(): void
    {
        $this->seed(ProductionSeeder::class);

        $this->getJson('/api/chat/messages?token='.str_repeat('a', 48))
            ->assertStatus(404)
            ->assertJson(['ok' => false]);

        $this->postJson('/api/chat/message', [
            'visitor_token' => str_repeat('b', 48),
            'message' => 'Tentativa invalida',
        ])->assertStatus(404)->assertJson(['ok' => false]);
    }

    public function test_portal_and_admin_chat_polling_enforce_rbac_and_tenant_isolation(): void
    {
        $this->seed(DatabaseSeeder::class);

        $clientUser1 = User::where('email', 'cliente@acmecorp.com')->firstOrFail();
        $clientUser2 = User::where('email', 'contato@innovasolutions.com')->firstOrFail();
        $financialUser = User::where('email', 'financeiro@gundjatech.com')->firstOrFail();

        $conv1 = Conversation::where('client_id', $clientUser1->client->id)->firstOrFail();

        // Client 2 cannot poll Client 1's conversation
        $this->actingAs($clientUser2)
            ->getJson("/portal/atendimento/{$conv1->id}/mensagens")
            ->assertStatus(403);

        // Client 1 can poll their own conversation
        $this->actingAs($clientUser1)
            ->getJson("/portal/atendimento/{$conv1->id}/mensagens")
            ->assertStatus(200)
            ->assertJson(['ok' => true]);

        // Financial user lacks chat.view permission and cannot poll admin chat or summary
        $this->actingAs($financialUser)
            ->getJson("/admin/atendimento/{$conv1->id}/mensagens")
            ->assertStatus(403);

        $this->actingAs($financialUser)
            ->getJson('/admin/atendimento/resumo')
            ->assertStatus(403);
    }

    public function test_admin_dashboard_on_clean_production_database_shows_zero_fictitious_data_and_exports_csv(): void
    {
        $this->seed(ProductionSeeder::class);

        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();

        $resp = $this->actingAs($admin)->get('/admin');
        $resp->assertStatus(200)
            ->assertSee('Visão Geral Executiva')
            ->assertSee('R$ 0,00')
            ->assertDontSee('380.000')
            ->assertDontSee('23.123')
            ->assertDontSee('+ 54,5%')
            ->assertDontSee('+ 23,5%')
            ->assertDontSee('+ 42,9%')
            ->assertDontSee('+ 32,8%')
            ->assertDontSee('Comparativo')
            ->assertDontSee('903');

        // Period filters render cleanly
        $this->actingAs($admin)->get('/admin?period=7')->assertStatus(200);
        $this->actingAs($admin)->get('/admin?period=90')->assertStatus(200);

        // CSV Export works for authorized admin
        $csvResp = $this->actingAs($admin)->get('/admin/relatorio/exportar?period=30');
        $csvResp->assertStatus(200);
        $this->assertStringContainsString('text/csv', (string) $csvResp->headers->get('content-type'));
        $content = $csvResp->streamedContent();
        $this->assertStringContainsString('Relatorio Executivo GundjaTech', $content);

        // Unprivileged client cannot export admin report (redirected to portal)
        $clientUser = User::create([
            'name' => 'Cliente Comum',
            'email' => 'cliente-comum@teste.com',
            'password' => bcrypt('secret123'),
            'role' => UserRole::Client->value,
            'is_active' => true,
        ]);
        $this->actingAs($clientUser)
            ->get('/admin/relatorio/exportar')
            ->assertRedirect(route('portal.dashboard'));
    }

    public function test_guest_lead_requests_link_to_client_portal_when_visitor_registers(): void
    {
        $this->seed(ProductionSeeder::class);

        $leadResp = $this->postJson('/api/lead', [
            'nome' => 'Helena Sousa',
            'email' => 'helena@novanegocio.com',
            'telefone' => '(11) 95555-4444',
            'empresa' => 'Nova Negocio SA',
            'origem' => 'home',
            'mensagem' => 'Gostaria de um orcamento para plataforma web.',
        ]);
        $leadResp->assertStatus(200);
        $protocol = (string) $leadResp->json('protocol');

        $this->post('/cadastro', [
            'name' => 'Helena Sousa',
            'email' => 'helena@novanegocio.com',
            'company_name' => 'Nova Negocio SA',
            'phone' => '(11) 95555-4444',
            'password' => 'SenhaSegura@2026',
            'password_confirmation' => 'SenhaSegura@2026',
        ])->assertRedirect(route('portal.dashboard'));

        $this->get('/portal/solicitacoes')
            ->assertStatus(200)
            ->assertSee($protocol);

        $this->assertDatabaseHas('clients', [
            'email' => 'helena@novanegocio.com',
            'status' => 'active',
        ]);
    }

    public function test_clean_demo_data_command_removes_seeded_fixtures_while_preserving_superadmin_and_real_leads(): void
    {
        $this->seed(DatabaseSeeder::class);

        // Insert a real production lead that MUST be preserved
        $realClient = Client::create([
            'name' => 'Joao Real',
            'company_name' => 'Real Tech Angola',
            'email' => 'joao@realtech.ao',
            'status' => 'active',
        ]);
        $realReq = ServiceRequest::create([
            'protocol' => 'GNDJ-REAL-0001',
            'client_id' => $realClient->id,
            'name' => 'Joao Real',
            'email' => 'joao@realtech.ao',
            'service_title' => 'Projeto Real',
            'description' => 'Demanda autentica do cliente.',
            'status' => 'new',
        ]);

        $this->artisan('gundjatech:clean-demo-data', ['--force' => true])
            ->assertSuccessful();

        // Demo records deleted
        $this->assertDatabaseMissing('clients', ['email' => 'cliente@acmecorp.com']);
        $this->assertDatabaseMissing('service_requests', ['protocol' => 'GJT-2026-0001']);
        $this->assertDatabaseMissing('users', ['email' => 'gerente@gundjatech.com']);

        // Real records, SuperAdmin, catalog, and blog posts preserved
        $this->assertDatabaseHas('users', ['email' => 'admin@gundjatech.com', 'role' => 'superadmin']);
        $this->assertDatabaseHas('clients', ['id' => $realClient->id, 'email' => 'joao@realtech.ao']);
        $this->assertDatabaseHas('service_requests', ['id' => $realReq->id, 'protocol' => 'GNDJ-REAL-0001']);
        $this->assertGreaterThanOrEqual(2, BlogPost::count());
        $this->assertGreaterThanOrEqual(6, Service::count());
    }

    public function test_admin_can_cancel_and_delete_service_requests_with_rbac_and_attachment_cleanup(): void
    {
        $this->seed(DatabaseSeeder::class);
        Storage::fake('local');

        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $financialUser = User::where('email', 'financeiro@gundjatech.com')->firstOrFail();

        $serviceRequest = ServiceRequest::create([
            'protocol' => 'CHAT-20261120-TEST',
            'name' => 'Teste Limpeza',
            'email' => 'teste-limpeza@exemplo.com',
            'service_title' => 'Solicitação de teste para limpeza',
            'description' => 'Registro de teste a cancelar e excluir.',
            'status' => 'new',
        ]);

        Storage::disk('local')->put('requests/test-briefing.pdf', 'pdf-bytes');
        $serviceRequest->attachments()->create([
            'file_name' => 'test-briefing.pdf',
            'file_path' => 'requests/test-briefing.pdf',
            'file_type' => 'application/pdf',
            'file_size' => 9,
        ]);

        // Index renders custom confirmation modal attributes (no native confirm())
        $this->actingAs($admin)
            ->get('/admin/solicitacoes')
            ->assertStatus(200)
            ->assertSee('data-confirm-title="Cancelar solicitação"', false)
            ->assertSee('data-confirm-title="Excluir solicitação"', false)
            ->assertDontSee('return confirm(', false);

        // Unauthorized staff (lacks requests.manage) gets 403 on cancel & destroy
        $this->actingAs($financialUser)
            ->post("/admin/solicitacoes/{$serviceRequest->id}/cancelar")
            ->assertStatus(403);

        $this->actingAs($financialUser)
            ->delete("/admin/solicitacoes/{$serviceRequest->id}")
            ->assertStatus(403);

        // Authorized admin cancels the request
        $this->actingAs($admin)
            ->post("/admin/solicitacoes/{$serviceRequest->id}/cancelar")
            ->assertRedirect();

        $this->assertDatabaseHas('service_requests', [
            'id' => $serviceRequest->id,
            'status' => 'cancelled',
        ]);
        $this->assertDatabaseHas('request_status_histories', [
            'service_request_id' => $serviceRequest->id,
            'new_status' => 'cancelled',
        ]);

        // Authorized admin permanently deletes the request + cascades histories/attachments + cleans file
        $this->actingAs($admin)
            ->delete("/admin/solicitacoes/{$serviceRequest->id}")
            ->assertRedirect(route('admin.requests.index'));

        $this->assertDatabaseMissing('service_requests', ['id' => $serviceRequest->id]);
        $this->assertDatabaseMissing('request_status_histories', ['service_request_id' => $serviceRequest->id]);
        $this->assertDatabaseMissing('request_attachments', ['service_request_id' => $serviceRequest->id]);
        Storage::disk('local')->assertMissing('requests/test-briefing.pdf');
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'request.deleted',
            'subject_id' => $serviceRequest->id,
        ]);
    }

    public function test_admin_can_delete_other_users_safely_with_confirmation_modal_and_self_protection(): void
    {
        $this->seed(DatabaseSeeder::class);

        $superAdmin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $attendant = User::where('email', 'atendimento@gundjatech.com')->firstOrFail();

        // /admin/usuarios renders confirmation modal attributes for other users
        $this->actingAs($superAdmin)
            ->get('/admin/usuarios')
            ->assertStatus(200)
            ->assertSee('data-confirm-title="Excluir usuário"', false)
            ->assertDontSee('return confirm(', false);

        // Unauthorized attendant (lacks users.manage) gets 403
        $this->actingAs($attendant)
            ->delete("/admin/usuarios/{$superAdmin->id}")
            ->assertStatus(403);

        // SuperAdmin CANNOT delete own logged-in account
        $this->actingAs($superAdmin)
            ->delete("/admin/usuarios/{$superAdmin->id}")
            ->assertRedirect()
            ->assertSessionHas('error');
        $this->assertDatabaseHas('users', ['id' => $superAdmin->id]);

        // SuperAdmin CAN delete another user cleanly (even if user authored content/quotations)
        $this->actingAs($superAdmin)
            ->delete("/admin/usuarios/{$attendant->id}")
            ->assertRedirect(route('admin.users.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('users', ['id' => $attendant->id]);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'user.deleted',
            'subject_id' => $attendant->id,
        ]);
    }
}
