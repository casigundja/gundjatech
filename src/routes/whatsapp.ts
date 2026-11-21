import { Hono } from 'hono';
import type { AppVariables, Env } from '../types/env';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import {
    markWhatsAppMessageRead,
    normalizeWhatsAppPhone,
    sendWhatsAppTextMessage
} from '../services/whatsapp';

export const whatsappRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

function extractIncomingText(msg: any): string {
    if (!msg) return '';
    if (msg.type === 'text' && msg.text?.body) {
        return String(msg.text.body).trim();
    }
    if (msg.type === 'button' && msg.button?.text) {
        return String(msg.button.text).trim();
    }
    if (msg.type === 'interactive') {
        const title =
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            '';
        return String(title).trim();
    }
    if (msg.type === 'image') {
        return msg.image?.caption ? `[Imagem] ${msg.image.caption}` : '[Imagem enviada via WhatsApp]';
    }
    if (msg.type === 'document') {
        return msg.document?.caption ? `[Documento] ${msg.document.caption}` : '[Documento enviado via WhatsApp]';
    }
    if (msg.type === 'audio') {
        return '[Áudio enviado via WhatsApp]';
    }
    return '';
}

/**
 * GET /api/webhooks/whatsapp
 * Verificação obrigatória do Webhook pela Meta WhatsApp Cloud API.
 */
whatsappRoutes.get('/', (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    const expectedToken = (c.env?.WHATSAPP_VERIFY_TOKEN || 'gundjatech_wa_verify_2026').trim();

    if (mode === 'subscribe' && token && token === expectedToken && challenge) {
        return c.text(challenge, 200);
    }

    return c.json({ error: 'Webhook verification failed' }, 403);
});

/**
 * POST /api/webhooks/whatsapp
 * Recebe mensagens de clientes do WhatsApp, registra no CRM/Inbox e aciona o Agente IA autônomo.
 */
