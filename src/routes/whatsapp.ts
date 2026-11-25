import { Hono } from 'hono';
import type { AppVariables, Env } from '../types/env';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import { hmacVerifyHex, timingSafeEqual } from '../lib/crypto';
import {
    markWhatsAppMessageRead,
    normalizeWhatsAppPhone,
    sameWhatsAppPhone,
    sendDirectorWhatsAppAlert,
    sendWhatsAppTextMessage,
    type WhatsAppProvider
} from '../services/whatsapp';

function isWhatsAppHumanHandoffRequest(text: string): boolean {
    const normalized = String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return /(falar com (um |o |a )?(humano|atendente|pessoa|alguem|diretor|consultor|especialista|gerente|vendedor)|atendimento humano|transferir para humano|suporte humano|quero (um )?humano|quero falar com (uma )?pessoa|chamar (um )?(humano|atendente|diretor))/.test(
        normalized
    );
}

export const whatsappRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

interface NormalizedIncomingMessage {
    provider: WhatsAppProvider;
    messageId: string;
    quotedMessageId?: string;
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
                    quotedMessageId: String(
                        payload.referenceMessageId ||
                        payload.quotedMessageId ||
                        msgObj.referenceMessageId ||
                        msgObj.quotedMessageId ||
                        msgObj.context?.id ||
                        ''
                    ).trim() || undefined,
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

    const isProd = (c.env?.APP_ENV || c.env?.ENVIRONMENT || '').toLowerCase() === 'production';
    const configuredToken = (c.env?.WHATSAPP_VERIFY_TOKEN || '').trim();
    const expectedToken = configuredToken || (isProd ? '' : 'gundjatech_wa_verify_2026');

