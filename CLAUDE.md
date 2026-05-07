# CLAUDE.md

## Project overview

AI-powered course generator — upload a PDF, parse it to markdown (MinerU API), then use a two-stage AI pipeline to generate structured chapters, lessons, slides, and quizzes.

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes (`app/api/`)
- **AI Stage 1**: OpenAI GPT-4o (planner — outlines lessons from source)
- **AI Stage 2**: OpenAI GPT-4o-mini (generator — expands outlines into slides + quiz)
- **Storage**: Firebase Storage (temporary upload for MinerU)
- **PDF parsing**: MinerU Precision API

## Project structure

```
app/                  # Next.js App Router
  api/
    parse-pdf/        # POST — upload PDF, return markdown
    generate-course/  # POST — markdown → Course JSON
  page.tsx            # Main UI (upload + course viewer)
  layout.tsx
lib/                  # Shared library code
  ai.ts               # Planner Agent (OpenAI GPT-4o)
  prompts.ts           # Prompt templates
  types.ts             # TypeScript types
  firebase-admin.ts    # Firebase Admin SDK init
  parsers/
    index.ts           # ParsePDF interface
    mineru.ts           # MinerU API implementation
src/                  # Python agent (starter template, excluded from TS build)
scripts/              # Git hooks & AI logging
```

## Commands

```bash
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint
```

## Git conventions

**Every change must go through a branch and PR — never commit directly to `main`.**

Workflow for every task:
1. `git checkout -b <type>/<short-description>` before writing any code
2. Commit changes on that branch
3. Push and open a PR targeting `main`

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: short description       # New feature
fix: short description        # Bug fix
chore: short description      # Setup, config, deps
refactor: short description   # Code change without behavior change
docs: short description       # Documentation
```

Branch naming: `<type>/<short-description>` (e.g. `docs/weekly-report-week1`)

**Commit granularly and often** — never bundle multiple logical changes into one commit. Each commit should represent exactly one unit of work. Aim for 5–10+ commits per PR.

Examples of commit-worthy units:
- Add a new type or interface
- Add one new component (even if incomplete)
- Add one function or hook
- Move or rename a file
- Fix one bug
- Add one test case or test file
- Update one prompt or config

**Bad:** `feat: implement master-detail layout` (1 commit, 400 lines)
**Good:** `feat: add ProgressEntry type to lib/types.ts` → `feat: add card list accordion to CourseTree` → `feat: add detail pane empty state` → ... (8 commits)

If you finish a task in fewer than 5 commits, you almost certainly bundled too much.

## PR requirements

- Run `bash scripts/setup_hooks.sh` before creating any PR (one-time setup)
- **Chaining is allowed:** You are ENCOURAGED to use Stacked PRs (chaining feature branches) to maintain the atomic PR rule (e.g., `feat-logic` targets `feat-ui`, which targets `feat-structure`, which targets `main`).
- **CLAUDE'S MERGE RESPONSIBILITY:** Human reviewers will only approve Stacked PRs. You (Claude) are responsible for executing the merge via `gh cli` to prevent ordering mistakes.
- **Strict Merge Order (Top-Down):** When instructed to merge a Stacked PR chain, you MUST merge from the leaf branch down to the root. 
  - *Example order for PR3 -> PR2 -> PR1 -> main:* 
    1. `gh pr merge <PR3-number>`
    2. `gh pr merge <PR2-number>`
    3. `gh pr merge <PR1-number>` (This finally merges everything into `main`).
  - **CRITICAL:** NEVER merge the base PR into `main` before the higher PRs are merged down into it.
- **Squash Alternative:** If the chain is broken or a human messed up the base branches, use `gh pr create --base main --head <leaf-branch>` to gather all stranded commits into one final PR, then merge it.

### Atomic PR size
Split features into three Stacked PRs instead of one large PR:

1. **PR 1 — Structure** (Targets `main`): directory layout, types, ports
2. **PR 2 — UI** (Targets PR 1's branch): component, loading state, error state
3. **PR 3 — Logic** (Targets PR 2's branch): business logic, error handling, edge cases

### Title

Use Conventional Commits format: `feat(scope): short description`

### Description must include

```
## What
- <bullet list of what was added/changed>

## Why
- <architectural reason or user need>

## Evidence
- <screenshot, GIF, or test output>

## Changes
- <list of changed files>
```

### Testing

- Add at minimum 3 unit tests for core logic functions: success case, error/network failure, empty/edge input
- Use `uuid` instead of index-based or `Math.random()` IDs
- No `console.log(err)` — show user-facing error message or retry button instead

- Do NOT commit `.ai-log/*.jsonl` files (gitignored)

## Architecture

This project follows **Clean Architecture (Ports & Adapters)**. Before writing any code, read [ARCHITECTURE.md](ARCHITECTURE.md) — it covers the layer structure, the 5-step feature workflow, forbidden import rules, and logging conventions.

Short version:
- `core/ports/` — interfaces only, no external dependencies
- `core/use-cases/` — business logic, imports ports only
- `infrastructure/adapters/` — concrete implementations (OpenAI, Firebase, MinerU…)
- `infrastructure/di.ts` — single place to wire adapters into use cases
- `app/api/` — HTTP layer, calls use cases only

## Code conventions

- TypeScript strict mode is enabled
- Path alias: `@/*` maps to project root (e.g. `@/lib/ai`)
- API routes use Next.js App Router convention (`app/api/*/route.ts`)
- Use interfaces in `lib/types.ts` for shared types
- Parser implementations follow the `ParsePDF` interface in `lib/parsers/index.ts` for swappability
- Environment variables: see `.env.example` — never commit `.env`
- **Always ask before implementing** — propose the plan first, wait for confirmation, then code

## Environment variables

Required (defined in `.env`):
- `OPENAI_API_KEY`
- `PDF_MINERU_BASE_URL`, `PDF_MINERU_API_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- `AI_LOG_SERVER`, `AI_LOG_API_KEY` (pre-filled for logging)

## Documentation

- Update [JOURNAL.md](JOURNAL.md) at end of every week (before PR)
- Update [WORKLOG.md](WORKLOG.md) when making technical decisions, task changes, or ADRs
