"""
Plugin Core Module

Defines the base Plugin class and PluginRegistry for managing plugins.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Generic, TypeVar


class PluginType(str, Enum):
    """Types of plugins supported by the system."""

    FLOWCHART = "flowchart"  # Flowchart format adapters
    VALIDATOR = "validator"  # Custom validators
    GENERATOR = "generator"  # Plan generators
    HOOK = "hook"  # Lifecycle hooks


@dataclass
class PluginMetadata:
    """Metadata about a plugin."""

    name: str
    version: str
    description: str = ""
    author: str = ""
    plugin_type: PluginType = PluginType.FLOWCHART
    supported_formats: list[str] = field(default_factory=list)
    hooks: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> PluginMetadata:
        """Create from dictionary (plugin.json)."""
        return cls(
            name=data.get("name", "unknown"),
            version=data.get("version", "0.0.0"),
            description=data.get("description", ""),
            author=data.get("author", ""),
            plugin_type=PluginType(data.get("plugin_type", "flowchart")),
            supported_formats=data.get("supported_formats", []),
            hooks=data.get("hooks", []),
            dependencies=data.get("dependencies", []),
        )

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "plugin_type": self.plugin_type.value,
            "supported_formats": self.supported_formats,
            "hooks": self.hooks,
            "dependencies": self.dependencies,
        }


class Plugin(ABC):
    """
    Base class for all plugins.

    Plugins must implement the abstract methods and provide metadata
    about their capabilities.
    """

    def __init__(self):
        """Initialize the plugin."""
        self._metadata: PluginMetadata | None = None
        self._enabled: bool = True

    @property
    @abstractmethod
    def name(self) -> str:
        """Plugin name."""
        ...

    @property
    @abstractmethod
    def version(self) -> str:
        """Plugin version."""
        ...

    @property
    def description(self) -> str:
        """Plugin description."""
        return ""

    @property
    def plugin_type(self) -> PluginType:
        """Type of plugin."""
        return PluginType.FLOWCHART

    @property
    def enabled(self) -> bool:
        """Whether the plugin is enabled."""
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool):
        """Enable or disable the plugin."""
        self._enabled = value

    def get_metadata(self) -> PluginMetadata:
        """Get plugin metadata."""
        if self._metadata is None:
            self._metadata = PluginMetadata(
                name=self.name,
                version=self.version,
                description=self.description,
                plugin_type=self.plugin_type,
            )
        return self._metadata

    @abstractmethod
    def initialize(self) -> None:
        """Initialize the plugin. Called when the plugin is loaded."""
        ...

    def cleanup(self) -> None:
        """Cleanup resources. Called when the plugin is unloaded."""
        pass


T = TypeVar("T", bound=Plugin)


class PluginRegistry(Generic[T]):
    """
    Registry for managing plugins of a specific type.

    Provides methods to register, unregister, and lookup plugins.
    """

    def __init__(self, plugin_type: PluginType):
        """Initialize the registry."""
        self._plugin_type = plugin_type
        self._plugins: dict[str, T] = {}
        self._format_map: dict[str, str] = {}  # format -> plugin name

    @property
    def plugin_type(self) -> PluginType:
        """Type of plugins in this registry."""
        return self._plugin_type

    def register(self, plugin: T) -> None:
        """
        Register a plugin.

        Args:
            plugin: The plugin to register

        Raises:
            ValueError: If a plugin with the same name is already registered
        """
        if plugin.name in self._plugins:
            raise ValueError(f"Plugin already registered: {plugin.name}")

        self._plugins[plugin.name] = plugin

        # Register supported formats
        metadata = plugin.get_metadata()
        for fmt in metadata.supported_formats:
            self._format_map[fmt.lower()] = plugin.name

        # Initialize the plugin
        plugin.initialize()

    def unregister(self, name: str) -> T | None:
        """
        Unregister a plugin by name.

        Args:
            name: Name of the plugin to unregister

        Returns:
            The unregistered plugin, or None if not found
        """
        plugin = self._plugins.pop(name, None)
        if plugin:
            # Remove format mappings
            metadata = plugin.get_metadata()
            for fmt in metadata.supported_formats:
                if self._format_map.get(fmt.lower()) == name:
                    del self._format_map[fmt.lower()]

            # Cleanup the plugin
            plugin.cleanup()

        return plugin

    def get(self, name: str) -> T | None:
        """Get a plugin by name."""
        return self._plugins.get(name)

    def get_by_format(self, format: str) -> T | None:
        """Get a plugin that supports a specific format."""
        plugin_name = self._format_map.get(format.lower())
        if plugin_name:
            return self._plugins.get(plugin_name)
        return None

    def list_plugins(self) -> list[T]:
        """Get all registered plugins."""
        return list(self._plugins.values())

    def list_enabled(self) -> list[T]:
        """Get all enabled plugins."""
        return [p for p in self._plugins.values() if p.enabled]

    def list_formats(self) -> list[str]:
        """Get all supported formats."""
        return list(self._format_map.keys())

    def has(self, name: str) -> bool:
        """Check if a plugin is registered."""
        return name in self._plugins

    def __len__(self) -> int:
        """Get the number of registered plugins."""
        return len(self._plugins)

    def __iter__(self):
        """Iterate over registered plugins."""
        return iter(self._plugins.values())
