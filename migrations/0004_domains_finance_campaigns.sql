-- Migration 0004: Domínios, DNS, Finanças, Pagamentos e Campanhas
-- Compatível com Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    domain_name TEXT NOT NULL UNIQUE,
    registrar TEXT,
    registered_at TEXT,
    expires_at TEXT,
    auto_renew INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    dns_provider TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_domains_client ON domains(client_id);
CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(domain_name);

CREATE TABLE IF NOT EXISTS dns_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    ttl INTEGER DEFAULT 3600,
    priority INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS domain_renewals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id INTEGER NOT NULL,
    renewed_at TEXT NOT NULL,
    new_expiration_date TEXT NOT NULL,
    cost REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS financial_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    project_id INTEGER,
    quotation_id INTEGER,
    type TEXT NOT NULL DEFAULT 'income',
    category TEXT NOT NULL DEFAULT 'contract',
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date TEXT NOT NULL,
    paid_at TEXT,
    payment_method TEXT,
    invoice_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_finance_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_finance_due_date ON financial_transactions(due_date);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_transaction_id INTEGER,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    proof_file TEXT,
    status TEXT DEFAULT 'completed',
    paid_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (financial_transaction_id) REFERENCES financial_transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS advertising_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    project_id INTEGER,
    name TEXT NOT NULL,
    platform TEXT NOT NULL,
    objective TEXT DEFAULT 'Captação de Leads Qualificados',
    budget REAL DEFAULT 0,
    spent REAL DEFAULT 0,
    spent_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'active',
    start_date TEXT,
    end_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaigns_client ON advertising_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON advertising_campaigns(status);
