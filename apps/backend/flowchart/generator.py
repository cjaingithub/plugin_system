"""
Plan Generator Module

Converts TaskGraph intermediate representation to Auto-Claude
implementation_plan.json format with proper phase dependencies.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .ir import NodeType, TaskGraph, TaskNode


class PlanGenerator:
    """
    Generates Auto-Claude implementation plans from TaskGraph.

    Maps flowchart nodes to subtasks and determines phase structure
    based on graph topology and dependencies.
    """

    def __init__(self):
        """Initialize the generator."""
        self._phase_counter = 0

    def generate(
        self,
        graph: TaskGraph,
        feature_name: str | None = None,
        workflow_type: str = "feature",
    ) -> dict:
        """
        Generate an implementation plan from a TaskGraph.

        Args:
            graph: The TaskGraph to convert
            feature_name: Name of the feature (defaults to graph metadata)
            workflow_type: Type of workflow (feature, refactor, etc.)

        Returns:
            Dictionary in implementation_plan.json format
        """
        self._phase_counter = 0

        # Get feature name from graph metadata or parameter
        if not feature_name:
            feature_name = graph.metadata.get("name", "Flowchart Import")

        # Get parallel groups to determine phases
        parallel_groups = graph.get_parallel_groups()

        # Build phases from parallel groups
        phases = []
        phase_map: dict[str, int] = {}  # node_id -> phase number

        for group in parallel_groups:
            # Skip groups with only start/end nodes
            process_nodes = [
                n for n in group
                if n.node_type not in [NodeType.START, NodeType.END]
            ]
            if not process_nodes:
                continue

            self._phase_counter += 1
            phase_num = self._phase_counter

            # Record phase assignment for each node
            for node in process_nodes:
                phase_map[node.id] = phase_num

            # Determine phase dependencies based on graph edges
            depends_on = self._get_phase_dependencies(
                process_nodes, graph, phase_map
            )

            # Determine phase type
            phase_type = self._determine_phase_type(process_nodes)

            # Determine if parallel safe (no inter-dependencies within group)
            parallel_safe = len(process_nodes) > 1 and self._is_parallel_safe(
                process_nodes, graph
            )

            # Create subtasks from nodes
            subtasks = [self._node_to_subtask(node) for node in process_nodes]

            # Create phase
            phase = {
                "phase": phase_num,
                "name": self._generate_phase_name(process_nodes, phase_num),
                "type": phase_type,
                "subtasks": subtasks,
                "chunks": subtasks,  # Backwards compatibility
            }

            if depends_on:
                phase["depends_on"] = depends_on
            if parallel_safe:
                phase["parallel_safe"] = True

            phases.append(phase)

        # Collect services involved
        services = self._collect_services(graph)

        # Generate final acceptance criteria
        final_acceptance = self._generate_acceptance_criteria(graph)

        # Build the implementation plan
        plan = {
            "feature": feature_name,
            "workflow_type": workflow_type,
            "services_involved": services,
            "phases": phases,
            "final_acceptance": final_acceptance,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "status": "backlog",
            "planStatus": "pending",
        }

        return plan

    def _get_phase_dependencies(
        self,
        nodes: list[TaskNode],
        graph: TaskGraph,
        phase_map: dict[str, int],
    ) -> list[int]:
        """Determine which phases this phase depends on."""
        depends_on: set[int] = set()

        for node in nodes:
            # Get all predecessor nodes
            for predecessor in graph.get_predecessors(node.id):
                # Skip start nodes
                if predecessor.node_type == NodeType.START:
                    continue

                # Get the phase of the predecessor
                pred_phase = phase_map.get(predecessor.id)
                if pred_phase is not None and pred_phase != phase_map.get(node.id):
                    depends_on.add(pred_phase)

        return sorted(depends_on)

    def _determine_phase_type(self, nodes: list[TaskNode]) -> str:
        """Determine the type of phase based on its nodes."""
        # Check for investigation/analysis nodes
        investigation_keywords = ["analyze", "investigate", "research", "review", "assess"]
        has_investigation = any(
            any(kw in node.name.lower() for kw in investigation_keywords)
            for node in nodes
        )
        if has_investigation:
            return "investigation"

        # Check for setup nodes
        setup_keywords = ["setup", "configure", "install", "initialize", "create"]
        has_setup = any(
            any(kw in node.name.lower() for kw in setup_keywords)
            for node in nodes
        )
        if has_setup:
            return "setup"

        # Check for integration nodes
        integration_keywords = ["integrate", "connect", "wire", "combine", "merge"]
        has_integration = any(
            any(kw in node.name.lower() for kw in integration_keywords)
            for node in nodes
        )
        if has_integration:
            return "integration"

        # Check for cleanup nodes
        cleanup_keywords = ["cleanup", "remove", "delete", "deprecate", "finalize"]
        has_cleanup = any(
            any(kw in node.name.lower() for kw in cleanup_keywords)
            for node in nodes
        )
        if has_cleanup:
            return "cleanup"

        # Default to implementation
        return "implementation"

    def _is_parallel_safe(self, nodes: list[TaskNode], graph: TaskGraph) -> bool:
        """Check if nodes in a group can run in parallel."""
        node_ids = {n.id for n in nodes}

        # Check if any node in the group depends on another node in the same group
        for node in nodes:
            for pred in graph.get_predecessors(node.id):
                if pred.id in node_ids:
                    return False

        return True

    def _node_to_subtask(self, node: TaskNode) -> dict:
        """Convert a TaskNode to a subtask dictionary."""
        subtask: dict[str, Any] = {
            "id": self._sanitize_id(node.id),
            "description": node.name,
            "status": "pending",
        }

        # Add files if specified
        if node.inputs:
            subtask["patterns_from"] = node.inputs
        if node.outputs:
            subtask["files_to_create"] = node.outputs

        # Determine verification type based on node
        verification = self._determine_verification(node)
        if verification:
            subtask["verification"] = verification

        # Add service if determinable from node
        service = self._determine_service(node)
        if service:
            subtask["service"] = service

        # Handle human review nodes
        if node.is_human:
            subtask["verification"] = {
                "type": "manual",
                "scenario": f"Human review required: {node.name}",
            }

        return subtask

    def _sanitize_id(self, node_id: str) -> str:
        """Sanitize node ID for use as subtask ID."""
        # Replace spaces and special characters with dashes
        import re
        sanitized = re.sub(r"[^a-zA-Z0-9_-]", "-", node_id)
        # Remove consecutive dashes
        sanitized = re.sub(r"-+", "-", sanitized)
        # Remove leading/trailing dashes
        return sanitized.strip("-").lower()

    def _determine_verification(self, node: TaskNode) -> dict | None:
        """Determine verification method for a node."""
        name_lower = node.name.lower()

        # Check for test-related tasks
        if any(kw in name_lower for kw in ["test", "verify", "validate"]):
            return {
                "type": "command",
                "run": "npm test",  # Default, should be customized
                "expected": "All tests pass",
            }

        # Check for API-related tasks
        if any(kw in name_lower for kw in ["api", "endpoint", "route"]):
            return {
                "type": "api",
                "method": "GET",
                "url": "/api/health",  # Placeholder
                "expect_status": 200,
            }

        # Check for UI-related tasks
        if any(kw in name_lower for kw in ["ui", "component", "page", "render"]):
            return {
                "type": "component",
                "scenario": f"Component renders: {node.name}",
            }

        # Default: no verification
        return None

    def _determine_service(self, node: TaskNode) -> str | None:
        """Determine which service a node belongs to."""
        name_lower = node.name.lower()
        metadata = node.metadata

        # Check metadata first
        if "service" in metadata:
            return metadata["service"]

        # Infer from name
        if any(kw in name_lower for kw in ["backend", "api", "server", "database", "model"]):
            return "backend"
        if any(kw in name_lower for kw in ["frontend", "ui", "component", "page", "react"]):
            return "frontend"
        if any(kw in name_lower for kw in ["worker", "queue", "job", "background"]):
            return "worker"

        return None

    def _generate_phase_name(self, nodes: list[TaskNode], phase_num: int) -> str:
        """Generate a descriptive name for a phase."""
        if len(nodes) == 1:
            return nodes[0].name

        # Try to find common theme
        services = [self._determine_service(n) for n in nodes]
        unique_services = [s for s in set(services) if s]

        if len(unique_services) == 1:
            return f"{unique_services[0].title()} Implementation"

        # Check for human review nodes
        if any(n.is_human for n in nodes):
            return "Review & Validation"

        # Default to generic name
        return f"Phase {phase_num}"

    def _collect_services(self, graph: TaskGraph) -> list[str]:
        """Collect all services involved in the graph."""
        services: set[str] = set()

        for node in graph.nodes:
            service = self._determine_service(node)
            if service:
                services.add(service)

        return sorted(services)

    def _generate_acceptance_criteria(self, graph: TaskGraph) -> list[str]:
        """Generate final acceptance criteria from the graph."""
        criteria: list[str] = []

        # Get end nodes and their predecessors for context
        end_nodes = graph.get_end_nodes()

        for end_node in end_nodes:
            # Add criteria based on what leads to completion
            predecessors = graph.get_predecessors(end_node.id)
            for pred in predecessors:
                if pred.node_type == NodeType.PROCESS:
                    criteria.append(f"Completed: {pred.name}")
                elif pred.node_type == NodeType.HUMAN_REVIEW:
                    criteria.append(f"Human approved: {pred.name}")

        # Add generic criteria if none found
        if not criteria:
            criteria = [
                "All tasks completed successfully",
                "No critical errors or warnings",
            ]

        return criteria

    def generate_spec(self, graph: TaskGraph, feature_name: str | None = None) -> str:
        """
        Generate a spec.md document from a TaskGraph.

        Args:
            graph: The TaskGraph to convert
            feature_name: Name of the feature

        Returns:
            Markdown string for spec.md
        """
        if not feature_name:
            feature_name = graph.metadata.get("name", "Flowchart Import")

        lines = [
            f"# {feature_name}",
            "",
            "## Overview",
            "",
            f"This specification was generated from a flowchart import.",
            "",
            "## Workflow Type",
            "",
            "feature",
            "",
            "## Task Scope",
            "",
        ]

        # Add task descriptions
        for node in graph.nodes:
            if node.node_type not in [NodeType.START, NodeType.END]:
                lines.append(f"- {node.name}")

        lines.extend([
            "",
            "## Success Criteria",
            "",
        ])

        # Add success criteria from end node predecessors
        for criterion in self._generate_acceptance_criteria(graph):
            lines.append(f"- {criterion}")

        lines.extend([
            "",
            "## Files to Modify",
            "",
        ])

        # Collect files from node inputs/outputs
        files_to_modify: set[str] = set()
        files_to_create: set[str] = set()

        for node in graph.nodes:
            files_to_modify.update(node.inputs)
            files_to_create.update(node.outputs)

        if files_to_modify:
            for f in sorted(files_to_modify):
                lines.append(f"- `{f}`")
        else:
            lines.append("- TBD based on implementation")

        lines.extend([
            "",
            "## Files to Create",
            "",
        ])

        if files_to_create:
            for f in sorted(files_to_create):
                lines.append(f"- `{f}`")
        else:
            lines.append("- TBD based on implementation")

        lines.extend([
            "",
            "## QA Acceptance Criteria",
            "",
            "- All tasks complete without errors",
            "- Code follows project conventions",
            "- Tests pass (if applicable)",
            "",
        ])

        return "\n".join(lines)

    def generate_requirements(
        self,
        graph: TaskGraph,
        feature_name: str | None = None,
        workflow_type: str = "feature",
    ) -> dict:
        """
        Generate a requirements.json from a TaskGraph.

        Args:
            graph: The TaskGraph to convert
            feature_name: Name of the feature
            workflow_type: Type of workflow

        Returns:
            Dictionary in requirements.json format
        """
        if not feature_name:
            feature_name = graph.metadata.get("name", "Flowchart Import")

        # Extract user requirements from node names
        requirements = []
        for node in graph.nodes:
            if node.node_type not in [NodeType.START, NodeType.END]:
                requirements.append(node.name)

        return {
            "task_description": feature_name,
            "workflow_type": workflow_type,
            "services_involved": self._collect_services(graph),
            "user_requirements": requirements,
            "acceptance_criteria": self._generate_acceptance_criteria(graph),
            "constraints": [],
            "additional_context": f"Generated from flowchart: {graph.metadata.get('name', 'unknown')}",
            "created_at": datetime.now().isoformat(),
        }

    def save_to_spec_dir(
        self,
        graph: TaskGraph,
        spec_dir: Path,
        feature_name: str | None = None,
        workflow_type: str = "feature",
    ) -> dict[str, Path]:
        """
        Save generated spec files to a spec directory.

        Args:
            graph: The TaskGraph to convert
            spec_dir: Path to the spec directory
            feature_name: Name of the feature
            workflow_type: Type of workflow

        Returns:
            Dictionary mapping file types to their paths
        """
        spec_dir = Path(spec_dir)
        spec_dir.mkdir(parents=True, exist_ok=True)

        saved_files: dict[str, Path] = {}

        # Generate and save implementation_plan.json
        plan = self.generate(graph, feature_name, workflow_type)
        plan_path = spec_dir / "implementation_plan.json"
        with open(plan_path, "w", encoding="utf-8") as f:
            json.dump(plan, f, indent=2, ensure_ascii=False)
        saved_files["implementation_plan"] = plan_path

        # Generate and save spec.md
        spec_md = self.generate_spec(graph, feature_name)
        spec_path = spec_dir / "spec.md"
        with open(spec_path, "w", encoding="utf-8") as f:
            f.write(spec_md)
        saved_files["spec"] = spec_path

        # Generate and save requirements.json
        requirements = self.generate_requirements(graph, feature_name, workflow_type)
        req_path = spec_dir / "requirements.json"
        with open(req_path, "w", encoding="utf-8") as f:
            json.dump(requirements, f, indent=2, ensure_ascii=False)
        saved_files["requirements"] = req_path

        return saved_files


def generate_plan(graph: TaskGraph, feature_name: str | None = None) -> dict:
    """
    Convenience function to generate an implementation plan from a TaskGraph.

    Args:
        graph: The TaskGraph to convert
        feature_name: Optional name for the feature

    Returns:
        Dictionary in implementation_plan.json format
    """
    generator = PlanGenerator()
    return generator.generate(graph, feature_name)
