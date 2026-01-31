/**
 * Cron Execution History Tracker
 *
 * Tracks and queries cron job execution history with pagination,
 * filtering, and statistical analysis.
 *
 * Features:
 * - Record all job executions
 * - Store success/failure status
 * - Log execution duration and errors
 * - Query execution history with filters
 * - Pagination support
 * - Execution statistics and analytics
 *
 * @module cron/cron-history
 */

import {
  CronExecution,
  CronExecutionStatus,
  CronExecutionHistoryQuery,
  CronJobStats
} from '../types/cron.types';
import { Logger, DatabaseService } from '../types';

/**
 * Execution summary
 */
interface ExecutionSummary {
  total: number;
  successful: number;
  failed: number;
  timeout: number;
  skipped: number;
  successRate: number;
  averageDuration: number;
}

/**
 * Cron History Class
 * Manages execution history and analytics
 */
export class CronHistory {
  private database: DatabaseService | null = null;
  private logger: Logger | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the history tracker
   */
  initialize(database: DatabaseService, logger: Logger): void {
    this.database = database;
    this.logger = logger;
    this.isInitialized = true;

    this.logger.info('Cron history tracker initialized');
  }

  /**
   * Get execution history for a job
   */
  async getExecutionHistory(
    query: CronExecutionHistoryQuery
  ): Promise<{
    executions: CronExecution[];
    total: number;
    limit: number;
    offset: number;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Build WHERE clause
    const whereConditions: string[] = [];
    const whereValues: any[] = [];
    let paramIndex = 1;

    // Organization ID is required
    whereConditions.push(`organization_id = $${paramIndex++}`);
    whereValues.push(query.organizationId);

    // Optional job ID filter
    if (query.jobId) {
      whereConditions.push(`execution_id IN (
        SELECT execution_id FROM openclaw.skill_executions se
        INNER JOIN openclaw.cron_jobs cj ON se.skill_name = cj.skill_name
        WHERE cj.job_id = $${paramIndex++}
      )`);
      whereValues.push(query.jobId);
    }

    // Optional status filter
    if (query.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      whereValues.push(query.status);
    }

    // Optional date range filters
    if (query.startDate) {
      whereConditions.push(`started_at >= $${paramIndex++}`);
      whereValues.push(query.startDate);
    }

    if (query.endDate) {
      whereConditions.push(`started_at <= $${paramIndex++}`);
      whereValues.push(query.endDate);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await this.database.query<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM openclaw.skill_executions
       ${whereClause}`,
      whereValues
    );

    const total = countResult[0].count;

    // Get executions
    const executions = await this.database.query<any>(
      `SELECT
        execution_id,
        session_id::TEXT as job_id,
        organization_id,
        skill_name,
        input_params as skill_params,
        status,
        started_at,
        completed_at,
        execution_time_ms,
        error_message,
        error_code,
        error_stack,
        retry_count,
        output_result as result
       FROM openclaw.skill_executions
       ${whereClause}
       ORDER BY started_at DESC
       LIMIT $${paramIndex++}
       OFFSET $${paramIndex++}`,
      [...whereValues, limit, offset]
    );

    return {
      executions: executions.map(this.mapExecutionRecord),
      total,
      limit,
      offset
    };
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<CronExecution | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<any>(
      `SELECT
        execution_id,
        session_id::TEXT as job_id,
        organization_id,
        skill_name,
        input_params as skill_params,
        status,
        started_at,
        completed_at,
        execution_time_ms,
        error_message,
        error_code,
        error_stack,
        retry_count,
        output_result as result
       FROM openclaw.skill_executions
       WHERE execution_id = $1`,
      [executionId]
    );

    if (!result[0]) {
      return null;
    }

    return this.mapExecutionRecord(result[0]);
  }

  /**
   * Get execution summary for a job
   */
  async getExecutionSummary(
    jobId: string,
    organizationId: string,
    days: number = 30
  ): Promise<ExecutionSummary> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<any>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'timeout') as timeout,
        COUNT(*) FILTER (WHERE status = 'skipped') as skipped,
        AVG(execution_time_ms) FILTER (WHERE status = 'completed') as avg_duration
       FROM openclaw.skill_executions se
       INNER JOIN openclaw.cron_jobs cj ON se.skill_name = cj.skill_name
       WHERE cj.job_id = $1
         AND se.organization_id = $2
         AND se.started_at > NOW() - ($3 || ' days')::INTERVAL`,
      [jobId, organizationId, days]
    );

    const row = result[0];
    const total = parseInt(row.total) || 0;
    const successful = parseInt(row.successful) || 0;
    const successRate = total > 0 ? successful / total : 0;

    return {
      total,
      successful,
      failed: parseInt(row.failed) || 0,
      timeout: parseInt(row.timeout) || 0,
      skipped: parseInt(row.skipped) || 0,
      successRate,
      averageDuration: parseFloat(row.avg_duration) || 0
    };
  }

