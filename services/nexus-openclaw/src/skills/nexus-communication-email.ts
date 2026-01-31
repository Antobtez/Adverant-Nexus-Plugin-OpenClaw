/**
 * Nexus Email Communication Skill
 *
 * Send emails via Nexus communication service
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, EmailRequest } from '../types';

interface EmailResult {
  messageId: string;
  recipients: string[];
  subject: string;
  sentAt: Date;
}

class EmailCommunicationSkill implements AgentSkill<EmailRequest, EmailResult> {
  name = 'nexus-communication-email';
  description = 'Send emails via Nexus communication service';
  category = SkillCategory.COMMUNICATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_COMMUNICATION_URL || 'http://nexus-gateway:9000/communication',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    to: Joi.array().items(Joi.string().email()).min(1).required(),
    cc: Joi.array().items(Joi.string().email()).optional(),
    bcc: Joi.array().items(Joi.string().email()).optional(),
    subject: Joi.string().required().min(1).max(200),
    body: Joi.string().required().min(1),
    html: Joi.string().optional(),
    attachments: Joi.array().items(Joi.object({
      filename: Joi.string().required(),
      content: Joi.alternatives().try(Joi.binary(), Joi.string()).required()
    })).optional()
  });

  async validate(input: EmailRequest): Promise<ValidationResult> {
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

  async execute(input: EmailRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<EmailResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'sending', progress: 50, message: `Sending email to ${input.to.length} recipient(s)...` });

      const response = await this.client.post<EmailResult>(
        '/api/v1/email/send',
        {
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          subject: input.subject,
          body: input.body,
          html: input.html,
          attachments: input.attachments,
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
        metadata: { executionTime, recipientCount: input.to.length },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EMAIL_SEND_ERROR',
          message: error.response?.data?.message || error.message || 'Email send failed',
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
      tags: ['email', 'communication', 'messaging'],
      inputSchema: {
        to: { type: 'array', required: true },
        subject: { type: 'string', required: true },
        body: { type: 'string', required: true },
        html: { type: 'string', required: false },
        attachments: { type: 'array', required: false }
      },
      outputSchema: {
        messageId: { type: 'string' },
        recipients: { type: 'array' },
        subject: { type: 'string' },
        sentAt: { type: 'string' }
      },
      requiredServices: ['nexus-communication'],
      estimatedDuration: 5
    };
  }
}

export default new EmailCommunicationSkill();
