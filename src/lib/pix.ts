export interface BankPaymentSettings {
    pixKey: string;
    pixHolder: string;
    pixCity: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;
    bankCnpj: string;
}

export const DEFAULT_BANK_PAYMENT_SETTINGS: BankPaymentSettings = {
    pixKey: '43.209.289/0001-66',
    pixHolder: 'GUNDJATECH',
    pixCity: 'SAO PAULO',
    bankName: '260 - Nu Pagamentos S.A. (Nu Empresas)',
    bankAgency: '0001',
    bankAccount: '16395420-4',
    bankCnpj: '43.209.289/0001-66'
};

function normalizeAscii(str: string, maxLen: number): string {
    return String(str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9 \-./]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLen);
}

/**
 * Normaliza chave PIX conforme especificação DICT/BCB:
 * - CNPJ (14 dígitos) ou CPF (11 dígitos): apenas dígitos
 * - E-mail / EVP / Telefone (+55...): preserva formato válido
 */
export function normalizePixKey(rawKey: string): string {
    const trimmed = String(rawKey || '').trim();
    if (!trimmed) return '';
    if (trimmed.includes('@')) return trimmed.toLowerCase();
    // Chave aleatória UUID (EVP)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }
    // Telefone com +
    if (trimmed.startsWith('+')) {
        return '+' + trimmed.replace(/\D+/g, '');
    }
    // CPF / CNPJ formatado (ex: 43.209.289/0001-66 -> 43209289000166)
    const digits = trimmed.replace(/\D+/g, '');
    if (digits.length === 11 || digits.length === 14) {
        return digits;
    }
    return trimmed;
}

function emvField(id: string, value: string): string {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
}

/**
 * CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF) exigido pelo padrão BR Code (EMVCo).
 */
function crc16Ccitt(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xffff;
            } else {
                crc = (crc << 1) & 0xffff;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayload(params: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount?: number;
    txid?: string;
    description?: string;
}): string {
    const key = normalizePixKey(params.pixKey);
    if (!key) return '';

    const merchantName = normalizeAscii(params.merchantName || 'GUNDJATECH', 25).toUpperCase() || 'GUNDJATECH';
    const merchantCity = normalizeAscii(params.merchantCity || 'SAO PAULO', 15).toUpperCase() || 'SAO PAULO';
    const cleanTxid = String(params.txid || '***')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 25) || '***';

    const gui = emvField('00', 'br.gov.bcb.pix');
    const keyField = emvField('01', key);
    const descClean = params.description ? normalizeAscii(params.description, 32) : '';
    const descField = descClean ? emvField('02', descClean) : '';
    const merchantAccountInfo = emvField('26', `${gui}${keyField}${descField}`);

    const parts: string[] = [
        emvField('00', '01'), // Payload Format Indicator
        merchantAccountInfo,
        emvField('52', '0000'), // Merchant Category Code
        emvField('53', '986'), // Transaction Currency (BRL)
    ];

    if (params.amount && Number.isFinite(params.amount) && params.amount > 0) {
        parts.push(emvField('54', Number(params.amount).toFixed(2)));
    }

    parts.push(
        emvField('58', 'BR'), // Country Code
        emvField('59', merchantName),
        emvField('60', merchantCity),
        emvField('62', emvField('05', cleanTxid))
    );

    const payloadWithoutCrc = `${parts.join('')}6304`;
    const crc = crc16Ccitt(payloadWithoutCrc);
    return `${payloadWithoutCrc}${crc}`;
}

export async function loadBankPaymentSettings(db?: D1Database): Promise<BankPaymentSettings> {
    const cfg: BankPaymentSettings = { ...DEFAULT_BANK_PAYMENT_SETTINGS };
    if (!db) return cfg;

    try {
        const res = await db.prepare(
            `SELECT key, value FROM system_settings
             WHERE key IN (
               'payment_pix_key',
               'payment_pix_holder',
               'payment_pix_city',
               'payment_bank_name',
               'payment_bank_agency',
               'payment_bank_account',
               'payment_bank_cnpj',
               'company_cnpj'
             )`
        ).all<{ key: string; value: string }>();

        const map: Record<string, string> = {};
        for (const r of res.results || []) {
            if (r.value && String(r.value).trim()) {
                map[r.key] = String(r.value).trim();
            }
        }

        if (map.payment_pix_key) cfg.pixKey = map.payment_pix_key;
        if (map.payment_pix_holder) cfg.pixHolder = map.payment_pix_holder;
        if (map.payment_pix_city) cfg.pixCity = map.payment_pix_city;
        if (map.payment_bank_name) cfg.bankName = map.payment_bank_name;
        if (map.payment_bank_agency) cfg.bankAgency = map.payment_bank_agency;
        if (map.payment_bank_account) cfg.bankAccount = map.payment_bank_account;
        if (map.payment_bank_cnpj) cfg.bankCnpj = map.payment_bank_cnpj;
        else if (map.company_cnpj) cfg.bankCnpj = map.company_cnpj;
    } catch { }

    return cfg;
}
