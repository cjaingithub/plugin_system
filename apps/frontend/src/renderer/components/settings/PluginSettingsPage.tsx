/**
 * Plugin Settings Page
 * 
 * Settings page section for managing plugins.
 * Shows installed plugins, allows enable/disable, and provides access to plugin manager.
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { usePluginStore } from '../../stores/plugin-store';
import { SettingsSection } from './SettingsSection';

/**
 * Plugin state badge colors
 */
const STATE_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  inactive: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
  activating: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  deactivating: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

/**
 * Plugin Settings Page Component
 */
export function PluginSettingsPage() {
  const {
    plugins,
    isLoading,
    error,
    fetchAll,
    enablePlugin,
    disablePlugin,
  } = usePluginStore();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch plugins on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Handle plugin toggle
  const handleToggle = useCallback(async (pluginId: string, currentlyEnabled: boolean) => {
    setActionLoading(pluginId);
    try {
      if (currentlyEnabled) {
        await disablePlugin(pluginId);
      } else {
        await enablePlugin(pluginId);
      }
    } finally {
      setActionLoading(null);
    }
  }, [enablePlugin, disablePlugin]);

  // Open plugins folder
  const handleOpenPluginsFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI?.openPluginsFolder?.();
      if (result && !result.success) {
        console.error('Failed to open plugins folder:', result.error);
      }
    } catch (err) {
      console.error('Failed to open plugins folder:', err);
    }
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <SettingsSection
        title="Plugins"
        description="Extend Auto-Claude with plugins. Enable or disable installed plugins below."
      >
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPluginsFolder}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Plugins Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAll()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          /* Empty state */
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">No Plugins Installed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Install plugins to extend Auto-Claude functionality.
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3 max-w-md mx-auto">
              <p className="font-medium mb-1">To install a plugin:</p>
              <code className="text-primary">python run.py --plugin-install /path/to/plugin</code>
              <p className="mt-2">Or copy the plugin folder to the plugins directory.</p>
            </div>
          </div>
        ) : (
          /* Plugin list */
          <div className="space-y-3">
            {plugins.map((plugin) => (
              <div
                key={plugin.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  plugin.state === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'p-2 rounded-lg',
                    plugin.enabled ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Package className={cn(
                      'h-5 w-5',
                      plugin.enabled ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{plugin.manifest.name}</h4>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', STATE_COLORS[plugin.state] || STATE_COLORS.inactive)}
                      >
                        {plugin.state}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {plugin.manifest.description || `v${plugin.manifest.version}`}
                    </p>
                    {plugin.error && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {plugin.error}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    v{plugin.manifest.version}
                  </span>
                  {actionLoading === plugin.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={() => handleToggle(plugin.id, plugin.enabled)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Help section */}
      <SettingsSection
        title="Getting Started with Plugins"
        description="Learn how to discover, install, and use plugins."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Installing Plugins
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Use the CLI to install plugins:
            </p>
            <code className="text-xs bg-background px-2 py-1 rounded">
              python run.py --plugin-install PATH
            </code>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Power className="h-4 w-4" />
              Using Plugin Commands
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              Access plugin commands via Command Palette:
            </p>
            <code className="text-xs bg-background px-2 py-1 rounded">
              Ctrl+Shift+P (Cmd+Shift+P on Mac)
            </code>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Plugin Location
            </h4>
            <p className="text-sm text-muted-foreground">
              Plugins are stored in:<br />
              <code className="text-xs">~/.auto-claude/plugins/</code>
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              CLI Commands
            </h4>
            <p className="text-sm text-muted-foreground">
              <code className="text-xs">--plugin-list</code> • 
              <code className="text-xs">--plugin-enable ID</code> • 
              <code className="text-xs">--plugin-disable ID</code>
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

export default PluginSettingsPage;
