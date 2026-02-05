/**
 * Success banner displayed after successful import
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileText, FolderOpen, ArrowRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import type { FlowchartGenerateResult } from '../types';

interface ImportSuccessBannerProps {
  result: FlowchartGenerateResult;
  onViewSpec?: () => void;
  onOpenFolder?: () => void;
  onClose?: () => void;
  className?: string;
}

export function ImportSuccessBanner({
  result,
  onViewSpec,
  onOpenFolder,
  onClose,
  className,
}: ImportSuccessBannerProps) {
  const { t } = useTranslation(['flowchart', 'common']);

  return (
    <div
      className={cn(
        'flex flex-col items-center text-center p-8 space-y-6',
        className
      )}
    >
      {/* Success icon */}
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>

      {/* Title and message */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">
          {t('flowchart:success.title')}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t('flowchart:success.message')}
        </p>
      </div>

      {/* Generated files */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          {t('flowchart:success.generatedFiles')}
        </p>
        <div className="space-y-1.5 text-left">
          {/* Handle both array format and object format from backend */}
          {Array.isArray(result.files) 
            ? result.files.map((filePath, index) => {
                const fileName = filePath.split(/[/\\]/).pop() || filePath;
                return (
                  <FileItem
                    key={index}
                    name={fileName}
                    path={filePath}
                    icon={<FileText className="h-4 w-4" />}
                  />
                );
              })
            : Object.entries(result.files as Record<string, string>).map(([name, path]) => (
                <FileItem
                  key={name}
                  name={name}
                  path={path}
                  icon={<FileText className="h-4 w-4" />}
                />
              ))
          }
        </div>
      </div>

      {/* Spec Info */}
      <div className="flex gap-6 text-sm">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">
            {result.specNumber || (result as unknown as { spec_number?: string }).spec_number || '-'}
          </p>
          <p className="text-muted-foreground">
            {t('flowchart:success.specNumber')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">
            {Array.isArray(result.files) 
              ? result.files.length 
              : Object.keys(result.files || {}).length}
          </p>
          <p className="text-muted-foreground">
            {t('flowchart:success.filesGenerated')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onOpenFolder && (
          <Button variant="outline" onClick={onOpenFolder}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {t('flowchart:success.openFolder')}
          </Button>
        )}
        {onViewSpec && (
          <Button onClick={onViewSpec}>
            {t('flowchart:success.viewSpec')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface FileItemProps {
  name: string;
  path: string;
  icon: React.ReactNode;
}

function FileItem({ name, path, icon }: FileItemProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
      <div className="text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{path}</p>
      </div>
    </div>
  );
}
