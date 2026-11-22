import type { Env } from '../types/env';

export type WhatsAppProvider = 'meta' | 'zapi' | 'zapi_omni' | 'evolution';

export interface WhatsAppSendResult {
    ok: boolean;
    provider?: WhatsAppProvider;
    messageId?: string;
    error?: string;
}

export function normalizeWhatsAppPhone(phone: string): string {
    return String(phone || '').replace(/\D+/g, '');
}

export function sameWhatsAppPhone(a: string, b: string): boolean {
    const da = normalizeWhatsAppPhone(a);
    const db = normalizeWhatsAppPhone(b);
    if (!da || !db) return false;
    if (da === db) return true;
    const va = getBrazilPhoneVariants(da);
    const vb = getBrazilPhoneVariants(db);
    return va.some((x) => vb.includes(x));
}

function getBrazilPhoneVariants(digits: string): string[] {
    const variants = [digits];
    if (digits.startsWith('55') && digits.length === 12) {
        variants.push(`${digits.slice(0, 4)}9${digits.slice(4)}`);
    } else if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
        variants.push(`${digits.slice(0, 4)}${digits.slice(5)}`);
    }
    return variants;
}

interface ResolvedWhatsAppConfig {
    provider: WhatsAppProvider;
    syncEnabled: boolean;
    directorPhone: string;
    // Meta Cloud API
    metaAccessToken: string;
    metaPhoneNumberId: string;
    metaApiVersion: string;
    // Z-API (QR Code)
    zapiInstanceId: string;
    zapiToken: string;
    zapiClientToken: string;
    // Evolution API (QR Code)
    evolutionBaseUrl: string;
    evolutionInstance: string;
    evolutionApiKey: string;
}

async function resolveWhatsAppConfig(env: Env): Promise<ResolvedWhatsAppConfig> {
    const cfg: ResolvedWhatsAppConfig = {
        provider: 'meta',
        syncEnabled: true,
        directorPhone: '',
        metaAccessToken: (env.WHATSAPP_ACCESS_TOKEN || '').trim(),
        metaPhoneNumberId: (env.WHATSAPP_PHONE_NUMBER_ID || '').trim(),
        metaApiVersion: (env.WHATSAPP_API_VERSION || 'v21.0').trim(),
        zapiInstanceId: '',
        zapiToken: '',
        zapiClientToken: '',
        evolutionBaseUrl: '',
        evolutionInstance: '',
        evolutionApiKey: ''
    };

    if (env?.DB) {
        try {
            const rows = await env.DB.prepare(
                `SELECT key, value FROM system_settings WHERE key IN (
                    'whatsapp_provider',
                    'whatsapp_sync_enabled',
                    'whatsapp_director_phone',
                    'whatsapp_access_token',
                    'whatsapp_phone_number_id',
                    'whatsapp_zapi_instance_id',
                    'whatsapp_zapi_token',
                    'whatsapp_zapi_client_token',
                    'whatsapp_evolution_url',
                    'whatsapp_evolution_instance',
                    'whatsapp_evolution_api_key'
                )`
            ).all<{ key: string; value: string }>();

            for (const row of rows.results || []) {
                const val = String(row.value || '').trim();
                if (row.key === 'whatsapp_sync_enabled') {
                    cfg.syncEnabled = val !== '0';
                    continue;
                }
                if (!val) continue;
                if (row.key === 'whatsapp_director_phone') {
                    cfg.directorPhone = normalizeWhatsAppPhone(val);
                    continue;
                }
                if (row.key === 'whatsapp_provider' && (val === 'zapi' || val === 'zapi_omni' || val === 'evolution' || val === 'meta')) {
                    cfg.provider = val;
                }
                if (row.key === 'whatsapp_access_token') cfg.metaAccessToken = val;
                if (row.key === 'whatsapp_phone_number_id') cfg.metaPhoneNumberId = val;
                if (row.key === 'whatsapp_zapi_instance_id') cfg.zapiInstanceId = val;
                if (row.key === 'whatsapp_zapi_token') cfg.zapiToken = val;
                if (row.key === 'whatsapp_zapi_client_token') cfg.zapiClientToken = val;
                if (row.key === 'whatsapp_evolution_url') cfg.evolutionBaseUrl = val.replace(/\/+$/, '');
                if (row.key === 'whatsapp_evolution_instance') cfg.evolutionInstance = val;
                if (row.key === 'whatsapp_evolution_api_key') cfg.evolutionApiKey = val;
            }
        } catch {}
    }

    return cfg;
}

