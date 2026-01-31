/**
 * Nexus Analytics Query Skill
 *
 * Query analytics data from Nexus analytics service
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, AnalyticsQueryRequest } from '../types';

interface AnalyticsQueryResult {
  metric: string;
  data: Array<{
    timestamp: Date;
    value: number;
    dimensions?: Record<string, any>;
  }>;
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
  };
}

class AnalyticsQuerySkill implements AgentSkill<AnalyticsQueryRequest, AnalyticsQueryResult> {
  name = 'nexus-analytics-query';
  description = 'Query analytics data and metrics';
  category = SkillCategory.ANALYTICS;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_ANALYTICS_URL || 'http://nexus-gateway:9000/analytics',
      timeout: 45000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    metric: Joi.string().required(),
    dimensions: Joi.array().items(Joi.string()).optional(),
    filters: Joi.object().optional(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required().greater(Joi.ref('startDate')),
    granularity: Joi.string().valid('hour', 'day', 'week', 'month').default('day')
  });

  async validate(input: AnalyticsQueryRequest): Promise<ValidationResult> {
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

  async execute(input: AnalyticsQueryRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<AnalyticsQueryResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'querying', progress: 40, message: `Querying ${input.metric} data...` });

      const response = await this.client.post<AnalyticsQueryResult>(
        '/api/v1/query',
        {
          metric: input.metric,
          dimensions: input.dimensions,
          filters: {
            ...input.filters,
            organization_id: context.organizationId
          },
          start_date: input.startDate,
          end_date: input.endDate,
          granularity: input.granularity || 'day'
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: { executionTime, dataPoints: response.data.data.length },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_QUERY_ERROR',
          message: error.response?.data?.message || error.message || 'Analytics query failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500,
          timestamp: new Date()
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      author: 'Adverant AI',
      tags: ['analytics', 'metrics', 'data', 'reporting'],
      inputSchema: {
        metric: { type: 'string', required: true },
        startDate: { type: 'date', required: true },
        endDate: { type: 'date', required: true },
        granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' }
      },
      outputSchema: {
        metric: { type: 'string' },
        data: { type: 'array' },
        summary: { type: 'object' }
      },
      requiredServices: ['nexus-analytics'],
      estimatedDuration: 10
    };
  }
}

export default new AnalyticsQuerySkill();
