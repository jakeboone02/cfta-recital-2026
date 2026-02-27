# AGENTS.md — CFTA Recital 2026

## Project Overview

A dance recital show-order planning tool for Copper Hills Center for the Arts (CFTA). The app helps organize dozens of dances across multiple shows, optimizing order to minimize dancer conflicts between consecutive dances.

**Stack:**

- Bun
- TypeScript
- React
- Cloudflare Workers
- D1 (SQLite)
- TanStack React Query
- TanStack React Table
- `@hello-pangea/dnd` (drag-and-drop)
- Oxfmt

## Tooling — Always Use Bun

This project uses **Bun** as its runtime, package manager, bundler, and test runner. Always prefer Bun over Node.js/npm/npx/Vite equivalents:

| Instead of         | Use                 |
| ------------------ | ------------------- |
| `npm install`      | `bun install`       |
| `npx <tool>`       | `bunx <tool>`       |
| `npx tsc --noEmit` | `bunx tsc --noEmit` |
| `npx wrangler dev` | `bunx wrangler dev` |
| `npx wrangler ...` | `bunx wrangler ...` |
| `node script.ts`   | `bun script.ts`     |
| Vite build         | `bun run build`     |

Run `bun fmt` after every edit to ensure proper formatting.

### Key Commands

```sh
bun install              # Install dependencies
bun fmt                  # Format all code
bun run build            # Build the React SPA into build/ (uses Bun.build, NOT Vite)
bun run dev              # Build + start local Wrangler dev server
bun ./src/optimize.ts    # Run the show-order optimizer CLI
bun ./src/create_database.ts  # Recreate the local SQLite database from CSVs
bunx tsc --noEmit        # Type-check the project
bunx wrangler d1 execute cfta-dance-recital-2026 --local --file=src/schema.sql  # Seed local D1
```

## Architecture

### Build System

The build script (`src/build.ts`) uses **Bun.build** (not Vite) to bundle the React SPA:

1. Builds the optimizer Web Worker (`src/optimizer.worker.ts`) and inlines its code as a generated TypeScript module (`src/optimizer-worker-code.generated.ts`).
2. Bundles the main app from `src/index.html` into `build/`.

### Runtime Modes

The app runs in two modes:

1. **Cloudflare Workers (production):** `src/worker.ts` is the entrypoint. It serves the SPA via Cloudflare Assets and routes `/api/*` requests to the API handlers. Data is stored in Cloudflare D1.
2. **Local Bun server (development alternative):** `server.ts` runs a standalone Bun HTTP server with a local SQLite database (`build/database.db`). It serves the SPA and provides API endpoints including a server-side optimizer.

### Frontend

- **Entrypoint:** `src/index.html` → `src/main.tsx` → `src/App.tsx`
- **State management:** TanStack React Query for server state; React `useState` for local UI state
- **Key components:** `App.tsx` (main shell, login, instance selection), `WorkingArea.tsx` (drag-and-drop show order editor), `ReportArea.tsx` (reports and analysis), `DataGrid.tsx` (table editing)
- **API client:** `src/api-client.ts` — all API calls go through here

### Backend API (`src/api/`)

- `router.ts` — Request routing; all non-auth routes require authentication
- `auth.ts` — Cookie-based password authentication (password stored in `RECITAL_PASSWORD` env var)
- `instances.ts` — CRUD for recital instances (multi-year support)
- `csv-upload.ts` — Bulk CSV data import
- `data.ts` — Read recital data (dances, dancers, groups, etc.)
- `order.ts` — Save/load/bookmark show orders
- `tables.ts` — Generic table CRUD for admin data management

### Optimizer (`src/optimizer/`)

A simulated-annealing optimizer that finds the best show order to minimize:

- Consecutive dancer conflicts (dancers in back-to-back dances)
- Near-consecutive conflicts (gap of 1 dance)
- Same-style adjacent dances
- Baby/predance class placement issues
- Combo class sibling separation
- Style and family imbalance across shows

Can run **client-side** (via Web Worker, `src/optimizer.worker.ts`) or **server-side** (`src/optimize.ts` CLI, `server.ts`).

## Database

### Local Development (Bun SQLite)

Schema defined in `src/create_database.sql`. Seed data lives in CSV files in `src/`:

- `dances.csv`, `dancers.csv`, `classes.csv`, `dancer_classes.csv`, `class_dances.csv`, `recitals.csv`, `recital_groups.csv`

Run `bun ./src/create_database.ts` to rebuild `src/database.db` from CSVs.

### Production (Cloudflare D1)

Schema defined in `src/schema.sql` — multi-instance aware with `recital_instance_id` foreign keys. Seed with:

```sh
bunx wrangler d1 execute cfta-dance-recital-2026 --local --file=src/schema.sql
```

### Key Relationships

- Each dancer is in one or more classes
- Each class participates in one or more dances
- Each dance is assigned to a recital group (A, B, or C), except three "every show" dances: SpecTAPular (first), Hip Hop (second-to-last), Finale (last)
- Show order within each group is a JSON array of dance IDs and `"PRE"` placeholders in `recital_groups.show_order`
- Teachers (`dancers.is_teacher = 1`) do not participate in SpecTAPular

### Show Structure

| Show               | Part 1  | Part 2  |
| ------------------ | ------- | ------- |
| Friday Evening     | Group A | Group B |
| Saturday Morning   | Group C | Group A |
| Saturday Afternoon | Group B | Group C |

Every show: SpecTAPular → [Part 1 group] → [Part 2 group] → Hip Hop → Finale

## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`): On push, checks out code, sets up Bun, runs `bun install` and `bun run build`.

## TypeScript

- Strict mode enabled
- `tsconfig.json` covers `src/` (excluding build scripts and generated files)
- Type-check with: `bunx tsc --noEmit`

## Generated Files (do not edit)

- `src/optimizer-worker-code.generated.ts` — Auto-generated by `src/build.ts`
- `src/data.generated.ts` — Legacy generated data file
- `src/database.db` — Built from CSVs by `src/create_database.ts`
- `build/` — Build output directory

## Legacy / Reference Code

- `src_2024/` and `src_2025/` contain previous years' source code for reference

## Environment Variables

- `RECITAL_PASSWORD` — Password for API authentication (set in `.dev.vars` locally, Cloudflare secrets in production)
