/**
 * Skill Registry
 *
 * Central registry for all OpenClaw skills with discovery, registration,
 * and statistics tracking.
 *
 * @module skills/skill-registry
 */

import {
  AgentSkill,
  SkillRegistryEntry,
  SkillCategory,
  SkillMetadata,
  Logger
} from '../types';

/**
 * Skill statistics update
 */
export interface SkillStatisticsUpdate {
  totalExecutions?: number;
  successRate?: number;
  averageDuration?: number;
}

/**
 * Skill Registry Class
 */
export class SkillRegistry {
  private skills: Map<string, SkillRegistryEntry> = new Map();
  private logger: Logger | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the skill registry
   */
  async initialize(logger: Logger): Promise<void> {
    this.logger = logger;

    this.logger.info('Initializing skill registry...');

    try {
      // Auto-register all skills
      await this.autoRegisterSkills();

      this.isInitialized = true;
      this.logger.info('Skill registry initialized', {
        registeredSkills: this.skills.size
      });

    } catch (error) {
      this.logger.error('Failed to initialize skill registry', { error });
      throw error;
    }
  }

  /**
   * Auto-register all available skills
   */
  private async autoRegisterSkills(): Promise<void> {
    // Dynamically import all skill modules
    const skillModules = await this.loadSkillModules();

    for (const [moduleName, module] of Object.entries(skillModules)) {
      try {
        // Each module should export a default skill instance
        const skill = (module as any).default;

        if (skill && this.isValidSkill(skill)) {
          this.registerSkill(skill);
          this.logger?.debug('Registered skill', {
            name: skill.name,
            category: skill.category,
            version: skill.version
          });
        } else {
          this.logger?.warn('Invalid skill module', { moduleName });
        }

      } catch (error) {
        this.logger?.error('Failed to register skill module', {
          moduleName,
          error
        });
      }
    }
  }

  /**
   * Load all skill modules dynamically
   */
  private async loadSkillModules(): Promise<Record<string, any>> {
    try {
      // Import all Nexus integration skills
      const [
        graphragSearch,
        graphragStore,
        mageagentTask,
        fileprocessUpload,
        fileprocessExtract,
        githubPrReview,
        githubCommit,
        githubIssues,
        emailSend,
        slackPost,
        teamsPost,
        calendarEvent,
        calendarSync,
        analyticsQuery,
        billingInvoice,
        crmTicket,
        lawAnalyze,
        videoTranscribe,
        browserScrape,
        cyberagentScan
      ] = await Promise.all([
        import('./nexus-graphrag-search').catch(() => null),
        import('./nexus-graphrag-store').catch(() => null),
        import('./nexus-mageagent-task').catch(() => null),
        import('./nexus-fileprocess-upload').catch(() => null),
        import('./nexus-fileprocess-extract').catch(() => null),
        import('./nexus-github-pr-review').catch(() => null),
        import('./nexus-github-commit').catch(() => null),
        import('./nexus-github-issues').catch(() => null),
        import('./nexus-communication-email').catch(() => null),
        import('./nexus-communication-slack').catch(() => null),
        import('./nexus-communication-teams').catch(() => null),
        import('./nexus-calendar-event').catch(() => null),
        import('./nexus-calendar-sync').catch(() => null),
        import('./nexus-analytics-query').catch(() => null),
        import('./nexus-billing-invoice').catch(() => null),
        import('./nexus-crm-ticket').catch(() => null),
        import('./nexus-law-analyze').catch(() => null),
        import('./nexus-video-transcribe').catch(() => null),
        import('./nexus-browser-scrape').catch(() => null),
        import('./nexus-cyberagent-scan').catch(() => null)
      ]);

      return {
        graphragSearch,
        graphragStore,
        mageagentTask,
        fileprocessUpload,
        fileprocessExtract,
        githubPrReview,
        githubCommit,
        githubIssues,
        emailSend,
        slackPost,
        teamsPost,
        calendarEvent,
        calendarSync,
        analyticsQuery,
        billingInvoice,
        crmTicket,
        lawAnalyze,
        videoTranscribe,
        browserScrape,
        cyberagentScan
      };

    } catch (error) {
      this.logger?.error('Failed to load skill modules', { error });
      return {};
    }
  }

  /**
   * Validate skill instance
   */
  private isValidSkill(skill: any): skill is AgentSkill {
    return (
      skill &&
      typeof skill.name === 'string' &&
      typeof skill.description === 'string' &&
      typeof skill.validate === 'function' &&
      typeof skill.execute === 'function' &&
      typeof skill.getMetadata === 'function'
    );
  }

