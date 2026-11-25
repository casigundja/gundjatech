-- ============================================================================
-- Migration 0007: Índices de performance e integridade para consultas de auditoria
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quotations_service_request_id ON quotations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_history_req_id ON service_request_history(service_request_id);
CREATE INDEX IF NOT EXISTS idx_request_status_histories_req_id ON request_status_histories(service_request_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel_phone_status ON conversations(channel, visitor_phone, status);
