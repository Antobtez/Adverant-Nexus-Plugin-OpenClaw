'use client';

/**
 * OpenClaw Assistant - Main Dashboard
 *
 * This is the entry point for the OpenClaw UI accessible at /openclaw/ui
 * It provides a tabbed interface with 6 core components:
 * - Chat: Real-time messaging with AI assistant
 * - Skills: Browse and execute 100+ skills
 * - Channels: Multi-channel configuration (WhatsApp, Telegram, etc.)
 * - Automation: Cron job editor and scheduler
 * - Analytics: Usage metrics and performance charts
 * - Settings: Plugin configuration and preferences
 *
 * @author Adverant AI
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import { MessageSquare, Zap, Radio, Clock, BarChart3, Settings } from 'lucide-react';

// Core components
import { ChatInterface } from '@/components/ChatInterface';
import { SkillBrowser } from '@/components/SkillBrowser';
import { ChannelManager } from '@/components/ChannelManager';
import { CronEditor } from '@/components/CronEditor';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { SettingsPanel } from '@/components/SettingsPanel';

// UI components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { ToastProvider } from '@/components/ui/toast';

export default function OpenClawDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { isConnected, connectionStatus } = useWebSocket();
  const [activeTab, setActiveTab] = useState('chat');

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login (or show auth UI)
      console.log('User not authenticated, redirecting...');
      // window.location.href = '/auth/login';
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading OpenClaw...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">OpenClaw Assistant</h1>
                  <p className="text-sm text-muted-foreground">
                    Multi-channel AI automation powered by Nexus
                  </p>
                </div>
              </div>

              {/* Connection status indicator */}
              <Badge
                variant={isConnected ? 'default' : 'destructive'}
                className="ml-4"
              >
                <div className={`mr-2 h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {connectionStatus}
              </Badge>
            </div>

            {/* User info */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.tier} tier
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <Tabs
            defaultValue="chat"
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex h-full flex-col"
          >
            {/* Tab Navigation */}
            <div className="border-b bg-card">
              <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-none bg-transparent p-0 px-6">
                <TabsTrigger
                  value="chat"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>

                <TabsTrigger
                  value="skills"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Zap className="h-4 w-4" />
                  Skills (100+)
                </TabsTrigger>

                <TabsTrigger
                  value="channels"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Radio className="h-4 w-4" />
                  Channels
                </TabsTrigger>

                <TabsTrigger
                  value="automation"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Clock className="h-4 w-4" />
                  Automation
                </TabsTrigger>

                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>

                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden p-6">
              <TabsContent value="chat" className="h-full m-0">
                <ChatInterface />
              </TabsContent>

              <TabsContent value="skills" className="h-full m-0">
                <SkillBrowser />
              </TabsContent>

              <TabsContent value="channels" className="h-full m-0">
                <ChannelManager />
              </TabsContent>

              <TabsContent value="automation" className="h-full m-0">
                <CronEditor />
              </TabsContent>

              <TabsContent value="analytics" className="h-full m-0">
                <AnalyticsDashboard />
              </TabsContent>

              <TabsContent value="settings" className="h-full m-0">
                <SettingsPanel />
              </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* Footer (optional status bar) */}
        <footer className="border-t bg-card px-6 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>OpenClaw v1.0.0</span>
              <span>•</span>
              <span>Nexus Plugin</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://docs.adverant.ai/plugins/openclaw" className="hover:text-foreground">
                Documentation
              </a>
              <a href="https://github.com/adverant/Adverant-Nexus-Plugin-OpenClaw/issues" className="hover:text-foreground">
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
}
