/**
 * Plugin System Types
 * 
 * Defines the types for the Auto-Claude plugin architecture.
 * Plugins can extend the application with new features like
 * commands, sidebar panels, settings, validators, and more.
 */

/**
 * Plugin manifest schema (plugin.json)
 * This is the main configuration file for a plugin.
 */
export interface PluginManifest {
  /** Unique identifier for the plugin (e.g., "flowchart-importer") */
  id: string;
  
  /** Human-readable name of the plugin */
  name: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Short description of what the plugin does */
  description: string;
  
  /** Author name or organization */
  author?: string;
  
  /** Repository URL for the plugin source code */
  repository?: string;
  
  /** Homepage or documentation URL */
  homepage?: string;
  
  /** License identifier (e.g., "MIT", "Apache-2.0") */
  license?: string;
  
  /** Keywords for discovery */
  keywords?: string[];
  
  /** Required Auto-Claude version range (e.g., ">=2.7.0") */
  engines?: {
    'auto-claude'?: string;
  };
  
  /** Path to the main process entry point (relative to plugin root) */
  main?: string;
  
  /** Path to the renderer process entry point (relative to plugin root) */
  renderer?: string;
  
  /** Contributions this plugin makes to the application */
  contributes?: PluginContributions;
  
  /** Events that trigger plugin activation */
  activationEvents?: ActivationEvent[];
  
  /** Permissions required by the plugin */
  permissions?: PluginPermission[];
  
  /** Plugin dependencies */
  dependencies?: Record<string, string>;
  
  /** Whether the plugin is enabled by default */
  enabledByDefault?: boolean;
}

/**
 * Contributions a plugin can make to extend the application
 */
export interface PluginContributions {
  /** Commands added to the command palette */
  commands?: CommandContribution[];
  
  /** Sidebar panels */
  sidebar?: SidebarContribution[];
  
  /** Settings sections */
  settings?: SettingContribution[];
  
  /** Kanban board actions */
  kanbanActions?: KanbanActionContribution[];
  
  /** Task validators */
  taskValidators?: TaskValidatorContribution[];
  
  /** Task analyzers */
  taskAnalyzers?: TaskAnalyzerContribution[];
  
  /** Context providers for AI agents */
  contextProviders?: ContextProviderContribution[];
  
  /** Keybindings */
  keybindings?: KeybindingContribution[];
  
  /** Menu items */
  menus?: MenuContribution[];
}

/**
 * Command contribution - adds a command to the command palette
 */
export interface CommandContribution {
  /** Unique command ID (e.g., "flowchart.import") */
  id: string;
  
  /** Display title in command palette */
  title: string;
  
  /** Optional category for grouping */
  category?: string;
  
  /** Icon name from Lucide icons */
  icon?: string;
  
  /** Keyboard shortcut */
  keybinding?: string;
  
  /** When clause for visibility */
  when?: string;
}

/**
 * Sidebar panel contribution
 */
export interface SidebarContribution {
  /** Unique panel ID */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Icon name from Lucide icons */
  icon: string;
  
  /** Sort order (lower = higher priority) */
  order?: number;
  
  /** When clause for visibility */
  when?: string;
}

/**
 * Setting contribution
 */
export interface SettingContribution {
  /** Setting ID (e.g., "flowchart.defaultFormat") */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Description/help text */
  description?: string;
  
  /** Setting type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'path';
  
  /** Default value */
  default?: unknown;
  
  /** Options for select/multiselect types */
  options?: Array<{ label: string; value: string }> | string[];
  
  /** Minimum value for number type */
  minimum?: number;
  
  /** Maximum value for number type */
  maximum?: number;
  
  /** Pattern for string validation */
  pattern?: string;
  
  /** Group/section for the setting */
  section?: string;
  
  /** Sort order within section */
  order?: number;
}

/**
 * Kanban board action contribution
 */
