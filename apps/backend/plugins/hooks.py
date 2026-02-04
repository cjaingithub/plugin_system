"""
Plugin Hooks Module

Defines hook types and a registry for plugin lifecycle hooks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, TypeVar


class HookType(str, Enum):
    """Types of hooks available in the plugin system."""

    # Flowchart hooks
    PRE_PARSE = "pre_parse"  # Before parsing a flowchart
    POST_PARSE = "post_parse"  # After parsing, before validation
    PRE_VALIDATE = "pre_validate"  # Before validation
    POST_VALIDATE = "post_validate"  # After validation
    PRE_GENERATE = "pre_generate"  # Before generating plan
    POST_GENERATE = "post_generate"  # After generating plan

    # Spec hooks
    PRE_SPEC_CREATE = "pre_spec_create"  # Before creating a spec
    POST_SPEC_CREATE = "post_spec_create"  # After creating a spec

    # Build hooks
    PRE_BUILD = "pre_build"  # Before starting a build
    POST_BUILD = "post_build"  # After completing a build
    PRE_SUBTASK = "pre_subtask"  # Before starting a subtask
    POST_SUBTASK = "post_subtask"  # After completing a subtask


# Hook function signature
HookFunction = Callable[..., Any]


@dataclass
class HookRegistration:
    """Registration information for a hook."""

    hook_type: HookType
    callback: HookFunction
    plugin_name: str
    priority: int = 0  # Higher priority runs first
    enabled: bool = True

    def __lt__(self, other: HookRegistration) -> bool:
        """Compare by priority for sorting."""
        return self.priority > other.priority  # Higher priority first


class HookRegistry:
    """
    Registry for plugin hooks.

    Allows plugins to register callbacks for various lifecycle events.
    """

    def __init__(self):
        """Initialize the hook registry."""
        self._hooks: dict[HookType, list[HookRegistration]] = {
            hook_type: [] for hook_type in HookType
        }

    def register(
        self,
        hook_type: HookType,
        callback: HookFunction,
        plugin_name: str,
        priority: int = 0,
    ) -> None:
        """
        Register a hook callback.

        Args:
            hook_type: Type of hook to register for
            callback: Function to call when hook is triggered
            plugin_name: Name of the plugin registering the hook
            priority: Execution priority (higher runs first)
        """
        registration = HookRegistration(
            hook_type=hook_type,
            callback=callback,
            plugin_name=plugin_name,
            priority=priority,
        )
        self._hooks[hook_type].append(registration)
        # Sort by priority
        self._hooks[hook_type].sort()

    def unregister(self, hook_type: HookType, plugin_name: str) -> int:
        """
        Unregister all hooks for a plugin.

        Args:
            hook_type: Type of hook to unregister
            plugin_name: Name of the plugin

        Returns:
            Number of hooks unregistered
        """
        original_count = len(self._hooks[hook_type])
        self._hooks[hook_type] = [
            h for h in self._hooks[hook_type] if h.plugin_name != plugin_name
        ]
        return original_count - len(self._hooks[hook_type])

    def unregister_all(self, plugin_name: str) -> int:
        """
        Unregister all hooks for a plugin across all hook types.

        Args:
            plugin_name: Name of the plugin

        Returns:
            Total number of hooks unregistered
        """
        total = 0
        for hook_type in HookType:
            total += self.unregister(hook_type, plugin_name)
        return total

    def trigger(self, hook_type: HookType, *args, **kwargs) -> list[Any]:
        """
        Trigger a hook and call all registered callbacks.

        Args:
            hook_type: Type of hook to trigger
            *args: Positional arguments to pass to callbacks
            **kwargs: Keyword arguments to pass to callbacks

        Returns:
            List of results from all callbacks
        """
        results = []
        for registration in self._hooks[hook_type]:
            if registration.enabled:
                try:
                    result = registration.callback(*args, **kwargs)
                    results.append(result)
                except Exception as e:
                    # Log error but continue with other hooks
                    print(
                        f"Error in hook {hook_type.value} from plugin "
                        f"{registration.plugin_name}: {e}"
                    )
        return results

    def trigger_transform(
        self, hook_type: HookType, data: Any, *args, **kwargs
    ) -> Any:
        """
        Trigger a hook that transforms data through a chain of callbacks.

        Each callback receives the result of the previous callback.

        Args:
            hook_type: Type of hook to trigger
            data: Initial data to transform
            *args: Additional positional arguments
            **kwargs: Additional keyword arguments

        Returns:
            Transformed data after all callbacks
        """
        for registration in self._hooks[hook_type]:
            if registration.enabled:
                try:
                    data = registration.callback(data, *args, **kwargs)
                except Exception as e:
                    print(
                        f"Error in transform hook {hook_type.value} from plugin "
                        f"{registration.plugin_name}: {e}"
                    )
        return data

    def get_hooks(self, hook_type: HookType) -> list[HookRegistration]:
        """Get all registrations for a hook type."""
        return list(self._hooks[hook_type])

    def enable_plugin_hooks(self, plugin_name: str) -> None:
        """Enable all hooks for a plugin."""
        for hooks in self._hooks.values():
            for hook in hooks:
                if hook.plugin_name == plugin_name:
                    hook.enabled = True

    def disable_plugin_hooks(self, plugin_name: str) -> None:
        """Disable all hooks for a plugin."""
        for hooks in self._hooks.values():
            for hook in hooks:
                if hook.plugin_name == plugin_name:
                    hook.enabled = False

    def clear(self) -> None:
        """Clear all registered hooks."""
        for hook_type in HookType:
            self._hooks[hook_type] = []


# Global hook registry instance
_global_hook_registry: HookRegistry | None = None


def get_hook_registry() -> HookRegistry:
    """Get the global hook registry."""
    global _global_hook_registry
    if _global_hook_registry is None:
        _global_hook_registry = HookRegistry()
    return _global_hook_registry
