# PIPELINE.md - File map & data flow

Tai lieu tham chieu nhanh cho Synapsy: cau truc repo, API routes, key types, luong AI pipeline, UI state va monitoring hien tai.

---

## Repo shape

Repo hien tai la monorepo nho:

```
.
  web/                  # Next.js app chinh
  UKT/                  # Python Knowledge Tracing microservice
  monitoring/           # Prometheus, Grafana, Loki, Jaeger, Alertmanager, OTel
  .github/workflows/    # CI
  README.md
  ARCHITECTURE.md
  CLAUDE.md
  CONVENTIONS.md
  WORKLOG.md
  JOURNAL.md
```

> Luu y: cac path trong tai lieu nay mac dinh tinh tu repo root. App code nam trong `web/`, khong nam truc tiep o root.

---

## File Map

### Web App (`web/`)

```
web/
  app/
    page.tsx                         # home + library + upload + generation screen
    dashboard/page.tsx               # redirect ve /
    course/[id]/page.tsx             # load SavedCourse + ProgressMap, render CourseFlow
    course/[id]/diagnostic/page.tsx  # diagnostic route cu/bo tro
    review/page.tsx                  # SRS review
    admin/monitor/page.tsx           # admin logs/usage/metrics UI
    api/                             # Next.js App Router API routes
    components/                      # UI components
  core/
    entities/                        # user/card-progress entities
    errors/                          # domain exceptions
    models/                          # learning-model, saved-course
      knowledge.ts                   # fixed medical modules + deterministic KC registry
    ports/                           # Clean Architecture interfaces
    use-cases/                       # business logic
    utils/                           # SM2 + use-case logging
  infrastructure/
    adapters/                        # Firebase, MinerU, AI, Redis, monitoring adapters
    di/                              # dependency wiring by concern
    di.ts                            # aggregate DI export
    registry.ts                      # route-friendly exports
    log-store.ts                     # in-memory/admin log support
  lib/
    contexts/                        # auth-context, generation-context
    hooks/                           # use-courses
    middlewares/                     # with-auth, with-admin-auth, with-api-logging
    ai.ts                            # Stage 2 generation + provider fallback
    ai-provider.ts                   # provider resolution
    citation-utils.ts                # valid chunk IDs + marker validation
    citations.ts                     # parse citation markers for UI
    crypto-utils.ts                  # content hash
    diagnostic-format.ts             # diagnostic prompt chunk markers incl. KC metadata
    knowledge-prompt.ts              # prompt-facing fixed medical KC registry text
    prompts.ts                       # Planner, Stage 2, diagnostic prompts
    stage2-chunking.ts               # split/merge giant Stage 2 inputs
  scripts/
    setup_hooks.sh
    promote-admin.ts
    log_hook.py / submit_log.py
```

### Core

```
web/core/
  ports/
    ai.port.ts
    alert.port.ts
    auth.port.ts
    course-repository.port.ts
    logger.port.ts
    monitoring.port.ts
    parser.port.ts
    progress.port.ts
    progress-repository.port.ts
    rate-limit.port.ts
    storage.port.ts
    ukt.port.ts
    usage-repository.port.ts
  use-cases/
    auth/create-session.usecase.ts
    auth/verify-session.usecase.ts
    courses/{list,get,save,update,delete}-course.usecase.ts
    diagnostic/generate-diagnostic-quiz.usecase.ts
    spaced-repetition/*.usecase.ts
    generate-course.usecase.ts
    parse-document.usecase.ts
  models/
    knowledge.ts
    learning-model.ts
    saved-course.ts
```

### Infrastructure

```
web/infrastructure/
  di.ts
  registry.ts
  di/
    ai.di.ts                         # ChainAiAdapter: Gemini -> OpenAI -> HF/local where configured
    auth.di.ts
    course.di.ts
    logger.di.ts
    parser.di.ts
    progress.di.ts
    storage.di.ts
  adapters/
    content-list-converter.ts        # MinerU contentList -> markdown + chunk anchors
    mineru-parser.adapter.ts         # MinerU API + PDF chunking for >200 pages
    mineru-chunking.ts               # split PDF ranges, merge overlapped chunks
    fallback-ai.adapter.ts           # provider chain for Stage 1
    openai.adapter.ts
    gemini.adapter.ts
    huggingface.adapter.ts
    firebase-auth.adapter.ts
    firebase-storage.adapter.ts
    firestore-course.adapter.ts
    firebase-progress-repository.adapter.ts
    firestore-usage.adapter.ts
    redis-ratelimit.adapter.ts
    ukt-service.adapter.ts
    prometheus.adapter.ts
    composite-monitoring.adapter.ts
    pino-logger.adapter.ts
    webhook-alert.adapter.ts
```

