-- ============================================================================
-- OpenClaw Plugin Database Schema Migration
-- ============================================================================
-- Creates the openclaw schema with tables for multi-tenant session management,
-- skill execution tracking, cron job scheduling, and messaging channel config.
--
-- Schema: openclaw
-- Tables:
--   - sessions: Multi-tenant chat sessions with organization isolation
--   - skill_executions: Skill execution history and audit trail
--   - cron_jobs: Scheduled automation tasks
--   - message_channels: Multi-channel messaging configuration
--
-- Security:
--   - All tables include organization_id for multi-tenant isolation
--   - Row-level security (RLS) policies to enforce data segregation
--   - Indexes optimized for common query patterns
--
-- Author: Adverant AI
-- Created: 2025-01-31
-- Version: 1.0.0
-- ============================================================================

-- Create openclaw schema
CREATE SCHEMA IF NOT EXISTS openclaw;

COMMENT ON SCHEMA openclaw IS 'OpenClaw Assistant plugin database schema for sessions, skills, and automation';

-- ============================================================================
-- Table: openclaw.sessions
-- Purpose: Multi-tenant chat sessions with channel association
-- ============================================================================

CREATE TABLE openclaw.sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Channel Information
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('whatsapp', 'telegram', 'discord', 'slack', 'signal', 'teams', 'web')),
  channel_id VARCHAR(255),                              -- Phone number, username, channel ID, etc.
  session_scope VARCHAR(50) DEFAULT 'per-sender' CHECK (session_scope IN ('per-sender', 'per-channel', 'global')),

  -- Session Context
  context JSONB DEFAULT '{}'::jsonb,                    -- Conversation context, user preferences, state
  metadata JSONB DEFAULT '{}'::jsonb,                   -- Additional metadata (IP address, user agent, etc.)

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,                  -- Auto-expire inactive sessions

  -- Status
  active BOOLEAN DEFAULT TRUE,

  -- Constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_sessions_user ON openclaw.sessions(user_id) WHERE active = TRUE;
CREATE INDEX idx_sessions_org ON openclaw.sessions(organization_id) WHERE active = TRUE;
CREATE INDEX idx_sessions_channel ON openclaw.sessions(channel_type, channel_id);
CREATE INDEX idx_sessions_activity ON openclaw.sessions(last_activity DESC) WHERE active = TRUE;
CREATE INDEX idx_sessions_expires ON openclaw.sessions(expires_at) WHERE expires_at IS NOT NULL AND active = TRUE;
CREATE INDEX idx_sessions_context ON openclaw.sessions USING GIN (context);

-- Comments
COMMENT ON TABLE openclaw.sessions IS 'Multi-tenant chat sessions with channel association and context tracking';
COMMENT ON COLUMN openclaw.sessions.session_scope IS 'Defines session isolation: per-sender (default), per-channel, or global';
COMMENT ON COLUMN openclaw.sessions.context IS 'JSONB context for conversation state, user preferences, and session variables';
COMMENT ON COLUMN openclaw.sessions.metadata IS 'Additional metadata such as IP address, user agent, location, etc.';

-- ============================================================================
-- Table: openclaw.skill_executions
-- Purpose: Skill execution history and audit trail
-- ============================================================================

