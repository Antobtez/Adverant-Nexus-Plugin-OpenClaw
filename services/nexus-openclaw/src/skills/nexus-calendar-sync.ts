/**
 * Nexus Calendar Sync Skill
 *
 * Sync calendar events across platforms
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult } from '../types';

interface CalendarSyncRequest {
  source: 'google' | 'outlook' | 'apple';
  target: 'google' | 'outlook' | 'apple';
  dateRange?: { start: Date; end: Date };
  syncDirection?: 'one-way' | 'two-way';
}

interface CalendarSyncResult {
  syncId: string;
  eventsSynced: number;
  source: string;
  target: string;
  syncedAt: Date;
}

class CalendarSyncSkill implements AgentSkill<CalendarSyncRequest, CalendarSyncResult> {
  name = 'nexus-calendar-sync';
  description = 'Sync calendar events across platforms';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_CALENDAR_URL || 'http://nexus-gateway:9000/calendar',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    source: Joi.string().valid('google', 'outlook', 'apple').required(),
    target: Joi.string().valid('google', 'outlook', 'apple').required(),
    dateRange: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().required().greater(Joi.ref('start'))
    }).optional(),
    syncDirection: Joi.string().valid('one-way', 'two-way').default('one-way')
  });

  async validate(input: CalendarSyncRequest): Promise<ValidationResult> {
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

  async execute(input: CalendarSyncRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<CalendarSyncResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'syncing', progress: 30, message: `Syncing ${input.source} to ${input.target}...` });

      const response = await this.client.post<CalendarSyncResult>(
        '/api/v1/sync',
        {
          source: input.source,
          target: input.target,
          date_range: input.dateRange,
          sync_direction: input.syncDirection || 'one-way',
          organization_id: context.organizationId,
          user_id: context.userId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      context.onProgress?.({ stage: 'completed', progress: 100, message: `Synced ${response.data.eventsSynced} events` });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: { executionTime, eventsSynced: response.data.eventsSynced },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CALENDAR_SYNC_ERROR',
          message: error.response?.data?.message || error.message || 'Calendar sync failed',
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
      tags: ['calendar', 'sync', 'integration', 'automation'],
      inputSchema: {
        source: { type: 'string', enum: ['google', 'outlook', 'apple'], required: true },
        target: { type: 'string', enum: ['google', 'outlook', 'apple'], required: true },
        dateRange: { type: 'object', required: false },
        syncDirection: { type: 'string', enum: ['one-way', 'two-way'], default: 'one-way' }
      },
      outputSchema: {
        syncId: { type: 'string' },
        eventsSynced: { type: 'number' },
        source: { type: 'string' },
        target: { type: 'string' }
      },
      requiredServices: ['nexus-calendar'],
      estimatedDuration: 15
    };
  }
}

export default new CalendarSyncSkill();
