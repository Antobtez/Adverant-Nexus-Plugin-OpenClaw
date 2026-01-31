/**
 * Cron Job Type Definitions
 *
 * Type definitions for the OpenClaw cron job scheduling system
 *
 * @module types/cron
 */

/**
 * Cron job status
 */
export enum CronJobStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  PAUSED = 'paused',
  DELETED = 'deleted'
}

/**
 * Cron execution status
 */
export enum CronExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  SKIPPED = 'skipped'
}

/**
 * Cron job interface (database model)
 */
export interface CronJob {
  job_id: string;
  user_id: string;
  organization_id: string;
  job_name: string;
  description?: string;
  schedule: string; // Cron expression
  timezone: string;
  skill_name: string;
  skill_params?: Record<string, any>;
  enabled: boolean;
  paused_reason?: string;
  last_run?: Date;
  last_status?: 'success' | 'failed' | 'timeout' | 'skipped';
  last_error?: string;
  next_run?: Date;
  run_count: number;
  success_count: number;
  failure_count: number;
  max_retries: number;
  timeout_seconds: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

/**
 * Cron job creation request
 */
export interface CreateCronJobRequest {
  userId: string;
  organizationId: string;
  jobName: string;
  description?: string;
  schedule: string;
  timezone?: string;
  skillName: string;
  skillParams?: Record<string, any>;
  maxRetries?: number;
  timeoutSeconds?: number;
}

/**
 * Cron job update request
 */
export interface UpdateCronJobRequest {
  jobName?: string;
  description?: string;
  schedule?: string;
  timezone?: string;
  skillParams?: Record<string, any>;
  enabled?: boolean;
  pausedReason?: string;
  maxRetries?: number;
  timeoutSeconds?: number;
}

/**
 * Cron execution record
 */
export interface CronExecution {
  execution_id: string;
  job_id: string;
  organization_id: string;
  skill_name: string;
  skill_params?: Record<string, any>;
  status: CronExecutionStatus;
  started_at: Date;
  completed_at?: Date;
  execution_time_ms?: number;
  error_message?: string;
  error_code?: string;
  error_stack?: string;
  retry_count: number;
  result?: Record<string, any>;
}

/**
 * Cron schedule type (parsed cron expression)
 */
export interface CronSchedule {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  second?: string; // Optional for 6-part cron
}

/**
 * Cron job statistics
 */
export interface CronJobStats {
  job_id: string;
  job_name: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  average_duration_ms: number;
  last_run?: Date;
  next_run?: Date;
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'never_run';
}

/**
 * Cron validation result
 */
export interface CronValidationResult {
  valid: boolean;
  errors?: string[];
  nextRuns?: Date[]; // Next 5 run times for preview
}

/**
 * Cron job execution context
 */
export interface CronJobContext {
  jobId: string;
  jobName: string;
  organizationId: string;
  userId: string;
  scheduledTime: Date;
  actualStartTime: Date;
  retryAttempt: number;
  maxRetries: number;
  timeoutSeconds: number;
}

/**
 * Cron execution history query
 */
export interface CronExecutionHistoryQuery {
  jobId?: string;
  organizationId: string;
  status?: CronExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Cron job list query
 */
export interface CronJobListQuery {
  organizationId: string;
  userId?: string;
  enabled?: boolean;
  skillName?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'next_run' | 'last_run' | 'created_at' | 'job_name';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Scheduled task (internal scheduler representation)
 */
export interface ScheduledTask {
  jobId: string;
  cronExpression: string;
  timezone: string;
  task: any; // node-cron ScheduledTask
  isRunning: boolean;
  lastExecution?: Date;
  nextExecution?: Date;
}

/**
 * Cron manager configuration
 */
export interface CronManagerConfig {
  enableAutoRecovery: boolean; // Resume missed jobs on startup
  maxConcurrentJobs: number; // Max jobs running simultaneously
  defaultTimezone: string;
  executionTimeout: number; // Default timeout in seconds
  retryAttempts: number; // Default retry attempts
  retryDelay: number; // Delay between retries in ms
}
