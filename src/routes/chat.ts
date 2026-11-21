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

    try {
        if (c.env?.DB) {
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
            const reqRes = await c.env.DB.prepare(
                `INSERT INTO service_requests (client_id, title, description, tracking_code, status, internal_notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 'new', ?, datetime('now'), datetime('now'))`
            ).bind(
                clientId,
                assunto || `Chat do Site • ${nome}`,
                mensagem,
                protocol,
                `Canal: Chat Online | Tema: ${tema}`
            ).run();

            const requestId = Number(reqRes.meta.last_row_id);

            // 3. Cria conversa de chat
            const convRes = await c.env.DB.prepare(
                `INSERT INTO conversations (session_id, client_id, visitor_name, visitor_email, visitor_phone, status, ai_enabled, crm_stage, lead_score, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 'waiting_staff', 1, 'new', 15, datetime('now'), datetime('now'))`
            ).bind(visitorToken, clientId, nome, email, telefone || null).run();

            conversationId = Number(convRes.meta.last_row_id);

            // 4. Salva a mensagem inicial do visitante
            await c.env.DB.prepare(
                `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                 VALUES (?, 'client', ?, 0, datetime('now'), datetime('now'))`
            ).bind(conversationId, mensagem).run();
        }
    } catch (err) {
        console.error('Erro ao persistir chat:', err);
    }

    // 5. Agente de IA autônomo gera a resposta
    const agent = new AutonomousCrmAgent(c.env);
    const aiReply = await agent.handleIncomingMessage(conversationId, mensagem, nome);

    const initialMessage = {
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
        status: 'waiting_staff',
        ai_enabled: true,
        crm_stage: 'new',
        ai_reply: aiReply,
        messages: [initialMessage, aiReply]
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

    let conversation: { id: number; status: string; visitor_name: string | null } | null = null;
    try {
        if (c.env?.DB) {
            conversation = await c.env.DB.prepare(
                `SELECT id, status, visitor_name FROM conversations WHERE session_id = ?`
            ).bind(visitorToken).first<{ id: number; status: string; visitor_name: string | null }>();
        }
    } catch {}

    const convId = conversation?.id || 1;
    const visitorName = conversation?.visitor_name || 'Visitante';

    try {
        if (c.env?.DB) {
            await c.env.DB.prepare(
                `INSERT INTO conversation_messages (conversation_id, sender_type, message, is_ai, created_at, updated_at)
                 VALUES (?, 'client', ?, 0, datetime('now'), datetime('now'))`
            ).bind(convId, message).run();
        }
    } catch {}

    const agent = new AutonomousCrmAgent(c.env);
    const aiReply = await agent.handleIncomingMessage(convId, message, visitorName);

    return c.json({
        ok: true,
        message: {
            sender_type: 'client',
            sender_name: visitorName,
            message,
            is_ai: false,
            created_at: new Date().toISOString()
        },
        ai_reply: aiReply,
        status: conversation?.status || 'waiting_staff'
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

    let messages: Array<{ id: number; sender_type: string; message: string; is_ai: number; created_at: string }> = [];
    try {
        if (c.env?.DB) {
            const conv = await c.env.DB.prepare(
                `SELECT id, status FROM conversations WHERE session_id = ?`
            ).bind(token).first<{ id: number; status: string }>();

            if (conv) {
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
        messages: messages.map((m) => ({
            id: m.id,
            sender_type: m.sender_type,
            message: m.message,
            is_ai: Boolean(m.is_ai),
            created_at: m.created_at
        }))
    });
});
