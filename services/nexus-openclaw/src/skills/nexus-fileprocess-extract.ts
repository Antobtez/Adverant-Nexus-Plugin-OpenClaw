/**
 * Nexus FileProcess Extract Skill
 *
 * Extract text and data from uploaded documents
 *
 * @module skills/nexus-fileprocess-extract
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import {
  AgentSkill,
  SkillCategory,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillMetadata,
  ValidationResult
} from '../types';

interface FileExtractRequest {
  fileId: string;
  extractionType?: 'text' | 'tables' | 'images' | 'all';
  ocrEnabled?: boolean;
}

interface FileExtractResult {
  fileId: string;
  text?: string;
  tables?: any[];
  images?: any[];
  metadata: {
    pages?: number;
    wordCount?: number;
    language?: string;
  };
}

class FileProcessExtractSkill implements AgentSkill<FileExtractRequest, FileExtractResult> {
  name = 'nexus-fileprocess-extract';
  description = 'Extract text and data from documents';
  category = SkillCategory.AUTOMATION;
  version = '1.0.0';

  private client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXUS_FILEPROCESS_URL || 'http://nexus-fileprocess:9004';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 180000, // 3 minutes for OCR
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private inputSchema = Joi.object({
    fileId: Joi.string().required(),
    extractionType: Joi.string().valid('text', 'tables', 'images', 'all').default('text'),
    ocrEnabled: Joi.boolean().default(false)
  });

  async validate(input: FileExtractRequest): Promise<ValidationResult> {
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
    input: FileExtractRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<FileExtractResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({
        stage: 'extracting',
        progress: 30,
        message: 'Extracting data from document...'
      });

      const response = await this.client.post<FileExtractResult>(
        `/api/v1/files/${input.fileId}/extract`,
        {
          extraction_type: input.extractionType || 'text',
          ocr_enabled: input.ocrEnabled || false,
          organization_id: context.organizationId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      context.onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Extraction completed successfully'
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: {
          executionTime,
          extractionType: input.extractionType,
          ocrEnabled: input.ocrEnabled
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: error.response?.data?.message || error.message || 'Data extraction failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500 || error.code === 'ECONNREFUSED',
          timestamp: new Date()
        },
        executionTime
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
      tags: ['files', 'extraction', 'ocr', 'documents', 'text'],
      inputSchema: {
        fileId: { type: 'string', required: true },
        extractionType: { type: 'string', enum: ['text', 'tables', 'images', 'all'], default: 'text' },
        ocrEnabled: { type: 'boolean', default: false }
      },
      outputSchema: {
        fileId: { type: 'string' },
        text: { type: 'string' },
        tables: { type: 'array' },
        images: { type: 'array' },
        metadata: { type: 'object' }
      },
      requiredServices: ['nexus-fileprocess'],
      estimatedDuration: 20
    };
  }
}

export default new FileProcessExtractSkill();
