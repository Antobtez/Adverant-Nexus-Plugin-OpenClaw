/**
 * Cron Job Executor
 *
 * Handles execution of scheduled cron jobs including retry logic,
 * timeout handling, progress tracking, and result storage.
 *
 * Features:
 * - Execute scheduled skills with proper context
 * - Retry logic for failed jobs (max 3 retries with exponential backoff)
 * - Timeout handling (default 5 minutes)
 * - Progress tracking and WebSocket events
 * - Result storage in database
 *
 * @module cron/cron-executor
 */

import {
  CronJob,
  CronExecution,
  CronExecutionStatus,
  CronJobContext
} from '../types/cron.types';
import { SkillExecutor, SkillExecutionRequest } from '../skills/skill-executor';
import { Logger, DatabaseService } from '../types';

/**
 * Execution result
 */
interface ExecutionResult {
  success: boolean;
  executionTimeMs: number;
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
  result?: any;
}

/**
 * Cron Executor Class
 * Executes scheduled cron jobs with retry and timeout logic
 */
export class CronExecutor {
  private skillExecutor: SkillExecutor;
  private database: DatabaseService | null = null;
  private logger: Logger | null = null;
  private isInitialized: boolean = false;

  // Event callbacks
  private onJobStarted: ((jobId: string, context: CronJobContext) => void) | null = null;
  private onJobCompleted: ((jobId: string, result: ExecutionResult) => void) | null = null;
  private onJobFailed: ((jobId: string, error: any) => void) | null = null;

  // Execution tracking
  private activeExecutions: Map<string, CronJobContext> = new Map();

  constructor(skillExecutor: SkillExecutor) {
    this.skillExecutor = skillExecutor;
  }

  /**
   * Initialize the executor
   */
  initialize(database: DatabaseService, logger: Logger): void {
    this.database = database;
    this.logger = logger;
    this.isInitialized = true;

    this.logger.info('Cron executor initialized');
  }