CREATE TABLE openclaw.skill_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES openclaw.sessions(session_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,

  -- Skill Information
  skill_name VARCHAR(255) NOT NULL,
  skill_version VARCHAR(50),
  skill_category VARCHAR(100),                          -- nexus-integration, communication, automation, etc.

  -- Execution Details
  input_params JSONB,                                   -- Parameters passed to skill
  output_result JSONB,                                  -- Skill execution result
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout', 'cancelled')),

  -- Performance Metrics
  execution_time_ms INTEGER,                            -- Execution duration in milliseconds
  tokens_used INTEGER,                                  -- LLM tokens consumed (if applicable)
  cost_cents INTEGER,                                   -- Cost in cents (if applicable)

  -- Error Handling
  error_message TEXT,
  error_code VARCHAR(100),
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_skill_exec_session ON openclaw.skill_executions(session_id);
CREATE INDEX idx_skill_exec_org ON openclaw.skill_executions(organization_id);
CREATE INDEX idx_skill_exec_time ON openclaw.skill_executions(executed_at DESC);
CREATE INDEX idx_skill_exec_status ON openclaw.skill_executions(status);
CREATE INDEX idx_skill_exec_skill ON openclaw.skill_executions(skill_name, skill_version);
CREATE INDEX idx_skill_exec_duration ON openclaw.skill_executions(execution_time_ms) WHERE status = 'completed';
CREATE INDEX idx_skill_exec_failed ON openclaw.skill_executions(error_code) WHERE status = 'failed';
CREATE INDEX idx_skill_exec_input ON openclaw.skill_executions USING GIN (input_params);
CREATE INDEX idx_skill_exec_output ON openclaw.skill_executions USING GIN (output_result);

-- Comments
COMMENT ON TABLE openclaw.skill_executions IS 'Audit trail of all skill executions with performance metrics and error tracking';
COMMENT ON COLUMN openclaw.skill_executions.tokens_used IS 'Total LLM tokens consumed during skill execution';
COMMENT ON COLUMN openclaw.skill_executions.cost_cents IS 'Calculated cost in cents based on token usage and model pricing';

-- ============================================================================
-- Table: openclaw.cron_jobs
-- Purpose: Scheduled automation tasks
-- ============================================================================

CREATE TABLE openclaw.cron_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Job Configuration
  job_name VARCHAR(255),
  description TEXT,
  schedule VARCHAR(100) NOT NULL,                       -- Cron expression (e.g., "0 9 * * *")
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Skill Execution
  skill_name VARCHAR(255) NOT NULL,
  skill_params JSONB,                                   -- Parameters to pass to skill

  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  paused_reason TEXT,

  -- Execution Tracking
  last_run TIMESTAMP WITH TIME ZONE,
  last_status VARCHAR(50) CHECK (last_status IN ('success', 'failed', 'timeout', 'skipped')),
  last_error TEXT,
  next_run TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,

  -- Execution Limits
  max_retries INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 300,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,                  -- Soft delete

  -- Constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT chk_schedule_format CHECK (schedule ~ '^[0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+ [0-9*/,-]+$')
);

