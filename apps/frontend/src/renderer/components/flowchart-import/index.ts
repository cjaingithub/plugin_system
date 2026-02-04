/**
 * Flowchart Import Module
 *
 * Provides components for importing flowcharts (Lucidchart, Draw.io, BPMN)
 * and generating Auto-Claude specs from them.
 */

// Main component
export { FlowchartImporter } from './FlowchartImporter';

// Sub-components
export {
  UploadDropzone,
  GraphNode,
  TaskGraphPreview,
  ValidationStatus,
  ConfigurationPanel,
  GenerationProgress,
  ImportSuccessBanner,
} from './components';

// Hooks
export { useFlowchartImport } from './hooks';
export type { UseFlowchartImportOptions, UseFlowchartImportReturn } from './hooks';

// Types
export type {
  FlowchartImporterProps,
  TaskGraphPreviewProps,
  GraphNodeProps,
  ValidationStatusProps,
  UploadDropzoneProps,
  ConfigurationPanelProps,
  GenerationProgressProps,
  FlowchartImportState,
  ImportStep,
} from './types';

// Constants
export {
  NODE_TYPE_COLORS,
  NODE_TYPE_ICONS,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_MIME_TYPES,
} from './types';
