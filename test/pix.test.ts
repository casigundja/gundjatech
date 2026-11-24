import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../src/index';
import { generatePixPayload, normalizePixKey, validateReceiptMagicBytes } from '../src/lib/pix';
import { renderQrCodeDataUri } from '../src/lib/qr';
import { extractInvoiceIdFromRef, settleInvoiceAsPaid } from '../src/services/pix-gateway';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('Módulo Financeiro • PIX, QR Code, Comprovantes & Webhook', () => {
    it('normaliza chaves PIX (CNPJ, CPF, e-mail, EVP e telefone)', () => {
        expect(normalizePixKey('43.209.289/0001-66')).toBe('43209289000166');
        expect(normalizePixKey('123.456.789-01')).toBe('12345678901');
        expect(normalizePixKey('Financeiro@GundjaTech.com')).toBe('financeiro@gundjatech.com');
        expect(normalizePixKey('+55 (19) 95324-8420')).toBe('+5519953248420');
    });

    it('gera payload BR Code EMV válido com CRC16-CCITT e renderiza QR Code SVG (inclusive payloads >= 135 bytes)', () => {
        const payload = generatePixPayload({
            pixKey: '43.209.289/0001-66',
            merchantName: 'GundjaTech Engenharia Digital',
            merchantCity: 'São Paulo',
            amount: 3850.5,
            txid: 'GTFAT00042',
            description: 'Fatura Projeto Portal Corporativo'
        });

        expect(payload.startsWith('000201')).toBe(true);
        expect(payload).toContain('br.gov.bcb.pix');
        expect(payload).toContain('43209289000166');
        expect(payload).toContain('54073850.50');
        expect(payload).toContain('GTFAT00042');
        expect(payload).toMatch(/6304[0-9A-F]{4}$/);

        const dataUri = renderQrCodeDataUri(payload);
        expect(dataUri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);

        // Testa payload longo (>= 145 bytes) para exercitar QR Versions 7-12 com alignment patterns
        const longPayload = payload + '0'.repeat(40);
        expect(longPayload.length).toBeGreaterThanOrEqual(140);
        const longQr = renderQrCodeDataUri(longPayload);
        expect(longQr.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    });

    it('valida magic bytes de comprovantes (PDF/PNG/JPG legítimos vs arquivo falsificado)', () => {
        const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]).buffer;
        const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer;
        const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).buffer;
        const fakeHtml = new TextEncoder().encode('<html><script>alert(1)</script></html>').buffer;

        expect(validateReceiptMagicBytes(pdfBytes, 'pdf')).toBe(true);
        expect(validateReceiptMagicBytes(pngBytes, 'png')).toBe(true);
        expect(validateReceiptMagicBytes(jpgBytes, 'jpg')).toBe(true);
        expect(validateReceiptMagicBytes(fakeHtml, 'pdf')).toBe(false);
        expect(validateReceiptMagicBytes(fakeHtml, 'png')).toBe(false);
    });

    it('extrai ID da fatura a partir de referência GTFAT', () => {
        expect(extractInvoiceIdFromRef('GTFAT00042')).toBe(42);
        expect(extractInvoiceIdFromRef('gtfat7')).toBe(7);
        expect(extractInvoiceIdFromRef('INVALID-123')).toBeNull();
        expect(extractInvoiceIdFromRef(null)).toBeNull();
    });

    it('garante liquidação idempotente em settleInvoiceAsPaid (bloqueia duplicidade sob concorrência e faturas canceladas)', async () => {
        const txState = {
            id: 42,
            client_id: 10,
            description: 'Desenvolvimento Portal',
            amount: 4200,
            status: 'pending',
            client_name: 'Empresa Teste',
            client_company: 'Empresa Teste LTDA',
            client_email: 'cliente@empresa.com'
        };
        const payments: any[] = [];

        const mockDb = {
            prepare: (sql: string) => {
                const q = sql.toLowerCase();
                return {
                    bind: (...params: any[]) => ({
                        first: async () => (q.includes('from financial_transactions') ? { ...txState } : null),
                        run: async () => {
                            if (q.includes('update financial_transactions')) {
                                if (txState.status === 'paid') {
                                    return { meta: { changes: 0 } };
                                }
                                txState.status = 'paid';
                                return { meta: { changes: 1 } };
                            }
                            if (q.includes('insert into payments')) {
                                payments.push({ txId: params[0], amount: params[1], ref: params[2] });
                                return { meta: { changes: 1, last_row_id: payments.length } };
                            }
                            return { meta: { changes: 0 } };
                        }
                    })
                };
            }
        } as any;

        const env = { DB: mockDb, APP_URL: 'https://gundjatech.test' } as any;

        // 1ª chamada liquida e grava 1 pagamento
        const first = await settleInvoiceAsPaid(env, mockDb, 42, { provider: 'Mercado Pago PIX', gatewayReference: 'mp_123' });
        expect(first).toEqual({ settled: true, alreadyPaid: false });
        expect(payments.length).toBe(1);

        // 2ª chamada (reentrega de webhook) é idempotente e não duplica pagamento
        const second = await settleInvoiceAsPaid(env, mockDb, 42, { provider: 'Mercado Pago PIX', gatewayReference: 'mp_123' });
        expect(second).toEqual({ settled: false, alreadyPaid: true });
        expect(payments.length).toBe(1);

        // Fatura cancelada não pode ser liquidada
        txState.status = 'canceled';
        const canceledRes = await settleInvoiceAsPaid(env, mockDb, 42, { provider: 'Asaas PIX', gatewayReference: 'as_999' });
        expect(canceledRes).toEqual({ settled: false, alreadyPaid: false });
    });

    it('rejeita webhook Asaas com token inválido (401) e liquida fatura quando validado na API Asaas', async () => {
        const txState = {
            id: 55,
            client_id: 10,
            description: 'Landing Page',
            amount: 1800,
            status: 'pending',
            client_name: 'Cliente Asaas',
            client_company: 'Asaas Test Co',
            client_email: 'asaas@cliente.com'
        };
        const payments: any[] = [];

        const mockDb = {
            prepare: (sql: string) => {
                const q = sql.toLowerCase();
                return {
                    all: async () => {
                        if (q.includes('from system_settings')) {
                            return {
                                results: [
                                    { key: 'payment_gateway_provider', value: 'asaas' },
                                    { key: 'payment_gateway_api_key', value: 'asaas_live_key_123' },
                                    { key: 'payment_gateway_webhook_secret', value: 'segredo_asaas_ok' }
                                ]
                            };
                        }
                        return { results: [] };
                    },
                    bind: (...params: any[]) => ({
                        first: async () => (q.includes('from financial_transactions') ? { ...txState } : null),
                        run: async () => {
                            if (q.includes('update financial_transactions')) {
                                if (txState.status === 'paid') return { meta: { changes: 0 } };
                                txState.status = 'paid';
                                return { meta: { changes: 1 } };
                            }
                            if (q.includes('insert into payments')) {
                                payments.push({ txId: params[0], ref: params[2] });
                                return { meta: { changes: 1, last_row_id: 1 } };
                            }
                            return { meta: { changes: 0 } };
                        }
                    })
                };
            }
        } as any;

        const env = { DB: mockDb, APP_URL: 'https://gundjatech.test' } as any;

        // Token errado -> 401
        const badRes = await app.request('/api/webhooks/pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'asaas-access-token': 'token_errado'
            },
            body: JSON.stringify({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_001', externalReference: 'GTFAT00055' } })
        }, env);
        expect(badRes.status).toBe(401);

        // Mock da consulta oficial à API do Asaas confirmando status RECEIVED
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
            new Response(
                JSON.stringify({ id: 'pay_001', status: 'RECEIVED', externalReference: 'GTFAT00055', value: 1800 }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        );

        const okRes = await app.request('/api/webhooks/pix', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'asaas-access-token': 'segredo_asaas_ok'
            },
            body: JSON.stringify({ event: 'PAYMENT_RECEIVED', payment: { id: 'pay_001', externalReference: 'GTFAT00055' } })
        }, env);

        expect(okRes.status).toBe(200);
        const body = (await okRes.json()) as any;
        expect(body.ok).toBe(true);
        expect(body.settled).toBe(true);
        expect(txState.status).toBe('paid');
        expect(payments.length).toBe(1);
    });
});
