/**
 * Flowchart Import IPC Handlers
 *
 * Handles IPC communication for flowchart import operations:
 * - Parse flowchart files to TaskGraph
 * - Validate TaskGraph structure
 * - Generate implementation plans from TaskGraph
 */

import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type { IPCResult } from '../../shared/types/common';
import type {
  TaskGraph,
  FlowchartValidationResult,
  FlowchartGenerateResult,
  FlowchartPluginInfo,
  FlowchartGenerateOptions,
} from '../../shared/types/flowchart';
import type { PythonEnvManager } from '../python-env-manager';
import { getEffectiveSourcePath } from '../updater/path-resolver';

/**
 * Run a Python flowchart CLI command and return the result
 */
async function runFlowchartCommand(
  pythonEnvManager: PythonEnvManager,
  args: string[],
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const pythonPath = pythonEnvManager.getPythonPath();
    const backendPath = getEffectiveSourcePath();

    console.log('[Flowchart] Running command with args:', args);
    console.log('[Flowchart] Python path:', pythonPath);
    console.log('[Flowchart] Backend path:', backendPath);

    if (!pythonPath) {
      console.error('[Flowchart] Python environment not initialized');
      resolve({
        success: false,
        stdout: '',
        stderr: 'Python environment not initialized. Please wait for the project to load completely.',
      });
      return;
    }

    const proc: ChildProcess = spawn(pythonPath, ['-m', 'flowchart.cli', ...args], {
      cwd: backendPath,
      env: {
        ...pythonEnvManager.getPythonEnv(),
        PYTHONPATH: backendPath,
      },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code: number | null) => {
      console.log('[Flowchart] Command completed with code:', code);
      if (stderr) {
        console.log('[Flowchart] stderr:', stderr);
      }
      if (code !== 0) {
        console.error('[Flowchart] Command failed. stdout:', stdout, 'stderr:', stderr);
      }
      resolve({
        success: code === 0,
        stdout,
        stderr,
      });
    });

    proc.on('error', (err: Error) => {
      console.error('[Flowchart] Spawn error:', err.message);
      resolve({
        success: false,
        stdout: '',
        stderr: `Failed to run Python command: ${err.message}`,
      });
    });
  });
}

/**
 * Register flowchart IPC handlers
 */
export function registerFlowchartHandlers(
  pythonEnvManager: PythonEnvManager,
  getMainWindow: () => BrowserWindow | null,
): void {
  // Parse flowchart file to TaskGraph
  ipcMain.handle(
    IPC_CHANNELS.FLOWCHART_PARSE,
    async (_, filePath: string): Promise<IPCResult<TaskGraph>> => {
      try {
        const result = await runFlowchartCommand(pythonEnvManager, [
          'parse',
          filePath,
          '--output',
          'json',
        ]);

        if (!result.success) {
          return {
            success: false,
            error: result.stderr || 'Failed to parse flowchart',
          };
        }

        const taskGraph = JSON.parse(result.stdout) as TaskGraph;
        return { success: true, data: taskGraph };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // Validate TaskGraph structure
  ipcMain.handle(
    IPC_CHANNELS.FLOWCHART_VALIDATE,
    async (_, filePath: string): Promise<IPCResult<FlowchartValidationResult>> => {
      try {
        const result = await runFlowchartCommand(pythonEnvManager, [
          'validate',
          filePath,
          '--output',
          'json',
        ]);

        // Parse validation result from stdout
        const validationResult = JSON.parse(result.stdout) as FlowchartValidationResult;
        return { success: true, data: validationResult };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // Generate implementation plan from flowchart
  ipcMain.handle(
    IPC_CHANNELS.FLOWCHART_GENERATE,
    async (_, filePath: string, options: FlowchartGenerateOptions): Promise<IPCResult<FlowchartGenerateResult>> => {
      try {
        const args = ['generate', filePath, '--project-dir', options.projectPath, '--output', 'json'];

        if (options.specName) {
          args.push('--spec-name', options.specName);
        }

        if (options.workflowType) {
          args.push('--workflow-type', options.workflowType);
        }

        if (options.force) {
          args.push('--force');
        }

        const result = await runFlowchartCommand(pythonEnvManager, args);

        if (!result.success) {
          return {
            success: false,
            error: result.stderr || 'Failed to generate implementation plan',
          };
        }

        const generateResult = JSON.parse(result.stdout) as FlowchartGenerateResult;
        return { success: true, data: generateResult };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );

  // List available flowchart plugins
  ipcMain.handle(
    IPC_CHANNELS.FLOWCHART_LIST_PLUGINS,
    async (): Promise<IPCResult<FlowchartPluginInfo[]>> => {
      try {
        const result = await runFlowchartCommand(pythonEnvManager, [
          'plugins',
          '--output',
          'json',
        ]);

        if (!result.success) {
          return {
            success: false,
            error: result.stderr || 'Failed to list plugins',
          };
        }

        const plugins = JSON.parse(result.stdout) as FlowchartPluginInfo[];
        return { success: true, data: plugins };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  );
}
