/**
 * Plugin Loader
 * 
 * Discovers, validates, and loads plugins from the plugins directory.
 * Plugins are loaded from ~/.auto-claude/plugins/ (or app userData on packaged apps).
 */

import { app } from 'electron';
import { existsSync, readdirSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import type {
  PluginManifest,
  PluginInfo,
  PluginState,
  PluginValidationResult,
  PluginValidationError,
  PluginValidationWarning,
  PLUGIN_MANIFEST_SCHEMA,
} from '../../shared/types/plugin';

/**
 * Get the plugins directory path
 */
export function getPluginsDirectory(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'plugins');
}

/**
 * Ensure the plugins directory exists
 */
export function ensurePluginsDirectory(): string {
  const pluginsDir = getPluginsDirectory();
  if (!existsSync(pluginsDir)) {
    mkdirSync(pluginsDir, { recursive: true });
    console.log(`[PluginLoader] Created plugins directory: ${pluginsDir}`);
  }
  return pluginsDir;
}

/**
 * Discover all plugins in the plugins directory
 */
export function discoverPlugins(): string[] {
  const pluginsDir = ensurePluginsDirectory();
  const pluginPaths: string[] = [];

  try {
    const entries = readdirSync(pluginsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(pluginsDir, entry.name);
        const manifestPath = path.join(pluginPath, 'plugin.json');
        
        if (existsSync(manifestPath)) {
          pluginPaths.push(pluginPath);
        } else {
          console.warn(`[PluginLoader] Skipping ${entry.name}: no plugin.json found`);
        }
      }
    }
  } catch (error) {
    console.error('[PluginLoader] Error discovering plugins:', error);
  }

  console.log(`[PluginLoader] Discovered ${pluginPaths.length} plugin(s)`);
  return pluginPaths;
}

/**
 * Read and parse a plugin manifest
 */
export function readPluginManifest(pluginPath: string): PluginManifest | null {
  const manifestPath = path.join(pluginPath, 'plugin.json');
  
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as PluginManifest;
    return manifest;
  } catch (error) {
    console.error(`[PluginLoader] Error reading manifest from ${pluginPath}:`, error);
    return null;
  }
}

/**
 * Validate a plugin manifest against the schema
 */
