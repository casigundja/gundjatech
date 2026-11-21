import type { Env } from '../types/env';

export interface WhatsAppSendResult {
    ok: boolean;
    messageId?: string;
    error?: string;
}

export function normalizeWhatsAppPhone(phone: string): string {
    return String(phone || '').replace(/\D+/g, '');
}

function getBrazilPhoneVariants(digits: string): string[] {
    const variants = [digits];
    // Meta frequentemente entrega celulares do Brasil (55 + DDD + 8 dígitos) sem o 9º dígito,
    // enquanto a lista permitida no modo teste usa 13 dígitos (55 + DDD + 9 + 8 dígitos).
    if (digits.startsWith('55') && digits.length === 12) {
        variants.push(`${digits.slice(0, 4)}9${digits.slice(4)}`);
    } else if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
        variants.push(`${digits.slice(0, 4)}${digits.slice(5)}`);
    }
    return variants;
}

async function resolveWhatsAppCredentials(env: Env): Promise<{
    accessToken: string;
    phoneNumberId: string;
    apiVersion: string;
}> {
    let accessToken = (env.WHATSAPP_ACCESS_TOKEN || '').trim();
    let phoneNumberId = (env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
    const apiVersion = (env.WHATSAPP_API_VERSION || 'v21.0').trim();

    if ((!accessToken || !phoneNumberId) && env?.DB) {
        try {
            const rows = await env.DB.prepare(
                `SELECT key, value FROM system_settings WHERE key IN ('whatsapp_access_token', 'whatsapp_phone_number_id')`
            ).all<{ key: string; value: string }>();

            for (const row of rows.results || []) {
                if (row.key === 'whatsapp_access_token' && !accessToken && row.value?.trim()) {
                    accessToken = row.value.trim();
                }
                if (row.key === 'whatsapp_phone_number_id' && !phoneNumberId && row.value?.trim()) {
                    phoneNumberId = row.value.trim();
                }
            }
        } catch {}
    }

    return { accessToken, phoneNumberId, apiVersion };
}

export async function sendWhatsAppTextMessage(
    env: Env,
    toPhone: string,
    bodyText: string
): Promise<WhatsAppSendResult> {
    const to = normalizeWhatsAppPhone(toPhone);
    const body = String(bodyText || '').trim();

    if (!to || !body) {
        return { ok: false, error: 'Número de destino ou mensagem inválidos.' };
    }

    const { accessToken, phoneNumberId, apiVersion } = await resolveWhatsAppCredentials(env);
    if (!accessToken || !phoneNumberId) {
        console.warn('[WhatsApp] Credenciais não configuradas (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).');
        return { ok: false, error: 'Credenciais da Meta WhatsApp Cloud API não configuradas.' };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const candidates = getBrazilPhoneVariants(to);
    let lastError = 'Falha ao enviar mensagem WhatsApp.';

    for (const recipient of candidates) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
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
                    messageId: payload?.messages?.[0]?.id
                };
            }

            lastError = payload?.error?.message || `HTTP ${response.status}`;
            console.error(`[WhatsApp] Falha ao enviar para ${recipient}:`, lastError);

            // Só tenta a variante com/sem 9º dígito se o erro for de destinatário não permitido/inválido
            const code = payload?.error?.code;
            if (code !== 131030 && code !== 131026 && code !== 100) {
                break;
            }
        } catch (err) {
            lastError = err instanceof Error ? err.message : 'Erro de rede ao enviar mensagem WhatsApp';
            console.error('[WhatsApp] Exceção ao enviar mensagem:', lastError);
            break;
        }
    }

    return { ok: false, error: lastError };
}

export async function markWhatsAppMessageRead(env: Env, messageId: string): Promise<void> {
    if (!messageId) {
        return;
    }

    const { accessToken, phoneNumberId, apiVersion } = await resolveWhatsAppCredentials(env);
    if (!accessToken || !phoneNumberId) {
        return;
    }

    try {
        await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
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
