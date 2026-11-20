<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Conversation;
use App\Models\Quotation;
use App\Models\ServiceRequest;
use App\Models\SystemSetting;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ProductionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AutonomousCrmTest extends TestCase
{
    use RefreshDatabase;

    public function test_autonomous_crm_qualifies_visitor_and_auto_drafts_quotation_without_human_intervention(): void
    {
        $this->seed(ProductionSeeder::class);

        // 1. Visitor starts chat seeking an e-commerce store
        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Beatriz Nogueira',
            'email' => 'beatriz@auroramoda.com',
            'telefone' => '(11) 98765-1122',
            'assunto' => 'Quero uma loja virtual',
            'mensagem' => 'Interesse informado no chat: Quero uma loja virtual',
            'tema' => 'geral',
        ]);

        $start->assertStatus(201)
            ->assertJson([
                'ok' => true,
                'ai_enabled' => true,
                'crm_stage' => 'qualifying',
            ])
            ->assertJsonStructure(['ai_reply' => ['id', 'message', 'is_ai']]);

        $this->assertTrue((bool) $start->json('ai_reply.is_ai'));
        $token = (string) $start->json('visitor_token');
        $convId = (int) $start->json('conversation_id');

        // 2. Visitor provides company, scope, budget, and deadline autonomously
        $msgResp = $this->postJson('/api/chat/message', [
            'visitor_token' => $token,
            'message' => 'Nossa empresa Aurora Moda em Luanda precisa de um e-commerce com pagamento online, prazo de 30 dias e orcamento de R$ 8.500.',
        ]);

        $msgResp->assertStatus(200)
            ->assertJson([
                'ok' => true,
                'crm_stage' => 'proposal_ready',
                'status' => 'waiting_staff',
            ])
            ->assertJsonStructure(['ai_reply' => ['id', 'message', 'is_ai']]);

        $conversation = Conversation::with(['client', 'serviceRequest'])->findOrFail($convId);
        $this->assertGreaterThanOrEqual(80, $conversation->lead_score);
        $this->assertNotEmpty($conversation->ai_summary);
        $this->assertSame('Aurora Moda', $conversation->extracted_data['company'] ?? null);
        $this->assertEquals(8500.0, (float) ($conversation->extracted_data['estimated_budget'] ?? 0));
        $this->assertSame(30, (int) ($conversation->extracted_data['desired_deadline_days'] ?? 0));

        // Linked ServiceRequest enriched automatically
        $serviceRequest = ServiceRequest::findOrFail($conversation->service_request_id);
        $this->assertEquals(8500.0, (float) $serviceRequest->estimated_budget);
        $this->assertSame('analyzing', $serviceRequest->status);

        // Draft Quotation auto-generated in /admin/orcamentos
        $quotationId = $conversation->extracted_data['draft_quotation_id'] ?? null;
        $this->assertNotNull($quotationId);
        $quotation = Quotation::with('items')->findOrFail($quotationId);
        $this->assertSame('draft', $quotation->status);
        $this->assertStringStartsWith('ORC-AI-', $quotation->quotation_number);
        $this->assertSame(1, $quotation->items->count());
    }

    public function test_autonomous_crm_triggers_human_handoff_on_emergency_or_director_request(): void
    {
        $this->seed(ProductionSeeder::class);

        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Carlos Eduardo',
            'email' => 'carlos@segurocorp.com',
            'telefone' => '(11) 94444-3333',
            'assunto' => 'Ciberseguranca',
            'mensagem' => 'Urgente! Meu site foi invadido e esta fora do ar agora.',
            'tema' => 'seguranca',
        ]);

        $start->assertStatus(201)
            ->assertJson([
                'ok' => true,
                'ai_enabled' => false,
                'crm_stage' => 'handoff_human',
                'status' => 'waiting_staff',
            ]);

        $conv = Conversation::findOrFail($start->json('conversation_id'));
        $this->assertFalse($conv->ai_enabled);
        $this->assertNotEmpty($conv->ai_handoff_reason);
    }

    public function test_human_takeover_pauses_ai_and_toggle_ai_resumes_autopilot(): void
    {
        $this->seed(ProductionSeeder::class);
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();

        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Juliana Costa',
            'email' => 'juliana@costaadv.com',
            'telefone' => '(11) 93333-2222',
            'assunto' => 'Quero um site novo',
            'mensagem' => 'Interesse informado no chat: Quero um site novo',
        ]);

        $token = (string) $start->json('visitor_token');
        $convId = (int) $start->json('conversation_id');
        $this->assertTrue((bool) $start->json('ai_enabled'));

        // Human staff sends reply -> automatically disables AI autopilot
        $this->actingAs($admin)
            ->postJson("/admin/atendimento/{$convId}/mensagem", [
                'message' => 'Oi Juliana, aqui e o Casimiro, vou te atender pessoalmente.',
            ])
            ->assertStatus(200)
            ->assertJson(['ai_enabled' => false]);

        // Visitor replies -> AI MUST NOT interrupt human attendant
        $visitorReply = $this->postJson('/api/chat/message', [
            'visitor_token' => $token,
            'message' => 'Obrigada Casimiro, quero conversar sobre o prazo.',
        ]);
        $visitorReply->assertStatus(200)
            ->assertJson(['ai_enabled' => false, 'ai_reply' => null]);

        // Staff re-enables autopilot via toggle-ai
        $this->actingAs($admin)
            ->post("/admin/atendimento/{$convId}/toggle-ai")
            ->assertRedirect(route('admin.chat.index', ['conversation_id' => $convId]));

        $this->assertDatabaseHas('conversations', ['id' => $convId, 'ai_enabled' => true]);

        // Next visitor message gets autonomous AI reply again
        $resumed = $this->postJson('/api/chat/message', [
            'visitor_token' => $token,
            'message' => 'Qual o valor medio de um site institucional?',
        ]);
        $resumed->assertStatus(200)
            ->assertJson(['ai_enabled' => true])
            ->assertJsonPath('ai_reply.is_ai', true);
    }

    public function test_gemini_api_integration_parses_structured_json_and_falls_back_gracefully_on_error(): void
    {
        $this->seed(ProductionSeeder::class);

        SystemSetting::set('crm_ai_provider', 'gemini', 'crm_ai');
        SystemSetting::set('crm_ai_model', 'gemini-2.5-flash', 'crm_ai');
        SystemSetting::set('crm_ai_api_key', Crypt::encryptString('fake-gemini-key-123'), 'crm_ai');

        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::sequence()
                ->push([
                    'candidates' => [[
                        'content' => [
                            'parts' => [[
                                'text' => json_encode([
                                    'reply' => 'Excelente projeto para a TechNova! Qual prazo ideal voce planeja?',
                                    'crm_stage' => 'qualifying',
                                    'lead_score' => 72,
                                    'summary' => 'TechNova busca site institucional corporativo.',
                                    'handoff_to_human' => false,
                                    'handoff_reason' => null,
                                    'create_draft_quotation' => false,
                                    'extracted' => [
                                        'company' => 'TechNova',
                                        'project_type' => 'Site Institucional Premium',
                                        'service_slug' => 'site-institucional-premium',
                                    ],
                                ]),
                            ]],
                        ],
                    ]],
                ], 200)
                ->push(['error' => 'Rate limited'], 500),
        ]);

        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Rafael Lima',
            'email' => 'rafael@technova.com',
            'telefone' => '(11) 91111-2222',
            'assunto' => 'Site Corporativo',
            'mensagem' => 'Somos da TechNova e queremos refazer o site institucional.',
        ]);

        $start->assertStatus(201)
            ->assertJsonPath('ai_reply.message', 'Excelente projeto para a TechNova! Qual prazo ideal voce planeja?')
            ->assertJsonPath('lead_score', 72);

        $token = (string) $start->json('visitor_token');

        // Second call hits mocked HTTP 500 -> must seamlessly fall back to local motor and still reply!
        $fallbackResp = $this->postJson('/api/chat/message', [
            'visitor_token' => $token,
            'message' => 'Precisamos para 20 dias com orcamento de R$ 5.000.',
        ]);

        $fallbackResp->assertStatus(200)
            ->assertJsonPath('ai_reply.is_ai', true);
        $this->assertNotEmpty($fallbackResp->json('ai_reply.message'));
    }

    public function test_admin_autonomous_crm_dashboard_and_encrypted_settings_enforce_rbac(): void
    {
        $this->seed(DatabaseSeeder::class);

        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $attendant = User::where('email', 'atendimento@gundjatech.com')->firstOrFail();

        // SuperAdmin views hub and updates settings
        $this->actingAs($admin)
            ->get('/admin/crm-autonomo')
            ->assertStatus(200)
            ->assertSee('Pipeline de Qualificação Autônoma');

        $this->actingAs($admin)
            ->put('/admin/crm-autonomo/configuracoes', [
                'crm_ai_enabled' => '1',
                'crm_ai_auto_draft_quotation' => '1',
                'crm_ai_provider' => 'gemini',
                'crm_ai_model' => 'gemini-2.5-flash',
                'crm_ai_agent_name' => 'Consultor IA GundjaTech',
                'crm_ai_system_prompt' => 'Atue como consultor comercial da GundjaTech.',
                'crm_ai_api_key' => 'AIzaSyTestSecretKey999',
            ])
            ->assertRedirect(route('admin.crm.index'));

        $storedEncrypted = (string) SystemSetting::get('crm_ai_api_key');
        $this->assertNotSame('AIzaSyTestSecretKey999', $storedEncrypted);
        $this->assertSame('AIzaSyTestSecretKey999', Crypt::decryptString($storedEncrypted));

        // Attendant can view /admin/crm-autonomo (has chat.view) but CANNOT modify settings (lacks settings.manage)
        $this->actingAs($attendant)
            ->get('/admin/crm-autonomo')
            ->assertStatus(200);

        $this->actingAs($attendant)
            ->put('/admin/crm-autonomo/configuracoes', [
                'crm_ai_provider' => 'rules',
                'crm_ai_agent_name' => 'Hack',
                'crm_ai_system_prompt' => 'Hack',
            ])
            ->assertStatus(403);
    }
}
