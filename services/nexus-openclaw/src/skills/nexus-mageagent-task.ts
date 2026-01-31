/**
 * Nexus MageAgent Task Skill
 *
 * Trigger multi-agent tasks via MageAgent orchestration service
 *
 * @module skills/nexus-mageagent-task
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import {
  AgentSkill,
  SkillCategory,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillMetadata,
  ValidationResult,
  MageAgentTaskRequest,
  MageAgentTaskResult
} from '../types';

class MageAgentTaskSkill implements AgentSkill<MageAgentTaskRequest, MageAgentTaskResult> {
  name = 'nexus-mageagent-task';
  description = 'Trigger multi-agent orchestration tasks';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXUS_MAGEAGENT_URL || 'http://nexus-mageagent:9002';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 minutes for long-running tasks
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private inputSchema = Joi.object({
    taskType: Joi.string().required(),
    description: Joi.string().required().min(10).max(5000),
    context: Joi.object().optional(),
    agents: Joi.array().items(Joi.string()).optional(),
    maxDuration: Joi.number().integer().min(10).max(3600).default(600),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium')
  });

  async validate(input: MageAgentTaskRequest): Promise<ValidationResult> {
    const { error } = this.inputSchema.validate(input, { abortEarly: false });

    if (error) {
      return {
        valid: false,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type
        }))
      };
    }

    return { valid: true };
  }

  async execute(
    input: MageAgentTaskRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<MageAgentTaskResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({
        stage: 'initializing',
        progress: 10,
        message: 'Initializing multi-agent task...'
      });

      // Create task
      const createResponse = await this.client.post(
        '/api/v1/tasks',
        {
          task_type: input.taskType,
          description: input.description,
          context: {
            ...input.context,
            organization_id: context.organizationId,
            user_id: context.userId
          },
          agents: input.agents,
          max_duration: input.maxDuration || 600,
          priority: input.priority || 'medium'
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const taskId = createResponse.data.task_id;

      context.onProgress?.({
        stage: 'executing',
        progress: 30,
        message: `Task ${taskId} started, agents working...`
      });

      // Poll for task completion
      let pollCount = 0;
      const maxPolls = Math.floor((input.maxDuration || 600) / 5);

      while (pollCount < maxPolls) {
        await this.sleep(5000); // Poll every 5 seconds

        const statusResponse = await this.client.get(
          `/api/v1/tasks/${taskId}`,
          {
            headers: {
              'X-User-ID': context.userId,
              'X-Organization-ID': context.organizationId
            }
          }
        );

        const status = statusResponse.data.status;
        const progress = statusResponse.data.progress || 0;

        context.onProgress?.({
          stage: 'executing',
          progress: 30 + (progress * 0.6), // 30-90%
          message: `Task in progress: ${status} (${progress}%)`
        });

        if (status === 'completed' || status === 'failed' || status === 'timeout') {
          const executionTime = Date.now() - startTime;

          const result: MageAgentTaskResult = {
            taskId,
            status,
            result: statusResponse.data.result,
            agents: statusResponse.data.agents || [],
            duration: statusResponse.data.duration || executionTime / 1000,
            logs: statusResponse.data.logs || []
          };

          if (status === 'completed') {
            context.onProgress?.({
              stage: 'completed',
              progress: 100,
              message: 'Multi-agent task completed successfully'
            });

            return {
              success: true,
              data: result,
              metadata: {
                executionTime,
                agentCount: result.agents.length
              },
              executionTime
            };
          } else {
            return {
              success: false,
              error: {
                code: status === 'timeout' ? 'TASK_TIMEOUT' : 'TASK_FAILED',
                message: `Task ${status}: ${statusResponse.data.error || 'Unknown error'}`,
                details: result,
                retryable: status === 'timeout',
                timestamp: new Date()
              },
              executionTime
            };
          }
        }

        pollCount++;
      }

      // Timeout
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: {
          code: 'POLL_TIMEOUT',
          message: 'Task execution timeout',
          details: { taskId },
          retryable: true,
          timestamp: new Date()
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'MAGEAGENT_ERROR',
          message: error.response?.data?.message || error.message || 'MageAgent task failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500 || error.code === 'ECONNREFUSED',
          timestamp: new Date()
        },
        executionTime
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      author: 'Adverant AI',
      tags: ['automation', 'multi-agent', 'orchestration', 'mageagent'],
      inputSchema: {
        taskType: { type: 'string', required: true },
        description: { type: 'string', required: true },
        context: { type: 'object', required: false },
        agents: { type: 'array', required: false },
        maxDuration: { type: 'number', default: 600 },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
      },
      outputSchema: {
        taskId: { type: 'string' },
        status: { type: 'string' },
        result: { type: 'any' },
        agents: { type: 'array' },
        duration: { type: 'number' }
      },
      requiredServices: ['nexus-mageagent'],
      estimatedDuration: 60
    };
  }
}

export default new MageAgentTaskSkill();
