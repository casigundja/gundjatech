-- Migration 0002: Clientes, Categorias, Serviços e Solicitações de Atendimento
-- Compatível com Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    trade_name TEXT,
    tax_id TEXT,
    document TEXT,
    segment TEXT,
    address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(lower(email));
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

CREATE TABLE IF NOT EXISTS service_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    category TEXT DEFAULT 'sites',
    name TEXT,
    title TEXT,
    slug TEXT NOT NULL UNIQUE,
    short_description TEXT,
    summary TEXT,
    description TEXT,
    base_price REAL DEFAULT 0,
    price REAL DEFAULT 0,
    price_starting_at REAL DEFAULT 0,
    estimated_days INTEGER,
    delivery_time_days INTEGER,
    features TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    order_position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    protocol TEXT,
    tracking_code TEXT UNIQUE,
    client_id INTEGER,
    user_id INTEGER,
    service_id INTEGER,
    name TEXT,
    company TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    service_title TEXT,
    description TEXT,
    briefing TEXT,
    estimated_budget REAL,
    deadline TEXT,
    desired_deadline TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'normal',
    internal_notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_tracking ON service_requests(tracking_code);
CREATE INDEX IF NOT EXISTS idx_service_requests_protocol ON service_requests(protocol);

CREATE TABLE IF NOT EXISTS request_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS request_status_histories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT DEFAULT 'status_change',
    status_from TEXT,
    status_to TEXT,
    old_status TEXT,
    new_status TEXT,
    from_status TEXT,
    to_status TEXT,
    notes TEXT,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_request_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_request_id INTEGER NOT NULL,
    user_id INTEGER,
    action TEXT DEFAULT 'status_change',
    from_status TEXT,
    to_status TEXT,
    old_status TEXT,
    new_status TEXT,
    notes TEXT,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
