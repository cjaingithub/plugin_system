/**
 * usePluginSidebarPanels Hook
 * 
 * React hook for accessing plugin-contributed sidebar panels.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Plugin sidebar panel definition
 */
export interface PluginSidebarPanel {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  pluginId: string;
  when?: string;
}

/**
 * Hook for managing plugin sidebar panels
 */
export function usePluginSidebarPanels() {
  const [panels, setPanels] = useState<PluginSidebarPanel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch panels from main process
  const fetchPanels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electronAPI?.plugins?.getSidebarPanels?.();
      
      if (result) {
        // Sort by order
        const sorted = [...result].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
        setPanels(sorted);
      } else {
        setPanels([]);
      }
    } catch (err) {
      console.error('[usePluginSidebarPanels] Failed to fetch panels:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch panels'));
      setPanels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  // Listen for registry changes
  useEffect(() => {
    const unsubscribe = window.electronAPI?.plugins?.onSidebarPanelsChanged?.(fetchPanels);
    return () => {
      unsubscribe?.();
    };
  }, [fetchPanels]);

  // Refresh
  const refresh = useCallback(() => {
    fetchPanels();
  }, [fetchPanels]);

  return {
    panels,
    isLoading,
    error,
    refresh,
  };
}

export default usePluginSidebarPanels;
