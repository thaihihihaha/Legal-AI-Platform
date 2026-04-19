-- PHASE 3.1: AI-Powered Contract Review System
-- Adds review workflow, risk assessment, and approval routing capabilities

-- 1. ReviewSession - Track review sessions for each draft
CREATE TABLE IF NOT EXISTS review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_review, completed, cancelled
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  due_date TIMESTAMP,
  review_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- standard, expedited, compliance_check
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_review', 'completed', 'cancelled')),
  CONSTRAINT valid_review_type CHECK (review_type IN ('standard', 'expedited', 'compliance_check'))
);

CREATE INDEX idx_review_sessions_draft_id ON review_sessions(draft_id);
CREATE INDEX idx_review_sessions_status ON review_sessions(status);
CREATE INDEX idx_review_sessions_initiated_by ON review_sessions(initiated_by);

-- 2. ReviewAssignments - Assign reviewers to sessions
CREATE TABLE IF NOT EXISTS review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'reviewer', -- reviewer, approver, observer
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, reviewed, approved, rejected
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  notes TEXT,
  
  CONSTRAINT valid_role CHECK (role IN ('reviewer', 'approver', 'observer')),
  CONSTRAINT valid_assignment_status CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  UNIQUE(session_id, reviewer_id)
);

CREATE INDEX idx_review_assignments_session_id ON review_assignments(session_id);
CREATE INDEX idx_review_assignments_reviewer_id ON review_assignments(reviewer_id);
CREATE INDEX idx_review_assignments_status ON review_assignments(status);

-- 3. ReviewComments - Comments and annotations on drafts
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  clause_reference VARCHAR(255), -- e.g., "Section 3.2", "Article 5"
  comment_type VARCHAR(50) NOT NULL DEFAULT 'comment', -- comment, suggestion, requirement, note
  severity VARCHAR(50) DEFAULT 'info', -- critical, high, medium, low, info
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  parent_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_comment_type CHECK (comment_type IN ('comment', 'suggestion', 'requirement', 'note')),
  CONSTRAINT valid_severity CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info'))
);

CREATE INDEX idx_review_comments_session_id ON review_comments(session_id);
CREATE INDEX idx_review_comments_draft_id ON review_comments(draft_id);
CREATE INDEX idx_review_comments_commenter_id ON review_comments(commenter_id);
CREATE INDEX idx_review_comments_resolved ON review_comments(resolved);
CREATE INDEX idx_review_comments_severity ON review_comments(severity);
CREATE INDEX idx_review_comments_parent ON review_comments(parent_comment_id);

-- 4. RiskAssessment - AI-powered risk analysis results
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  assessed_by UUID REFERENCES users(id),
  overall_risk_level VARCHAR(50) NOT NULL, -- critical, high, medium, low
  compliance_score DECIMAL(5, 2), -- 0-100
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Risk breakdown by category
  legal_risks JSONB, -- Array of risk objects
  compliance_risks JSONB,
  operational_risks JSONB,
  financial_risks JSONB,
  
  -- Recommendations
  recommendations JSONB, -- Array of recommendation objects
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- completed, in_progress, pending
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_risk_level CHECK (overall_risk_level IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT valid_assessment_status CHECK (status IN ('completed', 'in_progress', 'pending'))
);

CREATE INDEX idx_risk_assessments_draft_id ON risk_assessments(draft_id);
CREATE INDEX idx_risk_assessments_overall_risk_level ON risk_assessments(overall_risk_level);
CREATE INDEX idx_risk_assessments_compliance_score ON risk_assessments(compliance_score);

-- 5. ApprovalRoute - Define approval workflows
CREATE TABLE IF NOT EXISTS approval_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  route_name VARCHAR(100), -- e.g., "Standard Approval", "Expedited Review"
  approvers JSONB NOT NULL, -- Array of {user_id, order, status}
  current_stage INTEGER DEFAULT 1, -- Which stage we're at (1-indexed)
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  
  CONSTRAINT valid_route_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_approval_routes_draft_id ON approval_routes(draft_id);
CREATE INDEX idx_approval_routes_status ON approval_routes(status);
CREATE INDEX idx_approval_routes_current_stage ON approval_routes(current_stage);

-- 6. ApprovalStages - Track individual approval decisions
CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES approval_routes(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, delegated
  decision_date TIMESTAMP,
  notes TEXT,
  delegated_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_stage_status CHECK (status IN ('pending', 'approved', 'rejected', 'delegated')),
  UNIQUE(route_id, stage_number, approver_id)
);

CREATE INDEX idx_approval_stages_route_id ON approval_stages(route_id);
CREATE INDEX idx_approval_stages_approver_id ON approval_stages(approver_id);
CREATE INDEX idx_approval_stages_status ON approval_stages(status);

-- 7. ReviewTemplates - Predefined review workflows
CREATE TABLE IF NOT EXISTS review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  review_checklist JSONB, -- Array of items to check
  approval_levels JSONB, -- Approval hierarchy
  due_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_review_templates_company_id ON review_templates(company_id);
CREATE INDEX idx_review_templates_is_active ON review_templates(is_active);

-- Add review_status to drafts_generated if not exists
ALTER TABLE drafts_generated
ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'not_reviewed',
ADD CONSTRAINT valid_review_status CHECK (review_status IN ('not_reviewed', 'under_review', 'approved', 'rejected', 'approved_with_changes'));

-- Timestamps for tracking
ALTER TABLE drafts_generated
ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_drafts_review_status ON drafts_generated(review_status);
