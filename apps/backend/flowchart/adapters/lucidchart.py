"""
Lucidchart XML Parser Adapter

Parses Lucidchart XML exports (.xml) and converts them to TaskGraph format.
Lucidchart uses mxGraph format (same as Draw.io) for its XML exports.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from ..ir import NodeType, TaskEdge, TaskGraph, TaskNode


class LucidchartAdapter:
    """
    Adapter for parsing Lucidchart/mxGraph XML format.

    Lucidchart exports diagrams in mxGraph XML format, where:
    - <mxCell> elements represent both nodes and edges
    - Nodes have a 'vertex="1"' attribute
    - Edges have an 'edge="1"' attribute with 'source' and 'target' attributes
    - Shape styles determine node type (terminator, process, decision, etc.)
    """

    # Shape style patterns to node type mapping
    SHAPE_TYPE_MAP: dict[str, NodeType] = {
        # Terminators (start/end)
        "ellipse": NodeType.START,  # Will differentiate start/end by position
        "terminator": NodeType.START,
        "rounded": NodeType.PROCESS,  # Could be start/end with rounded style
        # Process shapes
        "rectangle": NodeType.PROCESS,
        "process": NodeType.PROCESS,
        "shape=process": NodeType.PROCESS,
        # Decision shapes
        "rhombus": NodeType.DECISION,
        "diamond": NodeType.DECISION,
        "shape=diamond": NodeType.DECISION,
        # Human review (manual operation)
        "manualOperation": NodeType.HUMAN_REVIEW,
        "manual": NodeType.HUMAN_REVIEW,
        "shape=manualInput": NodeType.HUMAN_REVIEW,
    }

    def __init__(self):
        """Initialize the adapter."""
        self._nodes: dict[str, dict[str, Any]] = {}
        self._edges: list[dict[str, Any]] = []
        self._id_counter = 0

    def parse(self, file_path: str | Path) -> TaskGraph:
        """
        Parse a Lucidchart XML file and return a TaskGraph.

        Args:
            file_path: Path to the XML file

        Returns:
            TaskGraph containing the parsed flowchart
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        if not file_path.suffix.lower() in [".xml", ".drawio"]:
            raise ValueError(f"Unsupported file format: {file_path.suffix}")

        # Parse the XML
        tree = ET.parse(file_path)
        root = tree.getroot()

        # Reset state
        self._nodes = {}
        self._edges = []

        # Find mxGraphModel or root element
        graph_model = root.find(".//mxGraphModel")
        if graph_model is None:
            graph_model = root.find(".//diagram")
            if graph_model is not None:
                # Handle compressed diagram format
                graph_model = self._decompress_diagram(graph_model)
            else:
                graph_model = root

        # Find the root/cells container
        root_elem = graph_model.find(".//root")
        if root_elem is None:
            root_elem = graph_model

        # Extract cells
        self._extract_cells(root_elem)

        # Build and return the TaskGraph
        return self._build_task_graph(file_path.stem)

    def parse_string(self, xml_content: str, name: str = "flowchart") -> TaskGraph:
        """
        Parse Lucidchart XML from a string.

        Args:
            xml_content: XML content as string
            name: Name for the flowchart

        Returns:
            TaskGraph containing the parsed flowchart
        """
        root = ET.fromstring(xml_content)

        # Reset state
        self._nodes = {}
        self._edges = []

        # Find mxGraphModel or use root
        graph_model = root.find(".//mxGraphModel")
        if graph_model is None:
            graph_model = root

        root_elem = graph_model.find(".//root")
        if root_elem is None:
            root_elem = graph_model

        self._extract_cells(root_elem)
        return self._build_task_graph(name)

    def _decompress_diagram(self, diagram_elem: ET.Element) -> ET.Element:
        """
        Decompress a compressed diagram element.

        Some Lucidchart/Draw.io exports compress the diagram content.
        """
        import base64
        import zlib
        from urllib.parse import unquote

        text = diagram_elem.text
        if not text:
            return diagram_elem

        try:
            # Try to decode base64 + deflate compressed content
            decoded = base64.b64decode(text)
            decompressed = zlib.decompress(decoded, -15)
            xml_str = unquote(decompressed.decode("utf-8"))
            return ET.fromstring(xml_str)
        except Exception:
            # Not compressed or different format
            return diagram_elem

    def _extract_cells(self, root_elem: ET.Element) -> None:
        """Extract nodes and edges from mxCell elements."""
        for cell in root_elem.iter("mxCell"):
            cell_id = cell.get("id", "")

            # Skip root cells (id 0 and 1 are usually container cells)
            if cell_id in ["0", "1", ""]:
                continue

            # Check if this is an edge or a vertex
            is_edge = cell.get("edge") == "1"
            is_vertex = cell.get("vertex") == "1"

            if is_edge:
                self._extract_edge(cell)
            elif is_vertex:
                self._extract_node(cell)

    def _extract_node(self, cell: ET.Element) -> None:
        """Extract a node from an mxCell element."""
        cell_id = cell.get("id", f"node_{self._id_counter}")
        self._id_counter += 1

        # Get the label/value
        value = cell.get("value", "")
        # Clean up HTML tags from value
        value = self._clean_html(value)

        # Get style and determine node type
        style = cell.get("style", "")
        node_type = self._determine_node_type(style, value)

        # Get geometry for position info
        geometry = cell.find("mxGeometry")
        x = float(geometry.get("x", 0)) if geometry is not None else 0
        y = float(geometry.get("y", 0)) if geometry is not None else 0

        # Extract additional metadata from style
        metadata = self._parse_style(style)
        metadata["x"] = x
        metadata["y"] = y

        # Parse inputs/outputs from value if specified in format [in:file1,file2] [out:file3]
        inputs, outputs, clean_name = self._parse_io_from_value(value)

        self._nodes[cell_id] = {
            "id": cell_id,
            "name": clean_name or f"Task {cell_id}",
            "node_type": node_type,
            "style": style,
            "inputs": inputs,
            "outputs": outputs,
            "metadata": metadata,
            "x": x,
            "y": y,
        }

    def _extract_edge(self, cell: ET.Element) -> None:
        """Extract an edge from an mxCell element."""
        source_id = cell.get("source", "")
        target_id = cell.get("target", "")

        if not source_id or not target_id:
            return

        # Get edge label
        value = cell.get("value", "")
        value = self._clean_html(value)

        # Determine condition from label (Yes/No, True/False, Validated/Rejected, etc.)
        condition = self._parse_edge_condition(value)

        self._edges.append(
            {
                "source_id": source_id,
                "target_id": target_id,
                "label": value if value else None,
                "condition": condition,
            }
        )

    def _determine_node_type(self, style: str, value: str) -> NodeType:
        """Determine the node type from style string and value."""
        style_lower = style.lower()
        value_lower = value.lower()

        # Check for explicit type markers in value
        if any(marker in value_lower for marker in ["start", "begin"]):
            return NodeType.START
        if any(marker in value_lower for marker in ["end", "done", "finish", "complete"]):
            return NodeType.END
        if any(marker in value_lower for marker in ["review", "human", "approve", "manual"]):
            return NodeType.HUMAN_REVIEW

        # Check style patterns
        for pattern, node_type in self.SHAPE_TYPE_MAP.items():
            if pattern in style_lower:
                return node_type

        # Default to process
        return NodeType.PROCESS

    def _parse_style(self, style: str) -> dict[str, Any]:
        """Parse style string into key-value pairs."""
        metadata: dict[str, Any] = {}

        if not style:
            return metadata

        # Style format: "key1=value1;key2=value2;..."
        for item in style.split(";"):
            if "=" in item:
                key, value = item.split("=", 1)
                metadata[key.strip()] = value.strip()
            elif item.strip():
                # Boolean flag
                metadata[item.strip()] = True

        return metadata

    def _parse_edge_condition(self, label: str) -> str | None:
        """Parse edge label to extract condition."""
        if not label:
            return None

        label_lower = label.lower().strip()

        # Map common labels to conditions
        condition_map = {
            "yes": "validated",
            "no": "rejected",
            "true": "validated",
            "false": "rejected",
            "pass": "validated",
            "fail": "rejected",
            "validated": "validated",
            "rejected": "rejected",
            "approved": "validated",
            "denied": "rejected",
            "accept": "validated",
            "reject": "rejected",
        }

        return condition_map.get(label_lower, label_lower if label else None)

    def _parse_io_from_value(self, value: str) -> tuple[list[str], list[str], str]:
        """
        Parse inputs and outputs from value string.

        Format: "Task Name [in:file1.py,file2.py] [out:output.py]"
        """
        inputs: list[str] = []
        outputs: list[str] = []
        clean_name = value

        # Find input pattern [in:...]
        in_match = re.search(r"\[in:([^\]]+)\]", value, re.IGNORECASE)
        if in_match:
            inputs = [f.strip() for f in in_match.group(1).split(",")]
            clean_name = clean_name.replace(in_match.group(0), "")

        # Find output pattern [out:...]
        out_match = re.search(r"\[out:([^\]]+)\]", value, re.IGNORECASE)
        if out_match:
            outputs = [f.strip() for f in out_match.group(1).split(",")]
            clean_name = clean_name.replace(out_match.group(0), "")

        # Find model pattern [model:...]
        # This is extracted but not returned - stored in node metadata via _extract_node

        return inputs, outputs, clean_name.strip()

    def _clean_html(self, value: str) -> str:
        """Remove HTML tags from a value string."""
        if not value:
            return ""

        # Remove HTML tags
        clean = re.sub(r"<[^>]+>", " ", value)
        # Decode common HTML entities
        clean = (
            clean.replace("&nbsp;", " ")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
            .replace("&quot;", '"')
        )
        # Normalize whitespace
        clean = " ".join(clean.split())
        return clean.strip()

    def _build_task_graph(self, name: str) -> TaskGraph:
        """Build a TaskGraph from extracted nodes and edges."""
        graph = TaskGraph(metadata={"name": name, "format": "lucidchart"})

        # Add nodes
        for node_data in self._nodes.values():
            node = TaskNode(
                id=node_data["id"],
                name=node_data["name"],
                node_type=node_data["node_type"],
                model="human" if node_data["node_type"] == NodeType.HUMAN_REVIEW else "claude",
                inputs=node_data["inputs"],
                outputs=node_data["outputs"],
                metadata=node_data["metadata"],
            )
            graph.add_node(node)

        # Add edges
        for edge_data in self._edges:
            # Only add edge if both source and target exist
            if edge_data["source_id"] in self._nodes and edge_data["target_id"] in self._nodes:
                edge = TaskEdge(
                    source_id=edge_data["source_id"],
                    target_id=edge_data["target_id"],
                    condition=edge_data["condition"],
                    label=edge_data["label"],
                )
                graph.add_edge(edge)

        # Post-process: Determine start/end nodes by connectivity if not explicitly marked
        self._infer_start_end_nodes(graph)

        return graph

    def _infer_start_end_nodes(self, graph: TaskGraph) -> None:
        """
        Infer start and end nodes if not explicitly marked.

        - Start node: No incoming edges
        - End node: No outgoing edges
        """
        # Find nodes with no incoming edges (potential start nodes)
        nodes_with_incoming = {edge.target_id for edge in graph.edges}
        nodes_with_outgoing = {edge.source_id for edge in graph.edges}

        for node in graph.nodes:
            # If node has no incoming edges and isn't already marked as start
            if node.id not in nodes_with_incoming and node.node_type == NodeType.PROCESS:
                # Check if it's likely a start node by position (topmost) or name
                if node.metadata.get("y", float("inf")) == min(
                    n.metadata.get("y", float("inf"))
                    for n in graph.nodes
                    if n.id not in nodes_with_incoming
                ):
                    node.node_type = NodeType.START

            # If node has no outgoing edges and isn't already marked as end
            if node.id not in nodes_with_outgoing and node.node_type == NodeType.PROCESS:
                # Check if it's likely an end node by position (bottommost) or name
                if node.metadata.get("y", 0) == max(
                    n.metadata.get("y", 0)
                    for n in graph.nodes
                    if n.id not in nodes_with_outgoing
                ):
                    node.node_type = NodeType.END