whatsappRoutes.post('/', async (c) => {
    let payload: any;
    try {
        payload = await c.req.json();
    } catch {
        return c.json({ ok: false, error: 'Invalid JSON payload' }, 400);
    }

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    const processed: Array<{ messageId: string; conversationId?: number; replied: boolean }> = [];

    for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
            if (change?.field !== 'messages') {
                continue;
            }

            const value = change?.value || {};
            const messages = Array.isArray(value.messages) ? value.messages : [];
            const contacts = Array.isArray(value.contacts) ? value.contacts : [];
            const statuses = Array.isArray(value.statuses) ? value.statuses : [];

            // Registra status de entrega / falhas retornadas pela Meta para diagnóstico
            if (statuses.length > 0 && c.env?.KV_CACHE) {
                try {
                    const lastStatus = statuses[statuses.length - 1];
                    console.log('[WhatsApp Status]', JSON.stringify(lastStatus));
                    await c.env.KV_CACHE.put(
                        'wa:debug:last_status',
                        JSON.stringify({ at: new Date().toISOString(), status: lastStatus }),
                        { expirationTtl: 86400 }
                    );
                } catch {}
            }

            for (const msg of messages) {
                const messageId = String(msg?.id || '').trim();
                const fromPhone = normalizeWhatsAppPhone(msg?.from || '');
                const text = extractIncomingText(msg);

                if (!fromPhone || !text) {
                    continue;
                }

                // Deduplicação contra retentativas de webhook da Meta
                if (messageId && c.env?.KV_CACHE) {
                    try {
                        const dedupKey = `wa:msg:${messageId}`;
                        const alreadySeen = await c.env.KV_CACHE.get(dedupKey);
                        if (alreadySeen) {
                            continue;
                        }
                        await c.env.KV_CACHE.put(dedupKey, '1', { expirationTtl: 3600 });
                    } catch {}
                }

                const matchedContact = contacts.find(
                    (ct: any) => normalizeWhatsAppPhone(ct?.wa_id || '') === fromPhone
                ) || contacts[0];
                const contactName = String(matchedContact?.profile?.name || `WhatsApp ${fromPhone}`).trim();

                let globalAiEnabled = true;
                let conversationId: number | undefined;
                let conversationAiEnabled = true;

                try {
                    if (c.env?.DB) {
                        // Verifica flag global do Piloto Automático IA
                        try {
                            const aiCfg = await c.env.DB.prepare(
                                `SELECT value FROM system_settings WHERE key = 'crm_ai_enabled'`
                            ).first<{ value: string }>();
                            if (aiCfg && aiCfg.value === '0') {
                                globalAiEnabled = false;
                            }
                        } catch {}

                        // 1. Localiza ou cria cliente pelo telefone
                        let client = await c.env.DB.prepare(
                            `SELECT id, name FROM clients WHERE replace(replace(replace(replace(coalesce(phone, ''), ' ', ''), '-', ''), '(', ''), ')', '') = ? LIMIT 1`
                        ).bind(fromPhone).first<{ id: number; name: string }>();

                        let clientId: number;
                        if (!client) {
                            const syntheticEmail = `wa.${fromPhone}@whatsapp.gundjatech.local`;
                            const clientRes = await c.env.DB.prepare(
                                `INSERT INTO clients (name, email, phone, status, is_active, created_at, updated_at)
                                 VALUES (?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                            ).bind(contactName, syntheticEmail, fromPhone).run();
                            clientId = Number(clientRes.meta.last_row_id);
                        } else {
                            clientId = client.id;
                        }

                        // 2. Localiza conversa aberta de WhatsApp ou cria uma nova
                        const sessionId = `wa:${fromPhone}`;
                        const existingConv = await c.env.DB.prepare(
                            `SELECT id, ai_enabled FROM conversations
                             WHERE session_id = ? AND status = 'open'
                             ORDER BY id DESC LIMIT 1`
                        ).bind(sessionId).first<{ id: number; ai_enabled: number }>();

                        if (existingConv) {
                            conversationId = existingConv.id;
                            conversationAiEnabled = existingConv.ai_enabled !== 0;
                        } else {
                            const convRes = await c.env.DB.prepare(
                                `INSERT INTO conversations (session_id, client_id, subject, channel, visitor_name, visitor_email, visitor_phone, status, ai_enabled, crm_stage, lead_score, last_message_at, created_at, updated_at)
                                 VALUES (?, ?, ?, 'whatsapp', ?, ?, ?, 'open', ?, 'greeting', 15, datetime('now'), datetime('now'), datetime('now'))`
                            ).bind(
                                sessionId,
                                clientId,
                                `WhatsApp • ${contactName}`,
                                contactName,
                                `wa.${fromPhone}@whatsapp.gundjatech.local`,
                                fromPhone,
                                globalAiEnabled ? 1 : 0
                            ).run();

                            conversationId = Number(convRes.meta.last_row_id);
                            conversationAiEnabled = globalAiEnabled;
                        }

                        // 3. Registra mensagem recebida do cliente no D1
                        await c.env.DB.prepare(
                            `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                             VALUES (?, 'client', ?, 0, datetime('now'), datetime('now'))`
                        ).bind(conversationId, text).run();

                        await c.env.DB.prepare(
                            `UPDATE conversations SET last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
                        ).bind(conversationId).run();
                    }
                } catch (dbErr) {
                    console.error('[WhatsApp Webhook] Erro ao persistir conversa no D1:', dbErr);
                }

                // Marca como lida no WhatsApp (best-effort)
                if (messageId) {
                    await markWhatsAppMessageRead(c.env, messageId);
                }

                // 4. Se Piloto Automático IA estiver ativo, gera resposta e envia ao WhatsApp
                let replied = false;
                if (globalAiEnabled && conversationAiEnabled && conversationId) {
                    const agent = new AutonomousCrmAgent(c.env);
                    const aiReply = await agent.handleIncomingMessage(conversationId, text, contactName);
                    if (aiReply?.message) {
                        const sendRes = await sendWhatsAppTextMessage(c.env, fromPhone, aiReply.message);
                        replied = sendRes.ok;
                        if (c.env?.KV_CACHE) {
                            try {
                                await c.env.KV_CACHE.put(
                                    'wa:debug:last_send',
                                    JSON.stringify({
                                        at: new Date().toISOString(),
                                        to: fromPhone,
                                        ok: sendRes.ok,
                                        messageId: sendRes.messageId || null,
                                        error: sendRes.error || null
                                    }),
                                    { expirationTtl: 86400 }
                                );
                            } catch {}
                        }
                    }
                }

                processed.push({ messageId, conversationId, replied });
            }
        }
    }

    return c.json({ ok: true, processed });
});
