'use client';

/**
 * WhatsAppSetupWizard Component - Multi-step wizard for WhatsApp integration
 * Uses Baileys library pattern for QR code authentication
 */

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useChannelStore } from '@/stores/channelStore';
import {
  Phone,
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  QrCode,
  Shield,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Link,
  Bell,
  X,
} from 'lucide-react';

interface WhatsAppSetupWizardProps {
  onComplete?: (channelId: string) => void;
  onCancel?: () => void;
  className?: string;
}

type WizardStep = 'introduction' | 'qr-code' | 'verify' | 'configure';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Learn about WhatsApp integration',
  },
  {
    id: 'qr-code',
    title: 'Scan QR Code',
    description: 'Link your WhatsApp account',
  },
  {
    id: 'verify',
    title: 'Verify',
    description: 'Confirm connection',
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Set up preferences',
  },
];

export function WhatsAppSetupWizard({
  onComplete,
  onCancel,
  className,
}: WhatsAppSetupWizardProps) {
  const {
    setupWizard,
    whatsAppQrCode,
    whatsAppConnectionStatus,
    startSetupWizard,
    nextSetupStep,
    prevSetupStep,
    completeSetup,
    setSetupError,
    addChannel,
  } = useChannelStore();

  const [channelName, setChannelName] = useState('WhatsApp Business');
  const [autoReply, setAutoReply] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! I'm your AI assistant. How can I help you today?"
  );
  const [qrExpiry, setQrExpiry] = useState(120); // 2 minutes

  // Initialize wizard on mount
  useEffect(() => {
    startSetupWizard('whatsapp');
  }, [startSetupWizard]);

  // QR code expiry countdown
  useEffect(() => {
    if (setupWizard.currentStep === 1 && whatsAppQrCode && qrExpiry > 0) {
      const timer = setInterval(() => {
        setQrExpiry((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [setupWizard.currentStep, whatsAppQrCode, qrExpiry]);

  // Auto-advance when connected
  useEffect(() => {
    if (whatsAppConnectionStatus === 'connected' && setupWizard.currentStep === 1) {
      nextSetupStep();
    }
  }, [whatsAppConnectionStatus, setupWizard.currentStep, nextSetupStep]);

  // Refresh QR code
  const handleRefreshQR = useCallback(() => {
    setQrExpiry(120);
    // This would trigger a new QR code request via WebSocket
    console.log('Refreshing QR code...');
  }, []);

  // Complete setup
  const handleComplete = useCallback(() => {
    const newChannel = {
      id: `whatsapp-${Date.now()}`,
      channelType: 'whatsapp' as const,
      name: channelName,
      identifier: 'Pending verification...',
      connectionStatus: 'connected' as const,
      config: {
        autoReply,
        welcomeMessage,
        sessionScope: 'per-sender' as const,
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
  }, [channelName, autoReply, welcomeMessage, addChannel, completeSetup, onComplete]);

  const currentStep = steps[setupWizard.currentStep] || steps[0];
  const progress = ((setupWizard.currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                WhatsApp Setup
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Phone className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                Connect WhatsApp
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Link your WhatsApp account to enable AI-powered conversations directly
                in the world&apos;s most popular messaging app.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Smartphone className="h-6 w-6 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Multi-Device Support
                  </h4>
                  <p className="text-sm text-gray-500">
                    Your phone doesn&apos;t need to stay online. Messages work even when
                    your phone is off.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <Shield className="h-6 w-6 text-green-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    End-to-End Encrypted
                  </h4>
                  <p className="text-sm text-gray-500">
                    Your messages remain secure with WhatsApp&apos;s encryption.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <MessageSquare className="h-6 w-6 text-purple-500" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Rich Media Support
                  </h4>
                  <p className="text-sm text-gray-500">
                    Send and receive images, documents, voice messages, and more.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Note:</strong> You&apos;ll need your phone with WhatsApp installed
                to scan the QR code in the next step.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: QR Code */}
        {setupWizard.currentStep === 1 && (
          <div className="mx-auto max-w-md text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scan QR Code with WhatsApp
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Open WhatsApp on your phone and scan this QR code to link your account.
            </p>

            {/* QR Code display */}
            <div className="mt-6 flex justify-center">
              <div className="relative rounded-2xl border-4 border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                {whatsAppConnectionStatus === 'scanning' && whatsAppQrCode ? (
                  <>
                    {/* This would be an actual QR code image */}
                    <div className="flex h-64 w-64 items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <QrCode className="h-32 w-32 text-gray-400" />
                    </div>
                    {qrExpiry > 0 && (
                      <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-500">
                        Expires in {Math.floor(qrExpiry / 60)}:
                        {String(qrExpiry % 60).padStart(2, '0')}
                      </div>
                    )}
                  </>
                ) : whatsAppConnectionStatus === 'pairing' ? (
                  <div className="flex h-64 w-64 flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-green-500" />
                    <p className="mt-4 text-gray-600 dark:text-gray-400">
                      Pairing in progress...
                    </p>
                  </div>
                ) : whatsAppConnectionStatus === 'connected' ? (
                  <div className="flex h-64 w-64 flex-col items-center justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <p className="mt-4 font-medium text-green-600">Connected!</p>
                  </div>
                ) : (
                  <div className="flex h-64 w-64 flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                    <p className="mt-4 text-gray-500">Loading QR code...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Refresh button */}
            {qrExpiry === 0 && whatsAppConnectionStatus !== 'connected' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleRefreshQR}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh QR Code
              </Button>
            )}

            {/* Instructions */}
            <div className="mt-6 text-left">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Instructions:
              </h4>
              <ol className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    1
                  </span>
                  Open WhatsApp on your phone
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    2
                  </span>
                  Tap Menu (⋮) or Settings (⚙️)
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    3
                  </span>
                  Tap &quot;Linked Devices&quot;
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    4
                  </span>
                  Tap &quot;Link a Device&quot;
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium dark:bg-gray-700">
                    5
                  </span>
                  Point your phone at this QR code
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {setupWizard.currentStep === 2 && (
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              WhatsApp Connected!
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your WhatsApp account has been successfully linked.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 p-4 text-left dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Account Details
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone Number</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    +1 555-0123
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account Name</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Business Account
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

            <p className="mt-6 text-sm text-gray-500">
              Continue to configure your channel settings in the next step.
            </p>
          </div>
        )}

        {/* Step 4: Configure */}
        {setupWizard.currentStep === 3 && (
          <div className="mx-auto max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Configure Settings
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Customize how your WhatsApp channel behaves.
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
                  placeholder="WhatsApp Business"
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
                  This message is sent when a new conversation starts.
                </p>
              </div>

              {/* Session Scope Info */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <Settings className="mt-0.5 h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Session Scope: Per Sender
                    </p>
                    <p className="text-sm text-gray-500">
                      Each contact will have their own conversation history and context.
                      You can change this in the channel settings later.
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

        {setupWizard.currentStep < steps.length - 1 ? (
          <Button
            onClick={nextSetupStep}
            disabled={
              setupWizard.currentStep === 1 &&
              whatsAppConnectionStatus !== 'connected'
            }
          >
            Continue
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete}>
            <CheckCircle className="mr-1.5 h-4 w-4" />
            Complete Setup
          </Button>
        )}
      </div>
    </div>
  );
}

export default WhatsAppSetupWizard;
