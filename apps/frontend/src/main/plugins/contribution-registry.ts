/**
 * Contribution Registry
 * 
 * Manages all plugin contributions (commands, sidebar panels, settings, etc.)
 * Provides APIs for plugins to register and for the app to query contributions.
 */

import type {
  CommandContribution,
  SidebarContribution,
  SettingContribution,
  KanbanActionContribution,
  TaskValidatorContribution,
  TaskAnalyzerContribution,
  ContextProviderContribution,
  KeybindingContribution,
  MenuContribution,
} from '../../shared/types/plugin';

/**
 * Registered command with plugin source
 */
export interface RegisteredCommand extends CommandContribution {
  pluginId: string;
  handler?: () => void | Promise<void>;
}

/**
 * Registered sidebar panel with plugin source
 */
export interface RegisteredSidebarPanel extends SidebarContribution {
  pluginId: string;
  component?: () => Promise<unknown>;
}

/**
 * Registered setting with plugin source
 */
export interface RegisteredSetting extends SettingContribution {
  pluginId: string;
}

/**
 * Registered kanban action with plugin source
 */
export interface RegisteredKanbanAction extends KanbanActionContribution {
  pluginId: string;
}

/**
 * Registered task validator with plugin source
 */
export interface RegisteredTaskValidator extends TaskValidatorContribution {
  pluginId: string;
  validate?: (taskId: string) => Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Registered task analyzer with plugin source
 */
export interface RegisteredTaskAnalyzer extends TaskAnalyzerContribution {
  pluginId: string;
  analyze?: (files: string[]) => Promise<unknown>;
}

/**
 * Registered context provider with plugin source
 */
export interface RegisteredContextProvider extends ContextProviderContribution {
  pluginId: string;
  provide?: () => Promise<string>;
}

/**
 * Registered keybinding with plugin source
 */
export interface RegisteredKeybinding extends KeybindingContribution {
  pluginId: string;
}

/**
 * Registered menu item with plugin source
 */
export interface RegisteredMenuItem extends MenuContribution {
  pluginId: string;
}

/**
 * Contribution Registry
 * 
 * Singleton that manages all plugin contributions.
 */
class ContributionRegistryImpl {
  private commands = new Map<string, RegisteredCommand>();
  private sidebarPanels = new Map<string, RegisteredSidebarPanel>();
  private settings = new Map<string, RegisteredSetting>();
  private kanbanActions = new Map<string, RegisteredKanbanAction>();
  private taskValidators = new Map<string, RegisteredTaskValidator>();
  private taskAnalyzers = new Map<string, RegisteredTaskAnalyzer>();
  private contextProviders = new Map<string, RegisteredContextProvider>();
  private keybindings: RegisteredKeybinding[] = [];
  private menuItems: RegisteredMenuItem[] = [];

  // Event listeners for registry changes
  private listeners = new Map<string, Set<() => void>>();

  /**
   * Register a command
   */
  registerCommand(pluginId: string, contribution: CommandContribution, handler?: () => void | Promise<void>): () => void {
    const fullId = contribution.id;
    
    if (this.commands.has(fullId)) {
      console.warn(`[ContributionRegistry] Command ${fullId} already registered, overwriting`);
    }

    this.commands.set(fullId, {
      ...contribution,
      pluginId,
      handler,
    });

    this.emit('commands');
    console.log(`[ContributionRegistry] Registered command: ${fullId}`);

    // Return unregister function
    return () => {
      this.commands.delete(fullId);
      this.emit('commands');
    };
  }

  /**
   * Register a sidebar panel
   */
  registerSidebarPanel(
    pluginId: string, 
    contribution: SidebarContribution,
    component?: () => Promise<unknown>
  ): () => void {
    const fullId = contribution.id;

    if (this.sidebarPanels.has(fullId)) {
      console.warn(`[ContributionRegistry] Sidebar panel ${fullId} already registered, overwriting`);
    }

    this.sidebarPanels.set(fullId, {
      ...contribution,
      pluginId,
      component,
    });

    this.emit('sidebar');
    console.log(`[ContributionRegistry] Registered sidebar panel: ${fullId}`);

    return () => {
      this.sidebarPanels.delete(fullId);
      this.emit('sidebar');
    };
  }

  /**
   * Register a setting
   */
  registerSetting(pluginId: string, contribution: SettingContribution): () => void {
    const fullId = contribution.id;

    if (this.settings.has(fullId)) {
      console.warn(`[ContributionRegistry] Setting ${fullId} already registered, overwriting`);
    }

    this.settings.set(fullId, {
      ...contribution,
      pluginId,
    });

    this.emit('settings');
    console.log(`[ContributionRegistry] Registered setting: ${fullId}`);

    return () => {
      this.settings.delete(fullId);
      this.emit('settings');
    };
  }

