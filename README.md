# Circuit

Circuit is a local-first control plane / harness for governed coding-agent workflows.

See the [project brief](docs/circuit-brief.md) for product goals, architecture, and milestones.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.13+
- [Vite+](https://viteplus.dev/) (`vp`) — install with `curl -fsSL https://vite.plus | bash`
- [pnpm](https://pnpm.io/) 11.8+ (via Corepack: `corepack enable`)

## Getting started

```bash
corepack enable
vp install
pnpm dev        # starts the Electron desktop app
```

Do **not** use `vp dev` alone — that starts the Vite+ web dev server, not Electron. Use `pnpm dev`
from the repo root (runs `electron-vite dev` in `apps/desktop`).

First install also downloads the Electron binary and rebuilds `better-sqlite3` for Electron (via the
desktop `postinstall` script). If the app fails to open after install, run:

```bash
node apps/desktop/scripts/ensure-electron.mjs
pnpm dev
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
packages/protocol/     Canonical events, blocks, and parsers
packages/workflow/     Workflow types and definitions
packages/shared/       IDs, paths, errors, events (re-exports protocol)
packages/db/           Drizzle schema, migrations, SQLite client
packages/agent-adapters/  Agent adapter interfaces
packages/workspace-manager/
packages/git/
packages/prompts/
```

## Scripts

| Command                                 | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| `pnpm dev`                              | Start desktop app (`electron-vite dev`)      |
| `vp run ready`                          | Full quality gate: check + typecheck + build |
| `vp build`                              | Build all packages                           |
| `vp check`                              | Lint, format, and typecheck                  |
| `vp run -r typecheck`                   | Typecheck all workspace packages             |
| `pnpm --filter @circuit/db db:generate` | Generate SQL migration from schema changes   |
| `pnpm --filter @circuit/db db:migrate`  | Apply migrations to dev DB (`.data/`)        |

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

Milestone 1 (**Local shell**) and Milestone 2b (**Workflow state**) are implemented:

- SQLite persistence in `app.getPath('userData')/circuit.db` via `@circuit/db`
- Add local git repo from the dashboard
- Create task from description with auto-generated title, slug, and branch
- Writes `.Circuit/tasks/<slug>/` artifacts in the target repo
- Phase rail and phase rows in SQLite on task create
- Empty phase artifact files on disk + artifact tree in task detail

Also done: **Circuit protocol** (`@circuit/protocol`) — event schemas, structured block types,
parsers.

Also done: **Mock agent loop** — mock adapter phase runs, structured activity feed, approve/revise.

Not yet implemented:

- Context packs and fresh sessions
- OpenCode integration
- Git worktrees and diff review

Next milestone: **OpenCode integration** — real agent runs after mock loop validation.

## License

MIT — see [LICENSE](LICENSE).
