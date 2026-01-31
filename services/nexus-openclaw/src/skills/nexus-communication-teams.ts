/**
 * Nexus Microsoft Teams Communication Skill
 *
 * Post messages to Microsoft Teams channels
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult } from '../types';

interface TeamsMessageRequest {
  teamId: string;
  channelId: string;
  message: string;
  title?: string;
  importance?: 'low' | 'normal' | 'high';
}

interface TeamsMessageResult {
  messageId: string;
  teamId: string;
  channelId: string;
  postedAt: Date;
}

class TeamsCommunicationSkill implements AgentSkill<TeamsMessageRequest, TeamsMessageResult> {
  name = 'nexus-communication-teams';
  description = 'Post messages to Microsoft Teams channels';
  category = SkillCategory.COMMUNICATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_COMMUNICATION_URL || 'http://nexus-gateway:9000/communication',
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    teamId: Joi.string().required(),
    channelId: Joi.string().required(),
    message: Joi.string().required().min(1).max(5000),
    title: Joi.string().optional().max(200),
    importance: Joi.string().valid('low', 'normal', 'high').default('normal')
  });

  async validate(input: TeamsMessageRequest): Promise<ValidationResult> {
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

  async execute(input: TeamsMessageRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<TeamsMessageResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'sending', progress: 50, message: 'Posting to Microsoft Teams...' });

      const response = await this.client.post<TeamsMessageResult>(
        '/api/v1/teams/message',
        {
          team_id: input.teamId,
          channel_id: input.channelId,
          message: input.message,
          title: input.title,
          importance: input.importance || 'normal',
          organization_id: context.organizationId
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
        metadata: { executionTime, teamId: input.teamId },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'TEAMS_POST_ERROR',
          message: error.response?.data?.message || error.message || 'Teams post failed',
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
      tags: ['teams', 'microsoft', 'communication', 'messaging', 'collaboration'],
      inputSchema: {
        teamId: { type: 'string', required: true },
        channelId: { type: 'string', required: true },
        message: { type: 'string', required: true },
        title: { type: 'string', required: false },
        importance: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' }
      },
      outputSchema: {
        messageId: { type: 'string' },
        teamId: { type: 'string' },
        channelId: { type: 'string' },
        postedAt: { type: 'string' }
      },
      requiredServices: ['nexus-communication', 'teams-api'],
      estimatedDuration: 3
    };
  }
}

export default new TeamsCommunicationSkill();
