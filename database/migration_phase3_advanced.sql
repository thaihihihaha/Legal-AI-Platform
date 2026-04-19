-- PHASE 3.4: Advanced Search & Analytics
-- PHASE 3.5: Template & Clause Library
-- PHASE 3.6: Notifications & Reminders
-- PHASE 3.7: Export & Integrations

-- ============================================
-- PHASE 3.4: Search & Analytics
-- ============================================

-- 1. SearchIndexes - Full-text search support
CREATE TABLE IF NOT EXISTS search_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  indexed_content TEXT, -- Searchable text
  content_vector VECTOR(1536), -- OpenAI embeddings (if using vector search)
  keywords TEXT[], -- Array of keywords
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_indexes_draft_id ON search_indexes(draft_id);
CREATE INDEX idx_search_indexes_keywords ON search_indexes USING GIN(keywords);

-- 2. SavedSearches - User's saved search queries
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_name VARCHAR(100) NOT NULL,
  search_criteria JSONB NOT NULL, -- {keywords, status, template_type, date_range, etc.}
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_is_favorite ON saved_searches(is_favorite);

-- 3. Analytics - Contract metrics and statistics
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID REFERENCES drafts_generated(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- review_time, approval_time, risk_score, turnaround_time
  metric_value DECIMAL(10, 2),
  metric_unit VARCHAR(50), -- days, hours, percentage, score
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period VARCHAR(50), -- daily, weekly, monthly, total
  
  CONSTRAINT valid_metric_type CHECK (metric_type IN ('review_time', 'approval_time', 'risk_score', 'turnaround_time', 'productivity', 'compliance_score'))
);

CREATE INDEX idx_analytics_draft_id ON analytics(draft_id);
CREATE INDEX idx_analytics_company_id ON analytics(company_id);
CREATE INDEX idx_analytics_metric_type ON analytics(metric_type);
CREATE INDEX idx_analytics_recorded_at ON analytics(recorded_at);

-- 4. TeamMetrics - Team productivity metrics
CREATE TABLE IF NOT EXISTS team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id UUID, -- Optional team identifier
  date_period DATE NOT NULL,
  contracts_created INTEGER DEFAULT 0,
  contracts_reviewed INTEGER DEFAULT 0,
  contracts_approved INTEGER DEFAULT 0,
  avg_review_time DECIMAL(8, 2), -- in days
  avg_approval_time DECIMAL(8, 2),
  active_users INTEGER DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_metrics_company_id ON team_metrics(company_id);
CREATE INDEX idx_team_metrics_date_period ON team_metrics(date_period);

-- ============================================
-- PHASE 3.5: Template & Clause Library
-- ============================================

-- 1. TemplateVersions - Version history for templates
CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_description TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN DEFAULT FALSE,
  
  UNIQUE(template_id, version_number)
);

CREATE INDEX idx_template_versions_template_id ON template_versions(template_id);
CREATE INDEX idx_template_versions_version_number ON template_versions(version_number);

-- 2. Clauses - Reusable clause library
CREATE TABLE IF NOT EXISTS clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  clause_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- confidentiality, liability, termination, etc.
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  jurisdiction VARCHAR(50), -- e.g., US, EU, VN
  effectiveness_score DECIMAL(3, 2) DEFAULT 0.5, -- 0-1 rating
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clauses_company_id ON clauses(company_id);
CREATE INDEX idx_clauses_category ON clauses(category);
CREATE INDEX idx_clauses_tags ON clauses USING GIN(tags);
CREATE INDEX idx_clauses_jurisdiction ON clauses(jurisdiction);
CREATE INDEX idx_clauses_is_active ON clauses(is_active);

-- 3. ClauseSuggestions - AI-powered clause recommendations
CREATE TABLE IF NOT EXISTS clause_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES clauses(id) ON DELETE CASCADE,
  suggestion_reason VARCHAR(255), -- missing_clause, conflict_detected, best_practice
  confidence_score DECIMAL(3, 2), -- 0-1
  user_accepted BOOLEAN,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_reason CHECK (suggestion_reason IN ('missing_clause', 'conflict_detected', 'best_practice', 'jurisdiction_requirement'))
);

CREATE INDEX idx_clause_suggestions_draft_id ON clause_suggestions(draft_id);
CREATE INDEX idx_clause_suggestions_clause_id ON clause_suggestions(clause_id);
CREATE INDEX idx_clause_suggestions_user_accepted ON clause_suggestions(user_accepted);

