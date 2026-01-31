/**
 * Nexus GitHub Commit Skill
 *
 * Create commits to GitHub repositories
 */

import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';
import { AgentSkill, SkillCategory, SkillExecutionContext, SkillExecutionResult, SkillMetadata, ValidationResult, GitHubCommitRequest } from '../types';

interface GitHubCommitResult {
  sha: string;
  message: string;
  url: string;
  filesChanged: number;
}

class GitHubCommitSkill implements AgentSkill<GitHubCommitRequest, GitHubCommitResult> {
  name = 'nexus-github-commit';
  description = 'Create commits to GitHub repositories';
  category = SkillCategory.INTEGRATION;
  version = '1.0.0';

  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXUS_GITHUB_SERVICE_URL || 'http://nexus-gateway:9000/github',
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private inputSchema = Joi.object({
    owner: Joi.string().required(),
    repo: Joi.string().required(),
    branch: Joi.string().required(),
    message: Joi.string().required().min(10).max(500),
    files: Joi.array().items(Joi.object({
      path: Joi.string().required(),
      content: Joi.string().required()
    })).min(1).required()
  });

  async validate(input: GitHubCommitRequest): Promise<ValidationResult> {
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

  async execute(input: GitHubCommitRequest, context: SkillExecutionContext): Promise<SkillExecutionResult<GitHubCommitResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({ stage: 'committing', progress: 50, message: `Creating commit on ${input.branch}...` });

      const response = await this.client.post<GitHubCommitResult>(
        `/api/v1/repos/${input.owner}/${input.repo}/commits`,
        {
          branch: input.branch,
          message: input.message,
          files: input.files,
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
        metadata: { executionTime, filesChanged: input.files.length },
        executionTime
      };

    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GITHUB_COMMIT_ERROR',
          message: error.response?.data?.message || error.message || 'Commit failed',
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
      tags: ['github', 'commit', 'version-control'],
      inputSchema: {
        owner: { type: 'string', required: true },
        repo: { type: 'string', required: true },
        branch: { type: 'string', required: true },
        message: { type: 'string', required: true },
        files: { type: 'array', required: true }
      },
      outputSchema: {
        sha: { type: 'string' },
        message: { type: 'string' },
        url: { type: 'string' },
        filesChanged: { type: 'number' }
      },
      requiredServices: ['nexus-gateway', 'github-api'],
      estimatedDuration: 10
    };
  }
}

export default new GitHubCommitSkill();
