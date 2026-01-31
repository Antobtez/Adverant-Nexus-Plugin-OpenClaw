'use client';

/**
 * SkillDetailPanel Component - Skill configuration and execution form
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSkillStore, useSelectedSkill, useCurrentExecution } from '@/stores/skillStore';
import {
  Sparkles,
  Star,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import type { Skill, SkillParameter } from '@/stores/skillStore';

interface SkillDetailPanelProps {
  onExecute?: (skillName: string, params: Record<string, unknown>) => void;
  onClose?: () => void;
  className?: string;
}

export function SkillDetailPanel({ onExecute, onClose, className }: SkillDetailPanelProps) {
  const selectedSkill = useSelectedSkill();
  const currentExecution = useCurrentExecution();
  const { favoriteSkillIds, toggleFavorite, executionHistory, skillStats } = useSkillStore();

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [showExamples, setShowExamples] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Reset form when skill changes
  React.useEffect(() => {
    if (selectedSkill) {
      const defaults: Record<string, unknown> = {};
      Object.entries(selectedSkill.schema.properties).forEach(([key, param]) => {
        if (param.default !== undefined) {
          defaults[key] = param.default;
        }
      });
      setFormValues(defaults);
    }
  }, [selectedSkill?.id]);

  // Handle form field change
  const handleFieldChange = useCallback((name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handle execute
  const handleExecute = useCallback(() => {
    if (!selectedSkill) return;
    onExecute?.(selectedSkill.name, formValues);
  }, [selectedSkill, formValues, onExecute]);

  // Get skill stats
  const stats = selectedSkill ? skillStats[selectedSkill.name] : undefined;

  // Get recent executions for this skill
  const recentExecutions = selectedSkill
    ? executionHistory.filter((e) => e.skillName === selectedSkill.name).slice(0, 5)
    : [];

  if (!selectedSkill) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center p-8 text-center', className)}>
        <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-700" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Select a skill to view details and execute
        </p>
      </div>
    );
  }

  const isFavorite = favoriteSkillIds.includes(selectedSkill.id);
  const isExecuting = currentExecution?.skillName === selectedSkill.name && currentExecution?.status === 'running';

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedSkill.displayName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSkill.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(selectedSkill.id)}
              className={cn(
                'rounded-full p-2',
                isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'
              )}
            >
              <Star className={cn('h-5 w-5', isFavorite && 'fill-current')} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {selectedSkill.description}
        </p>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedSkill.category}</Badge>
          <Badge variant="outline">v{selectedSkill.version}</Badge>
          {selectedSkill.author && (
            <span className="text-xs text-gray-400">by {selectedSkill.author}</span>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {stats.executions} runs
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Clock className="h-4 w-4" />
              {stats.avgTimeMs}ms avg
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              {Math.round(stats.successRate * 100)}% success
            </span>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          Parameters
        </h3>

        <div className="space-y-4">
          {Object.entries(selectedSkill.schema.properties).map(([key, param]) => (
            <ParameterField
              key={key}
              name={key}
              param={param}
              value={formValues[key]}
              onChange={(value) => handleFieldChange(key, value)}
              required={selectedSkill.schema.required?.includes(key)}
            />
          ))}
        </div>

        {/* Examples */}
        {selectedSkill.examples && selectedSkill.examples.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex w-full items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span>Examples</span>
              {showExamples ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showExamples && (
              <div className="mt-2 space-y-2">
                {selectedSkill.examples.map((example, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {example.title}
                      </span>
                      <button
                        onClick={() => setFormValues(example.input as Record<string, unknown>)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Use this
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{example.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent executions */}
        {recentExecutions.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span>Recent Executions</span>
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {recentExecutions.map((exec) => (
                  <div
                    key={exec.executionId}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      {exec.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {exec.executionTimeMs}ms
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(exec.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current execution status */}
      {currentExecution?.skillName === selectedSkill.name && (
        <div className="border-t border-gray-200 p-4 dark:border-gray-800">
          {currentExecution.status === 'running' && (
            <div>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing...</span>
              </div>
              {currentExecution.progress !== undefined && (
                <Progress value={currentExecution.progress} className="mt-2 h-1.5" />
              )}
            </div>
          )}
          {currentExecution.status === 'completed' && currentExecution.output && (
            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>Completed in {currentExecution.executionTimeMs}ms</span>
              </div>
              <pre className="max-h-32 overflow-auto text-xs text-gray-700 dark:text-gray-300">
                {JSON.stringify(currentExecution.output, null, 2)}
              </pre>
            </div>
          )}
          {currentExecution.status === 'error' && (
            <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                <span>Error</span>
              </div>
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                {currentExecution.error}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Execute button */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <Button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full"
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute Skill
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Parameter field component
interface ParameterFieldProps {
  name: string;
  param: SkillParameter;
  value: unknown;
  onChange: (value: unknown) => void;
  required?: boolean;
}

function ParameterField({ name, param, value, onChange, required }: ParameterFieldProps) {
  const label = (
    <div className="mb-1.5 flex items-center gap-1">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {name}
      </span>
      {required && <span className="text-red-500">*</span>}
    </div>
  );

  switch (param.type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          {label}
          <Switch
            checked={value as boolean}
            onCheckedChange={onChange}
          />
        </div>
      );

    case 'number':
      return (
        <div>
          {label}
          <Input
            type="number"
            value={value as number || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={param.min}
            max={param.max}
            placeholder={param.description}
          />
          {param.description && (
            <p className="mt-1 text-xs text-gray-500">{param.description}</p>
          )}
        </div>
      );

    case 'array':
    case 'object':
      return (
        <div>
          {label}
          <Textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            }}
            placeholder={param.description || `Enter ${param.type}...`}
            rows={3}
          />
          {param.description && (
            <p className="mt-1 text-xs text-gray-500">{param.description}</p>
          )}
        </div>
      );

    default:
      if (param.enum && param.enum.length > 0) {
        return (
          <div>
            {label}
            <select
              value={value as string || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">Select...</option>
              {param.enum.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {param.description && (
              <p className="mt-1 text-xs text-gray-500">{param.description}</p>
            )}
          </div>
        );
      }

      return (
        <div>
          {label}
          <Input
            type="text"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.description}
            pattern={param.pattern}
          />
          {param.description && (
            <p className="mt-1 text-xs text-gray-500">{param.description}</p>
          )}
        </div>
      );
  }
}

export default SkillDetailPanel;
