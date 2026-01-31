/**
 * Nexus Browser Scraping Skill
 *
 * Scrape web pages and extract structured data
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, WebScrapingRequest } from '../types';

interface WebScrapingResult {
  url: string;
  title: string;
  content: {
    text?: string;
    html?: string;
    structured?: Record<string, any>;
  };
  links?: string[];
  images?: string[];
  metadata: {
    scrapedAt: Date;
    statusCode: number;
    loadTime: number;
  };
}

class BrowserScrapeSkill implements AgentSkill<WebScrapingRequest, WebScrapingResult> {
  name = 'nexus-browser-scrape';
  description = 'Scrape web pages and extract data';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_BROWSER_URL || 'http://nexus-gateway:9000/browser',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    url: Joi.string().uri().required(),
    selectors: Joi.array().items(Joi.string()).optional(),
    extractType: Joi.string().valid('text', 'html', 'structured').default('text'),
    followLinks: Joi.boolean().default(false),
    maxDepth: Joi.number().integer().min(1).max(3).optional()
  });

  async validate(input: WebScrapingRequest): Promise<ValidationResult> {
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

  async execute(input: WebScrapingRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<WebScrapingResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'scraping', progress: 40, message: `Scraping ${input.url}...` });

      const response = await this.client.post<WebScrapingResult>(
        '/api/v1/scrape',
        {
          url: input.url,
          selectors: input.selectors,
          extract_type: input.extractType || 'text',
          follow_links: input.followLinks || false,
          max_depth: input.maxDepth || 1,
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
        metadata: { executionTime, url: input.url },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'WEB_SCRAPING_ERROR',
          message: error.response?.data?.message || error.message || 'Web scraping failed',
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
      tags: ['web-scraping', 'browser', 'data-extraction', 'automation'],
      inputSchema: {
        url: { type: 'string', required: true },
        selectors: { type: 'array', required: false },
        extractType: { type: 'string', enum: ['text', 'html', 'structured'], default: 'text' },
        followLinks: { type: 'boolean', default: false }
      },
      outputSchema: {
        url: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'object' },
        metadata: { type: 'object' }
      },
      requiredServices: ['nexus-browser'],
      estimatedDuration: 15
    };
  }
}

export default new BrowserScrapeSkill();