### UKT Service (`UKT/`)

```
UKT/
  app/
    main.py                          # FastAPI entrypoint
    schemas.py
    ukt_engine.py
    state_store.py
    notifications.py
  model/
    ukt_model.py
  Dockerfile
  requirements.txt
```

UKT chay rieng o `http://localhost:8000` trong Docker Compose, duoc web app goi qua `UKT_SERVICE_URL`.

`/predict` seeds or refreshes KC state from quiz interactions. `/update` also initializes a missing student state so SRS-only users can still produce UKT signals after skipping diagnostics.

### Monitoring

```
monitoring/
  prometheus/
    prometheus.yml
    rules/
  grafana/
    provisioning/
  otel-collector/
  alertmanager/
```

Docker Compose khoi dong Redis, UKT, web, Prometheus, Grafana, OpenTelemetry Collector, Jaeger, Loki va Alertmanager.

---

## API Routes

### Auth

| Method | Route | File | Ghi chu |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | `web/app/api/auth/login/route.ts` | Tao Firebase session cookie |
| POST | `/api/auth/logout` | `web/app/api/auth/logout/route.ts` | Xoa session |
| GET | `/api/auth/me` | `web/app/api/auth/me/route.ts` | Tra user hien tai |

### Course generation

| Method | Route | File | Ghi chu |
| :--- | :--- | :--- | :--- |
| POST | `/api/parse-pdf` | `web/app/api/parse-pdf/route.ts` | Auth, PDF <= 20 MB, MinerU parse |
| GET | `/api/parse-pdf/progress` | `web/app/api/parse-pdf/progress/route.ts` | Poll parse chunk progress by `taskId` |
| POST | `/api/generate-course` | `web/app/api/generate-course/route.ts` | Stage 1 planner, rate limited, cache by markdown hash |
| POST | `/api/generate-content` | `web/app/api/generate-content/route.ts` | Stage 2 concept cards + chapter quiz |
| POST | `/api/extract-facts` | `web/app/api/extract-facts/route.ts` | Flash facts while waiting |
| POST | `/api/diagnostic-quiz` | `web/app/api/diagnostic-quiz/route.ts` | Diagnostic MCQ generation |

### Course storage and source serving

| Method | Route | File | Ghi chu |
| :--- | :--- | :--- | :--- |
| GET | `/api/courses` | `web/app/api/courses/route.ts` | List current user's courses |
| GET | `/api/courses/[id]` | `web/app/api/courses/[id]/route.ts` | Get one course |
| PATCH/DELETE | `/api/courses/[id]` | `web/app/api/courses/[id]/route.ts` | Update/delete saved course |
| GET | `/api/pdf-serve` | `web/app/api/pdf-serve/route.ts` | Admin SDK proxy to PDF bytes |
| GET | `/api/pdf-source` | `web/app/api/pdf-source/route.ts` | Source PDF helper route |
| GET | `/api/layout-serve` | `web/app/api/layout-serve/route.ts` | Admin SDK proxy to MinerU layout JSON |

### Progress and review

| Method | Route | File | Ghi chu |
| :--- | :--- | :--- | :--- |
| GET | `/api/progress/map` | `web/app/api/progress/map/route.ts` | SRS progress keyed by `ci-li` |
| GET | `/api/progress/stats` | `web/app/api/progress/stats/route.ts` | Due/new/learning/streak stats |
| GET | `/api/progress/due` | `web/app/api/progress/due/route.ts` | Cards due for review |
| POST | `/api/progress/review` | `web/app/api/progress/review/route.ts` | Submit SM2 rating |
| POST | `/api/ukt/interactions` | `web/app/api/ukt/interactions/route.ts` | Seed UKT with KC-tagged diagnostic quiz interactions |

### Admin and health

