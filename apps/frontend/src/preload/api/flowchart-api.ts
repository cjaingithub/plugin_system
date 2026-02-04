/**
 * Flowchart Preload API
 *
 * Exposes flowchart import operations to the renderer process.
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { IPCResult } from '../../shared/types/common';
import type {
  TaskGraph,
  FlowchartValidationResult,
  FlowchartGenerateResult,
  FlowchartPluginInfo,
  FlowchartGenerateOptions,
} from '../../shared/types/flowchart';

/**
 * Flowchart API exposed to the renderer process
 */
export interface FlowchartAPI {
  /**
   * Parse a flowchart file and return a TaskGraph
   * @param filePath - Path to the flowchart file (XML, DRAWIO, etc.)
   */
  parseFlowchart: (filePath: string) => Promise<IPCResult<TaskGraph>>;

  /**
   * Validate a flowchart file's structure
   * @param filePath - Path to the flowchart file
   */
  validateFlowchart: (filePath: string) => Promise<IPCResult<FlowchartValidationResult>>;

  /**
   * Generate an implementation plan from a flowchart file
   * @param filePath - Path to the flowchart file
   * @param options - Generation options
   */
  generateFromFlowchart: (
    filePath: string,
    options: FlowchartGenerateOptions
  ) => Promise<IPCResult<FlowchartGenerateResult>>;

  /**
   * List available flowchart plugins
   */
  listFlowchartPlugins: () => Promise<IPCResult<FlowchartPluginInfo[]>>;
}

/**
 * Create the flowchart API object
 */
export function createFlowchartAPI(): FlowchartAPI {
  return {
    parseFlowchart: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOWCHART_PARSE, filePath),

    validateFlowchart: (filePath: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOWCHART_VALIDATE, filePath),

    generateFromFlowchart: (filePath: string, options: FlowchartGenerateOptions) =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOWCHART_GENERATE, filePath, options),

    listFlowchartPlugins: () =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOWCHART_LIST_PLUGINS),
  };
}
