/**
 * Cron Store - Cron job scheduling state management
 * Handles scheduled tasks, job history, and cron expression building
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';

export type CronJobStatus = 'enabled' | 'disabled' | 'running' | 'error';

export type CronRunStatus = 'success' | 'error' | 'timeout' | 'cancelled';

export interface CronJobParams {
  skillName: string;
  skillParams: Record<string, unknown>;
}

export interface CronJob {
  id: string;
  userId: string;
  organizationId: string;
  name: string;
  description?: string;
  schedule: string; // Cron expression
  timezone: string;
  skillName: string;
  skillParams: Record<string, unknown>;
  enabled: boolean;
  status: CronJobStatus;
  lastRun?: Date;
  lastRunStatus?: CronRunStatus;
  lastRunError?: string;
  lastRunDurationMs?: number;
  nextRun?: Date;
  runCount: number;
  successCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CronRunRecord {
  id: string;
  jobId: string;
  jobName: string;
  skillName: string;
  skillParams: Record<string, unknown>;
  status: CronRunStatus;
  output?: Record<string, unknown>;
  error?: string;
  durationMs: number;
  scheduledAt: Date;
  startedAt: Date;
  completedAt: Date;
}

// Cron expression presets
export interface CronPreset {
  label: string;
  description: string;
  expression: string;
  icon: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every minute', description: 'Run every minute', expression: '* * * * *', icon: 'Clock' },
  {
    label: 'Every 5 minutes',
    description: 'Run every 5 minutes',
    expression: '*/5 * * * *',
    icon: 'Clock',
  },
  {
    label: 'Every 15 minutes',
    description: 'Run every 15 minutes',
    expression: '*/15 * * * *',
    icon: 'Clock',
  },
  {
    label: 'Every 30 minutes',
    description: 'Run every 30 minutes',
    expression: '*/30 * * * *',
    icon: 'Clock',
  },
  { label: 'Every hour', description: 'Run at the start of every hour', expression: '0 * * * *', icon: 'Clock' },
  {
    label: 'Every 6 hours',
    description: 'Run every 6 hours',
    expression: '0 */6 * * *',
    icon: 'Clock',
  },
  {
    label: 'Every 12 hours',
    description: 'Run twice a day',
    expression: '0 */12 * * *',
    icon: 'Clock',
  },
  {
    label: 'Daily at midnight',
    description: 'Run at midnight every day',
    expression: '0 0 * * *',
    icon: 'Calendar',
  },
  {
    label: 'Daily at 9 AM',
    description: 'Run at 9 AM every day',
    expression: '0 9 * * *',
    icon: 'Calendar',
  },
  {
    label: 'Daily at 6 PM',
    description: 'Run at 6 PM every day',
    expression: '0 18 * * *',
    icon: 'Calendar',
  },
  {
    label: 'Weekly on Monday',
    description: 'Run at midnight every Monday',
    expression: '0 0 * * 1',
    icon: 'CalendarDays',
  },
  {
    label: 'Weekly on Friday',
    description: 'Run at midnight every Friday',
    expression: '0 0 * * 5',
    icon: 'CalendarDays',
  },
  {
    label: 'Weekdays at 9 AM',
    description: 'Run at 9 AM Monday-Friday',
    expression: '0 9 * * 1-5',
    icon: 'Briefcase',
  },
  {
    label: 'Monthly on 1st',
    description: 'Run at midnight on the 1st',
    expression: '0 0 1 * *',
    icon: 'CalendarRange',
  },
  {
    label: 'Monthly on 15th',
    description: 'Run at midnight on the 15th',
    expression: '0 0 15 * *',
    icon: 'CalendarRange',
  },
];

// Common timezones
export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// Editor state for creating/editing jobs
export interface CronEditorState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  editingJobId: string | null;

  // Form values
  name: string;
  description: string;
  schedule: string;
  timezone: string;
  skillName: string;
  skillParams: Record<string, unknown>;
  enabled: boolean;

  // UI state
  usePreset: boolean;
  selectedPreset: string | null;
  showAdvanced: boolean;

  // Validation
  errors: Record<string, string>;
  isSubmitting: boolean;
}

interface CronState {
  // Jobs
  jobs: CronJob[];
  jobsLoading: boolean;
  jobsError: string | null;

  // Selected job for detail view
  selectedJobId: string | null;

  // Run history
  runHistory: CronRunRecord[];
  runHistoryLoading: boolean;
  runHistoryError: string | null;
  maxHistoryItems: number;

  // Editor
  editor: CronEditorState;

