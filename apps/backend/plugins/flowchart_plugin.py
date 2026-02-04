"""
Flowchart Plugin Base Class

Defines the interface for flowchart format adapter plugins.
"""

from __future__ import annotations

from abc import abstractmethod
from pathlib import Path
from typing import TYPE_CHECKING

from .core import Plugin, PluginMetadata, PluginType

if TYPE_CHECKING:
    from flowchart.ir import TaskGraph, ValidationError


class FlowchartPlugin(Plugin):
    """
    Base class for flowchart format adapter plugins.

    Plugins that support parsing flowchart formats should extend this class
    and implement the required abstract methods.

    Example:
        class DrawioPlugin(FlowchartPlugin):
            @property
            def name(self) -> str:
                return "drawio"

            @property
            def version(self) -> str:
                return "1.0.0"

            @property
            def supported_formats(self) -> list[str]:
                return [".drawio", ".dio"]

            def parse(self, file_path: Path) -> TaskGraph:
                # Implementation here
                ...
    """

    @property
    def plugin_type(self) -> PluginType:
        """Type of plugin (always FLOWCHART for this class)."""
        return PluginType.FLOWCHART

    @property
    @abstractmethod
    def supported_formats(self) -> list[str]:
        """
        List of file extensions this plugin supports.

        Returns:
            List of file extensions (e.g., [".drawio", ".dio"])
        """
        ...

    def get_metadata(self) -> PluginMetadata:
        """Get plugin metadata including supported formats."""
        if self._metadata is None:
            self._metadata = PluginMetadata(
                name=self.name,
                version=self.version,
                description=self.description,
                plugin_type=self.plugin_type,
                supported_formats=self.supported_formats,
            )
        return self._metadata

    @abstractmethod
    def parse(self, file_path: Path) -> "TaskGraph":
        """
        Parse a flowchart file and return a TaskGraph.

        Args:
            file_path: Path to the flowchart file

        Returns:
            TaskGraph representing the parsed flowchart

        Raises:
            FileNotFoundError: If the file doesn't exist
            ValueError: If the file format is invalid
        """
        ...

    @abstractmethod
    def parse_string(self, content: str, name: str = "flowchart") -> "TaskGraph":
        """
        Parse flowchart content from a string.

        Args:
            content: Flowchart content as string
            name: Name for the flowchart

        Returns:
            TaskGraph representing the parsed flowchart
        """
        ...

    def validate(self, graph: "TaskGraph") -> list["ValidationError"]:
        """
        Perform format-specific validation on a TaskGraph.

        This is called in addition to the standard validation.
        Override this method to add format-specific validation rules.

        Args:
            graph: The TaskGraph to validate

        Returns:
            List of validation errors (empty if valid)
        """
        return []

    def pre_parse_hook(self, file_path: Path) -> Path:
        """
        Hook called before parsing a file.

        Can be used to preprocess the file or modify the path.

        Args:
            file_path: Original file path

        Returns:
            File path to parse (may be modified)
        """
        return file_path

    def post_parse_hook(self, graph: "TaskGraph") -> "TaskGraph":
        """
        Hook called after parsing a file.

        Can be used to transform or enrich the TaskGraph.

        Args:
            graph: Parsed TaskGraph

        Returns:
            Transformed TaskGraph
        """
        return graph

    def pre_generate_hook(self, graph: "TaskGraph") -> "TaskGraph":
        """
        Hook called before generating an implementation plan.

        Can be used to transform the TaskGraph before plan generation.

        Args:
            graph: TaskGraph to be converted to a plan

        Returns:
            Transformed TaskGraph
        """
        return graph


class LucidchartPlugin(FlowchartPlugin):
    """
    Built-in plugin for Lucidchart/mxGraph XML format.

    This plugin is automatically registered and handles:
    - Lucidchart XML exports (.xml)
    - Draw.io files that use mxGraph format (.drawio)
    """

    @property
    def name(self) -> str:
        return "lucidchart"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def description(self) -> str:
        return "Parse Lucidchart and mxGraph XML flowcharts"

    @property
    def supported_formats(self) -> list[str]:
        return [".xml", ".drawio", ".vsdx"]

    def initialize(self) -> None:
        """Initialize the plugin."""
        # Import the adapter
        from flowchart.adapters.lucidchart import LucidchartAdapter

        self._adapter = LucidchartAdapter()

    def parse(self, file_path: Path) -> "TaskGraph":
        """Parse a Lucidchart XML file."""
        file_path = self.pre_parse_hook(file_path)
        graph = self._adapter.parse(file_path)
        return self.post_parse_hook(graph)

    def parse_string(self, content: str, name: str = "flowchart") -> "TaskGraph":
        """Parse Lucidchart XML from a string."""
        graph = self._adapter.parse_string(content, name)
        return self.post_parse_hook(graph)
