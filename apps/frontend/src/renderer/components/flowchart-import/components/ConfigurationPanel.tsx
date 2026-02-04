/**
 * Configuration panel for spec generation options
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2, TestTube, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import type { ConfigurationPanelProps } from '../types';

export function ConfigurationPanel({
  specName,
  onSpecNameChange,
  includeTestingPhase,
  onIncludeTestingPhaseChange,
  includeDocumentation,
  onIncludeDocumentationChange,
  className,
}: ConfigurationPanelProps) {
  const { t } = useTranslation(['flowchart', 'common']);

  // Validate spec name (alphanumeric and hyphens only)
  const isValidSpecName = /^[a-z0-9-]+$/.test(specName) && specName.length > 0;
  const hasError = specName.length > 0 && !isValidSpecName;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">
          {t('flowchart:config.title')}
        </h3>
      </div>

      {/* Spec name input */}
      <div className="space-y-2">
        <Label htmlFor="spec-name">
          {t('flowchart:config.specName')}
        </Label>
        <Input
          id="spec-name"
          value={specName}
          onChange={(e) => onSpecNameChange(e.target.value.toLowerCase())}
          placeholder={t('flowchart:config.specNamePlaceholder')}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        {hasError ? (
          <p className="text-xs text-destructive">
            {t('flowchart:config.specNameError')}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('flowchart:config.specNameHint')}
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground">
          {t('flowchart:config.options')}
        </h4>

        {/* Include testing phase */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
              <TestTube className="h-5 w-5 text-info" />
            </div>
            <div>
              <Label
                htmlFor="include-testing"
                className="font-medium cursor-pointer"
              >
                {t('flowchart:config.includeTesting')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('flowchart:config.includeTestingDescription')}
              </p>
            </div>
          </div>
          <Switch
            id="include-testing"
            checked={includeTestingPhase}
            onCheckedChange={onIncludeTestingPhaseChange}
          />
        </div>

        {/* Include documentation */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label
                htmlFor="include-docs"
                className="font-medium cursor-pointer"
              >
                {t('flowchart:config.includeDocumentation')}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t('flowchart:config.includeDocumentationDescription')}
              </p>
            </div>
          </div>
          <Switch
            id="include-docs"
            checked={includeDocumentation}
            onCheckedChange={onIncludeDocumentationChange}
          />
        </div>
      </div>
    </div>
  );
}
