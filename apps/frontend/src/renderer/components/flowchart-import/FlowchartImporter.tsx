/**
 * FlowchartImporter - Main dialog for importing flowcharts
 *
 * Multi-step wizard that guides users through:
 * 1. Uploading a flowchart file
 * 2. Previewing the parsed TaskGraph
 * 3. Configuring generation options
 * 4. Generating the spec
 * 5. Viewing success result
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  Eye,
  Settings,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { TooltipProvider } from '../ui/tooltip';
import {
  UploadDropzone,
  TaskGraphPreview,
  ValidationStatus,
  ConfigurationPanel,
  GenerationProgress,
  ImportSuccessBanner,
} from './components';
import { useFlowchartImport } from './hooks/useFlowchartImport';
import type { FlowchartImporterProps, ImportStep } from './types';

interface StepConfig {
  id: ImportStep;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const STEPS: StepConfig[] = [
  { id: 'upload', icon: Upload, label: 'flowchart:steps.upload' },
  { id: 'preview', icon: Eye, label: 'flowchart:steps.preview' },
  { id: 'configure', icon: Settings, label: 'flowchart:steps.configure' },
  { id: 'generating', icon: Sparkles, label: 'flowchart:steps.generating' },
];

export function FlowchartImporter({
  projectId,
  projectDir,
  open,
  onOpenChange,
  onImportComplete,
}: FlowchartImporterProps) {
  const { t } = useTranslation(['flowchart', 'common']);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const {
    state,
    handleFileSelect,
    openFileDialog,
    clearFile,
    setSpecName,
    setIncludeTestingPhase,
    setIncludeDocumentation,
    goToStep,
    goBack,
    canGoBack,
    startGeneration,
    reset,
  } = useFlowchartImport({
    projectId,
    projectDir,
    onComplete: onImportComplete,
  });

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      reset();
      setSelectedNodeId(null);
    }
  }, [open, reset]);

  // Get current step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === state.step);

  // Can proceed to next step?
  const canProceed = React.useMemo(() => {
    switch (state.step) {
      case 'upload':
        return false; // Handled by file selection
      case 'preview':
        return state.validationResult?.valid ?? false;
      case 'configure':
        return state.specName.length > 0 && /^[a-z0-9-]+$/.test(state.specName);
      default:
        return false;
    }
  }, [state.step, state.validationResult, state.specName]);

  // Handle next step
  const handleNext = React.useCallback(() => {
    switch (state.step) {
      case 'preview':
        goToStep('configure');
        break;
      case 'configure':
        startGeneration();
        break;
    }
  }, [state.step, goToStep, startGeneration]);

  // Handle close
  const handleClose = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0" hideCloseButton>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {t('flowchart:title')}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step indicator */}
          {state.step !== 'complete' && (
            <div className="flex items-center gap-2 mt-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const isPending = index > currentStepIndex;

                return (
                  <React.Fragment key={step.id}>
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                        'transition-all duration-200',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && 'bg-green-500/10 text-green-500',
                        isPending && 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {t(step.label)}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <ChevronRight
                        className={cn(
                          'h-4 w-4',
                          index < currentStepIndex
                            ? 'text-green-500'
                            : 'text-muted-foreground'
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </DialogHeader>

        {/* Content */}
        <TooltipProvider>
          <div className="flex-1 overflow-hidden bg-background">
            {state.step === 'upload' && (
              <div className="h-full flex items-center justify-center p-6">
                <UploadDropzone
                  onFileSelect={handleFileSelect}
                  onBrowseClick={openFileDialog}
                  isLoading={state.isLoading}
                  error={state.error}
                  className="max-w-lg"
                />
              </div>
            )}

            {state.step === 'preview' && state.taskGraph && (
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <TaskGraphPreview
                    graph={state.taskGraph}
                    validationResult={state.validationResult ?? undefined}
                    selectedNodeId={selectedNodeId ?? undefined}
                    onNodeSelect={setSelectedNodeId}
                    className="h-full"
                  />
                </div>
                {state.validationResult && (
                  <div className="border-t p-4 bg-muted/30">
                    <ValidationStatus result={state.validationResult} />
                  </div>
                )}
              </div>
            )}

            {state.step === 'preview' && !state.taskGraph && (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading preview...</p>
                </div>
              </div>
            )}

            {state.step === 'configure' && (
              <div className="h-full overflow-y-auto p-6">
                <ConfigurationPanel
                  specName={state.specName}
                  onSpecNameChange={setSpecName}
                  includeTestingPhase={state.includeTestingPhase}
                  onIncludeTestingPhaseChange={setIncludeTestingPhase}
                  includeDocumentation={state.includeDocumentation}
                  onIncludeDocumentationChange={setIncludeDocumentation}
                  className="max-w-lg mx-auto"
                />
              </div>
            )}

            {state.step === 'generating' && (
              <div className="h-full flex items-center justify-center p-6">
                <GenerationProgress
                  progress={state.progress ?? { stage: 'parsing', percentage: 0, message: 'Starting...' }}
                  className="max-w-lg w-full"
                />
              </div>
            )}

            {state.step === 'complete' && state.generateResult && (
              <div className="h-full overflow-y-auto">
                <ImportSuccessBanner
                  result={state.generateResult}
                  onClose={handleClose}
                />
              </div>
            )}

            {/* Error fallback - show error if step data is missing */}
            {state.error && state.step !== 'upload' && (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive font-medium mb-2">An error occurred</p>
                  <p className="text-sm text-muted-foreground">{state.error}</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => goToStep('upload')}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back to Upload
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>

        {/* Footer */}
        {state.step !== 'generating' && state.step !== 'complete' && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
            <div>
              {canGoBack && (
                <Button variant="outline" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t('common:back')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {state.step === 'upload' && state.selectedFile && (
                <Button variant="outline" onClick={clearFile}>
                  {t('flowchart:clearFile')}
                </Button>
              )}

              {(state.step === 'preview' || state.step === 'configure') && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || state.isLoading}
                >
                  {state.isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  {state.step === 'configure'
                    ? t('flowchart:generateSpec')
                    : t('common:continue')}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Complete footer */}
        {state.step === 'complete' && (
          <div className="flex items-center justify-center px-6 py-4 border-t bg-muted/30">
            <Button onClick={handleClose}>
              {t('common:done')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
