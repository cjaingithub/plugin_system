/**
 * @auto-claude/plugin-sdk
 * 
 * SDK for developing Auto-Claude plugins.
 * Provides type-safe APIs for plugin development.
 */

// =============================================================================
// MANIFEST TYPES
// =============================================================================

/**
 * Plugin manifest (plugin.json)
 * 
 * Required fields: id, name, version
 */
export interface PluginManifest {
  /** Unique plugin identifier (lowercase, alphanumeric, hyphens) */
  id: string;
  
  /** Human-readable plugin name */
  name: string;
  
  /** Semantic version (e.g., 1.0.0) */
  version: string;
  
  /** Plugin description */
  description?: string;
  
  /** Plugin author */
  author?: string;
  
  /** Repository URL */
  repository?: string;
  
  /** Homepage URL */
  homepage?: string;
  
  /** License identifier */
  license?: string;
  
  /** Keywords for discovery */
  keywords?: string[];
  
  /** Engine compatibility requirements */
  engines?: {
    'auto-claude'?: string;
  };
  
  /** Main process entry point (relative path) */
  main?: string;
  
  /** Renderer process entry point (relative path) */
  renderer?: string;
  
  /** Plugin contributions */
  contributes?: PluginContributions;
  
  /** When the plugin should be activated */
  activationEvents?: ActivationEvent[];
  
  /** Permissions required by the plugin */
  permissions?: PluginPermission[];
  
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  
  /** Whether enabled by default (default: true) */
  enabledByDefault?: boolean;
}

// =============================================================================
// CONTRIBUTION TYPES
// =============================================================================

/**
 * All plugin contributions
 */
export interface PluginContributions {
  commands?: CommandContribution[];
  sidebar?: {
    panels?: SidebarContribution[];
  };
  settings?: {
    sections?: SettingContribution[];
  };
  kanban?: {
    actions?: KanbanActionContribution[];
  };
  task?: {
    validators?: TaskValidatorContribution[];
    analyzers?: TaskAnalyzerContribution[];
  };
  context?: {
    providers?: ContextProviderContribution[];
  };
  keybindings?: KeybindingContribution[];
  menus?: MenuContribution[];
}

/**
 * Command contribution
 */
export interface CommandContribution {
  /** Command identifier */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Command category (shown in command palette) */
  category?: string;
  
  /** Icon identifier */
  icon?: string;
  
  /** When condition for availability */
  when?: string;
}

/**
 * Sidebar panel contribution
 */
export interface SidebarContribution {
  /** Panel identifier */
  id: string;
  
  /** Panel title */
  title: string;
  
  /** Icon identifier */
  icon?: string;
  
  /** Sort order (lower = higher) */
  order?: number;
  
  /** When condition for visibility */
  when?: string;
}

/**
 * Setting section contribution
 */
export interface SettingContribution {
  /** Setting identifier */
  id: string;
  
  /** Setting title */
  title: string;
  
  /** Icon identifier */
  icon?: string;
  
  /** Sort order */
  order?: number;
  
  /** Parent section */
  section?: string;
  
  /** Setting type */
  type?: 'boolean' | 'string' | 'number' | 'select' | 'object';
  
  /** Default value */
  default?: unknown;
  
  /** Description */
  description?: string;
  
  /** Enum values for select type */
  enum?: string[];
  
  /** Enum labels for select type */
  enumLabels?: string[];
}

/**
 * Kanban action contribution
 */
export interface KanbanActionContribution {
  /** Action identifier */
  id: string;
  
  /** Action title */
  title: string;
  
  /** Icon identifier */
  icon?: string;
  
  /** When to show the action */
  location?: 'card' | 'column' | 'header' | 'all';
  
  /** Priority order */
  order?: number;
}

/**
 * Task validator contribution
 */
export interface TaskValidatorContribution {
  /** Validator identifier */
  id: string;
  
  /** Validator name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** When to run */
  runOn?: 'pre-start' | 'post-complete' | 'both';
}

/**
 * Task analyzer contribution
 */
export interface TaskAnalyzerContribution {
  /** Analyzer identifier */
  id: string;
  
  /** Analyzer name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Supported file patterns */
  filePatterns?: string[];
}

