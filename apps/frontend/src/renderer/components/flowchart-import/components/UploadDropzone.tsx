/**
 * Drag-and-drop file upload zone for flowchart files
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileUp, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { UploadDropzoneProps } from '../types';
import { SUPPORTED_EXTENSIONS } from '../types';

export function UploadDropzone({
  onFileSelect,
  onBrowseClick,
  acceptedFormats = SUPPORTED_EXTENSIONS,
  isLoading = false,
  error = null,
  className,
}: UploadDropzoneProps) {
  const { t } = useTranslation(['flowchart', 'common']);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find((file) =>
        acceptedFormats.some((ext) => file.name.toLowerCase().endsWith(ext))
      );

      if (validFile) {
        onFileSelect(validFile);
      }
    },
    [acceptedFormats, onFileSelect]
  );

  const handleFileInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [onFileSelect]
  );

  const handleClick = React.useCallback(() => {
    // If a browse handler is provided, use it (native file dialog)
    // Otherwise, fall back to the hidden input
    if (onBrowseClick) {
      onBrowseClick();
    } else {
      fileInputRef.current?.click();
    }
  }, [onBrowseClick]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div className={cn('w-full', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center',
          'w-full min-h-[200px] p-8',
          'border-2 border-dashed rounded-lg',
          'transition-all duration-200',
          'cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/50',
          isLoading && 'pointer-events-none opacity-60',
          error && 'border-destructive'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
          className="sr-only"
          disabled={isLoading}
        />

        {isLoading ? (
          <>
            <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">
              {t('flowchart:upload.parsing')}
            </p>
          </>
        ) : (
          <>
            <div
              className={cn(
                'flex items-center justify-center',
                'w-16 h-16 rounded-full mb-4',
                'bg-muted',
                isDragActive && 'bg-primary/10'
              )}
            >
              {isDragActive ? (
                <FileUp className="h-8 w-8 text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <p className="text-sm font-medium text-foreground mb-1">
              {isDragActive
                ? t('flowchart:upload.dropHere')
                : t('flowchart:upload.dragOrClick')}
            </p>

            <p className="text-xs text-muted-foreground">
              {t('flowchart:upload.supportedFormats', {
                formats: acceptedFormats.join(', '),
              })}
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 p-3 rounded-md bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
