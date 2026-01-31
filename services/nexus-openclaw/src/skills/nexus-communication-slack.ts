/**
 * Nexus Slack Communication Skill
 *
 * Post messages to Slack channels
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, SlackMessageRequest } from '../types';

interface SlackMessageResult {
  ts: string;
  channel: string;
  message: string;
}

class SlackCommunicationSkill implements AgentSkill<SlackMessageRequest, SlackMessageResult> {
  name = 'nexus-communication-slack';
  description = 'Post messages to Slack channels';
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
    channel: Joi.string().required(),
    text: Joi.string().required().min(1).max(4000),
    blocks: Joi.array().optional(),
    threadTs: Joi.string().optional(),
    attachments: Joi.array().optional()
  });

  async validate(input: SlackMessageRequest): Promise<ValidationResult> {
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

  async execute(input: SlackMessageRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<SlackMessageResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'sending', progress: 50, message: `Posting to Slack channel ${input.channel}...` });

      const response = await this.client.post<SlackMessageResult>(
        '/api/v1/slack/message',
        {
          channel: input.channel,
          text: input.text,
          blocks: input.blocks,
          thread_ts: input.threadTs,
          attachments: input.attachments,
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
        metadata: { executionTime, channel: input.channel },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SLACK_POST_ERROR',
          message: error.response?.data?.message || error.message || 'Slack post failed',
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
      tags: ['slack', 'communication', 'messaging', 'collaboration'],
      inputSchema: {
        channel: { type: 'string', required: true },
        text: { type: 'string', required: true },
        blocks: { type: 'array', required: false },
        threadTs: { type: 'string', required: false }
      },
      outputSchema: {
        ts: { type: 'string' },
        channel: { type: 'string' },
        message: { type: 'string' }
      },
      requiredServices: ['nexus-communication', 'slack-api'],
      estimatedDuration: 3
    };
  }
}

export default new SlackCommunicationSkill();