| Method | Route | File | Ghi chu |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/logs` | `web/app/api/admin/logs/route.ts` | Admin-only logs |
| GET | `/api/admin/usage` | `web/app/api/admin/usage/route.ts` | Admin-only AI usage |
| GET | `/api/metrics` | `web/app/api/metrics/route.ts` | Prometheus metrics |
| GET | `/api/health` | `web/app/api/health/route.ts` | Health check |

---

## Pages

| Path | File | Ghi chu |
| :--- | :--- | :--- |
| `/` | `web/app/page.tsx` | Main app: login, SRS stats, library, upload, generation |
| `/dashboard` | `web/app/dashboard/page.tsx` | Redirect ve `/` |
| `/course/[id]` | `web/app/course/[id]/page.tsx` | Course viewer |
| `/course/[id]/diagnostic` | `web/app/course/[id]/diagnostic/page.tsx` | Diagnostic route |
| `/review` | `web/app/review/page.tsx` | SRS review deck |
| `/admin/monitor` | `web/app/admin/monitor/page.tsx` | Admin monitor |

---

## Key Types

Canonical learning models nam o `web/core/models/learning-model.ts`. `web/lib/types.ts` hien con giu mot ban tuong duong de tuong thich voi code cu.

```ts
type OutlinePoint = {
  point: string
  chunks: string[]
}

type Lesson = {
  title: string
  key_concept: string
  knowledge?: KnowledgeComponentRef
  outline: OutlinePoint[]
  source_chunk_start?: string
  source_chunk_end?: string
}

type KnowledgeComponentRef = {
  kc_id: string
  kc_name: string
  module_id: string
  module_name: string
  map_version: string       // current default: medical-v1
  confidence?: number
}

type Course = {
  title: string
  chapters: Chapter[]
}

type ConceptCard = {
  question: string
  answer: string
  detail?: string
  followUps: string[]
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_start?: string
  source_chunk_end?: string
  source_chunk_id?: string      // legacy
  sourceExcerpt?: string        // legacy
}

type QuizQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_id?: string
}

type DiagnosticQuestion = QuizQuestion & {
  topic: string
}

type CourseContent = {
  chapters: ChapterContent[]
}
```

SRS progress:

```ts
type ProgressEntry = {
  status: string        // NEW | LEARNING | REVIEW
  isDue: boolean
  lastReviewedAt?: string
}

type ProgressMap = Record<string, ProgressEntry> // key = "ci-li"

type CardProgress = {
  topic?: string        // legacy KC id storage
  kcId?: string         // deterministic KC id for UKT
  moduleId?: string     // spider chart module axis
}
```

Generation state:

```ts
type GenerationStatus = 'idle' | 'parsing' | 'generating' | 'done'
type DiagnosticStatus = 'idle' | 'loading' | 'done' | 'error'
```

---

## Knowledge Components

KC identity is now deterministic and registry-backed so UKT can trace mastery across sessions and documents.

Source of truth:

- `web/core/models/knowledge.ts`
- `KNOWLEDGE_MAP_VERSION = medical-v1`
- Fixed spider chart modules: Anatomy, Physiology, Pharmacology, Microbiology, Pathology, Clinical Medicine, Biochemistry, Immunology.
- Each KC has stable `kc_id`, display `kc_name`, and parent `module_id`.

Rules:

- Stage 1 Planner must classify each lesson into `Lesson.knowledge`.
- The Planner may only choose a `kc_id` from the fixed registry. It must not invent free-text KC IDs.
- Server-side `normalizeCourseKnowledge()` validates LLM output and falls back deterministically to `{module}.general` or `clinical.general`.
- Stage 2 does not own KC identity. It receives `knowledge` as input and `attachChunkRange()` attaches `kc_id/module_id` to generated concept cards.
- Diagnostic quiz questions copy KC metadata from lesson chunks, then `GenerateDiagnosticQuizUseCase` overwrites AI output from the trusted chunk map.
- UKT receives `kc_id`, not free-text `topic`.

Spider chart semantics:

- Axis = `module_id` from the fixed module list.
- Axis score should aggregate UKT `p_correct` or `mu` across KCs in that module.
- Diagnostic and SRS both write signals to the same KC namespace.

---

## Course Generation Flow

### High-level pipeline

```
User selects PDF
    |
    | client uploadBytes -> Firebase Storage course-pdfs/{uid}/{uuid}.pdf
    v
