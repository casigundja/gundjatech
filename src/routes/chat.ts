import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { getRequestBody } from '../lib/request';
import { AutonomousCrmAgent } from '../services/ai-crm-agent';
import { generateRandomToken } from '../lib/crypto';

export const chatRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ----------------------------------------------------
// INICIAR CONVERSA (START CHAT) - Paridade com Laravel apiChatStart
// ----------------------------------------------------
chatRoutes.post('/start', async (c) => {
    const body = await getRequestBody(c);

    // Proteção antispam honeypot
    if (body.sobrenome_hp) {
        return c.json({ ok: true });
    }

    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const telefone = String(body.telefone || '').trim();
    const assunto = String(body.assunto || '').trim();
    const mensagem = String(body.mensagem || '').trim();
    const tema = String(body.tema || 'geral').trim();
    let visitorToken = String(body.visitor_token || '').trim();

    if (!nome || !email || !mensagem) {
        return c.json({ error: 'Preencha nome, email e mensagem para iniciar o atendimento.' }, 422);
    }

    if (!visitorToken) {
        visitorToken = generateRandomToken(32);
    }

    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const protocol = `CHAT-${dateStr}-${randomChars}`;

    let conversationId = 1;
    let clientMsgId = 1;
    let globalAiEnabled = true;

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

            // 1. Cria ou atualiza cliente
            let client = await c.env.DB.prepare(
                `SELECT id FROM clients WHERE lower(email) = ?`
            ).bind(email).first<{ id: number }>();

            let clientId: number;
            if (!client) {
                const clientRes = await c.env.DB.prepare(
                    `INSERT INTO clients (name, email, phone, status, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, 'lead', 1, datetime('now'), datetime('now'))`
                ).bind(nome, email, telefone || null).run();
                clientId = Number(clientRes.meta.last_row_id);
            } else {
                clientId = client.id;
            }

            // 2. Cria solicitação de atendimento vinculada
            await c.env.DB.prepare(
                `INSERT INTO service_requests (protocol, tracking_code, client_id, name, email, phone, title, service_title, description, status, internal_notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, datetime('now'), datetime('now'))`
            ).bind(
                protocol,
                protocol,
                clientId,
                nome,
                email,
                telefone || null,
                assunto || `Chat do Site • ${nome}`,
                assunto || `Chat do Site • ${nome}`,
                mensagem,
                `Canal: Chat Online | Tema: ${tema}`
            ).run();

            // 3. Cria conversa de chat
            const convRes = await c.env.DB.prepare(
                `INSERT INTO conversations (session_id, client_id, subject, channel, visitor_name, visitor_email, visitor_phone, status, ai_enabled, crm_stage, lead_score, last_message_at, created_at, updated_at)
                 VALUES (?, ?, ?, 'website_chat', ?, ?, ?, 'open', ?, 'qualifying', 15, datetime('now'), datetime('now'), datetime('now'))`
            ).bind(visitorToken, clientId, assunto || `Chat • ${nome}`, nome, email, telefone || null, globalAiEnabled ? 1 : 0).run();

            conversationId = Number(convRes.meta.last_row_id);

            // 4. Salva a mensagem inicial do visitante
            const msgRes = await c.env.DB.prepare(
                `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                 VALUES (?, 'client', ?, 0, datetime('now'), datetime('now'))`
            ).bind(conversationId, mensagem).run();
            clientMsgId = Number(msgRes.meta.last_row_id) || 1;
        }
    } catch (err) {
        console.error('Erro ao persistir chat:', err);
    }

    // 5. Agente de IA autônomo gera a resposta se habilitado
    let aiReply = null;
    if (globalAiEnabled) {
        const agent = new AutonomousCrmAgent(c.env);
        aiReply = await agent.handleIncomingMessage(conversationId, mensagem, nome);
    }

    const initialMessage = {
        id: clientMsgId,
        sender_type: 'client',
        sender_name: nome,
        message: mensagem,
        is_ai: false,
        created_at: new Date().toISOString()
    };

    return c.json({
        ok: true,
        conversation_id: conversationId,
        visitor_token: visitorToken,
        protocol,
        status: 'open',
        ai_enabled: globalAiEnabled,
        crm_stage: 'qualifying',
        ai_reply: aiReply,
        messages: aiReply ? [initialMessage, aiReply] : [initialMessage]
    }, 201);
});

