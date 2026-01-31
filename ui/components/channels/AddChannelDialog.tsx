'use client';

/**
 * AddChannelDialog Component - Dialog for selecting a new channel type to add
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CHANNEL_TYPE_INFO } from '@/stores/channelStore';
import {
  Phone,
  Send,
  Hash,
  Users,
  Radio,
  Globe,
  ChevronRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import type { ChannelType } from '@/stores/channelStore';

interface AddChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChannel: (channelType: ChannelType) => void;
  existingChannelTypes?: ChannelType[];
}

// Channel type icons
const channelIcons: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  telegram: Send,
  slack: Hash,
  discord: Users,
  signal: Radio,
  teams: Users,
  web: Globe,
};

// Channel descriptions and features
const channelDetails: Record<
  ChannelType,
  {
    description: string;
    features: string[];
    setupTime: string;
    requirements: string[];
  }
> = {
  whatsapp: {
    description: 'Connect your WhatsApp account to receive and send messages via the AI assistant.',
    features: [
      'Multi-device support',
      'Rich media (images, documents, voice)',
      'Read receipts and typing indicators',
      'Contact management',
    ],
    setupTime: '2-3 minutes',
    requirements: ['WhatsApp account', 'Phone with WhatsApp installed'],
  },
  telegram: {
    description: 'Create a Telegram bot that can respond to messages and commands.',
    features: [
      'Bot commands',
      'Inline keyboards',
      'Rich media support',
      'Group chat support',
    ],
    setupTime: '5 minutes',
    requirements: ['Telegram account', 'Bot token from @BotFather'],
  },
  slack: {
    description: 'Integrate with Slack workspaces to enable AI-powered conversations in channels and DMs.',
    features: [
      'Slash commands',
      'Channel integration',
      'Thread support',
      'Emoji reactions',
    ],
    setupTime: '10 minutes',
    requirements: ['Slack workspace admin access', 'OAuth authorization'],
  },
  discord: {
    description: 'Add an AI bot to your Discord server for automated assistance.',
    features: [
      'Server commands',
      'Role-based permissions',
      'Voice channel awareness',
      'Rich embeds',
    ],
    setupTime: '10 minutes',
    requirements: ['Discord account', 'Server admin permissions'],
  },
  signal: {
    description: 'Connect Signal for secure, encrypted AI conversations.',
    features: [
      'End-to-end encryption',
      'Group support',
      'Media sharing',
      'Disappearing messages',
    ],
    setupTime: '3-5 minutes',
    requirements: ['Signal account', 'Phone number verification'],
  },
  teams: {
    description: 'Integrate with Microsoft Teams for enterprise AI assistance.',
    features: [
      'Team channels',
      'Adaptive cards',
      'Meeting integration',
      'File sharing',
    ],
    setupTime: '15-20 minutes',
    requirements: ['Microsoft 365 account', 'Azure AD app registration'],
  },
  web: {
    description: 'Add a web chat widget to your website for AI-powered customer support.',
    features: [
      'Customizable appearance',
      'Embedding script',
      'Session persistence',
      'Mobile responsive',
    ],
    setupTime: '5 minutes',
    requirements: ['Website access', 'Ability to add JavaScript'],
  },
};

export function AddChannelDialog({
  open,
  onOpenChange,
  onSelectChannel,
  existingChannelTypes = [],
}: AddChannelDialogProps) {
  const [selectedType, setSelectedType] = React.useState<ChannelType | null>(null);

  // Reset selection when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedType(null);
    }
  }, [open]);

  // Handle channel selection
  const handleSelect = (type: ChannelType) => {
    setSelectedType(type);
  };

  // Handle continue
  const handleContinue = () => {
    if (selectedType) {
      onSelectChannel(selectedType);
      onOpenChange(false);
    }
  };

  const selectedDetails = selectedType ? channelDetails[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Channel</DialogTitle>
          <DialogDescription>
            Choose a messaging platform to connect with your AI assistant.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* Channel list */}
          <div className="space-y-2">
            {(Object.keys(CHANNEL_TYPE_INFO) as ChannelType[]).map((type) => {
              const info = CHANNEL_TYPE_INFO[type];
              const details = channelDetails[type];
              const ChannelIcon = channelIcons[type];
              const isExisting = existingChannelTypes.includes(type);
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleSelect(type)}
                  disabled={isExisting && type !== 'web'}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800',
                    isExisting && type !== 'web' && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      info.bgColor
                    )}
                  >
                    <ChannelIcon className={cn('h-5 w-5', info.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {info.name}
                      </span>
                      {isExisting && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Setup: ~{details.setupTime}
                    </p>
                  </div>
                  {isSelected && (
                    <ChevronRight className="h-5 w-5 text-blue-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Channel details */}
          <div
            className={cn(
              'rounded-lg border border-gray-200 p-4 dark:border-gray-700',
              !selectedType && 'flex items-center justify-center'
            )}
          >
            {selectedType && selectedDetails ? (
              <div>
                <div className="flex items-center gap-2">
                  {React.createElement(channelIcons[selectedType], {
                    className: cn('h-5 w-5', CHANNEL_TYPE_INFO[selectedType].color),
                  })}
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {CHANNEL_TYPE_INFO[selectedType].name}
                  </h3>
                </div>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {selectedDetails.description}
                </p>

                {/* Features */}
                <div className="mt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Features
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {selectedDetails.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div className="mt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Requirements
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {selectedDetails.requirements.map((req) => (
                      <li
                        key={req}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Setup time */}
                <p className="mt-4 text-xs text-gray-500">
                  Estimated setup time: {selectedDetails.setupTime}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Select a channel to see details
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleContinue} disabled={!selectedType}>
            Continue Setup
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddChannelDialog;
