/**
 * Skill Executor
 *
 * Central execution engine for all OpenClaw skills with progress tracking,
 * error handling, retry logic, and execution analytics.
 *
 * @module skills/skill-executor
 */

import {
  AgentSkill,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillProgress,
  Logger,
  DatabaseService
} from '../types';
import { SkillRegistry } from './skill-registry';

/**
 * Skill execution request
 */
export interface SkillExecutionRequest {
  skillName: string;
  params: any;
  userId: string;
  organizationId: string;
  sessionId?: string;
  onProgress?: (progress: SkillProgress) => void;
}

/**
 * Skill execution options
 */
export interface SkillExecutionOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  trackMetrics?: boolean;
}

/**
 * Skill Executor Class
 */
export class SkillExecutor {
  private registry: SkillRegistry;
  private database: DatabaseService | null = null;
  private logger: Logger | null = null;
  private isInitialized: boolean = false;

  // Execution metrics
  private metricsEnabled: boolean = true;
  private executionHistory: Map<string, number[]> = new Map();

  constructor() {
    this.registry = new SkillRegistry();
  }

  /**
   * Initialize the skill executor
   */
  async initialize(database: DatabaseService, logger: Logger): Promise<void> {
    this.database = database;
    this.logger = logger;

    this.logger.info('Initializing skill executor...');

    try {
      // Initialize skill registry
      await this.registry.initialize(logger);

      // Load execution metrics from database
      await this.loadMetrics();

      this.isInitialized = true;
      this.logger.info('Skill executor initialized successfully', {
        registeredSkills: this.registry.getRegisteredSkillNames().length
      });

    } catch (error) {
      this.logger.error('Failed to initialize skill executor', { error });
      throw error;
    }
  }