  // Actions - Jobs
  setJobs: (jobs: CronJob[]) => void;
  addJob: (job: CronJob) => void;
  updateJob: (jobId: string, updates: Partial<CronJob>) => void;
  removeJob: (jobId: string) => void;
  setJobsLoading: (loading: boolean) => void;
  setJobsError: (error: string | null) => void;

  // Actions - Job control
  enableJob: (jobId: string) => void;
  disableJob: (jobId: string) => void;
  toggleJobEnabled: (jobId: string) => void;
  setJobRunning: (jobId: string) => void;
  setJobCompleted: (jobId: string, status: CronRunStatus, error?: string, durationMs?: number) => void;

  // Actions - Selection
  selectJob: (jobId: string | null) => void;

  // Actions - Run history
  setRunHistory: (history: CronRunRecord[]) => void;
  addRunRecord: (record: CronRunRecord) => void;
  setRunHistoryLoading: (loading: boolean) => void;
  setRunHistoryError: (error: string | null) => void;
  clearRunHistory: () => void;

  // Actions - Editor
  openEditor: (mode: 'create' | 'edit', jobId?: string) => void;
  closeEditor: () => void;
  setEditorField: <K extends keyof CronEditorState>(field: K, value: CronEditorState[K]) => void;
  setEditorError: (field: string, error: string | null) => void;
  clearEditorErrors: () => void;
  setEditorSubmitting: (submitting: boolean) => void;
  resetEditor: () => void;
  selectPreset: (expression: string) => void;

  // Selectors
  getSelectedJob: () => CronJob | null;
  getEnabledJobs: () => CronJob[];
  getJobRunHistory: (jobId: string) => CronRunRecord[];
  getJobById: (jobId: string) => CronJob | undefined;
  getNextScheduledJobs: (count: number) => CronJob[];
}

const initialEditorState: CronEditorState = {
  isOpen: false,
  mode: 'create',
  editingJobId: null,
  name: '',
  description: '',
  schedule: '0 9 * * *', // Default: daily at 9 AM
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  skillName: '',
  skillParams: {},
  enabled: true,
  usePreset: true,
  selectedPreset: '0 9 * * *',
  showAdvanced: false,
  errors: {},
  isSubmitting: false,
};

