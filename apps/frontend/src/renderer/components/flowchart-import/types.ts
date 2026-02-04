/**
 * Type definitions for Flowchart Import components
 */

import type {
  TaskGraph,
  TaskNode,
  TaskEdge,
  FlowchartValidationResult,
  FlowchartGenerateResult,
  FlowchartPluginInfo,
  FlowchartProgress,
  FlowchartImportSession,
  NodeType,
} from '../../../shared/types';

export type {
  TaskGraph,
  TaskNode,
  TaskEdge,
  FlowchartValidationResult,
  FlowchartGenerateResult,
  FlowchartPluginInfo,
  FlowchartProgress,
  FlowchartImportSession,
  NodeType,
};

/**
 * Import workflow steps
 */
export type ImportStep = 'upload' | 'preview' | 'configure' | 'generating' | 'complete';

/**
 * Props for the FlowchartImporter dialog
 */
export interface FlowchartImporterProps {
  projectId: string;
  projectDir: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (result: FlowchartGenerateResult) => void;
}

/**
 * State for the import workflow
 */
export interface FlowchartImportState {
  // Current step
  step: ImportStep;

  // File state
  selectedFile: File | null;
  filePath: string | null;

  // Parsed data
  taskGraph: TaskGraph | null;
  validationResult: FlowchartValidationResult | null;

  // Configuration options
  specName: string;
  includeTestingPhase: boolean;
  includeDocumentation: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
  progress: GenerationProgressState | null;

  // Result
  generateResult: FlowchartGenerateResult | null;
}

/**
 * Props for TaskGraphPreview component
 */
export interface TaskGraphPreviewProps {
  graph: TaskGraph;
  validationResult?: FlowchartValidationResult;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string | null) => void;
  className?: string;
}

/**
 * Props for GraphNode component
 */
export interface GraphNodeProps {
  node: TaskNode;
  isSelected?: boolean;
  hasError?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Props for ValidationStatus component
 */
export interface ValidationStatusProps {
  result: FlowchartValidationResult;
  className?: string;
}

/**
 * Props for UploadDropzone component
 */
export interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  onBrowseClick?: () => void;
  acceptedFormats?: string[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Props for ConfigurationPanel component
 */
export interface ConfigurationPanelProps {
  specName: string;
  onSpecNameChange: (name: string) => void;
  includeTestingPhase: boolean;
  onIncludeTestingPhaseChange: (include: boolean) => void;
  includeDocumentation: boolean;
  onIncludeDocumentationChange: (include: boolean) => void;
  className?: string;
}

/**
 * Progress stage for the generation process
 */
export type GenerationStage =
  | 'parsing'
  | 'validating'
  | 'generating_plan'
  | 'generating_spec'
  | 'complete';

/**
 * Extended progress type for UI display
 */
export interface GenerationProgressState {
  stage: GenerationStage;
  message: string;
  percentage: number;
}

/**
 * Props for GenerationProgress component
 */
export interface GenerationProgressProps {
  progress: GenerationProgressState;
  className?: string;
}

/**
 * Node type color mappings
 */
export const NODE_TYPE_COLORS: Record<NodeType, { bg: string; border: string; text: string }> = {
  start: {
    bg: 'bg-green-500/10',
    border: 'border-green-500',
    text: 'text-green-700 dark:text-green-300',
  },
  end: {
    bg: 'bg-red-500/10',
    border: 'border-red-500',
    text: 'text-red-700 dark:text-red-300',
  },
  process: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
  },
  decision: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  human_review: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
  },
};

/**
 * Node type icons (Lucide icon names)
 */
export const NODE_TYPE_ICONS: Record<NodeType, string> = {
  start: 'Play',
  end: 'Flag',
  process: 'Cog',
  decision: 'GitBranch',
  human_review: 'UserCheck',
};

/**
 * Supported file extensions for flowchart import
 */
export const SUPPORTED_EXTENSIONS = ['.xml', '.drawio', '.bpmn'];

/**
 * MIME types for supported formats
 */
export const SUPPORTED_MIME_TYPES = [
  'application/xml',
  'text/xml',
  'application/x-drawio',
];
