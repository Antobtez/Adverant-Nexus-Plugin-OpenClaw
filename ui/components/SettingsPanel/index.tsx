'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Brain,
  Clock,
  Bell,
  Key,
  Save,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/lib/api-client';

interface SettingsData {
  modelProvider: 'anthropic' | 'openai' | 'openrouter';
  sessionTimeout: number;
  notifications: {
    email: boolean;
    slack: boolean;
    webhook?: string;
  };
}

export function SettingsPanel() {
  const [hasChanges, setHasChanges] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsData>({
    modelProvider: 'anthropic',
    sessionTimeout: 3600,
    notifications: {
      email: true,
      slack: false,
    },
  });
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.settings.get(),
  });

  // Fetch quota data for display
  const { data: quota } = useQuery({
    queryKey: ['analytics', 'quota'],
    queryFn: () => apiClient.analytics.getQuota(),
  });

  // Load settings into form
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (newSettings: Partial<SettingsData>) =>
      apiClient.settings.update(newSettings),
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleFormChange = (updates: Partial<SettingsData>) => {
    setSettingsForm({ ...settingsForm, ...updates });
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settingsForm);
  };

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure your OpenClaw plugin preferences
              </CardDescription>
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Model Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Model Provider</CardTitle>
              <CardDescription>
                Choose your preferred LLM provider for OpenClaw
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Provider</label>
              <Select
                value={settingsForm.modelProvider}
                onValueChange={(value: any) =>
                  handleFormChange({ modelProvider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">
                    <div className="flex items-center gap-2">
                      Anthropic Claude
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                <strong>Current Provider:</strong> {settingsForm.modelProvider}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {settingsForm.modelProvider === 'anthropic' &&
                  'Claude Sonnet 4.5 - Best for complex reasoning and multi-tool orchestration'}
                {settingsForm.modelProvider === 'openai' &&
                  'GPT-4 Turbo - Fast and reliable for general tasks'}
                {settingsForm.modelProvider === 'openrouter' &&
                  'Access to multiple models with unified API'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Session Configuration</CardTitle>
              <CardDescription>
                Manage session timeout and behavior
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Session Timeout (seconds)
              </label>
              <Input
                type="number"
                min="60"
                max="86400"
                value={settingsForm.sessionTimeout}
                onChange={(e) =>
                  handleFormChange({ sessionTimeout: parseInt(e.target.value) })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Inactive sessions will close after this duration (60s - 24h)
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                <strong>Current:</strong>{' '}
                {Math.floor(settingsForm.sessionTimeout / 60)} minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Bell className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>
                Configure how you receive alerts and updates
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive alerts via email
                </p>
              </div>
              <Switch
                checked={settingsForm.notifications.email}
                onCheckedChange={(checked) =>
                  handleFormChange({
                    notifications: { ...settingsForm.notifications, email: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Slack Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send alerts to Slack workspace
                </p>
              </div>
              <Switch
                checked={settingsForm.notifications.slack}
                onCheckedChange={(checked) =>
                  handleFormChange({
                    notifications: { ...settingsForm.notifications, slack: checked },
                  })
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Webhook URL (optional)
              </label>
              <Input
                type="url"
                placeholder="https://your-webhook.com/endpoint"
                value={settingsForm.notifications.webhook || ''}
                onChange={(e) =>
                  handleFormChange({
                    notifications: {
                      ...settingsForm.notifications,
                      webhook: e.target.value,
                    },
                  })
                }
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Receive JSON payloads for custom integrations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys (view only) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/10 p-2">
              <Key className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">API Keys</CardTitle>
              <CardDescription>
                Manage your OpenClaw API credentials
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                OpenClaw API Key
              </label>
              <div className="flex gap-2">
                <Input type="password" value="sk-oc-••••••••••••••••" disabled />
                <Button variant="outline">Regenerate</Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Keep your API key secure. Never share it publicly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quota Display */}
      {quota && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage & Quota</CardTitle>
            <CardDescription>
              Your current API usage and limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">API Requests</span>
                  <span className="text-sm text-muted-foreground">
                    {quota.used.toLocaleString()} / {quota.total.toLocaleString()}
                  </span>
                </div>
                <Progress value={quota.percentage} />
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                <div>
                  <p className="text-sm font-medium">Reset Date</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(quota.resetDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <Badge
                  variant={
                    quota.percentage >= 90
                      ? 'destructive'
                      : quota.percentage >= 75
                      ? 'warning'
                      : 'success'
                  }
                >
                  {quota.percentage}% used
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Confirmation */}
      {saveMutation.isSuccess && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-medium">Settings saved successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