-- 4. ClauseConflicts - Track conflicting clauses
CREATE TABLE IF NOT EXISTS clause_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  clause_id_1 UUID NOT NULL REFERENCES clauses(id),
  clause_id_2 UUID NOT NULL REFERENCES clauses(id),
  conflict_type VARCHAR(100), -- contradiction, ambiguity, redundancy
  severity VARCHAR(50), -- critical, high, medium, low
  resolution_notes TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clause_conflicts_draft_id ON clause_conflicts(draft_id);
CREATE INDEX idx_clause_conflicts_severity ON clause_conflicts(severity);

-- ============================================
-- PHASE 3.6: Notifications & Reminders
-- ============================================

-- 1. Reminders - Task reminders and alerts
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_draft_id UUID REFERENCES drafts_generated(id),
  reminder_type VARCHAR(50) NOT NULL, -- approval_deadline, review_followup, renewal_alert, risk_warning
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,
  priority VARCHAR(50) DEFAULT 'medium', -- critical, high, medium, low
  status VARCHAR(50) DEFAULT 'pending', -- pending, acknowledged, completed, dismissed
  reminder_sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_reminder_type CHECK (reminder_type IN ('approval_deadline', 'review_followup', 'renewal_alert', 'risk_warning', 'signature_pending')),
  CONSTRAINT valid_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'acknowledged', 'completed', 'dismissed'))
);

CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_priority ON reminders(priority);

-- 2. ReminderSchedules - Recurring reminders
CREATE TABLE IF NOT EXISTS reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  recurrence VARCHAR(50) NOT NULL, -- daily, weekly, monthly, quarterly, yearly, custom
  recurrence_pattern JSONB, -- For custom recurrence
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminder_schedules_user_id ON reminder_schedules(user_id);
CREATE INDEX idx_reminder_schedules_is_active ON reminder_schedules(is_active);

-- 3. NotificationQueue - Queue for async notifications
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(50) NOT NULL, -- email, sms, in_app, push
  message JSONB NOT NULL,
  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_delivery_status ON notification_queue(delivery_status);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);

-- ============================================
-- PHASE 3.7: Export & Integrations
-- ============================================

-- 1. IntegrationConfigs - External service integrations
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_type VARCHAR(100) NOT NULL, -- docusign, salesforce, microsoft365, slack, webhook
  is_enabled BOOLEAN DEFAULT TRUE,
  config_data JSONB NOT NULL, -- Encrypted credentials and settings
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  
  CONSTRAINT valid_integration_type CHECK (integration_type IN ('docusign', 'salesforce', 'microsoft365', 'slack', 'webhook', 'other'))
);

CREATE INDEX idx_integration_configs_company_id ON integration_configs(company_id);
CREATE INDEX idx_integration_configs_integration_type ON integration_configs(integration_type);
CREATE INDEX idx_integration_configs_is_enabled ON integration_configs(is_enabled);

-- 2. ExportHistory - Track export operations
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  exported_by UUID NOT NULL REFERENCES users(id),
  export_type VARCHAR(50) NOT NULL, -- docx, pdf, signed, comparison
  export_format VARCHAR(50),
  file_size_bytes INTEGER,
  file_hash VARCHAR(255), -- SHA-256 hash
  export_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_export_history_draft_id ON export_history(draft_id);
CREATE INDEX idx_export_history_exported_by ON export_history(exported_by);
CREATE INDEX idx_export_history_created_at ON export_history(created_at);

-- 3. Webhooks - Custom webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret VARCHAR(255),
  events TEXT[] NOT NULL, -- draft.created, draft.updated, review.completed, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_triggered_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0
);

CREATE INDEX idx_webhooks_company_id ON webhooks(company_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);

-- 4. WebhookDeliveries - Track webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status_code INTEGER,
  response_body TEXT,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  retry_count INTEGER DEFAULT 0,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('pending', 'delivered', 'failed'))
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_delivery_status ON webhook_deliveries(delivery_status);
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- 5. ExternalSyncLogs - Track syncs with external systems
CREATE TABLE IF NOT EXISTS external_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integration_configs(id),
  sync_type VARCHAR(100) NOT NULL, -- push_to_docusign, pull_from_salesforce, etc.
  external_entity_id VARCHAR(255),
  local_entity_id UUID REFERENCES drafts_generated(id),
  sync_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, synced, failed
  sync_metadata JSONB,
  error_message TEXT,
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_external_sync_logs_integration_id ON external_sync_logs(integration_id);
CREATE INDEX idx_external_sync_logs_sync_status ON external_sync_logs(sync_status);
CREATE INDEX idx_external_sync_logs_created_at ON external_sync_logs(created_at);
