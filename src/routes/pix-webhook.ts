import { Hono } from 'hono';
import { Env, AppVariables } from '../types/env';
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
 *
 * Segurança:
 * - Mercado Pago: nunca confia cegamente no payload; consulta diretamente a API oficial
 *   do Mercado Pago com o Access Token salvo para confirmar `status === 'approved'`.
 * - Asaas: valida o cabeçalho `asaas-access-token` (se configurado) E confirma o status
 *   diretamente na API oficial do Asaas antes de liquidar a fatura.
 */
pixWebhookRoutes.post('/', async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ ok: false, error: 'Database unavailable' }, 503);

    let body: any = {};
    try {
        body = await c.req.json();
    } catch {
        return c.json({ ok: true, ignored: true });
    }

    const cfg = await loadPixGatewayConfig(db);

    // 1) Fluxo ASAAS
    if (body?.event && body?.payment?.id) {
        if (cfg.webhookSecret) {
            const incomingToken = c.req.header('asaas-access-token') || '';
            if (incomingToken !== cfg.webhookSecret) {
                return c.json({ ok: false, error: 'Unauthorized webhook token' }, 401);
            }
        }
        const ev = String(body.event).toUpperCase();
        if (ev === 'PAYMENT_RECEIVED' || ev === 'PAYMENT_CONFIRMED') {
            const paymentId = String(body.payment.id);
            const verified = await verifyGatewayPaymentPaid(db, 'asaas', paymentId);
            if (verified.paid) {
                const txId = extractInvoiceIdFromRef(verified.externalRef || body.payment.externalReference);
                if (txId) {
                    const res = await settleInvoiceAsPaid(c.env, db, txId, {
                        provider: 'Asaas PIX',
                        gatewayReference: paymentId
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
        const verified = await verifyGatewayPaymentPaid(db, 'mercadopago', mpId);
        if (verified.paid) {
            const txId = extractInvoiceIdFromRef(verified.externalRef);
            if (txId) {
                const res = await settleInvoiceAsPaid(c.env, db, txId, {
                    provider: 'Mercado Pago PIX',
                    gatewayReference: mpId
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
