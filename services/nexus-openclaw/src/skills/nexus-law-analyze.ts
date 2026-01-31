/**
 * Nexus Legal Analysis Skill
 *
 * Analyze legal documents using Nexus AI services
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, LegalAnalysisRequest } from '../types';

interface LegalAnalysisResult {
  documentId: string;
  analysisType: string;
  summary: string;
  clauses: Array<{
    type: string;
    content: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>;
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'critical';
    areas: string[];
  };
  compliance: {
    status: 'compliant' | 'non-compliant' | 'review-required';
    issues: string[];
  };
}

class LegalAnalysisSkill implements AgentSkill<LegalAnalysisRequest, LegalAnalysisResult> {
  name = 'nexus-law-analyze';
  description = 'Analyze legal documents for compliance and risk';
  category = SkillCategory.BUSINESS;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_LAW_URL || 'http://nexus-gateway:9000/legal',
      timeout: 180000, // 3 minutes for complex documents
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    documentUrl: Joi.string().uri().optional(),
    documentText: Joi.string().optional(),
    analysisType: Joi.string().valid('contract', 'patent', 'compliance', 'general').required(),
    specificClauses: Joi.array().items(Joi.string()).optional()
  }).xor('documentUrl', 'documentText');

  async validate(input: LegalAnalysisRequest): Promise<ValidationResult> {
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

  async execute(input: LegalAnalysisRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<LegalAnalysisResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'analyzing', progress: 30, message: 'Analyzing legal document...' });

      const response = await this.client.post<LegalAnalysisResult>(
        '/api/v1/analyze',
        {
          document_url: input.documentUrl,
          document_text: input.documentText,
          analysis_type: input.analysisType,
          specific_clauses: input.specificClauses,
          organization_id: context.organizationId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      context.onProgress?.({ stage: 'completed', progress: 100, message: 'Legal analysis completed' });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: { executionTime, analysisType: input.analysisType },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'LEGAL_ANALYSIS_ERROR',
          message: error.response?.data?.message || error.message || 'Legal analysis failed',
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
      tags: ['legal', 'compliance', 'contracts', 'analysis', 'risk'],
      inputSchema: {
        documentUrl: { type: 'string', required: false },
        documentText: { type: 'string', required: false },
        analysisType: { type: 'string', enum: ['contract', 'patent', 'compliance', 'general'], required: true }
      },
      outputSchema: {
        documentId: { type: 'string' },
        summary: { type: 'string' },
        clauses: { type: 'array' },
        riskAssessment: { type: 'object' },
        compliance: { type: 'object' }
      },
      requiredServices: ['nexus-legal'],
      estimatedDuration: 45
    };
  }
}

export default new LegalAnalysisSkill();