-- Indexes for performance
CREATE INDEX idx_cron_org ON openclaw.cron_jobs(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cron_user ON openclaw.cron_jobs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cron_next_run ON openclaw.cron_jobs(next_run ASC) WHERE enabled = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_cron_skill ON openclaw.cron_jobs(skill_name);
CREATE INDEX idx_cron_enabled ON openclaw.cron_jobs(enabled) WHERE deleted_at IS NULL;
CREATE INDEX idx_cron_last_run ON openclaw.cron_jobs(last_run DESC) WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE openclaw.cron_jobs IS 'Scheduled automation tasks with cron-based scheduling';
COMMENT ON COLUMN openclaw.cron_jobs.schedule IS 'Cron expression (minute hour day month weekday)';
COMMENT ON COLUMN openclaw.cron_jobs.timezone IS 'Timezone for cron schedule evaluation (default: UTC)';
COMMENT ON COLUMN openclaw.cron_jobs.deleted_at IS 'Soft delete timestamp (NULL = active, timestamp = deleted)';

-- ============================================================================
-- Table: openclaw.message_channels
-- Purpose: Multi-channel messaging configuration
-- ============================================================================

CREATE TABLE openclaw.message_channels (
  channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  -- Channel Information
  channel_type VARCHAR(50) NOT NULL CHECK (channel_type IN ('whatsapp', 'telegram', 'discord', 'slack', 'signal', 'teams', 'web')),
  channel_identifier VARCHAR(255) NOT NULL,             -- Phone number, bot token, webhook URL, etc.
  channel_name VARCHAR(255),                            -- Human-readable channel name

  -- Channel Configuration
  channel_config JSONB,                                 -- Channel-specific config (QR code, OAuth tokens, etc.)
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),

  -- Status
  active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  connection_status VARCHAR(50) DEFAULT 'disconnected' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  last_error TEXT,

  -- Usage Tracking
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Unique constraint: one channel identifier per organization per channel type
CREATE UNIQUE INDEX idx_channels_unique ON openclaw.message_channels(organization_id, channel_type, channel_identifier) WHERE active = TRUE;

-- Indexes for performance
CREATE INDEX idx_channels_org ON openclaw.message_channels(organization_id) WHERE active = TRUE;
CREATE INDEX idx_channels_user ON openclaw.message_channels(user_id) WHERE active = TRUE;
CREATE INDEX idx_channels_type ON openclaw.message_channels(channel_type) WHERE active = TRUE;
CREATE INDEX idx_channels_status ON openclaw.message_channels(connection_status);
CREATE INDEX idx_channels_last_used ON openclaw.message_channels(last_used DESC) WHERE active = TRUE;
CREATE INDEX idx_channels_config ON openclaw.message_channels USING GIN (channel_config);

-- Comments
COMMENT ON TABLE openclaw.message_channels IS 'Multi-channel messaging configuration (WhatsApp, Telegram, Slack, etc.)';
COMMENT ON COLUMN openclaw.message_channels.channel_identifier IS 'Unique identifier for the channel (phone number, bot token, webhook URL)';
COMMENT ON COLUMN openclaw.message_channels.channel_config IS 'JSONB configuration specific to channel type (QR code, OAuth tokens, etc.)';
COMMENT ON COLUMN openclaw.message_channels.webhook_url IS 'Webhook URL for receiving messages from external platforms';

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- Purpose: Enforce multi-tenant data isolation at the database level
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE openclaw.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE openclaw.skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE openclaw.cron_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE openclaw.message_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access data from their organization
CREATE POLICY sessions_org_isolation ON openclaw.sessions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY skill_exec_org_isolation ON openclaw.skill_executions
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY cron_org_isolation ON openclaw.cron_jobs
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY channels_org_isolation ON openclaw.message_channels
  FOR ALL
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

-- ============================================================================
-- Triggers
-- Purpose: Automated timestamp updates and cleanup
-- ============================================================================

-- Trigger function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION openclaw.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_cron_jobs_updated_at
  BEFORE UPDATE ON openclaw.cron_jobs
  FOR EACH ROW
  EXECUTE FUNCTION openclaw.update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON openclaw.message_channels
  FOR EACH ROW
  EXECUTE FUNCTION openclaw.update_updated_at_column();

-- Trigger function: Update last_activity on session update
CREATE OR REPLACE FUNCTION openclaw.update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_last_activity
  BEFORE UPDATE ON openclaw.sessions
  FOR EACH ROW
  WHEN (OLD.context IS DISTINCT FROM NEW.context OR OLD.metadata IS DISTINCT FROM NEW.metadata)
  EXECUTE FUNCTION openclaw.update_session_activity();

-- Trigger function: Calculate execution time on skill completion
CREATE OR REPLACE FUNCTION openclaw.calculate_execution_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'timeout') AND NEW.started_at IS NOT NULL THEN
    NEW.execution_time_ms = EXTRACT(EPOCH FROM (NOW() - NEW.started_at)) * 1000;
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_skill_execution_time
  BEFORE UPDATE ON openclaw.skill_executions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION openclaw.calculate_execution_time();

-- ============================================================================
-- Cleanup Functions
-- Purpose: Automated cleanup of expired sessions and old execution logs
-- ============================================================================

