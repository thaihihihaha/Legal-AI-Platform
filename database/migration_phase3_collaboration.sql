-- PHASE 3.2: Multi-User Collaboration System
-- Adds permissions, sharing, activity tracking, and real-time collaboration features

-- 1. DraftAccess - Fine-grained access control
CREATE TABLE IF NOT EXISTS draft_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- owner, editor, reviewer, viewer
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  can_share BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_role CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer')),
  UNIQUE(draft_id, user_id)
);

CREATE INDEX idx_draft_access_draft_id ON draft_access(draft_id);
CREATE INDEX idx_draft_access_user_id ON draft_access(user_id);
CREATE INDEX idx_draft_access_role ON draft_access(role);

-- 2. DraftCollaborators - Track active collaborators
CREATE TABLE IF NOT EXISTS draft_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_currently_editing BOOLEAN DEFAULT FALSE,
  cursor_position INTEGER,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255), -- WebSocket session identifier
  
  UNIQUE(draft_id, user_id)
);

CREATE INDEX idx_draft_collaborators_draft_id ON draft_collaborators(draft_id);
CREATE INDEX idx_draft_collaborators_user_id ON draft_collaborators(user_id);
CREATE INDEX idx_draft_collaborators_is_editing ON draft_collaborators(is_currently_editing);

-- 3. ActivityLog - Track all changes to drafts
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, shared, commented, approved
  action_type VARCHAR(50) NOT NULL, -- content_change, status_change, permission_change, review_action
  changes JSONB, -- Structured change data {field, old_value, new_value}
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'deleted', 'shared', 'commented', 'approved', 'rejected')),
  CONSTRAINT valid_action_type CHECK (action_type IN ('content_change', 'status_change', 'permission_change', 'review_action', 'other'))
);

CREATE INDEX idx_activity_logs_draft_id ON activity_logs(draft_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 4. Notifications - In-app and email notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARYKey DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- draft_shared, draft_commented, approval_requested, review_complete
  related_draft_id UUID REFERENCES drafts_generated(id),
  related_user_id UUID REFERENCES users(id),
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('draft_shared', 'draft_commented', 'approval_requested', 'review_complete', 'review_started', 'status_changed', 'access_granted'))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_related_draft_id ON notifications(related_draft_id);

-- 5. NotificationPreferences - User preferences for notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- 6. DraftSharing - Audit trail for sharing actions
CREATE TABLE IF NOT EXISTS draft_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES drafts_generated(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_with UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  access_level VARCHAR(50) NOT NULL DEFAULT 'limited', -- limited, full
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  
  CONSTRAINT valid_sharing_role CHECK (role IN ('owner', 'editor', 'reviewer', 'viewer'))
);

CREATE INDEX idx_draft_sharing_draft_id ON draft_sharing(draft_id);
CREATE INDEX idx_draft_sharing_shared_by ON draft_sharing(shared_by);
CREATE INDEX idx_draft_sharing_shared_with ON draft_sharing(shared_with);

-- 7. Mentions - Track @mentions in comments
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES review_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mentions_mentioned_user_id ON mentions(mentioned_user_id);
