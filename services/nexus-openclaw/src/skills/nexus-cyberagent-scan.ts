/**
 * Nexus CyberAgent Security Scan Skill
 *
 * Perform security scans and vulnerability assessments
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, SecurityScanRequest } from '../types';

interface SecurityScanResult {
  scanId: string;
  target: string;
  scanType: string;
  vulnerabilities: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    cve?: string;
    recommendation: string;
  }>;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance: {
    standards: string[];
    score: number;
  };
  completedAt: Date;
}

class CyberAgentScanSkill implements AgentSkill<SecurityScanRequest, SecurityScanResult> {
  name = 'nexus-cyberagent-scan';
  description = 'Perform security scans and vulnerability assessments';
  category = SkillCategory.SECURITY;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_CYBERAGENT_URL || 'http://nexus-gateway:9000/security',
      timeout: 300000, // 5 minutes for deep scans
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    target: Joi.string().required(),
    scanType: Joi.string().valid('vulnerability', 'malware', 'compliance', 'full').required(),
    depth: Joi.string().valid('quick', 'standard', 'deep').default('standard')
  });

  async validate(input: SecurityScanRequest): Promise<ValidationResult> {
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

  async execute(input: SecurityScanRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<SecurityScanResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'scanning', progress: 20, message: `Starting ${input.scanType} scan...` });

      // Initiate scan
      const startResponse = await this.client.post(
        '/api/v1/scans',
        {
          target: input.target,
          scan_type: input.scanType,
          depth: input.depth || 'standard',
          organization_id: context.organizationId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const scanId = startResponse.data.scan_id;

      // Poll for scan completion
      const result = await this.pollScanStatus(scanId, context);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: result,
        metadata: {
          executionTime,
          vulnerabilitiesFound: result.summary.total
        },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'SECURITY_SCAN_ERROR',
          message: error.response?.data?.message || error.message || 'Security scan failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500,
          timestamp: new Date()
        },
        executionTime: Date.now() - startTime
      };
    }
  }

  private async pollScanStatus(
    scanId: string,
    context: SkillExecutionContext
  ): Promise<SecurityScanResult> {
    const maxPolls = 60; // 5 minutes max (5 sec intervals)

    for (let i = 0; i < maxPolls; i++) {
      await this.sleep(5000);

      const response = await this.client.get<SecurityScanResult>(
        `/api/v1/scans/${scanId}`,
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      const progress = 20 + ((i / maxPolls) * 75);
      context.onProgress?.({
        stage: 'scanning',
        progress,
        message: 'Security scan in progress...'
      });

      if (response.data.completedAt) {
        return response.data;
      }
    }

    throw new Error('Security scan timeout');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      author: 'Adverant AI',
      tags: ['security', 'vulnerability', 'scanning', 'compliance', 'cyber'],
      inputSchema: {
        target: { type: 'string', required: true },
        scanType: { type: 'string', enum: ['vulnerability', 'malware', 'compliance', 'full'], required: true },
        depth: { type: 'string', enum: ['quick', 'standard', 'deep'], default: 'standard' }
      },
      outputSchema: {
        scanId: { type: 'string' },
        vulnerabilities: { type: 'array' },
        summary: { type: 'object' },
        compliance: { type: 'object' }
      },
      requiredServices: ['nexus-cyberagent'],
      estimatedDuration: 90
    };
  }
}

export default new CyberAgentScanSkill();
