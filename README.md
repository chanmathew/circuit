# Circuit

Circuit is a local-first desktop app for running AI coding agents through structured, reviewable
development workflows.

See the [project brief](docs/circuit-brief.md) for product goals, architecture, and milestones.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.12+
- [Vite+](https://viteplus.dev/) (`vp`) — install with `curl -fsSL https://vite.plus | bash`
- [pnpm](https://pnpm.io/) 11.8+ (via Corepack: `corepack enable`)

## Getting started

```bash
corepack enable
vp install
vp dev          # runs desktop#dev via vp run
```

The Electron desktop app opens with placeholder Dashboard and New Task screens.

## Toolchain

This repo follows [Vite+ monorepo conventions](https://viteplus.dev/guide/monorepo):

- **`vp install`** / **`vp check`** / **`vp run`** — root toolchain (lint, fmt, typecheck, task
  cache)
- **`vp migrate`** — applied for Vite+ alignment (`staged`, `run.cache`, catalog mode)
- **`vp add <pkg>`** — preferred way to add dependencies (not manual `package.json` edits)
- **`pnpm-workspace.yaml`** — workspace membership, catalog, and supply-chain policy
- **TypeScript 7 RC** (`typescript@rc` / `7.0.1-rc`) via catalog — platform packages are in
  `minimumReleaseAgeExclude` until the RC ages out

**Electron exception:** `electron-vite@6` uses stock **Vite 8** for bundling, so there is no global
`vite` catalog override. Only `apps/desktop` pins `vite` directly.

## Monorepo layout

```txt
apps/desktop/          Electron + React shell (package name: desktop)
packages/ui/           Shared shadcn-style components
packages/workflow/     Workflow types and definitions
packages/shared/       IDs, paths, errors, events
packages/db/           Drizzle schema (stub)
packages/agent-adapters/  Agent adapter interfaces
packages/workspace-manager/
packages/git/
packages/prompts/
```

## Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `vp dev`              | Start desktop app (`vp run desktop#dev`)     |
| `vp run ready`        | Full quality gate: check + typecheck + build |
| `vp build`            | Build all packages                           |
| `vp check`            | Lint, format, and typecheck                  |
| `vp run -r typecheck` | Typecheck all workspace packages             |

## Supply-chain policy

This repo uses explicit pnpm 11 protections in `pnpm-workspace.yaml`:

- **minimumReleaseAge** (24h) — newly published versions are not installed immediately
- **minimumReleaseAgeStrict** — install fails if only matching versions are too new
- **blockExoticSubdeps** — block git/tarball/http transitive dependencies
- **strictDepBuilds** + **allowBuilds** — block unreviewed postinstall scripts; `electron` and
  `esbuild` are pre-approved

`trustPolicy: no-downgrade` is documented but not enabled yet — many transitive dependencies lack
consistent npm provenance and block installs. Re-enable once the dependency tree stabilizes.

When adding dependencies, use **`vp add <pkg>`** (or `vp add <pkg> --filter desktop`). If a build is
blocked, add an explicit entry to `allowBuilds` after review — do not use `--ignore-scripts` in CI.

For urgent security patches, use `minimumReleaseAgeExclude` or run `vp pm audit --fix`.

## Scaffold status

The current bootstrap is a **scaffold only**. Not yet implemented:

- SQLite persistence and repo registration
- Task creation and `.Circuit/tasks/` artifact writing
- Workflow phase rail and agent runs
- OpenCode integration
- Git worktrees and diff review

Next milestone: **Local shell** — add repo, create task, write `00-ticket.md`.

## License

MIT — see [LICENSE](LICENSE).
