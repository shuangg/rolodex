# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Rolodex is a local-first personal CRM: an Express + `node:sqlite` API and a React/Vite SPA, both served from one process. No accounts, no network calls, no external database. `REQUIREMENTS.md` is the original spec and the source of truth for intended behavior and success criteria.

## Commands

```bash
npm start            # build if needed (scripts/start.js), then serve API + SPA on :5173
npm run dev          # concurrently: API on :5174 (tsx watch), Vite on :5173 with /api proxy
npm run build        # typecheck client + server configs, then vite build → dist/
npm test             # vitest run
npm run test:watch
npm run reset        # delete data/rolodex.db (reseeds on next start)
```

Run a single test file or test:

```bash
npx vitest run server/api.test.ts
npx vitest run -t "lists seeded people"
```

Requires Node 20+ — the app uses the built-in `node:sqlite` `DatabaseSync`, not `better-sqlite3`.

There is no linter configured. `npm run build` is the typecheck gate; it runs `tsc --noEmit` against both tsconfigs before bundling.

## Architecture

**Three tsconfigs, one codebase.** `tsconfig.json` holds shared strict options (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). `tsconfig.server.json` covers `server/`, `scripts/`, `src/types.ts`, and `src/lib` with Node types. `tsconfig.client.json` covers `src/` with DOM + JSX. A file in `src/lib` or `src/types.ts` is compiled by **both**, so it must stay DOM-free and Node-free.

**Shared domain logic lives in `src/lib`, not `server/`.** The server imports it across the boundary:

- `src/lib/cadence.ts` — circle → cadence days (`inner` 30 / `close` 90 / `wider` 180 / `distant` 365), override and opt-out handling, snooze, and `computeCheckin` producing `in_touch` / `due_soon` (≤7 days) / `overdue`. Used by `server/store.ts` to attach `checkin` to every person and by `server/routes.ts` for `/api/today` sorting.
- `src/lib/recurring.ts` — leap-safe recurrence for birthdays and important dates (Feb 29 folds to Feb 28 in non-leap years); powers `/api/today` upcoming dates and the calendar.

Change cadence or recurrence rules in one place and both the API and UI follow. Both have dedicated unit tests (`cadence.test.ts`, `recurring.test.ts`).

**Server layering:**

- `server/db.ts` — singleton `DatabaseSync`, WAL, foreign keys on, and `migrate()` with the full `CREATE TABLE IF NOT EXISTS` schema. DB path is `data/rolodex.db` unless `ROLODEX_DB` overrides it (tests use a tmpdir path; `:memory:` is special-cased). `resetDb()` closes and removes the db plus `-wal`/`-shm`.
- `server/store.ts` — every SQL statement in the app. Converts snake_case rows to camelCase domain objects (`rowToPerson`, `summaryFromRow`) and enriches with derived metadata (`withMeta` adds `checkin`, `lastContacted`, `latestNews`). `buildTimeline()` fans out across interactions, news, dates, reminders, and gifts into one sorted `TimelineEntry[]`.
- `server/routes.ts` — one Express `Router` mounted at `/api`; parses and validates request bodies, then delegates to the store. Photo upload/import use `multer` memory storage (10 MB cap).
- `server/app.ts` — `createApp()` builds the app without listening, so tests can `supertest` it. `server/index.ts` adds seeding and static `dist/` serving with an SPA catch-all.
- `server/seed.ts` — `seedIfEmpty()` populates a realistic dataset on first run using a seeded PRNG (`mulberry32`), so sample data is deterministic and dates are relative to today.
- `server/import.ts` — CSV (papaparse) and vCard (`vcf`) parsing, column-mapping suggestion, duplicate detection by email, and commit. Import is a preview-then-commit flow across `/api/import/csv|vcf|preview|commit`.

**Client:** React Router SPA. `src/api.ts` is the single typed fetch wrapper — all network calls go through it, never `fetch` directly in a component. Pages own their data with `useState` + a `load()` in `useEffect`; there is no query cache or global store, so mutations re-call `load()`. Mutation endpoints that change a person return the refreshed `PersonWithMeta` so callers can update in place.

`src/types.ts` is the shared contract between client and server — add or change a field there first, then the store mapping, then the UI.

**Photos** are `BLOB`s in the `people` table, served from `GET /api/people/:id/photo`; person JSON carries only `hasPhoto`.

## Testing

`vitest.config.ts` runs in the `node` environment with `fileParallelism: false` — tests share a SQLite file and must not run concurrently. `server/api.test.ts` sets `ROLODEX_DB` to a tmpdir path **before** dynamically importing `app`/`db`/`seed`; keep that ordering if you add server tests, since `getDb()` caches the path at first call. Each test resets and reseeds in `beforeEach`.

## Repo conventions

- Dates are stored and passed as `YYYY-MM-DD` strings (`.toISOString().slice(0, 10)`), never `Date` objects across the API boundary.
- `tags` is a JSON-encoded TEXT column; go through `parseTags` rather than reading it raw.
- Child tables cascade on `person_id` delete — deleting a person clears their interactions, dates, facts, news, reminders, connections, and gifts.
- `data/*.db*` and `dist/` are gitignored; both regenerate.

## Codacy (from `.github/instructions/codacy.instructions.md`)

If the Codacy MCP server is connected, run `codacy_cli_analyze` on each edited file after editing, and use `provider: gh`, `organization: ed-donner`, `repository: rolodex` for Codacy tool calls. That instructions file is itself gitignored and is a VS Code / Copilot rule, so treat it as optional here.
