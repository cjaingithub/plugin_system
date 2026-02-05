/**
 * Plugin Manager
 * 
 * Manages the complete lifecycle of plugins including:
 * - Loading and initialization
 * - Activation and deactivation
 * - Error handling and recovery
 * - State management
 */

import { app, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { existsSync, writeFileSync, readFileSync, rmSync } from 'fs';
import type { 
  PluginInfo, 
  PluginState, 
  PluginManifest,
  CommandContribution,
  SidebarContribution,
  SettingContribution,
} from '../../shared/types/plugin';
import { 
  loadAllPlugins, 
  getPluginsDirectory, 
  ensurePluginsDirectory,
  checkEngineCompatibility,
  loadPlugin,
} from './plugin-loader';
import { contributionRegistry } from './contribution-registry';

/**
 * Plugin context passed to activate function
 */
export interface PluginContext {
  pluginPath: string;
  pluginId: string;
  
  // Subscription management
  subscriptions: Array<() => void>;
  
  // APIs
  registerCommand(contribution: CommandContribution, handler: () => void | Promise<void>): void;
  registerSidebarPanel(contribution: SidebarContribution): void;
  registerSetting(contribution: SettingContribution): void;
  
  // Logging
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Plugin API exposed to plugins
 */
export interface PluginAPI {
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

/**
 * Plugin enabled state
 */
interface PluginEnabledState {
  [pluginId: string]: boolean;
}

/**
 * Plugin Manager class
 * 
 * Manages all plugins and their lifecycles.
 */
class PluginManagerImpl {
  private plugins = new Map<string, PluginInfo>();
  private pluginAPIs = new Map<string, PluginAPI>();
  private pluginContexts = new Map<string, PluginContext>();
  private enabledState: PluginEnabledState = {};
  private initialized = false;
  private appVersion: string;

  constructor() {
    // Get app version from package.json or app
    this.appVersion = app?.getVersion?.() ?? '0.0.0';
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[PluginManager] Already initialized');
      return;
    }

    console.log('[PluginManager] Initializing plugin system...');

    // Ensure plugins directory exists
    ensurePluginsDirectory();

    // Load enabled state
    this.loadEnabledState();

    // Discover and load all plugins
    const plugins = loadAllPlugins();
    for (const [id, plugin] of plugins) {
      this.plugins.set(id, plugin);
    }

    console.log(`[PluginManager] Discovered ${this.plugins.size} plugins`);

    // Register IPC handlers
    this.registerIPCHandlers();

    this.initialized = true;

    // Activate plugins that should start on startup
    await this.activateStartupPlugins();
  }

  /**
   * Get path to enabled state file
   */
  private getEnabledStatePath(): string {
    return path.join(getPluginsDirectory(), '.enabled-state.json');
  }

  /**
   * Load enabled state from disk
   */
  private loadEnabledState(): void {
    const statePath = this.getEnabledStatePath();
    if (existsSync(statePath)) {
      try {
        const data = readFileSync(statePath, 'utf-8');
        this.enabledState = JSON.parse(data);
      } catch (error) {
        console.error('[PluginManager] Failed to load enabled state:', error);
        this.enabledState = {};
      }
    }
  }

  /**
   * Save enabled state to disk
   */
  private saveEnabledState(): void {
    const statePath = this.getEnabledStatePath();
    try {
      writeFileSync(statePath, JSON.stringify(this.enabledState, null, 2));
    } catch (error) {
      console.error('[PluginManager] Failed to save enabled state:', error);
    }
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // Check explicit enabled state first
    if (pluginId in this.enabledState) {
      return this.enabledState[pluginId];
    }

    // Fall back to manifest default
    return plugin.manifest.enabledByDefault !== false;
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    this.enabledState[pluginId] = true;
    this.saveEnabledState();

    // Activate if not already active
    if (plugin.state !== 'active') {
      await this.activatePlugin(pluginId);
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    this.enabledState[pluginId] = false;
    this.saveEnabledState();

    // Deactivate if active
    if (plugin.state === 'active') {
      await this.deactivatePlugin(pluginId);
    }
  }

  /**
   * Activate plugins that should start on startup
   */
  private async activateStartupPlugins(): Promise<void> {
    const startupPlugins: PluginInfo[] = [];

    for (const plugin of this.plugins.values()) {
      if (!this.isPluginEnabled(plugin.id)) {
        continue;
      }

      // Check for onStartup activation event
      const activationEvents = plugin.manifest.activationEvents ?? [];
      if (activationEvents.includes('onStartup') || activationEvents.length === 0) {
        startupPlugins.push(plugin);
      }
    }

    console.log(`[PluginManager] Activating ${startupPlugins.length} startup plugins...`);

    for (const plugin of startupPlugins) {
      try {
        await this.activatePlugin(plugin.id);
      } catch (error) {
        console.error(`[PluginManager] Failed to activate startup plugin ${plugin.id}:`, error);
      }
    }
  }

  /**
   * Create a context object for a plugin
   */
  private createPluginContext(plugin: PluginInfo): PluginContext {
    const subscriptions: Array<() => void> = [];

    const context: PluginContext = {
      pluginPath: plugin.path,
      pluginId: plugin.id,
      subscriptions,

      registerCommand: (contribution, handler) => {
        const unregister = contributionRegistry.registerCommand(plugin.id, contribution, handler);
        subscriptions.push(unregister);
      },

      registerSidebarPanel: (contribution) => {
        const unregister = contributionRegistry.registerSidebarPanel(plugin.id, contribution);
        subscriptions.push(unregister);
      },

      registerSetting: (contribution) => {
        const unregister = contributionRegistry.registerSetting(plugin.id, contribution);
        subscriptions.push(unregister);
      },

      log: (message) => {
        console.log(`[Plugin:${plugin.id}] ${message}`);
      },

      warn: (message) => {
        console.warn(`[Plugin:${plugin.id}] ${message}`);
      },

      error: (message) => {
        console.error(`[Plugin:${plugin.id}] ${message}`);
      },
    };

    return context;
  }

  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.state === 'active' || plugin.state === 'activating') {
      console.log(`[PluginManager] Plugin ${pluginId} is already ${plugin.state}`);
      return;
    }

    // Check engine compatibility
    if (!checkEngineCompatibility(plugin.manifest, this.appVersion)) {
      const required = plugin.manifest.engines?.['auto-claude'] ?? 'unknown';
      throw new Error(`Plugin ${pluginId} requires Auto-Claude ${required}, but ${this.appVersion} is installed`);
    }

    console.log(`[PluginManager] Activating plugin: ${pluginId}`);
    plugin.state = 'activating';

    try {
      // Register contributions from manifest
      this.registerManifestContributions(plugin);

      // Load the plugin's main module if it exists
      if (plugin.manifest.main) {
        const mainPath = path.join(plugin.path, plugin.manifest.main);
        if (existsSync(mainPath)) {
          // Create context
          const context = this.createPluginContext(plugin);
          this.pluginContexts.set(pluginId, context);

          // Load and execute the plugin
          // Note: In a real implementation, this would use proper sandboxing
          // For now, we require() the module directly
          delete require.cache[require.resolve(mainPath)];
          const pluginModule = require(mainPath) as PluginAPI;
          
          this.pluginAPIs.set(pluginId, pluginModule);

          // Call activate
          if (pluginModule.activate) {
            await pluginModule.activate(context);
          }
        }
      }

      plugin.state = 'active';
      plugin.loadedAt = new Date();
      console.log(`[PluginManager] Plugin ${pluginId} activated successfully`);
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
      console.error(`[PluginManager] Failed to activate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Register contributions defined in the manifest
   */
  private registerManifestContributions(plugin: PluginInfo): void {
    const contributions = plugin.manifest.contributes;
    if (!contributions) return;

    // Register commands
    if (contributions.commands) {
      for (const cmd of contributions.commands) {
        contributionRegistry.registerCommand(plugin.id, cmd);
      }
    }

    // Register sidebar panels
    if (contributions.sidebar?.panels) {
      for (const panel of contributions.sidebar.panels) {
        contributionRegistry.registerSidebarPanel(plugin.id, panel);
      }
    }

    // Register settings
    if (contributions.settings?.sections) {
      for (const section of contributions.settings.sections) {
        contributionRegistry.registerSetting(plugin.id, section);
      }
    }

    // Register kanban actions
    if (contributions.kanban?.actions) {
      for (const action of contributions.kanban.actions) {
        contributionRegistry.registerKanbanAction(plugin.id, action);
      }
    }

    // Register task validators
    if (contributions.task?.validators) {
      for (const validator of contributions.task.validators) {
        contributionRegistry.registerTaskValidator(plugin.id, validator);
      }
    }

    // Register task analyzers
    if (contributions.task?.analyzers) {
      for (const analyzer of contributions.task.analyzers) {
        contributionRegistry.registerTaskAnalyzer(plugin.id, analyzer);
      }
    }

    // Register context providers
    if (contributions.context?.providers) {
      for (const provider of contributions.context.providers) {
        contributionRegistry.registerContextProvider(plugin.id, provider);
      }
    }

    // Register keybindings
    if (contributions.keybindings) {
      for (const keybinding of contributions.keybindings) {
        contributionRegistry.registerKeybinding(plugin.id, keybinding);
      }
    }

    // Register menu items
    if (contributions.menus) {
      for (const menu of contributions.menus) {
        contributionRegistry.registerMenuItem(plugin.id, menu);
      }
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.state !== 'active') {
      console.log(`[PluginManager] Plugin ${pluginId} is not active`);
      return;
    }

    console.log(`[PluginManager] Deactivating plugin: ${pluginId}`);
    plugin.state = 'deactivating';

    try {
      // Call deactivate on the plugin module
      const pluginModule = this.pluginAPIs.get(pluginId);
      if (pluginModule?.deactivate) {
        await pluginModule.deactivate();
      }

      // Clean up subscriptions
      const context = this.pluginContexts.get(pluginId);
      if (context) {
        for (const unsubscribe of context.subscriptions) {
          try {
            unsubscribe();
          } catch (error) {
            console.error(`[PluginManager] Error cleaning up subscription:`, error);
          }
        }
      }

      // Unregister all contributions
      contributionRegistry.unregisterPlugin(pluginId);

      // Clean up
      this.pluginAPIs.delete(pluginId);
      this.pluginContexts.delete(pluginId);

      plugin.state = 'inactive';
      console.log(`[PluginManager] Plugin ${pluginId} deactivated successfully`);
    } catch (error) {
      plugin.state = 'error';
      plugin.error = error instanceof Error ? error.message : String(error);
      console.error(`[PluginManager] Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    console.log(`[PluginManager] Reloading plugin: ${pluginId}`);

    // Deactivate if active
    const plugin = this.plugins.get(pluginId);
    if (plugin?.state === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    // Re-load from disk
    const pluginPath = plugin?.path;
    if (pluginPath) {
      const reloaded = loadPlugin(pluginPath);
      if (reloaded) {
        this.plugins.set(pluginId, reloaded);
      }
    }

    // Activate if enabled
    if (this.isPluginEnabled(pluginId)) {
      await this.activatePlugin(pluginId);
    }
  }

  /**
   * Install a plugin from a path
   */
  async installPlugin(sourcePath: string): Promise<PluginInfo> {
    console.log(`[PluginManager] Installing plugin from: ${sourcePath}`);

    // Load the plugin from source
    const plugin = loadPlugin(sourcePath);
    if (!plugin) {
      throw new Error('Failed to load plugin from source');
    }

    // Check if already installed
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already installed`);
    }

    // Copy to plugins directory (in a real implementation)
    // For now, we just register it in place
    this.plugins.set(plugin.id, plugin);

    // Enable and activate
    await this.enablePlugin(plugin.id);

    return plugin;
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    console.log(`[PluginManager] Uninstalling plugin: ${pluginId}`);

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Deactivate first
    if (plugin.state === 'active') {
      await this.deactivatePlugin(pluginId);
    }

    // Remove from plugins directory
    try {
      rmSync(plugin.path, { recursive: true, force: true });
    } catch (error) {
      console.error(`[PluginManager] Failed to remove plugin files:`, error);
    }

    // Remove from registry
    this.plugins.delete(pluginId);
    delete this.enabledState[pluginId];
    this.saveEnabledState();

    console.log(`[PluginManager] Plugin ${pluginId} uninstalled`);
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): PluginInfo[] {
    return this.getAllPlugins().filter(p => p.state === state);
  }

  /**
   * Handle activation events
   */
  async handleActivationEvent(event: string): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (plugin.state !== 'active' && this.isPluginEnabled(plugin.id)) {
        const events = plugin.manifest.activationEvents ?? [];
        if (events.includes(event as any)) {
          try {
            await this.activatePlugin(plugin.id);
          } catch (error) {
            console.error(`[PluginManager] Failed to activate ${plugin.id} on ${event}:`, error);
          }
        }
      }
    }
  }

  /**
   * Register IPC handlers for renderer communication
   */
  private registerIPCHandlers(): void {
    ipcMain.handle('plugins:list', () => {
      return this.getAllPlugins().map(p => ({
        id: p.id,
        manifest: p.manifest,
        state: p.state,
        enabled: this.isPluginEnabled(p.id),
        error: p.error,
        loadedAt: p.loadedAt,
      }));
    });

    ipcMain.handle('plugins:get', (_event, pluginId: string) => {
      const plugin = this.getPlugin(pluginId);
      if (!plugin) return null;
      return {
        id: plugin.id,
        manifest: plugin.manifest,
        state: plugin.state,
        enabled: this.isPluginEnabled(plugin.id),
        error: plugin.error,
        loadedAt: plugin.loadedAt,
      };
    });

    ipcMain.handle('plugins:enable', async (_event, pluginId: string) => {
      await this.enablePlugin(pluginId);
    });

    ipcMain.handle('plugins:disable', async (_event, pluginId: string) => {
      await this.disablePlugin(pluginId);
    });

    ipcMain.handle('plugins:reload', async (_event, pluginId: string) => {
      await this.reloadPlugin(pluginId);
    });

    ipcMain.handle('plugins:uninstall', async (_event, pluginId: string) => {
      await this.uninstallPlugin(pluginId);
    });

    ipcMain.handle('plugins:execute-command', async (_event, commandId: string) => {
      await contributionRegistry.executeCommand(commandId);
    });

    ipcMain.handle('plugins:get-commands', () => {
      return contributionRegistry.getCommands();
    });

    ipcMain.handle('plugins:get-sidebar-panels', () => {
      return contributionRegistry.getSidebarPanels();
    });

    ipcMain.handle('plugins:get-settings', () => {
      return contributionRegistry.getSettings();
    });

    console.log('[PluginManager] IPC handlers registered');
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    console.log('[PluginManager] Shutting down all plugins...');

    const activePlugins = this.getPluginsByState('active');
    for (const plugin of activePlugins) {
      try {
        await this.deactivatePlugin(plugin.id);
      } catch (error) {
        console.error(`[PluginManager] Error deactivating ${plugin.id} during shutdown:`, error);
      }
    }

    this.plugins.clear();
    this.pluginAPIs.clear();
    this.pluginContexts.clear();
    this.initialized = false;

    console.log('[PluginManager] Plugin system shut down');
  }
}

// Export singleton instance
export const pluginManager = new PluginManagerImpl();

// Also export the class for testing
export { PluginManagerImpl };