async function sendViaZApiOmni(cfg: ResolvedWhatsAppConfig, to: string, body: string): Promise<WhatsAppSendResult> {
    const bearerKey = (cfg.zapiClientToken || cfg.zapiToken || '').trim();
    if (!cfg.zapiInstanceId || !bearerKey) {
        return { ok: false, provider: 'zapi_omni', error: 'Credenciais Z-API Omni não configuradas (ID do canal / Secret Key).' };
    }

    const channelId = cfg.zapiInstanceId.includes('/channels/')
        ? cfg.zapiInstanceId.split('/channels/')[1].split('/')[0]
        : cfg.zapiInstanceId;
    const baseHeaders: Record<string, string> = {
        Authorization: `Bearer ${bearerKey}`,
        'Content-Type': 'application/json'
    };

    const attempts: Array<{ url: string; headers: Record<string, string>; body: Record<string, unknown> }> = [
        // 1. Z-API Omni v1 /messages (endpoint oficial Omni com Workspace Secret Key)
        {
            url: `https://api.omni.z-api.io/v1/channels/${encodeURIComponent(channelId)}/messages`,
            headers: baseHeaders,
            body: {
                recipient: { identifier: to },
                content: { type: 'TEXT', body: { message: body.slice(0, 4096) } }
            }
        },
        // 2. Z-API Omni v1 /send-text (fallback compatibilidade)
        {
            url: `https://api.omni.z-api.io/v1/channels/${encodeURIComponent(channelId)}/send-text`,
            headers: baseHeaders,
            body: { phone: to, message: body.slice(0, 4096) }
        }
    ];

    let lastError = 'Falha ao enviar via Z-API Omni.';
    for (const attempt of attempts) {
        try {
            const res = await fetch(attempt.url, {
                method: 'POST',
                headers: attempt.headers,
                body: JSON.stringify(attempt.body)
            });

            const payload = (await res.json().catch(() => ({}))) as {
                id?: string;
                _id?: string;
                messageId?: string;
                zaapId?: string;
                error?: string;
                message?: string;
            };

            if (res.ok) {
                return {
                    ok: true,
                    provider: 'zapi_omni',
                    messageId: payload?.messageId || payload?.zaapId || payload?.id || payload?._id
                };
            }

            lastError = `${attempt.url} -> HTTP ${res.status}: ${payload?.message || payload?.error || 'erro'}`;
            console.warn('[WhatsApp Z-API Omni]', lastError);
            if (res.status === 401 || res.status === 403) {
                break;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Erro de rede Z-API Omni';
        }
    }

    return { ok: false, provider: 'zapi_omni', error: lastError };
}

async function sendViaZApi(cfg: ResolvedWhatsAppConfig, to: string, body: string): Promise<WhatsAppSendResult> {
    if (!cfg.zapiInstanceId || !cfg.zapiToken) {
        return { ok: false, provider: 'zapi', error: 'Credenciais Z-API não configuradas (Instance ID / Token).' };
    }

    try {
        const url = `https://api.z-api.io/instances/${encodeURIComponent(cfg.zapiInstanceId)}/token/${encodeURIComponent(cfg.zapiToken)}/send-text`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (cfg.zapiClientToken) {
            headers['Client-Token'] = cfg.zapiClientToken;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone: to, message: body.slice(0, 4096) })
        });

        const payload = (await res.json().catch(() => ({}))) as { messageId?: string; zaapId?: string; error?: string; message?: string };
        if (!res.ok) {
            return { ok: false, provider: 'zapi', error: payload?.error || payload?.message || `HTTP ${res.status}` };
        }

        return { ok: true, provider: 'zapi', messageId: payload?.messageId || payload?.zaapId };
    } catch (err) {
        return { ok: false, provider: 'zapi', error: err instanceof Error ? err.message : 'Erro de rede Z-API' };
    }
}

async function sendViaEvolution(cfg: ResolvedWhatsAppConfig, to: string, body: string): Promise<WhatsAppSendResult> {
    if (!cfg.evolutionBaseUrl || !cfg.evolutionInstance || !cfg.evolutionApiKey) {
        return { ok: false, provider: 'evolution', error: 'Credenciais Evolution API não configuradas (URL / Instância / API Key).' };
    }

    try {
        const url = `${cfg.evolutionBaseUrl}/message/sendText/${encodeURIComponent(cfg.evolutionInstance)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: cfg.evolutionApiKey
            },
            body: JSON.stringify({
                number: to,
                text: body.slice(0, 4096)
            })
        });

        const payload = (await res.json().catch(() => ({}))) as { key?: { id?: string }; message?: string; error?: string };
        if (!res.ok) {
            return { ok: false, provider: 'evolution', error: payload?.error || payload?.message || `HTTP ${res.status}` };
        }

        return { ok: true, provider: 'evolution', messageId: payload?.key?.id };
    } catch (err) {
        return { ok: false, provider: 'evolution', error: err instanceof Error ? err.message : 'Erro de rede Evolution API' };
    }
}

async function sendViaMeta(cfg: ResolvedWhatsAppConfig, to: string, body: string): Promise<WhatsAppSendResult> {
    if (!cfg.metaAccessToken || !cfg.metaPhoneNumberId) {
        return { ok: false, provider: 'meta', error: 'Credenciais da Meta WhatsApp Cloud API não configuradas.' };
    }

    const url = `https://graph.facebook.com/${cfg.metaApiVersion}/${cfg.metaPhoneNumberId}/messages`;
    const candidates = getBrazilPhoneVariants(to);
    let lastError = 'Falha ao enviar mensagem WhatsApp.';

    for (const recipient of candidates) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${cfg.metaAccessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: recipient,
                    type: 'text',
                    text: {
                        preview_url: false,
                        body: body.slice(0, 4096)
                    }
                })
            });

            const payload = (await response.json().catch(() => ({}))) as {
                messages?: Array<{ id?: string }>;
                error?: { message?: string; code?: number };
            };

            if (response.ok) {
                return {
                    ok: true,
                    provider: 'meta',
                    messageId: payload?.messages?.[0]?.id
                };
            }

            lastError = payload?.error?.message || `HTTP ${response.status}`;
            const code = payload?.error?.code;
            if (code !== 131030 && code !== 131026 && code !== 100) {
                break;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Erro de rede ao enviar mensagem WhatsApp';
            break;
        }
    }

    return { ok: false, provider: 'meta', error: lastError };
}

