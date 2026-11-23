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

/**
 * Valida os magic bytes reais do arquivo enviado como comprovante (PDF, PNG, JPG, WEBP),
 * impedindo upload de HTML/SVG/scripts renomeados.
 */
export function validateReceiptMagicBytes(buf: ArrayBuffer, ext: string): boolean {
    const u = new Uint8Array(buf);
    if (u.length < 8) return false;
    if (ext === 'pdf') {
        return u[0] === 0x25 && u[1] === 0x50 && u[2] === 0x44 && u[3] === 0x46; // %PDF
    }
    if (ext === 'png') {
        return u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47; // \x89PNG
    }
    if (ext === 'jpg' || ext === 'jpeg') {
        return u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff;
    }
    if (ext === 'webp') {
        return (
            u.length >= 12 &&
            u[0] === 0x52 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x46 && // RIFF
            u[8] === 0x57 && u[9] === 0x45 && u[10] === 0x42 && u[11] === 0x50   // WEBP
        );
    }
    return false;
}

function escapeReceiptHtml(str: unknown): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Recibo Oficial de Quitação nos termos do Art. 319 e Art. 320 do Código Civil Brasileiro.
 */
export function renderOfficialPaymentReceiptHtml(opts: {
    tx: any;
    client: any;
    bankSettings: BankPaymentSettings;
}): string {
    const { tx, client, bankSettings } = opts;
    const receiptNo = `REC-GT-${String(tx.id).padStart(5, '0')}`;
    const authCode = `GT${String(tx.id).padStart(4, '0')}-${String(tx.paid_at || tx.updated_at || '').replace(/\D+/g, '').slice(0, 8) || '2026'}`;
    const amountFmt = Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const paidDate = tx.paid_at ? new Date(String(tx.paid_at).replace(' ', 'T') + (String(tx.paid_at).includes('T') ? '' : 'Z')).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    const payerName = client?.company || client?.name || 'Cliente';
    const payerContact = client?.company && client?.name && client.company !== client.name ? client.name : '';
    const payerDoc = client?.document || '';

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recibo de Quitação ${escapeReceiptHtml(receiptNo)} • GundjaTech</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px 16px; background: #E7F0F5; color: #063B5C; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
    .sheet { max-width: 760px; margin: 0 auto; background: #FFFFFF; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 50px -20px rgba(6,59,92,0.28); border: 1px solid #CFE0EB; }
    .top { background: #063B5C; color: #FFFFFF; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 4px solid #F2C230; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .brand span { color: #F2C230; }
    .top-meta { text-align: right; font-size: 12px; color: #E7F0F5; }
    .top-meta strong { display: block; font-size: 15px; color: #F2C230; }
    .body { padding: 30px 32px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; background: #E6F7F0; color: #0E7A53; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
    h1 { margin: 12px 0 6px; font-size: 22px; color: #063B5C; }
    .subtitle { margin: 0 0 22px; font-size: 13px; color: #4A6A80; }
    .amount-box { background: #F4F9FC; border: 1px solid #D4E4EE; border-left: 5px solid #F2C230; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
    .amount-box small { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #4A6A80; }
    .amount-box strong { font-size: 26px; font-weight: 800; color: #063B5C; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 22px; }
    .box { background: #FAFDFE; border: 1px solid #E2EDF4; border-radius: 12px; padding: 14px 16px; font-size: 12.5px; }
    .box h3 { margin: 0 0 8px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.08em; color: #16749A; }
    .box p { margin: 3px 0; color: #063B5C; }
    .decl { font-size: 13px; line-height: 1.65; color: #1E445D; background: #FAFDFE; border: 1px solid #E2EDF4; border-radius: 12px; padding: 16px 18px; margin-bottom: 24px; }
    .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 18px; border-top: 1px solid #E2EDF4; font-size: 11.5px; color: #527086; }
    .actions { max-width: 760px; margin: 16px auto 0; display: flex; justify-content: flex-end; gap: 10px; }
    .btn { padding: 10px 18px; border-radius: 10px; border: 0; font-weight: 800; font-size: 13px; cursor: pointer; text-decoration: none; }
    .btn-gold { background: #F2C230; color: #063B5C; }
    .btn-out { background: #FFFFFF; color: #063B5C; border: 1px solid #C5D9E6; }
    @media print { body { background: #FFFFFF; padding: 0; } .sheet { box-shadow: none; border: 0; } .actions { display: none; } }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .top { flex-direction: column; align-items: flex-start; } .top-meta { text-align: left; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <div class="brand">Gundja<span>Tech</span></div>
        <div style="font-size:11.5px;color:#CFE0EB;margin-top:4px;">CNPJ: ${escapeReceiptHtml(bankSettings.bankCnpj)} • ${escapeReceiptHtml(bankSettings.bankName)}</div>
      </div>
      <div class="top-meta">
        <strong>${escapeReceiptHtml(receiptNo)}</strong>
        <span>Autenticação: ${escapeReceiptHtml(authCode)}</span>
      </div>
    </div>
    <div class="body">
      <span class="badge">✓ Pagamento Quitado &amp; Confirmado</span>
      <h1>Recibo Oficial de Quitação</h1>
      <p class="subtitle">Emitido eletronicamente conforme Art. 319 e Art. 320 do Código Civil Brasileiro.</p>

      <div class="amount-box">
        <div>
          <small>Valor Recebido</small>
          <strong>R$ ${amountFmt}</strong>
        </div>
        <div style="text-align:right;font-size:12px;">
          <small>Forma de Pagamento</small>
          <span style="font-weight:800;color:#063B5C;">${escapeReceiptHtml(tx.payment_method || 'PIX')}</span>
        </div>
      </div>

      <div class="grid">
        <div class="box">
          <h3>Credor (Recebedor)</h3>
          <p><strong>${escapeReceiptHtml(bankSettings.pixHolder)}</strong></p>
          <p>CNPJ: ${escapeReceiptHtml(bankSettings.bankCnpj)}</p>
          <p>Conta: ${escapeReceiptHtml(bankSettings.bankName)} · Ag ${escapeReceiptHtml(bankSettings.bankAgency)} · Cc ${escapeReceiptHtml(bankSettings.bankAccount)}</p>
        </div>
        <div class="box">
          <h3>Pagador (Cliente)</h3>
          <p><strong>${escapeReceiptHtml(payerName)}</strong></p>
          ${payerContact ? `<p>Contato: ${escapeReceiptHtml(payerContact)}</p>` : ''}
          ${payerDoc ? `<p>CPF/CNPJ: ${escapeReceiptHtml(payerDoc)}</p>` : ''}
          ${client?.email && !String(client.email).endsWith('.local') ? `<p>E-mail: ${escapeReceiptHtml(client.email)}</p>` : ''}
        </div>
      </div>

      <div class="decl">
        Recebemos de <strong>${escapeReceiptHtml(payerName)}</strong> a importância líquida de <strong>R$ ${amountFmt}</strong>, referente a:
        <strong>${escapeReceiptHtml(tx.description)}</strong>${tx.invoice_number ? ` (Documento / NF #${escapeReceiptHtml(tx.invoice_number)})` : ''},
        liquidado via <strong>${escapeReceiptHtml(tx.payment_method || 'PIX')}</strong> em <strong>${escapeReceiptHtml(paidDate)}</strong>,
        pelo que damos plena, geral e irrevogável quitação desta obrigação.
      </div>

      <div class="foot">
        <div>
          <strong>GundjaTech Tecnologia e Soluções Digitais</strong><br />
          Documento eletrônico válido sem necessidade de assinatura física.
        </div>
        <div style="text-align:right;">
          Data da quitação: <strong>${escapeReceiptHtml(paidDate)}</strong><br />
          Vencimento original: ${escapeReceiptHtml(tx.due_date || '—')}
        </div>
      </div>
    </div>
  </div>
  <div class="actions">
    <button type="button" onclick="window.close()" class="btn btn-out">Fechar</button>
    <button type="button" onclick="window.print()" class="btn btn-gold">Imprimir / Salvar PDF</button>
  </div>
</body>
</html>`;
}

