/**
 * Plugin IPC Handlers
 *
 * Handles plugin-related IPC operations:
 * - Opening plugins folder
 */

import { ipcMain, shell, app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../../shared/constants';

/**
 * Get the plugins directory path
 */
function getPluginsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, '..', '.auto-claude', 'plugins');
}

/**
 * Ensure the plugins directory exists
 */
function ensurePluginsDirectory(): string {
  const pluginsPath = getPluginsPath();
  if (!existsSync(pluginsPath)) {
    mkdirSync(pluginsPath, { recursive: true });
  }
  return pluginsPath;
}

/**
 * Register plugin-related IPC handlers
 */
export function registerPluginHandlers(): void {
  // Open plugins folder in system file explorer
  ipcMain.handle(IPC_CHANNELS.PLUGIN_OPEN_FOLDER, async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const pluginsPath = ensurePluginsDirectory();
      console.log('[Plugin] Opening plugins folder:', pluginsPath);
      await shell.openPath(pluginsPath);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Plugin] Failed to open plugins folder:', error);
      return { success: false, error: errorMessage };
    }
  });
}
