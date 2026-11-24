import { Env } from '../types/env';
import { sendEmail } from '../lib/email';
import { renderQrCodeDataUri } from '../lib/qr';

export type PixGatewayProvider = 'static' | 'mercadopago' | 'asaas';

export interface PixGatewayConfig {
    provider: PixGatewayProvider;
    apiKey: string;
    webhookSecret: string;
    sandbox: boolean;
}

export async function loadPixGatewayConfig(db?: D1Database): Promise<PixGatewayConfig> {
    const cfg: PixGatewayConfig = {
        provider: 'static',
        apiKey: '',
        webhookSecret: '',
        sandbox: false
    };
    if (!db) return cfg;

    try {
        const res = await db.prepare(
            `SELECT key, value FROM system_settings
             WHERE key IN (
               'payment_gateway_provider',
               'payment_gateway_api_key',
               'payment_gateway_webhook_secret',
               'payment_gateway_sandbox'
             )`
        ).all<{ key: string; value: string }>();

        for (const r of res.results || []) {
            const val = String(r.value || '').trim();
            if (r.key === 'payment_gateway_provider' && (val === 'mercadopago' || val === 'asaas' || val === 'static')) {
                cfg.provider = val;
            } else if (r.key === 'payment_gateway_api_key' && val) {
                cfg.apiKey = val;
            } else if (r.key === 'payment_gateway_webhook_secret' && val) {
                cfg.webhookSecret = val;
            } else if (r.key === 'payment_gateway_sandbox') {
                cfg.sandbox = val === '1' || val === 'true';
            }
        }
    } catch { }

    return cfg;
}

