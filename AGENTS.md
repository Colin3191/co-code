# Repository Guidelines

## Project Structure & Module Organization
- VS Code extension source lives in `src/` with feature modules grouped under `commands/`, `providers/`, `services/`, and `store/`; shared helpers sit in `utils/` and `types/`.
- Extension activation flows start in `src/extension.ts`; compiled artifacts are written to `dist/` by esbuild and to `out/` for test builds.
- Webview UI code is isolated in `webview-ui/` (Vite + React); production bundles are synced into `webview-ui-dist/` for the extension to consume.
- Tests mirror runtime layout under `src/test/`, with `integration/` covering workspace scenarios.

## Build, Test, and Development Commands
- `pnpm install` — hydrate all extension and webview dependencies.
- `pnpm run watch` — continuous TypeScript checking plus esbuild bundle for extension development.
- `pnpm run compile` — one-off lint, type-check, and bundle; use before committing.
- `pnpm run lint` — run ESLint across `src/` and `webview-ui/` for style compliance.
- `pnpm test` — execute VS Code extension tests (`@vscode/test-cli`); `pretest` ensures sources are compiled.
- `pnpm run package` — produce `dist/extension.js` and the publishable `.vsix` artifact.
- Inside `webview-ui/`: `pnpm dev` for the Vite dev server, `pnpm build` to refresh `webview-ui-dist/`.

## Coding Style & Naming Conventions
- TypeScript is authoritative; use two-space indentation, single quotes, and named exports.
- Async flows favor `async/await` over promise chains.
- ESLint (`eslint.config.mjs`) enforces `curly`, `eqeqeq`, semicolons, and camelCase/PascalCase import names.
- React components and Tailwind classes in `webview-ui/` should group structural utilities before conditional ones.

## Testing Guidelines
- Place unit-style specs beside features in `src/test/feature-name.test.ts`; integration flows belong in `src/test/integration/`.
- Prefer Mocha-style suites supplied by the VS Code test harness; document manual QA steps in PR descriptions when automation is impractical.
- Run `pnpm test` before each PR; extend coverage for activation, provider registration, and API calls.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`); keep messages imperative and reference issue IDs when available.
- PRs should summarise changes, list validation (`pnpm test`, `pnpm run compile`, screenshots), and note configuration impacts.
- Request review prior to merge and wait for CI to pass.