POST /api/parse-pdf
    |
    | ParseDocumentUseCase -> MineruParserAdapter
    | - PDF <= 200 pages: one MinerU task
    | - PDF > 200 pages: split into 200-page chunks with 3-page overlap
    | - merge chunk contentList, de-dupe overlap, add sourceChunkIndex
    |
    | returns markdown + contentList + taskId
    | client polls GET /api/parse-pdf/progress?taskId=...
    |
    | client uploadBytes -> Firebase Storage course-layouts/{uid}/{uuid}.json
    | POST /api/extract-facts runs for Flash Facts UI
    v
POST /api/generate-course
    |
    | Stage 1 Planner through GenerateCourseUseCase
    | ChainAiAdapter prefers configured providers from di/ai.di.ts
    | lessons are normalized with deterministic Lesson.knowledge KC metadata
    | cache: course_cache/{hash}
    |
    | if cached outline is legacy string[]:
    |   client retries with force:true to regenerate OutlinePoint[]
    v
POST /api/generate-content
    |
    | Stage 2 Generator per chapter
    | input = chapter outline + raw_context extracted from contentList
    | input also carries Lesson.knowledge; concept cards get kc_id/module_id attached post-generation
    | large chapter input is split/merged by stage2-chunking.ts
    | cache: course_cache/{hash}/chapters/{i}
    |
    | citation markers are validated against contentList chunk IDs
    v
Save partial/full course to Firestore courses/{id}
    |
    | after full course content is available:
    | build one diagnostic chunk per lesson id ("ci-li") with trusted kc_id/module_id metadata
    | fire-and-forget POST /api/diagnostic-quiz with { chunks }
    | localStorage diagnosticQuestions_{id}
    v
