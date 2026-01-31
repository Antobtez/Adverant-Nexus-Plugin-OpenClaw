/**
 * Nexus GitHub Issues Skill
 *
 * Manage GitHub issues (create, update, comment)
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult } from '../types';

interface GitHubIssueRequest {
  owner: string;
  repo: string;
  action: 'create' | 'update' | 'comment' | 'close';
  issueNumber?: number;
  title?: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

interface GitHubIssueResult {
  issueNumber: number;
  title: string;
  state: string;
  url: string;
  action: string;
}

class GitHubIssuesSkill implements AgentSkill<GitHubIssueRequest, GitHubIssueResult> {
  name = 'nexus-github-issues';
  description = 'Manage GitHub issues';
  category = SkillCategory.INTEGRATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_GITHUB_SERVICE_URL || 'http://nexus-gateway:9000/github',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    owner: Joi.string().required(),
    repo: Joi.string().required(),
    action: Joi.string().valid('create', 'update', 'comment', 'close').required(),
    issueNumber: Joi.number().integer().when('action', { not: 'create', then: Joi.required() }),
    title: Joi.string().when('action', { is: 'create', then: Joi.required() }),
    body: Joi.string().optional(),
    labels: Joi.array().items(Joi.string()).optional(),
    assignees: Joi.array().items(Joi.string()).optional()
  });

  async validate(input: GitHubIssueRequest): Promise<ValidationResult> {
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

  async execute(input: GitHubIssueRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<GitHubIssueResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'processing', progress: 50, message: `${input.action} GitHub issue...` });

      const endpoint = input.action === 'create'
        ? `/api/v1/repos/${input.owner}/${input.repo}/issues`
        : `/api/v1/repos/${input.owner}/${input.repo}/issues/${input.issueNumber}`;

      const method = input.action === 'create' ? 'post' : input.action === 'comment' ? 'post' : 'patch';
      const url = input.action === 'comment' ? `${endpoint}/comments` : endpoint;

      const response = await this.client.request<GitHubIssueResult>({
        method,
        url,
        data: {
          title: input.title,
          body: input.body,
          labels: input.labels,
          assignees: input.assignees,
          state: input.action === 'close' ? 'closed' : undefined,
          organization_id: context.organizationId
        },
        headers: {
          'X-User-ID': context.userId,
          'X-Organization-ID': context.organizationId
        }
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: { ...response.data, action: input.action },
        metadata: { executionTime, action: input.action },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GITHUB_ISSUE_ERROR',
          message: error.response?.data?.message || error.message || 'Issue operation failed',
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
      tags: ['github', 'issues', 'project-management'],
      inputSchema: {
        owner: { type: 'string', required: true },
        repo: { type: 'string', required: true },
        action: { type: 'string', enum: ['create', 'update', 'comment', 'close'], required: true },
        issueNumber: { type: 'number', required: false },
        title: { type: 'string', required: false },
        body: { type: 'string', required: false }
      },
      outputSchema: {
        issueNumber: { type: 'number' },
        title: { type: 'string' },
        state: { type: 'string' },
        url: { type: 'string' }
      },
      requiredServices: ['nexus-gateway', 'github-api'],
      estimatedDuration: 5
    };
  }
}

export default new GitHubIssuesSkill();
