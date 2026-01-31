'use client';

/**
 * CronJobDetailPanel Component - Cron job configuration and history display
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CronExpressionBuilder } from './CronExpressionBuilder';
import { useCronStore, useSelectedCronJob, useCronRunHistory, TIMEZONES } from '@/stores/cronStore';
import { useSkillStore, useSkills } from '@/stores/skillStore';
import {
  Clock,
  Save,
  Play,
  Pause,
  Trash2,
  X,
  Settings,
  Sparkles,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
  Globe,
  Edit,
  RotateCcw,
} from 'lucide-react';
import type { CronJob, CronJobStatus } from '@/stores/cronStore';

interface CronJobDetailPanelProps {
  onClose?: () => void;
  className?: string;
}

// Status configuration
const statusConfig: Record<
  CronJobStatus,
  { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  active: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle,
    label: 'Active',
  },
  paused: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Pause,
    label: 'Paused',
  },
  running: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Play,
    label: 'Running',
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertCircle,
    label: 'Error',
  },
};

// Format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function CronJobDetailPanel({
  onClose,
  className,
}: CronJobDetailPanelProps) {
  const selectedJob = useSelectedCronJob();
  const runHistory = useCronRunHistory(selectedJob?.id || '');
  const skills = useSkills();
  const {
    updateJob,
    toggleJobEnabled,
    runJobNow,
    deleteJob,
  } = useCronStore();

  const [editMode, setEditMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [formValues, setFormValues] = useState<Partial<CronJob>>({});

  // Initialize form values when job changes
  useEffect(() => {
    if (selectedJob) {
      setFormValues({
        name: selectedJob.name,
        schedule: selectedJob.schedule,
        timezone: selectedJob.timezone,
        skillName: selectedJob.skillName,
        skillParams: selectedJob.skillParams,
      });
    }
  }, [selectedJob?.id]);

  // Handle form field change
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!selectedJob) return;
    updateJob(selectedJob.id, formValues);
    setEditMode(false);
  }, [selectedJob, formValues, updateJob]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (selectedJob) {
      setFormValues({
        name: selectedJob.name,
        schedule: selectedJob.schedule,
        timezone: selectedJob.timezone,
        skillName: selectedJob.skillName,
        skillParams: selectedJob.skillParams,
      });
    }
    setEditMode(false);
  }, [selectedJob]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedJob) return;
    if (window.confirm('Are you sure you want to delete this cron job? This action cannot be undone.')) {
      deleteJob(selectedJob.id);
    }
  }, [selectedJob, deleteJob]);

  // Calculate next runs
  const getNextRuns = useCallback((schedule: string, count: number = 5) => {
    // Simple mock implementation - in real app would use cron parser
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(now);
      date.setHours(date.getHours() + (i + 1) * 24);
      return date;
    });
  }, []);

  if (!selectedJob) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center p-8 text-center', className)}>
        <Clock className="h-12 w-12 text-gray-300 dark:text-gray-700" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Select a cron job to view details and configure
        </p>
      </div>
    );
  }

  const status = statusConfig[selectedJob.status];
  const StatusIcon = status.icon;
  const nextRuns = getNextRuns(selectedJob.schedule);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                status.bgColor
              )}
            >
              <Clock className={cn('h-6 w-6', status.color)} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedJob.name}
              </h2>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn('text-xs', status.bgColor, status.color)}
                >
                  <StatusIcon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
                {!selectedJob.enabled && (
                  <Badge variant="outline" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleJobEnabled(selectedJob.id)}
          >
            {selectedJob.enabled ? (
              <>
                <Pause className="mr-1.5 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-4 w-4" />
                Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runJobNow(selectedJob.id)}
            disabled={selectedJob.status === 'running'}
          >
            <Play className="mr-1.5 h-4 w-4" />
            Run Now
          </Button>
          {!editMode ? (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Edit className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Schedule Section */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Calendar className="h-4 w-4" />
            Schedule
          </h3>

          {editMode ? (
            <CronExpressionBuilder
              value={formValues.schedule || selectedJob.schedule}
              onChange={(value) => handleFieldChange('schedule', value)}
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <p className="font-mono text-lg text-gray-900 dark:text-white">
                  {selectedJob.schedule}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {/* This would be a human-readable description */}
                  Schedule expression
                </p>
              </div>

              {/* Timezone */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <Globe className="h-4 w-4" />
                  Timezone
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedJob.timezone}
                </span>
              </div>

              {/* Next runs */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Next 5 Runs:
                </p>
                <div className="space-y-1">
                  {nextRuns.map((date, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <Calendar className="h-3 w-3" />
                      {date.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Skill Section */}
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <Sparkles className="h-4 w-4" />
            Skill to Execute
          </h3>

          {editMode ? (
            <div className="space-y-4">
              <select
                value={formValues.skillName || selectedJob.skillName}
                onChange={(e) => handleFieldChange('skillName', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.name}>
                    {skill.displayName}
                  </option>
                ))}
              </select>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Skill Parameters (JSON)
                </label>
                <textarea
                  value={JSON.stringify(formValues.skillParams || selectedJob.skillParams, null, 2)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      handleFieldChange('skillParams', params);
                    } catch {
                      // Invalid JSON, keep the string
                    }
                  }}
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedJob.skillName}
                </span>
              </div>
              {selectedJob.skillParams && Object.keys(selectedJob.skillParams).length > 0 && (
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {JSON.stringify(selectedJob.skillParams, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Job Name (edit mode) */}
        {editMode && (
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Job Name
            </label>
            <Input
              value={formValues.name || selectedJob.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
            />
          </div>
        )}

        {/* Run History */}
        <div className="mb-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Run History ({runHistory.length})
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {runHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No run history yet.</p>
              ) : (
                runHistory.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      {run.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(run.durationMs)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
            Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {selectedJob.runCount}
              </p>
              <p className="text-xs text-gray-500">Total Runs</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {runHistory.filter((r) => r.status === 'success').length}
              </p>
              <p className="text-xs text-gray-500">Successful</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <Button
          variant="outline"
          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Cron Job
        </Button>
      </div>
    </div>
  );
}

export default CronJobDetailPanel;