export async function sendWhatsAppTextMessage(
    env: Env,
    toPhone: string,
    bodyText: string,
    preferredProvider?: WhatsAppProvider,
    options?: { bypassSyncPause?: boolean }
): Promise<WhatsAppSendResult> {
    const to = normalizeWhatsAppPhone(toPhone);
    const body = String(bodyText || '').trim();

    if (!to || !body) {
        return { ok: false, error: 'Número de destino ou mensagem inválidos.' };
    }

    const cfg = await resolveWhatsAppConfig(env);
    const provider = preferredProvider || cfg.provider;

    if (!cfg.syncEnabled && !options?.bypassSyncPause) {
        return { ok: false, provider, error: 'Sincronização WhatsApp pausada nas configurações.' };
    }

    if (provider === 'zapi_omni') {
        return sendViaZApiOmni(cfg, to, body);
    }
    if (provider === 'zapi') {
        return sendViaZApi(cfg, to, body);
    }
    if (provider === 'evolution') {
        return sendViaEvolution(cfg, to, body);
    }
    return sendViaMeta(cfg, to, body);
}

/**
 * Envia alerta imediato para o WhatsApp 2 (Diretor / Atendimento Humano)
 * quando um visitante do chat do site solicita falar com um humano ou ocorre handoff.
 * Funciona independentemente da pausa da sincronização automática da IA no WhatsApp 1.
 */
export async function sendDirectorWhatsAppAlert(
    env: Env,
    params: {
        conversationId: number;
        visitorName: string;
        visitorEmail?: string | null;
        visitorPhone?: string | null;
        message: string;
        originUrl?: string;
        isFollowUp?: boolean;
    }
): Promise<WhatsAppSendResult> {
    const cfg = await resolveWhatsAppConfig(env);
    if (!cfg.directorPhone) {
        return { ok: false, provider: cfg.provider, error: 'WhatsApp do Diretor não configurado em /admin/configuracoes.' };
    }

    const header = params.isFollowUp
        ? '💬 *Nova mensagem (Atendimento Humano — Site)*'
        : '🔔 *Solicitação de Atendimento Humano — Chat do Site*';

    const lines = [
        header,
        '',
        `*Cliente:* ${params.visitorName || 'Visitante'}`,
        params.visitorEmail ? `*E-mail:* ${params.visitorEmail}` : '',
        params.visitorPhone ? `*Telefone:* ${params.visitorPhone}` : '',
        `*Mensagem:* "${params.message.slice(0, 600)}"`,
        '',
        '↩️ *Responda aqui mesmo no WhatsApp* para enviar direto ao cliente no site.',
        params.originUrl
            ? `🔗 Painel: ${params.originUrl}/admin/atendimento?id=${params.conversationId}`
            : `Conversa #${params.conversationId}`
    ].filter(Boolean);

    const result = await sendWhatsAppTextMessage(env, cfg.directorPhone, lines.join('\n'), cfg.provider, {
        bypassSyncPause: true
    });

    if (env?.KV_CACHE && params.conversationId > 0) {
        try {
            await env.KV_CACHE.put('wa:director:active_conv', String(params.conversationId), { expirationTtl: 86400 });
            if (result.messageId) {
                await env.KV_CACHE.put(`wa:director:msg:${result.messageId}`, String(params.conversationId), { expirationTtl: 86400 });
            }
        } catch {}
    }

    return result;
}

export async function markWhatsAppMessageRead(env: Env, messageId: string): Promise<void> {
    if (!messageId) {
        return;
    }

    const cfg = await resolveWhatsAppConfig(env);
    if (cfg.provider !== 'meta' || !cfg.metaAccessToken || !cfg.metaPhoneNumberId) {
        return;
    }

    try {
        await fetch(`https://graph.facebook.com/${cfg.metaApiVersion}/${cfg.metaPhoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cfg.metaAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            })
        });
    } catch {}
}
