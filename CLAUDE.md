# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Extension Development
- `pnpm run compile` - Compile TypeScript and lint code
- `pnpm run watch` - Start watch mode for development
- `pnpm run package` - Build production package
- `pnpm run lint` - Run ESLint on src directory
- `pnpm run check-types` - Run TypeScript type checking

### Webview Development
Navigate to `webview-ui/` directory:
- `pnpm dev` - Start Vite development server (port 5173)
- `pnpm build` - Build React app for production
- `pnpm lint` - Run ESLint on webview code

### Testing
- `pnpm test` - Run VS Code extension tests
- `pnpm run pretest` - Compile and prepare for testing

## Architecture Overview

This is a VS Code extension with a React-based webview UI:

### Extension Structure
- **Main Extension** (`src/`): TypeScript-based VS Code extension
  - `extension.ts`: Entry point, registers commands and webview provider
  - `CoCodeProvider.ts`: Manages webview lifecycle and messaging
  - `config/ConfigManager.ts`: Handles model configuration persistence
  - Utilities in `utils/` for webview setup

### Webview UI Structure
- **React App** (`webview-ui/src/`): Modern React 19 + TypeScript frontend
  - `pages/chat/`: Main chat interface
  - `pages/setting/`: Settings panel
  - `hooks/`: Custom React hooks for state management
  - Uses Zustand for state management
  - UI built with shadcn/ui components + Tailwind CSS

### Communication Pattern
- Extension ↔ Webview communication via VS Code message API
- Messages: `ready`, `getModelConfig`, `saveModelConfig`, `openSettingPanel`
- Settings persisted in VS Code's global state

### Development Mode
- Extension detects development mode via `vscode.ExtensionMode.Development`
- In dev mode, webview loads from local Vite server (localhost:5173)
- In production, loads from bundled assets in `webview-ui-dist/`

## Code Conventions

### Component Exports (Enforced)
- **Use named exports only**: `export const Button = () => {}`
- **Never use default exports**: `export default` is prohibited
- Import with: `import { Button } from './components'`

### Package Management
- **Use pnpm exclusively** - never npm or yarn
- Lock file: `pnpm-lock.yaml`

### State Management
- **Zustand with selectors**: `const value = useStore((state) => state.value)`
- **One selector per value** - no destructuring or object returns
- **No store-wide selection**: avoid `const store = useStore()`

### Build System
- Extension built with esbuild (`esbuild.js`)
- Webview built with Vite
- Uses TypeScript strict mode
- ESLint with TypeScript parser

## Key Dependencies

### Extension
- VS Code API (`vscode`)
- Build: esbuild, TypeScript, ESLint

### Webview
- React 19 + React DOM
- State: Zustand
- UI: shadcn/ui, Radix UI, Tailwind CSS, Lucide icons
- AI: DeepSeek SDK
- HTTP: Axios
- Build: Vite, TypeScript

## Extension Features
- Sidebar panel with AI chat interface
- Settings panel for model configuration
- Commands: `co-code.openSidebar`, `co-code.openSettingPanel`
- Retains context when hidden
- Model configuration persistence via ConfigManager