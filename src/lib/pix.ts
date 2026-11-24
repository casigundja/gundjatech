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
    const rawPaid = String(tx.paid_at || tx.updated_at || '');
    const authCode = `GT${String(tx.id).padStart(4, '0')}-${rawPaid.replace(/\D+/g, '').slice(0, 8) || '2026'}`;
    const amountFmt = Number(tx.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const formatBrDate = (val: unknown): string => {
        const s = String(val || '').trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || '—');
    };

    const paidDateObj = tx.paid_at
        ? new Date(String(tx.paid_at).replace(' ', 'T') + (String(tx.paid_at).includes('T') ? '' : 'Z'))
        : new Date();
    const paidDate = paidDateObj.toLocaleDateString('pt-BR') + ' às ' + paidDateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dueDateFmt = formatBrDate(tx.due_date);
    const payerName = client?.company || client?.name || 'Cliente';
    const payerContact = client?.company && client?.name && client.company !== client.name ? client.name : '';
    const payerDoc = client?.document || '';
    const payerEmail = client?.email && !String(client.email).endsWith('.local') ? String(client.email) : '';
    const methodLabel = String(tx.payment_method || 'PIX');

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recibo de Quitação ${escapeReceiptHtml(receiptNo)} • GundjaTech</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      padding: 32px 16px 56px;
      background: #EAF1F6;
      color: #063B5C;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 780px; margin: 0 auto; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .toolbar-meta {
      font-size: 12px;
      font-weight: 700;
      color: #4A6A80;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-actions { display: flex; align-items: center; gap: 8px; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 16px;
      border-radius: 10px;
      border: 0;
      font-family: inherit;
      font-weight: 700;
      font-size: 12.5px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-gold { background: #F2C230; color: #063B5C; box-shadow: 0 2px 8px rgba(242, 194, 48, 0.35); }
    .btn-gold:hover { background: #E0B020; }
    .btn-out { background: #FFFFFF; color: #063B5C; border: 1px solid #CBDCE8; }
    .btn-out:hover { background: #F5F9FC; }

    .sheet {
      background: #FFFFFF;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 24px 60px -24px rgba(6, 59, 92, 0.28), 0 4px 16px -4px rgba(6, 59, 92, 0.08);
      border: 1px solid #D6E4EE;
    }

    /* Header Corporativo */
    .header {
      background: linear-gradient(135deg, #042940 0%, #063B5C 58%, #0E567C 100%);
      color: #FFFFFF;
      padding: 28px 34px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      border-bottom: 3px solid #F2C230;
    }
    .brand-row { display: flex; align-items: center; gap: 13px; }
    .brand-name { font-size: 21px; font-weight: 800; letter-spacing: -0.025em; line-height: 1; }
    .brand-name span { color: #F2C230; }
    .brand-sub { font-size: 11px; color: #BFD6E6; margin-top: 5px; font-weight: 500; }
    .doc-pill {
      text-align: right;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px;
      padding: 10px 14px;
    }
    .doc-pill small { display: block; font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #BFD6E6; font-weight: 700; }
    .doc-pill strong { display: block; font-size: 14px; color: #F2C230; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin-top: 2px; }
    .doc-pill span { display: block; font-size: 10.5px; color: #E7F0F5; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: 0.85; }

    .body { padding: 32px 34px; }

    /* Hero Title + Valor */
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 24px;
      border-bottom: 1px solid #E6EFF5;
      margin-bottom: 24px;
    }
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 11px;
      border-radius: 999px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #047857;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .status-dot { width: 7px; height: 7px; border-radius: 999px; background: #10B981; }
    .hero h1 { margin: 10px 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #063B5C; }
    .hero p { margin: 0; font-size: 12px; color: #5D7B91; }

    .amount-card {
      text-align: right;
      background: #F7FAFC;
      border: 1px solid #DFEAF2;
      border-radius: 14px;
      padding: 14px 20px;
      min-width: 210px;
    }
    .amount-card small { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #5D7B91; }
    .amount-card strong { display: block; font-size: 28px; font-weight: 800; color: #063B5C; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin-top: 2px; }
    .amount-card .method-tag {
      display: inline-block;
      margin-top: 6px;
      padding: 2px 9px;
      border-radius: 6px;
      background: #E7F0F5;
      color: #063B5C;
      font-size: 10.5px;
      font-weight: 700;
    }

    /* Partes (Credor x Pagador) */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .party-box {
      background: #FAFDFE;
      border: 1px solid #E4EEF5;
      border-radius: 12px;
      padding: 16px 18px;
    }
    .party-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #16749A;
      margin-bottom: 8px;
    }
    .party-name { font-size: 14px; font-weight: 800; color: #063B5C; margin: 0 0 6px; }
    .party-meta { font-size: 12px; color: #4A6A80; line-height: 1.55; margin: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: #063B5C; font-weight: 600; }

    /* Tabela de Discriminação */
    .ledger {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      border: 1px solid #E4EEF5;
      border-radius: 12px;
      overflow: hidden;
    }
    .ledger th {
      background: #F4F8FB;
      color: #527086;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      text-align: left;
      padding: 11px 16px;
      border-bottom: 1px solid #E4EEF5;
    }
    .ledger td {
      padding: 14px 16px;
      font-size: 12.5px;
      color: #063B5C;
      border-bottom: 1px solid #EDF3F8;
      vertical-align: top;
    }
    .ledger tr:last-child td { border-bottom: 0; }
    .ledger .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .ledger .desc-sub { display: block; font-size: 11px; color: #5D7B91; margin-top: 3px; }
    .ledger .total-row td {
      background: #F9FCFE;
      font-weight: 800;
      border-top: 1px solid #DCE7F0;
      padding: 12px 16px;
    }

    /* Declaração Legal */
    .decl {
      font-size: 12.5px;
      line-height: 1.65;
      color: #254860;
      background: #F8FBFD;
      border: 1px solid #E4EEF5;
      border-left: 3px solid #16749A;
      border-radius: 10px;
      padding: 15px 18px;
      margin-bottom: 24px;
    }

    /* Selo de Autenticação / Rodapé */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding-top: 18px;
      border-top: 1px solid #E6EFF5;
      font-size: 11px;
      color: #5D7B91;
    }
    .seal {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .seal-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #E7F0F5;
      color: #063B5C;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    @media print {
      body { background: #FFFFFF; padding: 0; }
      .toolbar { display: none; }
      .sheet { box-shadow: none; border: 0; border-radius: 0; }
    }
    @media (max-width: 640px) {
      .header, .hero, .footer { flex-direction: column; align-items: flex-start; }
      .doc-pill, .amount-card { text-align: left; width: 100%; }
      .parties { grid-template-columns: 1fr; }
      .body, .header { padding: 22px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="toolbar">
      <div class="toolbar-meta">
        <span>Recibo Eletrônico • <strong style="color:#063B5C;">${escapeReceiptHtml(receiptNo)}</strong></span>
      </div>
      <div class="toolbar-actions">
        <button type="button" onclick="window.close()" class="btn btn-out">Fechar</button>
        <button type="button" onclick="window.print()" class="btn btn-gold">
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          <span>Imprimir / Salvar PDF</span>
        </button>
      </div>
    </div>

    <div class="sheet">
      <header class="header">
        <div class="brand-row">
          <svg width="38" height="34" viewBox="0 0 340 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 236 0 L 138 0 C 119 0.3, 126 1.3, 123 2 C 116 4.7, 111.8 4.7, 107 6 C 90 12, 74 20, 59 30 C 42.5 44.3, 27.3 61.8, 19 75 C 9.3 94.8, 1.3 121, 1 127 L 1 152 L 2 145 C 8 129, 24 104, 39 88 C 53.8 75.5, 72.2 64.5, 94 55 C 122.5 46.3, 139 42.5, 148 42 C 174.5 42.5, 193.8 40.5, 201 34 L 236 0 Z" fill="#16749A"/>
            <path d="M 15 118 C 7.3 133, 1.3 148, 1 154 C 1.5 167.7, 7 190.5, 10 198 C 17.2 213.7, 27.7 230.2, 33 236 C 45.3 249.2, 60.7 260.8, 79 271 C 101 279, 104.5 283, 125 283 C 145.5 283, 203.5 281.3, 224 279 C 244.5 276.7, 255 264.7, 259 261 C 268.3 252, 278.8 235.7, 281 231 C 285.8 204.2, 286.5 155.7, 286 142 L 282 137 L 167 137 C 161 138.5, 157 145, 157 145 L 143 176 L 228 176 C 230.3 185.3, 230.7 209.5, 230 220 C 228.2 235, 220 252, 217 256 C 212 262, 196.2 272.5, 193 274 L 189 274 L 190 234 L 158 238 C 129.3 236.3, 103.7 228.8, 96 224 C 79 211.3, 63.2 191.7, 60 186 C 52.3 164.8, 50.3 156.5, 50 149 C 50.7 133, 54.7 114.2, 58 107 C 67.2 89.7, 80.7 72.2, 87 67 L 110 52 L 84 60 C 62.8 70.8, 37.5 90.2, 31 97 C 24.5 103.8, 19.3 111, 15 118 Z" fill="#FFFFFF"/>
            <path d="M 323 54 C 315.8 44.7, 308.2 39, 300 36 C 289.5 35.7, 281.7 36.8, 270 43 C 260.2 54.2, 269.3 59.3, 251 60 C 232.7 60.7, 165.8 60.7, 147 61 C 133.3 63.2, 119 68, 105 76 C 90 89, 80 103, 73 117 C 69.5 130, 68.3 146.8, 69 153 C 72 166.7, 78 180.7, 81 185 C 87.3 193.8, 104.7 207.3, 109 210 L 121 214 L 109 202 C 103 193, 96.3 177.7, 95 170 C 93.7 162.3, 95.7 140.8, 99 133 C 103.5 123.5, 115.8 109.3, 120 106 C 127.8 100.8, 123.8 95.7, 145 95 C 166.2 94.3, 237.3 93.3, 259 95 C 271.3 103, 278.7 107, 294 107 C 305.3 103, 313.7 97.7, 323 85 C 326.5 70.5, 325.2 57.7, 323 54 Z" fill="#F2C230"/>
            <circle cx="290.5" cy="71.4" r="15.1" fill="#063B5C"/>
          </svg>
          <div>
            <div class="brand-name">Gundja<span>Tech</span></div>
            <div class="brand-sub">CNPJ ${escapeReceiptHtml(bankSettings.bankCnpj)} • Engenharia Digital &amp; Soluções Web</div>
          </div>
        </div>
        <div class="doc-pill">
          <small>Comprovante de Quitação</small>
          <strong>${escapeReceiptHtml(receiptNo)}</strong>
          <span>Cód. ${escapeReceiptHtml(authCode)}</span>
        </div>
      </header>

      <div class="body">
        <div class="hero">
          <div>
            <span class="status-chip"><i class="status-dot"></i> Pagamento Quitado</span>
            <h1>Recibo Oficial de Quitação</h1>
            <p>Emitido eletronicamente conforme Art. 319 e Art. 320 do Código Civil Brasileiro.</p>
          </div>
          <div class="amount-card">
            <small>Valor Líquido Recebido</small>
            <strong>R$ ${amountFmt}</strong>
            <span class="method-tag">Via ${escapeReceiptHtml(methodLabel)}</span>
          </div>
        </div>

        <div class="parties">
          <div class="party-box">
            <div class="party-label">Credor (Recebedor)</div>
            <p class="party-name">${escapeReceiptHtml(bankSettings.pixHolder)}</p>
            <p class="party-meta">
              CNPJ: <span class="mono">${escapeReceiptHtml(bankSettings.bankCnpj)}</span><br />
              ${escapeReceiptHtml(bankSettings.bankName)}<br />
              Ag <span class="mono">${escapeReceiptHtml(bankSettings.bankAgency)}</span> · Cc <span class="mono">${escapeReceiptHtml(bankSettings.bankAccount)}</span>
            </p>
          </div>
          <div class="party-box">
            <div class="party-label">Pagador (Cliente)</div>
            <p class="party-name">${escapeReceiptHtml(payerName)}</p>
            <p class="party-meta">
              ${payerContact ? `Responsável: ${escapeReceiptHtml(payerContact)}<br />` : ''}
              ${payerDoc ? `CPF/CNPJ: <span class="mono">${escapeReceiptHtml(payerDoc)}</span><br />` : ''}
              ${payerEmail ? `E-mail: ${escapeReceiptHtml(payerEmail)}` : 'Cadastro verificado no Portal do Cliente'}
            </p>
          </div>
        </div>

        <table class="ledger">
          <thead>
            <tr>
              <th>Discriminação do Lançamento</th>
              <th>Vencimento</th>
              <th>Pagamento</th>
              <th class="num">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${escapeReceiptHtml(tx.description)}</strong>
                ${tx.invoice_number ? `<span class="desc-sub">Documento / Referência: #${escapeReceiptHtml(tx.invoice_number)}</span>` : ''}
              </td>
              <td class="mono">${escapeReceiptHtml(dueDateFmt)}</td>
              <td>${escapeReceiptHtml(methodLabel)}</td>
              <td class="num"><strong>R$ ${amountFmt}</strong></td>
            </tr>
            <tr class="total-row">
              <td colspan="3">Total Quitado</td>
              <td class="num" style="font-size:14px;">R$ ${amountFmt}</td>
            </tr>
          </tbody>
        </table>

        <div class="decl">
          Declaramos ter recebido de <strong>${escapeReceiptHtml(payerName)}</strong> a importância líquida de <strong>R$ ${amountFmt}</strong>,
          referente à obrigação discriminada acima, liquidada via <strong>${escapeReceiptHtml(methodLabel)}</strong> em <strong>${escapeReceiptHtml(paidDate)}</strong>,
          dando plena, geral e irrevogável quitação desta parcela.
        </div>

        <footer class="footer">
          <div class="seal">
            <div class="seal-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <div>
              <strong style="color:#063B5C;">Autenticação Eletrônica GundjaTech</strong><br />
              Documento digital válido sem necessidade de assinatura física · gundjatech.com
            </div>
          </div>
          <div style="text-align:right;">
            Quitado em <strong style="color:#063B5C;">${escapeReceiptHtml(paidDate)}</strong><br />
            Código: <span class="mono">${escapeReceiptHtml(authCode)}</span>
          </div>
        </footer>
      </div>
    </div>
  </div>
</body>
</html>`;
}