export function validateManifest(manifest: PluginManifest, pluginPath: string): PluginValidationResult {
  const errors: PluginValidationError[] = [];
  const warnings: PluginValidationWarning[] = [];

  // Required fields
  if (!manifest.id) {
    errors.push({ code: 'MISSING_ID', message: 'Plugin ID is required' });
  } else if (!/^[a-z0-9-]+$/.test(manifest.id)) {
    errors.push({ 
      code: 'INVALID_ID', 
      message: 'Plugin ID must contain only lowercase letters, numbers, and hyphens',
      path: 'id'
    });
  }

  if (!manifest.name) {
    errors.push({ code: 'MISSING_NAME', message: 'Plugin name is required' });
  }

  if (!manifest.version) {
    errors.push({ code: 'MISSING_VERSION', message: 'Plugin version is required' });
  } else if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(manifest.version)) {
    errors.push({ 
      code: 'INVALID_VERSION', 
      message: 'Plugin version must be a valid semantic version (e.g., 1.0.0)',
      path: 'version'
    });
  }

  // Validate entry points exist
  if (manifest.main) {
    const mainPath = path.join(pluginPath, manifest.main);
    if (!existsSync(mainPath)) {
      errors.push({ 
        code: 'MISSING_MAIN', 
        message: `Main entry point not found: ${manifest.main}`,
        path: 'main'
      });
    }
  }

  if (manifest.renderer) {
    const rendererPath = path.join(pluginPath, manifest.renderer);
    if (!existsSync(rendererPath)) {
      errors.push({ 
        code: 'MISSING_RENDERER', 
        message: `Renderer entry point not found: ${manifest.renderer}`,
        path: 'renderer'
      });
    }
  }

  // Validate contributions
  if (manifest.contributes) {
    // Validate commands
    if (manifest.contributes.commands) {
      manifest.contributes.commands.forEach((cmd, index) => {
        if (!cmd.id) {
          errors.push({ 
            code: 'INVALID_COMMAND', 
            message: `Command at index ${index} is missing 'id'`,
            path: `contributes.commands[${index}]`
          });
        }
        if (!cmd.title) {
          errors.push({ 
            code: 'INVALID_COMMAND', 
            message: `Command at index ${index} is missing 'title'`,
            path: `contributes.commands[${index}]`
          });
        }
      });
    }

    // Validate sidebar panels
    if (manifest.contributes.sidebar) {
      manifest.contributes.sidebar.forEach((panel, index) => {
        if (!panel.id) {
          errors.push({ 
            code: 'INVALID_SIDEBAR', 
            message: `Sidebar panel at index ${index} is missing 'id'`,
            path: `contributes.sidebar[${index}]`
          });
        }
        if (!panel.icon) {
          errors.push({ 
            code: 'INVALID_SIDEBAR', 
            message: `Sidebar panel at index ${index} is missing 'icon'`,
            path: `contributes.sidebar[${index}]`
          });
        }
      });
    }

    // Validate settings
    if (manifest.contributes.settings) {
      manifest.contributes.settings.forEach((setting, index) => {
        if (!setting.id) {
          errors.push({ 
            code: 'INVALID_SETTING', 
            message: `Setting at index ${index} is missing 'id'`,
            path: `contributes.settings[${index}]`
          });
        }
        if (!setting.type) {
          errors.push({ 
            code: 'INVALID_SETTING', 
            message: `Setting at index ${index} is missing 'type'`,
            path: `contributes.settings[${index}]`
          });
        }
      });
    }
  }

  // Warnings for recommended fields
  if (!manifest.description) {
    warnings.push({ code: 'MISSING_DESCRIPTION', message: 'Plugin description is recommended' });
  }

  if (!manifest.author) {
    warnings.push({ code: 'MISSING_AUTHOR', message: 'Plugin author is recommended' });
  }

  if (!manifest.repository) {
    warnings.push({ code: 'MISSING_REPOSITORY', message: 'Plugin repository URL is recommended' });
  }

  if (!manifest.license) {
    warnings.push({ code: 'MISSING_LICENSE', message: 'Plugin license is recommended' });
  }

  // Check for entry points
  if (!manifest.main && !manifest.renderer) {
    warnings.push({ 
      code: 'NO_ENTRY_POINTS', 
      message: 'Plugin has no entry points (main or renderer). It may only provide static contributions.'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Load a single plugin and return its info
 */
export function loadPlugin(pluginPath: string): PluginInfo | null {
  const manifest = readPluginManifest(pluginPath);
  
  if (!manifest) {
    return null;
  }

  const validation = validateManifest(manifest, pluginPath);
  
  if (!validation.valid) {
    console.error(`[PluginLoader] Invalid plugin at ${pluginPath}:`);
    validation.errors.forEach(err => console.error(`  - ${err.message}`));
    
    return {
      manifest,
      path: pluginPath,
      state: 'error',
      enabled: false,
      error: validation.errors.map(e => e.message).join('; '),
      installedAt: Date.now(),
    };
  }

  // Log warnings
  if (validation.warnings.length > 0) {
    console.warn(`[PluginLoader] Warnings for plugin ${manifest.id}:`);
    validation.warnings.forEach(warn => console.warn(`  - ${warn.message}`));
  }

  console.log(`[PluginLoader] Loaded plugin: ${manifest.name} v${manifest.version}`);
  
  return {
    manifest,
    path: pluginPath,
    state: 'loaded',
    enabled: manifest.enabledByDefault !== false, // Enabled by default unless explicitly disabled
    installedAt: Date.now(),
  };
}

/**
 * Load all plugins from the plugins directory
 */
export function loadAllPlugins(): Map<string, PluginInfo> {
  const plugins = new Map<string, PluginInfo>();
  const pluginPaths = discoverPlugins();

  for (const pluginPath of pluginPaths) {
    const pluginInfo = loadPlugin(pluginPath);
    
    if (pluginInfo) {
      // Check for duplicate IDs
      if (plugins.has(pluginInfo.manifest.id)) {
        console.warn(
          `[PluginLoader] Duplicate plugin ID: ${pluginInfo.manifest.id}. ` +
          `Skipping plugin at ${pluginPath}`
        );
        continue;
      }
      
      plugins.set(pluginInfo.manifest.id, pluginInfo);
    }
  }

  console.log(`[PluginLoader] Loaded ${plugins.size} plugin(s) successfully`);
  return plugins;
}

/**
 * Check if a plugin version satisfies the engine requirement
 */
export function checkEngineCompatibility(
  manifest: PluginManifest, 
  appVersion: string
): boolean {
  if (!manifest.engines?.['auto-claude']) {
    return true; // No requirement specified, assume compatible
  }

  const requirement = manifest.engines['auto-claude'];
  
  // Simple version check (supports >=, >, <, <=, =, ^, ~)
  // For now, just check >= which is most common
  const match = requirement.match(/^>=?\s*(\d+\.\d+\.\d+)/);
  if (match) {
    const requiredVersion = match[1];
    return compareVersions(appVersion, requiredVersion) >= 0;
  }

  // If we can't parse it, assume compatible
  console.warn(`[PluginLoader] Could not parse engine requirement: ${requirement}`);
  return true;
}

/**
 * Simple version comparison
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }

  return 0;
}