export function extractInvoiceIdFromRef(ref: string | null | undefined): number | null {
    const m = String(ref || '').trim().match(/^GTFAT0*(\d+)$/i);
    if (!m) return null;
    const id = parseInt(m[1], 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

export interface DynamicPixCharge {
    provider: PixGatewayProvider;
    gatewayPaymentId: string;
    pixPayload: string;
    qrDataUri: string;
    expiresAt?: string;
}

/**
 * Cria (ou recupera do KV_CACHE) uma cobrança PIX Dinâmica no Mercado Pago ou Asaas.
 * Retorna null se o provedor estiver em modo 'static' ou sem credenciais configuradas.
 */
export async function getOrCreateDynamicPixCharge(
    env: Env,
    db: D1Database,
    tx: any,
    client: any
): Promise<DynamicPixCharge | null> {
    const cfg = await loadPixGatewayConfig(db);
    if (cfg.provider === 'static' || !cfg.apiKey) return null;

    const amount = Number(tx.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const externalRef = `GTFAT${String(tx.id).padStart(5, '0')}`;
    const cacheKey = `pix_charge:${cfg.provider}:${tx.id}:${amount.toFixed(2)}`;

    try {
        if (env.KV_CACHE) {
            const cached = await env.KV_CACHE.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached) as DynamicPixCharge;
                if (parsed?.pixPayload && parsed?.gatewayPaymentId) {
                    return parsed;
                }
            }
        }
    } catch { }

    const appUrl = (env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');

    if (cfg.provider === 'mercadopago') {
        try {
            const payerEmail =
                client?.email && !String(client.email).endsWith('.local')
                    ? String(client.email).trim()
                    : 'financeiro@gundjatech.com';
            const fullName = String(client?.name || client?.company || 'Cliente GundjaTech').trim();
            const [firstName, ...rest] = fullName.split(/\s+/);
            const lastName = rest.join(' ') || 'Cliente';

            const res = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${cfg.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `${externalRef}-${Math.floor(Date.now() / (25 * 60 * 1000))}`
                },
                body: JSON.stringify({
                    transaction_amount: Number(amount.toFixed(2)),
                    description: String(tx.description || `Fatura #${tx.id} GundjaTech`).slice(0, 120),
                    payment_method_id: 'pix',
                    external_reference: externalRef,
                    notification_url: `${appUrl}/api/webhooks/pix`,
                    payer: {
                        email: payerEmail,
                        first_name: firstName,
                        last_name: lastName
                    }
                })
            });

            if (!res.ok) return null;
            const data = (await res.json()) as any;
            const qrCode = String(data?.point_of_interaction?.transaction_data?.qr_code || '').trim();
            const paymentId = String(data?.id || '').trim();
            if (!qrCode || !paymentId) return null;

            const result: DynamicPixCharge = {
                provider: 'mercadopago',
                gatewayPaymentId: paymentId,
                pixPayload: qrCode,
                qrDataUri: renderQrCodeDataUri(qrCode),
                expiresAt: data?.date_of_expiration || undefined
            };

            try {
                if (env.KV_CACHE) {
                    await env.KV_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1500 });
                    await env.KV_CACHE.put(`pix_tx_gw:${tx.id}`, JSON.stringify({ provider: 'mercadopago', gatewayPaymentId: paymentId }), { expirationTtl: 86400 });
                }
            } catch { }

            return result;
        } catch {
            return null;
        }
    }

    if (cfg.provider === 'asaas') {
        try {
            const baseUrl = cfg.sandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
            const headers = {
                access_token: cfg.apiKey,
                'Content-Type': 'application/json'
            };

            // 1. Localiza ou cria cliente no Asaas
            const docDigits = String(client?.document || '').replace(/\D+/g, '');
            const email =
                client?.email && !String(client.email).endsWith('.local')
                    ? String(client.email).trim()
                    : '';
            let customerId = '';

            if (docDigits || email) {
                const q = docDigits ? `cpfCnpj=${encodeURIComponent(docDigits)}` : `email=${encodeURIComponent(email)}`;
                const findRes = await fetch(`${baseUrl}/customers?${q}`, { headers });
                if (findRes.ok) {
                    const findData = (await findRes.json()) as any;
                    customerId = String(findData?.data?.[0]?.id || '');
                }
            }

            if (!customerId) {
                const createCustRes = await fetch(`${baseUrl}/customers`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        name: String(client?.company || client?.name || 'Cliente GundjaTech').slice(0, 80),
                        email: email || undefined,
                        cpfCnpj: docDigits || undefined,
                        externalReference: `GTCLI${client?.id || 0}`
                    })
                });
                if (!createCustRes.ok) return null;
                const custData = (await createCustRes.json()) as any;
                customerId = String(custData?.id || '');
            }
            if (!customerId) return null;

            // 2. Cria cobrança PIX
            const dueDate = /^\d{4}-\d{2}-\d{2}/.test(String(tx.due_date || ''))
                ? String(tx.due_date).slice(0, 10)
                : new Date().toISOString().slice(0, 10);

            const payRes = await fetch(`${baseUrl}/payments`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    customer: customerId,
                    billingType: 'PIX',
                    value: Number(amount.toFixed(2)),
                    dueDate,
                    description: String(tx.description || `Fatura #${tx.id} GundjaTech`).slice(0, 120),
                    externalReference: externalRef
                })
            });
            if (!payRes.ok) return null;
            const payData = (await payRes.json()) as any;
            const paymentId = String(payData?.id || '');
            if (!paymentId) return null;

            // 3. Obtém payload PIX Copia e Cola oficial
            const qrRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}/pixQrCode`, { headers });
            if (!qrRes.ok) return null;
            const qrData = (await qrRes.json()) as any;
            const qrCode = String(qrData?.payload || '').trim();
            if (!qrCode) return null;

            const result: DynamicPixCharge = {
                provider: 'asaas',
                gatewayPaymentId: paymentId,
                pixPayload: qrCode,
                qrDataUri: renderQrCodeDataUri(qrCode),
                expiresAt: qrData?.expirationDate || undefined
            };

            try {
                if (env.KV_CACHE) {
                    await env.KV_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1500 });
                    await env.KV_CACHE.put(`pix_tx_gw:${tx.id}`, JSON.stringify({ provider: 'asaas', gatewayPaymentId: paymentId }), { expirationTtl: 86400 });
                }
            } catch { }

            return result;
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Consulta diretamente a API do gateway para confirmar se um pagamento já foi liquidado
 * (usado pelo webhook para validação anti-fraude e pelo polling em tempo real do Portal).
 */
export async function verifyGatewayPaymentPaid(
    db: D1Database,
    provider: PixGatewayProvider,
    gatewayPaymentId: string
): Promise<{ paid: boolean; externalRef?: string; amount?: number }> {
    const cfg = await loadPixGatewayConfig(db);
    if (!cfg.apiKey || !gatewayPaymentId) return { paid: false };

    if (provider === 'mercadopago') {
        try {
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(gatewayPaymentId)}`, {
                headers: { Authorization: `Bearer ${cfg.apiKey}` }
            });
            if (!res.ok) return { paid: false };
            const data = (await res.json()) as any;
            return {
                paid: String(data?.status || '').toLowerCase() === 'approved',
                externalRef: String(data?.external_reference || ''),
                amount: Number(data?.transaction_amount || 0)
            };
        } catch {
            return { paid: false };
        }
    }

    if (provider === 'asaas') {
        try {
            const baseUrl = cfg.sandbox ? 'https://sandbox.asaas.com/api/v3' : 'https://api.asaas.com/v3';
            const res = await fetch(`${baseUrl}/payments/${encodeURIComponent(gatewayPaymentId)}`, {
                headers: { access_token: cfg.apiKey }
            });
            if (!res.ok) return { paid: false };
            const data = (await res.json()) as any;
            const st = String(data?.status || '').toUpperCase();
            return {
                paid: st === 'RECEIVED' || st === 'CONFIRMED' || st === 'RECEIVED_IN_CASH',
                externalRef: String(data?.externalReference || ''),
                amount: Number(data?.value || 0)
            };
        } catch {
            return { paid: false };
        }
    }

    return { paid: false };
}

