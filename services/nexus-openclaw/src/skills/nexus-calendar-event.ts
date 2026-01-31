/**
 * Nexus Calendar Event Skill
 *
 * Create calendar events via Nexus integration
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, CalendarEventRequest } from '../types';

interface CalendarEventResult {
  eventId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetingLink?: string;
}

class CalendarEventSkill implements AgentSkill<CalendarEventRequest, CalendarEventResult> {
  name = 'nexus-calendar-event';
  description = 'Create calendar events';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_CALENDAR_URL || 'http://nexus-gateway:9000/calendar',
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    title: Joi.string().required().min(1).max(200),
    description: Joi.string().optional().max(5000),
    startTime: Joi.date().required(),
    endTime: Joi.date().required().greater(Joi.ref('startTime')),
    attendees: Joi.array().items(Joi.string().email()).optional(),
    location: Joi.string().optional().max(500),
    recurrence: Joi.string().optional()
  });

  async validate(input: CalendarEventRequest): Promise<ValidationResult> {
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

  async execute(input: CalendarEventRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<CalendarEventResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'creating', progress: 50, message: 'Creating calendar event...' });

      const response = await this.client.post<CalendarEventResult>(
        '/api/v1/events',
        {
          title: input.title,
          description: input.description,
          start_time: input.startTime,
          end_time: input.endTime,
          attendees: input.attendees || [],
          location: input.location,
          recurrence: input.recurrence,
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

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: { executionTime, attendeeCount: input.attendees?.length || 0 },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CALENDAR_EVENT_ERROR',
          message: error.response?.data?.message || error.message || 'Calendar event creation failed',
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
      tags: ['calendar', 'scheduling', 'events', 'meetings'],
      inputSchema: {
        title: { type: 'string', required: true },
        startTime: { type: 'date', required: true },
        endTime: { type: 'date', required: true },
        attendees: { type: 'array', required: false },
        location: { type: 'string', required: false }
      },
      outputSchema: {
        eventId: { type: 'string' },
        title: { type: 'string' },
        startTime: { type: 'date' },
        endTime: { type: 'date' },
        attendees: { type: 'array' }
      },
      requiredServices: ['nexus-calendar'],
      estimatedDuration: 5
    };
  }
}

export default new CalendarEventSkill();
