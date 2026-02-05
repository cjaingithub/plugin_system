/**
 * Plugin Settings Component
 * 
 * Renders plugin-contributed settings sections.
 * Integrates with the main settings page.
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Settings, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { usePluginStore } from '../../stores/plugin-store';

/**
 * Plugin setting definition
 */
export interface PluginSettingDefinition {
  id: string;
  title: string;
  icon?: string;
  order?: number;
  section?: string;
  type?: 'boolean' | 'string' | 'number' | 'select' | 'object';
  default?: unknown;
  description?: string;
  enum?: string[];
  enumLabels?: string[];
  pluginId: string;
}

interface PluginSettingsProps {
  /** Settings to display */
  settings?: PluginSettingDefinition[];
  
  /** Current values */
  values?: Record<string, unknown>;
  
  /** Change handler */
  onChange?: (settingId: string, value: unknown) => void;
  
  /** Additional class names */
  className?: string;
}

/**
 * Single setting input component
 */
function SettingInput({
  setting,
  value,
  onChange,
}: {
  setting: PluginSettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (setting.type) {
    case 'boolean':
      return (
        <Switch
          checked={Boolean(value ?? setting.default)}
          onCheckedChange={onChange}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={String(value ?? setting.default ?? '')}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32"
        />
      );

    case 'select':
      return (
        <select
          value={String(value ?? setting.default ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'flex h-10 w-48 rounded-lg border border-border',
            'bg-card px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary'
          )}
        >
          {setting.enum?.map((opt, idx) => (
            <option key={opt} value={opt}>
              {setting.enumLabels?.[idx] ?? opt}
            </option>
          ))}
        </select>
      );

    case 'string':
    default:
      return (
        <Input
          type="text"
          value={String(value ?? setting.default ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="w-64"
        />
      );
  }
}

/**
 * Plugin Settings Component
 */
export function PluginSettings({
  settings: propSettings,
  values = {},
  onChange,
  className,
}: PluginSettingsProps) {
  const storeSettings = usePluginStore((state) => state.settings);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>(values);
  
  // Use prop settings or store settings
  const settings = propSettings ?? storeSettings;

  // Update local values when props change
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  // Handle setting change
  const handleChange = useCallback((settingId: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [settingId]: value }));
    onChange?.(settingId, value);
    
    // Persist to main process
    window.electronAPI?.plugins?.setSetting?.(settingId, value);
  }, [onChange]);

  // Group settings by section
  const groupedSettings = React.useMemo(() => {
    const groups = new Map<string, PluginSettingDefinition[]>();
    
    for (const setting of settings) {
      const section = setting.section || 'General';
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(setting);
    }
    
    // Sort settings within groups by order
    for (const [, sectionSettings] of groups) {
      sectionSettings.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
    }
    
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [settings]);

  if (settings.length === 0) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        No plugin settings available
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-6 p-4">
        {groupedSettings.map(([section, sectionSettings]) => (
          <div key={section} className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{section}</h3>
            </div>
            
            {/* Settings in section */}
            <div className="space-y-4">
              {sectionSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <Label
                      htmlFor={setting.id}
                      className="text-sm font-medium text-foreground"
                    >
                      {setting.title}
                    </Label>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      From: {setting.pluginId}
                    </p>
                  </div>
                  <SettingInput
                    setting={setting}
                    value={localValues[setting.id]}
                    onChange={(value) => handleChange(setting.id, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * Plugin Settings Section for integration into main settings
 */
export function PluginSettingsSection() {
  const { settings, fetchSettings } = usePluginStore();
  const [values, setValues] = useState<Record<string, unknown>>({});

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Load current values from main process
  useEffect(() => {
    const loadValues = async () => {
      const result = await window.electronAPI?.plugins?.getAllSettingValues?.();
      if (result) {
        setValues(result);
      }
    };
    loadValues();
  }, [settings]);

  if (settings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Plugin Settings</h2>
      <PluginSettings
        settings={settings}
        values={values}
        onChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))}
      />
    </div>
  );
}

export default PluginSettings;
