/**
 * usePluginCommands Hook
 * 
 * React hook for accessing and executing plugin commands.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Plugin command as returned from the main process
 */
export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  pluginId: string;
  when?: string;
}

/**
 * Hook for managing plugin commands
 */
export function usePluginCommands() {
  const [commands, setCommands] = useState<PluginCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch commands from main process
  const fetchCommands = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the IPC handler to get commands
      const result = await window.electronAPI?.plugins?.getCommands?.();
      
      if (result) {
        setCommands(result);
      } else {
        setCommands([]);
      }
    } catch (err) {
      console.error('[usePluginCommands] Failed to fetch commands:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch commands'));
      setCommands([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Execute a command
  const executeCommand = useCallback(async (commandId: string) => {
    try {
      await window.electronAPI?.plugins?.executeCommand?.(commandId);
    } catch (err) {
      console.error(`[usePluginCommands] Failed to execute command ${commandId}:`, err);
      throw err;
    }
  }, []);

  // Refresh commands
  const refresh = useCallback(() => {
    fetchCommands();
  }, [fetchCommands]);

  // Initial fetch
  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  // Listen for registry changes
  useEffect(() => {
    const unsubscribe = window.electronAPI?.plugins?.onCommandsChanged?.(fetchCommands);
    return () => {
      unsubscribe?.();
    };
  }, [fetchCommands]);

  return {
    commands,
    isLoading,
    error,
    executeCommand,
    refresh,
  };
}

export default usePluginCommands;
