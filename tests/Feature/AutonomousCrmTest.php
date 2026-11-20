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

        // Admin quotation detail renders full recipient & contact details + WhatsApp link
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $this->actingAs($admin)
            ->get(route('admin.quotations.show', $quotation))
            ->assertStatus(200)
            ->assertSee('Destinatário &amp; Contato', false)
            ->assertSee('Beatriz Nogueira')
            ->assertSee('Aurora Moda')
            ->assertSee('beatriz@auroramoda.com')
            ->assertSee('(11) 98765-1122')
            ->assertSee('https://wa.me/5511987651122', false)
            ->assertSee('Abrir Conversa no Chat');
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

        $this->actingAs($attendant)
            ->post('/admin/crm-autonomo/testar')
            ->assertStatus(403);
    }

    public function test_vertex_ai_express_aq_key_routes_to_aiplatform_and_connection_tester_reports_status(): void
    {
        $this->seed(ProductionSeeder::class);
        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();

        SystemSetting::set('crm_ai_provider', 'gemini', 'crm_ai');
        SystemSetting::set('crm_ai_model', 'gemini-2.5-flash', 'crm_ai');
        SystemSetting::set('crm_ai_api_key', Crypt::encryptString('AQ.TestVertexExpressKey12345'), 'crm_ai');

        Http::fake([
            'aiplatform.googleapis.com/*' => Http::sequence()
                ->push([
                    'candidates' => [[
                        'content' => [
                            'parts' => [[
                                'text' => json_encode([
                                    'reply' => 'Olá via Vertex AI Express! Qual é o objetivo do seu sistema?',
                                    'crm_stage' => 'qualifying',
                                    'lead_score' => 68,
                                    'summary' => 'Lead atendido via Vertex AI Express.',
                                    'handoff_to_human' => false,
                                    'handoff_reason' => null,
                                    'create_draft_quotation' => false,
                                    'extracted' => [
                                        'company' => 'Kwanza Digital',
                                        'project_type' => 'Sistema Web Sob Medida',
                                        'service_slug' => 'sistema-web-sob-medida',
                                    ],
                                ]),
                            ]],
                        ],
                    ]],
                ], 200)
                ->push([
                    'error' => [
                        'code' => 403,
                        'message' => 'Agent Platform API has not been used in project 739817877452 before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/aiplatform.googleapis.com/overview?project=739817877452 then retry.',
                    ],
                ], 403)
                ->push([
                    'candidates' => [[
                        'content' => [
                            'parts' => [['text' => '{"ok": true}']],
                        ],
                    ]],
                ], 200),
        ]);

        // 1. Live chat message routes AQ. key to aiplatform.googleapis.com with x-goog-api-key header
        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Pedro Silva',
            'email' => 'pedro@kwanzadigital.com',
            'telefone' => '(11) 92222-3333',
            'assunto' => 'Sistema Web',
            'mensagem' => 'Queremos um sistema web de gestão.',
        ]);

        $start->assertStatus(201)
            ->assertJsonPath('ai_reply.message', 'Olá via Vertex AI Express! Qual é o objetivo do seu sistema?')
            ->assertJsonPath('lead_score', 68);

        Http::assertSent(static function ($request): bool {
            return str_contains($request->url(), 'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent')
                && $request->hasHeader('x-goog-api-key', 'AQ.TestVertexExpressKey12345');
        });

        // 2. Admin connection test detects disabled Vertex AI API and surfaces enable URL
        $this->actingAs($admin)
            ->post('/admin/crm-autonomo/testar')
            ->assertRedirect(route('admin.crm.index'))
            ->assertSessionHas('crm_test_result', static function (array $result): bool {
                return $result['ok'] === false
                    && str_contains((string) $result['action_url'], 'aiplatform.googleapis.com/overview?project=739817877452');
            });

        // 3. Admin connection test succeeds once enabled
        $this->actingAs($admin)
            ->post('/admin/crm-autonomo/testar')
            ->assertRedirect(route('admin.crm.index'))
            ->assertSessionHas('crm_test_result', static function (array $result): bool {
                return $result['ok'] === true && $result['mode'] === 'vertex_express';
            });
    }

    public function test_admin_can_delete_chat_conversation_with_cascade_messages_and_rbac(): void
    {
        $this->seed(DatabaseSeeder::class);

        $admin = User::where('role', UserRole::SuperAdmin->value)->firstOrFail();
        $financialUser = User::where('email', 'financeiro@gundjatech.com')->firstOrFail();

        $start = $this->postJson('/api/chat/start', [
            'nome' => 'Visitante Descartavel',
            'email' => 'descartavel@teste.com',
            'telefone' => '(19) 95324-8420',
            'assunto' => 'Teste de limpeza',
            'mensagem' => 'Mensagem de teste para exclusao.',
        ])->assertStatus(201);

        $convId = (int) $start->json('conversation_id');
        $this->assertDatabaseHas('conversations', ['id' => $convId]);
        $this->assertDatabaseHas('conversation_messages', ['conversation_id' => $convId]);

        // Both /admin/atendimento and /admin/crm-autonomo render confirmation modal attributes
        $this->actingAs($admin)
            ->get(route('admin.chat.index', ['conversation_id' => $convId]))
            ->assertStatus(200)
            ->assertSee('data-confirm-title="Excluir atendimento"', false);

        $this->actingAs($admin)
            ->get(route('admin.crm.index'))
            ->assertStatus(200)
            ->assertSee('data-confirm-title="Excluir atendimento"', false);

        // Unauthorized staff (lacks chat.manage) gets 403
        $this->actingAs($financialUser)
            ->delete(route('admin.chat.destroy', $convId))
            ->assertStatus(403);

        // Authorized admin deletes conversation + cascades messages + records audit log
        $this->actingAs($admin)
            ->delete(route('admin.chat.destroy', $convId))
            ->assertRedirect(route('admin.chat.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('conversations', ['id' => $convId]);
        $this->assertDatabaseMissing('conversation_messages', ['conversation_id' => $convId]);
        $this->assertDatabaseHas('activity_logs', [
            'action' => 'chat.deleted',
            'subject_id' => $convId,
        ]);
    }
}
