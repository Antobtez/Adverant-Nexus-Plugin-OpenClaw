/**
 * Nexus Billing Invoice Skill
 *
 * Generate invoices via Nexus billing service
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, InvoiceRequest } from '../types';

interface InvoiceResult {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  total: number;
  currency: string;
  dueDate: Date;
  pdfUrl: string;
  status: 'draft' | 'sent' | 'paid';
}

class BillingInvoiceSkill implements AgentSkill<InvoiceRequest, InvoiceResult> {
  name = 'nexus-billing-invoice';
  description = 'Generate customer invoices';
  category = SkillCategory.BUSINESS;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_BILLING_URL || 'http://nexus-gateway:9000/billing',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    customerId: Joi.string().required(),
    items: Joi.array().items(Joi.object({
      description: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      tax: Joi.number().min(0).optional()
    })).min(1).required(),
    dueDate: Joi.date().required().greater('now'),
    notes: Joi.string().optional().max(1000)
  });

  async validate(input: InvoiceRequest): Promise<ValidationResult> {
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

  async execute(input: InvoiceRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<InvoiceResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'generating', progress: 50, message: 'Generating invoice...' });

      const response = await this.client.post<InvoiceResult>(
        '/api/v1/invoices',
        {
          customer_id: input.customerId,
          items: input.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax: item.tax || 0
          })),
          due_date: input.dueDate,
          notes: input.notes,
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
        metadata: { executionTime, itemCount: input.items.length },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'INVOICE_GENERATION_ERROR',
          message: error.response?.data?.message || error.message || 'Invoice generation failed',
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
      tags: ['billing', 'invoices', 'finance', 'business'],
      inputSchema: {
        customerId: { type: 'string', required: true },
        items: { type: 'array', required: true },
        dueDate: { type: 'date', required: true },
        notes: { type: 'string', required: false }
      },
      outputSchema: {
        invoiceId: { type: 'string' },
        invoiceNumber: { type: 'string' },
        total: { type: 'number' },
        pdfUrl: { type: 'string' },
        status: { type: 'string' }
      },
      requiredServices: ['nexus-billing'],
      estimatedDuration: 8
    };
  }
}

export default new BillingInvoiceSkill();