/**
 * Context provider contribution
 */
export interface ContextProviderContribution {
  /** Provider identifier */
  id: string;
  
  /** Provider name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Priority (higher = runs first) */
  priority?: number;
}

/**
 * Keybinding contribution
 */
export interface KeybindingContribution {
  /** Command to execute */
  command: string;
  
  /** Key combination */
  key: string;
  
  /** Mac-specific key combination */
  mac?: string;
  
  /** Windows-specific key combination */
  win?: string;
  
  /** Linux-specific key combination */
  linux?: string;
  
  /** When condition */
  when?: string;
}

/**
 * Menu contribution
 */
export interface MenuContribution {
  /** Command to execute */
  command: string;
  
  /** Menu location */
  menu: string;
  
  /** Menu group */
  group?: string;
  
  /** Sort order */
  order?: number;
  
  /** When condition */
  when?: string;
}

// =============================================================================
// ACTIVATION AND PERMISSIONS
// =============================================================================

/**
 * Activation events that trigger plugin loading
 */
export type ActivationEvent =
  | 'onStartup'
  | `onCommand:${string}`
  | `onView:${string}`
  | `onFileType:${string}`
  | `onLanguage:${string}`
  | 'onTask'
  | 'onGitHub'
  | 'onGitLab';

/**
 * Plugin permissions
 */
export type PluginPermission =
  | 'filesystem'
  | 'network'
  | 'shell'
  | 'git'
  | 'clipboard'
  | 'notifications'
  | 'storage'
  | 'secrets';

// =============================================================================
// PLUGIN CONTEXT
// =============================================================================

/**
 * Plugin context passed to the activate function
 */
export interface PluginContext {
  /** Absolute path to the plugin directory */
  pluginPath: string;
  
  /** Plugin identifier */
  pluginId: string;
  
  /** 
   * Subscriptions array - add disposables here for automatic cleanup
   * on deactivation
   */
  subscriptions: Disposable[];
  
  // Registration APIs
  
  /**
   * Register a command
   * @param contribution Command contribution definition
   * @param handler Command handler function
   */
  registerCommand(
    contribution: CommandContribution,
    handler: () => void | Promise<void>
  ): void;
  
  /**
   * Register a sidebar panel
   * @param contribution Sidebar panel contribution definition
   */
  registerSidebarPanel(contribution: SidebarContribution): void;
  
  /**
   * Register a setting
   * @param contribution Setting contribution definition
   */
  registerSetting(contribution: SettingContribution): void;
  
  // Logging APIs
  
  /**
   * Log an info message
   * @param message Message to log
   */
  log(message: string): void;
  
  /**
   * Log a warning message
   * @param message Message to log
   */
  warn(message: string): void;
  
  /**
   * Log an error message
   * @param message Message to log
   */
  error(message: string): void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  (): void;
}

// =============================================================================
// PLUGIN EXPORTS
// =============================================================================

/**
 * Plugin module interface
 * 
 * Your plugin should export an object matching this interface:
 * 
 * @example
 * ```typescript
 * import type { PluginModule, PluginContext } from '@auto-claude/plugin-sdk';
 * 
 * export const activate = async (context: PluginContext) => {
 *   context.registerCommand(
 *     { id: 'my-plugin.hello', title: 'Say Hello' },
 *     () => console.log('Hello from my plugin!')
 *   );
 * };
 * 
 * export const deactivate = () => {
 *   console.log('Goodbye!');
 * };
 * ```
 */
export interface PluginModule {
  /**
   * Called when the plugin is activated
   * @param context Plugin context with APIs
   */
  activate: (context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when the plugin is deactivated (optional)
   */
  deactivate?: () => void | Promise<void>;
}

// =============================================================================
// PLUGIN STATE
// =============================================================================

/**
 * Plugin lifecycle states
 */
export type PluginState =
  | 'installed'
  | 'loaded'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'inactive'
  | 'error';

/**
 * Plugin runtime information
 */
export interface PluginInfo {
  /** Plugin identifier */
  id: string;
  
  /** Plugin manifest */
  manifest: PluginManifest;
  
  /** Absolute path to plugin directory */
  path: string;
  
  /** Current lifecycle state */
  state: PluginState;
  
