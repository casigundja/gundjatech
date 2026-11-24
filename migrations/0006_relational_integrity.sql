-- Migration 0006: Integridade Relacional ERP & Índices de Performance
-- Compatível com Cloudflare D1 (SQLite)

-- 1. Vínculos relacionais exatos em projects (substituindo dependência frágil por título na cascata ERP)
ALTER TABLE projects ADD COLUMN quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN service_request_id INTEGER REFERENCES service_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_quotation_id ON projects(quotation_id);
CREATE INDEX IF NOT EXISTS idx_projects_service_request_id ON projects(service_request_id);

-- 2. Índices em chaves estrangeiras de alta consulta (Financeiro, Pagamentos, Etapas, Conversas)
CREATE INDEX IF NOT EXISTS idx_finance_client_id ON financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_finance_project_id ON financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_quotation_id ON financial_transactions(quotation_id);

CREATE INDEX IF NOT EXISTS idx_payments_tx_id ON payments(financial_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_project_stages_project_id ON project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
