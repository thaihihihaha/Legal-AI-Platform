-- PHASE 3.3: Compliance & Audit Trail System
-- Adds comprehensive audit logging, digital signatures, legal hold, and compliance tracking

-- 1. AuditLog - Complete audit trail for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- draft, review, approval, signature, access
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  changes JSONB, -- Detailed change log
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  status VARCHAR(50), -- success, failure
  error_message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('draft', 'review', 'approval', 'signature', 'access')),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failure'))
);

CREATE INDEX idx_audit_logs_draft_id ON audit_logs(draft_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 2. DigitalSignatures - Digital signature records
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  signed_by UUID NOT NULL REFERENCES users(id),
  signature_method VARCHAR(50) NOT NULL, -- pkcs7, xmldsig, timestamp, biometric
  signature_data TEXT NOT NULL, -- Base64-encoded signature
  certificate_info JSONB, -- Certificate details
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signature_hash VARCHAR(255), -- SHA-256 hash of document
  is_valid BOOLEAN DEFAULT TRUE,
  valid_until TIMESTAMP,
  signed_version_id UUID, -- Reference to which version
  metadata JSONB,
  
  CONSTRAINT valid_signature_method CHECK (signature_method IN ('pkcs7', 'xmldsig', 'timestamp', 'biometric'))
);

CREATE INDEX idx_digital_signatures_draft_id ON digital_signatures(draft_id);
CREATE INDEX idx_digital_signatures_signed_by ON digital_signatures(signed_by);
CREATE INDEX idx_digital_signatures_timestamp ON digital_signatures(timestamp);
CREATE INDEX idx_digital_signatures_is_valid ON digital_signatures(is_valid);

-- 3. LegalHold - Legal hold management
CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lifted_by UUID REFERENCES users(id),
  lifted_at TIMESTAMP,
  hold_status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, lifted, expired
  expiry_date TIMESTAMP,
  description TEXT,
  case_number VARCHAR(100),
  metadata JSONB,
  
  CONSTRAINT valid_hold_status CHECK (hold_status IN ('active', 'lifted', 'expired'))
);

CREATE INDEX idx_legal_holds_draft_id ON legal_holds(draft_id);
CREATE INDEX idx_legal_holds_hold_status ON legal_holds(hold_status);
CREATE INDEX idx_legal_holds_created_by ON legal_holds(created_by);

-- 4. ComplianceChecks - Track compliance verification
CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  standard_name VARCHAR(100) NOT NULL, -- GDPR, HIPAA, SOX, Local, etc.
  jurisdiction VARCHAR(50), -- e.g., EU, US-CA, VN
  compliance_status VARCHAR(50) NOT NULL DEFAULT 'unchecked', -- compliant, non_compliant, partial, unchecked
  compliance_score DECIMAL(5, 2), -- 0-100
  last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checked_by UUID REFERENCES users(id),
  findings JSONB, -- Array of compliance findings
  remediation_items JSONB, -- What needs to be fixed
  next_review_date TIMESTAMP,
  metadata JSONB
);

CREATE INDEX idx_compliance_checks_draft_id ON compliance_checks(draft_id);
CREATE INDEX idx_compliance_checks_standard_name ON compliance_checks(standard_name);
CREATE INDEX idx_compliance_checks_compliance_status ON compliance_checks(compliance_status);

-- 5. RetentionPolicies - Define document retention rules
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  policy_name VARCHAR(100) NOT NULL,
  content_type VARCHAR(50), -- employee_contract, service_agreement, etc.
  retention_years INTEGER DEFAULT 7,
  jurisdiction VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_retention_policies_company_id ON retention_policies(company_id);
CREATE INDEX idx_retention_policies_is_active ON retention_policies(is_active);

-- 6. DocumentLifecycle - Track document lifecycle stages
CREATE TABLE IF NOT EXISTS document_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL, -- draft, review, approved, executed, archived
  entered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exited_at TIMESTAMP,
  metadata JSONB,
  
  CONSTRAINT valid_stage CHECK (stage IN ('draft', 'review', 'approved', 'executed', 'archived', 'destroyed'))
);

CREATE INDEX idx_document_lifecycle_draft_id ON document_lifecycle(draft_id);
CREATE INDEX idx_document_lifecycle_stage ON document_lifecycle(stage);

-- Add compliance columns to drafts if not exists
ALTER TABLE drafts_generated
ADD COLUMN IF NOT EXISTS has_legal_hold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS overall_compliance_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_drafts_has_legal_hold ON drafts_generated(has_legal_hold);
CREATE INDEX IF NOT EXISTS idx_drafts_is_signed ON drafts_generated(is_signed);