export interface KanbanActionContribution {
  /** Unique action ID */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Icon name */
  icon?: string;
  
  /** Command to execute when clicked */
  command: string;
  
  /** Which column header to show in ("backlog", "in_progress", "review", "done", or "all") */
  location: 'backlog' | 'in_progress' | 'review' | 'done' | 'all';
  
  /** Sort order */
  order?: number;
  
  /** When clause for visibility */
  when?: string;
}

/**
 * Task validator contribution
 */
export interface TaskValidatorContribution {
  /** Unique validator ID */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description of what is validated */
  description?: string;
  
  /** When to run: before task starts, after completion, or both */
  runOn: 'pre-start' | 'post-complete' | 'both';
  
  /** Whether validation failure blocks the task */
  blocking?: boolean;
}

/**
 * Task analyzer contribution
 */
export interface TaskAnalyzerContribution {
  /** Unique analyzer ID */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** File patterns to analyze (glob patterns) */
  filePatterns?: string[];
}

/**
 * Context provider contribution for AI agents
 */
export interface ContextProviderContribution {
  /** Unique provider ID */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description */
  description?: string;
  
  /** Priority for context inclusion (higher = more important) */
  priority?: number;
}

/**
 * Keybinding contribution
 */
export interface KeybindingContribution {
  /** Command to execute */
  command: string;
  
  /** Key combination (e.g., "Ctrl+Shift+P") */
  key: string;
  
  /** macOS-specific key combination */
  mac?: string;
  
  /** When clause */
  when?: string;
}

/**
 * Menu contribution
 */
export interface MenuContribution {
  /** Menu location */
  menu: 'commandPalette' | 'taskContextMenu' | 'fileContextMenu' | 'editorContextMenu';
  
  /** Command to execute */
  command: string;
  
  /** Group within the menu */
  group?: string;
  
  /** When clause */
  when?: string;
  
  /** Sort order */
  order?: number;
}

/**
 * Activation events that trigger plugin loading
 */
export type ActivationEvent =
  | '*' // Always activate
  | `onCommand:${string}` // When a command is invoked
  | `onView:${string}` // When a view/panel is opened
  | 'onStartup' // On application startup
  | `onLanguage:${string}` // When a file of specific language is opened
  | `onFileSystem:${string}` // When a file matching pattern is accessed
  | `workspaceContains:${string}`; // When workspace contains specific files

/**
 * Permissions that plugins can request
 */
export type PluginPermission =
  | 'filesystem' // Read/write files
  | 'filesystem:read' // Read-only file access
  | 'network' // Network requests
  | 'shell' // Execute shell commands
  | 'clipboard' // Access clipboard
  | 'notifications' // Show notifications
  | 'tasks' // Access task management
  | 'settings' // Modify settings
  | 'git' // Git operations
  | 'terminal'; // Terminal access

/**
 * Plugin state after loading
 */
export type PluginState = 
  | 'installed' // Plugin files exist but not loaded
  | 'loaded' // Plugin loaded but not activated
  | 'activating' // Plugin is being activated
  | 'active' // Plugin is active and running
  | 'deactivating' // Plugin is being deactivated
  | 'inactive' // Plugin was deactivated
  | 'error'; // Plugin encountered an error

/**
 * Runtime plugin information
 */
export interface PluginInfo {
  /** Plugin manifest */
  manifest: PluginManifest;
  
  /** Absolute path to plugin directory */
  path: string;
  
  /** Current state */
  state: PluginState;
  
  /** Whether the plugin is enabled */
  enabled: boolean;
  
  /** Error message if state is 'error' */
  error?: string;
  
  /** Activation timestamp */
  activatedAt?: number;
  
  /** Installation timestamp */
  installedAt?: number;
}

/**
 * Plugin settings stored per-plugin
 */
export interface PluginSettings {
  /** Plugin ID */
  pluginId: string;
  
  /** Whether the plugin is enabled */
  enabled: boolean;
  
