'use client';

/**
 * DateRangePicker Component - Date range selection for analytics
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  ChevronDown,
} from 'lucide-react';

type DateRange = '24h' | '7d' | '30d' | '90d' | 'custom';

interface DateRangeOption {
  value: DateRange;
  label: string;
  getRange: () => { start: Date; end: Date };
}

const dateRangeOptions: DateRangeOption[] = [
  {
    value: '24h',
    label: 'Last 24 hours',
    getRange: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    value: '7d',
    label: 'Last 7 days',
    getRange: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    value: '30d',
    label: 'Last 30 days',
    getRange: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
  {
    value: '90d',
    label: 'Last 90 days',
    getRange: () => ({
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }),
  },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange, range: { start: Date; end: Date }) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedOption = dateRangeOptions.find((opt) => opt.value === value);

  const handleSelect = (option: DateRangeOption) => {
    onChange(option.value, option.getRange());
    setShowDropdown(false);
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        className="min-w-[160px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {selectedOption?.label || 'Select range'}
        </span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="p-1">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                    value === option.value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {option.label}
                  {value === option.value && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Selected
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DateRangePicker;
