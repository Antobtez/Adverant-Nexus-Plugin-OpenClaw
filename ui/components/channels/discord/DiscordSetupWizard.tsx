'use client';

/**
 * DiscordSetupWizard Component - Bot setup wizard for Discord integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useChannelStore } from '@/stores/channelStore';
import {
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Bot,
  Key,
  Settings,
  Loader2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Shield,
  Server,
  X,
  Copy,
  Check,
  Link,
  Gamepad2,
} from 'lucide-react';

interface DiscordSetupWizardProps {
  onComplete?: (channelId: string) => void;
  onCancel?: () => void;
  className?: string;
}

type WizardStep = 'introduction' | 'bot-token' | 'invite' | 'configure';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Learn about Discord bots',
  },
  {
    id: 'bot-token',
    title: 'Bot Token',
    description: 'Enter credentials',
  },
  {
    id: 'invite',
    title: 'Invite Bot',
    description: 'Add to your server',
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Set up preferences',
  },
];

// Required bot permissions
const requiredPermissions = [
  { name: 'Send Messages', value: 0x800, description: 'Send messages in channels' },
  { name: 'Read Message History', value: 0x10000, description: 'View channel history' },
  { name: 'Embed Links', value: 0x4000, description: 'Embed links in messages' },
  { name: 'Attach Files', value: 0x8000, description: 'Upload files' },
  { name: 'Add Reactions', value: 0x40, description: 'React to messages' },
  { name: 'Use Slash Commands', value: 0x80000000, description: 'Register slash commands' },
];

export function DiscordSetupWizard({
  onComplete,
  onCancel,
  className,
}: DiscordSetupWizardProps) {
  const {
    setupWizard,
    startSetupWizard,
    nextSetupStep,
    prevSetupStep,
    completeSetup,
    addChannel,
  } = useChannelStore();

  const [botToken, setBotToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [botInfo, setBotInfo] = useState<{
    username: string;
    discriminator: string;
    id: string;
    avatar?: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [channelName, setChannelName] = useState('');
  const [autoReply, setAutoReply] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! I'm your AI assistant. How can I help you today?"
  );
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [serverJoined, setServerJoined] = useState(false);

  // Initialize wizard on mount
  useEffect(() => {
    startSetupWizard('discord');
  }, [startSetupWizard]);

  // Calculate permission integer
  const permissionInt = requiredPermissions.reduce((acc, p) => acc | p.value, 0);

  // Generate invite URL
  const inviteUrl = clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissionInt}&scope=bot%20applications.commands`
    : '';

  // Validate bot token
  const handleValidateToken = useCallback(async () => {
    if (!botToken || !clientId) {
      setTokenError('Please enter both the bot token and client ID.');
      return;
    }

    setIsValidating(true);
    setTokenError('');

    try {
      // In a real implementation, this would validate with Discord API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated bot info
      setBotInfo({
        username: 'OpenClaw',
        discriminator: '0001',
        id: clientId,
      });
      setChannelName('Discord - OpenClaw');
      nextSetupStep();
    } catch (error) {
      setTokenError('Failed to validate bot credentials. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  }, [botToken, clientId, nextSetupStep]);

  // Copy invite URL
  const handleCopyInvite = useCallback(() => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  }, [inviteUrl]);

  // Simulate checking if bot joined server
  const handleCheckServer = useCallback(async () => {
    setIsValidating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setServerJoined(true);
    setIsValidating(false);
  }, []);

  // Complete setup
  const handleComplete = useCallback(() => {
    if (!botInfo) return;

    const newChannel = {
      id: `discord-${Date.now()}`,
      channelType: 'discord' as const,
      name: channelName,
      identifier: `${botInfo.username}#${botInfo.discriminator}`,
      connectionStatus: 'connected' as const,
      config: {
        autoReply,
        welcomeMessage,
        sessionScope: 'per-sender' as const,
        botToken: botToken,
        clientId: clientId,
        botUsername: botInfo.username,
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
  }, [botInfo, channelName, autoReply, welcomeMessage, botToken, clientId, addChannel, completeSetup, onComplete]);

  const currentStep = steps[setupWizard.currentStep] || steps[0];
  const progress = ((setupWizard.currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Gamepad2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Discord Setup
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
                      isCurrent && 'bg-indigo-500 text-white',
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <Gamepad2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Create a Discord Bot
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Add an AI-powered bot to your Discord server for intelligent assistance.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Server className="h-6 w-6 text-indigo-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Server Commands
                  </h4>
                  <p className="text-sm text-gray-500">
                    Use slash commands in any channel where the bot is present.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Shield className="h-6 w-6 text-green-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Role-Based Permissions
                  </h4>
                  <p className="text-sm text-gray-500">
                    Control who can interact with the bot using Discord roles.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <MessageSquare className="h-6 w-6 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Rich Embeds
                  </h4>
                  <p className="text-sm text-gray-500">
                    Beautiful, formatted responses with embeds and attachments.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
              <h4 className="font-medium text-indigo-700 dark:text-indigo-300">
                First, create a bot application
              </h4>
              <ol className="mt-2 space-y-1 text-sm text-indigo-600 dark:text-indigo-400">
                <li>1. Go to the Discord Developer Portal</li>
                <li>2. Create a new Application</li>
                <li>3. Go to the &quot;Bot&quot; section and create a bot</li>
                <li>4. Copy the bot token and client ID</li>
              </ol>
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300"
              >
                Open Developer Portal
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Bot Token */}
        {setupWizard.currentStep === 1 && (
          <div className="mx-auto max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enter Bot Credentials
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter your bot token and application client ID.
            </p>

            <div className="mt-6 space-y-4">
              {/* Client ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Application ID (Client ID)
                </label>
                <div className="mt-1">
                  <Input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="123456789012345678"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Found in your application&apos;s General Information
                </p>
              </div>

              {/* Bot Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bot Token
                </label>
                <div className="mt-1 relative">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="password"
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      setTokenError('');
                    }}
                    placeholder="Your bot token..."
                    className="pl-10"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Found in your application&apos;s Bot settings
                </p>
              </div>

              {tokenError && (
                <p className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {tokenError}
                </p>
              )}
            </div>

            <Button
              onClick={handleValidateToken}
              disabled={!botToken || !clientId || isValidating}
              className="mt-6 w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Validate Credentials
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Important: Enable Intents
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                Make sure you&apos;ve enabled these intents in your bot settings:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Message Content Intent
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Server Members Intent
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Invite Bot */}
        {setupWizard.currentStep === 2 && botInfo && (
          <div className="mx-auto max-w-md">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Credentials Verified!
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Now add the bot to your Discord server.
              </p>
            </div>

            {/* Bot info */}
            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
                  {botInfo.username[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {botInfo.username}#{botInfo.discriminator}
                  </p>
                  <p className="text-sm text-gray-500">ID: {botInfo.id}</p>
                </div>
              </div>
            </div>

            {/* Invite button */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Click to invite the bot to your server:
              </p>
              <div className="flex gap-2">
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white',
                    'bg-indigo-600 hover:bg-indigo-700'
                  )}
                >
                  <Link className="h-5 w-5" />
                  Add to Server
                  <ExternalLink className="h-4 w-4" />
                </a>
                <Button
                  variant="outline"
                  onClick={handleCopyInvite}
                >
                  {copiedInvite ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Required permissions */}
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Required Permissions:
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {requiredPermissions.map((perm) => (
                  <div
                    key={perm.name}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800"
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {perm.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification */}
            <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                After adding the bot to your server, click verify:
              </p>
              <Button
                onClick={handleCheckServer}
                disabled={isValidating || serverJoined}
                className="mt-2 w-full"
                variant={serverJoined ? 'secondary' : 'default'}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : serverJoined ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Bot Verified
                  </>
                ) : (
                  'Verify Bot Joined'
                )}
              </Button>
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
              Customize how your Discord bot behaves.
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
                  placeholder="Discord Bot"
                  className="mt-1"
                />
              </div>

              {/* Auto-Reply */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Auto-Reply
                    </p>
                    <p className="text-sm text-gray-500">
                      Respond when mentioned or DM&apos;d
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
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800" />
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

              {/* Slash commands hint */}
              <div className="rounded-lg bg-indigo-50 p-4 dark:bg-indigo-900/20">
                <div className="flex items-start gap-3">
                  <Bot className="mt-0.5 h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="font-medium text-indigo-900 dark:text-indigo-100">
                      Slash Commands
                    </p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      Use <code className="rounded bg-indigo-200/50 px-1">/openclaw</code> in
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
            I Have My Bot Ready
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}

        {setupWizard.currentStep === 2 && (
          <Button onClick={nextSetupStep} disabled={!serverJoined}>
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

export default DiscordSetupWizard;