  /**
   * Register a kanban action
   */
  registerKanbanAction(pluginId: string, contribution: KanbanActionContribution): () => void {
    const fullId = contribution.id;

    if (this.kanbanActions.has(fullId)) {
      console.warn(`[ContributionRegistry] Kanban action ${fullId} already registered, overwriting`);
    }

    this.kanbanActions.set(fullId, {
      ...contribution,
      pluginId,
    });

    this.emit('kanbanActions');
    console.log(`[ContributionRegistry] Registered kanban action: ${fullId}`);

    return () => {
      this.kanbanActions.delete(fullId);
      this.emit('kanbanActions');
    };
  }

  /**
   * Register a task validator
   */
  registerTaskValidator(
    pluginId: string, 
    contribution: TaskValidatorContribution,
    validate?: (taskId: string) => Promise<{ valid: boolean; errors: string[] }>
  ): () => void {
    const fullId = contribution.id;

    if (this.taskValidators.has(fullId)) {
      console.warn(`[ContributionRegistry] Task validator ${fullId} already registered, overwriting`);
    }

    this.taskValidators.set(fullId, {
      ...contribution,
      pluginId,
      validate,
    });

    this.emit('taskValidators');
    console.log(`[ContributionRegistry] Registered task validator: ${fullId}`);

    return () => {
      this.taskValidators.delete(fullId);
      this.emit('taskValidators');
    };
  }

  /**
   * Register a task analyzer
   */
  registerTaskAnalyzer(
    pluginId: string,
    contribution: TaskAnalyzerContribution,
    analyze?: (files: string[]) => Promise<unknown>
  ): () => void {
    const fullId = contribution.id;

    if (this.taskAnalyzers.has(fullId)) {
      console.warn(`[ContributionRegistry] Task analyzer ${fullId} already registered, overwriting`);
    }

    this.taskAnalyzers.set(fullId, {
      ...contribution,
      pluginId,
      analyze,
    });

    this.emit('taskAnalyzers');
    console.log(`[ContributionRegistry] Registered task analyzer: ${fullId}`);

    return () => {
      this.taskAnalyzers.delete(fullId);
      this.emit('taskAnalyzers');
    };
  }

  /**
   * Register a context provider
   */
  registerContextProvider(
    pluginId: string,
    contribution: ContextProviderContribution,
    provide?: () => Promise<string>
  ): () => void {
    const fullId = contribution.id;

    if (this.contextProviders.has(fullId)) {
      console.warn(`[ContributionRegistry] Context provider ${fullId} already registered, overwriting`);
    }

    this.contextProviders.set(fullId, {
      ...contribution,
      pluginId,
      provide,
    });

    this.emit('contextProviders');
    console.log(`[ContributionRegistry] Registered context provider: ${fullId}`);

    return () => {
      this.contextProviders.delete(fullId);
      this.emit('contextProviders');
    };
  }

  /**
   * Register a keybinding
   */
  registerKeybinding(pluginId: string, contribution: KeybindingContribution): () => void {
    const registered: RegisteredKeybinding = {
      ...contribution,
      pluginId,
    };

    this.keybindings.push(registered);
    this.emit('keybindings');
    console.log(`[ContributionRegistry] Registered keybinding: ${contribution.key} -> ${contribution.command}`);

    return () => {
      const index = this.keybindings.indexOf(registered);
      if (index !== -1) {
        this.keybindings.splice(index, 1);
        this.emit('keybindings');
      }
    };
  }

  /**
   * Register a menu item
   */
  registerMenuItem(pluginId: string, contribution: MenuContribution): () => void {
    const registered: RegisteredMenuItem = {
      ...contribution,
      pluginId,
    };

    this.menuItems.push(registered);
    this.emit('menus');
    console.log(`[ContributionRegistry] Registered menu item: ${contribution.command} in ${contribution.menu}`);

    return () => {
      const index = this.menuItems.indexOf(registered);
      if (index !== -1) {
        this.menuItems.splice(index, 1);
        this.emit('menus');
      }
    };
  }

