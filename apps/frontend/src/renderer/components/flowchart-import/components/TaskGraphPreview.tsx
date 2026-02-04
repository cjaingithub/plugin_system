/**
 * Interactive preview of the parsed TaskGraph
 * Displays nodes in a layered layout based on topological order
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { GraphNode } from './GraphNode';
import type { TaskGraphPreviewProps, TaskNode, TaskEdge } from '../types';

interface LayeredNode extends TaskNode {
  layer: number;
  position: number;
}

/**
 * Calculate layered layout for nodes based on dependencies
 */
function calculateLayout(
  nodes: TaskNode[],
  edges: TaskEdge[]
): Map<string, { layer: number; position: number }> {
  const layout = new Map<string, { layer: number; position: number }>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency list (reverse edges for layer calculation)
  const incomingEdges = new Map<string, string[]>();
  nodes.forEach((n) => incomingEdges.set(n.id, []));
  edges.forEach((e) => {
    const incoming = incomingEdges.get(e.targetId);
    if (incoming) {
      incoming.push(e.sourceId);
    }
  });

  // Calculate layers using longest path from start
  const layers = new Map<string, number>();
  const visited = new Set<string>();

  function calculateLayer(nodeId: string): number {
    if (layers.has(nodeId)) {
      return layers.get(nodeId)!;
    }

    const incoming = incomingEdges.get(nodeId) || [];
    if (incoming.length === 0) {
      layers.set(nodeId, 0);
      return 0;
    }

    const maxParentLayer = Math.max(
      ...incoming.map((parentId) => calculateLayer(parentId))
    );
    const layer = maxParentLayer + 1;
    layers.set(nodeId, layer);
    return layer;
  }

  nodes.forEach((n) => calculateLayer(n.id));

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  nodes.forEach((n) => {
    const layer = layers.get(n.id) || 0;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(n.id);
  });

  // Assign positions within each layer
  layerGroups.forEach((nodeIds, layer) => {
    nodeIds.forEach((nodeId, position) => {
      layout.set(nodeId, { layer, position });
    });
  });

  return layout;
}

export function TaskGraphPreview({
  graph,
  validationResult,
  selectedNodeId,
  onNodeSelect,
  className,
}: TaskGraphPreviewProps) {
  const { t } = useTranslation(['flowchart']);
  const [zoom, setZoom] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate layout
  const layout = React.useMemo(
    () => calculateLayout(graph.nodes, graph.edges),
    [graph.nodes, graph.edges]
  );

  // Get nodes with errors
  const nodesWithErrors = React.useMemo(() => {
    const errorNodeIds = new Set<string>();
    validationResult?.errors.forEach((error) => {
      if (error.nodeId) {
        errorNodeIds.add(error.nodeId);
      }
    });
    return errorNodeIds;
  }, [validationResult]);

  // Group nodes by layer
  const layeredNodes = React.useMemo(() => {
    const layers = new Map<number, TaskNode[]>();

    graph.nodes.forEach((node) => {
      const pos = layout.get(node.id);
      const layer = pos?.layer ?? 0;

      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(node);
    });

    // Sort layers and return as array
    return Array.from(layers.entries())
      .sort(([a], [b]) => a - b)
      .map(([layer, nodes]) => ({
        layer,
        nodes: nodes.sort((a, b) => {
          const posA = layout.get(a.id)?.position ?? 0;
          const posB = layout.get(b.id)?.position ?? 0;
          return posA - posB;
        }),
      }));
  }, [graph.nodes, layout]);

  // Get edges between nodes
  const getEdgesForNode = React.useCallback(
    (nodeId: string) => {
      return graph.edges.filter((e) => e.sourceId === nodeId);
    },
    [graph.edges]
  );

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="text-sm text-muted-foreground">
          {t('flowchart:preview.title')} - {graph.nodes.length} {t('flowchart:preview.nodes')}, {graph.edges.length} {t('flowchart:preview.edges')}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomReset}
            className="h-8 w-8"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph visualization */}
      <ScrollArea className="flex-1">
        <div
          ref={containerRef}
          className="p-6"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            minWidth: `${100 / zoom}%`,
          }}
        >
          <div className="flex gap-8 items-start">
            {layeredNodes.map(({ layer, nodes }, layerIndex) => (
              <React.Fragment key={layer}>
                {/* Layer column */}
                <div className="flex flex-col gap-4">
                  <div className="text-xs font-medium text-muted-foreground text-center mb-2">
                    {t('flowchart:preview.phase')} {layer + 1}
                  </div>
                  {nodes.map((node) => (
                    <GraphNode
                      key={node.id}
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      hasError={nodesWithErrors.has(node.id)}
                      onClick={() => onNodeSelect?.(node.id)}
                    />
                  ))}
                </div>

                {/* Arrow to next layer */}
                {layerIndex < layeredNodes.length - 1 && (
                  <div className="flex items-center justify-center min-h-[100px] self-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Selected node details */}
      {selectedNodeId && (
        <div className="border-t p-4 bg-muted/30">
          <NodeDetails
            node={graph.nodes.find((n) => n.id === selectedNodeId)}
            edges={getEdgesForNode(selectedNodeId)}
          />
        </div>
      )}
    </div>
  );
}

interface NodeDetailsProps {
  node?: TaskNode;
  edges: TaskEdge[];
}

function NodeDetails({ node, edges }: NodeDetailsProps) {
  const { t } = useTranslation(['flowchart']);

  if (!node) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{node.name}</h4>
        <span className="text-xs text-muted-foreground font-mono">{node.id}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t('flowchart:nodeDetails.type')}
          </p>
          <p>{t(`flowchart:nodeTypes.${node.nodeType}`)}</p>
        </div>

        {node.model && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('flowchart:nodeDetails.model')}
            </p>
            <p className={node.model === 'human' ? 'text-purple-500' : ''}>
              {node.model}
            </p>
          </div>
        )}

        {node.inputs && node.inputs.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('flowchart:nodeDetails.inputs')}
            </p>
            <div className="flex flex-wrap gap-1">
              {node.inputs.map((input) => (
                <span
                  key={input}
                  className="px-1.5 py-0.5 text-xs bg-muted rounded"
                >
                  {input}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.outputs && node.outputs.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('flowchart:nodeDetails.outputs')}
            </p>
            <div className="flex flex-wrap gap-1">
              {node.outputs.map((output) => (
                <span
                  key={output}
                  className="px-1.5 py-0.5 text-xs bg-muted rounded"
                >
                  {output}
                </span>
              ))}
            </div>
          </div>
        )}

        {edges.length > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">
              {t('flowchart:nodeDetails.connections')}
            </p>
            <div className="flex flex-wrap gap-2">
              {edges.map((edge) => (
                <span
                  key={`${edge.sourceId}-${edge.targetId}`}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded"
                >
                  <ArrowRight className="h-3 w-3" />
                  {edge.targetId}
                  {edge.label && (
                    <span className="text-muted-foreground">({edge.label})</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {node.systemPrompt && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t('flowchart:nodeDetails.systemPrompt')}
          </p>
          <p className="text-sm text-muted-foreground bg-muted p-2 rounded text-wrap break-words line-clamp-3">
            {node.systemPrompt}
          </p>
        </div>
      )}
    </div>
  );
}
