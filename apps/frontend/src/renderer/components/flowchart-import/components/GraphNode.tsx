/**
 * Individual node component for TaskGraph visualization
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Flag,
  Cog,
  GitBranch,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import type { GraphNodeProps, NodeType } from '../types';
import { NODE_TYPE_COLORS } from '../types';

const NODE_ICONS: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  start: Play,
  end: Flag,
  process: Cog,
  decision: GitBranch,
  human_review: UserCheck,
};

export function GraphNode({
  node,
  isSelected = false,
  hasError = false,
  onClick,
  className,
}: GraphNodeProps) {
  const { t } = useTranslation(['flowchart']);
  const colors = NODE_TYPE_COLORS[node.nodeType];
  const Icon = NODE_ICONS[node.nodeType];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group relative flex items-center gap-3 p-3',
            'w-full min-w-[180px] max-w-[280px]',
            'rounded-lg border-2',
            'transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            colors.bg,
            colors.border,
            isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            hasError && 'border-destructive bg-destructive/10',
            onClick && 'cursor-pointer hover:shadow-md',
            className
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center',
              'w-8 h-8 rounded-md',
              'bg-background/50',
              colors.text
            )}
          >
            <Icon className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <p
              className={cn(
                'text-sm font-medium truncate',
                colors.text
              )}
            >
              {node.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {t(`flowchart:nodeTypes.${node.nodeType}`)}
            </p>
          </div>

          {/* Error indicator */}
          {hasError && (
            <div className="absolute -top-1.5 -right-1.5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          )}

          {/* Human review indicator */}
          {node.model === 'human' && (
            <div className="absolute -top-1.5 -left-1.5 bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {t('flowchart:humanReview')}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[300px]">
        <div className="space-y-2">
          <div>
            <p className="font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {t(`flowchart:nodeTypes.${node.nodeType}`)}
            </p>
          </div>

          {node.systemPrompt && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t('flowchart:nodeDetails.systemPrompt')}
              </p>
              <p className="text-xs line-clamp-2">{node.systemPrompt}</p>
            </div>
          )}

          {node.inputs && node.inputs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t('flowchart:nodeDetails.inputs')}
              </p>
              <p className="text-xs">{node.inputs.join(', ')}</p>
            </div>
          )}

          {node.outputs && node.outputs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {t('flowchart:nodeDetails.outputs')}
              </p>
              <p className="text-xs">{node.outputs.join(', ')}</p>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
