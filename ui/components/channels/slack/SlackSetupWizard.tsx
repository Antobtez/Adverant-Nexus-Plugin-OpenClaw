'use client';

/**
 * SlackSetupWizard Component - OAuth flow wizard for Slack integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useChannelStore } from '@/stores/channelStore';
import {
  Hash,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Building,
  Shield,
  Settings,
  Loader2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  Users,
  X,
  Slack,
  Globe,
  Zap,
} from 'lucide-react';

interface SlackSetupWizardProps {
  onComplete?: (channelId: string) => void;
  onCancel?: () => void;
  className?: string;
}

type WizardStep = 'introduction' | 'authorize' | 'permissions' | 'configure';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Learn about Slack integration',
  },
  {
    id: 'authorize',
    title: 'Authorize',
    description: 'Connect your workspace',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    description: 'Configure access',
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Set up preferences',
  },
];

// Slack permissions/scopes needed
const requiredScopes = [
  { id: 'channels:history', description: 'View messages in public channels', granted: true },
  { id: 'channels:read', description: 'View basic channel info', granted: true },
  { id: 'chat:write', description: 'Send messages', granted: true },
  { id: 'commands', description: 'Add slash commands', granted: true },
  { id: 'im:history', description: 'View direct messages', granted: true },
  { id: 'im:write', description: 'Send direct messages', granted: true },
  { id: 'users:read', description: 'View user info', granted: true },
];

export function SlackSetupWizard({
  onComplete,
  onCancel,
  className,
}: SlackSetupWizardProps) {
  const {
    setupWizard,
    startSetupWizard,
    nextSetupStep,
    prevSetupStep,
    completeSetup,
    addChannel,
  } = useChannelStore();

  const [workspaceInfo, setWorkspaceInfo] = useState<{
    id: string;
    name: string;
    domain: string;
    icon?: string;
  } | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [channelName, setChannelName] = useState('');
  const [autoReply, setAutoReply] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! I'm your AI assistant. How can I help you today?"
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Initialize wizard on mount
  useEffect(() => {
    startSetupWizard('slack');
  }, [startSetupWizard]);

  // Handle OAuth authorization
  const handleAuthorize = useCallback(async () => {
    setIsAuthorizing(true);
    setAuthError('');

    try {
      // In a real implementation, this would open OAuth popup
      // For now, simulate the flow
      const authUrl = `https://slack.com/oauth/v2/authorize?client_id=YOUR_CLIENT_ID&scope=${requiredScopes.map(s => s.id).join(',')}&redirect_uri=${encodeURIComponent('https://api.adverant.ai/openclaw/oauth/slack/callback')}`;

      // Simulate opening popup and receiving callback
      console.log('Opening OAuth URL:', authUrl);

      // Simulate authorization delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulated workspace info
      setWorkspaceInfo({
        id: 'T0123456789',
        name: 'Adverant Workspace',
        domain: 'adverant',
      });
      setChannelName('Slack - Adverant Workspace');
      nextSetupStep();
    } catch (error) {
      setAuthError('Failed to authorize. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  }, [nextSetupStep]);

  // Complete setup
  const handleComplete = useCallback(() => {
    if (!workspaceInfo) return;

    const newChannel = {
      id: `slack-${Date.now()}`,
      channelType: 'slack' as const,
      name: channelName,
      identifier: `${workspaceInfo.name} (${workspaceInfo.domain}.slack.com)`,
      connectionStatus: 'connected' as const,
      config: {
        autoReply,
        welcomeMessage,
        sessionScope: 'per-sender' as const,
        workspaceId: workspaceInfo.id,
        workspaceName: workspaceInfo.name,
        selectedChannels,
      },
      createdAt: new Date(),
      stats: {
        totalSessions: 0,
        totalMessages: 0,
        activeSessions: 0,
      },
    };

    addChannel(newChannel);
    completeSetup(newChannel.id);
    onComplete?.(newChannel.id);
  }, [workspaceInfo, channelName, autoReply, welcomeMessage, selectedChannels, addChannel, completeSetup, onComplete]);

  const currentStep = steps[setupWizard.currentStep] || steps[0];
  const progress = ((setupWizard.currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Slack Setup
              </h2>
              <p className="text-sm text-gray-500">
                Step {setupWizard.currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="mt-4 flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < setupWizard.currentStep;
            const isCurrent = index === setupWizard.currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                      isCompleted && 'bg-green-500 text-white',
                      isCurrent && 'bg-purple-500 text-white',
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
                      'mt-1 text-xs',
                      isCurrent
                        ? 'font-medium text-gray-900 dark:text-white'
                        : 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-8 sm:w-16',
                      isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Step 1: Introduction */}
        {setupWizard.currentStep === 0 && (
          <div className="mx-auto max-w-md">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Hash className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Connect to Slack
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Integrate with your Slack workspace to enable AI-powered assistance
                in channels and direct messages.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Building className="h-6 w-6 text-purple-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Workspace Integration
                  </h4>
                  <p className="text-sm text-gray-500">
                    Works across your entire workspace - channels, DMs, and threads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Zap className="h-6 w-6 text-yellow-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Slash Commands
                  </h4>
                  <p className="text-sm text-gray-500">
                    Use /openclaw commands to trigger AI actions anywhere.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Users className="h-6 w-6 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Team Collaboration
                  </h4>
                  <p className="text-sm text-gray-500">
                    Share AI responses with your team in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>Note:</strong> You&apos;ll need admin permissions or approval to
                install apps in your Slack workspace.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Authorize */}
        {setupWizard.currentStep === 1 && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Authorize OpenClaw
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Click the button below to connect your Slack workspace.
            </p>

            <div className="mt-8">
              <Button
                onClick={handleAuthorize}
                disabled={isAuthorizing}
                size="lg"
                className="bg-[#4A154B] hover:bg-[#3D1140]"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg
                      className="mr-2 h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                    </svg>
                    Add to Slack
                  </>
                )}
              </Button>

              {authError && (
                <p className="mt-4 flex items-center justify-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {authError}
                </p>
              )}
            </div>

            <div className="mt-8 rounded-lg border border-gray-200 p-4 text-left dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                What happens next?
              </h4>
              <ol className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    1
                  </span>
                  You&apos;ll be redirected to Slack&apos;s authorization page
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    2
                  </span>
                  Select the workspace you want to connect
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    3
                  </span>
                  Review and approve the permissions
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    4
                  </span>
                  You&apos;ll be redirected back here automatically
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 3: Permissions */}
        {setupWizard.currentStep === 2 && workspaceInfo && (
          <div className="mx-auto max-w-md">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Workspace Connected!
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {workspaceInfo.name} is now connected.
              </p>
            </div>

            {/* Workspace info */}
            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-lg font-bold text-purple-700">
                  {workspaceInfo.name[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {workspaceInfo.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {workspaceInfo.domain}.slack.com
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions list */}
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                <Lock className="h-4 w-4" />
                Granted Permissions
              </h4>
              <div className="space-y-2">
                {requiredScopes.map((scope) => (
                  <div
                    key={scope.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {scope.description}
                    </span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Configure */}
        {setupWizard.currentStep === 3 && (
          <div className="mx-auto max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Configure Settings
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Customize how OpenClaw behaves in Slack.
            </p>

            <div className="mt-6 space-y-6">
              {/* Channel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Channel Name
                </label>
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Slack Workspace"
                  className="mt-1"
                />
              </div>

              {/* Auto-Reply */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Auto-Reply
                    </p>
                    <p className="text-sm text-gray-500">
                      Automatically respond when mentioned or DM&apos;d
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoReply}
                    onChange={(e) => setAutoReply(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-purple-800" />
                </label>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Welcome Message
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  placeholder="Hello! I'm your AI assistant..."
                />
              </div>

              {/* Slash command hint */}
              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <div className="flex items-start gap-3">
                  <Zap className="mt-0.5 h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900 dark:text-purple-100">
                      Slash Commands
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Use <code className="rounded bg-purple-200/50 px-1">/openclaw</code> in
                      any channel to interact with your AI assistant.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {setupWizard.error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{setupWizard.error}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 p-4 dark:border-gray-800">
        <Button
          variant="outline"
          onClick={setupWizard.currentStep > 0 ? prevSetupStep : onCancel}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {setupWizard.currentStep > 0 ? 'Back' : 'Cancel'}
        </Button>

        {setupWizard.currentStep === 0 && (
          <Button onClick={nextSetupStep}>
            Get Started
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {setupWizard.currentStep === 2 && (
          <Button onClick={nextSetupStep}>
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {setupWizard.currentStep === 3 && (
          <Button onClick={handleComplete}>
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Complete Setup
          </Button>
        )}
      </div>
    </div>
  );
}

export default SlackSetupWizard;
