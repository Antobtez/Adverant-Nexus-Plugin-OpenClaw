'use client';

/**
 * SettingsPanel Component - Main settings configuration panel
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAppStore, useUser, useTheme } from '@/stores/appStore';
import {
  Settings,
  User,
  Palette,
  Bell,
  Shield,
  Key,
  Globe,
  Brain,
  Save,
  LogOut,
  Trash2,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface SettingsToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingsToggle({ label, description, checked, onCheckedChange }: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface SettingsPanelProps {
  className?: string;
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const user = useUser();
  const theme = useTheme();
  const { setTheme, logout } = useAppStore();

  // Local state for settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    skillComplete: true,
    cronComplete: false,
    channelDisconnect: true,
  });

  const [apiKeys, setApiKeys] = useState({
    anthropic: '••••••••••••••••',
    openrouter: '••••••••••••••••',
    openai: '',
  });

  const [modelProvider, setModelProvider] = useState('anthropic');

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  // Handle logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // In real app, would call API to delete account
      console.log('Deleting account...');
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-500">
              Manage your account and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Account Section */}
          <SettingsSection
            title="Account"
            description="Your account information"
            icon={User}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.email || 'Not logged in'}
                  </p>
                </div>
                <Badge variant="outline">
                  {user?.tier === 'government'
                    ? 'Government'
                    : user?.tier === 'teams'
                    ? 'Teams'
                    : 'Open Source'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.name || 'Anonymous'}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-500">Organization</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.organizationId || 'Personal'}
                  </p>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Appearance Section */}
          <SettingsSection
            title="Appearance"
            description="Customize how OpenClaw looks"
            icon={Palette}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    )}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-sm font-medium">Light</span>
                    {theme === 'light' && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    )}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-sm font-medium">Dark</span>
                    {theme === 'dark' && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 transition-colors',
                      theme === 'system'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    )}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-sm font-medium">System</span>
                    {theme === 'system' && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Model Provider Section */}
          <SettingsSection
            title="Model Provider"
            description="Configure your AI model preferences"
            icon={Brain}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Default Provider
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'anthropic', name: 'Anthropic', model: 'Claude 3.5 Sonnet' },
                    { id: 'openrouter', name: 'OpenRouter', model: 'Multiple Models' },
                    { id: 'openai', name: 'OpenAI', model: 'GPT-4' },
                    { id: 'local', name: 'Local', model: 'Ollama / LM Studio' },
                  ].map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setModelProvider(provider.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-3 text-left transition-colors',
                        modelProvider === provider.id
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {provider.name}
                        </p>
                        <p className="text-xs text-gray-500">{provider.model}</p>
                      </div>
                      {modelProvider === provider.id && (
                        <Check className="h-4 w-4 text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* API Keys Section */}
          <SettingsSection
            title="API Keys"
            description="Manage your API credentials"
            icon={Key}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Anthropic API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKeys.anthropic}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, anthropic: e.target.value }))
                    }
                    placeholder="sk-ant-..."
                  />
                  <Button variant="outline" size="sm">
                    Save
                  </Button>
                </div>
                {apiKeys.anthropic && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    API key configured
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenRouter API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKeys.openrouter}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, openrouter: e.target.value }))
                    }
                    placeholder="sk-or-..."
                  />
                  <Button variant="outline" size="sm">
                    Save
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  OpenAI API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) =>
                      setApiKeys((prev) => ({ ...prev, openai: e.target.value }))
                    }
                    placeholder="sk-..."
                  />
                  <Button variant="outline" size="sm">
                    Save
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-xs text-gray-500">
                  API keys are encrypted and stored securely. They are never shared or exposed.
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* Notifications Section */}
          <SettingsSection
            title="Notifications"
            description="Control how you receive notifications"
            icon={Bell}
          >
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <SettingsToggle
                label="Email Notifications"
                description="Receive email notifications for important events"
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, email: checked }))
                }
              />
              <SettingsToggle
                label="Push Notifications"
                description="Receive browser push notifications"
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, push: checked }))
                }
              />
              <SettingsToggle
                label="Skill Completion"
                description="Notify when a skill execution completes"
                checked={notifications.skillComplete}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, skillComplete: checked }))
                }
              />
              <SettingsToggle
                label="Cron Job Completion"
                description="Notify when scheduled jobs complete"
                checked={notifications.cronComplete}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, cronComplete: checked }))
                }
              />
              <SettingsToggle
                label="Channel Disconnect"
                description="Notify when a channel disconnects"
                checked={notifications.channelDisconnect}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, channelDisconnect: checked }))
                }
              />
            </div>
          </SettingsSection>

          {/* Security Section */}
          <SettingsSection
            title="Security"
            description="Manage your security settings"
            icon={Shield}
          >
            <div className="space-y-4">
              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>

              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Active Sessions
                  </p>
                  <p className="text-sm text-gray-500">
                    View and manage active sessions
                  </p>
                </div>
                <Badge variant="secondary">3 active</Badge>
              </button>

              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Audit Log
                  </p>
                  <p className="text-sm text-gray-500">
                    View account activity history
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </SettingsSection>

          {/* Danger Zone */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
            <h3 className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Irreversible and destructive actions
            </p>

            <div className="mt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-red-200 text-red-600 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
