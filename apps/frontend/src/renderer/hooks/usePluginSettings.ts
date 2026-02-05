/**
 * usePluginSettings Hook
 * 
 * React hook for accessing and managing plugin settings.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Plugin setting definition
 */
export interface PluginSetting {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  section?: string;
  type?: 'boolean' | 'string' | 'number' | 'select' | 'object';
  default?: unknown;
  description?: string;
  enum?: string[];
  enumLabels?: string[];
  pluginId: string;
}

/**
 * Hook for managing plugin settings
 */
export function usePluginSettings() {
  const [settings, setSettings] = useState<PluginSetting[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch settings definitions from main process
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electronAPI?.plugins?.getSettings?.();
      
      if (result) {
        // Sort by order
        const sorted = [...result].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
        setSettings(sorted);
      } else {
        setSettings([]);
      }
    } catch (err) {
      console.error('[usePluginSettings] Failed to fetch settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
      setSettings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch current setting values
  const fetchValues = useCallback(async () => {
    try {
      const result = await window.electronAPI?.plugins?.getAllSettingValues?.();
      if (result) {
        setValues(result);
      }
    } catch (err) {
      console.error('[usePluginSettings] Failed to fetch setting values:', err);
    }
  }, []);

  // Get a specific setting value
  const getValue = useCallback(<T>(settingId: string, defaultValue?: T): T => {
    if (settingId in values) {
      return values[settingId] as T;
    }
    const setting = settings.find(s => s.id === settingId);
    return (setting?.default as T) ?? defaultValue as T;
  }, [values, settings]);

  // Set a setting value
  const setValue = useCallback(async <T>(settingId: string, value: T) => {
    try {
      setValues(prev => ({ ...prev, [settingId]: value }));
      await window.electronAPI?.plugins?.setSetting?.(settingId, value);
    } catch (err) {
      console.error(`[usePluginSettings] Failed to set ${settingId}:`, err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
    fetchValues();
  }, [fetchSettings, fetchValues]);

  // Listen for registry changes
  useEffect(() => {
    const unsubscribe = window.electronAPI?.plugins?.onSettingsChanged?.(() => {
      fetchSettings();
      fetchValues();
    });
    return () => {
      unsubscribe?.();
    };
  }, [fetchSettings, fetchValues]);

  // Refresh
  const refresh = useCallback(() => {
    fetchSettings();
    fetchValues();
  }, [fetchSettings, fetchValues]);

  return {
    settings,
    values,
    isLoading,
    error,
    getValue,
    setValue,
    refresh,
  };
}

export default usePluginSettings;
