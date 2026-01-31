/**
 * Cron Job API Routes
 *
 * RESTful API endpoints for cron job management including CRUD operations,
 * manual execution, and history queries.
 *
 * Endpoints:
 * - POST   /openclaw/api/v1/cron          - Create cron job
 * - GET    /openclaw/api/v1/cron          - List cron jobs
 * - GET    /openclaw/api/v1/cron/:id      - Get cron job details
 * - PUT    /openclaw/api/v1/cron/:id      - Update cron job
 * - DELETE /openclaw/api/v1/cron/:id      - Delete cron job
 * - POST   /openclaw/api/v1/cron/:id/run  - Trigger manual run
 * - GET    /openclaw/api/v1/cron/:id/history - Get execution history
 * - GET    /openclaw/api/v1/cron/:id/stats   - Get job statistics
 *
 * @module api/cron
 */

import { Router, Request, Response } from 'express';
import {
  CreateCronJobRequest,
  UpdateCronJobRequest,
  CronExecutionHistoryQuery
} from '../types/cron.types';
import { CronManager } from '../cron/cron-manager';
import { CronHistory } from '../cron/cron-history';

/**
 * Create cron API router
 */
export function createCronRouter(
  cronManager: CronManager,
  cronHistory: CronHistory
): Router {
  const router = Router();

  /**
   * POST /openclaw/api/v1/cron
   * Create a new cron job
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      // Extract user context from auth middleware
      const userId = (req as any).user?.userId;
      const organizationId = (req as any).user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Validate request body
      const {
        jobName,
        description,
        schedule,
        timezone,
        skillName,
        skillParams,
        maxRetries,
        timeoutSeconds
      } = req.body;

      if (!jobName || !schedule || !skillName) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: jobName, schedule, skillName'
        });
      }

      // Create cron job
      const createRequest: CreateCronJobRequest = {
        userId,
        organizationId,
        jobName,
        description,
        schedule,
        timezone,
        skillName,
        skillParams,
        maxRetries,
        timeoutSeconds
      };

      const job = await cronManager.createCronJob(createRequest);

      res.status(201).json({
        success: true,
        data: {
          jobId: job.job_id,
          jobName: job.job_name,
          schedule: job.schedule,
          timezone: job.timezone,
          skillName: job.skill_name,
          enabled: job.enabled,
          nextRun: job.next_run,
          createdAt: job.created_at
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /openclaw/api/v1/cron
   * List cron jobs with filtering and pagination
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const userId = (req as any).user?.userId;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Parse query parameters
      const {
        enabled,
        skillName,
        limit,
        offset,
        sortBy,
        sortOrder
      } = req.query;

      const result = await cronManager.listCronJobs({
        organizationId,
        userId: req.query.allUsers ? undefined : userId,
        enabled: enabled ? enabled === 'true' : undefined,
        skillName: skillName as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json({
        success: true,
        data: {
          jobs: result.jobs,
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.offset + result.jobs.length < result.total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /openclaw/api/v1/cron/:id
   * Get cron job details
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const job = await cronManager.getCronJob(id, organizationId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Cron job not found'
        });
      }

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * PUT /openclaw/api/v1/cron/:id
   * Update cron job
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const updates: UpdateCronJobRequest = req.body;

      const job = await cronManager.updateCronJob(id, organizationId, updates);

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * DELETE /openclaw/api/v1/cron/:id
   * Delete cron job
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await cronManager.deleteCronJob(id, organizationId);

      res.json({
        success: true,
        message: 'Cron job deleted successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /openclaw/api/v1/cron/:id/run
   * Trigger manual job execution
   */
  router.post('/:id/run', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      await cronManager.triggerManualRun(id, organizationId);

      res.json({
        success: true,
        message: 'Cron job execution triggered'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /openclaw/api/v1/cron/:id/history
   * Get execution history for a job
   */
  router.get('/:id/history', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Parse query parameters
      const {
        status,
        startDate,
        endDate,
        limit,
        offset
      } = req.query;

      const query: CronExecutionHistoryQuery = {
        jobId: id,
        organizationId,
        status: status as any,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      };

      const result = await cronHistory.getExecutionHistory(query);

      res.json({
        success: true,
        data: {
          executions: result.executions,
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.offset + result.executions.length < result.total
          }
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /openclaw/api/v1/cron/:id/stats
   * Get job statistics
   */
  router.get('/:id/stats', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const stats = await cronManager.getCronJobStats(id, organizationId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'Cron job not found'
        });
      }

      // Get execution summary
      const summary = await cronHistory.getExecutionSummary(id, organizationId, 30);

      // Get recent executions
      const recentExecutions = await cronHistory.getRecentExecutions(id, organizationId, 10);

      res.json({
        success: true,
        data: {
          stats,
          summary,
          recentExecutions
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * GET /openclaw/api/v1/cron/:id/timeline
   * Get execution timeline
   */
  router.get('/:id/timeline', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;
      const { hours = '24' } = req.query;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const timeline = await cronHistory.getExecutionTimeline(
        id,
        organizationId,
        parseInt(hours as string)
      );

      res.json({
        success: true,
        data: timeline
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /openclaw/api/v1/cron/:id/enable
   * Enable a cron job
   */
  router.post('/:id/enable', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const job = await cronManager.enableCronJob(id, organizationId);

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /openclaw/api/v1/cron/:id/disable
   * Disable a cron job
   */
  router.post('/:id/disable', async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).user?.organizationId;
      const { id } = req.params;
      const { reason } = req.body;

      if (!organizationId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const job = await cronManager.disableCronJob(id, organizationId, reason);

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  return router;
}
