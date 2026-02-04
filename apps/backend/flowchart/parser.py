"""
Flowchart Parser Module

Provides a unified interface for parsing different flowchart formats
using the appropriate adapter.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from .adapters.lucidchart import LucidchartAdapter
from .ir import TaskGraph

if TYPE_CHECKING:
    pass


class FlowchartParser:
    """
    Unified parser for flowchart files.

    Automatically detects the format and uses the appropriate adapter
    to parse the file into a TaskGraph.
    """

    # Supported file extensions and their adapters
    SUPPORTED_FORMATS = {
        ".xml": "lucidchart",
        ".drawio": "lucidchart",
        ".vsdx": "lucidchart",  # Will need additional handling for VSDX
    }

    def __init__(self):
        """Initialize the parser with available adapters."""
        self._adapters = {
            "lucidchart": LucidchartAdapter(),
        }

    def parse(self, file_path: str | Path) -> TaskGraph:
        """
        Parse a flowchart file and return a TaskGraph.

        Args:
            file_path: Path to the flowchart file

        Returns:
            TaskGraph containing the parsed flowchart

        Raises:
            FileNotFoundError: If the file doesn't exist
            ValueError: If the file format is not supported
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Determine format from extension
        suffix = file_path.suffix.lower()
        if suffix not in self.SUPPORTED_FORMATS:
            raise ValueError(
                f"Unsupported file format: {suffix}. "
                f"Supported formats: {', '.join(self.SUPPORTED_FORMATS.keys())}"
            )

        adapter_name = self.SUPPORTED_FORMATS[suffix]
        adapter = self._adapters.get(adapter_name)

        if adapter is None:
            raise ValueError(f"No adapter available for format: {adapter_name}")

        return adapter.parse(file_path)

    def parse_string(
        self, content: str, format: str = "lucidchart", name: str = "flowchart"
    ) -> TaskGraph:
        """
        Parse flowchart content from a string.

        Args:
            content: Flowchart content as string
            format: Format of the content (default: lucidchart)
            name: Name for the flowchart

        Returns:
            TaskGraph containing the parsed flowchart
        """
        adapter = self._adapters.get(format)
        if adapter is None:
            raise ValueError(f"Unknown format: {format}")

        return adapter.parse_string(content, name)

    def get_supported_formats(self) -> list[str]:
        """Get list of supported file extensions."""
        return list(self.SUPPORTED_FORMATS.keys())

    def register_adapter(self, name: str, adapter) -> None:
        """
        Register a custom adapter.

        Args:
            name: Name for the adapter
            adapter: Adapter instance with parse() and parse_string() methods
        """
        self._adapters[name] = adapter

    def register_format(self, extension: str, adapter_name: str) -> None:
        """
        Register a file extension to use a specific adapter.

        Args:
            extension: File extension (e.g., ".bpmn")
            adapter_name: Name of the adapter to use
        """
        if adapter_name not in self._adapters:
            raise ValueError(f"Unknown adapter: {adapter_name}")
        self.SUPPORTED_FORMATS[extension.lower()] = adapter_name


# Convenience function for quick parsing
def parse_flowchart(file_path: str | Path) -> TaskGraph:
    """
    Parse a flowchart file and return a TaskGraph.

    This is a convenience function that creates a parser and parses the file.

    Args:
        file_path: Path to the flowchart file

    Returns:
        TaskGraph containing the parsed flowchart
    """
    parser = FlowchartParser()
    return parser.parse(file_path)
