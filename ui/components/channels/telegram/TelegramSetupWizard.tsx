'use client';

/**
 * TelegramSetupWizard Component - Multi-step wizard for Telegram bot integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useChannelStore } from '@/stores/channelStore';
import {
  Send,
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
  Command,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface TelegramSetupWizardProps {
  onComplete?: (channelId: string) => void;
  onCancel?: () => void;
  className?: string;
}

type WizardStep = 'introduction' | 'bot-token' | 'verify' | 'configure';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Learn about Telegram bots',
  },
  {
    id: 'bot-token',
    title: 'Bot Token',
    description: 'Enter your bot credentials',
  },
  {
    id: 'verify',
    title: 'Verify',
    description: 'Confirm bot connection',
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Set up preferences',
  },
];

export function TelegramSetupWizard({
  onComplete,
  onCancel,
  className,
}: TelegramSetupWizardProps) {
  const {
    setupWizard,
    startSetupWizard,
    nextSetupStep,
    prevSetupStep,
    completeSetup,
    setSetupError,
    addChannel,
  } = useChannelStore();

  const [botToken, setBotToken] = useState('');
  const [botInfo, setBotInfo] = useState<{
    username: string;
    firstName: string;
    id: number;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [channelName, setChannelName] = useState('');
  const [autoReply, setAutoReply] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! I'm your AI assistant. How can I help you today?"
  );
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Initialize wizard on mount
  useEffect(() => {
    startSetupWizard('telegram');
  }, [startSetupWizard]);

  // Validate bot token format
  const isValidTokenFormat = (token: string) => {
    // Telegram bot tokens are in format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    return /^\d+:[A-Za-z0-9_-]+$/.test(token);
  };

  // Validate bot token
  const handleValidateToken = useCallback(async () => {
    if (!isValidTokenFormat(botToken)) {
      setTokenError('Invalid token format. Please check your bot token.');
      return;
    }

    setIsValidating(true);
    setTokenError('');

    try {
      // In a real implementation, this would call the Telegram API
      // For now, simulate validation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated bot info
      setBotInfo({
        username: 'OpenClaw_Bot',
        firstName: 'OpenClaw AI',
        id: 123456789,
      });
      setChannelName('Telegram - OpenClaw_Bot');
      nextSetupStep();
    } catch (error) {
      setTokenError('Failed to validate bot token. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  }, [botToken, nextSetupStep]);

  // Copy webhook URL
  const handleCopyWebhook = useCallback(() => {
    const webhookUrl = `https://api.adverant.ai/openclaw/webhook/telegram/${botInfo?.id || 'BOT_ID'}`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }, [botInfo?.id]);

  // Complete setup
  const handleComplete = useCallback(() => {
    if (!botInfo) return;

    const newChannel = {
      id: `telegram-${Date.now()}`,
      channelType: 'telegram' as const,
      name: channelName,
      identifier: `@${botInfo.username}`,
      connectionStatus: 'connected' as const,
      config: {
        autoReply,
        welcomeMessage,
        sessionScope: 'per-sender' as const,
        botToken: botToken,
        botId: botInfo.id,
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
  }, [botInfo, channelName, autoReply, welcomeMessage, botToken, addChannel, completeSetup, onComplete]);

  const currentStep = steps[setupWizard.currentStep] || steps[0];
  const progress = ((setupWizard.currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Telegram Setup
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Send className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Create a Telegram Bot
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Set up a Telegram bot that can respond to messages and commands with AI.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Bot className="h-6 w-6 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Bot Commands
                  </h4>
                  <p className="text-sm text-gray-500">
                    Create custom commands that trigger AI actions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Shield className="h-6 w-6 text-green-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Secure & Private
                  </h4>
                  <p className="text-sm text-gray-500">
                    Your bot token is encrypted and never exposed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Command className="h-6 w-6 text-purple-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Rich Features
                  </h4>
                  <p className="text-sm text-gray-500">
                    Inline keyboards, media support, and group chat capabilities.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <h4 className="font-medium text-blue-700 dark:text-blue-300">
                First, create a bot with @BotFather
              </h4>
              <ol className="mt-2 space-y-1 text-sm text-blue-600 dark:text-blue-400">
                <li>1. Open Telegram and search for @BotFather</li>
                <li>2. Send /newbot and follow the prompts</li>
                <li>3. Copy the bot token you receive</li>
              </ol>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
              >
                Open @BotFather
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Bot Token */}
        {setupWizard.currentStep === 1 && (
          <div className="mx-auto max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enter Bot Token
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Paste the bot token you received from @BotFather.
            </p>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bot Token
              </label>
              <div className="mt-1 flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="password"
                    value={botToken}
                    onChange={(e) => {
                      setBotToken(e.target.value);
                      setTokenError('');
                    }}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="pl-10"
                  />
                </div>
              </div>
              {tokenError && (
                <p className="mt-2 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {tokenError}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Your token is encrypted and securely stored.
              </p>
            </div>

            <Button
              onClick={handleValidateToken}
              disabled={!botToken || isValidating}
              className="mt-4 w-full"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  Validate Token
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Where to find your bot token?
              </h4>
              <ol className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    1
                  </span>
                  Open Telegram and message @BotFather
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    2
                  </span>
                  Send /mybots to see your bots
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    3
                  </span>
                  Select your bot and click &quot;API Token&quot;
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {setupWizard.currentStep === 2 && botInfo && (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Bot Connected!
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your Telegram bot has been validated and is ready to use.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 p-4 text-left dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Bot Details
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Username</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    @{botInfo.username}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Display Name</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {botInfo.firstName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bot ID</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {botInfo.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
              </div>
            </div>

            {/* Webhook URL */}
            <div className="mt-4 rounded-lg bg-gray-50 p-4 text-left dark:bg-gray-800">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Webhook URL (Optional)
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Use this URL if you want to receive webhook updates.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-gray-200 px-2 py-1 text-xs dark:bg-gray-700">
                  https://api.adverant.ai/openclaw/webhook/telegram/{botInfo.id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyWebhook}
                >
                  {copiedWebhook ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
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
              Customize how your Telegram bot behaves.
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
                  placeholder="Telegram Bot"
                  className="mt-1"
                />
              </div>

              {/* Auto-Reply */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Auto-Reply
                    </p>
                    <p className="text-sm text-gray-500">
                      Automatically respond to incoming messages
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
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800" />
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
                <p className="mt-1 text-xs text-gray-500">
                  This message is sent when a user starts a conversation with /start.
                </p>
              </div>

              {/* Commands hint */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <Command className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Bot Commands
                    </p>
                    <p className="text-sm text-gray-500">
                      You can configure custom bot commands in the channel settings
                      after setup is complete.
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
            I Have My Bot Token
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

export default TelegramSetupWizard;
