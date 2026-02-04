/**
 * Progress indicator for spec generation
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  CheckCircle2,
  Loader2,
  FileText,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Progress } from '../../ui/progress';
import type { GenerationProgressProps, GenerationStage } from '../types';

interface StageConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  minProgress: number;
  maxProgress: number;
}

const STAGES: Record<GenerationStage, StageConfig> = {
  parsing: {
    icon: FileCode,
    label: 'flowchart:progress.parsing',
    minProgress: 0,
    maxProgress: 20,
  },
  validating: {
    icon: CheckCircle2,
    label: 'flowchart:progress.validating',
    minProgress: 20,
    maxProgress: 40,
  },
  generating_plan: {
    icon: ClipboardList,
    label: 'flowchart:progress.generatingPlan',
    minProgress: 40,
    maxProgress: 70,
  },
  generating_spec: {
    icon: FileText,
    label: 'flowchart:progress.generatingSpec',
    minProgress: 70,
    maxProgress: 90,
  },
  complete: {
    icon: Sparkles,
    label: 'flowchart:progress.complete',
    minProgress: 100,
    maxProgress: 100,
  },
};

const STAGE_ORDER: GenerationStage[] = [
  'parsing',
  'validating',
  'generating_plan',
  'generating_spec',
  'complete',
];

export function GenerationProgress({
  progress,
  className,
}: GenerationProgressProps) {
  const { t } = useTranslation(['flowchart']);

  const currentStageIndex = STAGE_ORDER.indexOf(progress.stage);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {progress.message || t(STAGES[progress.stage].label)}
          </p>
          <span className="text-sm text-muted-foreground">
            {progress.percentage}%
          </span>
        </div>
        <Progress value={progress.percentage} className="h-2" />
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        {STAGE_ORDER.map((stage, index) => {
          const config = STAGES[stage];
          const Icon = config.icon;
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full',
                    'transition-all duration-300',
                    isCompleted && 'bg-green-500/10 text-green-500',
                    isCurrent && 'bg-primary/10 text-primary',
                    isPending && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCurrent && stage !== 'complete' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-center max-w-[80px]',
                    isCompleted && 'text-green-500',
                    isCurrent && 'text-foreground font-medium',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {t(config.label)}
                </span>
              </div>

              {/* Connector line */}
              {index < STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < currentStageIndex ? 'bg-green-500' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