    if (mode === 'subscribe' && token && expectedToken && timingSafeEqual(token, expectedToken) && challenge) {
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
    const rawBody = await c.req.text();
    if (rawBody.length > 256 * 1024) {
        return c.json({ ok: false, error: 'Payload too large' }, 413);
    }

    const isProd = (c.env?.APP_ENV || c.env?.ENVIRONMENT || '').toLowerCase() === 'production';
    const appSecret = (c.env?.WHATSAPP_APP_SECRET || '').trim();
    const webhookSecret = (c.env?.WHATSAPP_WEBHOOK_SECRET || '').trim();

    if (isProd && !appSecret && !webhookSecret) {
        console.error('[WhatsApp Webhook] Bloqueado fail-closed: nenhum segredo de webhook configurado em produção.');
        return c.json({ ok: false, error: 'Webhook authentication not configured' }, 503);
    }

    const sigHeader = (c.req.header('x-hub-signature-256') || '').trim();
    const providedToken = (
        c.req.query('token') ||
        c.req.header('x-webhook-secret') ||
        c.req.header('client-token') ||
        ''
    ).trim();

    // Se vier assinatura Meta (ou só appSecret estiver configurado), valida HMAC-SHA256
    if (appSecret && (sigHeader || !webhookSecret)) {
        const providedHex = sigHeader.startsWith('sha256=') ? sigHeader.slice(7) : '';
        if (!providedHex || !(await hmacVerifyHex(rawBody, providedHex, appSecret))) {
            return c.json({ ok: false, error: 'Invalid webhook signature' }, 401);
        }
    } else if (webhookSecret) {
        if (!providedToken || !timingSafeEqual(providedToken, webhookSecret)) {
            return c.json({ ok: false, error: 'Invalid webhook token' }, 401);
        }
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return c.json({ ok: false, error: 'Invalid JSON payload' }, 400);
    }

    if (!isProd && c.env?.KV_CACHE) {
        try {
            await c.env.KV_CACHE.put(
                'wa:debug:last_incoming',
                JSON.stringify({ at: new Date().toISOString(), payload }).slice(0, 4000),
                { expirationTtl: 3600 }
            );
        } catch {}
    }

    // Carrega status dos canais WhatsApp 1 (Oficial/IA) e WhatsApp 2 (Diretor) em /admin/configuracoes
    let syncPaused = false;
    let whatsappAiEnabled = true;
    let directorEnabled = true;
    let directorPhone = '';
    if (c.env?.DB) {
        try {
            const cfgRows = await c.env.DB.prepare(
                `SELECT key, value FROM system_settings WHERE key IN ('whatsapp_sync_enabled', 'whatsapp_ai_enabled', 'whatsapp_director_enabled', 'whatsapp_director_phone')`
            ).all<{ key: string; value: string }>();
            for (const row of cfgRows.results || []) {
                if (row.key === 'whatsapp_sync_enabled' && row.value === '0') {
                    syncPaused = true;
                }
                if (row.key === 'whatsapp_ai_enabled' && row.value === '0') {
                    whatsappAiEnabled = false;
                }
                if (row.key === 'whatsapp_director_enabled' && row.value === '0') {
                    directorEnabled = false;
                }
                if (row.key === 'whatsapp_director_phone' && row.value) {
                    directorPhone = normalizeWhatsAppPhone(row.value);
                }
            }
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
        const { provider, messageId, quotedMessageId, fromPhone, contactName, text } = incoming;

        // Deduplicação contra retentativas de webhook
        if (messageId && c.env?.KV_CACHE) {
            try {
                const dedupKey = `wa:msg:${messageId}`;
                const alreadySeen = await c.env.KV_CACHE.get(dedupKey);
                if (alreadySeen) continue;
                await c.env.KV_CACHE.put(dedupKey, '1', { expirationTtl: 3600 });
            } catch {}
        }

        // Ponte Bidirecional: Se WhatsApp 2 (Diretor) estiver ativo e quem respondeu é o Diretor, injeta a resposta no atendimento!
        if (directorEnabled && directorPhone && sameWhatsAppPhone(fromPhone, directorPhone) && c.env?.DB) {
            let targetConvId = 0;
            let cleanReplyText = text.trim();

            const explicitMatch = cleanReplyText.match(/^#(\d+)\s+([\s\S]+)$/);
            if (explicitMatch) {
                targetConvId = Number(explicitMatch[1]);
                cleanReplyText = explicitMatch[2].trim();
            }

            if (!targetConvId && quotedMessageId && c.env?.KV_CACHE) {
                try {
                    const mapped = await c.env.KV_CACHE.get(`wa:director:msg:${quotedMessageId}`);
                    if (mapped) targetConvId = Number(mapped);
                } catch {}
            }

            if (!targetConvId && c.env?.KV_CACHE) {
                try {
                    const active = await c.env.KV_CACHE.get('wa:director:active_conv');
                    if (active) targetConvId = Number(active);
                } catch {}
            }

            if (!targetConvId) {
                try {
                    const latestSiteConv = await c.env.DB.prepare(
                        `SELECT id FROM conversations
                         WHERE channel = 'website_chat' AND status != 'closed'
                           AND (ai_enabled = 0 OR crm_stage = 'handoff_human' OR status = 'waiting_staff')
                         ORDER BY last_message_at DESC, id DESC LIMIT 1`
                    ).first<{ id: number }>();
                    if (latestSiteConv?.id) targetConvId = latestSiteConv.id;
                } catch {}
            }

            if (targetConvId > 0 && cleanReplyText) {
                try {
                    const targetConv = await c.env.DB.prepare(
                        `SELECT id, status FROM conversations WHERE id = ? AND status != 'closed' LIMIT 1`
                    ).bind(targetConvId).first<{ id: number; status: string }>();

                    if (targetConv) {
                        await c.env.DB.batch([
                            c.env.DB.prepare(
                                `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                                 VALUES (?, 'staff', ?, 0, datetime('now'), datetime('now'))`
                            ).bind(targetConvId, cleanReplyText),
                            c.env.DB.prepare(
                                `UPDATE conversations
                                 SET status = 'open', last_message_at = datetime('now'), updated_at = datetime('now')
                                 WHERE id = ? AND status != 'closed'`
                            ).bind(targetConvId)
                        ]);

                        processed.push({ provider, messageId, conversationId: targetConvId, replied: true });
                        continue;
                    }
                } catch (err) {
                    console.error('[WhatsApp Director Bridge] Erro ao encaminhar resposta ao site:', err);
                }
            }
        }

        // Se a sincronização automática WhatsApp 1 estiver pausada, não processa leads/IA
        if (syncPaused) {
            continue;
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

                // 2. Localiza conversa aberta/em atendimento de WhatsApp pelo telefone ou cria uma nova com session_id único
                const existingConv = await c.env.DB.prepare(
                    `SELECT id, ai_enabled FROM conversations
                     WHERE channel = 'whatsapp' AND visitor_phone = ? AND status != 'closed'
                     ORDER BY id DESC LIMIT 1`
                ).bind(fromPhone).first<{ id: number; ai_enabled: number }>();

                if (existingConv) {
                    conversationId = existingConv.id;
                    conversationAiEnabled = existingConv.ai_enabled !== 0;
                } else {
                    const sessionId = `wa:${fromPhone}:${Date.now()}`;
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

        // 4. Handoff Humano unificado (WhatsApp 1 -> Inbox Aguardando Humano + WhatsApp 2 Diretor) ou Piloto Automático IA
        let replied = false;
        const originUrl = new URL(c.req.url).origin;
        const wantsHuman = isWhatsAppHumanHandoffRequest(text);

        if (wantsHuman && conversationId) {
            const handoffMsg = directorEnabled && directorPhone
                ? 'Perfeito! Já transferi o seu atendimento para nossa equipe humana e notifiquei nosso diretor. Em instantes você será atendido por aqui.'
                : 'Perfeito! Já transferi o seu atendimento para a fila humana no nosso painel. Um especialista da GundjaTech dará continuidade em breve.';

            try {
                if (c.env?.DB) {
                    await c.env.DB.prepare(
                        `UPDATE conversations
                         SET ai_enabled = 0,
                             crm_stage = 'handoff_human',
                             status = 'waiting_staff',
                             handoff_at = COALESCE(handoff_at, datetime('now')),
                             updated_at = datetime('now')
                         WHERE id = ?`
                    ).bind(conversationId).run();

                    await c.env.DB.prepare(
                        `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                         VALUES (?, 'agent', ?, 1, datetime('now'), datetime('now'))`
                    ).bind(conversationId, handoffMsg).run();
                }
            } catch {}

            const sendRes = await sendWhatsAppTextMessage(c.env, fromPhone, handoffMsg, provider);
            replied = sendRes.ok;

            if (directorEnabled) {
                try {
                    await sendDirectorWhatsAppAlert(c.env, {
                        conversationId,
                        visitorName: contactName,
                        visitorPhone: fromPhone,
                        serviceTopic: `WhatsApp Oficial • ${contactName}`,
                        message: text,
                        originUrl,
                        sourceChannel: 'whatsapp'
                    });
                } catch {}
            }
        } else if (globalAiEnabled && whatsappAiEnabled && conversationAiEnabled && conversationId) {
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
            if (aiReply?.handoff && directorEnabled) {
                try {
                    await sendDirectorWhatsAppAlert(c.env, {
                        conversationId,
                        visitorName: contactName,
                        visitorPhone: fromPhone,
                        serviceTopic: `WhatsApp Oficial • ${contactName}`,
                        message: text,
                        originUrl,
                        sourceChannel: 'whatsapp'
                    });
                } catch {}
            }
        }

        processed.push({ provider, messageId, conversationId, replied });
    }

    return c.json({ ok: true, processed });
});
