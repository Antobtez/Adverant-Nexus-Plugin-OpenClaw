'use client';

/**
 * CronExpressionBuilder Component - Visual cron expression builder
 *
 * Uses react-js-cron for the visual editor with custom styling
 * and preset schedule support.
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CRON_PRESETS } from '@/stores/cronStore';
import {
  Clock,
  Calendar,
  ChevronDown,
  CheckCircle,
  Code,
  Sparkles,
} from 'lucide-react';
import type { CronPreset } from '@/stores/cronStore';

interface CronExpressionBuilderProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Time option interface
interface TimeOption {
  value: string;
  label: string;
}

// Generate hour options
const hourOptions: TimeOption[] = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: i.toString().padStart(2, '0'),
}));

// Generate minute options
const minuteOptions: TimeOption[] = Array.from({ length: 60 }, (_, i) => ({
  value: i.toString(),
  label: i.toString().padStart(2, '0'),
}));

// Day of week options
const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

// Day of month options
const dayOfMonthOptions: TimeOption[] = Array.from({ length: 31 }, (_, i) => ({
  value: (i + 1).toString(),
  label: (i + 1).toString(),
}));

// Schedule type
type ScheduleType = 'preset' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

// Parse cron expression to determine type and values
function parseCronExpression(expression: string): {
  type: ScheduleType;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
} {
  const parts = expression.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts.length === 5 ? parts : ['0', '*', '*', '*', '*'];

  // Check for presets
  const preset = CRON_PRESETS.find((p) => p.expression === expression);
  if (preset) {
    return { type: 'preset', minute, hour, dayOfMonth, month, dayOfWeek };
  }

  // Determine type based on pattern
  if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return { type: 'hourly', minute, hour, dayOfMonth, month, dayOfWeek };
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return { type: 'daily', minute, hour, dayOfMonth, month, dayOfWeek };
  }
  if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
    return { type: 'weekly', minute, hour, dayOfMonth, month, dayOfWeek };
  }
  if (month === '*' && dayOfWeek === '*' && dayOfMonth !== '*') {
    return { type: 'monthly', minute, hour, dayOfMonth, month, dayOfWeek };
  }

  return { type: 'custom', minute, hour, dayOfMonth, month, dayOfWeek };
}

// Generate human-readable description
function getCronDescription(expression: string): string {
  const { type, minute, hour, dayOfMonth, dayOfWeek } = parseCronExpression(expression);

  switch (type) {
    case 'hourly':
      return `Every hour at :${minute.padStart(2, '0')}`;
    case 'daily':
      return `Every day at ${hour}:${minute.padStart(2, '0')}`;
    case 'weekly': {
      const days = dayOfWeek.split(',').map((d) => {
        const day = dayOfWeekOptions.find((o) => o.value === d);
        return day?.label || d;
      });
      return `Every ${days.join(', ')} at ${hour}:${minute.padStart(2, '0')}`;
    }
    case 'monthly':
      return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
    default:
      return expression;
  }
}

export function CronExpressionBuilder({
  value,
  onChange,
  className,
}: CronExpressionBuilderProps) {
  const parsed = parseCronExpression(value);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(parsed.type);
  const [minute, setMinute] = useState(parsed.minute);
  const [hour, setHour] = useState(parsed.hour);
  const [dayOfMonth, setDayOfMonth] = useState(parsed.dayOfMonth);
  const [dayOfWeek, setDayOfWeek] = useState(parsed.dayOfWeek);
  const [showCustom, setShowCustom] = useState(parsed.type === 'custom');
  const [customExpression, setCustomExpression] = useState(value);

  // Build cron expression from parts
  const buildExpression = useCallback(
    (type: ScheduleType, m: string, h: string, dom: string, dow: string): string => {
      switch (type) {
        case 'hourly':
          return `${m} * * * *`;
        case 'daily':
          return `${m} ${h} * * *`;
        case 'weekly':
          return `${m} ${h} * * ${dow}`;
        case 'monthly':
          return `${m} ${h} ${dom} * *`;
        case 'custom':
          return customExpression;
        default:
          return value;
      }
    },
    [customExpression, value]
  );

  // Handle schedule type change
  const handleScheduleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setShowCustom(type === 'custom');

    if (type !== 'custom' && type !== 'preset') {
      const expression = buildExpression(type, minute, hour, dayOfMonth, dayOfWeek);
      onChange(expression);
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset: CronPreset) => {
    const parsed = parseCronExpression(preset.expression);
    setMinute(parsed.minute);
    setHour(parsed.hour);
    setDayOfMonth(parsed.dayOfMonth);
    setDayOfWeek(parsed.dayOfWeek);
    setScheduleType(parsed.type === 'preset' ? 'daily' : parsed.type);
    onChange(preset.expression);
  };

  // Handle time change
  const handleTimeChange = (field: 'minute' | 'hour' | 'dayOfMonth' | 'dayOfWeek', newValue: string) => {
    let newMinute = minute;
    let newHour = hour;
    let newDayOfMonth = dayOfMonth;
    let newDayOfWeek = dayOfWeek;

    switch (field) {
      case 'minute':
        newMinute = newValue;
        setMinute(newValue);
        break;
      case 'hour':
        newHour = newValue;
        setHour(newValue);
        break;
      case 'dayOfMonth':
        newDayOfMonth = newValue;
        setDayOfMonth(newValue);
        break;
      case 'dayOfWeek':
        newDayOfWeek = newValue;
        setDayOfWeek(newValue);
        break;
    }

    const expression = buildExpression(scheduleType, newMinute, newHour, newDayOfMonth, newDayOfWeek);
    onChange(expression);
  };

  // Handle custom expression change
  const handleCustomChange = (newExpression: string) => {
    setCustomExpression(newExpression);
    // Only update if it looks like a valid cron expression
    if (newExpression.split(' ').length === 5) {
      onChange(newExpression);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Schedule type selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Schedule Type
        </label>
        <div className="flex flex-wrap gap-2">
          {(['hourly', 'daily', 'weekly', 'monthly', 'custom'] as const).map((type) => (
            <Button
              key={type}
              variant={scheduleType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleScheduleTypeChange(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <Badge
              key={preset.id}
              variant={value === preset.expression ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handlePresetSelect(preset)}
            >
              {value === preset.expression && <CheckCircle className="mr-1 h-3 w-3" />}
              {preset.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Time configuration */}
      {!showCustom && (
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            {/* Hour selector (for daily, weekly, monthly) */}
            {scheduleType !== 'hourly' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hour
                </label>
                <select
                  value={hour}
                  onChange={(e) => handleTimeChange('hour', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {hourOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}:00
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Minute selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Minute
              </label>
              <select
                value={minute}
                onChange={(e) => handleTimeChange('minute', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              >
                {minuteOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    :{opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of week (for weekly) */}
            {scheduleType === 'weekly' && (
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {dayOfWeekOptions.map((day) => {
                    const isSelected = dayOfWeek.split(',').includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const current = dayOfWeek === '*' ? [] : dayOfWeek.split(',');
                          let newDays: string[];
                          if (isSelected) {
                            newDays = current.filter((d) => d !== day.value);
                          } else {
                            newDays = [...current, day.value].sort((a, b) => parseInt(a) - parseInt(b));
                          }
                          handleTimeChange('dayOfWeek', newDays.length > 0 ? newDays.join(',') : '0');
                        }}
                      >
                        {day.label.slice(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day of month (for monthly) */}
            {scheduleType === 'monthly' && (
              <div className="col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Day of Month
                </label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => handleTimeChange('dayOfMonth', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                >
                  {dayOfMonthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom expression input */}
      {showCustom && (
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Code className="h-4 w-4" />
            Cron Expression
          </label>
          <Input
            value={customExpression}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="* * * * *"
            className="font-mono"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Format: minute hour day-of-month month day-of-week
          </p>
          <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs dark:bg-gray-800">
            <p className="font-medium text-gray-700 dark:text-gray-300">Examples:</p>
            <ul className="mt-1 space-y-1 text-gray-500">
              <li><code className="mr-2">0 9 * * *</code> - Every day at 9:00 AM</li>
              <li><code className="mr-2">*/15 * * * *</code> - Every 15 minutes</li>
              <li><code className="mr-2">0 9 * * 1-5</code> - Weekdays at 9:00 AM</li>
              <li><code className="mr-2">0 0 1 * *</code> - First day of every month</li>
            </ul>
          </div>
        </div>
      )}

      {/* Expression preview */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {getCronDescription(value)}
            </p>
            <p className="mt-1 font-mono text-sm text-blue-700 dark:text-blue-300">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CronExpressionBuilder;
