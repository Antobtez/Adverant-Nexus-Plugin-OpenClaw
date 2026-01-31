/**
 * Nexus GraphRAG Search Skill
 *
 * Search Nexus knowledge graph and semantic memory for relevant information
 *
 * @module skills/nexus-graphrag-search
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
  GraphRAGSearchRequest,
  GraphRAGSearchResult
} from '../types';

/**
 * GraphRAG Search Skill
 */
class GraphRAGSearchSkill implements AgentSkill<GraphRAGSearchRequest, GraphRAGSearchResult> {
  name = 'nexus-graphrag-search';
  description = 'Search Nexus knowledge graph and semantic memory';
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

  /**
   * Input validation schema
   */
  private inputSchema = Joi.object({
    query: Joi.string().required().min(1).max(1000),
    limit: Joi.number().integer().min(1).max(100).default(10),
    filters: Joi.object().optional(),
    includeMetadata: Joi.boolean().default(true),
    searchType: Joi.string().valid('semantic', 'keyword', 'hybrid').default('hybrid')
  });

  /**
   * Validate input
   */
  async validate(input: GraphRAGSearchRequest): Promise<ValidationResult> {
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

  /**
   * Execute skill
   */
  async execute(
    input: GraphRAGSearchRequest,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<GraphRAGSearchResult>> {
    const startTime = Date.now();

    try {
      // Report progress: Starting search
      context.onProgress?.({
        stage: 'searching',
        progress: 20,
        message: 'Querying GraphRAG knowledge base...'
      });

      // Call GraphRAG API
      const response = await this.client.post<GraphRAGSearchResult>(
        '/api/v1/search',
        {
          query: input.query,
          limit: input.limit || 10,
          filters: {
            ...input.filters,
            organization_id: context.organizationId
          },
          include_metadata: input.includeMetadata !== false,
          search_type: input.searchType || 'hybrid'
        },
        {
          headers: {
            'X-User-ID': context.userId,
            'X-Organization-ID': context.organizationId
          }
        }
      );

      // Report progress: Processing results
      context.onProgress?.({
        stage: 'processing',
        progress: 80,
        message: `Found ${response.data.totalResults} results`
      });

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: response.data,
        metadata: {
          executionTime,
          resultsCount: response.data.totalResults,
          searchType: input.searchType
        },
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: error.response?.status === 404 ? 'NOT_FOUND' : 'GRAPHRAG_ERROR',
          message: error.response?.data?.message || error.message || 'GraphRAG search failed',
          details: error.response?.data,
          retryable: error.response?.status >= 500 || error.code === 'ECONNREFUSED',
          timestamp: new Date()
        },
        executionTime
      };
    }
  }

  /**
   * Get skill metadata
   */
  getMetadata(): SkillMetadata {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      version: this.version,
      author: 'Adverant AI',
      tags: ['knowledge', 'search', 'graphrag', 'semantic', 'memory'],
      inputSchema: {
        query: { type: 'string', required: true },
        limit: { type: 'number', default: 10 },
        filters: { type: 'object', required: false },
        includeMetadata: { type: 'boolean', default: true },
        searchType: { type: 'string', enum: ['semantic', 'keyword', 'hybrid'], default: 'hybrid' }
      },
      outputSchema: {
        results: { type: 'array' },
        totalResults: { type: 'number' },
        query: { type: 'string' }
      },
      requiredServices: ['nexus-graphrag'],
      estimatedDuration: 5
    };
  }
}

export default new GraphRAGSearchSkill();
