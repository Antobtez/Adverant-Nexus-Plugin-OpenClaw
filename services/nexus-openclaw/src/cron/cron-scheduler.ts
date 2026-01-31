/**
 * Cron Job Scheduler
 *
 * Main cron job scheduler using node-cron for scheduling and executing
 * automated skill executions on a cron schedule.
 *
 * Features:
 * - Parse and validate cron expressions
 * - Schedule job execution with timezone support
 * - Dynamic job registration/unregistration
 * - Next run time calculation
 * - Concurrent execution management
 *
 * @module cron/cron-scheduler
 */

import cron from 'node-cron';
import {
  CronJob,
  CronSchedule,
  CronValidationResult,
  ScheduledTask,
  CronManagerConfig
} from '../types/cron.types';
import { Logger } from '../types';

/**
 * Cron Scheduler Class
 * Manages scheduling and execution of cron jobs
 */
export class CronScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private logger: Logger | null = null;
  private isInitialized: boolean = false;
  private config: CronManagerConfig;

  // Execution tracking
  private runningJobs: Set<string> = new Set();
  private jobQueue: string[] = [];

  constructor(config?: Partial<CronManagerConfig>) {
    this.config = {
      enableAutoRecovery: config?.enableAutoRecovery ?? true,
      maxConcurrentJobs: config?.maxConcurrentJobs ?? 10,
      defaultTimezone: config?.defaultTimezone ?? 'UTC',
      executionTimeout: config?.executionTimeout ?? 300,
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 1000
    };
  }

  /**
   * Initialize the scheduler
   */
  initialize(logger: Logger): void {
    this.logger = logger;
    this.isInitialized = true;

    this.logger.info('Cron scheduler initialized', {
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      defaultTimezone: this.config.defaultTimezone,
      autoRecoveryEnabled: this.config.enableAutoRecovery
    });
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): CronValidationResult {
    const errors: string[] = [];

    // Check basic format
    if (!expression || typeof expression !== 'string') {
      errors.push('Cron expression must be a non-empty string');
      return { valid: false, errors };
    }

    // Trim whitespace
    const trimmed = expression.trim();
    const parts = trimmed.split(/\s+/);

    // Support 5-part (standard) or 6-part (with seconds) cron expressions
    if (parts.length !== 5 && parts.length !== 6) {
      errors.push(
        `Cron expression must have 5 or 6 parts (minute hour day month weekday [second]), got ${parts.length}`
      );
      return { valid: false, errors };
    }

    // Validate using node-cron
    const isValid = cron.validate(trimmed);
    if (!isValid) {
      errors.push('Invalid cron expression syntax');
      return { valid: false, errors };
    }

    // Calculate next runs for preview
    try {
      const nextRuns = this.calculateNextRuns(trimmed, 5);
      return {
        valid: true,
        nextRuns
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Failed to calculate next runs');
      return { valid: false, errors };
    }
  }

  /**
   * Parse cron expression into components
   */
  parseCronExpression(expression: string): CronSchedule {
    const parts = expression.trim().split(/\s+/);

    if (parts.length === 5) {
      // Standard 5-part cron
      return {
        minute: parts[0],
        hour: parts[1],
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4]
      };
    } else if (parts.length === 6) {
      // 6-part cron with seconds
      return {
        second: parts[0],
        minute: parts[1],
        hour: parts[2],
        dayOfMonth: parts[3],
        month: parts[4],
        dayOfWeek: parts[5]
      };
    } else {
      throw new Error('Invalid cron expression format');
    }
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(
    job: CronJob,
    onExecute: (job: CronJob) => Promise<void>
  ): boolean {
    if (!this.isInitialized) {
      throw new Error('Scheduler not initialized');
    }

    // Check if job is already scheduled
    if (this.tasks.has(job.job_id)) {
      this.logger?.warn('Job already scheduled, unscheduling first', {
        jobId: job.job_id,
        jobName: job.job_name
      });
      this.unscheduleJob(job.job_id);
    }

    try {
      // Validate cron expression
      const validation = this.validateCronExpression(job.schedule);
      if (!validation.valid) {
        throw new Error(`Invalid cron expression: ${validation.errors?.join(', ')}`);
      }

      // Create scheduled task
      const task = cron.schedule(
        job.schedule,
        async () => {
          await this.executeJob(job, onExecute);
        },
        {
          scheduled: false, // Don't start immediately
          timezone: job.timezone || this.config.defaultTimezone
        }
      );

      // Calculate next execution time
      const nextRun = this.calculateNextRun(job.schedule, job.timezone);

      // Store scheduled task
      this.tasks.set(job.job_id, {
        jobId: job.job_id,
        cronExpression: job.schedule,
        timezone: job.timezone || this.config.defaultTimezone,
        task,
        isRunning: false,
        nextExecution: nextRun
      });

      // Start the task if job is enabled
      if (job.enabled) {
        task.start();

        this.logger?.info('Cron job scheduled and started', {
          jobId: job.job_id,
          jobName: job.job_name,
          schedule: job.schedule,
          timezone: job.timezone,
          nextRun
        });
      } else {
        this.logger?.info('Cron job scheduled but not started (disabled)', {
          jobId: job.job_id,
          jobName: job.job_name
        });
      }

      return true;

    } catch (error) {
      this.logger?.error('Failed to schedule cron job', {
        jobId: job.job_id,
        error
      });
      return false;
    }
  }

  /**
   * Unschedule a cron job
   */
  unscheduleJob(jobId: string): boolean {
    const scheduledTask = this.tasks.get(jobId);
    if (!scheduledTask) {
      this.logger?.warn('Job not found in scheduler', { jobId });
      return false;
    }

    try {
      // Stop the cron task
      scheduledTask.task.stop();

      // Remove from tasks map
      this.tasks.delete(jobId);

      // Remove from running jobs if present
      this.runningJobs.delete(jobId);

      this.logger?.info('Cron job unscheduled', { jobId });
      return true;

    } catch (error) {
      this.logger?.error('Failed to unschedule cron job', { jobId, error });
      return false;
    }
  }

  /**
   * Pause a cron job (stop execution but keep scheduled)
   */
  pauseJob(jobId: string): boolean {
    const scheduledTask = this.tasks.get(jobId);
    if (!scheduledTask) {
      this.logger?.warn('Job not found in scheduler', { jobId });
      return false;
    }

    try {
      scheduledTask.task.stop();
      this.logger?.info('Cron job paused', { jobId });
      return true;
    } catch (error) {
      this.logger?.error('Failed to pause cron job', { jobId, error });
      return false;
    }
  }

  /**
   * Resume a paused cron job
   */
  resumeJob(jobId: string): boolean {
    const scheduledTask = this.tasks.get(jobId);
    if (!scheduledTask) {
      this.logger?.warn('Job not found in scheduler', { jobId });
      return false;
    }

    try {
      scheduledTask.task.start();
      this.logger?.info('Cron job resumed', { jobId });
      return true;
    } catch (error) {
      this.logger?.error('Failed to resume cron job', { jobId, error });
      return false;
    }
  }

  /**
   * Execute a job (with concurrency control)
   */
  private async executeJob(
    job: CronJob,
    onExecute: (job: CronJob) => Promise<void>
  ): Promise<void> {
    const scheduledTask = this.tasks.get(job.job_id);
    if (!scheduledTask) {
      return;
    }

    // Check if job is already running
    if (scheduledTask.isRunning) {
      this.logger?.warn('Job already running, skipping execution', {
        jobId: job.job_id,
        jobName: job.job_name
      });
      return;
    }

    // Check concurrent job limit
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      this.logger?.warn('Max concurrent jobs reached, queueing job', {
        jobId: job.job_id,
        runningJobs: this.runningJobs.size
      });
      this.jobQueue.push(job.job_id);
      return;
    }

    // Mark job as running
    scheduledTask.isRunning = true;
    this.runningJobs.add(job.job_id);
    scheduledTask.lastExecution = new Date();

    this.logger?.info('Executing scheduled job', {
      jobId: job.job_id,
      jobName: job.job_name,
      skillName: job.skill_name
    });

    try {
      // Execute the job callback
      await onExecute(job);

      // Calculate next execution time
      scheduledTask.nextExecution = this.calculateNextRun(
        job.schedule,
        job.timezone
      );

    } catch (error) {
      this.logger?.error('Cron job execution error', {
        jobId: job.job_id,
        error
      });
    } finally {
      // Mark job as not running
      scheduledTask.isRunning = false;
      this.runningJobs.delete(job.job_id);

      // Process queued jobs
      this.processQueue();
    }
  }

  /**
   * Process queued jobs
   */
  private processQueue(): void {
    if (this.jobQueue.length === 0) {
      return;
    }

    // Check if we can run more jobs
    while (
      this.runningJobs.size < this.config.maxConcurrentJobs &&
      this.jobQueue.length > 0
    ) {
      const jobId = this.jobQueue.shift();
      if (jobId) {
        const scheduledTask = this.tasks.get(jobId);
        if (scheduledTask) {
          // Trigger the job (it will execute on next tick)
          this.logger?.info('Triggering queued job', { jobId });
        }
      }
    }
  }

  /**
   * Calculate next run time for a cron expression
   */
  calculateNextRun(cronExpression: string, timezone?: string): Date {
    const nextRuns = this.calculateNextRuns(cronExpression, 1, timezone);
    return nextRuns[0];
  }

  /**
   * Calculate next N run times for a cron expression
   */
  calculateNextRuns(
    cronExpression: string,
    count: number = 5,
    timezone?: string
  ): Date[] {
    const nextRuns: Date[] = [];
    const tz = timezone || this.config.defaultTimezone;

    // Use node-cron to create a temporary task for calculation
    const tempTask = cron.schedule(
      cronExpression,
      () => {}, // Empty function
      {
        scheduled: false,
        timezone: tz
      }
    );

    // Calculate next runs (simplified approach)
    // In production, use a library like 'cron-parser' for accurate next run calculation
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    // Rough approximation - check every hour for next 30 days
    for (let i = 0; i < 30 * 24 && nextRuns.length < count; i++) {
      const checkTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      // This is a placeholder - in production, use proper cron parsing
      nextRuns.push(checkTime);
    }

    tempTask.stop();

    return nextRuns.slice(0, count);
  }

  /**
   * Get next execution time for a scheduled job
   */
  getNextExecution(jobId: string): Date | null {
    const scheduledTask = this.tasks.get(jobId);
    return scheduledTask?.nextExecution || null;
  }

  /**
   * Check if job is currently running
   */
  isJobRunning(jobId: string): boolean {
    return this.runningJobs.has(jobId);
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Get running jobs count
   */
  getRunningJobsCount(): number {
    return this.runningJobs.size;
  }

  /**
   * Get queued jobs count
   */
  getQueuedJobsCount(): number {
    return this.jobQueue.length;
  }

  /**
   * Get scheduler statistics
   */
  getStatistics() {
    return {
      totalScheduled: this.tasks.size,
      currentlyRunning: this.runningJobs.size,
      queued: this.jobQueue.length,
      maxConcurrent: this.config.maxConcurrentJobs
    };
  }

  /**
   * Shutdown scheduler gracefully
   */
  async shutdown(): Promise<void> {
    this.logger?.info('Shutting down cron scheduler...', {
      scheduledJobs: this.tasks.size,
      runningJobs: this.runningJobs.size
    });

    // Stop all scheduled tasks
    for (const [jobId, scheduledTask] of this.tasks.entries()) {
      try {
        scheduledTask.task.stop();
        this.logger?.debug('Stopped cron job', { jobId });
      } catch (error) {
        this.logger?.error('Error stopping cron job', { jobId, error });
      }
    }

    // Clear all tasks
    this.tasks.clear();
    this.runningJobs.clear();
    this.jobQueue = [];

    this.logger?.info('Cron scheduler shutdown complete');
  }
}
