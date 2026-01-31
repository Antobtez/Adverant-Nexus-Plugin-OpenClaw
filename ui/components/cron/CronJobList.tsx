'use client';

/**
 * CronJobList Component - List of scheduled cron jobs with filtering
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CronJobCard } from './CronJobCard';
import { useCronStore, useCronJobs, useSelectedCronJob } from '@/stores/cronStore';
import {
  Search,
  Plus,
  Clock,
  CheckCircle,
  Pause,
  AlertCircle,
  Play,
  Loader2,
  Calendar,
  BarChart3,
} from 'lucide-react';
import type { CronJobStatus } from '@/stores/cronStore';

interface CronJobListProps {
  onAddJob?: () => void;
  className?: string;
}

type FilterStatus = 'all' | CronJobStatus;

export function CronJobList({ onAddJob, className }: CronJobListProps) {
  const jobs = useCronJobs();
  const selectedJob = useSelectedCronJob();
  const { selectJob, toggleJobEnabled, deleteJob, runJobNow, duplicateJob, isLoading, error } = useCronStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = job.name.toLowerCase().includes(query);
        const matchesSkill = job.skillName.toLowerCase().includes(query);
        if (!matchesName && !matchesSkill) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter((j) => j.status === 'active').length,
      paused: jobs.filter((j) => j.status === 'paused').length,
      running: jobs.filter((j) => j.status === 'running').length,
      error: jobs.filter((j) => j.status === 'error').length,
      totalRuns: jobs.reduce((acc, j) => acc + j.runCount, 0),
    };
  }, [jobs]);

  // Handle job selection
  const handleSelectJob = (jobId: string) => {
    selectJob(jobId);
  };

  // Handle job deletion with confirmation
  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this cron job? This action cannot be undone.')) {
      deleteJob(jobId);
    }
  };

  // Handle toggle enabled
  const handleToggleEnabled = (jobId: string) => {
    toggleJobEnabled(jobId);
  };

  // Handle run now
  const handleRunNow = (jobId: string) => {
    runJobNow(jobId);
  };

  // Handle duplicate
  const handleDuplicate = (jobId: string) => {
    duplicateJob(jobId);
  };

  if (isLoading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading cron jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Automation
          </h2>
          <Button size="sm" onClick={onAddJob}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Cron Job
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search cron jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('all')}
          >
            All ({stats.total})
          </Badge>
          <Badge
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('active')}
          >
            <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
            Active ({stats.active})
          </Badge>
          <Badge
            variant={statusFilter === 'paused' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setStatusFilter('paused')}
          >
            <Pause className="mr-1 h-3 w-3 text-yellow-500" />
            Paused ({stats.paused})
          </Badge>
          {stats.running > 0 && (
            <Badge
              variant={statusFilter === 'running' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('running')}
            >
              <Play className="mr-1 h-3 w-3 text-blue-500" />
              Running ({stats.running})
            </Badge>
          )}
          {stats.error > 0 && (
            <Badge
              variant={statusFilter === 'error' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter('error')}
            >
              <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
              Error ({stats.error})
            </Badge>
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.total}
            </p>
            <p className="text-xs text-gray-500">Total Jobs</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.active}
            </p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2 text-center dark:bg-gray-800">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {stats.totalRuns}
            </p>
            <p className="text-xs text-gray-500">Total Runs</p>
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredJobs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Clock className="h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {jobs.length === 0
                ? 'No cron jobs scheduled'
                : 'No cron jobs match your filters'}
            </p>
            {jobs.length === 0 && (
              <Button size="sm" className="mt-4" onClick={onAddJob}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Your First Cron Job
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <CronJobCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => handleSelectJob(job.id)}
                onToggleEnabled={() => handleToggleEnabled(job.id)}
                onRunNow={() => handleRunNow(job.id)}
                onDelete={() => handleDeleteJob(job.id)}
                onDuplicate={() => handleDuplicate(job.id)}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CronJobList;