  /**
   * Unregister all contributions from a plugin
   */
  unregisterPlugin(pluginId: string): void {
    // Remove commands
    for (const [id, cmd] of this.commands.entries()) {
      if (cmd.pluginId === pluginId) {
        this.commands.delete(id);
      }
    }

    // Remove sidebar panels
    for (const [id, panel] of this.sidebarPanels.entries()) {
      if (panel.pluginId === pluginId) {
        this.sidebarPanels.delete(id);
      }
    }

    // Remove settings
    for (const [id, setting] of this.settings.entries()) {
      if (setting.pluginId === pluginId) {
        this.settings.delete(id);
      }
    }

    // Remove kanban actions
    for (const [id, action] of this.kanbanActions.entries()) {
      if (action.pluginId === pluginId) {
        this.kanbanActions.delete(id);
      }
    }

    // Remove task validators
    for (const [id, validator] of this.taskValidators.entries()) {
      if (validator.pluginId === pluginId) {
        this.taskValidators.delete(id);
      }
    }

    // Remove task analyzers
    for (const [id, analyzer] of this.taskAnalyzers.entries()) {
      if (analyzer.pluginId === pluginId) {
        this.taskAnalyzers.delete(id);
      }
    }

    // Remove context providers
    for (const [id, provider] of this.contextProviders.entries()) {
      if (provider.pluginId === pluginId) {
        this.contextProviders.delete(id);
      }
    }

    // Remove keybindings
    this.keybindings = this.keybindings.filter(kb => kb.pluginId !== pluginId);

    // Remove menu items
    this.menuItems = this.menuItems.filter(mi => mi.pluginId !== pluginId);

    // Emit all change events
    this.emit('commands');
    this.emit('sidebar');
    this.emit('settings');
    this.emit('kanbanActions');
    this.emit('taskValidators');
    this.emit('taskAnalyzers');
    this.emit('contextProviders');
    this.emit('keybindings');
    this.emit('menus');

    console.log(`[ContributionRegistry] Unregistered all contributions from plugin: ${pluginId}`);
  }

  // Query methods

  /**
   * Get all registered commands
   */
  getCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get a specific command
   */
  getCommand(id: string): RegisteredCommand | undefined {
    return this.commands.get(id);
  }

  /**
   * Execute a command
   */
  async executeCommand(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) {
      throw new Error(`Command not found: ${id}`);
    }
    if (!command.handler) {
      throw new Error(`Command has no handler: ${id}`);
    }
    await command.handler();
  }

  /**
   * Get all sidebar panels
   */
  getSidebarPanels(): RegisteredSidebarPanel[] {
    return Array.from(this.sidebarPanels.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /**
   * Get a specific sidebar panel
   */
  getSidebarPanel(id: string): RegisteredSidebarPanel | undefined {
    return this.sidebarPanels.get(id);
  }

  /**
   * Get all settings
   */
  getSettings(): RegisteredSetting[] {
    return Array.from(this.settings.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  /**
   * Get settings by section
   */
  getSettingsBySection(section?: string): RegisteredSetting[] {
    return this.getSettings().filter(s => s.section === section);
  }

  /**
   * Get all kanban actions
   */
  getKanbanActions(location?: string): RegisteredKanbanAction[] {
    const actions = Array.from(this.kanbanActions.values());
    if (location) {
      return actions.filter(a => a.location === location || a.location === 'all');
    }
    return actions;
  }

  /**
   * Get all task validators
   */
  getTaskValidators(runOn?: 'pre-start' | 'post-complete'): RegisteredTaskValidator[] {
    const validators = Array.from(this.taskValidators.values());
    if (runOn) {
      return validators.filter(v => v.runOn === runOn || v.runOn === 'both');
    }
    return validators;
  }

  /**
   * Get all task analyzers
   */
  getTaskAnalyzers(): RegisteredTaskAnalyzer[] {
    return Array.from(this.taskAnalyzers.values());
  }

  /**
   * Get all context providers
   */
  getContextProviders(): RegisteredContextProvider[] {
    return Array.from(this.contextProviders.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Get all keybindings
   */
  getKeybindings(): RegisteredKeybinding[] {
    return [...this.keybindings];
  }

  /**
   * Get menu items for a specific menu
   */
  getMenuItems(menu: string): RegisteredMenuItem[] {
    return this.menuItems
      .filter(mi => mi.menu === menu)
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  // Event handling

  /**
   * Subscribe to registry changes
   */
  on(event: string, callback: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit a change event
   */
  private emit(event: string): void {
    this.listeners.get(event)?.forEach(cb => cb());
  }

  /**
   * Clear all contributions (for testing)
   */
  clear(): void {
    this.commands.clear();
    this.sidebarPanels.clear();
    this.settings.clear();
    this.kanbanActions.clear();
    this.taskValidators.clear();
    this.taskAnalyzers.clear();
    this.contextProviders.clear();
    this.keybindings = [];
    this.menuItems = [];
  }
}

// Export singleton instance
export const contributionRegistry = new ContributionRegistryImpl();

// Also export the class for testing
export { ContributionRegistryImpl };
