"""
Plugin Loader Module

Discovers and loads plugins from the filesystem.
"""

from __future__ import annotations

import importlib
import importlib.util
import json
from pathlib import Path
from typing import Type

from .core import Plugin, PluginMetadata, PluginRegistry, PluginType
from .flowchart_plugin import FlowchartPlugin, LucidchartPlugin


class PluginLoader:
    """
    Loads plugins from the filesystem.

    Plugins are discovered from:
    1. Built-in plugins (always loaded)
    2. Plugin directories (e.g., ~/.auto-claude/plugins/)
    3. Project-specific plugins (.auto-claude/plugins/)
    """

    def __init__(self, plugin_dirs: list[Path] | None = None):
        """
        Initialize the loader.

        Args:
            plugin_dirs: List of directories to search for plugins
        """
        self._plugin_dirs = plugin_dirs or []
        self._registries: dict[PluginType, PluginRegistry] = {
            PluginType.FLOWCHART: PluginRegistry(PluginType.FLOWCHART),
        }

    def get_registry(self, plugin_type: PluginType) -> PluginRegistry:
        """Get the registry for a plugin type."""
        return self._registries[plugin_type]

    def load_builtin_plugins(self) -> None:
        """Load all built-in plugins."""
        # Register the built-in Lucidchart plugin
        lucidchart = LucidchartPlugin()
        self._registries[PluginType.FLOWCHART].register(lucidchart)

    def discover_plugins(self) -> list[PluginMetadata]:
        """
        Discover plugins in the configured directories.

        Returns:
            List of discovered plugin metadata
        """
        discovered: list[PluginMetadata] = []

        for plugin_dir in self._plugin_dirs:
            if not plugin_dir.exists():
                continue

            # Look for plugin.json files
            for manifest_path in plugin_dir.glob("*/plugin.json"):
                try:
                    with open(manifest_path, encoding="utf-8") as f:
                        data = json.load(f)
                    metadata = PluginMetadata.from_dict(data)
                    metadata._manifest_path = manifest_path  # type: ignore
                    discovered.append(metadata)
                except Exception as e:
                    print(f"Error loading plugin manifest {manifest_path}: {e}")

        return discovered

    def load_plugin(self, manifest_path: Path) -> Plugin | None:
        """
        Load a plugin from its manifest file.

        Args:
            manifest_path: Path to plugin.json

        Returns:
            Loaded plugin instance, or None if loading failed
        """
        try:
            with open(manifest_path, encoding="utf-8") as f:
                data = json.load(f)

            # Get entry point
            entry_point = data.get("entry_point")
            if not entry_point:
                print(f"Plugin manifest missing entry_point: {manifest_path}")
                return None

            # Parse entry point (format: "module:ClassName")
            if ":" not in entry_point:
                print(f"Invalid entry_point format: {entry_point}")
                return None

            module_name, class_name = entry_point.split(":", 1)

            # Load the module from the plugin directory
            plugin_dir = manifest_path.parent
            module_path = plugin_dir / f"{module_name.replace('.', '/')}.py"

            if not module_path.exists():
                print(f"Plugin module not found: {module_path}")
                return None

            # Load module dynamically
            spec = importlib.util.spec_from_file_location(module_name, module_path)
            if spec is None or spec.loader is None:
                print(f"Failed to load module spec: {module_path}")
                return None

            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Get the plugin class
            plugin_class: Type[Plugin] = getattr(module, class_name, None)
            if plugin_class is None:
                print(f"Plugin class not found: {class_name} in {module_name}")
                return None

            # Instantiate the plugin
            plugin = plugin_class()
            return plugin

        except Exception as e:
            print(f"Error loading plugin from {manifest_path}: {e}")
            return None

    def load_all_plugins(self) -> int:
        """
        Load all discovered plugins.

        Returns:
            Number of plugins loaded
        """
        # Load built-in plugins first
        self.load_builtin_plugins()

        # Discover and load external plugins
        discovered = self.discover_plugins()
        loaded = 0

        for metadata in discovered:
            manifest_path = getattr(metadata, "_manifest_path", None)
            if manifest_path is None:
                continue

            plugin = self.load_plugin(manifest_path)
            if plugin:
                registry = self._registries.get(plugin.plugin_type)
                if registry:
                    try:
                        registry.register(plugin)
                        loaded += 1
                    except ValueError as e:
                        print(f"Failed to register plugin {plugin.name}: {e}")

        return loaded


def discover_plugins(plugin_dirs: list[Path] | None = None) -> list[PluginMetadata]:
    """
    Convenience function to discover plugins.

    Args:
        plugin_dirs: List of directories to search

    Returns:
        List of discovered plugin metadata
    """
    loader = PluginLoader(plugin_dirs)
    return loader.discover_plugins()


# Global plugin loader instance
_global_loader: PluginLoader | None = None


def get_plugin_loader() -> PluginLoader:
    """Get the global plugin loader."""
    global _global_loader
    if _global_loader is None:
        # Default plugin directories
        from pathlib import Path

        home = Path.home()
        default_dirs = [
            home / ".auto-claude" / "plugins",
        ]
        _global_loader = PluginLoader(default_dirs)
        _global_loader.load_builtin_plugins()
    return _global_loader


def get_flowchart_registry() -> PluginRegistry[FlowchartPlugin]:
    """Get the flowchart plugin registry."""
    loader = get_plugin_loader()
    return loader.get_registry(PluginType.FLOWCHART)