/**
 * Liquidação automática idempotente:
 * 1) Marca a fatura como 'paid' em financial_transactions + payments
 * 2) Envia notificação + link do Recibo Oficial (PDF) para o CLIENTE
 * 3) Envia notificação instantânea para o FINANCEIRO da GundjaTech
 */
export async function settleInvoiceAsPaid(
    env: Env,
    db: D1Database,
    txId: number,
    meta: { provider: string; gatewayReference?: string }
): Promise<{ settled: boolean; alreadyPaid: boolean }> {
    const tx = (await db.prepare(
        `SELECT t.*, c.name AS client_name, c.company AS client_company, c.email AS client_email
         FROM financial_transactions t
         LEFT JOIN clients c ON c.id = t.client_id
         WHERE t.id = ?`
    ).bind(txId).first()) as any;

    if (!tx) return { settled: false, alreadyPaid: false };
    if (tx.status === 'paid') return { settled: false, alreadyPaid: true };
    if (tx.status === 'canceled') return { settled: false, alreadyPaid: false };

    const ref = meta.gatewayReference || `GTFAT${String(txId).padStart(5, '0')}`;

    const updateRes = await db.prepare(
        `UPDATE financial_transactions
         SET status = 'paid',
             payment_method = 'PIX',
             paid_at = datetime('now'),
             updated_at = datetime('now')
         WHERE id = ? AND status != 'paid'`
    ).bind(txId).run();

    // Garante idempotência sob concorrência (webhook + polling simultâneos)
    if (Number(updateRes.meta?.changes ?? 0) === 0) {
        return { settled: false, alreadyPaid: true };
    }

    try {
        await db.prepare(
            `INSERT INTO payments (financial_transaction_id, amount, payment_method, transaction_reference, status, paid_at, created_at, updated_at)
             VALUES (?, ?, 'PIX', ?, 'completed', datetime('now'), datetime('now'), datetime('now'))`
        ).bind(txId, tx.amount, ref).run();
    } catch { }

    const appUrl = (env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');
    const valFmt = Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const clientLabel = tx.client_company || tx.client_name || 'Cliente';

    // 1) Notifica o cliente com o Recibo Oficial de Quitação
    if (tx.client_email && !String(tx.client_email).endsWith('.local')) {
        try {
            await sendEmail(env, {
                to: String(tx.client_email),
                subject: `Pagamento Confirmado • Fatura #${txId} (R$ ${valFmt}) • GundjaTech`,
                html: `<p>Olá, <strong>${clientLabel}</strong>!</p>
                       <p>Seu pagamento via <strong>PIX</strong> foi <strong>confirmado automaticamente</strong> em nosso sistema.</p>
                       <p><strong>Fatura:</strong> ${tx.description}<br/>
                          <strong>Valor:</strong> R$ ${valFmt}<br/>
                          <strong>Referência:</strong> ${ref}</p>
                       <p>Seu <strong>Recibo Oficial de Quitação</strong> já está disponível no Portal do Cliente:<br/>
                          <a href="${appUrl}/portal/financeiro/${txId}/recibo">Acessar Recibo de Quitação (PDF)</a></p>`
            });
        } catch { }
    }

    // 2) Notifica o financeiro da GundjaTech instantaneamente
    try {
        const staffTo = env.STAFF_NOTIFY_EMAIL || 'gundjatech@gmail.com';
        await sendEmail(env, {
            to: staffTo,
            subject: `PIX Confirmado Automaticamente • Fatura #${txId} (R$ ${valFmt})`,
            html: `<p>Um pagamento PIX foi <strong>validado e liquidado automaticamente</strong> (${meta.provider}).</p>
                   <p><strong>Cliente:</strong> ${clientLabel}<br/>
                      <strong>Fatura:</strong> ${tx.description}<br/>
                      <strong>Valor:</strong> R$ ${valFmt}<br/>
                      <strong>Referência:</strong> ${ref}</p>
                   <p><a href="${appUrl}/admin/financeiro">Abrir Financeiro &amp; Caixa</a> · <a href="${appUrl}/admin/financeiro/${txId}/recibo">Ver Recibo PDF</a></p>`
        });
    } catch { }

    return { settled: true, alreadyPaid: false };
}
