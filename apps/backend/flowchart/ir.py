"""
Intermediate Representation for Flowchart Task Graphs

This module defines the core data structures used to represent parsed flowcharts
as task graphs that can be converted to Auto-Claude implementation plans.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


class NodeType(str, Enum):
    """Types of nodes in a flowchart."""

    START = "start"
    END = "end"
    PROCESS = "process"
    DECISION = "decision"
    HUMAN_REVIEW = "human_review"


@dataclass
class TaskNode:
    """
    Represents a single node/task in the flowchart.

    Attributes:
        id: Unique identifier for this node
        name: Human-readable name/label for the task
        node_type: Type of node (start, end, process, decision, human_review)
        model: AI model to use ("claude") or "human" for human-in-the-loop
        system_prompt: Optional system prompt for AI tasks
        inputs: List of input file paths or artifact references
        outputs: List of output file paths or artifact references
        metadata: Additional metadata from the flowchart
    """

    id: str
    name: str
    node_type: NodeType | Literal["start", "end", "process", "decision", "human_review"]
    model: str = "claude"
    system_prompt: str | None = None
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        """Normalize node_type to enum."""
        if isinstance(self.node_type, str):
            self.node_type = NodeType(self.node_type)

    @property
    def is_start(self) -> bool:
        """Check if this is a start node."""
        return self.node_type == NodeType.START

    @property
    def is_end(self) -> bool:
        """Check if this is an end node."""
        return self.node_type == NodeType.END

    @property
    def is_decision(self) -> bool:
        """Check if this is a decision node."""
        return self.node_type == NodeType.DECISION

    @property
    def is_human(self) -> bool:
        """Check if this requires human intervention."""
        return self.model == "human" or self.node_type == NodeType.HUMAN_REVIEW

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "node_type": self.node_type.value if isinstance(self.node_type, NodeType) else self.node_type,
            "model": self.model,
            "system_prompt": self.system_prompt,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> TaskNode:
        """Create from dictionary representation."""
        return cls(
            id=data["id"],
            name=data["name"],
            node_type=data["node_type"],
            model=data.get("model", "claude"),
            system_prompt=data.get("system_prompt"),
            inputs=data.get("inputs", []),
            outputs=data.get("outputs", []),
            metadata=data.get("metadata", {}),
        )


@dataclass
class TaskEdge:
    """
    Represents a directed edge between two nodes in the flowchart.

    Attributes:
        source_id: ID of the source node
        target_id: ID of the target node
        condition: Condition for this edge (e.g., "validated", "rejected" for decisions)
        label: Optional label/description for the edge
    """

    source_id: str
    target_id: str
    condition: str | None = None
    label: str | None = None

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "condition": self.condition,
            "label": self.label,
        }

    @classmethod
    def from_dict(cls, data: dict) -> TaskEdge:
        """Create from dictionary representation."""
        return cls(
            source_id=data["source_id"],
            target_id=data["target_id"],
            condition=data.get("condition"),
            label=data.get("label"),
        )


@dataclass
class ValidationError:
    """
    Represents a validation error in the task graph.

    Attributes:
        code: Error code for programmatic handling
        message: Human-readable error message
        node_id: Optional ID of the node related to this error
        severity: Error severity level
    """

    code: str
    message: str
    node_id: str | None = None
    severity: Literal["error", "warning"] = "error"

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "code": self.code,
            "message": self.message,
            "node_id": self.node_id,
            "severity": self.severity,
        }


@dataclass
class TaskGraph:
    """
    Represents a complete task graph parsed from a flowchart.

    The TaskGraph is the intermediate representation (IR) that decouples
    parsing from generation, allowing multiple input formats to produce
    the same output format.

    Attributes:
        nodes: List of task nodes in the graph
        edges: List of directed edges connecting nodes
        metadata: Additional metadata about the flowchart
    """

    nodes: list[TaskNode] = field(default_factory=list)
    edges: list[TaskEdge] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        """Build internal lookup structures."""
        self._node_map: dict[str, TaskNode] = {}
        self._rebuild_indexes()

    def _rebuild_indexes(self):
        """Rebuild internal lookup indexes."""
        self._node_map = {node.id: node for node in self.nodes}

    def add_node(self, node: TaskNode) -> None:
        """Add a node to the graph."""
        self.nodes.append(node)
        self._node_map[node.id] = node

    def add_edge(self, edge: TaskEdge) -> None:
        """Add an edge to the graph."""
        self.edges.append(edge)

    def get_node(self, node_id: str) -> TaskNode | None:
        """Get a node by ID."""
        return self._node_map.get(node_id)

    def get_start_node(self) -> TaskNode | None:
        """Get the start node of the graph."""
        for node in self.nodes:
            if node.is_start:
                return node
        return None

    def get_end_nodes(self) -> list[TaskNode]:
        """Get all end nodes of the graph."""
        return [node for node in self.nodes if node.is_end]

    def get_outgoing_edges(self, node_id: str) -> list[TaskEdge]:
        """Get all edges originating from a node."""
        return [edge for edge in self.edges if edge.source_id == node_id]

    def get_incoming_edges(self, node_id: str) -> list[TaskEdge]:
        """Get all edges targeting a node."""
        return [edge for edge in self.edges if edge.target_id == node_id]

    def get_successors(self, node_id: str) -> list[TaskNode]:
        """Get all nodes that follow a given node."""
        successor_ids = [edge.target_id for edge in self.get_outgoing_edges(node_id)]
        return [self._node_map[sid] for sid in successor_ids if sid in self._node_map]

    def get_predecessors(self, node_id: str) -> list[TaskNode]:
        """Get all nodes that precede a given node."""
        predecessor_ids = [edge.source_id for edge in self.get_incoming_edges(node_id)]
        return [self._node_map[pid] for pid in predecessor_ids if pid in self._node_map]

    def get_dependencies(self, node_id: str) -> list[str]:
        """Get IDs of all nodes that this node depends on (predecessors)."""
        return [edge.source_id for edge in self.get_incoming_edges(node_id)]

    def topological_sort(self) -> list[TaskNode]:
        """
        Perform topological sort to get execution order.

        Returns nodes in order such that for every directed edge (u, v),
        node u comes before node v in the ordering.

        Raises:
            ValueError: If the graph contains a cycle (excluding decision loops)
        """
        # Kahn's algorithm
        in_degree: dict[str, int] = {node.id: 0 for node in self.nodes}

        for edge in self.edges:
            if edge.target_id in in_degree:
                in_degree[edge.target_id] += 1

        # Start with nodes that have no incoming edges
        queue = [node for node in self.nodes if in_degree[node.id] == 0]
        result: list[TaskNode] = []

        while queue:
            # Sort by node id for deterministic ordering
            queue.sort(key=lambda n: n.id)
            node = queue.pop(0)
            result.append(node)

            for successor in self.get_successors(node.id):
                in_degree[successor.id] -= 1
                if in_degree[successor.id] == 0:
                    queue.append(successor)

        if len(result) != len(self.nodes):
            # Cycle detected - find and report
            remaining = [n.id for n in self.nodes if n.id not in {r.id for r in result}]
            raise ValueError(f"Graph contains a cycle involving nodes: {remaining}")

        return result

    def get_parallel_groups(self) -> list[list[TaskNode]]:
        """
        Identify groups of nodes that can be executed in parallel.

        Returns a list of groups, where each group contains nodes that
        have the same set of completed dependencies and can run concurrently.
        """
        # Calculate the "level" of each node based on longest path from start
        levels: dict[str, int] = {}

        def calculate_level(node_id: str, visited: set[str] | None = None) -> int:
            if visited is None:
                visited = set()

            if node_id in levels:
                return levels[node_id]

            if node_id in visited:
                # Cycle detected, return current level
                return 0

            visited.add(node_id)

            predecessors = self.get_predecessors(node_id)
            if not predecessors:
                levels[node_id] = 0
            else:
                max_pred_level = max(
                    calculate_level(pred.id, visited.copy()) for pred in predecessors
                )
                levels[node_id] = max_pred_level + 1

            return levels[node_id]

        # Calculate levels for all nodes
        for node in self.nodes:
            calculate_level(node.id)

        # Group nodes by level
        level_groups: dict[int, list[TaskNode]] = {}
        for node in self.nodes:
            level = levels.get(node.id, 0)
            if level not in level_groups:
                level_groups[level] = []
            level_groups[level].append(node)

        # Return groups in order
        return [level_groups[level] for level in sorted(level_groups.keys())]

    def get_decision_branches(self, decision_node_id: str) -> dict[str, list[TaskNode]]:
        """
        Get the branches from a decision node.

        Returns a dict mapping condition labels to the list of nodes in that branch.
        """
        branches: dict[str, list[TaskNode]] = {}
        outgoing = self.get_outgoing_edges(decision_node_id)

        for edge in outgoing:
            condition = edge.condition or edge.label or "default"
            target = self.get_node(edge.target_id)
            if target:
                if condition not in branches:
                    branches[condition] = []
                branches[condition].append(target)

        return branches

    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> TaskGraph:
        """Create from dictionary representation."""
        graph = cls(
            nodes=[TaskNode.from_dict(n) for n in data.get("nodes", [])],
            edges=[TaskEdge.from_dict(e) for e in data.get("edges", [])],
            metadata=data.get("metadata", {}),
        )
        graph._rebuild_indexes()
        return graph

    def to_json(self) -> str:
        """Convert to JSON string."""
        import json

        return json.dumps(self.to_dict(), indent=2)

    @classmethod
    def from_json(cls, json_str: str) -> TaskGraph:
        """Create from JSON string."""
        import json

        return cls.from_dict(json.loads(json_str))