-- Function: Delete expired sessions
CREATE OR REPLACE FUNCTION openclaw.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM openclaw.sessions
  WHERE expires_at < NOW()
    AND active = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION openclaw.cleanup_expired_sessions() IS 'Delete sessions that have passed their expiration time';

-- Function: Archive old skill executions
CREATE OR REPLACE FUNCTION openclaw.archive_old_executions(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM openclaw.skill_executions
  WHERE executed_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'failed');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION openclaw.archive_old_executions(INTEGER) IS 'Archive skill executions older than specified days (default: 90)';

-- ============================================================================
-- Utility Views
-- Purpose: Convenience views for common queries
-- ============================================================================

-- View: Active sessions summary
CREATE OR REPLACE VIEW openclaw.active_sessions_summary AS
SELECT
  organization_id,
  channel_type,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(last_activity) as most_recent_activity,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_duration_hours
FROM openclaw.sessions
WHERE active = TRUE
GROUP BY organization_id, channel_type;

COMMENT ON VIEW openclaw.active_sessions_summary IS 'Summary of active sessions by organization and channel type';

-- View: Skill execution statistics
CREATE OR REPLACE VIEW openclaw.skill_execution_stats AS
SELECT
  organization_id,
  skill_name,
  skill_category,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(execution_time_ms) FILTER (WHERE status = 'completed') as avg_execution_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) FILTER (WHERE status = 'completed') as p95_execution_ms,
  SUM(tokens_used) as total_tokens,
  SUM(cost_cents) as total_cost_cents
FROM openclaw.skill_executions
WHERE executed_at > NOW() - INTERVAL '30 days'
GROUP BY organization_id, skill_name, skill_category;

COMMENT ON VIEW openclaw.skill_execution_stats IS 'Skill execution statistics for the last 30 days';

-- View: Cron job health
CREATE OR REPLACE VIEW openclaw.cron_job_health AS
SELECT
  job_id,
  job_name,
  organization_id,
  user_id,
  skill_name,
  enabled,
  run_count,
  success_count,
  failure_count,
  CASE
    WHEN run_count = 0 THEN 'never_run'
    WHEN success_count::FLOAT / NULLIF(run_count, 0) >= 0.95 THEN 'healthy'
    WHEN success_count::FLOAT / NULLIF(run_count, 0) >= 0.80 THEN 'degraded'
    ELSE 'unhealthy'
  END as health_status,
  last_run,
  last_status,
  next_run
FROM openclaw.cron_jobs
WHERE deleted_at IS NULL;

COMMENT ON VIEW openclaw.cron_job_health IS 'Health status of cron jobs based on success rate';

-- ============================================================================
-- Grant Permissions
-- Purpose: Grant appropriate permissions to application role
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA openclaw TO nexus_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA openclaw TO nexus_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA openclaw TO nexus_app;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA openclaw TO nexus_app;

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA openclaw GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexus_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA openclaw GRANT EXECUTE ON FUNCTIONS TO nexus_app;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  trigger_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'openclaw';

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'openclaw';

  -- Count triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'openclaw';

  -- Report results
  RAISE NOTICE '=== OpenClaw Schema Migration Completed ===';
  RAISE NOTICE 'Tables created: %', table_count;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'Triggers created: %', trigger_count;

  -- Verify critical tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'openclaw' AND table_name = 'sessions') THEN
    RAISE EXCEPTION 'Critical table openclaw.sessions not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'openclaw' AND table_name = 'skill_executions') THEN
    RAISE EXCEPTION 'Critical table openclaw.skill_executions not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'openclaw' AND table_name = 'cron_jobs') THEN
    RAISE EXCEPTION 'Critical table openclaw.cron_jobs not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'openclaw' AND table_name = 'message_channels') THEN
    RAISE EXCEPTION 'Critical table openclaw.message_channels not created';
  END IF;

  RAISE NOTICE 'All critical tables verified successfully';
  RAISE NOTICE '==========================================';
END $$;
