'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Zap, Clock, Loader2 } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Fetch analytics metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics', 'metrics', timeRange],
    queryFn: () => apiClient.analytics.getMetrics(timeRange),
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch quota data
  const { data: quota } = useQuery({
    queryKey: ['analytics', 'quota'],
    queryFn: () => apiClient.analytics.getQuota(),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </Card>
    );
  }

  const stats = [
    {
      title: 'Total Skills Executed',
      value: metrics?.skillsExecuted.reduce((sum, item) => sum + item.count, 0) || 0,
      icon: Zap,
      color: 'text-purple-500',
      trend: '+12%',
    },
    {
      title: 'Avg Session Duration',
      value: `${Math.round(
        (metrics?.sessionDuration.reduce((sum, item) => sum + item.avgDuration, 0) || 0) /
          (metrics?.sessionDuration.length || 1)
      )}m`,
      icon: Clock,
      color: 'text-blue-500',
      trend: '+5%',
    },
    {
      title: 'Active Channels',
      value: metrics?.channelUsage.length || 0,
      icon: Activity,
      color: 'text-green-500',
      trend: '+2',
    },
    {
      title: 'Quota Usage',
      value: `${quota?.percentage || 0}%`,
      icon: TrendingUp,
      color: 'text-orange-500',
      trend: `${quota?.used || 0}/${quota?.total || 0}`,
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {/* Header with Time Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Monitor your OpenClaw usage and performance metrics
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    <Badge variant="secondary" className="mt-2">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div className={`rounded-lg bg-muted p-3 ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Skills Executed Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Skills Executed</CardTitle>
            <CardDescription>Daily skill execution count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics?.skillsExecuted || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Most Used Skills</CardTitle>
            <CardDescription>Top skills by execution count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metrics?.topSkills?.slice(0, 5) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Channel Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Message volume by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics?.channelUsage || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percent }) =>
                    `${channel} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(metrics?.channelUsage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Duration */}
        <Card>
          <CardHeader>
            <CardTitle>Avg Session Duration</CardTitle>
            <CardDescription>Average conversation length (minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics?.sessionDuration || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quota Usage Card */}
      {quota && (
        <Card>
          <CardHeader>
            <CardTitle>API Quota Usage</CardTitle>
            <CardDescription>
              Resets on{' '}
              {new Date(quota.resetDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {quota.used.toLocaleString()} / {quota.total.toLocaleString()} requests
                </span>
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
              <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    quota.percentage >= 90
                      ? 'bg-red-500'
                      : quota.percentage >= 75
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${quota.percentage}%` }}
                />
              </div>
              {quota.percentage >= 90 && (
                <p className="text-sm text-destructive">
                  Warning: You're approaching your quota limit. Consider upgrading your plan.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
