import { Hono } from 'hono';
import type { AppVariables, Env } from '../types/env';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import {
    markWhatsAppMessageRead,
    normalizeWhatsAppPhone,
    sendWhatsAppTextMessage,
    type WhatsAppProvider
} from '../services/whatsapp';

export const whatsappRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

interface NormalizedIncomingMessage {
    provider: WhatsAppProvider;
    messageId: string;
    fromPhone: string;
    contactName: string;
    text: string;
}

function extractMetaText(msg: any): string {
    if (!msg) return '';
    if (msg.type === 'text' && msg.text?.body) return String(msg.text.body).trim();
    if (msg.type === 'button' && msg.button?.text) return String(msg.button.text).trim();
    if (msg.type === 'interactive') {
        return String(msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '').trim();
    }
    if (msg.type === 'image') return msg.image?.caption ? `[Imagem] ${msg.image.caption}` : '[Imagem enviada via WhatsApp]';
    if (msg.type === 'document') return msg.document?.caption ? `[Documento] ${msg.document.caption}` : '[Documento enviado via WhatsApp]';
    if (msg.type === 'audio') return '[Áudio enviado via WhatsApp]';
    return '';
}

function parseIncomingWebhook(payload: any): {
    messages: NormalizedIncomingMessage[];
    metaStatuses: any[];
} {
    const messages: NormalizedIncomingMessage[] = [];
    const metaStatuses: any[] = [];

    // 0. Z-API Omni v1 / Z-API Clássico (suporta ambos formatos: top-level ReceivedCallback e nested data.message)
    const omniType = String(payload?.type || payload?.event || '').toLowerCase();
    if (payload && (payload.channelId || payload.instanceId || omniType === 'receivedcallback' || omniType === 'message.received')) {
        const msgObj = payload.data?.message || payload.message || payload.data || payload;
        const contactObj = payload.data?.contact || payload.contact || {};
        const isFromMe = Boolean(
            payload.fromMe ||
            msgObj.fromMe ||
            payload.data?.fromMe ||
            msgObj.direction === 'outbound'
        );
        const isGroup = Boolean(
            payload.isGroup ||
            msgObj.isGroup ||
            payload.data?.isGroup ||
            payload.isNewsletter ||
            payload.broadcast ||
            String(msgObj.from || payload.phone || '').endsWith('@g.us')
        );

        const isIncomingEvent =
            omniType === 'receivedcallback' ||
            omniType === 'message.received' ||
            omniType === 'received' ||
            !omniType;

        if (!isFromMe && !isGroup && isIncomingEvent) {
            const fromPhone = normalizeWhatsAppPhone(
                payload.phone ||
                contactObj.phone ||
                contactObj.identifier ||
                msgObj.from ||
                payload.data?.from ||
                ''
            );
            const text = String(
                payload.text?.message ||
                payload.buttonsResponseMessage?.message ||
                payload.listResponseMessage?.message ||
                payload.image?.caption ||
                payload.document?.caption ||
                (payload.audio ? '[Áudio enviado via WhatsApp]' : '') ||
                msgObj.text?.body ||
                msgObj.text?.message ||
                msgObj.content?.body?.message ||
                msgObj.content?.text?.body ||
                msgObj.body?.message ||
                (typeof msgObj.body === 'string' ? msgObj.body : '') ||
                (typeof msgObj.text === 'string' ? msgObj.text : '') ||
                ''
            ).trim();
            if (fromPhone && text) {
                const detectedProvider: WhatsAppProvider = payload.channelId ? 'zapi_omni' : 'zapi';
                messages.push({
                    provider: detectedProvider,
                    messageId: String(payload.messageId || payload.zaapId || msgObj._id || msgObj.id || payload.eventId || '').trim(),
                    fromPhone,
                    contactName: String(payload.senderName || payload.chatName || contactObj.name || msgObj.senderName || `WhatsApp ${fromPhone}`).trim(),
                    text
                });
            }
        }
        return { messages, metaStatuses };
    }

    // 2. Evolution API v2 Webhook Format (QR Code)
    const eventName = String(payload?.event || '').toLowerCase();
    if (eventName === 'messages.upsert' || eventName === 'messages_upsert') {
        const items = Array.isArray(payload?.data) ? payload.data : payload?.data ? [payload.data] : [];
        for (const item of items) {
            const key = item?.key || {};
            const remoteJid = String(key.remoteJid || '');
            if (key.fromMe || !remoteJid || remoteJid.endsWith('@g.us')) {
                continue;
            }
            const fromPhone = normalizeWhatsAppPhone(remoteJid.split('@')[0]);
            const m = item?.message || {};
            const text = String(
                m.conversation ||
                m.extendedTextMessage?.text ||
                m.imageMessage?.caption ||
                m.documentMessage?.caption ||
                (m.audioMessage ? '[Áudio enviado via WhatsApp]' : '')
            ).trim();
            if (fromPhone && text) {
                messages.push({
                    provider: 'evolution',
                    messageId: String(key.id || '').trim(),
                    fromPhone,
                    contactName: String(item?.pushName || `WhatsApp ${fromPhone}`).trim(),
                    text
                });
            }
        }
        return { messages, metaStatuses };
    }

    // 3. Meta WhatsApp Cloud API Oficial
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
        const changes = Array.isArray(entry?.changes) ? entry.changes : [];
        for (const change of changes) {
            if (change?.field !== 'messages') continue;
            const value = change?.value || {};
            const rawMessages = Array.isArray(value.messages) ? value.messages : [];
            const contacts = Array.isArray(value.contacts) ? value.contacts : [];
            const statuses = Array.isArray(value.statuses) ? value.statuses : [];
            if (statuses.length > 0) metaStatuses.push(...statuses);

            for (const msg of rawMessages) {
                const fromPhone = normalizeWhatsAppPhone(msg?.from || '');
                const text = extractMetaText(msg);
                if (!fromPhone || !text) continue;
                const matchedContact = contacts.find(
                    (ct: any) => normalizeWhatsAppPhone(ct?.wa_id || '') === fromPhone
                ) || contacts[0];
                messages.push({
                    provider: 'meta',
                    messageId: String(msg?.id || '').trim(),
                    fromPhone,
                    contactName: String(matchedContact?.profile?.name || `WhatsApp ${fromPhone}`).trim(),
                    text
                });
            }
        }
    }

    return { messages, metaStatuses };
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
 * Recebe mensagens do WhatsApp (Z-API, Evolution API ou Meta Cloud API),
 * registra no CRM/Inbox e aciona o Agente IA autônomo.
 */
