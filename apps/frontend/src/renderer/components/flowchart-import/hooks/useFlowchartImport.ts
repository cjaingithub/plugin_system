/**
 * Custom hook for managing flowchart import state and operations
 */

import { useState, useCallback } from 'react';
import type {
  FlowchartImportState,
  ImportStep,
  TaskGraph,
  FlowchartValidationResult,
  FlowchartGenerateResult,
  GenerationStage,
} from '../types';

const initialState: FlowchartImportState = {
  step: 'upload',
  selectedFile: null,
  filePath: null,
  taskGraph: null,
  validationResult: null,
  specName: '',
  includeTestingPhase: true,
  includeDocumentation: true,
  isLoading: false,
  error: null,
  progress: null,
  generateResult: null,
};

export interface UseFlowchartImportOptions {
  projectId: string;
  projectDir: string;
  onComplete?: (result: FlowchartGenerateResult) => void;
}

export interface UseFlowchartImportReturn {
  state: FlowchartImportState;

  // File operations
  handleFileSelect: (file: File) => Promise<void>;
  openFileDialog: () => Promise<void>;
  clearFile: () => void;

  // Configuration
  setSpecName: (name: string) => void;
  setIncludeTestingPhase: (include: boolean) => void;
  setIncludeDocumentation: (include: boolean) => void;

  // Navigation
  goToStep: (step: ImportStep) => void;
  goBack: () => void;
  canGoBack: boolean;

  // Actions
  startGeneration: () => Promise<void>;
  reset: () => void;
}

