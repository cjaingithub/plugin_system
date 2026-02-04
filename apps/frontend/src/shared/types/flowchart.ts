/**
 * Flowchart Importer Types
 *
 * Types for the flowchart import feature that parses Lucidchart XML
 * and generates Auto-Claude implementation plans.
 */

/**
 * Types of nodes in a flowchart
 */
export type NodeType = 'start' | 'end' | 'process' | 'decision' | 'human_review';

/**
 * Represents a single node/task in the flowchart
 */
export interface TaskNode {
  /** Unique identifier for this node */
  id: string;
  /** Human-readable name/label for the task */
  name: string;
  /** Type of node (start, end, process, decision, human_review) */
  nodeType: NodeType;
  /** AI model to use ("claude") or "human" for human-in-the-loop */
  model: string;
  /** Optional system prompt for AI tasks */
  systemPrompt?: string;
  /** List of input file paths or artifact references */
  inputs: string[];
  /** List of output file paths or artifact references */
  outputs: string[];
  /** Additional metadata from the flowchart */
  metadata: Record<string, unknown>;
}

/**
 * Represents a directed edge between two nodes
 */
export interface TaskEdge {
  /** ID of the source node */
  sourceId: string;
  /** ID of the target node */
  targetId: string;
  /** Condition for this edge (e.g., "validated", "rejected" for decisions) */
  condition?: string;
  /** Optional label/description for the edge */
  label?: string;
}

/**
 * Represents a complete task graph parsed from a flowchart
 */
export interface TaskGraph {
  /** List of task nodes in the graph */
  nodes: TaskNode[];
  /** List of directed edges connecting nodes */
  edges: TaskEdge[];
  /** Additional metadata about the flowchart */
  metadata: Record<string, unknown>;
}

/**
 * Validation error in the task graph
 */
export interface FlowchartValidationError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional ID of the node related to this error */
  nodeId?: string;
  /** Error severity level */
  severity: 'error' | 'warning';
}

/**
 * Result of validating a flowchart
 */
export interface FlowchartValidationResult {
  /** Whether the graph passed validation */
  valid: boolean;
  /** List of validation errors */
  errors: FlowchartValidationError[];
  /** List of validation warnings */
  warnings: FlowchartValidationError[];
}

/**
 * Result of generating an implementation plan from a flowchart
 */
export interface FlowchartGenerateResult {
  /** Path to the spec directory */
  specDir: string;
  /** Spec number (e.g., "001") */
  specNumber: string;
  /** List of generated file paths */
  files: string[];
}

/**
 * Information about an available flowchart plugin
 */
export interface FlowchartPluginInfo {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Supported file formats */
  supportedFormats: string[];
}

/**
 * Options for parsing a flowchart
 */
export interface FlowchartParseOptions {
  /** Format of the flowchart (auto-detect if not specified) */
  format?: 'lucidchart' | 'drawio' | 'bpmn';
}

/**
 * Options for generating a spec from a flowchart
 */
export interface FlowchartGenerateOptions {
  /** Path to the project directory */
  projectPath: string;
  /** Optional name for the spec */
  specName?: string;
  /** Workflow type (default: feature) */
  workflowType?: 'feature' | 'refactor' | 'investigation' | 'migration' | 'simple';
  /** Skip validation (force generate even with errors) */
  force?: boolean;
}

/**
 * Progress status for flowchart operations
 */
export interface FlowchartProgress {
  /** Current phase of the operation */
  phase: 'parsing' | 'validating' | 'generating' | 'complete';
  /** Progress message */
  message: string;
  /** Percentage complete (0-100) */
  percent?: number;
}

/**
 * Flowchart import session state
 */
export interface FlowchartImportSession {
  /** Session ID */
  id: string;
  /** Original file path */
  filePath: string;
  /** Parsed task graph (null if not yet parsed) */
  taskGraph: TaskGraph | null;
  /** Validation result (null if not yet validated) */
  validationResult: FlowchartValidationResult | null;
  /** Generation result (null if not yet generated) */
  generateResult: FlowchartGenerateResult | null;
  /** Current status */
  status: 'idle' | 'parsing' | 'parsed' | 'validating' | 'validated' | 'generating' | 'complete' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}
