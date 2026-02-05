/**
 * Plugin Manager Component
 * 
 * UI for discovering, installing, enabling, and managing plugins.
 * Accessible from Settings or via Command Palette.
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Settings,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  FolderOpen,
  Download,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { usePluginStore } from '../../stores/plugin-store';

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

interface PluginManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Plugin Manager Dialog
 */
export function PluginManager({ open, onOpenChange }: PluginManagerProps) {
  const {
    plugins,
    isLoading,
    error,
    fetchAll,
    enablePlugin,
    disablePlugin,
    reloadPlugin,
    uninstallPlugin,
  } = usePluginStore();

  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch plugins when dialog opens
  useEffect(() => {
    if (open) {
      fetchAll();
    }
  }, [open, fetchAll]);

  // Handle plugin actions
  const handleToggleEnabled = useCallback(async (pluginId: string, enabled: boolean) => {
    setActionLoading(pluginId);
    try {
      if (enabled) {
        await disablePlugin(pluginId);
      } else {
        await enablePlugin(pluginId);
      }
    } finally {
      setActionLoading(null);
    }
  }, [enablePlugin, disablePlugin]);

  const handleReload = useCallback(async (pluginId: string) => {
    setActionLoading(pluginId);
    try {
      await reloadPlugin(pluginId);
    } finally {
      setActionLoading(null);
    }
  }, [reloadPlugin]);

  const handleUninstall = useCallback(async (pluginId: string) => {
    if (!confirm(`Are you sure you want to uninstall "${pluginId}"?`)) {
      return;
    }
    setActionLoading(pluginId);
    try {
      await uninstallPlugin(pluginId);
      setSelectedPlugin(null);
    } finally {
      setActionLoading(null);
    }
  }, [uninstallPlugin]);

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

  const selectedPluginData = plugins.find(p => p.id === selectedPlugin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[600px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Plugin Manager
          </DialogTitle>
          <DialogDescription>
            Manage your installed plugins. Enable, disable, or configure plugins to extend Auto-Claude.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Plugin list */}
          <div className="w-1/3 border-r border-border flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {plugins.length} plugin{plugins.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenPluginsFolder}
                title="Open plugins folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plugins.length === 0 ? (
                <div className="p-4 text-center">
                  <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-2">No plugins installed</p>
                  <p className="text-xs text-muted-foreground/70">
                    Install plugins to extend Auto-Claude functionality
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {plugins.map((plugin) => (
                    <button
                      key={plugin.id}
                      onClick={() => setSelectedPlugin(plugin.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg mb-1',
                        'transition-colors duration-150',
                        selectedPlugin === plugin.id
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {plugin.manifest.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', STATE_COLORS[plugin.state] || STATE_COLORS.inactive)}
                        >
                          {plugin.state}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        v{plugin.manifest.version}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Install hint */}
            <div className="p-3 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">
                <strong>To install:</strong> Copy plugin folder to plugins directory or use CLI:
              </p>
              <code className="text-xs text-primary mt-1 block">
                python run.py --plugin-install PATH
              </code>
            </div>
          </div>

          {/* Plugin details */}
          <div className="flex-1 flex flex-col">
            {selectedPluginData ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedPluginData.manifest.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPluginData.id} • v{selectedPluginData.manifest.version}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleEnabled(selectedPluginData.id, selectedPluginData.enabled)}
                        disabled={actionLoading === selectedPluginData.id}
                      >
                        {actionLoading === selectedPluginData.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : selectedPluginData.enabled ? (
                          <PowerOff className="h-4 w-4 mr-1" />
                        ) : (
                          <Power className="h-4 w-4 mr-1" />
                        )}
                        {selectedPluginData.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReload(selectedPluginData.id)}
                        disabled={actionLoading === selectedPluginData.id}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {/* Description */}
                  {selectedPluginData.manifest.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedPluginData.manifest.description}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {selectedPluginData.error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium text-sm">Error</span>
                      </div>
                      <p className="text-sm text-red-600/80 mt-1">
                        {selectedPluginData.error}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <div className="flex items-center gap-2">
                      {selectedPluginData.state === 'active' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : selectedPluginData.state === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-gray-300" />
                      )}
                      <span className="text-sm capitalize">{selectedPluginData.state}</span>
                      {selectedPluginData.enabled ? (
                        <Badge variant="outline" className="text-xs">Enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Disabled</Badge>
                      )}
                    </div>
                  </div>

                  {/* Author */}
                  {selectedPluginData.manifest.author && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-1">Author</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedPluginData.manifest.author}
                      </p>
                    </div>
                  )}

                  {/* Uninstall */}
                  <div className="pt-4 border-t border-border">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUninstall(selectedPluginData.id)}
                      disabled={actionLoading === selectedPluginData.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Uninstall Plugin
                    </Button>
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium mb-2">Select a Plugin</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Choose a plugin from the list to view details, enable/disable, or configure it.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Plugin Manager Button
 * 
 * A button that opens the Plugin Manager dialog.
 */
export function PluginManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Package className="h-4 w-4" />
        Plugins
      </Button>
      <PluginManager open={open} onOpenChange={setOpen} />
    </>
  );
}

export default PluginManager;