whatsappRoutes.post('/', async (c) => {
    let payload: any;
    try {
        payload = await c.req.json();
    } catch {
        return c.json({ ok: false, error: 'Invalid JSON payload' }, 400);
    }

    if (c.env?.KV_CACHE) {
        try {
            await c.env.KV_CACHE.put(
                'wa:debug:last_incoming',
                JSON.stringify({ at: new Date().toISOString(), payload }).slice(0, 4000),
                { expirationTtl: 3600 }
            );
        } catch {}
    }

    const { messages, metaStatuses } = parseIncomingWebhook(payload);

    if (metaStatuses.length > 0 && c.env?.KV_CACHE) {
        try {
            const lastStatus = metaStatuses[metaStatuses.length - 1];
            await c.env.KV_CACHE.put(
                'wa:debug:last_status',
                JSON.stringify({ at: new Date().toISOString(), status: lastStatus }),
                { expirationTtl: 86400 }
            );
        } catch {}
    }

    const processed: Array<{ provider: WhatsAppProvider; messageId: string; conversationId?: number; replied: boolean }> = [];

    for (const incoming of messages) {
        const { provider, messageId, fromPhone, contactName, text } = incoming;

        // Deduplicação contra retentativas de webhook
        if (messageId && c.env?.KV_CACHE) {
            try {
                const dedupKey = `wa:msg:${messageId}`;
                const alreadySeen = await c.env.KV_CACHE.get(dedupKey);
                if (alreadySeen) continue;
                await c.env.KV_CACHE.put(dedupKey, '1', { expirationTtl: 3600 });
            } catch {}
        }

        let globalAiEnabled = true;
        let conversationId: number | undefined;
        let conversationAiEnabled = true;

        try {
            if (c.env?.DB) {
                try {
                    const aiCfg = await c.env.DB.prepare(
                        `SELECT value FROM system_settings WHERE key = 'crm_ai_enabled'`
                    ).first<{ value: string }>();
                    if (aiCfg && aiCfg.value === '0') {
                        globalAiEnabled = false;
                    }
                } catch {}

                // 1. Localiza ou cria cliente pelo telefone
                const client = await c.env.DB.prepare(
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

                // 3. Salva mensagem recebida do cliente no D1
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

        if (provider === 'meta' && messageId) {
            await markWhatsAppMessageRead(c.env, messageId);
        }

        // 4. Se Piloto Automático IA estiver ativo, gera resposta e envia ao WhatsApp
        let replied = false;
        if (globalAiEnabled && conversationAiEnabled && conversationId) {
            const agent = new AutonomousCrmAgent(c.env);
            const aiReply = await agent.handleIncomingMessage(conversationId, text, contactName);
            if (aiReply?.message) {
                const sendRes = await sendWhatsAppTextMessage(c.env, fromPhone, aiReply.message, provider);
                replied = sendRes.ok;
                if (c.env?.KV_CACHE) {
                    try {
                        await c.env.KV_CACHE.put(
                            'wa:debug:last_send',
                            JSON.stringify({
                                at: new Date().toISOString(),
                                provider,
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

        processed.push({ provider, messageId, conversationId, replied });
    }

    return c.json({ ok: true, processed });
});
