'use client';

/**
 * ChannelManager Component - Main channel management container
 *
 * Combines ChannelList and ChannelDetailPanel in a two-panel layout
 * with support for adding new channels through setup wizards.
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TwoPanelLayout } from '@/components/layout/ThreePanelLayout';
import { ChannelList } from './ChannelList';
import { ChannelDetailPanel } from './ChannelDetailPanel';
import { AddChannelDialog } from './AddChannelDialog';
import { WhatsAppSetupWizard } from './whatsapp/WhatsAppSetupWizard';
import { TelegramSetupWizard } from './telegram/TelegramSetupWizard';
import { SlackSetupWizard } from './slack/SlackSetupWizard';
import { DiscordSetupWizard } from './discord/DiscordSetupWizard';
import { useChannelStore, useChannels } from '@/stores/channelStore';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { ChannelType } from '@/stores/channelStore';

interface ChannelManagerProps {
  className?: string;
}

export function ChannelManager({ className }: ChannelManagerProps) {
  const channels = useChannels();
  const { selectChannel, reconnectChannel } = useChannelStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [setupChannelType, setSetupChannelType] = useState<ChannelType | null>(null);

  // Get existing channel types
  const existingChannelTypes = channels.map((c) => c.channelType);

  // Handle add channel selection
  const handleSelectChannelType = useCallback((channelType: ChannelType) => {
    setShowAddDialog(false);
    setSetupChannelType(channelType);
  }, []);

  // Handle setup wizard completion
  const handleSetupComplete = useCallback((channelId: string) => {
    setSetupChannelType(null);
    selectChannel(channelId);
  }, [selectChannel]);

  // Handle setup wizard cancel
  const handleSetupCancel = useCallback(() => {
    setSetupChannelType(null);
  }, []);

  // Handle channel reconnection
  const handleReconnect = useCallback((channelId: string) => {
    reconnectChannel(channelId);
  }, [reconnectChannel]);

  // Handle test message
  const handleTestMessage = useCallback((channelId: string) => {
    // This would send a test message via WebSocket
    console.log('Sending test message to channel:', channelId);
  }, []);

  // Render setup wizard based on channel type
  const renderSetupWizard = () => {
    if (!setupChannelType) return null;

    const wizardProps = {
      onComplete: handleSetupComplete,
      onCancel: handleSetupCancel,
    };

    switch (setupChannelType) {
      case 'whatsapp':
        return <WhatsAppSetupWizard {...wizardProps} />;
      case 'telegram':
        return <TelegramSetupWizard {...wizardProps} />;
      case 'slack':
        return <SlackSetupWizard {...wizardProps} />;
      case 'discord':
        return <DiscordSetupWizard {...wizardProps} />;
      // Add more channel types as needed
      default:
        return (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              Setup wizard for {setupChannelType} is not yet available.
            </p>
          </div>
        );
    }
  };

  return (
    <div className={cn('h-full', className)}>
      <TwoPanelLayout
        leftPanel={
          <ChannelList
            onAddChannel={() => setShowAddDialog(true)}
            className="h-full"
          />
        }
        rightPanel={
          <ChannelDetailPanel
            onReconnect={handleReconnect}
            onTestMessage={handleTestMessage}
            className="h-full"
          />
        }
        leftMinSize={30}
        leftDefaultSize={40}
      />

      {/* Add Channel Dialog */}
      <AddChannelDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSelectChannel={handleSelectChannelType}
        existingChannelTypes={existingChannelTypes}
      />

      {/* Setup Wizard Dialog */}
      <Dialog
        open={setupChannelType !== null}
        onOpenChange={(open) => !open && setSetupChannelType(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
          {renderSetupWizard()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChannelManager;
