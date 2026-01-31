/**
 * Nexus GitHub PR Review Skill
 *
 * Review GitHub pull requests with automated code analysis
 *
 * @module skills/nexus-github-pr-review
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import {
  AgentSkill,
  SkillCategory,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillMetadata,
  ValidationResult,
  GitHubPRReviewRequest
} from '../types';

interface GitHubPRReviewResult {
  pullNumber: number;
  reviewId: string;
  summary: string;
  issues: Array<{
    type: 'security' | 'performance' | 'style' | 'bug';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    file: string;
    line?: number;
  }>;
  recommendations: string[];
  approved: boolean;
}

class GitHubPRReviewSkill implements AgentSkill<GitHubPRReviewRequest, GitHubPRReviewResult> {
  name = 'nexus-github-pr-review';
  description = 'Review GitHub pull requests with automated analysis';
  category = SkillCategory.INTEGRATION;
  version = '1.0.0';

  private client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXUS_GITHUB_SERVICE_URL || 'http://nexus-gateway:9000/github';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private inputSchema = Joi.object({
    owner: Joi.string().required(),
    repo: Joi.string().required(),
    pullNumber: Joi.number().integer().min(1).required(),
    reviewType: Joi.string().valid('full', 'security', 'performance', 'style').default('full'),
    autoComment: Joi.boolean().default(false)
  });

  async validate(input: GitHubPRReviewRequest): Promise<ValidationResult> {
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
    input: GitHubPRReviewRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<GitHubPRReviewResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({
        stage: 'fetching',
        progress: 20,
        message: 'Fetching pull request details...'
      });

      // Get PR details
      const prResponse = await this.client.get(
        `/api/v1/repos/${input.owner}/${input.repo}/pulls/${input.pullNumber}`,
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      context.onProgress?.({
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing code changes...'
      });

      // Perform review
      const reviewResponse = await this.client.post<GitHubPRReviewResult>(
        `/api/v1/repos/${input.owner}/${input.repo}/pulls/${input.pullNumber}/review`,
        {
          review_type: input.reviewType || 'full',
          auto_comment: input.autoComment || false,
          organization_id: context.organizationId
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      if (input.autoComment && reviewResponse.data.issues.length > 0) {
        context.onProgress?.({
          stage: 'commenting',
          progress: 80,
          message: 'Posting review comments...'
        });
      }

      context.onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `Review completed: ${reviewResponse.data.issues.length} issues found`
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: reviewResponse.data,
        metadata: {
          executionTime,
          issueCount: reviewResponse.data.issues.length,
          approved: reviewResponse.data.approved
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: error.response?.status === 404 ? 'PR_NOT_FOUND' : 'GITHUB_REVIEW_ERROR',
          message: error.response?.data?.message || error.message || 'PR review failed',
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
      tags: ['github', 'code-review', 'pull-request', 'automation'],
      inputSchema: {
        owner: { type: 'string', required: true },
        repo: { type: 'string', required: true },
        pullNumber: { type: 'number', required: true },
        reviewType: { type: 'string', enum: ['full', 'security', 'performance', 'style'], default: 'full' },
        autoComment: { type: 'boolean', default: false }
      },
      outputSchema: {
        pullNumber: { type: 'number' },
        reviewId: { type: 'string' },
        summary: { type: 'string' },
        issues: { type: 'array' },
        recommendations: { type: 'array' },
        approved: { type: 'boolean' }
      },
      requiredServices: ['nexus-gateway', 'github-api'],
      estimatedDuration: 30
    };
  }
}

export default new GitHubPRReviewSkill();
