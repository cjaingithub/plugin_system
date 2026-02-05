# Auto Claude

**Autonomous multi-agent coding framework that plans, builds, and validates software for you.**

![Auto Claude Kanban Board](.github/assets/Auto-Claude-Kanban.png)

[![License](https://img.shields.io/badge/license-AGPL--3.0-green?style=flat-square)](./agpl-3.0.txt)

---

## Requirements

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Python** >= 3.11
- **Claude Pro/Max subscription** - [Get one here](https://claude.ai/upgrade)
- **Claude Code CLI** - `npm install -g @anthropic-ai/claude-code`
- **Git repository** - Your project must be initialized as a git repo

---

## Quick Start (Development)

```bash
# 1. Clone the repo
git clone https://github.com/cjaingithub/plugin_system.git
cd plugin_system

# 2. Install all dependencies
npm run install:all

# 3. Run in development mode
npm run dev
```

### Manual Setup (if install:all fails)

```bash
# Backend setup
cd apps/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd apps/frontend
npm install

# Run from root
cd ../..
npm run dev
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Autonomous Tasks** | Describe your goal; agents handle planning, implementation, and validation |
| **Parallel Execution** | Run multiple builds simultaneously with up to 12 agent terminals |
| **Isolated Workspaces** | All changes happen in git worktrees - your main branch stays safe |
| **Self-Validating QA** | Built-in quality assurance loop catches issues before you review |
| **AI-Powered Merge** | Automatic conflict resolution when integrating back to main |
| **Memory Layer** | Agents retain insights across sessions for smarter builds |
| **GitHub/GitLab Integration** | Import issues, investigate with AI, create merge requests |
| **Plugin System** | Extend functionality with custom plugins |
| **Flowchart Importer** | Import Draw.io workflows as tasks |
| **Cross-Platform** | Native desktop apps for Windows, macOS, and Linux |
| **Auto-Updates** | App updates automatically when new versions are released |

---

## Interface

### Kanban Board
Visual task management from planning through completion. Create tasks and monitor agent progress in real-time.

### Agent Terminals
AI-powered terminals with one-click task context injection. Spawn multiple agents for parallel work.

### Roadmap
AI-assisted feature planning with competitor analysis and audience targeting.

### Additional Features
- **Insights** - Chat interface for exploring your codebase
- **Ideation** - Discover improvements, performance issues, and vulnerabilities
- **Changelog** - Generate release notes from completed tasks
- **Plugins** - Extend the app with custom functionality

---

## Project Structure

```
Auto-Claude/
├── apps/
│   ├── backend/          # Python agents, specs, QA pipeline
│   │   ├── agents/       # Planner, coder, session management
│   │   ├── qa/           # Reviewer, fixer, loop, criteria
│   │   ├── spec/         # Spec creation pipeline
│   │   ├── cli/          # CLI commands
│   │   ├── flowchart/    # Flowchart importer backend
│   │   └── prompts/      # Agent system prompts
│   └── frontend/         # Electron desktop application
│       └── src/
│           ├── main/     # Electron main process
│           ├── preload/  # Preload scripts
│           ├── renderer/ # React UI
│           └── shared/   # Shared types, i18n, constants
├── packages/
│   └── plugin-sdk/       # Plugin development SDK
├── plugins/
│   └── flowchart-importer/  # Example plugin
├── docs/                 # Plugin documentation
├── guides/               # Additional documentation
├── tests/                # Test suite
└── scripts/              # Build utilities
```

---

## CLI Usage

For headless operation, CI/CD integration, or terminal-only workflows:

```bash
cd apps/backend

# Create a spec interactively
python spec_runner.py --interactive

# Run autonomous build
python run.py --spec 001

# Review and merge
python run.py --spec 001 --review
python run.py --spec 001 --merge
```

See [guides/CLI-USAGE.md](guides/CLI-USAGE.md) for complete CLI documentation.

---

## Plugin System

Auto-Claude includes a modular plugin architecture. See the documentation:

- [Plugin Architecture](docs/PLUGIN_ARCHITECTURE.md) - Technical implementation details
- [Plugin User Guide](docs/PLUGIN_USER_GUIDE.md) - User documentation
- [Flowchart Importer Journey](docs/FLOWCHART_IMPORTER_USER_JOURNEY.md) - Example plugin walkthrough
- [Plugin SDK](packages/plugin-sdk/README.md) - SDK reference

### Creating a Plugin

```typescript
import type { PluginContext } from '@auto-claude/plugin-sdk';

export async function activate(context: PluginContext): Promise<void> {
  context.log('My plugin is now active!');
  
  context.registerCommand(
    { id: 'my-plugin.myCommand', title: 'My Command' },
    async () => {
      console.log('Command executed!');
    }
  );
}

export function deactivate(): void {
  // Cleanup resources
}
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install backend and frontend dependencies |
| `npm start` | Build and run the desktop app |
| `npm run dev` | Run in development mode with hot reload |
| `npm run package` | Package for current platform |
| `npm run package:mac` | Package for macOS |
| `npm run package:win` | Package for Windows |
| `npm run package:linux` | Package for Linux |
| `npm run lint` | Run linter |
| `npm test` | Run frontend tests |
| `npm run test:backend` | Run backend tests |

---

## Security

Auto Claude uses a three-layer security model:

1. **OS Sandbox** - Bash commands run in isolation
2. **Filesystem Restrictions** - Operations limited to project directory
3. **Dynamic Command Allowlist** - Only approved commands based on detected project stack

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup instructions
- Code style guidelines
- Testing requirements
- Pull request process

---

## License

**AGPL-3.0** - GNU Affero General Public License v3.0

Auto Claude is free to use. If you modify and distribute it, or run it as a service, your code must also be open source under AGPL-3.0.
