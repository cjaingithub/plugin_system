"""
Flowchart Importer Module

Parses flowchart XML files (Lucidchart, Draw.io, BPMN) and generates
Auto-Claude compatible task graphs with phase dependencies.
"""

from .ir import TaskNode, TaskEdge, TaskGraph, NodeType, ValidationError
from .parser import FlowchartParser, parse_flowchart
from .validator import FlowchartValidator, ValidationResult, validate_flowchart
from .generator import PlanGenerator, generate_plan

__all__ = [
    # IR types
    "TaskNode",
    "TaskEdge",
    "TaskGraph",
    "NodeType",
    "ValidationError",
    # Parser
    "FlowchartParser",
    "parse_flowchart",
    # Validator
    "FlowchartValidator",
    "ValidationResult",
    "validate_flowchart",
    # Generator
    "PlanGenerator",
    "generate_plan",
]
