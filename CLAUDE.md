# CLAUDE.md

## Project overview

AI-powered course generator — upload a PDF, parse it to markdown (MinerU API), then use an AI Planner Agent (Gemini 2.0 Flash) to split it into structured chapters/lessons.

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes (`app/api/`)
- **AI**: Gemini 2.0 Flash via Google AI SDK
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
  ai.ts               # Planner Agent (Gemini)
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

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: short description       # New feature
fix: short description        # Bug fix
chore: short description      # Setup, config, deps
refactor: short description   # Code change without behavior change
docs: short description       # Documentation
```

Branch naming: `<type>/<short-description>` (e.g. `docs/weekly-report-week1`)

**One commit per logical change** — never bundle multiple features/fixes into a single commit.

## PR requirements

- **Title**: Short description of the change
- **Description** must include:

```
## Summary
<description of changes>

## Changes
- <list of changed files>
```

- Run `bash scripts/setup_hooks.sh` before creating any PR
- Do NOT commit `.ai-log/*.jsonl` files (gitignored)

## Code conventions

- TypeScript strict mode is enabled
- Path alias: `@/*` maps to project root (e.g. `@/lib/ai`)
- API routes use Next.js App Router convention (`app/api/*/route.ts`)
- Use interfaces in `lib/types.ts` for shared types
- Parser implementations follow the `ParsePDF` interface in `lib/parsers/index.ts` for swappability
- Environment variables: see `.env.example` — never commit `.env`

## Environment variables

Required (defined in `.env`):
- `GEMINI_API_KEY`
- `PDF_MINERU_BASE_URL`, `PDF_MINERU_API_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
- `AI_LOG_SERVER`, `AI_LOG_API_KEY` (pre-filled for logging)

## Documentation

- Update [JOURNAL.md](JOURNAL.md) at end of every week (before PR)
- Update [WORKLOG.md](WORKLOG.md) when making technical decisions, task changes, or ADRs
