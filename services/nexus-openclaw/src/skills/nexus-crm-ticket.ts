/**
 * Nexus CRM Ticket Skill
 *
 * Create and manage CRM support tickets
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, CRMTicketRequest } from '../types';

interface CRMTicketResult {
  ticketId: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  priority: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignee?: string;
  createdAt: Date;
}

class CRMTicketSkill implements AgentSkill<CRMTicketRequest, CRMTicketResult> {
  name = 'nexus-crm-ticket';
  description = 'Create and manage CRM support tickets';
  category = SkillCategory.BUSINESS;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_CRM_URL || 'http://nexus-gateway:9000/crm',
      timeout: 20000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    customerId: Joi.string().required(),
    subject: Joi.string().required().min(5).max(200),
    description: Joi.string().required().min(10).max(5000),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
    category: Joi.string().optional().max(100),
    assignee: Joi.string().optional()
  });

  async validate(input: CRMTicketRequest): Promise<ValidationResult> {
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

  async execute(input: CRMTicketRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<CRMTicketResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'creating', progress: 50, message: 'Creating CRM ticket...' });

      const response = await this.client.post<CRMTicketResult>(
        '/api/v1/tickets',
        {
          customer_id: input.customerId,
          subject: input.subject,
          description: input.description,
          priority: input.priority,
          category: input.category,
          assignee: input.assignee,
          organization_id: context.organizationId,
          created_by: context.userId
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
        metadata: { executionTime, priority: input.priority },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'CRM_TICKET_ERROR',
          message: error.response?.data?.message || error.message || 'Ticket creation failed',
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
      tags: ['crm', 'support', 'tickets', 'customer-service'],
      inputSchema: {
        customerId: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        description: { type: 'string', required: true },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], required: true },
        category: { type: 'string', required: false }
      },
      outputSchema: {
        ticketId: { type: 'string' },
        ticketNumber: { type: 'string' },
        subject: { type: 'string' },
        priority: { type: 'string' },
        status: { type: 'string' }
      },
      requiredServices: ['nexus-crm'],
      estimatedDuration: 5
    };
  }
}

export default new CRMTicketSkill();
