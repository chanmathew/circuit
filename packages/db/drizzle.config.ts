import { defineConfig } from 'drizzle-kit'

/** After editing schema.ts: `pnpm db:generate` — never hand-write SQL migrations. */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: './.data/circuit-dev.db',
  },
})