  /**
   * Register a skill
   */
  registerSkill(skill: AgentSkill): void {
    if (this.skills.has(skill.name)) {
      this.logger?.warn('Skill already registered, overwriting', {
        name: skill.name
      });
    }

    this.skills.set(skill.name, {
      skill,
      enabled: true,
      totalExecutions: 0,
      successRate: 0,
      averageDuration: 0
    });

    this.logger?.info('Skill registered', {
      name: skill.name,
      category: skill.category,
      version: skill.version
    });
  }

  /**
   * Unregister a skill
   */
  unregisterSkill(skillName: string): boolean {
    const deleted = this.skills.delete(skillName);

    if (deleted) {
      this.logger?.info('Skill unregistered', { name: skillName });
    }

    return deleted;
  }

  /**
   * Get a skill by name
   */
  getSkill(skillName: string): AgentSkill | null {
    const entry = this.skills.get(skillName);

    if (!entry) {
      return null;
    }

    if (!entry.enabled) {
      this.logger?.warn('Skill is disabled', { name: skillName });
      return null;
    }

    return entry.skill;
  }

  /**
   * Get all registered skill names
   */
  getRegisteredSkillNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: SkillCategory): AgentSkill[] {
    return Array.from(this.skills.values())
      .filter(entry => entry.enabled && entry.skill.category === category)
      .map(entry => entry.skill);
  }

  /**
   * Get all skill metadata
   */
  getAllMetadata(): SkillMetadata[] {
    return Array.from(this.skills.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.skill.getMetadata());
  }

  /**
   * Search skills
   */
  searchSkills(query: string): AgentSkill[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.skills.values())
      .filter(entry => {
        if (!entry.enabled) return false;

        const skill = entry.skill;
        const metadata = skill.getMetadata();

        return (
          skill.name.toLowerCase().includes(lowerQuery) ||
          skill.description.toLowerCase().includes(lowerQuery) ||
          metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      })
      .map(entry => entry.skill);
  }

  /**
   * Enable or disable a skill
   */
  setSkillEnabled(skillName: string, enabled: boolean): boolean {
    const entry = this.skills.get(skillName);

    if (!entry) {
      return false;
    }

    entry.enabled = enabled;

    this.logger?.info('Skill status changed', {
      name: skillName,
      enabled
    });

    return true;
  }

  /**
   * Check if skill exists and is enabled
   */
  isSkillAvailable(skillName: string): boolean {
    const entry = this.skills.get(skillName);
    return entry !== undefined && entry.enabled;
  }

  /**
   * Record skill execution
   */
  recordExecution(skillName: string, success: boolean, duration: number): void {
    const entry = this.skills.get(skillName);

    if (!entry) {
      return;
    }

    entry.totalExecutions++;
    entry.lastExecuted = new Date();

    // Update success rate (running average)
    const successCount = Math.round(entry.successRate * (entry.totalExecutions - 1));
    const newSuccessCount = success ? successCount + 1 : successCount;
    entry.successRate = newSuccessCount / entry.totalExecutions;

    // Update average duration (running average)
    entry.averageDuration =
      (entry.averageDuration * (entry.totalExecutions - 1) + duration) /
      entry.totalExecutions;
  }

  /**
   * Update skill statistics
   */
  updateStatistics(skillName: string, update: SkillStatisticsUpdate): void {
    const entry = this.skills.get(skillName);

    if (!entry) {
      return;
    }

    if (update.totalExecutions !== undefined) {
      entry.totalExecutions = update.totalExecutions;
    }

    if (update.successRate !== undefined) {
      entry.successRate = update.successRate;
    }

    if (update.averageDuration !== undefined) {
      entry.averageDuration = update.averageDuration;
    }
  }

  /**
   * Get skill statistics
   */
  getSkillStatistics(skillName: string): SkillRegistryEntry | null {
    return this.skills.get(skillName) || null;
  }

  /**
   * Get all statistics
   */
  getAllStatistics(): Record<string, SkillRegistryEntry> {
    const stats: Record<string, SkillRegistryEntry> = {};

    this.skills.forEach((entry, name) => {
      stats[name] = entry;
    });

    return stats;
  }

  /**
   * Get registry summary
   */
  getSummary() {
    const totalSkills = this.skills.size;
    const enabledSkills = Array.from(this.skills.values()).filter(
      e => e.enabled
    ).length;

    const categoryCounts: Record<string, number> = {};
    this.skills.forEach(entry => {
      const category = entry.skill.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return {
      totalSkills,
      enabledSkills,
      disabledSkills: totalSkills - enabledSkills,
      categoryCounts,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Check if registry is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
