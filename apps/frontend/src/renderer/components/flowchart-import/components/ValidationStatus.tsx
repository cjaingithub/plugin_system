/**
 * Validation status display component
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ValidationStatusProps, FlowchartValidationResult } from '../types';

interface ValidationItemProps {
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}

function ValidationItem({ severity, message, code }: ValidationItemProps) {
  const iconMap = {
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colorMap = {
    error: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
  };

  const bgMap = {
    error: 'bg-destructive/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10',
  };

  const Icon = iconMap[severity];

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-md',
        bgMap[severity]
      )}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', colorMap[severity])} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', colorMap[severity])}>{message}</p>
        {code && (
          <p className="text-xs text-muted-foreground font-mono">{code}</p>
        )}
      </div>
    </div>
  );
}

export function ValidationStatus({
  result,
  className,
}: ValidationStatusProps) {
  const { t } = useTranslation(['flowchart', 'common']);

  const errorCount = result.errors.filter((e) => e.severity === 'error').length;
  const warningCount = result.errors.filter((e) => e.severity === 'warning').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg',
          result.valid
            ? 'bg-green-500/10 border border-green-500/20'
            : 'bg-destructive/10 border border-destructive/20'
        )}
      >
        {result.valid ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                {t('flowchart:validation.valid')}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('flowchart:validation.readyToGenerate')}
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                {t('flowchart:validation.invalid')}
              </p>
              <p className="text-sm text-destructive/80">
                {t('flowchart:validation.fixErrors', { count: errorCount })}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            <span>{errorCount} {t('flowchart:validation.errors')}</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-1.5 text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{warningCount} {t('flowchart:validation.warnings')}</span>
          </div>
        )}
      </div>

      {/* Error/Warning list */}
      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t('flowchart:validation.issues')}
          </p>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {result.errors.map((error, index) => (
              <ValidationItem
                key={`${error.code}-${index}`}
                severity={error.severity}
                message={error.message}
                code={error.code}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