  /**
   * Get recent executions for a job
   */
  async getRecentExecutions(
    jobId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<CronExecution[]> {
    const result = await this.getExecutionHistory({
      jobId,
      organizationId,
      limit,
      offset: 0
    });

    return result.executions;
  }

  /**
   * Get failed executions for a job
   */
  async getFailedExecutions(
    jobId: string,
    organizationId: string,
    limit: number = 50
  ): Promise<CronExecution[]> {
    const result = await this.getExecutionHistory({
      jobId,
      organizationId,
      status: CronExecutionStatus.FAILED,
      limit,
      offset: 0
    });

    return result.executions;
  }

  /**
   * Get execution statistics for all jobs in an organization
   */
  async getOrganizationStats(
    organizationId: string,
    days: number = 30
  ): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    jobStats: Array<{
      jobId: string;
      jobName: string;
      executions: number;
      successRate: number;
    }>;
  }> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    // Get overall stats
    const overallResult = await this.database.query<any>(
      `SELECT
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
        AVG(execution_time_ms) FILTER (WHERE status = 'completed') as avg_duration
       FROM openclaw.skill_executions
       WHERE organization_id = $1
         AND started_at > NOW() - ($2 || ' days')::INTERVAL`,
      [organizationId, days]
    );

    const overall = overallResult[0];

    // Get per-job stats
    const jobStatsResult = await this.database.query<any>(
      `SELECT
        cj.job_id,
        cj.job_name,
        COUNT(*) as executions,
        COUNT(*) FILTER (WHERE se.status = 'completed')::FLOAT / COUNT(*) as success_rate
       FROM openclaw.skill_executions se
       INNER JOIN openclaw.cron_jobs cj ON se.skill_name = cj.skill_name
       WHERE se.organization_id = $1
         AND se.started_at > NOW() - ($2 || ' days')::INTERVAL
       GROUP BY cj.job_id, cj.job_name
       ORDER BY executions DESC`,
      [organizationId, days]
    );

    return {
      totalExecutions: parseInt(overall.total_executions) || 0,
      successfulExecutions: parseInt(overall.successful_executions) || 0,
      failedExecutions: parseInt(overall.failed_executions) || 0,
      averageDuration: parseFloat(overall.avg_duration) || 0,
      jobStats: jobStatsResult.map(row => ({
        jobId: row.job_id,
        jobName: row.job_name,
        executions: parseInt(row.executions),
        successRate: parseFloat(row.success_rate)
      }))
    };
  }

  /**
   * Delete old execution records (cleanup)
   */
  async cleanupOldExecutions(daysToKeep: number = 90): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    this.logger?.info('Cleaning up old execution records', { daysToKeep });

    const result = await this.database.query<{ count: number }>(
      `WITH deleted AS (
        DELETE FROM openclaw.skill_executions
        WHERE started_at < NOW() - ($1 || ' days')::INTERVAL
          AND status IN ('completed', 'failed')
        RETURNING execution_id
      )
      SELECT COUNT(*) as count FROM deleted`,
      [daysToKeep]
    );

    const deletedCount = result[0].count;

    this.logger?.info('Cleaned up execution records', {
      deletedCount,
      daysToKeep
    });

    return deletedCount;
  }

  /**
   * Get execution timeline (hourly buckets)
   */
  async getExecutionTimeline(
    jobId: string,
    organizationId: string,
    hours: number = 24
  ): Promise<Array<{
    hour: Date;
    executions: number;
    successful: number;
    failed: number;
  }>> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    const result = await this.database.query<any>(
      `SELECT
        date_trunc('hour', se.started_at) as hour,
        COUNT(*) as executions,
        COUNT(*) FILTER (WHERE se.status = 'completed') as successful,
        COUNT(*) FILTER (WHERE se.status = 'failed') as failed
       FROM openclaw.skill_executions se
       INNER JOIN openclaw.cron_jobs cj ON se.skill_name = cj.skill_name
       WHERE cj.job_id = $1
         AND se.organization_id = $2
         AND se.started_at > NOW() - ($3 || ' hours')::INTERVAL
       GROUP BY date_trunc('hour', se.started_at)
       ORDER BY hour ASC`,
      [jobId, organizationId, hours]
    );

    return result.map(row => ({
      hour: row.hour,
      executions: parseInt(row.executions),
      successful: parseInt(row.successful),
      failed: parseInt(row.failed)
    }));
  }

  /**
   * Map database record to CronExecution
   */
  private mapExecutionRecord(record: any): CronExecution {
    return {
      execution_id: record.execution_id,
      job_id: record.job_id,
      organization_id: record.organization_id,
      skill_name: record.skill_name,
      skill_params: typeof record.skill_params === 'string'
        ? JSON.parse(record.skill_params)
        : record.skill_params,
      status: record.status as CronExecutionStatus,
      started_at: record.started_at,
      completed_at: record.completed_at,
      execution_time_ms: record.execution_time_ms,
      error_message: record.error_message,
      error_code: record.error_code,
      error_stack: record.error_stack,
      retry_count: record.retry_count,
      result: typeof record.result === 'string'
        ? JSON.parse(record.result)
        : record.result
    };
  }
}
