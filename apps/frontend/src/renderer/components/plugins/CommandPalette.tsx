/**
 * Command Palette Component
 * 
 * A searchable modal for executing commands, including plugin commands.
 * Triggered with Ctrl/Cmd + Shift + P.
 */

import * as React from 'react';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Search, Command, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../../lib/utils';
import { usePluginCommands } from '../../hooks/usePluginCommands';
import { useTranslation } from 'react-i18next';

/**
 * Command item interface
 */
interface CommandItem {
  id: string;
  title: string;
  category?: string;
  icon?: string;
  pluginId?: string;
  handler?: () => void | Promise<void>;
}

interface CommandPaletteProps {
  /** Additional class names */
  className?: string;
}

/**
 * Command Palette Component
 */
export function CommandPalette({ className }: CommandPaletteProps) {
  const { t } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // Get plugin commands
  const { commands, executeCommand, isLoading } = usePluginCommands();

  // Built-in commands (can be extended)
  const builtInCommands: CommandItem[] = useMemo(() => [
    {
      id: 'core.openSettings',
      title: 'Open Settings',
      category: 'General',
    },
    {
      id: 'core.newTask',
      title: 'Create New Task',
      category: 'Tasks',
    },
    {
      id: 'core.openTerminal',
      title: 'Open Terminal',
      category: 'Terminal',
    },
    {
      id: 'core.toggleSidebar',
      title: 'Toggle Sidebar',
      category: 'View',
    },
    {
      id: 'core.reloadWindow',
      title: 'Reload Window',
      category: 'Developer',
    },
  ], []);

  // Combine built-in and plugin commands
  const allCommands: CommandItem[] = useMemo(() => {
    const pluginCommands = commands.map(cmd => ({
      id: cmd.id,
      title: cmd.title,
      category: cmd.category,
      icon: cmd.icon,
      pluginId: cmd.pluginId,
    }));
    return [...builtInCommands, ...pluginCommands];
  }, [builtInCommands, commands]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;
    
    const searchLower = search.toLowerCase();
    return allCommands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const categoryMatch = cmd.category?.toLowerCase().includes(searchLower);
      const idMatch = cmd.id.toLowerCase().includes(searchLower);
      return titleMatch || categoryMatch || idMatch;
    });
  }, [allCommands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    
    for (const cmd of filteredCommands) {
      const category = cmd.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }
    
    // Sort groups alphabetically
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap(([_, cmds]) => cmds);
  }, [groupedCommands]);

  // Handle keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSearch('');
      setFocusedIndex(0);
    }
  }, [open]);

  // Reset focused index when filtered results change
  useEffect(() => {
    setFocusedIndex(0);
  }, [filteredCommands.length]);

  // Scroll focused item into view
  useEffect(() => {
    if (listRef.current && focusedIndex >= 0) {
      const item = listRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Handle command execution
  const handleExecute = useCallback(async (command: CommandItem) => {
    setOpen(false);
    
    if (command.pluginId) {
      // Execute plugin command
      await executeCommand(command.id);
    } else {
      // Handle built-in commands
      switch (command.id) {
        case 'core.openSettings':
          // Emit event or call handler
          window.electronAPI?.openSettings?.();
          break;
        case 'core.newTask':
          window.electronAPI?.createTask?.();
          break;
        case 'core.openTerminal':
          window.electronAPI?.openTerminal?.();
          break;
        case 'core.toggleSidebar':
          window.electronAPI?.toggleSidebar?.();
          break;
        case 'core.reloadWindow':
          window.location.reload();
          break;
        default:
          console.log(`[CommandPalette] Executing command: ${command.id}`);
      }
    }
  }, [executeCommand]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < flatCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : flatCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[focusedIndex]) {
          handleExecute(flatCommands[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(flatCommands.length - 1);
        break;
    }
  }, [flatCommands, focusedIndex, handleExecute]);

  // Calculate flat index for each command
  const getCommandIndex = useCallback((cmd: CommandItem) => {
    return flatCommands.findIndex(c => c.id === cmd.id);
  }, [flatCommands]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className={cn(
          'max-w-2xl p-0 gap-0 overflow-hidden',
          className
        )}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        
        {/* Search input */}
        <div className="flex items-center border-b border-border px-4">
          <Command className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className={cn(
              'flex h-12 w-full bg-transparent py-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>⇧P
          </kbd>
        </div>

        {/* Command list */}
        <ScrollArea className="max-h-[400px]" ref={listRef}>
          <div className="p-2">
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading commands...
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No commands found
              </div>
            ) : (
              groupedCommands.map(([category, cmds]) => (
                <div key={category} className="mb-2">
                  {/* Category header */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  
                  {/* Commands in category */}
                  {cmds.map((cmd) => {
                    const index = getCommandIndex(cmd);
                    const isFocused = index === focusedIndex;
                    
                    return (
                      <button
                        key={cmd.id}
                        data-index={index}
                        onClick={() => handleExecute(cmd)}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={cn(
                          'relative flex w-full items-center rounded-md px-2 py-2 text-sm',
                          'cursor-default select-none outline-none',
                          'transition-colors duration-150',
                          isFocused ? 'bg-accent text-accent-foreground' : 'text-foreground',
                          'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <span className="flex-1 text-left">{cmd.title}</span>
                        {cmd.pluginId && (
                          <span className="text-xs text-muted-foreground ml-2">
                            Plugin
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            <kbd className="mr-1 rounded border px-1">↑↓</kbd>
            Navigate
          </span>
          <span>
            <kbd className="mr-1 rounded border px-1">↵</kbd>
            Execute
          </span>
          <span>
            <kbd className="mr-1 rounded border px-1">esc</kbd>
            Close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
