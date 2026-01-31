/**
 * Cron Job Manager
 *
 * Handles CRUD operations for cron jobs including creation, updating,
 * deletion, and lifecycle management.
 *
 * Features:
 * - Create cron job with validation
 * - Update cron job and reschedule
 * - Delete cron job and unregister from scheduler
 * - Enable/disable jobs dynamically
 * - List jobs with filtering and pagination
 * - Integration with scheduler and executor
 *
 * @module cron/cron-manager
 */

import {
  CronJob,
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronJobListQuery,
  CronJobStats,
  CronManagerConfig
} from '../types/cron.types';
import { CronScheduler } from './cron-scheduler';
import { CronExecutor } from './cron-executor';
import { Logger, DatabaseService } from '../types';

/**
 * Cron Manager Class
 * Manages cron job lifecycle and database operations
 */
export class CronManager {
  private scheduler: CronScheduler;
  private executor: CronExecutor;
  private database: DatabaseService | null = null;
  private logger: Logger | null = null;
  private isInitialized: boolean = false;

  constructor(scheduler: CronScheduler, executor: CronExecutor) {
    this.scheduler = scheduler;
    this.executor = executor;
  }

  /**
   * Initialize the manager
   */
  async initialize(database: DatabaseService, logger: Logger): Promise<void> {
    this.database = database;
    this.logger = logger;

    this.logger.info('Initializing cron manager...');

    try {
      // Load and schedule all active jobs
      await this.loadActiveJobs();

      this.isInitialized = true;
      this.logger.info('Cron manager initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize cron manager', { error });
      throw error;
    }
  }

  /**
   * Create a new cron job
   */
  async createCronJob(request: CreateCronJobRequest): Promise<CronJob> {
    if (!this.isInitialized || !this.database) {
      throw new Error('Manager not initialized');
    }

    this.logger?.info('Creating cron job', {
      jobName: request.jobName,
      skillName: request.skillName,
      schedule: request.schedule
    });

    // Validate cron expression
    const validation = this.scheduler.validateCronExpression(request.schedule);
    if (!validation.valid) {
      throw new Error(`Invalid cron expression: ${validation.errors?.join(', ')}`);
    }

    // Calculate next run time
    const nextRun = this.scheduler.calculateNextRun(
      request.schedule,
      request.timezone || 'UTC'
    );

    // Insert into database
    const result = await this.database.query<CronJob>(
      `INSERT INTO openclaw.cron_jobs (
        user_id,
        organization_id,
        job_name,
        description,
        schedule,
        timezone,
        skill_name,
        skill_params,
        enabled,
        next_run,
        max_retries,
        timeout_seconds,
        run_count,
        success_count,
        failure_count,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, 0, 0, NOW(), NOW()
      ) RETURNING *`,
      [
        request.userId,
        request.organizationId,
        request.jobName,
        request.description || null,
        request.schedule,
        request.timezone || 'UTC',
        request.skillName,
        JSON.stringify(request.skillParams || {}),
        true, // Enabled by default
        nextRun,
        request.maxRetries || 3,
        request.timeoutSeconds || 300
      ]
    );

    const job = result[0];

    // Schedule the job
    const scheduled = this.scheduler.scheduleJob(job, async (scheduledJob) => {
      await this.executeScheduledJob(scheduledJob);
    });

    if (!scheduled) {
      throw new Error('Failed to schedule cron job');
    }

    this.logger?.info('Cron job created successfully', {
      jobId: job.job_id,
      jobName: job.job_name,
      nextRun: job.next_run
    });

    return job;
  }

  /**
   * Get a cron job by ID
   */
  async getCronJob(jobId: string, organizationId: string): Promise<CronJob | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<CronJob>(
      `SELECT * FROM openclaw.cron_jobs
       WHERE job_id = $1
         AND organization_id = $2
         AND deleted_at IS NULL`,
      [jobId, organizationId]
    );

