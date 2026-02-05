# Flowchart Importer Plugin

A reference plugin implementation for Auto-Claude that enables importing task workflows from flowchart files (Draw.io, BPMN).

## Features

- Import tasks from Draw.io (.drawio, .xml) files
- Import tasks from BPMN (.bpmn) files
- Visual preview of task graph before import
- Automatic validation of flowchart structure
- Configurable task generation options

## Usage

1. Open the Command Palette (`Ctrl/Cmd + Shift + P`)
2. Type "Import from Flowchart"
3. Select your flowchart file
4. Review and configure the import options
5. Click "Generate Tasks"

## Plugin Structure

This plugin demonstrates the standard Auto-Claude plugin structure:

```
flowchart-importer/
├── plugin.json       # Plugin manifest (required)
├── package.json      # npm dependencies
├── tsconfig.json     # TypeScript configuration
├── tsup.config.ts    # Build configuration
├── src/
│   └── main.ts       # Main process entry point
└── README.md         # Documentation
```

## Plugin Manifest

The `plugin.json` file defines:

- **Metadata**: id, name, version, description, author
- **Entry points**: main (Node.js), renderer (browser)
- **Contributions**: commands, sidebar panels, settings
- **Activation events**: when the plugin should load
- **Permissions**: what the plugin can access

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Type Checking

```bash
npm run typecheck
```

## Using as a Template

To create a new plugin based on this template:

1. Copy this directory to a new location
2. Update `plugin.json` with your plugin's details
3. Update `package.json` with your plugin's name
4. Implement your plugin logic in `src/main.ts`
5. Add renderer components if needed in `src/renderer.tsx`

## API Reference

### activate(context: PluginContext)

Called when the plugin is activated. Use this to:
- Register commands
- Set up event listeners
- Initialize state

```typescript
export async function activate(context: PluginContext) {
  context.registerCommand(
    { id: 'my-plugin.hello', title: 'Say Hello' },
    () => console.log('Hello!')
  );
}
```

### deactivate()

Called when the plugin is deactivated. Use this to:
- Clean up resources
- Remove event listeners
- Save state

```typescript
export function deactivate() {
  // Cleanup code here
}
```

## License

MIT
