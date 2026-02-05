/**
 * Plugin Store
 * 
 * Zustand store for managing plugin state in the renderer process.
 */

import { create } from 'zustand';

/**
 * Plugin info as returned from main process
 */
export interface PluginInfo {
  id: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  state: 'installed' | 'loaded' | 'activating' | 'active' | 'deactivating' | 'inactive' | 'error';
  enabled: boolean;
  error?: string;
  loadedAt?: string;
}

/**
 * Plugin command info
 */
export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  pluginId: string;
}

/**
 * Plugin sidebar panel info
 */
export interface PluginSidebarPanel {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  pluginId: string;
}

/**
 * Plugin setting info
 */
export interface PluginSetting {
  id: string;
  title: string;
  type?: string;
  default?: unknown;
  description?: string;
  pluginId: string;
}

interface PluginStore {
  // State
  plugins: PluginInfo[];
  commands: PluginCommand[];
  sidebarPanels: PluginSidebarPanel[];
  settings: PluginSetting[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setPlugins: (plugins: PluginInfo[]) => void;
  setCommands: (commands: PluginCommand[]) => void;
  setSidebarPanels: (panels: PluginSidebarPanel[]) => void;
  setSettings: (settings: PluginSetting[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Plugin operations
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  reloadPlugin: (pluginId: string) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  executeCommand: (commandId: string) => Promise<void>;
  
  // Fetch operations
  fetchPlugins: () => Promise<void>;
  fetchCommands: () => Promise<void>;
  fetchSidebarPanels: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  fetchAll: () => Promise<void>;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  // Initial state
  plugins: [],
  commands: [],
  sidebarPanels: [],
  settings: [],
  isLoading: false,
  error: null,

  // Setters
  setPlugins: (plugins) => set({ plugins }),
  setCommands: (commands) => set({ commands }),
  setSidebarPanels: (panels) => set({ sidebarPanels: panels }),
  setSettings: (settings) => set({ settings }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Plugin operations
  enablePlugin: async (pluginId) => {
    try {
      await window.electronAPI?.plugins?.enable?.(pluginId);
      await get().fetchPlugins();
    } catch (error) {
      console.error(`[PluginStore] Failed to enable plugin ${pluginId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to enable plugin' });
    }
  },

  disablePlugin: async (pluginId) => {
    try {
      await window.electronAPI?.plugins?.disable?.(pluginId);
      await get().fetchPlugins();
    } catch (error) {
      console.error(`[PluginStore] Failed to disable plugin ${pluginId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to disable plugin' });
    }
  },

  reloadPlugin: async (pluginId) => {
    try {
      await window.electronAPI?.plugins?.reload?.(pluginId);
      await get().fetchAll();
    } catch (error) {
      console.error(`[PluginStore] Failed to reload plugin ${pluginId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to reload plugin' });
    }
  },

  uninstallPlugin: async (pluginId) => {
    try {
      await window.electronAPI?.plugins?.uninstall?.(pluginId);
      await get().fetchAll();
    } catch (error) {
      console.error(`[PluginStore] Failed to uninstall plugin ${pluginId}:`, error);
      set({ error: error instanceof Error ? error.message : 'Failed to uninstall plugin' });
    }
  },

  executeCommand: async (commandId) => {
    try {
      await window.electronAPI?.plugins?.executeCommand?.(commandId);
    } catch (error) {
      console.error(`[PluginStore] Failed to execute command ${commandId}:`, error);
      throw error;
    }
  },

  // Fetch operations
  fetchPlugins: async () => {
    try {
      const plugins = await window.electronAPI?.plugins?.list?.();
      if (plugins) {
        set({ plugins });
      }
    } catch (error) {
      console.error('[PluginStore] Failed to fetch plugins:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch plugins' });
    }
  },

  fetchCommands: async () => {
    try {
      const commands = await window.electronAPI?.plugins?.getCommands?.();
      if (commands) {
        set({ commands });
      }
    } catch (error) {
      console.error('[PluginStore] Failed to fetch commands:', error);
    }
  },

  fetchSidebarPanels: async () => {
    try {
      const panels = await window.electronAPI?.plugins?.getSidebarPanels?.();
      if (panels) {
        set({ sidebarPanels: panels });
      }
    } catch (error) {
      console.error('[PluginStore] Failed to fetch sidebar panels:', error);
    }
  },

  fetchSettings: async () => {
    try {
      const settings = await window.electronAPI?.plugins?.getSettings?.();
      if (settings) {
        set({ settings });
      }
    } catch (error) {
      console.error('[PluginStore] Failed to fetch settings:', error);
    }
  },

  fetchAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchPlugins(),
        get().fetchCommands(),
        get().fetchSidebarPanels(),
        get().fetchSettings(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },
}));

export default usePluginStore;
