<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\PortfolioProject;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AutonomousCrmAgent
{
    public const DEFAULT_SYSTEM_PROMPT = 'Você é o Assistente Comercial Sênior da GundjaTech (engenharia digital, criação de sites sob medida, sistemas web, cibersegurança, gestão de domínios e tráfego pago). Converse em português de forma clara, executiva, acolhedora e objetiva (máximo 3 frases por resposta). Use apenas os serviços, preços base e cases reais informados no contexto. Qualifique o visitante fazendo uma pergunta de cada vez (projeto/objetivo, empresa, prazo desejado e faixa de investimento) para montar o pré-orçamento no CRM. Se o visitante relatar emergência (site invadido/fora do ar), pedir desconto, quiser fechar contrato ou pedir para falar com um humano/diretor, acione handoff_to_human=true.';

    public function isGloballyEnabled(): bool
    {
        $raw = SystemSetting::get('crm_ai_enabled');
        if ($raw === null) {
            return (bool) config('services.crm_ai.enabled', true);
        }

        return in_array(strtolower((string) $raw), ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function getConfig(): array
    {
        $enabled = $this->isGloballyEnabled();
        $provider = (string) (SystemSetting::get('crm_ai_provider') ?: config('services.crm_ai.provider', 'auto'));
        $agentName = (string) (SystemSetting::get('crm_ai_agent_name') ?: 'Assistente IA GundjaTech');
        $autoDraft = SystemSetting::get('crm_ai_auto_draft_quotation');
        $autoDraftBool = $autoDraft === null ? true : in_array(strtolower((string) $autoDraft), ['1', 'true', 'yes', 'on'], true);
        $systemPrompt = (string) (SystemSetting::get('crm_ai_system_prompt') ?: self::DEFAULT_SYSTEM_PROMPT);

        $storedKey = $this->decryptStoredApiKey();
        $geminiEnvKey = (string) (config('services.crm_ai.gemini_key') ?? '');
        $openaiEnvKey = (string) (config('services.crm_ai.openai_key') ?? '');

        $effectiveMode = 'rules';
        $activeKey = '';
        $defaultModel = (string) config('services.crm_ai.gemini_model', 'gemini-2.5-flash');

        if ($provider === 'gemini') {
            $activeKey = $storedKey !== '' ? $storedKey : $geminiEnvKey;
            $effectiveMode = $activeKey !== '' ? 'gemini' : 'rules';
            $defaultModel = (string) config('services.crm_ai.gemini_model', 'gemini-2.5-flash');
        } elseif ($provider === 'openai') {
            $activeKey = $storedKey !== '' ? $storedKey : $openaiEnvKey;
            $effectiveMode = $activeKey !== '' ? 'openai' : 'rules';
            $defaultModel = (string) config('services.crm_ai.openai_model', 'gpt-4o-mini');
        } elseif ($provider === 'auto') {
            if ($storedKey !== '') {
                $effectiveMode = str_starts_with($storedKey, 'sk-') ? 'openai' : 'gemini';
                $activeKey = $storedKey;
                $defaultModel = $effectiveMode === 'openai'
                    ? (string) config('services.crm_ai.openai_model', 'gpt-4o-mini')
                    : (string) config('services.crm_ai.gemini_model', 'gemini-2.5-flash');
            } elseif ($geminiEnvKey !== '') {
                $effectiveMode = 'gemini';
                $activeKey = $geminiEnvKey;
                $defaultModel = (string) config('services.crm_ai.gemini_model', 'gemini-2.5-flash');
            } elseif ($openaiEnvKey !== '') {
                $effectiveMode = 'openai';
                $activeKey = $openaiEnvKey;
                $defaultModel = (string) config('services.crm_ai.openai_model', 'gpt-4o-mini');
            }
        }

        $model = (string) (SystemSetting::get('crm_ai_model') ?: $defaultModel);

        return [
            'enabled' => $enabled,
            'provider' => $provider,
            'effective_mode' => $effectiveMode,
            'model' => $model,
            'api_key' => $activeKey,
            'has_api_key' => $activeKey !== '',
            'agent_name' => $agentName,
            'auto_draft_quotation' => $autoDraftBool,
            'system_prompt' => $systemPrompt,
        ];
    }

    public function handleIncomingVisitorMessage(Conversation $conversation, string $incomingMessage): ?ConversationMessage
    {
        $config = $this->getConfig();
        if (! $config['enabled'] || ! $conversation->ai_enabled || $conversation->status === 'closed') {
            return null;
        }

        $conversation->loadMissing(['client', 'serviceRequest', 'messages']);

        $services = Service::with('category')->where('is_active', true)->orderBy('id')->get();
        $cases = PortfolioProject::where('is_published', true)->orderBy('id')->take(5)->get();

        $decision = null;
        if ($config['effective_mode'] === 'gemini' && $config['api_key'] !== '') {
            $decision = $this->callGemini($conversation, $incomingMessage, $services, $cases, $config);
        } elseif ($config['effective_mode'] === 'openai' && $config['api_key'] !== '') {
            $decision = $this->callOpenAi($conversation, $incomingMessage, $services, $cases, $config);
        }

        if ($decision === null) {
            $decision = $this->runDeterministicEngine($conversation, $incomingMessage, $services, $cases);
        }

        return $this->applyDecision($conversation, $decision, $services, $config);
    }

    /**
     * @param  Collection<int, Service>  $services
     * @param  Collection<int, PortfolioProject>  $cases
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>|null
     */
    private function callGemini(Conversation $conversation, string $incomingMessage, $services, $cases, array $config): ?array
    {
        try {
            $model = trim((string) $config['model']) ?: 'gemini-2.5-flash';
            $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
            $prompt = $this->buildStructuredPrompt($conversation, $incomingMessage, $services, $cases, $config);

            $response = Http::timeout(12)
                ->withQueryParameters(['key' => $config['api_key']])
                ->post($endpoint, [
                    'contents' => [
                        [
                            'role' => 'user',
                            'parts' => [['text' => $prompt]],
                        ],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.35,
                        'responseMimeType' => 'application/json',
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('AutonomousCrmAgent Gemini fallback triggered', ['status' => $response->status()]);

                return null;
            }

            $text = (string) data_get($response->json(), 'candidates.0.content.parts.0.text', '');

            return $this->decodeDecisionJson($text);
        } catch (\Throwable $e) {
            Log::warning('AutonomousCrmAgent Gemini exception fallback', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @param  Collection<int, Service>  $services
     * @param  Collection<int, PortfolioProject>  $cases
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>|null
     */
    private function callOpenAi(Conversation $conversation, string $incomingMessage, $services, $cases, array $config): ?array
    {
        try {
            $model = trim((string) $config['model']) ?: 'gpt-4o-mini';
            $prompt = $this->buildStructuredPrompt($conversation, $incomingMessage, $services, $cases, $config);

            $response = Http::timeout(12)
                ->withToken((string) $config['api_key'])
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.35,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => (string) $config['system_prompt']],
                        ['role' => 'user', 'content' => $prompt],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('AutonomousCrmAgent OpenAI fallback triggered', ['status' => $response->status()]);

                return null;
            }

            $text = (string) data_get($response->json(), 'choices.0.message.content', '');

            return $this->decodeDecisionJson($text);
        } catch (\Throwable $e) {
            Log::warning('AutonomousCrmAgent OpenAI exception fallback', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @param  Collection<int, Service>  $services
     * @param  Collection<int, PortfolioProject>  $cases
     * @param  array<string, mixed>  $config
     */
    private function buildStructuredPrompt(Conversation $conversation, string $incomingMessage, $services, $cases, array $config): string
    {
        $catalogLines = $services->map(static fn (Service $s): string => sprintf(
            '- slug: %s | nome: %s | categoria: %s | preco_base: R$ %s | prazo_estimado_dias: %d',
            $s->slug,
            $s->name,
            $s->category?->name ?? 'Geral',
            number_format((float) $s->base_price, 2, ',', '.'),
            (int) ($s->estimated_days ?? 15)
        ))->implode("\n");

        $caseLines = $cases->map(static fn (PortfolioProject $c): string => "- {$c->client_name} ({$c->category}): {$c->description}")->implode("\n");

        $historyLines = $conversation->messages->take(-14)->map(static function (ConversationMessage $m): string {
            $who = $m->sender_type === 'staff' ? ($m->is_ai ? 'IA_GUNDJATECH' : 'HUMANO_EQUIPE') : 'VISITANTE';

            return "{$who}: {$m->message}";
        })->implode("\n");

        $existingJson = json_encode($conversation->extracted_data ?? [], JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
{$config['system_prompt']}

CATÁLOGO REAL DE SERVIÇOS GUNDJATECH:
{$catalogLines}

CASES REAIS GUNDJATECH:
{$caseLines}

DADOS DO VISITANTE:
- Nome: {$conversation->visitor_name}
- E-mail: {$conversation->visitor_email}
- Telefone: {$conversation->visitor_phone}
- Assunto inicial: {$conversation->subject}
- Dados já extraídos no CRM: {$existingJson}

HISTÓRICO RECENTE:
{$historyLines}

ÚLTIMA MENSAGEM DO VISITANTE:
{$incomingMessage}

RESPONDA ESTRITAMENTE EM JSON VÁLIDO COM ESTAS CHAVES:
{
  "reply": "string (sua resposta em português para o visitante)",
  "crm_stage": "qualifying | proposal_ready | handoff_human",
  "lead_score": 0,
  "summary": "string (resumo executivo curto para a equipe GundjaTech)",
  "handoff_to_human": false,
  "handoff_reason": null,
  "create_draft_quotation": false,
  "extracted": {
    "company": null,
    "city_state": null,
    "project_type": null,
    "service_slug": null,
    "estimated_budget": null,
    "desired_deadline_days": null,
    "scope": null,
    "urgency": "normal"
  }
}
PROMPT;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeDecisionJson(string $raw): ?array
    {
        $trimmed = trim($raw);
        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $trimmed) ?? $trimmed;
        }

        $decoded = json_decode($trimmed, true);
        if (! is_array($decoded) || empty($decoded['reply']) || ! is_string($decoded['reply'])) {
            return null;
        }

        return $decoded;
    }

    /**
     * Deterministic Portuguese Commercial CRM Engine (works seamlessly with zero API key or as fallback).
     *
     * @param  Collection<int, Service>  $services
     * @param  Collection<int, PortfolioProject>  $cases
     * @return array<string, mixed>
     */
    private function runDeterministicEngine(Conversation $conversation, string $incomingMessage, $services, $cases): array
    {
        $existing = is_array($conversation->extracted_data) ? $conversation->extracted_data : [];
        $fullText = Str::lower($conversation->subject.' '.$incomingMessage);
        $msgLower = Str::lower(trim($incomingMessage));
        $firstName = explode(' ', trim((string) ($conversation->visitor_name ?: ($conversation->client?->name ?? ''))))[0] ?: 'Olá';

        // 1. Extract structured fields from incoming message
        $extracted = $existing;

        // Detect service intent
        $matchedService = $this->matchService($fullText, $services);
        if ($matchedService !== null) {
            $extracted['service_slug'] = $matchedService->slug;
            $extracted['project_type'] = $matchedService->name;
        } elseif (! empty($existing['service_slug'])) {
            $matchedService = $services->firstWhere('slug', $existing['service_slug']);
        }

        // Detect budget (e.g. "R$ 8.000", "5 mil", "10k", "orcamento de 6000")
        $detectedBudget = $this->extractBudget($incomingMessage);
        if ($detectedBudget !== null) {
            $extracted['estimated_budget'] = $detectedBudget;
        }

        // Detect deadline in days (e.g. "15 dias", "2 meses", "3 semanas", "urgente")
        $detectedDeadline = $this->extractDeadlineDays($incomingMessage);
        if ($detectedDeadline !== null) {
            $extracted['desired_deadline_days'] = $detectedDeadline;
        }

        // Detect company name
        $detectedCompany = $this->extractCompany($incomingMessage);
        if ($detectedCompany !== null) {
            $extracted['company'] = $detectedCompany;
        }

        // Detect city/state
        $detectedLocation = $this->extractLocation($incomingMessage);
        if ($detectedLocation !== null) {
            $extracted['city_state'] = $detectedLocation;
        }

        // Capture detailed scope when visitor writes a substantive non-onboarding message
        $isInitialChoiceMessage = Str::startsWith($msgLower, 'interesse informado no chat:');
        if (! $isInitialChoiceMessage && mb_strlen(trim($incomingMessage)) >= 14) {
            $prevScope = trim((string) ($extracted['scope'] ?? ''));
            if ($prevScope === '') {
                $extracted['scope'] = Str::limit(trim($incomingMessage), 400);
            } elseif (! Str::contains($prevScope, trim($incomingMessage))) {
                $extracted['scope'] = Str::limit($prevScope.' | '.trim($incomingMessage), 500);
            }
        }

        // 2. Check immediate human handoff / emergency / closing triggers
        $emergencyKeywords = ['invadido', 'hackeado', 'atacado', 'fora do ar', 'sequestrado', 'malware', 'vírus', 'virus', 'emergencia', 'emergência'];
        $humanKeywords = ['falar com humano', 'falar com atendente', 'falar com diretor', 'pessoa real', 'falar com alguem', 'falar com alguém', 'me liga', 'ligar para'];
        $negotiationKeywords = ['desconto', 'negociar', 'fechar contrato', 'assinar contrato', 'quero fechar', 'fechar agora', 'aprovar proposta'];

        $handoff = false;
        $handoffReason = null;
        if (Str::contains($msgLower, $emergencyKeywords)) {
            $handoff = true;
            $handoffReason = 'Emergência de cibersegurança relatada pelo visitante';
            $extracted['urgency'] = 'high';
        } elseif (Str::contains($msgLower, $humanKeywords)) {
            $handoff = true;
            $handoffReason = 'Visitante solicitou atendimento direto com a equipe/diretoria';
        } elseif (Str::contains($msgLower, $negotiationKeywords)) {
            $handoff = true;
            $handoffReason = 'Intenção de fechamento ou negociação comercial direta';
        }

        // 3. Compute qualification score (0..100)
        $score = $this->computeLeadScore($conversation, $extracted);

        if ($handoff) {
            $reply = Str::contains($msgLower, $emergencyKeywords)
                ? "{$firstName}, acionei prioridade máxima para nossa equipe de cibersegurança! Um especialista da GundjaTech já recebeu o alerta sonoro no painel com seu contato e vai assumir esta conversa imediatamente."
                : "Perfeito, {$firstName}! Já encaminhei todo o resumo do seu atendimento para um diretor da GundjaTech. Nossa equipe foi notificada em tempo real e vai responder por aqui em instantes.";

            return [
                'reply' => $reply,
                'crm_stage' => 'handoff_human',
                'lead_score' => max($score, 75),
                'summary' => $this->buildExecutiveSummary($conversation, $extracted, $handoffReason),
                'handoff_to_human' => true,
                'handoff_reason' => $handoffReason,
                'create_draft_quotation' => $matchedService !== null && empty($extracted['draft_quotation_id']),
                'extracted' => $extracted,
            ];
        }

        // 4. Answer direct FAQ / Pricing / Portfolio questions naturally
        $prefixAnswer = '';
        if (Str::contains($msgLower, ['quanto custa', 'preco', 'preço', 'valor', 'investimento'])) {
            if ($matchedService !== null) {
                $priceFmt = number_format((float) $matchedService->base_price, 2, ',', '.');
                $days = (int) ($matchedService->estimated_days ?? 15);
                $prefixAnswer = "Para {$matchedService->name}, os projetos sob medida da GundjaTech partem de R$ {$priceFmt} com prazo médio de {$days} dias (valor final fechado conforme escopo). ";
            } else {
                $prefixAnswer = 'Nossos projetos sob medida partem de R$ 1.900 para Landing Pages, R$ 3.800 para Sites Institucionais e R$ 6.500 para E-commerce, sempre com prazo e valor fechados em contrato. ';
            }
        } elseif (Str::contains($msgLower, ['portfolio', 'portfólio', 'cases', 'clientes', 'projetos feitos'])) {
            $caseNames = $cases->pluck('client_name')->take(3)->implode(', ');
            $prefixAnswer = $caseNames !== ''
                ? "Entre nossos projetos recentes estão {$caseNames}, entregues com foco em performance, segurança e geração de oportunidades. "
                : 'Desenvolvemos projetos sob medida para educação, saúde, tecnologia e consultoria empresarial. ';
        }

        // 5. Decide next progressive CRM qualification step
        $hasService = $matchedService !== null;
        $hasScope = ! empty($extracted['scope']);
        $hasBudget = ! empty($extracted['estimated_budget']);
        $hasDeadline = ! empty($extracted['desired_deadline_days']);
        $hasCompany = ! empty($extracted['company']);
        $alreadyDrafted = ! empty($extracted['draft_quotation_id']);

        if ($hasService && $hasScope && ($hasBudget || $hasDeadline)) {
            $priceBase = (float) ($matchedService?->base_price ?? 3800);
            $estimate = $hasBudget ? (float) $extracted['estimated_budget'] : $priceBase;
            $estimateFmt = number_format($estimate, 2, ',', '.');
            $deadlineTxt = $hasDeadline ? "{$extracted['desired_deadline_days']} dias" : (($matchedService?->estimated_days ?? 15).' dias estimados');

            $reply = $alreadyDrafted
                ? "{$prefixAnswer}Excelente, {$firstName}! Atualizei esses detalhes na sua solicitação e no pré-orçamento. Deseja incluir alguma integração específica ou prefere que um diretor assuma agora para validar a proposta final?"
                : "{$prefixAnswer}Perfeito, {$firstName}! Já registrei tudo no nosso CRM e gerei um pré-orçamento inicial de {$matchedService->name} (referência de R$ {$estimateFmt}, prazo de {$deadlineTxt}) para revisão da nossa diretoria. Se quiser acrescentar algum detalhe ou pedir contato humano agora, é só mandar aqui!";

            return [
                'reply' => $reply,
                'crm_stage' => 'proposal_ready',
                'lead_score' => max($score, 85),
                'summary' => $this->buildExecutiveSummary($conversation, $extracted, 'Qualificação concluída automaticamente pela IA'),
                'handoff_to_human' => false,
                'handoff_reason' => null,
                'create_draft_quotation' => ! $alreadyDrafted,
                'extracted' => $extracted,
            ];
        }

        if (! $hasService) {
            $reply = "{$prefixAnswer}Prazer, {$firstName}! Sou o assistente comercial da GundjaTech. Qual solução você busca hoje: Site Institucional, Loja Virtual (E-commerce), Landing Page, Cibersegurança/Domínios ou Gestão de Tráfego Pago?";
        } elseif (! $hasScope) {
            $reply = "{$prefixAnswer}Ótima escolha, {$firstName}! Para estruturar uma recomendação sob medida de {$matchedService->name}, qual é o nome da sua empresa e o principal objetivo que você quer alcançar com o projeto?";
        } elseif (! $hasDeadline && ! $hasBudget) {
            $companyAck = $hasCompany ? " para a {$extracted['company']}" : '';
            $reply = "{$prefixAnswer}Excelente, anotei o escopo{$companyAck}! Para montarmos seu pré-orçamento agora mesmo: qual prazo ideal você tem em mente (ex.: 15 ou 30 dias) e qual faixa de investimento planeja?";
        } else {
            $missingQuestion = ! $hasBudget
                ? 'Qual faixa de investimento você tem prevista para este projeto?'
                : 'Qual prazo ideal você gostaria para colocar o projeto no ar?';
            $reply = "{$prefixAnswer}Anotado no seu protocolo, {$firstName}! {$missingQuestion}";
        }

        return [
            'reply' => $reply,
            'crm_stage' => 'qualifying',
            'lead_score' => $score,
            'summary' => $this->buildExecutiveSummary($conversation, $extracted),
            'handoff_to_human' => false,
            'handoff_reason' => null,
            'create_draft_quotation' => false,
            'extracted' => $extracted,
        ];
    }

    /**
     * Persist AI reply + autonomous CRM actions atomically.
     *
     * @param  array<string, mixed>  $decision
     * @param  Collection<int, Service>  $services
     * @param  array<string, mixed>  $config
     */
    private function applyDecision(Conversation $conversation, array $decision, $services, array $config): ConversationMessage
    {
        $existing = is_array($conversation->extracted_data) ? $conversation->extracted_data : [];
        $incomingExtracted = is_array($decision['extracted'] ?? null) ? $decision['extracted'] : [];

        $merged = $existing;
        foreach ($incomingExtracted as $key => $val) {
            if ($val !== null && $val !== '') {
                $merged[$key] = $val;
            }
        }

        $matchedService = null;
        if (! empty($merged['service_slug'])) {
            $matchedService = $services->firstWhere('slug', $merged['service_slug']);
        }
        if ($matchedService === null && $conversation->serviceRequest?->service_id) {
            $matchedService = $services->firstWhere('id', $conversation->serviceRequest->service_id);
        }

        $handoff = (bool) ($decision['handoff_to_human'] ?? false);
        $stage = (string) ($decision['crm_stage'] ?? 'qualifying');
        if (! in_array($stage, ['new', 'qualifying', 'proposal_ready', 'handoff_human', 'converted'], true)) {
            $stage = $handoff ? 'handoff_human' : 'qualifying';
        }
        if ($handoff) {
            $stage = 'handoff_human';
        }

        $score = max(0, min(100, (int) ($decision['lead_score'] ?? $this->computeLeadScore($conversation, $merged))));
        $summary = trim((string) ($decision['summary'] ?? '')) ?: $this->buildExecutiveSummary($conversation, $merged, $decision['handoff_reason'] ?? null);

        /** @var ConversationMessage $aiMessage */
        $aiMessage = DB::transaction(function () use (
            $conversation,
            $decision,
            $merged,
            $matchedService,
            $handoff,
            $stage,
            $score,
            $summary,
            $config
        ): ConversationMessage {
            // 1. Enrich Client CRM record
            $client = $conversation->client;
            if ($client !== null) {
                $clientUpdates = [];
                if (! empty($merged['company']) && (empty($client->company_name) || $client->company_name === $client->name)) {
                    $clientUpdates['company_name'] = Str::limit((string) $merged['company'], 255, '');
                }
                if (! empty($merged['city_state']) && empty($client->city)) {
                    $parts = array_map('trim', explode('/', (string) $merged['city_state']));
                    $clientUpdates['city'] = Str::limit($parts[0], 100, '');
                    if (isset($parts[1])) {
                        $clientUpdates['state'] = Str::limit($parts[1], 50, '');
                    }
                }
                $clientUpdates['notes'] = trim("CRM Autônomo IA ({$score}/100): {$summary}");
                if ($clientUpdates !== []) {
                    $client->update($clientUpdates);
                }
            }

            // 2. Enrich linked ServiceRequest
            $serviceRequest = $conversation->serviceRequest;
            if ($serviceRequest !== null) {
                $reqUpdates = [];
                if ($matchedService !== null) {
                    $reqUpdates['service_id'] = $matchedService->id;
                }
                if (! empty($merged['company'])) {
                    $reqUpdates['company'] = Str::limit((string) $merged['company'], 255, '');
                }
                if (! empty($merged['estimated_budget']) && is_numeric($merged['estimated_budget'])) {
                    $reqUpdates['estimated_budget'] = (float) $merged['estimated_budget'];
                }
                if (! empty($merged['desired_deadline_days']) && is_numeric($merged['desired_deadline_days'])) {
                    $days = max(1, min(365, (int) $merged['desired_deadline_days']));
                    $reqUpdates['desired_deadline'] = now()->addDays($days)->toDateString();
                }
                if (! empty($merged['scope'])) {
                    $reqUpdates['internal_notes'] = "Resumo IA ({$score}/100): {$summary}\nEscopo coletado: {$merged['scope']}";
                }
                if ($serviceRequest->status === 'new' && $score >= 55) {
                    $reqUpdates['status'] = 'analyzing';
                    RequestStatusHistory::create([
                        'service_request_id' => $serviceRequest->id,
                        'old_status' => 'new',
                        'new_status' => 'analyzing',
                        'comment' => "Qualificação automática pelo CRM IA (Score {$score}/100).",
                        'user_id' => null,
                    ]);
                }

                if ($reqUpdates !== []) {
                    $serviceRequest->update($reqUpdates);
                }
            }

            // 3. Auto-draft Quotation when qualified
            $shouldDraft = (bool) ($decision['create_draft_quotation'] ?? false)
                && (bool) $config['auto_draft_quotation']
                && empty($merged['draft_quotation_id'])
                && $client !== null;

            if ($shouldDraft) {
                $creatorId = User::whereIn('role', [UserRole::SuperAdmin->value, UserRole::Admin->value, UserRole::Manager->value])
                    ->orderBy('id')
                    ->value('id');

                if ($creatorId !== null) {
                    $unitPrice = (float) ($matchedService?->base_price ?? ($merged['estimated_budget'] ?? 3800));
                    if ($unitPrice <= 0) {
                        $unitPrice = 3800.00;
                    }
                    $serviceTitle = $matchedService?->name ?? ($merged['project_type'] ?? 'Projeto Digital Sob Medida');
                    $quotation = Quotation::create([
                        'quotation_number' => 'ORC-AI-'.date('Ymd').'-'.strtoupper(Str::random(4)),
                        'service_request_id' => $serviceRequest?->id,
                        'client_id' => $client->id,
                        'user_id' => $creatorId,
                        'title' => "Pré-Orçamento IA • {$serviceTitle}",
                        'subtotal' => $unitPrice,
                        'discount' => 0,
                        'total' => $unitPrice,
                        'status' => 'draft',
                        'valid_until' => now()->addDays(15)->toDateString(),
                        'notes' => "Rascunho gerado automaticamente pelo CRM Autônomo GundjaTech.\n{$summary}",
                    ]);

                    QuotationItem::create([
                        'quotation_id' => $quotation->id,
                        'service_id' => $matchedService?->id,
                        'description' => $serviceTitle.(! empty($merged['scope']) ? ' — '.Str::limit((string) $merged['scope'], 120) : ''),
                        'quantity' => 1,
                        'unit_price' => $unitPrice,
                        'total_price' => $unitPrice,
                    ]);

                    $merged['draft_quotation_id'] = $quotation->id;
                    $merged['draft_quotation_number'] = $quotation->quotation_number;

                    ActivityLog::create([
                        'user_id' => null,
                        'action' => 'crm.ai.quotation_drafted',
                        'subject_type' => Quotation::class,
                        'subject_id' => $quotation->id,
                        'details' => [
                            'conversation_id' => $conversation->id,
                            'quotation_number' => $quotation->quotation_number,
                            'total' => $unitPrice,
                        ],
                    ]);
                }
            }

            // 4. Save AI Reply Message
            $aiMessage = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => null,
                'sender_type' => 'staff',
                'sender_name' => (string) $config['agent_name'],
                'is_ai' => true,
                'message' => trim((string) $decision['reply']),
                'is_read' => false,
            ]);

            // 5. Update Conversation CRM state
            $conversation->update([
                'ai_enabled' => $handoff ? false : true,
                'crm_stage' => $stage,
                'lead_score' => $score,
                'ai_summary' => $summary,
                'extracted_data' => $merged,
                'ai_handoff_reason' => $handoff ? Str::limit((string) ($decision['handoff_reason'] ?? 'Transferido para equipe humana'), 255, '') : $conversation->ai_handoff_reason,
                'status' => ($handoff || $stage === 'proposal_ready') ? 'waiting_staff' : 'open',
            ]);
            $conversation->touch();

            ActivityLog::create([
                'user_id' => null,
                'action' => $handoff ? 'crm.ai.handoff' : 'crm.ai.replied',
                'subject_type' => Conversation::class,
                'subject_id' => $conversation->id,
                'details' => [
                    'stage' => $stage,
                    'lead_score' => $score,
                    'mode' => $config['effective_mode'],
                    'handoff_reason' => $handoff ? ($decision['handoff_reason'] ?? null) : null,
                ],
            ]);

            return $aiMessage;
        });

        return $aiMessage;
    }

    /**
     * @param  Collection<int, Service>  $services
     */
    private function matchService(string $lowerText, $services): ?Service
    {
        if (Str::contains($lowerText, ['loja virtual', 'ecommerce', 'e-commerce', 'vender online', 'carrinho'])) {
            return $services->firstWhere('slug', 'loja-virtual-alta-conversao') ?? $services->first();
        }
        if (Str::contains($lowerText, ['landing page', 'landing', 'pagina de captura', 'página de captura', 'campanha'])) {
            return $services->firstWhere('slug', 'landing-page-alta-performance') ?? $services->first();
        }
        if (Str::contains($lowerText, ['seguranca', 'segurança', 'ciberseguranca', 'cibersegurança', 'invadido', 'dominio', 'domínio', 'dns', 'ssl', 'firewall'])) {
            return $services->firstWhere('slug', 'gestao-e-registro-de-dominios') ?? $services->first();
        }
        if (Str::contains($lowerText, ['google ads', 'pesquisa do google', 'google shopping'])) {
            return $services->firstWhere('slug', 'gestao-trafego-google-ads') ?? $services->first();
        }
        if (Str::contains($lowerText, ['trafego', 'tráfego', 'meta ads', 'instagram', 'facebook', 'anuncio', 'anúncio', 'operacao', 'operação'])) {
            return $services->firstWhere('slug', 'gestao-trafego-meta-ads') ?? $services->first();
        }
        if (Str::contains($lowerText, ['site', 'portal', 'sistema', 'institucional', 'refazer'])) {
            return $services->firstWhere('slug', 'site-institucional-premium') ?? $services->first();
        }

        return null;
    }

    private function extractBudget(string $text): ?float
    {
        if (preg_match('/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,6})(?:,\d{2})?/i', $text, $m)) {
            $normalized = (float) str_replace('.', '', $m[1]);
            if ($normalized >= 500 && $normalized <= 1000000) {
                return $normalized;
            }
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/i', $text, $m)) {
            $val = (float) str_replace(',', '.', $m[1]) * 1000;
            if ($val >= 500 && $val <= 1000000) {
                return $val;
            }
        }

        return null;
    }

    private function extractDeadlineDays(string $text): ?int
    {
        if (preg_match('/(\d{1,3})\s*dias?/i', $text, $m)) {
            return max(1, min(365, (int) $m[1]));
        }
        if (preg_match('/(\d{1,2})\s*semanas?/i', $text, $m)) {
            return max(7, min(365, (int) $m[1] * 7));
        }
        if (preg_match('/(\d{1,2})\s*(?:m[eê]s|meses)/i', $text, $m)) {
            return max(15, min(365, (int) $m[1] * 30));
        }
        if (Str::contains(Str::lower($text), ['urgente', 'imediato', 'o quanto antes'])) {
            return 10;
        }

        return null;
    }

    private function extractCompany(string $text): ?string
    {
        if (preg_match('/(?:empresa|neg[oó]cio|cl[ií]nica|escola|ag[eê]ncia|escrit[oó]rio|marca)\s+(?:se chama|chama-se|[ée]|chamada)?\s*([A-ZÀ-Ú][\wÀ-ú&\-\s]{1,50})/u', $text, $m)) {
            $candidate = preg_replace('/[.,;!?].*$/u', '', $m[1]) ?? '';
            $candidate = preg_replace('/\s+(?:em|que|precisa|precisamos|quer|queremos|busca|deseja|com|para|tem|atua|trabalha)\b.*$/iu', '', $candidate) ?? '';
            $candidate = trim($candidate);
            if (mb_strlen($candidate) >= 2 && mb_strlen($candidate) <= 50) {
                return $candidate;
            }
        }

        return null;
    }

    private function extractLocation(string $text): ?string
    {
        $cities = [
            'luanda' => 'Luanda / Angola',
            'lisboa' => 'Lisboa / Portugal',
            'porto' => 'Porto / Portugal',
            'são paulo' => 'São Paulo / SP',
            'sao paulo' => 'São Paulo / SP',
            'rio de janeiro' => 'Rio de Janeiro / RJ',
            'belo horizonte' => 'Belo Horizonte / MG',
            'curitiba' => 'Curitiba / PR',
            'brasília' => 'Brasília / DF',
            'brasilia' => 'Brasília / DF',
        ];
        $lower = Str::lower($text);
        foreach ($cities as $needle => $label) {
            if (Str::contains($lower, $needle)) {
                return $label;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $extracted
     */
    private function computeLeadScore(Conversation $conversation, array $extracted): int
    {
        $score = 15;
        $email = (string) ($conversation->visitor_email ?: $conversation->client?->email);
        if ($email !== '' && ! preg_match('/@(gmail|hotmail|outlook|live|yahoo|icloud)\./i', $email)) {
            $score += 15;
        }
        if (! empty($conversation->visitor_phone) || ! empty($conversation->client?->phone)) {
            $score += 10;
        }
        if (! empty($extracted['service_slug']) || ! empty($extracted['project_type'])) {
            $score += 20;
        }
        if (! empty($extracted['scope'])) {
            $score += 15;
        }
        if (! empty($extracted['company'])) {
            $score += 10;
        }
        if (! empty($extracted['estimated_budget'])) {
            $score += 10;
        }
        if (! empty($extracted['desired_deadline_days'])) {
            $score += 5;
        }

        return min(100, $score);
    }

    /**
     * @param  array<string, mixed>  $extracted
     */
    private function buildExecutiveSummary(Conversation $conversation, array $extracted, ?string $note = null): string
    {
        $parts = [];
        $parts[] = 'Lead: '.($conversation->visitor_name ?: ($conversation->client?->display_name ?? 'Visitante'));
        if (! empty($extracted['company'])) {
            $parts[] = 'Empresa: '.$extracted['company'];
        }
        if (! empty($extracted['project_type'])) {
            $parts[] = 'Interesse: '.$extracted['project_type'];
        }
        if (! empty($extracted['estimated_budget'])) {
            $parts[] = 'Orçamento est.: R$ '.number_format((float) $extracted['estimated_budget'], 2, ',', '.');
        }
        if (! empty($extracted['desired_deadline_days'])) {
            $parts[] = 'Prazo: '.$extracted['desired_deadline_days'].' dias';
        }
        if ($note !== null && $note !== '') {
            $parts[] = $note;
        }

        return implode(' · ', $parts);
    }

    private function decryptStoredApiKey(): string
    {
        $raw = (string) (SystemSetting::get('crm_ai_api_key') ?? '');
        if ($raw === '') {
            return '';
        }

        try {
            return trim(Crypt::decryptString($raw));
        } catch (\Throwable) {
            return '';
        }
    }
}
