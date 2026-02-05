# @auto-claude/plugin-sdk

SDK for developing Auto-Claude plugins.

## Installation

```bash
npm install @auto-claude/plugin-sdk
```

## Quick Start

Create a `plugin.json` manifest in your plugin directory:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A sample plugin for Auto-Claude",
  "main": "dist/main.js",
  "contributes": {
    "commands": [
      {
        "id": "my-plugin.hello",
        "title": "Hello World",
        "category": "My Plugin"
      }
    ]
  },
  "activationEvents": ["onCommand:my-plugin.hello"]
}
```

Create your plugin entry point:

```typescript
import type { PluginContext } from '@auto-claude/plugin-sdk';

export async function activate(context: PluginContext) {
  context.log('My plugin is now active!');
  
  // Register a command
  context.registerCommand(
    { id: 'my-plugin.hello', title: 'Hello World' },
    () => {
      console.log('Hello from my plugin!');
    }
  );
}

export function deactivate() {
  console.log('My plugin is now deactivated');
}
```

## Plugin Structure

```
my-plugin/
├── plugin.json      # Plugin manifest (required)
├── package.json     # npm package.json
├── src/
│   └── main.ts      # Main process code
└── dist/
    └── main.js      # Compiled output
```

## Manifest Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique plugin identifier (lowercase, alphanumeric, hyphens) |
| `name` | string | Yes | Human-readable name |
| `version` | string | Yes | Semantic version (e.g., 1.0.0) |
| `description` | string | No | Plugin description |
| `main` | string | No | Main process entry point |
| `renderer` | string | No | Renderer process entry point |
| `contributes` | object | No | Plugin contributions |
| `activationEvents` | array | No | When to activate the plugin |
| `permissions` | array | No | Required permissions |

## Contribution Points

### Commands

Register commands that appear in the command palette:

```json
{
  "contributes": {
    "commands": [
      {
        "id": "my-plugin.doSomething",
        "title": "Do Something",
        "category": "My Plugin",
        "icon": "play"
      }
    ]
  }
}
```

### Sidebar Panels

Add custom panels to the sidebar:

```json
{
  "contributes": {
    "sidebar": {
      "panels": [
        {
          "id": "my-plugin.panel",
          "title": "My Panel",
          "icon": "layout",
          "order": 10
        }
      ]
    }
  }
}
```

### Settings

Add settings to the settings page:

```json
{
  "contributes": {
    "settings": {
      "sections": [
        {
          "id": "my-plugin.enabled",
          "title": "Enable My Plugin",
          "type": "boolean",
          "default": true
        }
      ]
    }
  }
}
```

### Keybindings

Add keyboard shortcuts:

```json
{
  "contributes": {
    "keybindings": [
      {
        "command": "my-plugin.doSomething",
        "key": "ctrl+shift+m",
        "mac": "cmd+shift+m"
      }
    ]
  }
}
```

## Activation Events

| Event | Description |
|-------|-------------|
| `onStartup` | Activate when Auto-Claude starts |
| `onCommand:commandId` | Activate when a command is executed |
| `onView:viewId` | Activate when a view is opened |
| `onFileType:extension` | Activate when a file type is opened |
| `onLanguage:languageId` | Activate for a programming language |
| `onTask` | Activate when tasks are loaded |
| `onGitHub` | Activate when GitHub integration is used |
| `onGitLab` | Activate when GitLab integration is used |

## Permissions

| Permission | Description |
|------------|-------------|
| `filesystem` | Read/write files |
| `network` | Make network requests |
| `shell` | Execute shell commands |
| `git` | Access git operations |
| `clipboard` | Access clipboard |
| `notifications` | Show notifications |
| `storage` | Use persistent storage |
| `secrets` | Store secrets securely |

## API Reference

### PluginContext

The context object passed to your `activate` function:

```typescript
interface PluginContext {
  pluginPath: string;
  pluginId: string;
  subscriptions: Disposable[];
  
  registerCommand(contribution: CommandContribution, handler: () => void | Promise<void>): void;
  registerSidebarPanel(contribution: SidebarContribution): void;
  registerSetting(contribution: SettingContribution): void;
  
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
```

### Disposable

A function that cleans up resources:

```typescript
type Disposable = () => void;
```

Add disposables to `context.subscriptions` for automatic cleanup when your plugin deactivates:

```typescript
export function activate(context: PluginContext) {
  const unsubscribe = someAPI.subscribe(handler);
  context.subscriptions.push(unsubscribe);
}
```

## License

MIT
