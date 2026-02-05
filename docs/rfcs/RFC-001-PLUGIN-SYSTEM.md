# RFC-001: Plugin System Architecture

| Status | Implemented |
|--------|-------------|
| Author | Chhavi Jain |
| Created | 2026-01-21 |
| Updated | 2026-02-05 |
| Discussion | [GitHub #1717](https://github.com/AndyMik90/Auto-Claude/discussions/1717) |

## Abstract

This RFC proposes a Plugin System Architecture for Auto-Claude that enables third-party developers to extend the application's functionality through a well-defined, secure, and type-safe plugin API.

## Motivation

Auto-Claude is a powerful autonomous coding framework, but currently all features must be built into the core application. This creates several limitations:

1. **Community Contributions** - External developers cannot easily add features without modifying core code
2. **Customization** - Users cannot tailor the application to their specific workflows
3. **Maintainability** - The core team must maintain all features, increasing technical debt
4. **Experimentation** - New ideas require changes to the main codebase

Successful developer tools like VS Code, Obsidian, and Figma demonstrate that plugin ecosystems dramatically increase adoption and utility.

## Prior Art

### VS Code Extension API
- Uses `package.json` manifest with `contributes` field
- Activation events for lazy loading
- Extension host process isolation
- Rich contribution points (commands, views, languages)

### Obsidian Plugin API
- Simple activate/deactivate lifecycle
- Direct DOM access (less sandboxed)
- Settings integration
- Ribbon icons and commands

### Figma Plugin API
- Sandboxed iframe execution
- Message passing for UI
- Limited API surface
- Strong security model

### Design Decisions

| Aspect | Our Choice | Rationale |
|--------|-----------|-----------|
| Manifest Format | JSON (like VS Code) | Familiar to developers, easy tooling |
| Activation | Event-based | Lazy loading for performance |
| Isolation | Process-level | Security without iframe complexity |
| Type Safety | TypeScript SDK | Developer experience, error prevention |

## Detailed Design

### Plugin Manifest (`plugin.json`)

```json
{
  "id": "unique-plugin-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "What the plugin does",
  "author": "Author Name",
  "main": "dist/main.js",
  "renderer": "dist/renderer.js",
  "contributes": {
    "commands": [
      {
        "id": "plugin.commandId",
        "title": "Command Title",
        "category": "Category",
        "icon": "icon-name"
      }
    ],
    "sidebar": {
      "panels": [
        {
          "id": "plugin.panelId",
          "title": "Panel Title",
          "icon": "icon-name"
        }
      ]
    },
    "settings": {
      "sections": [
        {
          "id": "plugin.settingId",
          "title": "Setting Title",
          "type": "boolean",
          "default": true
        }
      ]
    },
    "keybindings": [
      {
        "command": "plugin.commandId",
        "key": "ctrl+shift+p",
        "mac": "cmd+shift+p"
      }
    ]
  },
  "activationEvents": [
    "onStartup",
    "onCommand:plugin.commandId"
  ],
  "permissions": [
    "filesystem",
    "network"
  ]
}
```

### Plugin Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│INSTALLED │────▶│ LOADED   │────▶│ ACTIVATING   │────▶│ ACTIVE   │
└──────────┘     └──────────┘     └──────────────┘     └────┬─────┘
     ▲                                                      │
     │           ┌──────────┐     ┌──────────────┐          │
     └───────────│ INACTIVE │◀────│ DEACTIVATING │◀─────────┘
                 └──────────┘     └──────────────┘
                      │
                      ▼
                 ┌──────────┐
                 │  ERROR   │
                 └──────────┘
```

### Plugin Context API

```typescript
interface PluginContext {
  // Plugin identity
  pluginId: string;
  pluginPath: string;
  
  // Lifecycle management
  subscriptions: Disposable[];
  
  // Registration methods
  registerCommand(
    contribution: CommandContribution,
    handler: () => void | Promise<void>
  ): void;
  
  registerSidebarPanel(
    contribution: SidebarContribution
  ): void;
  
  registerSetting(
    contribution: SettingContribution
  ): void;
  
  // Logging
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS                              │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Plugin Loader  │  │ Plugin Manager  │  │  Contribution   │ │
│  │                 │  │                 │  │    Registry     │ │
│  │ • discoverPlugins│  │ • activate()   │  │                 │ │
│  │ • loadManifest() │  │ • deactivate() │  │ • commands      │ │
│  │ • validatePlugin│  │ • enable()     │  │ • panels        │ │
│  │                 │  │ • disable()    │  │ • settings      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│                         ▼ IPC ▼                                │
├─────────────────────────────────────────────────────────────────┤
│                      RENDERER PROCESS                           │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Plugin Store   │  │ Plugin Manager  │  │ Command Palette │ │
│  │   (Zustand)     │  │      UI         │  │   Integration   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Security Considerations

### Permission Model

Plugins must declare required permissions in their manifest:

| Permission | Capabilities |
|------------|-------------|
| `filesystem` | Read/write files within project |
| `network` | Make HTTP requests |
| `shell` | Execute shell commands (restricted) |
| `git` | Access git operations |
| `clipboard` | Read/write clipboard |
| `notifications` | Show system notifications |
| `storage` | Persistent key-value storage |
| `secrets` | Secure credential storage |

### Sandboxing

1. Plugins run in isolated contexts
2. No direct access to Node.js internals
3. IPC-only communication with main process
4. Error boundaries prevent crashes from propagating

### Validation

1. Manifest schema validation on load
2. Permission approval on first activation
3. Code signature verification (future)

## Alternatives Considered

### 1. WebAssembly Plugins
- **Pros**: Strong sandboxing, language-agnostic
- **Cons**: Complex toolchain, limited DOM access
- **Decision**: Rejected for v1, consider for future

### 2. Lua Scripting
- **Pros**: Lightweight, easy sandboxing
- **Cons**: Different language, limited ecosystem
- **Decision**: Rejected, prefer JavaScript ecosystem

### 3. No Plugin System
- **Pros**: Simpler maintenance
- **Cons**: Limited extensibility, community growth
- **Decision**: Rejected, extensibility is key to adoption

## Implementation Plan

### Phase 1: Core Infrastructure
- [x] Plugin SDK types
- [x] Plugin Loader
- [x] Plugin Manager
- [x] Contribution Registry

### Phase 2: UI Integration
- [x] Plugin Manager UI
- [x] Plugin Settings UI
- [x] Command Palette integration

### Phase 3: Reference Plugin
- [x] Flowchart Importer plugin
- [x] Documentation

### Phase 4: Polish
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Additional contribution points

## References

1. [VS Code Extension API](https://code.visualstudio.com/api)
2. [Obsidian Plugin API](https://docs.obsidian.md/Plugins)
3. [Figma Plugin API](https://www.figma.com/plugin-docs/)
4. [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

## Changelog

| Date | Change |
|------|--------|
| 2026-01-21 | Initial draft |
| 2026-02-05 | Added implementation details, security model |
