/**
 * OpenClaw Type Definitions
 *
 * Core type definitions for the OpenClaw plugin system
 *
 * @module types
 */

/**
 * Skill execution context
 */
export interface SkillExecutionContext {
  userId: string;
  organizationId: string;
  sessionId?: string;
  tier: string;
  onProgress?: (progress: SkillProgress) => void;
}

/**
 * Skill progress update
 */
export interface SkillProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: SkillExecutionError;
  metadata?: Record<string, any>;
  executionTime?: number;
}

/**
 * Skill execution error
 */
export interface SkillExecutionError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}

/**
 * Base skill interface
 */
export interface AgentSkill<TInput = any, TOutput = any> {
  name: string;
  description: string;
  category: SkillCategory;
  version: string;

  /**
   * Validate skill input parameters
   */
  validate(input: TInput): Promise<ValidationResult>;

  /**
   * Execute the skill
   */
  execute(
    input: TInput,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult<TOutput>>;

  /**
   * Get skill metadata
   */
  getMetadata(): SkillMetadata;
}

/**
 * Skill category
 */
export enum SkillCategory {
  KNOWLEDGE = 'knowledge',
  AUTOMATION = 'automation',
  COMMUNICATION = 'communication',
  INTEGRATION = 'integration',
  ANALYTICS = 'analytics',
  SECURITY = 'security',
  MEDIA = 'media',
  BUSINESS = 'business'
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  name: string;
  description: string;
  category: SkillCategory;
  version: string;
  author: string;
  tags: string[];
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  requiredServices: string[];
  estimatedDuration?: number; // in seconds
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Nexus service configuration
 */
export interface NexusServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * GraphRAG search request
 */
export interface GraphRAGSearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
  includeMetadata?: boolean;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
}

/**
 * GraphRAG search result
 */
export interface GraphRAGSearchResult {
  results: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  totalResults: number;
  query: string;
}

/**
 * GraphRAG store request
 */
export interface GraphRAGStoreRequest {
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  entityType?: string;
}

/**
 * MageAgent task request
 */
export interface MageAgentTaskRequest {
  taskType: string;
  description: string;
  context?: Record<string, any>;
  agents?: string[];
  maxDuration?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * MageAgent task result
 */
export interface MageAgentTaskResult {
  taskId: string;
  status: 'completed' | 'failed' | 'timeout';
  result?: any;
  agents: string[];
  duration: number;
  logs?: string[];
}

/**
 * File process upload request
 */
export interface FileProcessUploadRequest {
  fileUrl?: string;
  fileBuffer?: Buffer;
  fileName: string;
  mimeType: string;
  processType?: 'extract' | 'analyze' | 'convert';
}

/**
 * File process result
 */
export interface FileProcessResult {
  fileId: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  result?: {
    text?: string;
    metadata?: Record<string, any>;
    pages?: number;
    extractedData?: any;
  };
}

/**
 * GitHub PR review request
 */
export interface GitHubPRReviewRequest {
  owner: string;
  repo: string;
  pullNumber: number;
  reviewType?: 'full' | 'security' | 'performance' | 'style';
  autoComment?: boolean;
}

/**
 * GitHub commit request
 */
export interface GitHubCommitRequest {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: Array<{
    path: string;
    content: string;
  }>;
}

/**
 * Email request
 */
export interface EmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

/**
 * Slack message request
 */
export interface SlackMessageRequest {
  channel: string;
  text: string;
  blocks?: any[];
  threadTs?: string;
  attachments?: any[];
}

/**
 * Calendar event request
 */
export interface CalendarEventRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
  recurrence?: string;
}

/**
 * Analytics query request
 */
export interface AnalyticsQueryRequest {
  metric: string;
  dimensions?: string[];
  filters?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

/**
 * Invoice request
 */
export interface InvoiceRequest {
  customerId: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    tax?: number;
  }>;
  dueDate: Date;
  notes?: string;
}

/**
 * CRM ticket request
 */
export interface CRMTicketRequest {
  customerId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  assignee?: string;
}

/**
 * Legal document analysis request
 */
export interface LegalAnalysisRequest {
  documentUrl?: string;
  documentText?: string;
  analysisType: 'contract' | 'patent' | 'compliance' | 'general';
  specificClauses?: string[];
}

/**
 * Video transcription request
 */
export interface VideoTranscriptionRequest {
  videoUrl: string;
  language?: string;
  includeTimestamps?: boolean;
  speakerDiarization?: boolean;
}

/**
 * Web scraping request
 */
export interface WebScrapingRequest {
  url: string;
  selectors?: string[];
  extractType?: 'text' | 'html' | 'structured';
  followLinks?: boolean;
  maxDepth?: number;
}

/**
 * Security scan request
 */
export interface SecurityScanRequest {
  target: string;
  scanType: 'vulnerability' | 'malware' | 'compliance' | 'full';
  depth?: 'quick' | 'standard' | 'deep';
}

/**
 * Skill registry entry
 */
export interface SkillRegistryEntry {
  skill: AgentSkill;
  enabled: boolean;
  lastExecuted?: Date;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
}

/**
 * Logger interface
 */
export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * Database service interface
 */
export interface DatabaseService {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

// Re-export cron types
export * from './cron.types';
