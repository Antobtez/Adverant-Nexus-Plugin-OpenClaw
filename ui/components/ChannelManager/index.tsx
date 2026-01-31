'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageCircle,
  Send,
  Slack,
  Bot,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
} from 'lucide-react';
import QRCode from 'qrcode.react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useWebSocket } from '@/hooks/useWebSocket';
import type { ChannelStatusEvent } from '@/lib/websocket-client';

interface Channel {
  id: string;
  type: 'whatsapp' | 'telegram' | 'slack' | 'discord';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
}

const CHANNEL_TYPES = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    description: 'Connect via QR code pairing',
    color: 'text-green-500',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    description: 'Bot token authentication',
    color: 'text-blue-500',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: Slack,
    description: 'OAuth workspace integration',
    color: 'text-purple-500',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: Bot,
    description: 'Bot token setup',
    color: 'text-indigo-500',
  },
];

export function ChannelManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<string>('whatsapp');
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>({});
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { wsClient } = useWebSocket();

  // Fetch channels
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', 'list'],
    queryFn: () => apiClient.channels.list(),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Listen to WebSocket channel status events
  useEffect(() => {
    const unsubscribe = wsClient.onChannelStatus((event: ChannelStatusEvent) => {
      console.log('Channel status update:', event);

      // Update QR code for WhatsApp
      if (event.type === 'whatsapp' && event.qrCode) {
        setQrCodeData(event.qrCode);
      }

      // Refetch channels on status change
      queryClient.invalidateQueries({ queryKey: ['channels', 'list'] });
    });

    return () => {
      unsubscribe();
    };
  }, [wsClient, queryClient]);

  // Connect channel mutation
  const connectMutation = useMutation({
    mutationFn: ({ type, config }: { type: string; config: Record<string, any> }) =>
      apiClient.channels.connect(type, config),
    onSuccess: (data) => {
      if (data.qrCode) {
        setQrCodeData(data.qrCode);
      } else {
        setIsAddDialogOpen(false);
        setChannelConfig({});
        setQrCodeData(null);
      }
      queryClient.invalidateQueries({ queryKey: ['channels', 'list'] });
    },
  });

  // Disconnect channel mutation
  const disconnectMutation = useMutation({
    mutationFn: (channelId: string) => apiClient.channels.disconnect(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'list'] });
    },
  });

  // Test channel mutation
  const testMutation = useMutation({
    mutationFn: (channelId: string) => apiClient.channels.test(channelId),
  });

  const handleConnectChannel = () => {
    connectMutation.mutate({
      type: selectedChannelType,
      config: channelConfig,
    });
  };

  const handleDisconnect = (channelId: string) => {
    if (confirm('Are you sure you want to disconnect this channel?')) {
      disconnectMutation.mutate(channelId);
    }
  };

  const handleTestChannel = (channelId: string) => {
    testMutation.mutate(channelId);
  };

  const getChannelIcon = (type: string) => {
    const channelType = CHANNEL_TYPES.find((ct) => ct.id === type);
    return channelType?.icon || MessageCircle;
  };

  const getChannelColor = (type: string) => {
    const channelType = CHANNEL_TYPES.find((ct) => ct.id === type);
    return channelType?.color || 'text-gray-500';
  };

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading channels...</p>
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
              <CardTitle>Connected Channels</CardTitle>
              <CardDescription>
                Manage your multi-channel connections for WhatsApp, Telegram, Slack, and Discord
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Channel
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Channels Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-2">
          {channels.map((channel) => {
            const Icon = getChannelIcon(channel.type);
            const color = getChannelColor(channel.type);

            return (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg bg-muted p-3 ${color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {channel.type}
                        </CardTitle>
                        <div className="mt-1">
                          <Badge
                            variant={
                              channel.status === 'connected'
                                ? 'success'
                                : channel.status === 'error'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {channel.status === 'connected' && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {channel.status === 'error' && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {channel.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    {/* Channel-specific config display */}
                    {channel.type === 'telegram' && channel.config.botUsername && (
                      <p className="text-sm text-muted-foreground">
                        @{channel.config.botUsername}
                      </p>
                    )}
                    {channel.type === 'slack' && channel.config.workspace && (
                      <p className="text-sm text-muted-foreground">
                        {channel.config.workspace}
                      </p>
                    )}
                    {channel.type === 'discord' && channel.config.serverId && (
                      <p className="text-sm text-muted-foreground">
                        Server ID: {channel.config.serverId}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestChannel(channel.id)}
                        disabled={
                          channel.status !== 'connected' || testMutation.isPending
                        }
                      >
                        <TestTube className="mr-1 h-3 w-3" />
                        Test
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnect(channel.id)}
                        disabled={disconnectMutation.isPending}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {channels.length === 0 && (
          <Card className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No channels connected</p>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Add Channel" to connect your first messaging platform
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Channel
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Channel Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Channel</DialogTitle>
            <DialogDescription>
              Connect a new messaging channel to OpenClaw
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Channel Type</label>
              <Select value={selectedChannelType} onValueChange={setSelectedChannelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* WhatsApp - QR Code */}
            {selectedChannelType === 'whatsapp' && (
              <div>
                {qrCodeData ? (
                  <div className="flex flex-col items-center gap-3">
                    <QRCode value={qrCodeData} size={200} />
                    <p className="text-sm text-muted-foreground text-center">
                      Scan this QR code with WhatsApp to connect
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Connect" to generate a QR code for pairing
                  </p>
                )}
              </div>
            )}

            {/* Telegram - Bot Token */}
            {selectedChannelType === 'telegram' && (
              <div>
                <label className="mb-2 block text-sm font-medium">Bot Token</label>
                <Input
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={channelConfig.botToken || ''}
                  onChange={(e) =>
                    setChannelConfig({ ...channelConfig, botToken: e.target.value })
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>
            )}

            {/* Slack - OAuth */}
            {selectedChannelType === 'slack' && (
              <div>
                <label className="mb-2 block text-sm font-medium">Workspace URL</label>
                <Input
                  placeholder="your-workspace.slack.com"
                  value={channelConfig.workspace || ''}
                  onChange={(e) =>
                    setChannelConfig({ ...channelConfig, workspace: e.target.value })
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  You'll be redirected to complete OAuth setup
                </p>
              </div>
            )}

            {/* Discord - Bot Token */}
            {selectedChannelType === 'discord' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Bot Token</label>
                  <Input
                    placeholder="MTE1..."
                    value={channelConfig.botToken || ''}
                    onChange={(e) =>
                      setChannelConfig({ ...channelConfig, botToken: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Server ID</label>
                  <Input
                    placeholder="123456789012345678"
                    value={channelConfig.serverId || ''}
                    onChange={(e) =>
                      setChannelConfig({ ...channelConfig, serverId: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setChannelConfig({});
                setQrCodeData(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectChannel}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
