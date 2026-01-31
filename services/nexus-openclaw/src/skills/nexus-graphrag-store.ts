/**
 * Nexus GraphRAG Store Skill
 *
 * Store information in GraphRAG knowledge graph
 *
 * @module skills/nexus-graphrag-store
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
  GraphRAGStoreRequest
} from '../types';

interface GraphRAGStoreResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

class GraphRAGStoreSkill implements AgentSkill<GraphRAGStoreRequest, GraphRAGStoreResult> {
  name = 'nexus-graphrag-store';
  description = 'Store information in Nexus knowledge graph';
  category = SkillCategory.KNOWLEDGE;
  version = '1.0.0';

  private client: AxiosInstance;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXUS_GRAPHRAG_URL || 'http://nexus-graphrag:9001';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private inputSchema = Joi.object({
    content: Joi.string().required().min(1).max(50000),
    metadata: Joi.object().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    entityType: Joi.string().optional()
  });

  async validate(input: GraphRAGStoreRequest): Promise<ValidationResult> {
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
    input: GraphRAGStoreRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<GraphRAGStoreResult>> {
    const startTime = Date.now();

    try {
      context.onProgress?.({
        stage: 'storing',
        progress: 30,
        message: 'Storing in GraphRAG knowledge base...'
      });

      const response = await this.client.post<GraphRAGStoreResult>(
        '/api/v1/store',
        {
          content: input.content,
          metadata: {
            ...input.metadata,
            organization_id: context.organizationId,
            user_id: context.userId,
            session_id: context.sessionId
          },
          tags: input.tags || [],
          entity_type: input.entityType
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
        message: 'Successfully stored in knowledge base'
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: {
          executionTime,
          contentLength: input.content.length
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'GRAPHRAG_STORE_ERROR',
          message: error.response?.data?.message || error.message || 'Failed to store in GraphRAG',
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
      tags: ['knowledge', 'store', 'graphrag', 'memory'],
      inputSchema: {
        content: { type: 'string', required: true },
        metadata: { type: 'object', required: false },
        tags: { type: 'array', required: false },
        entityType: { type: 'string', required: false }
      },
      outputSchema: {
        id: { type: 'string' },
        content: { type: 'string' },
        metadata: { type: 'object' },
        createdAt: { type: 'string' }
      },
      requiredServices: ['nexus-graphrag'],
      estimatedDuration: 3
    };
  }
}

export default new GraphRAGStoreSkill();
