"""
Plugin Management CLI Commands
==============================

Commands for managing Auto Claude plugins via the CLI.
"""

import json
import os
import shutil
from pathlib import Path
from typing import Optional

from debug import debug, debug_error, debug_success


def get_plugins_directory() -> Path:
    """Get the plugins directory path."""
    # Use platform-specific user data directory
    if os.name == "nt":  # Windows
        base = os.environ.get("APPDATA", os.path.expanduser("~"))
    else:  # macOS/Linux
        base = os.path.expanduser("~")
    
    return Path(base) / ".auto-claude" / "plugins"


def ensure_plugins_directory() -> Path:
    """Ensure the plugins directory exists and return its path."""
    plugins_dir = get_plugins_directory()
    plugins_dir.mkdir(parents=True, exist_ok=True)
    return plugins_dir


def read_plugin_manifest(plugin_path: Path) -> Optional[dict]:
    """Read and parse a plugin's manifest file."""
    manifest_path = plugin_path / "plugin.json"
    if not manifest_path.exists():
        return None
    
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        debug_error("plugin_commands", f"Failed to read manifest: {e}")
        return None


def validate_manifest(manifest: dict) -> tuple[bool, list[str]]:
    """
    Validate a plugin manifest.
    
    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []
    
    # Required fields
    if not manifest.get("id"):
        errors.append("Missing required field: id")
    if not manifest.get("name"):
        errors.append("Missing required field: name")
    if not manifest.get("version"):
        errors.append("Missing required field: version")
    
    # Validate id format (lowercase, alphanumeric, hyphens)
    plugin_id = manifest.get("id", "")
    if plugin_id and not all(c.islower() or c.isdigit() or c == "-" for c in plugin_id):
        errors.append("Plugin ID must be lowercase alphanumeric with hyphens only")
    
    # Validate version format (semver)
    version = manifest.get("version", "")
    if version:
        parts = version.split(".")
        if len(parts) < 3:
            errors.append("Version must be in semver format (e.g., 1.0.0)")
    
    return len(errors) == 0, errors


def handle_plugin_list_command() -> None:
    """List all installed plugins."""
    plugins_dir = get_plugins_directory()
    
    print("\n📦 Installed Plugins")
    print("=" * 50)
    
    if not plugins_dir.exists():
        print("\nNo plugins directory found.")
        print(f"Plugins should be installed to: {plugins_dir}")
        return
    
    plugins = []
    for item in plugins_dir.iterdir():
        if item.is_dir() and (item / "plugin.json").exists():
            manifest = read_plugin_manifest(item)
            if manifest:
                plugins.append({
                    "path": item,
                    "manifest": manifest,
                })
    
    if not plugins:
        print("\nNo plugins installed.")
        print(f"\nInstall plugins to: {plugins_dir}")
        return
    
    for plugin in sorted(plugins, key=lambda p: p["manifest"].get("name", "")):
        manifest = plugin["manifest"]
        status = "✓ enabled" if is_plugin_enabled(manifest["id"]) else "○ disabled"
        
        print(f"\n  {manifest.get('name', 'Unknown')} ({manifest.get('id', 'unknown')})")
        print(f"    Version: {manifest.get('version', 'unknown')}")
        print(f"    Status:  {status}")
        if manifest.get("description"):
            print(f"    Description: {manifest['description']}")
    
    print(f"\nTotal: {len(plugins)} plugin(s)")
    print(f"Location: {plugins_dir}")


def handle_plugin_install_command(source: str) -> None:
    """
    Install a plugin from a source path.
    
    Args:
        source: Path to plugin directory or archive
    """
    source_path = Path(source).resolve()
    
    if not source_path.exists():
        print(f"\n❌ Error: Source not found: {source_path}")
        return
    
    # Read manifest from source
    manifest = read_plugin_manifest(source_path)
    if not manifest:
        print(f"\n❌ Error: No valid plugin.json found in {source_path}")
        return
    
    # Validate manifest
    is_valid, errors = validate_manifest(manifest)
    if not is_valid:
        print(f"\n❌ Error: Invalid plugin manifest:")
        for error in errors:
            print(f"    - {error}")
        return
    
    plugin_id = manifest["id"]
    plugins_dir = ensure_plugins_directory()
    target_path = plugins_dir / plugin_id
    
    # Check if already installed
    if target_path.exists():
        print(f"\n⚠️  Plugin '{plugin_id}' is already installed.")
        response = input("Overwrite? (y/N): ").strip().lower()
        if response != "y":
            print("Installation cancelled.")
            return
        shutil.rmtree(target_path)
    
    # Copy plugin to plugins directory
    try:
        shutil.copytree(source_path, target_path)
        print(f"\n✓ Plugin '{manifest['name']}' installed successfully!")
        print(f"  ID: {plugin_id}")
        print(f"  Version: {manifest['version']}")
        print(f"  Location: {target_path}")
    except Exception as e:
        print(f"\n❌ Error installing plugin: {e}")


def handle_plugin_uninstall_command(plugin_id: str) -> None:
    """
    Uninstall a plugin.
    
    Args:
        plugin_id: ID of the plugin to uninstall
    """
    plugins_dir = get_plugins_directory()
    plugin_path = plugins_dir / plugin_id
    
    if not plugin_path.exists():
        print(f"\n❌ Error: Plugin '{plugin_id}' is not installed.")
        return
    
    # Read manifest for confirmation
    manifest = read_plugin_manifest(plugin_path)
    plugin_name = manifest.get("name", plugin_id) if manifest else plugin_id
    
    # Confirm uninstall
    print(f"\n⚠️  This will uninstall '{plugin_name}' ({plugin_id})")
    response = input("Are you sure? (y/N): ").strip().lower()
    
    if response != "y":
        print("Uninstall cancelled.")
        return
    
    # Remove plugin
    try:
        shutil.rmtree(plugin_path)
        
        # Remove from enabled state
        remove_from_enabled_state(plugin_id)
        
        print(f"\n✓ Plugin '{plugin_name}' uninstalled successfully!")
    except Exception as e:
        print(f"\n❌ Error uninstalling plugin: {e}")


def handle_plugin_enable_command(plugin_id: str) -> None:
    """
    Enable a plugin.
    
    Args:
        plugin_id: ID of the plugin to enable
    """
    plugins_dir = get_plugins_directory()
    plugin_path = plugins_dir / plugin_id
    
    if not plugin_path.exists():
        print(f"\n❌ Error: Plugin '{plugin_id}' is not installed.")
        return
    
    set_plugin_enabled(plugin_id, True)
    
    manifest = read_plugin_manifest(plugin_path)
    plugin_name = manifest.get("name", plugin_id) if manifest else plugin_id
    
    print(f"\n✓ Plugin '{plugin_name}' enabled.")
    print("  Restart Auto Claude for changes to take effect.")


def handle_plugin_disable_command(plugin_id: str) -> None:
    """
    Disable a plugin.
    
    Args:
        plugin_id: ID of the plugin to disable
    """
    plugins_dir = get_plugins_directory()
    plugin_path = plugins_dir / plugin_id
    
    if not plugin_path.exists():
        print(f"\n❌ Error: Plugin '{plugin_id}' is not installed.")
        return
    
    set_plugin_enabled(plugin_id, False)
    
    manifest = read_plugin_manifest(plugin_path)
    plugin_name = manifest.get("name", plugin_id) if manifest else plugin_id
    
    print(f"\n✓ Plugin '{plugin_name}' disabled.")
    print("  Restart Auto Claude for changes to take effect.")


def handle_plugin_info_command(plugin_id: str) -> None:
    """
    Show detailed information about a plugin.
    
    Args:
        plugin_id: ID of the plugin
    """
    plugins_dir = get_plugins_directory()
    plugin_path = plugins_dir / plugin_id
    
    if not plugin_path.exists():
        print(f"\n❌ Error: Plugin '{plugin_id}' is not installed.")
        return
    
    manifest = read_plugin_manifest(plugin_path)
    if not manifest:
        print(f"\n❌ Error: Could not read plugin manifest.")
        return
    
    print(f"\n📦 Plugin: {manifest.get('name', 'Unknown')}")
    print("=" * 50)
    print(f"  ID:          {manifest.get('id', 'unknown')}")
    print(f"  Version:     {manifest.get('version', 'unknown')}")
    print(f"  Status:      {'enabled' if is_plugin_enabled(plugin_id) else 'disabled'}")
    
    if manifest.get("description"):
        print(f"  Description: {manifest['description']}")
    if manifest.get("author"):
        print(f"  Author:      {manifest['author']}")
    if manifest.get("license"):
        print(f"  License:     {manifest['license']}")
    if manifest.get("repository"):
        print(f"  Repository:  {manifest['repository']}")
    if manifest.get("homepage"):
        print(f"  Homepage:    {manifest['homepage']}")
    
    # Show contributions
    contributes = manifest.get("contributes", {})
    if contributes:
        print("\n  Contributions:")
        if contributes.get("commands"):
            print(f"    - {len(contributes['commands'])} command(s)")
        if contributes.get("sidebar", {}).get("panels"):
            print(f"    - {len(contributes['sidebar']['panels'])} sidebar panel(s)")
        if contributes.get("settings", {}).get("sections"):
            print(f"    - {len(contributes['settings']['sections'])} setting(s)")
        if contributes.get("keybindings"):
            print(f"    - {len(contributes['keybindings'])} keybinding(s)")
    
    # Show activation events
    events = manifest.get("activationEvents", [])
    if events:
        print(f"\n  Activation: {', '.join(events)}")
    
    # Show permissions
    permissions = manifest.get("permissions", [])
    if permissions:
        print(f"\n  Permissions: {', '.join(permissions)}")
    
    print(f"\n  Location: {plugin_path}")


# Enabled state management

def get_enabled_state_path() -> Path:
    """Get the path to the enabled state file."""
    return get_plugins_directory() / ".enabled-state.json"


def load_enabled_state() -> dict:
    """Load the plugin enabled state from disk."""
    state_path = get_enabled_state_path()
    if not state_path.exists():
        return {}
    
    try:
        with open(state_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_enabled_state(state: dict) -> None:
    """Save the plugin enabled state to disk."""
    state_path = get_enabled_state_path()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        with open(state_path, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except IOError as e:
        debug_error("plugin_commands", f"Failed to save enabled state: {e}")


def is_plugin_enabled(plugin_id: str) -> bool:
    """Check if a plugin is enabled."""
    state = load_enabled_state()
    return state.get(plugin_id, True)  # Enabled by default


def set_plugin_enabled(plugin_id: str, enabled: bool) -> None:
    """Set a plugin's enabled state."""
    state = load_enabled_state()
    state[plugin_id] = enabled
    save_enabled_state(state)


def remove_from_enabled_state(plugin_id: str) -> None:
    """Remove a plugin from the enabled state."""
    state = load_enabled_state()
    if plugin_id in state:
        del state[plugin_id]
        save_enabled_state(state)
