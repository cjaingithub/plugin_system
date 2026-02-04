"""
Flowchart Validator Module

Validates TaskGraph structures to ensure they are well-formed and
can be converted to valid implementation plans.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from .ir import NodeType, TaskGraph, ValidationError


@dataclass
class ValidationResult:
    """
    Result of validating a TaskGraph.

    Attributes:
        valid: Whether the graph passed validation
        errors: List of validation errors
        warnings: List of validation warnings
    """

    valid: bool = True
    errors: list[ValidationError] = field(default_factory=list)
    warnings: list[ValidationError] = field(default_factory=list)

    def add_error(
        self, code: str, message: str, node_id: str | None = None
    ) -> None:
        """Add a validation error."""
        self.errors.append(
            ValidationError(code=code, message=message, node_id=node_id, severity="error")
        )
        self.valid = False

    def add_warning(
        self, code: str, message: str, node_id: str | None = None
    ) -> None:
        """Add a validation warning."""
        self.warnings.append(
            ValidationError(code=code, message=message, node_id=node_id, severity="warning")
        )

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "valid": self.valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
        }


class FlowchartValidator:
    """
    Validates TaskGraph structures for correctness and completeness.

    Validation rules:
    1. Exactly one start node
    2. At least one end node
    3. All edges connect to valid nodes
    4. Decision nodes have at least 2 outgoing edges
    5. No orphan nodes (except start node)
    6. No disconnected subgraphs
    7. Cycles are only allowed in decision loops
    """

    def validate(self, graph: TaskGraph) -> ValidationResult:
        """
        Validate a TaskGraph and return the validation result.

        Args:
            graph: The TaskGraph to validate

        Returns:
            ValidationResult with errors and warnings
        """
        result = ValidationResult()

        # Run all validation checks
        self._check_empty_graph(graph, result)
        if not result.valid:
            return result

        self._check_start_nodes(graph, result)
        self._check_end_nodes(graph, result)
        self._check_edge_references(graph, result)
        self._check_decision_nodes(graph, result)
        self._check_orphan_nodes(graph, result)
        self._check_connectivity(graph, result)
        self._check_cycles(graph, result)
        self._check_node_names(graph, result)

        return result

    def _check_empty_graph(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check if the graph is empty."""
        if not graph.nodes:
            result.add_error(
                code="EMPTY_GRAPH",
                message="The flowchart contains no nodes",
            )

    def _check_start_nodes(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that there is exactly one start node."""
        start_nodes = [n for n in graph.nodes if n.node_type == NodeType.START]

        if len(start_nodes) == 0:
            # Check if there's a node with no incoming edges that could be the start
            nodes_with_incoming = {e.target_id for e in graph.edges}
            potential_starts = [n for n in graph.nodes if n.id not in nodes_with_incoming]

            if potential_starts:
                result.add_warning(
                    code="NO_EXPLICIT_START",
                    message=(
                        f"No explicit start node found. "
                        f"Node '{potential_starts[0].name}' has no incoming edges and "
                        f"will be used as the start node."
                    ),
                    node_id=potential_starts[0].id,
                )
            else:
                result.add_error(
                    code="NO_START_NODE",
                    message="The flowchart must have a start node",
                )
        elif len(start_nodes) > 1:
            node_names = ", ".join(f"'{n.name}' ({n.id})" for n in start_nodes)
            result.add_error(
                code="MULTIPLE_START_NODES",
                message=f"The flowchart has multiple start nodes: {node_names}. Only one is allowed.",
            )

    def _check_end_nodes(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that there is at least one end node."""
        end_nodes = [n for n in graph.nodes if n.node_type == NodeType.END]

        if len(end_nodes) == 0:
            # Check if there's a node with no outgoing edges that could be the end
            nodes_with_outgoing = {e.source_id for e in graph.edges}
            potential_ends = [n for n in graph.nodes if n.id not in nodes_with_outgoing]

            # Filter out start nodes
            potential_ends = [n for n in potential_ends if n.node_type != NodeType.START]

            if potential_ends:
                result.add_warning(
                    code="NO_EXPLICIT_END",
                    message=(
                        f"No explicit end node found. "
                        f"Node '{potential_ends[0].name}' has no outgoing edges and "
                        f"will be used as an end node."
                    ),
                    node_id=potential_ends[0].id,
                )
            else:
                result.add_error(
                    code="NO_END_NODE",
                    message="The flowchart must have at least one end node",
                )

    def _check_edge_references(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that all edges reference valid nodes."""
        node_ids = {n.id for n in graph.nodes}

        for edge in graph.edges:
            if edge.source_id not in node_ids:
                result.add_error(
                    code="INVALID_EDGE_SOURCE",
                    message=f"Edge references non-existent source node: {edge.source_id}",
                )
            if edge.target_id not in node_ids:
                result.add_error(
                    code="INVALID_EDGE_TARGET",
                    message=f"Edge references non-existent target node: {edge.target_id}",
                )

    def _check_decision_nodes(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that decision nodes have proper branching."""
        for node in graph.nodes:
            if node.node_type != NodeType.DECISION:
                continue

            outgoing = graph.get_outgoing_edges(node.id)

            if len(outgoing) < 2:
                result.add_error(
                    code="DECISION_INSUFFICIENT_BRANCHES",
                    message=(
                        f"Decision node '{node.name}' ({node.id}) must have at least "
                        f"2 outgoing edges, but has {len(outgoing)}"
                    ),
                    node_id=node.id,
                )
            elif len(outgoing) == 2:
                # Check if edges have conditions
                conditions = [e.condition for e in outgoing if e.condition]
                if not conditions:
                    result.add_warning(
                        code="DECISION_NO_CONDITIONS",
                        message=(
                            f"Decision node '{node.name}' ({node.id}) has no "
                            f"conditions on its edges. Consider adding labels like "
                            f"'Yes'/'No' or 'Validated'/'Rejected'."
                        ),
                        node_id=node.id,
                    )

    def _check_orphan_nodes(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check for nodes that are not connected to any other node."""
        nodes_with_edges = set()

        for edge in graph.edges:
            nodes_with_edges.add(edge.source_id)
            nodes_with_edges.add(edge.target_id)

        for node in graph.nodes:
            if node.id not in nodes_with_edges:
                # Allow start nodes to have no incoming edges
                if node.node_type == NodeType.START:
                    outgoing = graph.get_outgoing_edges(node.id)
                    if not outgoing:
                        result.add_error(
                            code="START_NO_OUTGOING",
                            message=(
                                f"Start node '{node.name}' ({node.id}) has no "
                                f"outgoing edges"
                            ),
                            node_id=node.id,
                        )
                elif node.node_type == NodeType.END:
                    incoming = graph.get_incoming_edges(node.id)
                    if not incoming:
                        result.add_error(
                            code="END_NO_INCOMING",
                            message=(
                                f"End node '{node.name}' ({node.id}) has no "
                                f"incoming edges"
                            ),
                            node_id=node.id,
                        )
                else:
                    result.add_error(
                        code="ORPHAN_NODE",
                        message=(
                            f"Node '{node.name}' ({node.id}) is not connected to "
                            f"any other node"
                        ),
                        node_id=node.id,
                    )

    def _check_connectivity(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that all nodes are reachable from the start node."""
        start_node = graph.get_start_node()
        if not start_node:
            # Already reported in _check_start_nodes
            return

        # BFS from start node
        visited: set[str] = set()
        queue = [start_node.id]

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)

            for successor in graph.get_successors(current):
                if successor.id not in visited:
                    queue.append(successor.id)

        # Check for unreachable nodes
        unreachable = [n for n in graph.nodes if n.id not in visited]
        if unreachable:
            names = ", ".join(f"'{n.name}'" for n in unreachable[:3])
            if len(unreachable) > 3:
                names += f" and {len(unreachable) - 3} more"

            result.add_warning(
                code="UNREACHABLE_NODES",
                message=f"Some nodes are not reachable from the start node: {names}",
            )

    def _check_cycles(self, graph: TaskGraph, result: ValidationResult) -> None:
        """
        Check for cycles in the graph.

        Cycles are allowed if they go through a decision node (representing
        retry/review loops), but arbitrary cycles are flagged as warnings.
        """
        # Use DFS to detect cycles
        WHITE, GRAY, BLACK = 0, 1, 2
        colors: dict[str, int] = {n.id: WHITE for n in graph.nodes}
        parent: dict[str, str | None] = {n.id: None for n in graph.nodes}

        def dfs(node_id: str) -> list[str] | None:
            """Returns cycle path if a cycle is found."""
            colors[node_id] = GRAY

            for successor in graph.get_successors(node_id):
                if colors[successor.id] == GRAY:
                    # Found a back edge - potential cycle
                    # Reconstruct the cycle
                    cycle = [successor.id]
                    current = node_id
                    while current != successor.id:
                        cycle.append(current)
                        current = parent.get(current, "")
                        if not current:
                            break
                    cycle.append(successor.id)
                    return list(reversed(cycle))

                if colors[successor.id] == WHITE:
                    parent[successor.id] = node_id
                    cycle = dfs(successor.id)
                    if cycle:
                        return cycle

            colors[node_id] = BLACK
            return None

        for node in graph.nodes:
            if colors[node.id] == WHITE:
                cycle = dfs(node.id)
                if cycle:
                    # Check if cycle goes through a decision node
                    cycle_nodes = [graph.get_node(nid) for nid in cycle]
                    has_decision = any(
                        n and n.node_type == NodeType.DECISION for n in cycle_nodes
                    )

                    if has_decision:
                        result.add_warning(
                            code="DECISION_LOOP",
                            message=(
                                f"Found a loop through decision node. This is valid "
                                f"for retry/review workflows. Cycle: "
                                f"{' -> '.join(cycle)}"
                            ),
                        )
                    else:
                        result.add_error(
                            code="INVALID_CYCLE",
                            message=(
                                f"Found a cycle that doesn't go through a decision "
                                f"node: {' -> '.join(cycle)}. Cycles are only "
                                f"allowed for decision-based loops."
                            ),
                        )

    def _check_node_names(self, graph: TaskGraph, result: ValidationResult) -> None:
        """Check that nodes have meaningful names."""
        for node in graph.nodes:
            # Skip start/end nodes which might have generic names
            if node.node_type in [NodeType.START, NodeType.END]:
                continue

            if not node.name or node.name.strip() == "":
                result.add_warning(
                    code="EMPTY_NODE_NAME",
                    message=f"Node {node.id} has no name. Consider adding a description.",
                    node_id=node.id,
                )
            elif node.name.startswith("Task ") and node.name[5:].isdigit():
                result.add_warning(
                    code="GENERIC_NODE_NAME",
                    message=(
                        f"Node '{node.name}' ({node.id}) has a generic name. "
                        f"Consider adding a more descriptive label."
                    ),
                    node_id=node.id,
                )


def validate_flowchart(graph: TaskGraph) -> ValidationResult:
    """
    Validate a TaskGraph and return the validation result.

    This is a convenience function that creates a validator and validates the graph.

    Args:
        graph: The TaskGraph to validate

    Returns:
        ValidationResult with errors and warnings
    """
    validator = FlowchartValidator()
    return validator.validate(graph)