status = done
```

### Parse details

`MineruParserAdapter`:

- Uploads/uses a public temporary PDF URL for MinerU.
- Polls MinerU `/extract/task/{taskId}` until `done`.
- Downloads the result zip and reads `content_list.json` or `_content_list_v2.json`.
- Converts `contentList` to markdown via `content-list-converter.ts`.
- For PDFs over 200 pages, splits pages into ranges with 3-page overlap, parses sequentially, then merges while removing overlapped duplicate signatures.

### Cache layers

| Collection/path | Key | Content | Bypass |
| :--- | :--- | :--- | :--- |
| `course_cache/{hash}` | markdown content hash | Stage 1 `Course` JSON | `force:true`, used when legacy `string[]` outline is detected |
| `course_cache/{hash}/chapters/{i}` | chapter index | Stage 2 `ChapterContent` | skipped when chapter outline is legacy |
| `courses/{id}` | Firestore doc ID | SavedCourse, content hash, PDF/layout storage refs | n/a |

### Storage paths

| Path | Content | Used by |
| :--- | :--- | :--- |
| `course-pdfs/{uid}/{uuid}.pdf` | Original PDF | `/api/pdf-serve`, source panel |
| `course-layouts/{uid}/{uuid}.json` | MinerU contentList/layout JSON | `/api/layout-serve`, `PdfPanel` highlight |
| `uploads/mineru-chunks/...pdf` | Temporary chunk PDFs for large docs | MinerU chunk parse; deleted after merge |

---

## Generation Context State

`web/lib/contexts/generation-context.tsx`

```text
idle -> parsing -> generating -> done
```

Important state:

| State | Meaning |
| :--- | :--- |
| `rawMarkdown` | Parsed markdown from MinerU/contentList |
| `course` | Stage 1 Course outline |
| `courseContentMap` | Stage 2 chapters keyed by chapter index |
| `stage2Loading` / `stage2Errors` | Per-chapter generation status |
| `savedCourseId` | Firestore course id after first save |
| `diagnosticStatus` | idle/loading/done/error for prefetch |
| `parseProgress` | current chunk, total chunks, percent complete |
| `pdfLocalPath` | browser blob URL for same-session preview |

Main branches inside `startGeneration()`:

| Branch | Condition | Action |
| :--- | :--- | :--- |
| Existing saved course | local course with same hash/title exists and API returns it with content | restore `courseContentMap`, validate cached diagnostic coverage, prefetch diagnostic if needed, mark done |
| Full cache | Stage 1 response has `fromCache` and cached `courseContent.chapters`, non-legacy outline | save cached full course to user library, prefetch lesson-scoped diagnostic, mark done |
| Cache fallback | Stage 1 cache exists but no full content or legacy outline | regenerate Stage 2 chapters |
| Fresh | no Stage 1 cache | generate Stage 2 chapters, save first chapter then update incrementally, prefetch diagnostic after the loop |

`runDiagnosticPrefetch(courseId, chunks)`:

- Sets `diagnosticStatus = 'loading'`.
- POSTs to `/api/diagnostic-quiz`.
- Input chunks are built by `lib/diagnostic-chunks.ts`; each lesson becomes `{ id: "ci-li", text, kc_id, kc_name, module_id, module_name }`. Text is truncated to 400 characters per chunk to keep prompt size manageable for large courses.
- AI adapter formatting adds `[[KC_ID: ...]]` and module markers next to each `[[SOURCE_CHUNK_ID: ...]]`.
- `GenerateDiagnosticQuizUseCase` normalizes `source_chunk_id` and overwrites quiz KC metadata from the trusted chunk map.
- Inline source citations like `[chunk-X-Y]` are stripped from chunk text before diagnostic generation.
- On success stores `diagnosticQuestions_{id}` in `localStorage` if at least one question is returned (`diagnosticQuestionsAreValid`). Partial coverage is accepted - lessons without a question simply remain grey in CourseTree.
- On failure or empty response sets `diagnosticStatus = 'error'`.

---

## UI State

### Home and generation screen

`web/app/page.tsx` owns the main shell:

- Shows login/library/upload when `status === 'idle'`.
- Shows parse loading screen while `status === 'parsing'`.
- Shows `GenerationScreen` while `status === 'generating' || status === 'done'`.
- Refreshes library when generation resets from a non-idle state back to `idle`.
- De-duplicates library courses by `contentHash`, then title fallback.

`PipelineTracker` displays:

| Step | Active/done source |
| :--- | :--- |
| Read PDF | active during parse, done when `rawMarkdown` exists |
| Analyze structure | Stage 1 course resolve |
| Create concept cards | `courseContentMap` count vs chapter count |
| Create diagnostic quiz | `diagnosticStatus` loading/done/error |

### CourseFlow

`web/app/course/[id]/page.tsx` loads the saved course and progress map, then renders `CourseFlow`.

`CourseFlow` states:

```text
init
  -> diagnostic-intro
  -> diagnostic-loading
  -> diagnostic-quiz
  -> diagnostic-error
  -> course-tree