    return result[0] || null;
  }

  /**
   * Update a cron job
   */
  async updateCronJob(
    jobId: string,
    organizationId: string,
    updates: UpdateCronJobRequest
  ): Promise<CronJob> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    this.logger?.info('Updating cron job', { jobId, updates });

    // Get existing job
    const existingJob = await this.getCronJob(jobId, organizationId);
    if (!existingJob) {
      throw new Error('Cron job not found');
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.jobName !== undefined) {
      updateFields.push(`job_name = $${paramIndex++}`);
      updateValues.push(updates.jobName);
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updates.description);
    }

    if (updates.schedule !== undefined) {
      // Validate new schedule
      const validation = this.scheduler.validateCronExpression(updates.schedule);
      if (!validation.valid) {
        throw new Error(`Invalid cron expression: ${validation.errors?.join(', ')}`);
      }

      updateFields.push(`schedule = $${paramIndex++}`);
      updateValues.push(updates.schedule);

      // Calculate new next run
      const nextRun = this.scheduler.calculateNextRun(
        updates.schedule,
        updates.timezone || existingJob.timezone
      );
      updateFields.push(`next_run = $${paramIndex++}`);
      updateValues.push(nextRun);
    }

    if (updates.timezone !== undefined) {
      updateFields.push(`timezone = $${paramIndex++}`);
      updateValues.push(updates.timezone);
    }

    if (updates.skillParams !== undefined) {
      updateFields.push(`skill_params = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.skillParams));
    }

    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramIndex++}`);
      updateValues.push(updates.enabled);
    }

    if (updates.pausedReason !== undefined) {
      updateFields.push(`paused_reason = $${paramIndex++}`);
      updateValues.push(updates.pausedReason);
    }

    if (updates.maxRetries !== undefined) {
      updateFields.push(`max_retries = $${paramIndex++}`);
      updateValues.push(updates.maxRetries);
    }

    if (updates.timeoutSeconds !== undefined) {
      updateFields.push(`timeout_seconds = $${paramIndex++}`);
      updateValues.push(updates.timeoutSeconds);
    }

    if (updateFields.length === 0) {
      return existingJob; // No updates
    }

    // Add updated_at
    updateFields.push(`updated_at = NOW()`);

    // Add WHERE clause parameters
    updateValues.push(jobId, organizationId);

    // Execute update
    const result = await this.database.query<CronJob>(
      `UPDATE openclaw.cron_jobs
       SET ${updateFields.join(', ')}
       WHERE job_id = $${paramIndex++}
         AND organization_id = $${paramIndex++}
         AND deleted_at IS NULL
       RETURNING *`,
      updateValues
    );

    const updatedJob = result[0];

    // Reschedule if schedule changed or enabled state changed
    if (updates.schedule !== undefined || updates.enabled !== undefined) {
      // Unschedule old job
      this.scheduler.unscheduleJob(jobId);

      // Schedule new job if enabled
      if (updatedJob.enabled) {
        this.scheduler.scheduleJob(updatedJob, async (scheduledJob) => {
          await this.executeScheduledJob(scheduledJob);
        });
      }
    }

    this.logger?.info('Cron job updated successfully', {
      jobId: updatedJob.job_id,
      updates
    });

    return updatedJob;
  }

  /**
   * Delete a cron job (soft delete)
   */
  async deleteCronJob(jobId: string, organizationId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    this.logger?.info('Deleting cron job', { jobId });

    // Soft delete in database
    await this.database.execute(
      `UPDATE openclaw.cron_jobs
       SET deleted_at = NOW(),
           enabled = false
       WHERE job_id = $1
         AND organization_id = $2`,
      [jobId, organizationId]
    );

    // Unschedule from scheduler
    this.scheduler.unscheduleJob(jobId);

    this.logger?.info('Cron job deleted successfully', { jobId });
  }

  /**
   * Enable a cron job
   */
  async enableCronJob(jobId: string, organizationId: string): Promise<CronJob> {
    return await this.updateCronJob(jobId, organizationId, { enabled: true });
  }

  /**
   * Disable a cron job
   */
  async disableCronJob(
    jobId: string,
    organizationId: string,
    reason?: string
  ): Promise<CronJob> {
    return await this.updateCronJob(jobId, organizationId, {
      enabled: false,
      pausedReason: reason
    });
  }

  /**
   * List cron jobs with filtering and pagination
   */
  async listCronJobs(query: CronJobListQuery): Promise<{
    jobs: CronJob[];
    total: number;
    limit: number;
    offset: number;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'desc';

    // Build WHERE clause
    const whereConditions: string[] = ['deleted_at IS NULL'];
    const whereValues: any[] = [];
    let paramIndex = 1;

    whereConditions.push(`organization_id = $${paramIndex++}`);
    whereValues.push(query.organizationId);

    if (query.userId) {
      whereConditions.push(`user_id = $${paramIndex++}`);
      whereValues.push(query.userId);
    }

    if (query.enabled !== undefined) {
      whereConditions.push(`enabled = $${paramIndex++}`);
      whereValues.push(query.enabled);
    }

    if (query.skillName) {
      whereConditions.push(`skill_name = $${paramIndex++}`);
      whereValues.push(query.skillName);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await this.database.query<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM openclaw.cron_jobs
       WHERE ${whereClause}`,
      whereValues
    );

    const total = countResult[0].count;

    // Get jobs
    const jobs = await this.database.query<CronJob>(
      `SELECT *
       FROM openclaw.cron_jobs
       WHERE ${whereClause}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIndex++}
       OFFSET $${paramIndex++}`,
      [...whereValues, limit, offset]
    );

    return {
      jobs,
      total,
      limit,
      offset
    };
  }

  /**
   * Get cron job statistics
   */
  async getCronJobStats(jobId: string, organizationId: string): Promise<CronJobStats | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<any>(
      `SELECT
        job_id,
        job_name,
        run_count as total_runs,
        success_count as successful_runs,
        failure_count as failed_runs,
        CASE
          WHEN run_count = 0 THEN 0
          ELSE (success_count::FLOAT / run_count)
        END as success_rate,
        last_run,
        next_run
       FROM openclaw.cron_jobs
       WHERE job_id = $1
         AND organization_id = $2
         AND deleted_at IS NULL`,
      [jobId, organizationId]
    );

    if (!result[0]) {
      return null;
    }

    const job = result[0];

    // Get average duration from executions
    const avgResult = await this.database.query<{ avg_duration: number }>(
      `SELECT AVG(execution_time_ms) as avg_duration
       FROM openclaw.skill_executions
       WHERE skill_name IN (
         SELECT skill_name FROM openclaw.cron_jobs WHERE job_id = $1
       )
       AND status = 'completed'`,
      [jobId]
    );

    const avgDuration = avgResult[0]?.avg_duration || 0;

    // Calculate health status
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'never_run' = 'never_run';
    if (job.total_runs > 0) {
      if (job.success_rate >= 0.95) {
        healthStatus = 'healthy';
      } else if (job.success_rate >= 0.80) {
        healthStatus = 'degraded';
      } else {
        healthStatus = 'unhealthy';
      }
    }

    return {
      job_id: job.job_id,
      job_name: job.job_name,
      total_runs: job.total_runs,
      successful_runs: job.successful_runs,
      failed_runs: job.failed_runs,
      success_rate: job.success_rate,
      average_duration_ms: avgDuration,
      last_run: job.last_run,
      next_run: job.next_run,
      health_status: healthStatus
    };
  }

  /**
   * Manually trigger a cron job execution
   */
  async triggerManualRun(jobId: string, organizationId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const job = await this.getCronJob(jobId, organizationId);
    if (!job) {
      throw new Error('Cron job not found');
    }

    this.logger?.info('Manually triggering cron job', {
      jobId: job.job_id,
      jobName: job.job_name
    });

    // Execute immediately (not waiting for result)
    this.executeScheduledJob(job).catch(error => {
      this.logger?.error('Manual cron job execution failed', {
        jobId,
        error
      });
    });
  }

  /**
   * Execute a scheduled job (called by scheduler)
   */
  private async executeScheduledJob(job: CronJob): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger?.info('Executing scheduled job', {
        jobId: job.job_id,
        jobName: job.job_name
      });

      // Execute via executor
      const result = await this.executor.executeJob(job);

      const executionTime = Date.now() - startTime;

      // Update job statistics in database
      if (result.success) {
        await this.updateJobAfterSuccess(job, executionTime);
      } else {
        await this.updateJobAfterFailure(job, executionTime, result.error);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger?.error('Scheduled job execution error', {
        jobId: job.job_id,
        error
      });

      await this.updateJobAfterFailure(job, executionTime, {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXECUTION_ERROR'
      });
    }
  }

  /**
   * Update job after successful execution
   */
  private async updateJobAfterSuccess(job: CronJob, executionTimeMs: number): Promise<void> {
    if (!this.database) {
      return;
    }

    const nextRun = this.scheduler.calculateNextRun(job.schedule, job.timezone);

    await this.database.execute(
      `UPDATE openclaw.cron_jobs
       SET last_run = NOW(),
           last_status = 'success',
           last_error = NULL,
           next_run = $1,
           run_count = run_count + 1,
           success_count = success_count + 1
       WHERE job_id = $2`,
      [nextRun, job.job_id]
    );
  }

  /**
   * Update job after failed execution
   */
  private async updateJobAfterFailure(
    job: CronJob,
    executionTimeMs: number,
    error?: { message: string; code: string }
  ): Promise<void> {
    if (!this.database) {
      return;
    }

    const nextRun = this.scheduler.calculateNextRun(job.schedule, job.timezone);

    await this.database.execute(
      `UPDATE openclaw.cron_jobs
       SET last_run = NOW(),
           last_status = 'failed',
           last_error = $1,
           next_run = $2,
           run_count = run_count + 1,
           failure_count = failure_count + 1
       WHERE job_id = $3`,
      [error?.message || 'Unknown error', nextRun, job.job_id]
    );
  }

  /**
   * Load all active jobs on startup
   */
  private async loadActiveJobs(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    this.logger?.info('Loading active cron jobs from database...');

    const jobs = await this.database.query<CronJob>(
      `SELECT * FROM openclaw.cron_jobs
       WHERE enabled = true
         AND deleted_at IS NULL
       ORDER BY created_at ASC`
    );

    this.logger?.info(`Found ${jobs.length} active cron jobs to schedule`);

    for (const job of jobs) {
      try {
        const scheduled = this.scheduler.scheduleJob(job, async (scheduledJob) => {
          await this.executeScheduledJob(scheduledJob);
        });

        if (scheduled) {
          this.logger?.info('Loaded and scheduled cron job', {
            jobId: job.job_id,
            jobName: job.job_name,
            nextRun: job.next_run
          });
        }
      } catch (error) {
        this.logger?.error('Failed to schedule cron job on startup', {
          jobId: job.job_id,
          error
        });
      }
    }
  }

  /**
   * Shutdown manager gracefully
   */
  async shutdown(): Promise<void> {
    this.logger?.info('Shutting down cron manager...');
    await this.scheduler.shutdown();
  }
}