export const useCronStore = create<CronState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        jobs: [],
        jobsLoading: false,
        jobsError: null,
        selectedJobId: null,
        runHistory: [],
        runHistoryLoading: false,
        runHistoryError: null,
        maxHistoryItems: 100,
        editor: { ...initialEditorState },

        // Actions - Jobs
        setJobs: (jobs) =>
          set((state) => {
            state.jobs = jobs;
          }),

        addJob: (job) =>
          set((state) => {
            const exists = state.jobs.some((j) => j.id === job.id);
            if (!exists) {
              state.jobs.push(job);
            }
          }),

        updateJob: (jobId, updates) =>
          set((state) => {
            const index = state.jobs.findIndex((j) => j.id === jobId);
            if (index !== -1) {
              state.jobs[index] = {
                ...state.jobs[index],
                ...updates,
                updatedAt: new Date(),
              };
            }
          }),

        removeJob: (jobId) =>
          set((state) => {
            state.jobs = state.jobs.filter((j) => j.id !== jobId);
            state.runHistory = state.runHistory.filter((r) => r.jobId !== jobId);
            if (state.selectedJobId === jobId) {
              state.selectedJobId = null;
            }
          }),

        setJobsLoading: (loading) =>
          set((state) => {
            state.jobsLoading = loading;
          }),

        setJobsError: (error) =>
          set((state) => {
            state.jobsError = error;
          }),

        // Actions - Job control
        enableJob: (jobId) =>
          set((state) => {
            const job = state.jobs.find((j) => j.id === jobId);
            if (job) {
              job.enabled = true;
              job.status = 'enabled';
              job.updatedAt = new Date();
            }
          }),

        disableJob: (jobId) =>
          set((state) => {
            const job = state.jobs.find((j) => j.id === jobId);
            if (job) {
              job.enabled = false;
              job.status = 'disabled';
              job.updatedAt = new Date();
            }
          }),

        toggleJobEnabled: (jobId) =>
          set((state) => {
            const job = state.jobs.find((j) => j.id === jobId);
            if (job) {
              job.enabled = !job.enabled;
              job.status = job.enabled ? 'enabled' : 'disabled';
              job.updatedAt = new Date();
            }
          }),

        setJobRunning: (jobId) =>
          set((state) => {
            const job = state.jobs.find((j) => j.id === jobId);
            if (job) {
              job.status = 'running';
            }
          }),

        setJobCompleted: (jobId, status, error, durationMs) =>
          set((state) => {
            const job = state.jobs.find((j) => j.id === jobId);
            if (job) {
              job.status = status === 'success' ? 'enabled' : 'error';
              job.lastRun = new Date();
              job.lastRunStatus = status;
              job.lastRunError = error;
              job.lastRunDurationMs = durationMs;
              job.runCount += 1;
              if (status === 'success') {
                job.successCount += 1;
              } else {
                job.errorCount += 1;
              }
            }
          }),

        // Actions - Selection
        selectJob: (jobId) =>
          set((state) => {
            state.selectedJobId = jobId;
          }),

        // Actions - Run history
        setRunHistory: (history) =>
          set((state) => {
            state.runHistory = history;
          }),

        addRunRecord: (record) =>
          set((state) => {
            state.runHistory.unshift(record);
            if (state.runHistory.length > state.maxHistoryItems) {
              state.runHistory.pop();
            }
          }),

        setRunHistoryLoading: (loading) =>
          set((state) => {
            state.runHistoryLoading = loading;
          }),

        setRunHistoryError: (error) =>
          set((state) => {
            state.runHistoryError = error;
          }),

        clearRunHistory: () =>
          set((state) => {
            state.runHistory = [];
          }),

        // Actions - Editor
        openEditor: (mode, jobId) =>
          set((state) => {
            if (mode === 'edit' && jobId) {
              const job = state.jobs.find((j) => j.id === jobId);
              if (job) {
                state.editor = {
                  ...initialEditorState,
                  isOpen: true,
                  mode: 'edit',
                  editingJobId: jobId,
                  name: job.name,
                  description: job.description || '',
                  schedule: job.schedule,
                  timezone: job.timezone,
                  skillName: job.skillName,
                  skillParams: { ...job.skillParams },
                  enabled: job.enabled,
                  usePreset: CRON_PRESETS.some((p) => p.expression === job.schedule),
                  selectedPreset: CRON_PRESETS.find((p) => p.expression === job.schedule)?.expression ?? null,
                };
              }
            } else {
              state.editor = {
                ...initialEditorState,
                isOpen: true,
                mode: 'create',
              };
            }
          }),

        closeEditor: () =>
          set((state) => {
            state.editor.isOpen = false;
          }),

        setEditorField: (field, value) =>
          set((state) => {
            (state.editor as Record<string, unknown>)[field] = value;
            // Clear error for this field
            if (state.editor.errors[field]) {
              delete state.editor.errors[field];
            }
          }),

        setEditorError: (field, error) =>
          set((state) => {
            if (error) {
              state.editor.errors[field] = error;
            } else {
              delete state.editor.errors[field];
            }
          }),

        clearEditorErrors: () =>
          set((state) => {
            state.editor.errors = {};
          }),

        setEditorSubmitting: (submitting) =>
          set((state) => {
            state.editor.isSubmitting = submitting;
          }),

        resetEditor: () =>
          set((state) => {
            state.editor = { ...initialEditorState };
          }),

        selectPreset: (expression) =>
          set((state) => {
            state.editor.schedule = expression;
            state.editor.selectedPreset = expression;
            state.editor.usePreset = true;
          }),

        // Selectors
        getSelectedJob: () => {
          const state = get();
          if (!state.selectedJobId) return null;
          return state.jobs.find((j) => j.id === state.selectedJobId) ?? null;
        },

        getEnabledJobs: () => {
          const state = get();
          return state.jobs.filter((j) => j.enabled);
        },

        getJobRunHistory: (jobId) => {
          const state = get();
          return state.runHistory.filter((r) => r.jobId === jobId);
        },

        getJobById: (jobId) => {
          const state = get();
          return state.jobs.find((j) => j.id === jobId);
        },

        getNextScheduledJobs: (count) => {
          const state = get();
          return state.jobs
            .filter((j) => j.enabled && j.nextRun)
            .sort((a, b) => (a.nextRun?.getTime() ?? 0) - (b.nextRun?.getTime() ?? 0))
            .slice(0, count);
        },
      })),
      {
        name: 'openclaw-cron-storage',
        partialize: (state) => ({
          selectedJobId: state.selectedJobId,
          // Persist default timezone preference
          editor: {
            timezone: state.editor.timezone,
          },
        }),
      }
    ),
    { name: 'OpenClawCronStore' }
  )
);

// Selector hooks
export const useCronJobs = () => useCronStore((state) => state.jobs);
export const useSelectedCronJob = () => useCronStore((state) => state.getSelectedJob());
export const useCronEditor = () => useCronStore((state) => state.editor);
export const useCronRunHistory = () => useCronStore((state) => state.runHistory);
