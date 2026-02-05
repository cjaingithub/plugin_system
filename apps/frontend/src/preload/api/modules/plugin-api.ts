/**
 * Plugin API for renderer process
 *
 * Provides access to plugin management features:
 * - Open plugins folder
 * - List plugins
 * - Enable/disable plugins
 */

import { IPC_CHANNELS } from '../../../shared/constants';
import { invokeIpc } from './ipc-utils';

export interface PluginResult {
  success: boolean;
  error?: string;
}

/**
 * Plugin API interface exposed to renderer
 */
export interface PluginAPI {
  openPluginsFolder: () => Promise<PluginResult>;
}

/**
 * Creates the Plugin API implementation
 */
export const createPluginAPI = (): PluginAPI => ({
  openPluginsFolder: (): Promise<PluginResult> =>
    invokeIpc(IPC_CHANNELS.PLUGIN_OPEN_FOLDER),
});
