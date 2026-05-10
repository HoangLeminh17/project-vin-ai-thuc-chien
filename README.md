# Synapsy — AI Flashcard Course Generator

Upload a PDF, parse it to structured markdown (MinerU API), then use a two-stage AI pipeline to generate chapters, lessons, and **ConceptCard flashcards** with built-in **spaced repetition (SRS)**.

Course viewer uses a **master-detail layout**: a fixed tree nav on the left (chapters → lessons → cards inline) and a card detail pane on the right with Edit and Study tabs.

![App demo](image.png)
<!-- Replace with a better screenshot or screen recording when available -->

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes (`app/api/`)
- **AI Stage 1**: OpenAI GPT-4o-mini (Planner — outlines chapters/lessons)
- **AI Stage 2**: OpenAI GPT-4o-mini (Generator — expands outlines into ConceptCards)
- **Auth**: Firebase Auth (Google sign-in)
- **Database**: Firebase Firestore (course + SRS progress persistence)
- **Storage**: Firebase Storage (PDF + layout JSON; client-side upload, server-side Admin proxy)
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

# UKT Service Configuration
UKT_SERVICE_URL=http://ukt-service:8000
```

Set either `OPENAI_API_KEY` or `GEMINI_API_KEY` depending on the provider you want to use. `AI_LOG_SERVER` and `AI_LOG_API_KEY` are pre-filled in `.env.example`.

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

**f) Enable Firebase Storage + deploy rules**

Firebase Console → Storage → Get started → choose **production mode** → select the same region as Firestore.

Then deploy the Storage security rules (allows authenticated browser uploads to `course-pdfs/` and `course-layouts/`):

```bash
firebase login          # one-time, opens browser
firebase deploy --only storage
```

> If `firebase` CLI is not installed: `npm install -g firebase-tools`

**g) Add client-side Firebase env vars**

Beside the server-side `FIREBASE_*` vars (from service account), you also need browser-side vars. Go to Firebase Console → Project Settings → General → Your apps → Web app → SDK setup and configuration → copy the `firebaseConfig` values into `.env`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 5. Run (Recommended: Docker)

Hệ thống hiện tại bao gồm Web App (Next.js) và UKT Microservice (Python). Cách tốt nhất để chạy toàn bộ là sử dụng Docker Compose:

```bash
# Đồng bộ lockfile trước khi build
npm install

# Khởi chạy toàn bộ hệ thống
docker-compose up --build
```

- **Web App**: http://localhost:3000
- **UKT API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

### 6. Run (Development: Manual)

Nếu muốn chạy riêng lẻ để phát triển:

**Web App:**
```bash
npm run dev
```

**UKT Service:**
```bash
cd UKT
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 🚀 Deployment & Monitoring

### 1. Production Deployment (Railway)
Dự án được thiết kế để chạy tối ưu trên **Railway**. Xem hướng dẫn chi tiết tại:
- **Web App & UKT Service**: Tự động deploy qua GitHub integration.
- **Monitoring Stack**: Hướng dẫn deploy Prometheus & Grafana tại **[monitoring/README.md](monitoring/README.md)**.

### 2. Observability
Hệ thống tích hợp sẵn bộ công cụ giám sát:
- **Prometheus**: Thu thập metrics từ các service.
- **Grafana**: Dashboard trực quan hóa (Latency, Token Usage, Error Rates).
- **Discord Alerts**: Cảnh báo lỗi hệ thống thời gian thực.

## AI Logging

Prompts and tool calls are automatically logged when you use any supported AI tool (Claude Code, Cursor, Codex, Gemini, Copilot). No manual steps needed after running `setup_hooks.sh`. Logs go to `.ai-log/session.jsonl` and are submitted on `git push`.

### 📑 Documentation

#### Core Docs
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Bản đồ kiến trúc hệ thống và luồng dữ liệu.
- **[CONVENTIONS.md](CONVENTIONS.md)** — Quy chuẩn viết code và chiến lược testing.
- **[PIPELINE.md](PIPELINE.md)** — Chi tiết pipeline tạo khóa học.
- **[WORKLOG.md](WORKLOG.md)** — Nhật ký quyết định kỹ thuật (ADRs).
- **[JOURNAL.md](JOURNAL.md)** — Nhật ký học tập hàng tuần.

#### 🛠️ BMAD Management (Busy Madman)
Located in `_bmad-output/`:
- **[TRACK.md](_bmad-output/TRACK.md)** — Project heartbeat, status tracking, and next steps.
- **[initialization_plan.md](_bmad-output/initialization_plan.md)** — Initial BMAD setup and complexity assessment.
- **[PRDs/](_bmad-output/PRDs/)** — Product Requirement Documents for key features.
