-- Migration 0005: Conversas, Chat CRM Autônomo, Blog e Portfólio
-- Compatível com Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    client_id INTEGER,
    user_id INTEGER,
    subject TEXT,
    channel TEXT DEFAULT 'web_chat',
    visitor_name TEXT,
    visitor_email TEXT,
    visitor_phone TEXT,
    visitor_company TEXT,
    visitor_objective TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    ai_enabled INTEGER NOT NULL DEFAULT 1,
    crm_stage TEXT DEFAULT 'greeting',
    lead_score INTEGER DEFAULT 0,
    qualified_at TEXT,
    handoff_at TEXT,
    closed_at TEXT,
    last_message_at TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_crm_stage ON conversations(crm_stage);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL,
    sender_id INTEGER,
    message TEXT NOT NULL,
    is_ai INTEGER NOT NULL DEFAULT 0,
    intent TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_id ON conversation_messages(conversation_id);

CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    featured_image TEXT,
    category TEXT,
    tags TEXT,
    status TEXT DEFAULT 'draft',
    published_at TEXT,
    views_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);

CREATE TABLE IF NOT EXISTS portfolio_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    client_name TEXT,
    category TEXT,
    summary TEXT,
    challenge TEXT,
    solution TEXT,
    results TEXT,
    featured_image TEXT,
    project_url TEXT,
    technologies TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_slug ON portfolio_cases(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_active ON portfolio_cases(is_active);
