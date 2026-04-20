# AI Course Generator

Upload a PDF, parse it to structured markdown (MinerU API), then use an AI Planner Agent (OpenAI or Gemini) to split it into chapters, lessons, slides, and quizzes.

![App demo](image.png)
<!-- Replace with a better screenshot or screen recording when available -->

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes (`app/api/`)
- **AI**: OpenAI or Gemini
- **Storage**: Firebase Storage (temporary upload for MinerU)
- **PDF parsing**: MinerU Precision API

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd <repo>
npm install
```

### 2. Install git hooks (required, run once)

```bash
bash scripts/setup_hooks.sh
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
AI_PROVIDER=openai

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

PDF_MINERU_BASE_URL=https://mineru.net/api/v4
PDF_MINERU_API_KEY=
# Get at: mineru.net → sign up → API Management

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
# Get at: Firebase Console → Project Settings → Service Accounts → Generate new private key
```

Set either `OPENAI_API_KEY` or `GEMINI_API_KEY` depending on the provider you want to use. `AI_LOG_SERVER` and `AI_LOG_API_KEY` are pre-filled in `.env.example`.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000. Upload a PDF with clear headings (e.g. lecture slides) to test.

## AI Logging

Prompts and tool calls are automatically logged when you use any supported AI tool (Claude Code, Cursor, Codex, Gemini, Copilot). No manual steps needed after running `setup_hooks.sh`. Logs go to `.ai-log/session.jsonl` and are submitted on `git push`.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — Clean Architecture guide (ports, use cases, adapters, DI, testing)
- [WORKLOG.md](WORKLOG.md) — ADRs, sprint log, technical decisions
- [JOURNAL.md](JOURNAL.md) — Weekly learning journal