  /** Plugin-specific settings values */
  settings: Record<string, unknown>;
}

/**
 * Result of plugin installation
 */
export interface PluginInstallResult {
  success: boolean;
  pluginId?: string;
  error?: string;
  manifest?: PluginManifest;
}

/**
 * Result of plugin validation
 */
export interface PluginValidationResult {
  valid: boolean;
  errors: PluginValidationError[];
  warnings: PluginValidationWarning[];
}

export interface PluginValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface PluginValidationWarning {
  code: string;
  message: string;
  path?: string;
}

/**
 * JSON Schema for plugin.json validation
 */
export const PLUGIN_MANIFEST_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['id', 'name', 'version'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[a-z0-9-]+$',
      description: 'Unique plugin identifier (lowercase, alphanumeric, hyphens)',
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Human-readable plugin name',
    },
    version: {
      type: 'string',
      pattern: '^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$',
      description: 'Semantic version (e.g., 1.0.0, 1.0.0-beta.1)',
    },
    description: {
      type: 'string',
      maxLength: 500,
    },
    author: {
      type: 'string',
    },
    repository: {
      type: 'string',
      format: 'uri',
    },
    homepage: {
      type: 'string',
      format: 'uri',
    },
    license: {
      type: 'string',
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
    },
    engines: {
      type: 'object',
      properties: {
        'auto-claude': { type: 'string' },
      },
    },
    main: {
      type: 'string',
      description: 'Main process entry point',
    },
    renderer: {
      type: 'string',
      description: 'Renderer process entry point',
    },
    contributes: {
      type: 'object',
      properties: {
        commands: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              category: { type: 'string' },
              icon: { type: 'string' },
              keybinding: { type: 'string' },
              when: { type: 'string' },
            },
          },
        },
        sidebar: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'title', 'icon'],
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              icon: { type: 'string' },
              order: { type: 'number' },
              when: { type: 'string' },
            },
          },
        },
        settings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'label', 'type'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string', enum: ['string', 'number', 'boolean', 'select', 'multiselect', 'path'] },
              default: {},
              options: { type: 'array' },
              minimum: { type: 'number' },
              maximum: { type: 'number' },
              pattern: { type: 'string' },
              section: { type: 'string' },
              order: { type: 'number' },
            },
          },
        },
        kanbanActions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'label', 'command', 'location'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              icon: { type: 'string' },
              command: { type: 'string' },
              location: { type: 'string', enum: ['backlog', 'in_progress', 'review', 'done', 'all'] },
              order: { type: 'number' },
              when: { type: 'string' },
            },
          },
        },
        taskValidators: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'runOn'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              runOn: { type: 'string', enum: ['pre-start', 'post-complete', 'both'] },
              blocking: { type: 'boolean' },
            },
          },
        },
        taskAnalyzers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              filePatterns: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        contextProviders: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number' },
            },
          },
        },
        keybindings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['command', 'key'],
            properties: {
              command: { type: 'string' },
              key: { type: 'string' },
              mac: { type: 'string' },
              when: { type: 'string' },
            },
          },
        },
        menus: {
          type: 'array',
          items: {
            type: 'object',
            required: ['menu', 'command'],
            properties: {
              menu: { type: 'string', enum: ['commandPalette', 'taskContextMenu', 'fileContextMenu', 'editorContextMenu'] },
              command: { type: 'string' },
              group: { type: 'string' },
              when: { type: 'string' },
              order: { type: 'number' },
            },
          },
        },
      },
    },
    activationEvents: {
      type: 'array',
      items: { type: 'string' },
    },
    permissions: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['filesystem', 'filesystem:read', 'network', 'shell', 'clipboard', 'notifications', 'tasks', 'settings', 'git', 'terminal'],
      },
    },
    dependencies: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    enabledByDefault: {
      type: 'boolean',
    },
  },
} as const;