  /**
   * Execute a skill
   */
  async execute(
    request: SkillExecutionRequest,
    options: SkillExecutionOptions = {}
  ): Promise<SkillExecutionResult> {
    if (!this.isInitialized) {
      throw new Error('Skill executor not initialized');
    }

    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    this.logger?.info('Executing skill', {
      executionId,
      skillName: request.skillName,
      userId: request.userId,
      organizationId: request.organizationId
    });

    try {
      // Get skill from registry
      const skill = this.registry.getSkill(request.skillName);
      if (!skill) {
        throw new Error(`Skill not found: ${request.skillName}`);
      }

      // Validate input
      const validation = await skill.validate(request.params);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid skill parameters',
            details: validation.errors,
            retryable: false,
            timestamp: new Date()
          }
        };
      }

      // Report progress: Starting
      this.reportProgress(request.onProgress, {
        stage: 'starting',
        progress: 0,
        message: `Starting ${request.skillName}...`
      });

      // Create execution context
      const context: SkillExecutionContext = {
        userId: request.userId,
        organizationId: request.organizationId,
        sessionId: request.sessionId,
        tier: 'open_source', // TODO: Get from user profile
        onProgress: request.onProgress
      };

      // Execute with timeout and retry logic
      const result = await this.executeWithRetry(
        skill,
        request.params,
        context,
        options
      );

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      result.executionTime = executionTime;

      // Report progress: Completed
      this.reportProgress(request.onProgress, {
        stage: 'completed',
        progress: 100,
        message: `${request.skillName} completed successfully`
      });

      // Track metrics
      if (this.metricsEnabled && options.trackMetrics !== false) {
        await this.trackExecution(request.skillName, executionTime, result.success);
      }

      this.logger?.info('Skill execution completed', {
        executionId,
        skillName: request.skillName,
        success: result.success,
        executionTime
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger?.error('Skill execution failed', {
        executionId,
        skillName: request.skillName,
        error,
        executionTime
      });

      // Report progress: Error
      this.reportProgress(request.onProgress, {
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          retryable: true,
          timestamp: new Date()
        },
        executionTime
      };
    }
  }

  /**
   * Execute skill with retry logic
   */
  private async executeWithRetry(
    skill: AgentSkill,
    params: any,
    context: SkillExecutionContext,
    options: SkillExecutionOptions
  ): Promise<SkillExecutionResult> {
    const maxAttempts = options.retryAttempts || 3;
    const retryDelay = options.retryDelay || 1000;
    const timeout = options.timeout || 300000; // 5 minutes default

    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Wrap execution in timeout
        const result = await this.executeWithTimeout(
          skill,
          params,
          context,
          timeout
        );

        // If successful, return immediately
        if (result.success) {
          return result;
        }

        // If error is not retryable, return immediately
        if (result.error && !result.error.retryable) {
          return result;
        }

        lastError = result.error;

      } catch (error) {
        lastError = error;

        this.logger?.warn('Skill execution attempt failed', {
          skillName: skill.name,
          attempt,
          maxAttempts,
          error
        });
      }

      // If not last attempt, wait before retrying
      if (attempt < maxAttempts) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger?.info('Retrying skill execution', {
          skillName: skill.name,
          attempt: attempt + 1,
          delay
        });

        this.reportProgress(context.onProgress, {
          stage: 'retrying',
          progress: (attempt / maxAttempts) * 100,
          message: `Retrying (attempt ${attempt + 1}/${maxAttempts})...`
        });

        await this.sleep(delay);
      }
    }

    // All attempts failed
    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Skill execution failed after ${maxAttempts} attempts`,
        details: lastError,
        retryable: false,
        timestamp: new Date()
      }
    };
  }

  /**
   * Execute skill with timeout
   */
  private async executeWithTimeout(
    skill: AgentSkill,
    params: any,
    context: SkillExecutionContext,
    timeout: number
  ): Promise<SkillExecutionResult> {
    return Promise.race([
      skill.execute(params, context),
      this.createTimeoutPromise(timeout)
    ]);
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<SkillExecutionResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Skill execution timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ((progress: SkillProgress) => void) | undefined,
    progress: SkillProgress
  ): void {
    if (callback) {
      try {
        callback(progress);
      } catch (error) {
        this.logger?.warn('Error in progress callback', { error });
      }
    }
  }

  /**
   * Track skill execution metrics
   */
  private async trackExecution(
    skillName: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    try {
      // Update in-memory metrics
      if (!this.executionHistory.has(skillName)) {
        this.executionHistory.set(skillName, []);
      }
      this.executionHistory.get(skillName)?.push(executionTime);

      // Update registry statistics
      this.registry.recordExecution(skillName, success, executionTime);

      // Persist to database
      if (this.database) {
        await this.database.execute(
          `INSERT INTO skill_executions
           (skill_name, execution_time, success, timestamp)
           VALUES ($1, $2, $3, NOW())`,
          [skillName, executionTime, success]
        );
      }

    } catch (error) {
      this.logger?.error('Failed to track execution metrics', { error });
    }
  }

  /**
   * Load execution metrics from database
   */
  private async loadMetrics(): Promise<void> {
    if (!this.database) {
      return;
    }

    try {
      const results = await this.database.query<{
        skill_name: string;
        total_executions: number;
        success_count: number;
        avg_duration: number;
      }>(
        `SELECT
          skill_name,
          COUNT(*) as total_executions,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
          AVG(execution_time) as avg_duration
         FROM skill_executions
         WHERE timestamp > NOW() - INTERVAL '30 days'
         GROUP BY skill_name`
      );

      results.forEach(row => {
        const successRate = row.success_count / row.total_executions;
        this.registry.updateStatistics(row.skill_name, {
          totalExecutions: row.total_executions,
          successRate,
          averageDuration: row.avg_duration
        });
      });

      this.logger?.info('Loaded execution metrics', {
        skillsWithMetrics: results.length
      });

    } catch (error) {
      this.logger?.warn('Failed to load execution metrics', { error });
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get skill registry
   */
  getRegistry(): SkillRegistry {
    return this.registry;
  }

  /**
   * Get execution history for a skill
   */
  getExecutionHistory(skillName: string): number[] {
    return this.executionHistory.get(skillName) || [];
  }

  /**
   * Get execution statistics
   */
  getStatistics(skillName?: string): any {
    if (skillName) {
      return this.registry.getSkillStatistics(skillName);
    }
    return this.registry.getAllStatistics();
  }

  /**
   * Enable or disable metrics tracking
   */
  setMetricsEnabled(enabled: boolean): void {
    this.metricsEnabled = enabled;
    this.logger?.info('Metrics tracking', { enabled });
  }

  /**
   * Check if executor is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