// ----------------------------------------------------
// ENVIAR MENSAGEM NO CHAT - Paridade com Laravel apiChatMessage
// ----------------------------------------------------
chatRoutes.post('/message', async (c) => {
    const body = await getRequestBody(c);
    const visitorToken = String(body.visitor_token || '').trim();
    const message = String(body.message || '').trim();

    if (!visitorToken || !message) {
        return c.json({ ok: false, error: 'Parâmetros inválidos' }, 422);
    }

    let conversation: { id: number; status: string; visitor_name: string | null; ai_enabled?: number } | null = null;
    let globalAiEnabled = true;

    try {
        if (c.env?.DB) {
            conversation = await c.env.DB.prepare(
                `SELECT id, status, visitor_name, ai_enabled FROM conversations WHERE session_id = ?`
            ).bind(visitorToken).first<{ id: number; status: string; visitor_name: string | null; ai_enabled?: number }>();

            try {
                const aiCfg = await c.env.DB.prepare(
                    `SELECT value FROM system_settings WHERE key = 'crm_ai_enabled'`
                ).first<{ value: string }>();
                if (aiCfg && aiCfg.value === '0') {
                    globalAiEnabled = false;
                }
            } catch {}
        }
    } catch {}

    if (conversation && conversation.status === 'closed') {
        return c.json({
            ok: false,
            status: 'closed',
            message: 'Este atendimento foi encerrado pela equipe.'
        }, 409);
    }

    const convId = conversation?.id || 1;
    const visitorName = conversation?.visitor_name || 'Visitante';
    let clientMsgId = Date.now();

    try {
        if (c.env?.DB) {
            const msgRes = await c.env.DB.prepare(
                `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                 VALUES (?, 'client', ?, 0, datetime('now'), datetime('now'))`
            ).bind(convId, message).run();
            clientMsgId = Number(msgRes.meta.last_row_id) || clientMsgId;

            await c.env.DB.prepare(
                `UPDATE conversations SET last_message_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
            ).bind(convId).run();
        }
    } catch {}

    const shouldRunAi = globalAiEnabled && (conversation ? Boolean(conversation.ai_enabled ?? 1) : true);
    let aiReply = null;
    if (shouldRunAi) {
        const agent = new AutonomousCrmAgent(c.env);
        aiReply = await agent.handleIncomingMessage(convId, message, visitorName);
    }

    return c.json({
        ok: true,
        message: {
            id: clientMsgId,
            sender_type: 'client',
            sender_name: visitorName,
            message,
            is_ai: false,
            created_at: new Date().toISOString()
        },
        ai_reply: aiReply,
        status: conversation?.status || 'open'
    });
});

// ----------------------------------------------------
// LISTAR HISTÓRICO DE MENSAGENS - Paridade com Laravel apiChatMessages
// ----------------------------------------------------
chatRoutes.get('/messages', async (c) => {
    const token = c.req.query('token') || c.req.query('visitor_token') || '';
    const afterId = c.req.query('after_id') ? parseInt(c.req.query('after_id')!, 10) : 0;

    if (!token) {
        return c.json({ ok: false, error: 'Token obrigatório' }, 422);
    }

    let convStatus = 'open';
    let messages: Array<{ id: number; sender_type: string; message: string; is_ai: number; created_at: string }> = [];
    try {
        if (c.env?.DB) {
            const conv = await c.env.DB.prepare(
                `SELECT id, status FROM conversations WHERE session_id = ?`
            ).bind(token).first<{ id: number; status: string }>();

            if (conv) {
                convStatus = conv.status || 'open';
                const query = afterId > 0
                    ? `SELECT id, sender_type, message, is_ai, created_at FROM conversation_messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC`
                    : `SELECT id, sender_type, message, is_ai, created_at FROM conversation_messages WHERE conversation_id = ? ORDER BY id ASC`;

                const stmt = afterId > 0
                    ? c.env.DB.prepare(query).bind(conv.id, afterId)
                    : c.env.DB.prepare(query).bind(conv.id);

                const res = await stmt.all<{ id: number; sender_type: string; message: string; is_ai: number; created_at: string }>();
                messages = res.results || [];
            }
        }
    } catch {}

    return c.json({
        ok: true,
        status: convStatus,
        messages: messages.map((m) => ({
            id: m.id,
            sender_type: m.sender_type === 'client' || m.sender_type === 'visitor' ? 'client' : 'staff',
            sender_name: m.sender_type === 'client' || m.sender_type === 'visitor' ? '' : (m.is_ai ? 'Assistente IA GundjaTech' : 'Equipe GundjaTech'),
            message: m.message,
            is_ai: Boolean(m.is_ai),
            created_at: m.created_at
        }))
    });
});
