# AI Course Generator

Upload a PDF, parse it to structured markdown (MinerU API), then use an AI Planner Agent (OpenAI GPT-4o) to split it into chapters, lessons, slides, and quizzes.

![App demo](image.png)
<!-- Replace with a better screenshot or screen recording when available -->

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes (`app/api/`)
- **AI**: OpenAI GPT-4o (planner) + GPT-4o-mini (content generator)
- **Auth**: Firebase Auth (Google sign-in)
- **Database**: Firebase Firestore (course persistence)
- **Storage**: Firebase Storage (temporary PDF upload for MinerU)
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
OPENAI_API_KEY=

PDF_MINERU_BASE_URL=https://mineru.net/api/v4
PDF_MINERU_API_KEY=
# Get at: mineru.net → sign up → API Management

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
# Get at: Firebase Console → Project Settings → Service Accounts → Generate new private key
```

`AI_LOG_SERVER` and `AI_LOG_API_KEY` are pre-filled in `.env.example`.

### 4. Set up Firebase

This project uses Firebase Auth, Storage, and Firestore. All three must be enabled in the same Firebase project.

**a) Create a Firebase project**

Go to [Firebase Console](https://console.firebase.google.com) → Add project.

**b) Enable Google sign-in**

Firebase Console → Authentication → Sign-in method → Google → Enable.

**c) Enable Firestore**

Firebase Console → Firestore Database → Create database → choose **test mode** → select region `asia-southeast1` → Create.

> If you get a "Cloud Firestore API is disabled" error, go to Google Cloud Console → APIs & Services → Enable **Cloud Firestore API** for your project first.

**d) Create Firestore composite index**

Run the app and visit `/dashboard` once. The server log will contain a `FAILED_PRECONDITION` error with a direct link like:

```
https://console.firebase.google.com/v1/r/project/<your-project>/firestore/indexes?create_composite=...
```

Copy that link from the terminal, open it in your browser → Firebase Console will show a pre-filled form → click **Create index**. Wait ~1–2 min for status to change from **Building** to **Enabled**.

**e) Get service account credentials**

Firebase Console → Project Settings → Service Accounts → Generate new private key → download JSON → copy values into `.env`.

**f) Enable Firebase Storage**

Firebase Console → Storage → Get started → choose test mode.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000. Sign in with Google, upload a PDF, and the generated course will be saved to your dashboard at `/dashboard`.

## AI Logging

Prompts and tool calls are automatically logged when you use any supported AI tool (Claude Code, Cursor, Codex, Gemini, Copilot). No manual steps needed after running `setup_hooks.sh`. Logs go to `.ai-log/session.jsonl` and are submitted on `git push`.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — Clean Architecture guide (ports, use cases, adapters, DI, testing)
- [WORKLOG.md](WORKLOG.md) — ADRs, sprint log, technical decisions
- [JOURNAL.md](JOURNAL.md) — Weekly learning journal
