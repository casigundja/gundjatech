import { Env } from '../types/env';

export interface ChatMessage {
    id?: number;
    sender_type: 'client' | 'staff' | 'agent';
    sender_name?: string;
    message: string;
    is_ai: boolean;
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

        try {
            if (this.env?.DB) {
                const cfgRows = await this.env.DB.prepare(
                    `SELECT key, value FROM system_settings WHERE key IN ('crm_ai_system_prompt', 'crm_ai_agent_name')`
                ).all<{ key: string; value: string }>();
                for (const row of cfgRows.results || []) {
                    if (row.key === 'crm_ai_system_prompt' && row.value?.trim()) {
                        systemPrompt = row.value.trim();
                    }
                    if (row.key === 'crm_ai_agent_name' && row.value?.trim()) {
                        agentName = row.value.trim();
                    }
                }
            }
        } catch {}

        let reply = '';

        // 2. Provedor Primário: Cloudflare Workers AI no Edge (Llama 3.3 70B FP8 Fast -> Llama 3.1 8B)
        if (this.env?.AI) {
            const promptMessages = [
                { role: 'system', content: systemPrompt },
                ...history.map((h) => ({
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
                if (reply) break;
                try {
                    const aiResponse = await this.env.AI.run(modelId as any, {
                        messages: promptMessages,
                        max_tokens: 300
                    }) as { response?: string };

                    if (aiResponse?.response) {
                        reply = aiResponse.response.trim();
                    }
                } catch (err) {
                    console.warn(`Workers AI (${modelId}) falhou, tentando próximo:`, err);
                }
            }
        }

        // 3. Provedor Secundário: Google Gemini API (via HTTP fetch nativo)
        if (!reply && this.env?.GEMINI_API_KEY) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.env.GEMINI_API_KEY}`;
                const geminiPayload = {
                    contents: [
                        { role: 'user', parts: [{ text: `${systemPrompt}\n\nHistórico:\n${history.map(h => `${h.sender_type}: ${h.message}`).join('\n')}\n\nCliente: ${visitorMessage}` }] }
                    ],
                    generationConfig: { maxOutputTokens: 350 }
                };

                const res = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiPayload)
                });

                if (res.ok) {
                    const data = await res.json() as any;
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        reply = text.trim();
                    }
                }
            } catch (geminiErr) {
                console.warn('Falha no fallback Gemini:', geminiErr);
            }
        }

        // 4. Provedor Terciário: OpenAI API (via HTTP fetch nativo)
        if (!reply && this.env?.OPENAI_API_KEY) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...history.map(h => ({
                                role: h.sender_type === 'client' ? 'user' : 'assistant',
                                content: h.message
                            })),
                            { role: 'user', content: visitorMessage }
                        ],
                        max_tokens: 350
                    })
                });

                if (res.ok) {
                    const data = await res.json() as any;
                    const text = data?.choices?.[0]?.message?.content;
                    if (text) {
                        reply = text.trim();
                    }
                }
            } catch (openaiErr) {
                console.warn('Falha no fallback OpenAI:', openaiErr);
            }
        }

        // 5. Fallback Quaternário Determinístico Inteligente (garante resposta 100% resiliente)
        if (!reply) {
            reply = this.runDeterministicFallback(visitorMessage, visitorName);
        }

        // 6. Persistência da resposta e atualização de inteligência de CRM no D1
        let msgId: number | undefined;
        try {
            if (this.env?.DB) {
                const res = await this.env.DB.prepare(
                    `INSERT INTO conversation_messages (conversation_id, sender_type, sender_id, message, is_ai, created_at, updated_at)
                     VALUES (?, 'agent', NULL, ?, 1, datetime('now'), datetime('now'))`
                ).bind(conversationId, reply).run();

                msgId = Number(res.meta.last_row_id);

                // Evolução automática do funil de lead
                await this.env.DB.prepare(
                    `UPDATE conversations
                     SET lead_score = lead_score + 10,
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
        } catch (err) {
            console.error('Erro ao salvar resposta no banco:', err);
        }

        return {
            id: msgId,
            sender_type: 'agent',
            sender_name: 'GundjaTech AI',
            message: reply,
            is_ai: true,
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
