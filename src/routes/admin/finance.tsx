import { Hono } from 'hono';
import { Env, AppVariables } from '../../types/env';
import { getRequestBody } from '../../lib/request';
import { sendInvoiceNoticeEmail, sendEmail } from '../../lib/email';
import { loadBankPaymentSettings, renderOfficialPaymentReceiptHtml } from '../../lib/pix';
import { AdminFinanceView } from '../../views/admin/finance';

export function createAdminFinanceRoutes(deps: {
    autoRevokeIdlePortalUser: (db: any, env: Env, clientId?: number | null) => Promise<unknown>;
}) {
    const routes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

    routes.get('/financeiro', async (c) => {
        const user = c.get('user');
        const db = c.env.DB;
        const successMessage = c.req.query('success') || null;
        const errorMessage = c.req.query('error') || null;

        const search = (c.req.query('search') || '').trim();
        const statusFilter = (c.req.query('status') || '').trim();
        const typeFilter = (c.req.query('type') || '').trim();

        const totalInvoicedRow = await db.prepare(
            `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status != 'canceled'`
        ).first<{ val: number }>();

        const totalReceivedRow = await db.prepare(
            `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status = 'paid'`
        ).first<{ val: number }>();

        const totalPendingRow = await db.prepare(
            `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status IN ('pending', 'reviewing')`
        ).first<{ val: number }>();

        const totalOverdueRow = await db.prepare(
            `SELECT SUM(amount) as val FROM financial_transactions WHERE type = 'income' AND status = 'pending' AND due_date < date('now')`
        ).first<{ val: number }>();

        let query = `
            SELECT t.*, c.name as client_name, c.company, c.email as client_email,
                   (SELECT p.proof_file FROM payments p WHERE p.financial_transaction_id = t.id ORDER BY p.id DESC LIMIT 1) AS proof_file
            FROM financial_transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (search) {
            query += ` AND (t.description LIKE ? OR t.invoice_number LIKE ? OR c.name LIKE ? OR c.company LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        if (statusFilter) {
            query += ` AND t.status = ?`;
            params.push(statusFilter);
        }

        if (typeFilter) {
            query += ` AND t.type = ?`;
            params.push(typeFilter);
        }

        query += ` ORDER BY t.due_date DESC, t.created_at DESC`;

        const stmt = db.prepare(query);
        const transactions = (await (params.length ? stmt.bind(...params) : stmt).all()).results || [];

        const clients = (await db.prepare(`SELECT id, name, company FROM clients ORDER BY company ASC, name ASC`).all()).results || [];

        return c.html(
            <AdminFinanceView
                currentUser={user}
                transactions={transactions}
                clients={clients}
                metrics={{
                    totalInvoiced: totalInvoicedRow?.val || 0,
                    totalReceived: totalReceivedRow?.val || 0,
                    totalPending: totalPendingRow?.val || 0,
                    totalOverdue: totalOverdueRow?.val || 0
                }}
                statusFilter={statusFilter}
                typeFilter={typeFilter}
                search={search}
                successMessage={successMessage}
                errorMessage={errorMessage}
            />
        );
    });

    routes.post('/financeiro', async (c) => {
        const db = c.env.DB;
        const body = await getRequestBody(c);

        const clientId = Number(body.client_id);
        const typeRaw = String(body.type || 'income').trim();
        const txType = typeRaw === 'expense' ? 'expense' : 'income';
        const description = String(body.description || '').trim();
        const amount = Number(body.amount);
        const dueDate = String(body.due_date || '').trim();
        const paymentMethod = String(body.payment_method || 'PIX').trim();
        const invoiceNumber = String(body.invoice_number || '').trim() || null;

        if (!clientId || !description || !amount || !dueDate) {
            return c.redirect('/admin/financeiro?error=Preencha todos os campos obrigatórios');
        }

        const txTypeSql = txType === 'expense' ? "'expense'" : "'income'";
        await db.prepare(
            `INSERT INTO financial_transactions (client_id, type, category, description, amount, status, due_date, payment_method, invoice_number, created_at, updated_at)
             VALUES (?, ${txTypeSql}, 'contract', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(clientId, description, amount, dueDate, paymentMethod, invoiceNumber).run();

        try {
            const client = await db.prepare(`SELECT name, email FROM clients WHERE id = ?`).bind(clientId).first<{ name: string; email: string }>();
            if (client && client.email) {
                await sendInvoiceNoticeEmail(c.env, client.email, client.name, {
                    description,
                    amount,
                    dueDate,
                    invoiceNumber: invoiceNumber || undefined
                });
            }
        } catch (mailErr) {
            console.error('Erro ao despachar e-mail de fatura:', mailErr);
        }

        return c.redirect('/admin/financeiro?success=Fatura cadastrada com sucesso');
    });

    routes.get('/financeiro/:id/comprovante', async (c) => {
        const db = c.env.DB;
        const txId = Number(c.req.param('id'));

        const row = await db.prepare(
            `SELECT proof_file FROM payments
             WHERE financial_transaction_id = ? AND proof_file IS NOT NULL
             ORDER BY id DESC LIMIT 1`
        ).bind(txId).first<{ proof_file: string }>();

        if (!row?.proof_file || !c.env.UPLOADS_BUCKET) {
            return c.text('Comprovante não encontrado', 404);
        }

        const obj = await c.env.UPLOADS_BUCKET.get(row.proof_file);
        if (!obj) return c.text('Arquivo não encontrado', 404);

        const headers = new Headers();
        headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('Content-Disposition', `inline; filename="comprovante-fatura-${txId}"`);
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('Content-Security-Policy', 'sandbox');
        headers.set('Cache-Control', 'private, no-store');
        return new Response(obj.body, { headers });
    });

    routes.get('/financeiro/:id/recibo', async (c) => {
        const db = c.env.DB;
        const txId = Number(c.req.param('id'));

        const tx = await db.prepare(
            `SELECT * FROM financial_transactions WHERE id = ? AND status = 'paid'`
        ).bind(txId).first<any>();

        if (!tx) {
            return c.text('Recibo disponível apenas para lançamentos quitados.', 404);
        }

        const client = tx.client_id
            ? await db.prepare(`SELECT * FROM clients WHERE id = ?`).bind(tx.client_id).first<any>()
            : null;
        const bankSettings = await loadBankPaymentSettings(db);
        return c.html(renderOfficialPaymentReceiptHtml({ tx, client, bankSettings }));
    });

    routes.post('/financeiro/:id/recusar-comprovante', async (c) => {
        const db = c.env.DB;
        const txId = Number(c.req.param('id'));
        const body = await getRequestBody(c);
        const reason = String(body.reason || 'Comprovante ilegível ou divergente. Por favor, envie novamente.').trim().slice(0, 200);

        await db.prepare(
            `UPDATE financial_transactions
             SET status = 'pending', notes = ?, updated_at = datetime('now')
             WHERE id = ? AND status = 'reviewing'`
        ).bind(`[COMPROVANTE RECUSADO] ${reason}`, txId).run();

        try {
            await db.prepare(
                `UPDATE payments SET status = 'rejected', updated_at = datetime('now')
                 WHERE financial_transaction_id = ? AND status = 'reviewing'`
            ).bind(txId).run();
        } catch { }

        return c.redirect('/admin/financeiro?success=Comprovante recusado e fatura devolvida ao cliente como Pendente.');
    });

    routes.post('/financeiro/:id/pagar', async (c) => {
        const db = c.env.DB;
        const id = c.req.param('id');

        let txType = 'income';
        let txClientId: number | null = null;
        let txDesc = '';
        let txAmount = 0;
        try {
            const row = await db.prepare(`SELECT type, client_id, description, amount FROM financial_transactions WHERE id = ?`).bind(id).first<any>();
            if (row?.type) txType = row.type;
            if (row?.client_id) txClientId = Number(row.client_id);
            if (row?.description) txDesc = String(row.description);
            if (row?.amount) txAmount = Number(row.amount);
        } catch { }

        await db.prepare(
            `UPDATE financial_transactions SET status = 'paid', paid_at = datetime('now'), notes = NULL, updated_at = datetime('now') WHERE id = ?`
        ).bind(id).run();

        try {
            await db.prepare(
                `UPDATE payments SET status = 'completed', updated_at = datetime('now')
                 WHERE financial_transaction_id = ? AND status = 'reviewing'`
            ).bind(id).run();
        } catch { }

        if (txType === 'income' && txClientId) {
            try {
                const client = await db.prepare(`SELECT name, company, email FROM clients WHERE id = ?`).bind(txClientId).first<any>();
                if (client?.email && !String(client.email).endsWith('.local')) {
                    const appUrl = (c.env.APP_URL || 'https://gundjatech.casimirogundja.workers.dev').replace(/\/$/, '');
                    const valFmt = txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    await sendEmail(c.env, {
                        to: client.email,
                        subject: `Pagamento Confirmado • Recibo Oficial GundjaTech #${id}`,
                        html: `<p>Olá, <strong>${client.company || client.name}</strong>!</p>
                               <p>Confirmamos o recebimento de <strong>R$ ${valFmt}</strong> referente a <strong>${txDesc}</strong>.</p>
                               <p>Seu <strong>Recibo Oficial de Quitação</strong> já está disponível no Portal do Cliente:<br/>
                               <a href="${appUrl}/portal/financeiro/${id}/recibo">Acessar Recibo de Quitação (PDF)</a></p>`
                    });
                }
            } catch { }
        }

        if (txClientId) {
            try {
                await deps.autoRevokeIdlePortalUser(db, c.env, txClientId);
            } catch { }
        }

        const msg = txType === 'expense' ? 'Despesa marcada como paga com sucesso' : 'Recebimento confirmado em caixa com sucesso';
        return c.redirect(`/admin/financeiro?success=${encodeURIComponent(msg)}`);
    });

    routes.post('/financeiro/:id/cancelar', async (c) => {
        const db = c.env.DB;
        const id = c.req.param('id');

        let txClientId: number | null = null;
        try {
            const row = await db.prepare(`SELECT client_id FROM financial_transactions WHERE id = ?`).bind(id).first<{ client_id?: number }>();
            if (row?.client_id) txClientId = Number(row.client_id);
        } catch { }

        await db.prepare(
            `UPDATE financial_transactions SET status = 'canceled', updated_at = datetime('now') WHERE id = ?`
        ).bind(id).run();

        if (txClientId) {
            try {
                await deps.autoRevokeIdlePortalUser(db, c.env, txClientId);
            } catch { }
        }

        return c.redirect('/admin/financeiro?success=Fatura cancelada');
    });

    routes.post('/financeiro/:id/excluir', async (c) => {
        const db = c.env.DB;
        const id = Number(c.req.param('id'));

        if (id > 0) {
            const tx = (await db.prepare(`SELECT status FROM financial_transactions WHERE id = ?`).bind(id).first()) as { status?: string } | null;
            if (tx?.status === 'paid') {
                return c.redirect(
                    `/admin/financeiro?error=${encodeURIComponent('Trava Contábil: Faturas já pagas não podem ser excluídas para preservar o Recibo Oficial de Quitação e a auditoria financeira.')}`
                );
            }
            try { await db.prepare(`DELETE FROM payments WHERE financial_transaction_id = ?`).bind(id).run(); } catch { }
            await db.prepare(`DELETE FROM financial_transactions WHERE id = ? AND status != 'paid'`).bind(id).run();
        }

        return c.redirect('/admin/financeiro?success=Lançamento financeiro excluído com sucesso.');
    });

    return routes;
}
