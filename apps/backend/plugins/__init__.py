"""
Plugin System Module

Provides a plugin architecture for extending Auto-Claude functionality,
including flowchart format adapters, custom validators, and more.
"""

from .core import Plugin, PluginRegistry, PluginType
from .flowchart_plugin import FlowchartPlugin
from .hooks import HookType, HookRegistry
from .loader import PluginLoader, discover_plugins

__all__ = [
    # Core
    "Plugin",
    "PluginRegistry",
    "PluginType",
    # Flowchart
    "FlowchartPlugin",
    # Hooks
    "HookType",
    "HookRegistry",
    # Loader
    "PluginLoader",
    "discover_plugins",
]
