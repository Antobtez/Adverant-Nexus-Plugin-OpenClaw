/**
 * Skill Store - Skills catalog and execution state management
 * Handles skill browsing, categories, favorites, and execution tracking
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';

export type SkillCategory =
  | 'nexus-integration'
  | 'knowledge'
  | 'automation'
  | 'communication'
  | 'development'
  | 'files'
  | 'calendar'
  | 'analytics'
  | 'legal'
  | 'media'
  | 'security'
  | 'robotics'
  | 'browser'
  | 'terminal'
  | 'custom';

export type SkillExecutionStatus = 'idle' | 'running' | 'completed' | 'error';

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: string;
}

export interface SkillSchema {
  type: 'object';
  properties: Record<string, SkillParameter>;
  required?: string[];
}

export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  longDescription?: string;
  category: SkillCategory;
  version: string;
  author?: string;
  icon?: string;
  schema: SkillSchema;
  examples?: Array<{
    title: string;
    description: string;
    input: Record<string, unknown>;
  }>;
  tags?: string[];
  documentation?: string;
  enabled: boolean;
  requiresAuth?: boolean;
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
}

export interface SkillExecutionRecord {
  executionId: string;
  skillId: string;
  skillName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: SkillExecutionStatus;
  error?: string;
  executionTimeMs?: number;
  startedAt: Date;
  completedAt?: Date;
  sessionId?: string;
}

export interface SkillStats {
  skillName: string;
  executions: number;
  avgTimeMs: number;
  successRate: number;
  lastUsed?: Date;
}

interface SkillState {
  // Skills catalog
  skills: Skill[];
  skillsLoading: boolean;
  skillsError: string | null;

  // Categories
  categories: SkillCategory[];
  selectedCategory: SkillCategory | 'all';

  // Search and filtering
  searchQuery: string;
  filterTags: string[];

  // Favorites (persisted)
  favoriteSkillIds: string[];

  // Selected skill for detail view
  selectedSkillId: string | null;

  // Current execution
  currentExecution: SkillExecutionRecord | null;

  // Execution history
  executionHistory: SkillExecutionRecord[];
  maxHistoryItems: number;

  // Skill stats
  skillStats: Record<string, SkillStats>;

  // Recently used (for quick access)
  recentlyUsedSkillIds: string[];
  maxRecentItems: number;

  // Actions - Skills
  setSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  removeSkill: (skillId: string) => void;
  setSkillsLoading: (loading: boolean) => void;
  setSkillsError: (error: string | null) => void;

  // Actions - Categories
  setCategories: (categories: SkillCategory[]) => void;
  setSelectedCategory: (category: SkillCategory | 'all') => void;

  // Actions - Search and filtering
  setSearchQuery: (query: string) => void;
  setFilterTags: (tags: string[]) => void;
  addFilterTag: (tag: string) => void;
  removeFilterTag: (tag: string) => void;
  clearFilters: () => void;

  // Actions - Favorites
  toggleFavorite: (skillId: string) => void;
  addFavorite: (skillId: string) => void;
  removeFavorite: (skillId: string) => void;

  // Actions - Selection
  selectSkill: (skillId: string | null) => void;

  // Actions - Execution
  startExecution: (execution: Omit<SkillExecutionRecord, 'startedAt'>) => void;
  updateExecution: (updates: Partial<SkillExecutionRecord>) => void;
  completeExecution: (output: Record<string, unknown>, executionTimeMs: number) => void;
  failExecution: (error: string) => void;
  clearCurrentExecution: () => void;

  // Actions - History
  addToHistory: (record: SkillExecutionRecord) => void;
  clearHistory: () => void;

  // Actions - Stats
  updateSkillStats: (skillName: string, stats: Partial<SkillStats>) => void;

  // Actions - Recently used
  addToRecentlyUsed: (skillId: string) => void;

  // Selectors (computed)
  getFilteredSkills: () => Skill[];
  getFavoriteSkills: () => Skill[];
  getRecentlyUsedSkills: () => Skill[];
  getSkillById: (skillId: string) => Skill | undefined;
  getSkillByName: (name: string) => Skill | undefined;
  getSkillsByCategory: (category: SkillCategory) => Skill[];
}

export const useSkillStore = create<SkillState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        skills: [],
        skillsLoading: false,
        skillsError: null,
        categories: [],
        selectedCategory: 'all',
        searchQuery: '',
        filterTags: [],
        favoriteSkillIds: [],
        selectedSkillId: null,
        currentExecution: null,
        executionHistory: [],
        maxHistoryItems: 100,
        skillStats: {},
        recentlyUsedSkillIds: [],
        maxRecentItems: 10,

        // Actions - Skills
        setSkills: (skills) =>
          set((state) => {
            state.skills = skills;
            // Extract unique categories
            const cats = [...new Set(skills.map((s) => s.category))];
            state.categories = cats;
          }),

        addSkill: (skill) =>
          set((state) => {
            const exists = state.skills.some((s) => s.id === skill.id);
            if (!exists) {
              state.skills.push(skill);
              if (!state.categories.includes(skill.category)) {
                state.categories.push(skill.category);
              }
            }
          }),

        updateSkill: (skillId, updates) =>
          set((state) => {
            const index = state.skills.findIndex((s) => s.id === skillId);
            if (index !== -1) {
              state.skills[index] = { ...state.skills[index], ...updates };
            }
          }),

        removeSkill: (skillId) =>
          set((state) => {
            state.skills = state.skills.filter((s) => s.id !== skillId);
            state.favoriteSkillIds = state.favoriteSkillIds.filter((id) => id !== skillId);
            state.recentlyUsedSkillIds = state.recentlyUsedSkillIds.filter((id) => id !== skillId);
          }),

        setSkillsLoading: (loading) =>
          set((state) => {
            state.skillsLoading = loading;
          }),

        setSkillsError: (error) =>
          set((state) => {
            state.skillsError = error;
          }),

        // Actions - Categories
        setCategories: (categories) =>
          set((state) => {
            state.categories = categories;
          }),

        setSelectedCategory: (category) =>
          set((state) => {
            state.selectedCategory = category;
          }),

        // Actions - Search and filtering
        setSearchQuery: (query) =>
          set((state) => {
            state.searchQuery = query;
          }),

        setFilterTags: (tags) =>
          set((state) => {
            state.filterTags = tags;
          }),

        addFilterTag: (tag) =>
          set((state) => {
            if (!state.filterTags.includes(tag)) {
              state.filterTags.push(tag);
            }
          }),

        removeFilterTag: (tag) =>
          set((state) => {
            state.filterTags = state.filterTags.filter((t) => t !== tag);
          }),

        clearFilters: () =>
          set((state) => {
            state.searchQuery = '';
            state.filterTags = [];
            state.selectedCategory = 'all';
          }),

        // Actions - Favorites
        toggleFavorite: (skillId) =>
          set((state) => {
            const index = state.favoriteSkillIds.indexOf(skillId);
            if (index === -1) {
              state.favoriteSkillIds.push(skillId);
            } else {
              state.favoriteSkillIds.splice(index, 1);
            }
          }),

        addFavorite: (skillId) =>
          set((state) => {
            if (!state.favoriteSkillIds.includes(skillId)) {
              state.favoriteSkillIds.push(skillId);
            }
          }),

        removeFavorite: (skillId) =>
          set((state) => {
            state.favoriteSkillIds = state.favoriteSkillIds.filter((id) => id !== skillId);
          }),

        // Actions - Selection
        selectSkill: (skillId) =>
          set((state) => {
            state.selectedSkillId = skillId;
          }),

        // Actions - Execution
        startExecution: (execution) =>
          set((state) => {
            state.currentExecution = {
              ...execution,
              startedAt: new Date(),
              status: 'running',
            };
          }),

        updateExecution: (updates) =>
          set((state) => {
            if (state.currentExecution) {
              state.currentExecution = { ...state.currentExecution, ...updates };
            }
          }),

        completeExecution: (output, executionTimeMs) =>
          set((state) => {
            if (state.currentExecution) {
              state.currentExecution.status = 'completed';
              state.currentExecution.output = output;
              state.currentExecution.executionTimeMs = executionTimeMs;
              state.currentExecution.completedAt = new Date();

              // Add to history
              state.executionHistory.unshift({ ...state.currentExecution });
              if (state.executionHistory.length > state.maxHistoryItems) {
                state.executionHistory.pop();
              }

              // Update stats
              const skillName = state.currentExecution.skillName;
              const existing = state.skillStats[skillName] || {
                skillName,
                executions: 0,
                avgTimeMs: 0,
                successRate: 1,
              };
              const newExecs = existing.executions + 1;
              state.skillStats[skillName] = {
                skillName,
                executions: newExecs,
                avgTimeMs: (existing.avgTimeMs * existing.executions + executionTimeMs) / newExecs,
                successRate: (existing.successRate * existing.executions + 1) / newExecs,
                lastUsed: new Date(),
              };
            }
          }),

        failExecution: (error) =>
          set((state) => {
            if (state.currentExecution) {
              state.currentExecution.status = 'error';
              state.currentExecution.error = error;
              state.currentExecution.completedAt = new Date();

              // Add to history
              state.executionHistory.unshift({ ...state.currentExecution });
              if (state.executionHistory.length > state.maxHistoryItems) {
                state.executionHistory.pop();
              }

              // Update stats (failure)
              const skillName = state.currentExecution.skillName;
              const existing = state.skillStats[skillName] || {
                skillName,
                executions: 0,
                avgTimeMs: 0,
                successRate: 1,
              };
              const newExecs = existing.executions + 1;
              state.skillStats[skillName] = {
                skillName,
                executions: newExecs,
                avgTimeMs: existing.avgTimeMs,
                successRate: (existing.successRate * existing.executions) / newExecs,
                lastUsed: new Date(),
              };
            }
          }),

        clearCurrentExecution: () =>
          set((state) => {
            state.currentExecution = null;
          }),

        // Actions - History
        addToHistory: (record) =>
          set((state) => {
            state.executionHistory.unshift(record);
            if (state.executionHistory.length > state.maxHistoryItems) {
              state.executionHistory.pop();
            }
          }),

        clearHistory: () =>
          set((state) => {
            state.executionHistory = [];
          }),

        // Actions - Stats
        updateSkillStats: (skillName, stats) =>
          set((state) => {
            state.skillStats[skillName] = {
              ...state.skillStats[skillName],
              skillName,
              executions: 0,
              avgTimeMs: 0,
              successRate: 1,
              ...stats,
            };
          }),

        // Actions - Recently used
        addToRecentlyUsed: (skillId) =>
          set((state) => {
            // Remove if already exists
            state.recentlyUsedSkillIds = state.recentlyUsedSkillIds.filter((id) => id !== skillId);
            // Add to front
            state.recentlyUsedSkillIds.unshift(skillId);
            // Trim to max
            if (state.recentlyUsedSkillIds.length > state.maxRecentItems) {
              state.recentlyUsedSkillIds = state.recentlyUsedSkillIds.slice(0, state.maxRecentItems);
            }
          }),

        // Selectors
        getFilteredSkills: () => {
          const state = get();
          let filtered = [...state.skills];

          // Filter by category
          if (state.selectedCategory !== 'all') {
            filtered = filtered.filter((s) => s.category === state.selectedCategory);
          }

          // Filter by search query
          if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filtered = filtered.filter(
              (s) =>
                s.name.toLowerCase().includes(query) ||
                s.displayName.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query) ||
                s.tags?.some((t) => t.toLowerCase().includes(query))
            );
          }

          // Filter by tags
          if (state.filterTags.length > 0) {
            filtered = filtered.filter((s) =>
              state.filterTags.every((tag) => s.tags?.includes(tag))
            );
          }

          return filtered;
        },

        getFavoriteSkills: () => {
          const state = get();
          return state.skills.filter((s) => state.favoriteSkillIds.includes(s.id));
        },

        getRecentlyUsedSkills: () => {
          const state = get();
          return state.recentlyUsedSkillIds
            .map((id) => state.skills.find((s) => s.id === id))
            .filter((s): s is Skill => s !== undefined);
        },

        getSkillById: (skillId) => {
          const state = get();
          return state.skills.find((s) => s.id === skillId);
        },

        getSkillByName: (name) => {
          const state = get();
          return state.skills.find((s) => s.name === name);
        },

        getSkillsByCategory: (category) => {
          const state = get();
          return state.skills.filter((s) => s.category === category);
        },
      })),
      {
        name: 'openclaw-skill-storage',
        partialize: (state) => ({
          favoriteSkillIds: state.favoriteSkillIds,
          recentlyUsedSkillIds: state.recentlyUsedSkillIds,
          selectedCategory: state.selectedCategory,
        }),
      }
    ),
    { name: 'OpenClawSkillStore' }
  )
);

// Selector hooks
export const useSkills = () => useSkillStore((state) => state.skills);
export const useSelectedSkill = () => {
  const selectedId = useSkillStore((state) => state.selectedSkillId);
  const skills = useSkillStore((state) => state.skills);
  return selectedId ? skills.find((s) => s.id === selectedId) : null;
};
export const useSkillCategories = () => useSkillStore((state) => state.categories);
export const useFavoriteSkills = () => useSkillStore((state) => state.getFavoriteSkills());
export const useCurrentExecution = () => useSkillStore((state) => state.currentExecution);