  /**
   * Execute a cron job
   */
  async executeJob(job: CronJob): Promise<ExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Executor not initialized');
    }

    const context: CronJobContext = {
      jobId: job.job_id,
      jobName: job.job_name,
      organizationId: job.organization_id,
      userId: job.user_id,
      scheduledTime: new Date(),
      actualStartTime: new Date(),
      retryAttempt: 0,
      maxRetries: job.max_retries,
      timeoutSeconds: job.timeout_seconds
    };

    // Mark execution as active
    this.activeExecutions.set(job.job_id, context);

    // Create execution record
    const executionId = await this.createExecutionRecord(job, context);

    this.logger?.info('Starting cron job execution', {
      jobId: job.job_id,
      jobName: job.job_name,
      skillName: job.skill_name,
      executionId
    });

    // Emit job started event
    if (this.onJobStarted) {
      this.onJobStarted(job.job_id, context);
    }

    try {
      // Execute with retry logic
      const result = await this.executeWithRetry(job, context, executionId);

      // Update execution record with result
      await this.updateExecutionRecord(
        executionId,
        CronExecutionStatus.COMPLETED,
        result
      );

      // Emit job completed event
      if (this.onJobCompleted) {
        this.onJobCompleted(job.job_id, result);
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - context.actualStartTime.getTime();
      const errorResult: ExecutionResult = {
        success: false,
        executionTimeMs: executionTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_ERROR',
          stack: error instanceof Error ? error.stack : undefined
        }
      };

      // Update execution record with error
      await this.updateExecutionRecord(
        executionId,
        CronExecutionStatus.FAILED,
        errorResult
      );

      // Emit job failed event
      if (this.onJobFailed) {
        this.onJobFailed(job.job_id, error);
      }

      this.logger?.error('Cron job execution failed', {
        jobId: job.job_id,
        executionId,
        error
      });

      return errorResult;

    } finally {
      // Remove from active executions
      this.activeExecutions.delete(job.job_id);
    }
  }

  /**
   * Execute job with retry logic
   */
  private async executeWithRetry(
    job: CronJob,
    context: CronJobContext,
    executionId: string
  ): Promise<ExecutionResult> {
    let lastError: any;
    const maxAttempts = job.max_retries + 1; // Include initial attempt

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      context.retryAttempt = attempt;

      try {
        this.logger?.info('Executing cron job', {
          jobId: job.job_id,
          attempt: attempt + 1,
          maxAttempts
        });

        // Execute with timeout
        const result = await this.executeWithTimeout(job, context, executionId);

        if (result.success) {
          if (attempt > 0) {
            this.logger?.info('Cron job succeeded after retry', {
              jobId: job.job_id,
              attempt: attempt + 1
            });
          }
          return result;
        }

        lastError = result.error;

      } catch (error) {
        lastError = error;

        this.logger?.warn('Cron job execution attempt failed', {
          jobId: job.job_id,
          attempt: attempt + 1,
          maxAttempts,
          error
        });

        // Update retry count in execution record
        await this.database?.execute(
          `UPDATE openclaw.skill_executions
           SET retry_count = $1
           WHERE execution_id = $2`,
          [attempt + 1, executionId]
        );
      }

      // If not last attempt, wait before retrying (exponential backoff)
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30s
        this.logger?.info('Retrying cron job after delay', {
          jobId: job.job_id,
          attempt: attempt + 2,
          delayMs: delay
        });
        await this.sleep(delay);
      }
    }

    // All attempts failed
    const executionTime = Date.now() - context.actualStartTime.getTime();
    return {
      success: false,
      executionTimeMs: executionTime,
      error: {
        message: `Job failed after ${maxAttempts} attempts`,
        code: 'MAX_RETRIES_EXCEEDED',
        stack: lastError instanceof Error ? lastError.stack : undefined
      }
    };
  }

  /**
   * Execute job with timeout
   */
  private async executeWithTimeout(
    job: CronJob,
    context: CronJobContext,
    executionId: string
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeoutMs = job.timeout_seconds * 1000;

    try {
      // Execute skill
      const skillResult = await Promise.race([
        this.executeSkill(job, context),
        this.createTimeoutPromise(timeoutMs, job.job_id)
      ]);

      const executionTime = Date.now() - startTime;

      if (skillResult.success) {
        return {
          success: true,
          executionTimeMs: executionTime,
          result: skillResult.data
        };
      } else {
        return {
          success: false,
          executionTimeMs: executionTime,
          error: {
            message: skillResult.error?.message || 'Skill execution failed',
            code: skillResult.error?.code || 'SKILL_ERROR',
            stack: skillResult.error?.details
          }
        };
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof Error && error.message.includes('timeout')) {
        // Update execution record as timeout
        await this.updateExecutionRecord(
          executionId,
          CronExecutionStatus.TIMEOUT,
          {
            success: false,
            executionTimeMs: executionTime,
            error: {
              message: `Job execution timeout after ${job.timeout_seconds}s`,
              code: 'TIMEOUT'
            }
          }
        );

        throw new Error(`Job execution timeout after ${job.timeout_seconds}s`);
      }

      throw error;
    }
  }

  /**
   * Execute the skill associated with the job
   */
  private async executeSkill(job: CronJob, context: CronJobContext): Promise<any> {
    const request: SkillExecutionRequest = {
      skillName: job.skill_name,
      params: job.skill_params || {},
      userId: job.user_id,
      organizationId: job.organization_id,
      sessionId: undefined // Cron jobs don't have sessions
    };

    return await this.skillExecutor.execute(request, {
      timeout: job.timeout_seconds * 1000,
      retryAttempts: 0, // Retries handled at job level
      trackMetrics: true
    });
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number, jobId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Job ${jobId} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Create execution record in database
   */
  private async createExecutionRecord(
    job: CronJob,
    context: CronJobContext
  ): Promise<string> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<{ execution_id: string }>(
      `INSERT INTO openclaw.skill_executions (
        session_id,
        organization_id,
        skill_name,
        skill_version,
        skill_category,
        input_params,
        status,
        retry_count,
        started_at
      ) VALUES (
        NULL,
        $1,
        $2,
        '1.0.0',
        'automation',
        $3,
        $4,
        0,
        NOW()
      ) RETURNING execution_id`,
      [
        job.organization_id,
        job.skill_name,
        JSON.stringify(job.skill_params || {}),
        CronExecutionStatus.RUNNING
      ]
    );

    return result[0].execution_id;
  }

  /**
   * Update execution record with result
   */
  private async updateExecutionRecord(
    executionId: string,
    status: CronExecutionStatus,
    result: ExecutionResult
  ): Promise<void> {
    if (!this.database) {
      return;
    }

    await this.database.execute(
      `UPDATE openclaw.skill_executions
       SET status = $1,
           execution_time_ms = $2,
           output_result = $3,
           error_message = $4,
           error_code = $5,
           error_stack = $6,
           completed_at = NOW()
       WHERE execution_id = $7`,
      [
        status,
        result.executionTimeMs,
        JSON.stringify(result.result || {}),
        result.error?.message || null,
        result.error?.code || null,
        result.error?.stack || null,
        executionId
      ]
    );
  }

  /**
   * Set event callbacks
   */
  setEventCallbacks(callbacks: {
    onJobStarted?: (jobId: string, context: CronJobContext) => void;
    onJobCompleted?: (jobId: string, result: ExecutionResult) => void;
    onJobFailed?: (jobId: string, error: any) => void;
  }): void {
    this.onJobStarted = callbacks.onJobStarted || null;
    this.onJobCompleted = callbacks.onJobCompleted || null;
    this.onJobFailed = callbacks.onJobFailed || null;
  }

  /**
   * Check if job is currently executing
   */
  isJobExecuting(jobId: string): boolean {
    return this.activeExecutions.has(jobId);
  }

  /**
   * Get active execution context
   */
  getActiveExecution(jobId: string): CronJobContext | null {
    return this.activeExecutions.get(jobId) || null;
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): CronJobContext[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