```

Rules:

- `justGenerated_{id}` is consumed on first mount and still routes through `diagnostic-intro`.
- `diagnosticDone_{id}` skips the intro and restores `diagnosticResults_{id}` when present.
- Cached `diagnosticQuestions_{id}` are consumed if they are non-empty (`diagnosticQuestionsAreValid`). Strict full-coverage is no longer required - a partial quiz is usable.
- Stale `diagnosticResults_{id}` are discarded only when none of the result keys match any current lesson id (`diagnosticResultsAreRelevant`). Partial results from large-course diagnostics are preserved.
- Stale `diagnosticQuestions_{id}` using the legacy `legacy-full` id (no valid lesson keys) are discarded and regenerated.
- `diagnostic-error` gives retry/skip instead of silently skipping.
- On diagnostic completion, `DiagnosticResults` posts KC-tagged interactions to `/api/ukt/interactions`; local coloring continues even if UKT is unavailable.

LocalStorage keys:

| Key | Purpose |
| :--- | :--- |
| `justGenerated_{id}` | Course was just generated |
| `diagnosticDone_{id}` | Diagnostic was completed or skipped |
| `diagnosticResults_{id}` | Result map used to color lesson nodes |
| `diagnosticQuestions_{id}` | Prefetched diagnostic questions |

### CourseTree

`CourseTree` is the course viewer:

- Left pane: fixed 300px chapter/lesson/card tree.
- Right pane: card detail area.
- Detail tabs: `EditMode` and `StudyMode`.
- Header CTA: review due cards starts a study overlay for all due cards.
- Keyboard navigation: left/right arrows move between cards when not typing.

Mastery priority in `lessonMastery()`:

1. SRS entry newer than `course.createdAt`:
   - `REVIEW` and not due -> 100
   - due -> 10
   - otherwise -> 30
2. Diagnostic result `diagnosticState["ci-li"]`
3. `null` -> untested/grey

---

## SRS Review

`StudyMode` submits ratings to `/api/progress/review`.

The request includes `kcId` and `moduleId` from the concept card when available. `ReviewCardUseCase` stores `kcId/moduleId` on `CardProgress`, keeps `topic` as a legacy alias, and calls UKT `/update` with `kc_id = kcId`.

| Rating | Label | Interval intent | Key |
| :--- | :--- | :--- | :--- |
| 0 | Again / khong nho | 1 minute | `1` |
| 1 | Hard / lo mo | 10 minutes | `2` |
| 2 | Good / nho roi | 1 day | `3` |
| 3 | Easy / qua de | 4 days | `4` |

`Space` reveals answer.

---

## Citation Markers

Current chunk ID format:

```text
chunk-{sourceChunkIndex}-{page_idx}-{flat_array_index}
```

Legacy chunk ID format:

```text
chunk-{page_idx}-{flat_array_index}
```

Flow:

1. `content-list-converter.ts` injects `<a id="chunk-...">` anchors into markdown.
2. Stage 1 Planner outputs `OutlinePoint.chunks[]`.
3. Stage 2 adds inline markers like `[chunk-0-5-123]` to `answer` and `detail`.
4. `validateCitationMarkers()` warns when generated markers are not in `buildValidChunkIds(contentList)`.
5. `parseCitations()` converts text to `Segment[]`.
6. `EditMode` renders valid markers as clickable citation numbers.
7. `PdfPanel` loads layout JSON and scrolls/highlights source chunks.

`buildValidChunkIds(contentList)`:

- Items with `sourceChunkIndex` produce 3-number IDs.
- Items without `sourceChunkIndex` produce both default `chunk-0-{page_idx}-{index}` and legacy `chunk-{page_idx}-{index}` for backward compatibility.

`PdfPanel` scroll logic uses the last numeric segment (`flat_array_index`) so it works with both formats.

---

## Auth, Security, and Rate Limit

- Firebase Auth uses Google sign-in on the client.
- Server APIs use HttpOnly session cookies.
- `withAuth` protects user APIs.
- `withAdminAuth` protects admin routes.
- `withApiLogging` wraps APIs for structured logging/usage.
- `/api/generate-course` checks Redis-backed rate limit when `rateLimiter` is configured.
- Admin role is managed with Firebase Custom Claims via `scripts/promote-admin.ts`.

---

## Observability

Web app:

- `/api/metrics` exposes Prometheus metrics.
- `prometheus.adapter.ts` records latency, usage and health metrics.
- `pino-logger.adapter.ts` provides structured logs.
- `firestore-usage.adapter.ts` persists usage data.
- `webhook-alert.adapter.ts` sends Discord alerts for notable events.

Monitoring stack:

- Prometheus scrapes metrics.
- Grafana dashboards live under `monitoring/grafana/provisioning`.
- Loki stores logs.
- Jaeger receives traces through OpenTelemetry Collector.
- Alertmanager sends alerts.

---

## CI/CD

GitHub Actions workflow:

```
.github/workflows/cicd.yml
```

Current workflow runs on pushes to `main` and ignores `monitoring/**`. It uses path filters:

- `web/**` changes run Node 20 install, typecheck, lint, smoke tests, unit tests, then Railway deploy for the web service.
- `UKT/**` changes run Python 3.11 setup, Ruff, pytest, then Railway deploy for the UKT service.

Local commands from `web/`:

```bash
npm run lint
npm run test
npm run build
```

Docker Compose from repo root:

```bash
docker-compose up --build
```

Ports in local Docker:

| Service | Port |
| :--- | :--- |
| Web | `http://localhost:3002` |
| UKT | `http://localhost:8000` |
| Grafana | `http://localhost:3001` |
| Prometheus | `http://localhost:9090` |
| Jaeger | `http://localhost:16686` |
| Loki | `http://localhost:3101` |
| Alertmanager | `http://localhost:9093` |
