/**
 * OpenClaw Skills Module
 *
 * Central export point for all Nexus integration skills
 *
 * @module skills
 */

// Core infrastructure
export { SkillExecutor } from './skill-executor';
export { SkillRegistry } from './skill-registry';

// GraphRAG skills
export { default as GraphRAGSearchSkill } from './nexus-graphrag-search';
export { default as GraphRAGStoreSkill } from './nexus-graphrag-store';

// MageAgent skills
export { default as MageAgentTaskSkill } from './nexus-mageagent-task';

// FileProcess skills
export { default as FileProcessUploadSkill } from './nexus-fileprocess-upload';
export { default as FileProcessExtractSkill } from './nexus-fileprocess-extract';

// GitHub integration skills
export { default as GitHubPRReviewSkill } from './nexus-github-pr-review';
export { default as GitHubCommitSkill } from './nexus-github-commit';
export { default as GitHubIssuesSkill } from './nexus-github-issues';

// Communication skills
export { default as EmailCommunicationSkill } from './nexus-communication-email';
export { default as SlackCommunicationSkill } from './nexus-communication-slack';
export { default as TeamsCommunicationSkill } from './nexus-communication-teams';

// Calendar skills
export { default as CalendarEventSkill } from './nexus-calendar-event';
export { default as CalendarSyncSkill } from './nexus-calendar-sync';

// Business skills
export { default as AnalyticsQuerySkill } from './nexus-analytics-query';
export { default as BillingInvoiceSkill } from './nexus-billing-invoice';
export { default as CRMTicketSkill } from './nexus-crm-ticket';

// Specialized skills
export { default as LegalAnalysisSkill } from './nexus-law-analyze';
export { default as VideoTranscriptionSkill } from './nexus-video-transcribe';
export { default as BrowserScrapeSkill } from './nexus-browser-scrape';
export { default as CyberAgentScanSkill } from './nexus-cyberagent-scan';

/**
 * Skill categories mapping
 */
export const SKILL_CATEGORIES = {
  KNOWLEDGE: 'knowledge',
  AUTOMATION: 'automation',
  COMMUNICATION: 'communication',
  INTEGRATION: 'integration',
  ANALYTICS: 'analytics',
  SECURITY: 'security',
  MEDIA: 'media',
  BUSINESS: 'business'
} as const;

/**
 * List of all available skills
 */
export const ALL_SKILLS = [
  // GraphRAG
  'nexus-graphrag-search',
  'nexus-graphrag-store',

  // MageAgent
  'nexus-mageagent-task',

  // FileProcess
  'nexus-fileprocess-upload',
  'nexus-fileprocess-extract',

  // GitHub
  'nexus-github-pr-review',
  'nexus-github-commit',
  'nexus-github-issues',

  // Communication
  'nexus-communication-email',
  'nexus-communication-slack',
  'nexus-communication-teams',

  // Calendar
  'nexus-calendar-event',
  'nexus-calendar-sync',

  // Business
  'nexus-analytics-query',
  'nexus-billing-invoice',
  'nexus-crm-ticket',

  // Specialized
  'nexus-law-analyze',
  'nexus-video-transcribe',
  'nexus-browser-scrape',
  'nexus-cyberagent-scan'
] as const;

export type SkillName = typeof ALL_SKILLS[number];
