'use client';

/**
 * CronManager Component - Main cron job management container
 *
 * Combines CronJobList and CronJobDetailPanel in a two-panel layout
 * with support for creating new cron jobs.
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TwoPanelLayout } from '@/components/layout/ThreePanelLayout';
import { CronJobList } from './CronJobList';
import { CronJobDetailPanel } from './CronJobDetailPanel';
import { CronExpressionBuilder } from './CronExpressionBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCronStore, TIMEZONES } from '@/stores/cronStore';
import { useSkillStore, useSkills } from '@/stores/skillStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Clock,
  Sparkles,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface CronManagerProps {
  className?: string;
}

type CreateStep = 'schedule' | 'skill' | 'name';

export function CronManager({ className }: CronManagerProps) {
  const skills = useSkills();
  const { addJob, selectJob } = useCronStore();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('schedule');
  const [newJob, setNewJob] = useState({
    name: '',
    schedule: '0 9 * * *',
    timezone: 'UTC',
    skillName: '',
    skillParams: {} as Record<string, unknown>,
  });

  // Handle create dialog open
  const handleOpenCreateDialog = useCallback(() => {
    setNewJob({
      name: '',
      schedule: '0 9 * * *',
      timezone: 'UTC',
      skillName: skills.length > 0 ? skills[0].name : '',
      skillParams: {},
    });
    setCreateStep('schedule');
    setShowCreateDialog(true);
  }, [skills]);

  // Handle create dialog close
  const handleCloseCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
    setCreateStep('schedule');
  }, []);

  // Handle step navigation
  const handleNextStep = useCallback(() => {
    if (createStep === 'schedule') {
      setCreateStep('skill');
    } else if (createStep === 'skill') {
      setCreateStep('name');
    }
  }, [createStep]);

  const handlePrevStep = useCallback(() => {
    if (createStep === 'skill') {
      setCreateStep('schedule');
    } else if (createStep === 'name') {
      setCreateStep('skill');
    }
  }, [createStep]);

  // Handle job creation
  const handleCreateJob = useCallback(() => {
    const jobId = `cron-${Date.now()}`;
    const job = {
      id: jobId,
      name: newJob.name || `Cron Job - ${new Date().toLocaleDateString()}`,
      schedule: newJob.schedule,
      timezone: newJob.timezone,
      skillName: newJob.skillName,
      skillParams: newJob.skillParams,
      enabled: true,
      status: 'active' as const,
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addJob(job);
    selectJob(jobId);
    handleCloseCreateDialog();
  }, [newJob, addJob, selectJob, handleCloseCreateDialog]);

  // Get selected skill schema for params
  const selectedSkill = skills.find((s) => s.name === newJob.skillName);

  return (
    <div className={cn('h-full', className)}>
      <TwoPanelLayout
        leftPanel={
          <CronJobList
            onAddJob={handleOpenCreateDialog}
            className="h-full"
          />
        }
        rightPanel={<CronJobDetailPanel className="h-full" />}
        leftMinSize={30}
        leftDefaultSize={40}
      />

      {/* Create Job Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Cron Job</DialogTitle>
            <DialogDescription>
              Schedule automated tasks to run at specific times.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-4 py-4">
            {(['schedule', 'skill', 'name'] as const).map((step, index) => {
              const isCurrent = step === createStep;
              const isCompleted =
                (step === 'schedule' && createStep !== 'schedule') ||
                (step === 'skill' && createStep === 'name');

              return (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        isCompleted && 'bg-green-500 text-white',
                        isCurrent && 'bg-blue-500 text-white',
                        !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1 text-xs capitalize',
                        isCurrent
                          ? 'font-medium text-gray-900 dark:text-white'
                          : 'text-gray-500'
                      )}
                    >
                      {step}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={cn(
                        'mx-4 h-0.5 w-12',
                        isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div className="min-h-[300px] py-4">
            {/* Step 1: Schedule */}
            {createStep === 'schedule' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Set Schedule
                </h3>
                <CronExpressionBuilder
                  value={newJob.schedule}
                  onChange={(value) => setNewJob((prev) => ({ ...prev, schedule: value }))}
                />

                {/* Timezone selector */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Timezone
                  </label>
                  <select
                    value={newJob.timezone}
                    onChange={(e) => setNewJob((prev) => ({ ...prev, timezone: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Skill */}
            {createStep === 'skill' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Select Skill
                </h3>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Skill to Execute
                  </label>
                  <select
                    value={newJob.skillName}
                    onChange={(e) => setNewJob((prev) => ({ ...prev, skillName: e.target.value, skillParams: {} }))}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  >
                    <option value="">Select a skill...</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.name}>
                        {skill.displayName} - {skill.description?.slice(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                {selectedSkill && (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Skill Parameters (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(newJob.skillParams, null, 2)}
                      onChange={(e) => {
                        try {
                          const params = JSON.parse(e.target.value);
                          setNewJob((prev) => ({ ...prev, skillParams: params }));
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={6}
                      placeholder="{}"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Configure the parameters that will be passed to the skill when executed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Name */}
            {createStep === 'name' && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Name Your Job
                </h3>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Name
                  </label>
                  <Input
                    value={newJob.name}
                    onChange={(e) => setNewJob((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Daily Report Generation"
                  />
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <h4 className="mb-2 font-medium text-gray-900 dark:text-white">
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Schedule:</span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {newJob.schedule}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Timezone:</span>
                      <span className="text-gray-900 dark:text-white">
                        {newJob.timezone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Skill:</span>
                      <span className="text-gray-900 dark:text-white">
                        {newJob.skillName || 'Not selected'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={createStep === 'schedule' ? handleCloseCreateDialog : handlePrevStep}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {createStep === 'schedule' ? 'Cancel' : 'Back'}
            </Button>

            {createStep !== 'name' ? (
              <Button
                onClick={handleNextStep}
                disabled={createStep === 'skill' && !newJob.skillName}
              >
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreateJob}>
                <Save className="mr-1.5 h-4 w-4" />
                Create Cron Job
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CronManager;
