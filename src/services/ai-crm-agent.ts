import { Env } from '../types/env';

export interface ChatMessage {
    id?: number;
    sender_type: 'client' | 'staff' | 'agent';
    sender_name?: string;
    message: string;
    is_ai: boolean;
    provider?: string;
    handoff?: boolean;
    created_at?: string;
}

export interface AiDecision {
    reply: string;
    stage?: string;
    lead_score_increment?: number;
    extracted_name?: string;
    extracted_email?: string;
    extracted_phone?: string;
}

export class AutonomousCrmAgent {
    constructor(private env: Env) { }

    public async handleIncomingMessage(
        conversationId: number,
        visitorMessage: string,
        visitorName?: string
    ): Promise<ChatMessage> {
        // 1. Busca histórico recente da conversa no D1 para preservação de contexto
        let history: Array<{ sender_type: string; message: string }> = [];
        try {
            if (this.env?.DB) {
                const rows = await this.env.DB.prepare(
                    `SELECT sender_type, message FROM conversation_messages
                     WHERE conversation_id = ? ORDER BY id DESC LIMIT 10`
                ).bind(conversationId).all<{ sender_type: string; message: string }>();

                history = (rows.results || []).reverse();
            }
        } catch (err) {
            console.warn('Erro ao carregar histórico no D1:', err);
        }

        let systemPrompt = `Você é o consultor comercial e especialista de soluções da GundjaTech, empresa de alta performance digital, desenvolvimento de websites corporativos, sistemas web sob medida, infraestrutura Cloudflare e cibersegurança.
Suas respostas devem ser corteses, altamente profissionais, persuasivas e sucintas (máximo 3 frases) em português do Brasil.
Seu objetivo é acolher o visitante, diagnosticar o desafio técnico dele e orientá-lo a informar detalhes para envio de proposta técnica formal.`;

        let agentName = 'Assistente IA GundjaTech';
        let configuredProvider = 'auto';
        let configuredModel = '';
        let dbApiKey = '';

        try {
            if (this.env?.DB) {
                const cfgRows = await this.env.DB.prepare(
                    `SELECT key, value FROM system_settings WHERE key IN ('crm_ai_system_prompt', 'crm_ai_agent_name', 'crm_ai_provider', 'crm_ai_model', 'crm_ai_api_key')`
                ).all<{ key: string; value: string }>();
                for (const row of cfgRows.results || []) {
                    const val = String(row.value || '').trim();
                    if (!val) continue;
                    if (row.key === 'crm_ai_system_prompt') systemPrompt = val;
                    if (row.key === 'crm_ai_agent_name') agentName = val;
                    if (row.key === 'crm_ai_provider') configuredProvider = val;
                    if (row.key === 'crm_ai_model') configuredModel = val;
                    if (row.key === 'crm_ai_api_key') dbApiKey = val;
                }
            }
        } catch {}

        // Garante que o modelo nunca vaze diretivas técnicas/variáveis na resposta ao cliente
        systemPrompt = `${systemPrompt}\n\nREGRA CRÍTICA DE SAÍDA: Responda EXCLUSIVAMENTE em texto natural amigável para o cliente em português do Brasil. NUNCA escreva variáveis, códigos, JSON ou flags internas como "handoff_to_human=true", "lead_score", "crm_stage" ou similares na mensagem.`;

        const geminiKey =
            (dbApiKey && !dbApiKey.startsWith('sk-') ? dbApiKey : '') ||
            (this.env?.GEMINI_API_KEY || '').trim();
        const openaiKey =
            (dbApiKey && dbApiKey.startsWith('sk-') ? dbApiKey : '') ||
            (this.env?.OPENAI_API_KEY || '').trim();

        // Evita duplicar visitorMessage quando ela já foi inserida como última mensagem do histórico no D1
        const lastHist = history.length > 0 ? history[history.length - 1] : null;
        const alreadyInHistory = Boolean(lastHist && lastHist.sender_type === 'client' && String(lastHist.message || '').trim() === visitorMessage.trim());
        const effectiveHistory = alreadyInHistory ? history.slice(0, -1) : history;

        const runWorkersAi = async (): Promise<string> => {
            if (!this.env?.AI) return '';
            const promptMessages = [
                { role: 'system', content: systemPrompt },
                ...effectiveHistory.map((h) => ({
                    role: h.sender_type === 'client' ? 'user' : 'assistant',
                    content: h.message
                })),
                { role: 'user', content: visitorMessage }
            ];

            const candidateModels = [
                '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
                '@cf/meta/llama-3.1-8b-instruct',
                '@cf/meta/llama-3.3-70b-instruct'
            ];

            for (const modelId of candidateModels) {
                try {
                    const aiResponse = await this.env.AI.run(modelId as any, {
                        messages: promptMessages,
                        max_tokens: 300
                    }) as { response?: string };

                    if (aiResponse?.response) {
                        return aiResponse.response.trim();
                    }
                } catch (err) {
                    console.warn(`Workers AI (${modelId}) falhou, tentando próximo:`, err);
                }
            }
            return '';
        };

        const runGemini = async (): Promise<string> => {
            if (!geminiKey) return '';
            const preferredModel =
                configuredModel && !configuredModel.startsWith('@cf/') && !configuredModel.startsWith('gpt-')
                    ? configuredModel
                    : 'gemini-2.5-flash';
            const geminiModels = Array.from(new Set([preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash']));
            const geminiContents = [
                ...effectiveHistory.map((h) => ({
                    role: h.sender_type === 'client' ? 'user' : 'model',
                    parts: [{ text: h.message }]
                })),
                {
                    role: 'user',
                    parts: [{ text: visitorName ? `[${visitorName}]: ${visitorMessage}` : visitorMessage }]
                }
            ];

            for (const modelName of geminiModels) {
                try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;
                    const geminiPayload = {
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        contents: geminiContents,
                        generationConfig: { maxOutputTokens: 350, temperature: 0.5 }
                    };

                    const res = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': geminiKey
                        },
                        body: JSON.stringify(geminiPayload),
                        signal: AbortSignal.timeout(8000)
                    });

                    if (res.ok) {
                        const data = (await res.json()) as any;
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) {
                            return String(text).trim();
                        }
                    } else {
                        console.warn(`Gemini (${modelName}) retornou HTTP ${res.status}`);
                    }
                } catch (geminiErr) {
                    console.warn(`Falha no Gemini (${modelName}):`, geminiErr);
                }
            }
            return '';
        };

        const runOpenAi = async (): Promise<string> => {
            if (!openaiKey) return '';
            const openaiModel = configuredModel && configuredModel.startsWith('gpt-') ? configuredModel : 'gpt-4o-mini';
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: openaiModel,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...effectiveHistory.map((h) => ({
                                role: h.sender_type === 'client' ? 'user' : 'assistant',
                                content: h.message
                            })),
                            { role: 'user', content: visitorMessage }
                        ],
                        max_tokens: 350
                    }),
                    signal: AbortSignal.timeout(8000)
                });

                if (res.ok) {
                    const data = (await res.json()) as any;
                    const text = data?.choices?.[0]?.message?.content;
                    if (text) {
                        return String(text).trim();
                    }
                }
            } catch (openaiErr) {
                console.warn('Falha no OpenAI:', openaiErr);
            }
            return '';
        };

        let reply = '';
        let providerUsed = 'local';

        // 2. Executa cadeia em cascata respeitando o provedor escolhido (com fallback automático)
        const order: Array<'gemini' | 'workers_ai' | 'openai'> =
            configuredProvider === 'local'
                ? []
                : configuredProvider === 'gemini'
                ? ['gemini', 'workers_ai', 'openai']
                : configuredProvider === 'openai'
                ? ['openai', 'workers_ai', 'gemini']
                : configuredProvider === 'workers_ai'
                ? ['workers_ai', 'gemini', 'openai']
                : geminiKey
                ? ['gemini', 'workers_ai', 'openai']
                : ['workers_ai', 'gemini', 'openai'];

        for (const engine of order) {
            if (reply) break;
            if (engine === 'gemini') {
                reply = await runGemini();
                if (reply) providerUsed = 'gemini';
            } else if (engine === 'workers_ai') {
                reply = await runWorkersAi();
                if (reply) providerUsed = 'workers_ai';
            } else if (engine === 'openai') {
                reply = await runOpenAi();
                if (reply) providerUsed = 'openai';
            }
        }

        // 5. Fallback Determinístico Inteligente (garante resposta 100% resiliente)
        if (!reply) {
            reply = this.runDeterministicFallback(visitorMessage, visitorName);
            providerUsed = 'local';
        }

        // 5B. Sanitização contra vazamento de flags internas do prompt (ex: handoff_to_human=true)
        const shouldHandoff = /handoff_to_human\s*[:=]\s*true/i.test(reply);
        reply = reply
            .replace(/\b(?:handoff_to_human|ai_autopilot|create_quotation|lead_score|crm_stage)\s*[:=]\s*[^\s,;.)]+/gi, '')
            .replace(/\[(?:HANDOFF|TRANSFERIR_HUMANO)[^\]]*\]/gi, '')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!reply) {
            reply = this.runDeterministicFallback(visitorMessage, visitorName);
        }

        // 6. Persistência da resposta e atualização de inteligência de CRM no D1 (ignora conversationId <= 0 de teste)
        let msgId: number | undefined;
        try {
            if (this.env?.DB && conversationId > 0) {
                const res = await this.env.DB.prepare(
                    `INSERT INTO conversation_messages (conversation_id, sender_type, sender_id, message, is_ai, created_at, updated_at)
                     VALUES (?, 'agent', NULL, ?, 1, datetime('now'), datetime('now'))`
                ).bind(conversationId, reply).run();

                msgId = Number(res.meta.last_row_id);

                // Evolução automática do funil de lead (com teto de 100 pontos e registro de handoff_at)
                if (shouldHandoff) {
                    await this.env.DB.prepare(
                        `UPDATE conversations
                         SET lead_score = MIN(100, COALESCE(lead_score, 0) + 10),
                             crm_stage = 'handoff_human',
                             status = 'waiting_staff',
                             ai_enabled = 0,
                             handoff_at = COALESCE(handoff_at, datetime('now')),
                             last_message_at = datetime('now'),
                             updated_at = datetime('now')
                         WHERE id = ?`
                    ).bind(conversationId).run();
                } else {
                    await this.env.DB.prepare(
                        `UPDATE conversations
                         SET lead_score = MIN(100, COALESCE(lead_score, 0) + 10),
                             crm_stage = CASE 
                                WHEN crm_stage = 'greeting' THEN 'discovery'
                                WHEN crm_stage = 'discovery' THEN 'qualification'
                                ELSE crm_stage 
                             END,
                             last_message_at = datetime('now'),
                             updated_at = datetime('now')
                         WHERE id = ?`
                    ).bind(conversationId).run();
                }
            }
        } catch (err) {
            console.error('Erro ao salvar resposta no banco:', err);
        }

        return {
            id: msgId,
            sender_type: 'agent',
            sender_name: agentName || 'GundjaTech AI',
            message: reply,
            is_ai: true,
            provider: providerUsed,
            handoff: shouldHandoff,
            created_at: new Date().toISOString()
        };
    }

    private runDeterministicFallback(message: string, visitorName?: string): string {
        const lower = message.toLowerCase();
        const saudacao = visitorName ? `Olá, ${visitorName}!` : 'Olá!';

        if (lower.includes('preco') || lower.includes('preço') || lower.includes('quanto') || lower.includes('custo') || lower.includes('valor') || lower.includes('orçamento') || lower.includes('orcamento')) {
            return `${saudacao} Nossos projetos são orçados sob medida com escopo, prazo e investimento definidos em contrato. Websites institucionais e páginas de alta conversão costumam variar a partir de R$ 3.800 a R$ 9.800 dependendo das funcionalidades. Se desejar, posso agendar uma análise técnica com nosso diretor comercial!`;
        }

        if (lower.includes('site') || lower.includes('criar') || lower.includes('landing') || lower.includes('portal')) {
            return `${saudacao} A GundjaTech é especialista em criação de sites de alta performance e portais sob medida com SEO técnico e garantia de prazo. Para podermos desenhar a melhor proposta para o seu projeto, conte-me: qual é o segmento da sua empresa e quais funcionalidades você considera essenciais?`;
        }

        if (lower.includes('seguranca') || lower.includes('segurança') || lower.includes('dns') || lower.includes('dominio') || lower.includes('ataque')) {
            return `${saudacao} Nós cuidamos da infraestrutura completa: DNS blindado contra ataques DDoS, certificados SSL corporativos e políticas de segurança em nuvem. Qual é o domínio atual da sua empresa para que possamos fazer um diagnóstico preliminar?`;
        }

        return `${saudacao} Obrigado pelo seu contato! Um de nossos consultores de tecnologia irá analisar sua mensagem e responder em breve. Você também pode preencher nosso formulário de orçamento em /solicitar-orcamento ou falar conosco diretamente pelo WhatsApp (19) 95324-8420.`;
    }
}