export function useFlowchartImport({
  projectId,
  projectDir,
  onComplete,
}: UseFlowchartImportOptions): UseFlowchartImportReturn {
  const [state, setState] = useState<FlowchartImportState>(initialState);

  // Helper to update state
  const updateState = useCallback((updates: Partial<FlowchartImportState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Process a file path (from dialog or drag-drop)
  const processFilePath = useCallback(
    async (filePath: string, fileName?: string) => {
      console.log('[FlowchartImport] Processing file:', filePath);
      
      updateState({
        selectedFile: null,
        filePath,
        isLoading: true,
        error: null,
      });

      try {
        // Check if parseFlowchart API is available
        if (!window.electronAPI?.parseFlowchart) {
          throw new Error('Flowchart import API not available. Please restart the application.');
        }

        console.log('[FlowchartImport] Calling parseFlowchart...');
        
        // Parse the flowchart
        const parseResult = await window.electronAPI.parseFlowchart(filePath);
        
        console.log('[FlowchartImport] Parse result:', parseResult);

        if (!parseResult.success || !parseResult.data) {
          const errorMsg = parseResult.error || 'Failed to parse flowchart';
          // Provide more helpful error messages
          if (errorMsg.includes('Python environment not initialized')) {
            throw new Error('Python environment not ready. Please wait for the project to fully load, then try again.');
          }
          throw new Error(errorMsg);
        }

        const taskGraph = parseResult.data;
        
        console.log('[FlowchartImport] Parsed task graph with', taskGraph.nodes?.length || 0, 'nodes');

        // Validate the parsed graph
        console.log('[FlowchartImport] Calling validateFlowchart...');
        const validationResult = await window.electronAPI.validateFlowchart(filePath);
        
        console.log('[FlowchartImport] Validation result:', validationResult);

        if (!validationResult.success || !validationResult.data) {
          throw new Error(validationResult.error || 'Failed to validate flowchart');
        }

        // Generate default spec name from file name
        const name = fileName || filePath.split(/[/\\]/).pop() || 'flowchart';
        const baseName = name.replace(/\.(xml|drawio|bpmn)$/i, '');
        const specName = baseName
          .replace(/[^a-zA-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .toLowerCase();

        console.log('[FlowchartImport] Success! Moving to preview step');
        
        updateState({
          taskGraph,
          validationResult: validationResult.data,
          specName,
          isLoading: false,
          step: 'preview',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('[FlowchartImport] Error:', errorMessage);
        updateState({
          isLoading: false,
          error: errorMessage,
        });
      }
    },
    [updateState]
  );

  // Handle file selection and parsing (from drag-drop or file dialog)
  const handleFileSelect = useCallback(
    async (file: File) => {
      console.log('[FlowchartImport] File dropped/selected:', file.name);
      
      // For drag-drop files, we need to get the path
      // Electron provides the path property on dropped files
      const filePath = (file as File & { path?: string }).path;

      if (!filePath) {
        console.warn('[FlowchartImport] No file path available from dropped file');
        updateState({
          error: 'Could not get file path. Please use the "Browse" button instead of drag-and-drop.',
        });
        return;
      }

      console.log('[FlowchartImport] File path from drop:', filePath);
      await processFilePath(filePath, file.name);
    },
    [updateState, processFilePath]
  );

  // Open file dialog to select a flowchart file
  const openFileDialog = useCallback(async () => {
    console.log('[FlowchartImport] Opening file dialog...');
    try {
      // Check if selectFile API is available
      if (!window.electronAPI?.selectFile) {
        throw new Error('File dialog API not available. Please restart the application.');
      }

      const filePath = await window.electronAPI.selectFile({
        title: 'Select Flowchart File',
        filters: [
          { name: 'Flowchart Files', extensions: ['xml', 'drawio', 'bpmn'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      console.log('[FlowchartImport] File selected:', filePath);

      if (filePath) {
        await processFilePath(filePath);
      } else {
        console.log('[FlowchartImport] File dialog cancelled');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open file dialog';
      console.error('[FlowchartImport] Error opening file dialog:', errorMessage);
      updateState({
        error: errorMessage,
      });
    }
  }, [processFilePath, updateState]);

  // Clear selected file
  const clearFile = useCallback(() => {
    updateState({
      selectedFile: null,
      filePath: null,
      taskGraph: null,
      validationResult: null,
      specName: '',
      error: null,
      step: 'upload',
    });
  }, [updateState]);

  // Configuration setters
  const setSpecName = useCallback(
    (name: string) => {
      updateState({ specName: name });
    },
    [updateState]
  );

  const setIncludeTestingPhase = useCallback(
    (include: boolean) => {
      updateState({ includeTestingPhase: include });
    },
    [updateState]
  );

  const setIncludeDocumentation = useCallback(
    (include: boolean) => {
      updateState({ includeDocumentation: include });
    },
    [updateState]
  );

  // Navigation
  const goToStep = useCallback(
    (step: ImportStep) => {
      updateState({ step });
    },
    [updateState]
  );

  const goBack = useCallback(() => {
    const stepOrder: ImportStep[] = ['upload', 'preview', 'configure', 'generating', 'complete'];
    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex > 0) {
      updateState({ step: stepOrder[currentIndex - 1] });
    }
  }, [state.step, updateState]);

  const canGoBack = state.step !== 'upload' && state.step !== 'generating' && state.step !== 'complete';

  // Start generation
  const startGeneration = useCallback(async () => {
    if (!state.filePath || !state.specName) {
      updateState({ error: 'Missing file path or spec name' });
      return;
    }

    updateState({
      step: 'generating',
      isLoading: true,
      error: null,
      progress: {
        stage: 'parsing',
        percentage: 0,
        message: 'Starting generation...',
      },
    });

    try {
      // Update progress during generation
      const updateProgress = (stage: GenerationStage, percentage: number, message: string) => {
        updateState({
          progress: {
            stage,
            percentage,
            message,
          },
        });
      };

      updateProgress('parsing', 10, 'Parsing flowchart...');

      // Generate the spec
      const result = await window.electronAPI.generateFromFlowchart(state.filePath, {
        projectPath: projectDir,
        specName: state.specName,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate spec');
      }

      updateState({
        generateResult: result.data,
        isLoading: false,
        step: 'complete',
        progress: {
          stage: 'complete',
          percentage: 100,
          message: 'Generation complete!',
        },
      });

      onComplete?.(result.data);
    } catch (err) {
      updateState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
        step: 'configure',
      });
    }
  }, [state.filePath, state.specName, state.includeTestingPhase, state.includeDocumentation, projectDir, onComplete, updateState]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    handleFileSelect,
    openFileDialog,
    clearFile,
    setSpecName,
    setIncludeTestingPhase,
    setIncludeDocumentation,
    goToStep,
    goBack,
    canGoBack,
    startGeneration,
    reset,
  };
}