  /** Error message if state is 'error' */
  error?: string;
  
  /** When the plugin was loaded */
  loadedAt?: Date;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation error
 */
export interface PluginValidationError {
  field: string;
  message: string;
}

/**
 * Validation warning
 */
export interface PluginValidationWarning {
  field: string;
  message: string;
}

/**
 * Validation result
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: PluginValidationError[];
  warnings: PluginValidationWarning[];
}

// =============================================================================
// API INTERFACES
// =============================================================================

/**
 * Task API for plugins
 */
export interface TaskAPI {
  /** Get all tasks */
  getTasks(): Promise<Task[]>;
  
  /** Get a specific task */
  getTask(taskId: string): Promise<Task | null>;
  
  /** Create a new task */
  createTask(task: TaskInput): Promise<Task>;
  
  /** Update a task */
  updateTask(taskId: string, updates: Partial<TaskInput>): Promise<Task>;
  
  /** Delete a task */
  deleteTask(taskId: string): Promise<void>;
}

/**
 * Task structure
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task input for creation/update
 */
export interface TaskInput {
  title: string;
  description?: string;
  status?: Task['status'];
}

/**
 * Project API for plugins
 */
export interface ProjectAPI {
  /** Get the current project path */
  getCurrentProject(): Promise<string | null>;
  
  /** Get all open projects */
  getProjects(): Promise<string[]>;
}

/**
 * Settings API for plugins
 */
export interface SettingsAPI {
  /** Get a setting value */
  get<T>(key: string): Promise<T | undefined>;
  
  /** Set a setting value */
  set<T>(key: string, value: T): Promise<void>;
  
  /** Watch for setting changes */
  onDidChange(key: string, callback: (value: unknown) => void): Disposable;
}

/**
 * Storage API for plugins (persisted per-plugin)
 */
export interface StorageAPI {
  /** Get a stored value */
  get<T>(key: string): Promise<T | undefined>;
  
  /** Set a stored value */
  set<T>(key: string, value: T): Promise<void>;
  
  /** Delete a stored value */
  delete(key: string): Promise<void>;
  
  /** Get all keys */
  keys(): Promise<string[]>;
  
  /** Clear all stored values */
  clear(): Promise<void>;
}

/**
 * Notification API for plugins
 */
export interface NotificationAPI {
  /** Show an info notification */
  info(message: string, options?: NotificationOptions): void;
  
  /** Show a warning notification */
  warn(message: string, options?: NotificationOptions): void;
  
  /** Show an error notification */
  error(message: string, options?: NotificationOptions): void;
  
  /** Show a success notification */
  success(message: string, options?: NotificationOptions): void;
}

/**
 * Notification options
 */
export interface NotificationOptions {
  /** Duration in milliseconds (0 = persistent) */
  duration?: number;
  
  /** Action buttons */
  actions?: NotificationAction[];
}

/**
 * Notification action button
 */
export interface NotificationAction {
  label: string;
  callback: () => void;
}

/**
 * Extended plugin context with full APIs (for Phase 2+)
 */
export interface ExtendedPluginContext extends PluginContext {
  /** Task management API */
  tasks: TaskAPI;
  
  /** Project API */
  project: ProjectAPI;
  
  /** Settings API */
  settings: SettingsAPI;
  
  /** Per-plugin storage API */
  storage: StorageAPI;
  
  /** Notification API */
  notifications: NotificationAPI;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Type guard to check if a value is a valid PluginManifest
 */
export function isValidManifest(value: unknown): value is PluginManifest {
  if (typeof value !== 'object' || value === null) return false;
  
  const manifest = value as Record<string, unknown>;
  
  return (
    typeof manifest.id === 'string' &&
    typeof manifest.name === 'string' &&
    typeof manifest.version === 'string'
  );
}

/**
 * Create a disposable from a cleanup function
 */
export function createDisposable(cleanup: () => void): Disposable {
  return cleanup;
}

/**
 * Combine multiple disposables into one
 */
export function combineDisposables(...disposables: Disposable[]): Disposable {
  return () => {
    for (const dispose of disposables) {
      try {
        dispose();
      } catch (error) {
        console.error('Error disposing:', error);
      }
    }
  };
}
