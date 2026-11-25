import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
import { hmacVerifyHex, timingSafeEqual } from '../lib/crypto';
import { rateLimit } from '../middleware/security';
import {
    extractInvoiceIdFromRef,
    loadPixGatewayConfig,
    settleInvoiceAsPaid,
    verifyGatewayPaymentPaid
} from '../services/pix-gateway';

export const pixWebhookRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * Webhook unificado de confirmação instantânea de PIX (Mercado Pago & Asaas).
 * URL: POST /api/webhooks/pix
 */
pixWebhookRoutes.post('/', rateLimit({ keyPrefix: 'pix_webhook', maxRequests: 60, windowSeconds: 60 }), async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ ok: false, error: 'Database unavailable' }, 503);

    let body: any = {};
    try {
        body = await c.req.json();
    } catch {
        return c.json({ ok: true, ignored: true });
    }

    const cfg = await loadPixGatewayConfig(db);
    const isProd = (c.env?.APP_ENV || c.env?.ENVIRONMENT || '').toLowerCase() === 'production';

    // 1) Fluxo ASAAS
    if (body?.event && body?.payment?.id) {
        if (isProd && !cfg.webhookSecret) {
            return c.json({ ok: false, error: 'Webhook secret not configured' }, 503);
        }
        if (cfg.webhookSecret) {
            const incomingToken = c.req.header('asaas-access-token') || '';
            if (!incomingToken || !timingSafeEqual(incomingToken, cfg.webhookSecret)) {
                return c.json({ ok: false, error: 'Unauthorized webhook token' }, 401);
            }
        }
        const ev = String(body.event).toUpperCase();
        if (ev === 'PAYMENT_RECEIVED' || ev === 'PAYMENT_CONFIRMED') {
            const paymentId = String(body.payment.id);
            const verified = await verifyGatewayPaymentPaid(db, 'asaas', paymentId);
            if (verified.paid) {
                const txId = extractInvoiceIdFromRef(verified.externalRef);
                if (txId) {
                    const res = await settleInvoiceAsPaid(c.env, db, txId, {
                        provider: 'Asaas PIX',
                        gatewayReference: paymentId,
                        paidAmount: verified.amount
                    });
                    return c.json({ ok: true, provider: 'asaas', txId, ...res });
                }
            }
        }
        return c.json({ ok: true, provider: 'asaas', ignored: true });
    }

    // 2) Fluxo MERCADO PAGO
    const mpId = String(body?.data?.id || c.req.query('data.id') || c.req.query('id') || '').trim();
    const mpType = String(body?.type || body?.topic || c.req.query('type') || '').toLowerCase();
    if (mpId && (mpType === 'payment' || body?.action?.startsWith?.('payment.'))) {
        if (cfg.webhookSecret) {
            const xSig = (c.req.header('x-signature') || '').trim();
            const xReqId = (c.req.header('x-request-id') || '').trim();
            const parts: Record<string, string> = {};
            for (const seg of xSig.split(',')) {
                const [k, v] = seg.split('=');
                if (k && v) parts[k.trim()] = v.trim();
            }
            const manifest = `id:${mpId};request-id:${xReqId};ts:${parts.ts || ''};`;
            if (!parts.v1 || !(await hmacVerifyHex(manifest, parts.v1, cfg.webhookSecret))) {
                return c.json({ ok: false, error: 'Invalid Mercado Pago signature' }, 401);
            }
        }
        const verified = await verifyGatewayPaymentPaid(db, 'mercadopago', mpId);
        if (verified.paid) {
            const txId = extractInvoiceIdFromRef(verified.externalRef);
            if (txId) {
                const res = await settleInvoiceAsPaid(c.env, db, txId, {
                    provider: 'Mercado Pago PIX',
                    gatewayReference: mpId,
                    paidAmount: verified.amount
                });
                return c.json({ ok: true, provider: 'mercadopago', txId, ...res });
            }
        }
        return c.json({ ok: true, provider: 'mercadopago', pending: true });
    }

    return c.json({ ok: true, ignored: true });
});

pixWebhookRoutes.get('/', (c) => {
    return c.json({ ok: true, service: 'GundjaTech PIX Webhook' });
});
