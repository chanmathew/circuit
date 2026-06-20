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

First install also downloads the Electron binary and compiles native dependencies for Electron.
If the app fails to open, see [Troubleshooting](#troubleshooting).

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
| `pnpm --filter @circuit/db db:migrate`  | Apply migrations to the optional dev DB only |
| `pnpm --filter @circuit/db db:studio`   | Drizzle Studio (dev DB)                      |

## Database migrations

Schema: `packages/db/src/schema.ts`. Migrations: `packages/db/migrations/`.

**The app does not use `db:migrate`.** It has its own SQLite file and migrates itself every time it
starts. `db:migrate` only updates a separate file in the repo that the desktop app never opens.

| Database | Location | Who uses it | How schema updates apply |
| -------- | -------- | ----------- | ------------------------ |
| **App** | `~/Library/Application Support/Circuit/circuit.db` (macOS) | Electron desktop app | **`pnpm dev`** — `createDb()` runs pending migrations on launch |
| **CLI dev** | `packages/db/.data/circuit-dev.db` | `db:migrate`, Drizzle Studio only | `pnpm --filter @circuit/db db:migrate` |

### Workflow (app schema stays current)

1. Edit `packages/db/src/schema.ts`
2. `pnpm --filter @circuit/db db:generate`
3. Commit new files under `packages/db/migrations/`
4. **`pnpm dev`** — this is when the app DB gets the new schema. No `db:migrate` required.

After step 4, your running app matches the latest migrations. You only run `db:migrate` if you
deliberately want to update the **CLI dev** copy (e.g. browsing tables in Drizzle Studio).

## Troubleshooting

### App won't start: `ERR_DLOPEN_FAILED` / `NODE_MODULE_VERSION` on `better_sqlite3`

**Why this happens:** Circuit uses [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3), a
**native** SQLite driver (C++ compiled to a `.node` binary). It is not pure JavaScript — the binary
must match the exact runtime that loads it. Electron embeds its own Node (different ABI than the Node
on your PATH). We compile one copy in `node_modules`; whichever runtime built it last wins.

- **`pnpm dev`** → needs the **Electron** build (`desktop` postinstall runs `electron-rebuild`)
- **`db:migrate` / `db:studio`** → need the **Node** build (may run `pnpm rebuild better-sqlite3`)

If you run CLI DB tools and then the app breaks (or the reverse), restore the build for the runtime
you care about:

```bash
# App won't open after CLI DB work
pnpm --filter desktop postinstall
pnpm dev

# db:migrate fails with ERR_DLOPEN_FAILED
pnpm rebuild better-sqlite3
pnpm --filter @circuit/db db:migrate
pnpm --filter desktop postinstall   # before opening the app again
```

This is unrelated to creating migrations — `db:generate` does not load SQLite. Normal schema work
(`db:generate` → commit → `pnpm dev`) never requires `postinstall`.

### Fresh install: Electron binary missing

```bash
node apps/desktop/scripts/ensure-electron.mjs
pnpm dev
```

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

Also done: **Mock agent loop (M3)** — mock adapter phase runs, structured activity feed, approve/revise, markdown preview, decision cards with gating, proceed labels.

Also done: **Context packs & fresh sessions (M3b)** — context pack builder from approved artifacts, fresh session per mock run, `sessionId` + `contextPackHash` on `phase_runs`.

Not yet implemented:

- Research/structure/plan structured panels (prototype-only modes)
- Chat-inferred revision prompts (minor vs material)
- OpenCode integration
- Git worktrees and diff review

Next milestone: **OpenCode integration** — real agent runs with the same context pack + session model.

## License

MIT — see [LICENSE](LICENSE).
