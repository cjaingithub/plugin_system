/**
 * Plugin Sidebar Panel Component
 * 
 * Renders plugin-contributed sidebar panels.
 * Supports lazy loading of plugin components.
 */

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Props for plugin sidebar panel
 */
interface PluginSidebarPanelProps {
  /** Panel identifier */
  panelId: string;
  
  /** Panel title */
  title: string;
  
  /** Plugin identifier */
  pluginId: string;
  
  /** Component URL or path (for lazy loading) */
  componentPath?: string;
  
  /** Inline component (for already loaded plugins) */
  component?: React.ComponentType<PluginPanelComponentProps>;
  
  /** Additional class names */
  className?: string;
}

/**
 * Props passed to plugin panel components
 */
export interface PluginPanelComponentProps {
  /** Panel identifier */
  panelId: string;
  
  /** Plugin identifier */
  pluginId: string;
}

/**
 * Error boundary for plugin panels
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PluginPanelErrorBoundary extends React.Component<
  { children: React.ReactNode; pluginId: string },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; pluginId: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[PluginPanel:${this.props.pluginId}] Component error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive font-medium">Panel Error</p>
          <p className="text-xs text-muted-foreground mt-1">
            {this.state.error?.message || 'An error occurred in the plugin panel'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading fallback for plugin panels
 */
function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Plugin Sidebar Panel Component
 */
export function PluginSidebarPanel({
  panelId,
  title,
  pluginId,
  componentPath,
  component: InlineComponent,
  className,
}: PluginSidebarPanelProps) {
  const [LazyComponent, setLazyComponent] = useState<React.ComponentType<PluginPanelComponentProps> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);

  // Load component if componentPath is provided
  useEffect(() => {
    if (componentPath && !InlineComponent) {
      // In a real implementation, this would load the component from the plugin
      // For now, we'll show a placeholder
      setLoadError(new Error(`Component loading not yet implemented: ${componentPath}`));
    }
  }, [componentPath, InlineComponent]);

  // Determine which component to render
  const ComponentToRender = InlineComponent || LazyComponent;

  // Show error if loading failed
  if (loadError) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Failed to load panel: {title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {loadError.message}
          </p>
        </div>
      </div>
    );
  }

  // Show loading if no component yet
  if (!ComponentToRender) {
    return (
      <div className={cn('p-4', className)}>
        <PanelLoadingFallback />
      </div>
    );
  }

  return (
    <div className={cn('h-full', className)}>
      <PluginPanelErrorBoundary pluginId={pluginId}>
        <Suspense fallback={<PanelLoadingFallback />}>
          <ComponentToRender panelId={panelId} pluginId={pluginId} />
        </Suspense>
      </PluginPanelErrorBoundary>
    </div>
  );
}

export default PluginSidebarPanel;
