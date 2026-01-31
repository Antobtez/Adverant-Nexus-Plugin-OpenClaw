'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Clock,
  Loader2,
  CheckCircle2,
  Edit,
} from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  skillId: string;
  parameters: Record<string, any>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

// Cron presets for quick selection
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'First day of month', value: '0 0 1 * *' },
  { label: 'Custom', value: 'custom' },
];

export function CronEditor() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [jobForm, setJobForm] = useState({
    name: '',
    schedule: '0 * * * *',
    skillId: '',
    parameters: {} as Record<string, any>,
  });
  const [selectedPreset, setSelectedPreset] = useState('0 * * * *');
  const queryClient = useQueryClient();

  // Fetch cron jobs
  const { data: cronJobs = [], isLoading } = useQuery({
    queryKey: ['cron', 'list'],
    queryFn: () => apiClient.cron.list(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch skills for dropdown
  const { data: skills = [] } = useQuery({
    queryKey: ['skills', 'list'],
    queryFn: () => apiClient.skills.list(),
  });

  // Create cron job mutation
  const createMutation = useMutation({
    mutationFn: (job: typeof jobForm) => apiClient.cron.create(job),
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['cron', 'list'] });
    },
  });

  // Update cron job mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, job }: { id: string; job: Partial<CronJob> }) =>
      apiClient.cron.update(id, job),
    onSuccess: () => {
      setEditingJob(null);
      queryClient.invalidateQueries({ queryKey: ['cron', 'list'] });
    },
  });

  // Delete cron job mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.cron.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron', 'list'] });
    },
  });

  // Run now mutation
  const runNowMutation = useMutation({
    mutationFn: (id: string) => apiClient.cron.runNow(id),
  });

  const resetForm = () => {
    setJobForm({
      name: '',
      schedule: '0 * * * *',
      skillId: '',
      parameters: {},
    });
    setSelectedPreset('0 * * * *');
  };

  const handleCreateJob = () => {
    createMutation.mutate(jobForm);
  };

  const handleToggleEnabled = (job: CronJob) => {
    updateMutation.mutate({
      id: job.id,
      job: { enabled: !job.enabled },
    });
  };

  const handleDeleteJob = (id: string) => {
    if (confirm('Are you sure you want to delete this cron job?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRunNow = (id: string) => {
    runNowMutation.mutate(id);
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setJobForm({ ...jobForm, schedule: preset });
    }
  };

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading cron jobs...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scheduled Tasks</CardTitle>
              <CardDescription>
                Automate skill execution with cron jobs
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Cron Jobs Table */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Schedule</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Skill</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Run</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Next Run</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cronJobs.map((job) => {
                  const skill = skills.find((s) => s.id === job.skillId);

                  return (
                    <tr key={job.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{job.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {job.schedule}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{skill?.name || job.skillId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          {job.lastRun
                            ? format(new Date(job.lastRun), 'MMM d, HH:mm')
                            : 'Never'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-muted-foreground">
                          {job.nextRun
                            ? format(new Date(job.nextRun), 'MMM d, HH:mm')
                            : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={job.enabled}
                            onCheckedChange={() => handleToggleEnabled(job)}
                          />
                          <Badge variant={job.enabled ? 'success' : 'secondary'}>
                            {job.enabled ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRunNow(job.id)}
                            disabled={runNowMutation.isPending}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingJob(job)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {cronJobs.length === 0 && (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No scheduled tasks</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first cron job to automate skill execution
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingJob}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingJob(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingJob ? 'Edit' : 'Create'} Cron Job</DialogTitle>
            <DialogDescription>
              Schedule automatic skill execution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Job Name</label>
              <Input
                placeholder="Daily backup"
                value={jobForm.name}
                onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Schedule Preset</label>
              <Select value={selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPreset === 'custom' && (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cron Expression
                </label>
                <Input
                  placeholder="* * * * *"
                  value={jobForm.schedule}
                  onChange={(e) => setJobForm({ ...jobForm, schedule: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Format: minute hour day month weekday
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium">Skill to Execute</label>
              <Select
                value={jobForm.skillId}
                onValueChange={(value) => setJobForm({ ...jobForm, skillId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show parameters for selected skill */}
            {jobForm.skillId && (
              <div>
                <label className="mb-2 block text-sm font-medium">Parameters (JSON)</label>
                <Input
                  placeholder='{"key": "value"}'
                  value={JSON.stringify(jobForm.parameters)}
                  onChange={(e) => {
                    try {
                      const params = JSON.parse(e.target.value);
                      setJobForm({ ...jobForm, parameters: params });
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingJob(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateJob}
              disabled={!jobForm.name || !jobForm.skillId || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {editingJob ? 'Update' : 'Create'} Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
