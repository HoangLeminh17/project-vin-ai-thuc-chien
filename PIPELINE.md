# PIPELINE.md - Bản đồ tệp & luồng dữ liệu

Tài liệu tham khảo nhanh cho Synapsy: cấu trúc repo, API routes, các kiểu dữ liệu chính (key types), luồng AI pipeline, trạng thái UI và hệ thống giám sát hiện tại.

---

## Cấu trúc Repo (Repo shape)

Repo hiện tại là một monorepo nhỏ:

```
.
  web/                  # Ứng dụng Next.js chính
  UKT/                  # Microservice Knowledge Tracing (Python)
  monitoring/           # Cấu hình Prometheus, Grafana, Loki, Jaeger, Alertmanager, OTel
  .github/workflows/    # Quy trình CI/CD
  README.md
  ARCHITECTURE.md
  CLAUDE.md
  CONVENTIONS.md
  WORKLOG.md
  JOURNAL.md
```

> **Lưu ý**: Các đường dẫn trong tài liệu này mặc định tính từ gốc repo. Mã nguồn ứng dụng nằm trong `web/`, không nằm trực tiếp ở root.

---

## File Map

### Web App (`web/`)

```
web/
  app/
    page.tsx                         # v2 shell: TopBar + NavRail + DocDrawer + tab panels (KHO/THƯ VIỆN/SRS)
    dashboard/page.tsx               # redirect ve /
    course/[id]/page.tsx             # load SavedCourse + ProgressMap, render CourseFlow (?tab=edit|study)
    course/[id]/diagnostic/page.tsx  # diagnostic route cu/bo tro
    review/page.tsx                  # SRS global review (all due cards)
    admin/monitor/page.tsx           # admin logs/usage/metrics UI
    api/                             # Next.js App Router API routes
    components/
      shell/
        NavRail.tsx                  # 60px left rail: KHO / THƯ VIỆN / SRS tabs
        DocDrawer.tsx                # 258px folder tree: real courses + mock fallback + delete
        index.ts
      dashboard/
        DashboardView.tsx            # (legacy wrapper, replaced by inline panels in page.tsx)
        GenerationScreen.tsx         # full-page generation progress + Flash Facts
        LoadingScreen.tsx            # parsing/planning spinner
        ErrorScreen.tsx              # generation error with retry
        HeroSection / DashboardStats / HeatmapSection / PipelineTracker / CourseLibrary
      course/
        CourseFlow.tsx               # layout wrapper, passes preferredDetailTab
        CourseTree.tsx               # master-detail: chapter tree + edit/study pane
        StudyMode.tsx                # flashcard overlay (SM2 rating buttons)
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

`/predict` seed hoặc refresh KC state từ quiz interactions. `/update` cũng khởi tạo state còn thiếu để user chỉ dùng SRS vẫn có tín hiệu UKT sau khi bỏ qua diagnostic. `/state/{student_id}` trả persisted KC state để dashboard aggregate.

### Hệ thống giám sát (Monitoring)

```
monitoring/
  prometheus/
    prometheus.yml
    rules/
  grafana/
    provisioning/
  otel-collector/
  alertmanager/
  bridge/               # Discord Bridge cho Alertmanager
```

Docker Compose khởi động Redis, UKT, Web, Prometheus, Grafana, OpenTelemetry Collector, Jaeger, Loki và Alertmanager. Toàn bộ hệ thống được instrument để hỗ trợ **Distributed Tracing** qua OTel.

---

## API Routes

### Xác thực (Auth)

| Phương thức | Route | Tệp | Ghi chú |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/login` | `web/app/api/auth/login/route.ts` | Tạo Firebase session cookie |
| POST | `/api/auth/logout` | `web/app/api/auth/logout/route.ts` | Xóa session |
| GET | `/api/auth/me` | `web/app/api/auth/me/route.ts` | Trả về thông tin user hiện tại |

### Tạo khóa học (Course generation)

| Phương thức | Route | Tệp | Ghi chú |
| :--- | :--- | :--- | :--- |
| POST | `/api/parse-pdf` | `web/app/api/parse-pdf/route.ts` | Xác thực, PDF <= 20 MB, gọi MinerU parse |
| GET | `/api/parse-pdf/progress` | `web/app/api/parse-pdf/progress/route.ts` | Kiểm tra tiến độ parse theo `taskId` |
| POST | `/api/generate-course` | `web/app/api/generate-course/route.ts` | Stage 1 planner, giới hạn tần suất, cache theo hash markdown |
| POST | `/api/generate-content` | `web/app/api/generate-content/route.ts` | Stage 2 sinh concept cards + chapter quiz |
| POST | `/api/extract-facts` | `web/app/api/extract-facts/route.ts` | Trích xuất sự thật nhanh cho Flash Facts UI |
| POST | `/api/diagnostic-quiz` | `web/app/api/diagnostic-quiz/route.ts` | Tạo câu hỏi trắc nghiệm chẩn đoán |

### Lưu trữ khóa học & Nguồn tài liệu

| Phương thức | Route | Tệp | Ghi chú |
| :--- | :--- | :--- | :--- |
| GET | `/api/courses` | `web/app/api/courses/route.ts` | Liệt kê các khóa học của user hiện tại |
| GET | `/api/courses/[id]` | `web/app/api/courses/[id]/route.ts` | Lấy chi tiết một khóa học |
| PATCH/DELETE | `/api/courses/[id]` | `web/app/api/courses/[id]/route.ts` | Cập nhật hoặc xóa khóa học đã lưu |
| GET | `/api/pdf-serve` | `web/app/api/pdf-serve/route.ts` | Proxy qua Admin SDK để lấy bytes PDF |
| GET | `/api/pdf-source` | `web/app/api/pdf-source/route.ts` | Route hỗ trợ lấy nguồn PDF |
| GET | `/api/layout-serve` | `web/app/api/layout-serve/route.ts` | Proxy lấy tệp layout JSON từ MinerU |

### Tiến độ & Ôn tập (Progress & Review)

| Phương thức | Route | Tệp | Ghi chú |
| :--- | :--- | :--- | :--- |
| GET | `/api/progress/map` | `web/app/api/progress/map/route.ts` | Tiến độ SRS theo khóa `ci-li` |
| GET | `/api/progress/stats` | `web/app/api/progress/stats/route.ts` | Thống kê Anki-style (new/learning/due/streak/totalCards). Optional `?courseId=` để giới hạn theo deck |
| GET | `/api/progress/due` | `web/app/api/progress/due/route.ts` | Danh sách thẻ đến hạn ôn tập |
| POST | `/api/progress/review` | `web/app/api/progress/review/route.ts` | Gửi đánh giá SM2 |
| POST | `/api/ukt/interactions` | `web/app/api/ukt/interactions/route.ts` | Cung cấp tín hiệu chẩn đoán gắn KC cho UKT |
| GET | `/api/ukt/mastery` | `web/app/api/ukt/mastery/route.ts` | Lấy trạng thái UKT và tổng hợp theo 8 module |

### Quản trị & Sức khỏe (Admin & Health)

| Phương thức | Route | Tệp | Ghi chú |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/logs` | `web/app/api/admin/logs/route.ts` | Logs cho Admin |
| GET | `/api/admin/usage` | `web/app/api/admin/usage/route.ts` | Thống kê sử dụng AI cho Admin |
| GET | `/api/metrics` | `web/app/api/metrics/route.ts` | Prometheus metrics |
| GET | `/api/health` | `web/app/api/health/route.ts` | Kiểm tra sức khỏe hệ thống |

---

## Trang giao diện (Pages)

| Đường dẫn | Tệp | Ghi chú |
| :--- | :--- | :--- |
| `/` | `web/app/page.tsx` | v2 shell: TopBar 44px + NavRail 60px + DocDrawer 258px + tab panels (KHO / THƯ VIỆN / SRS) |
| `/dashboard` | `web/app/dashboard/page.tsx` | Redirect về `/` |
| `/course/[id]` | `web/app/course/[id]/page.tsx` | Xem/chỉnh sửa khóa học; `?tab=edit` → mở edit panel, `?tab=study` → mở flashcard |
| `/course/[id]/diagnostic` | `web/app/course/[id]/diagnostic/page.tsx` | Trang chẩn đoán kiến thức |
| `/review` | `web/app/review/page.tsx` | Ôn tập SRS toàn bộ thẻ đến hạn (global, không theo khóa) |
| `/admin/monitor` | `web/app/admin/monitor/page.tsx` | Màn hình giám sát cho Admin |

---

## Các kiểu dữ liệu chính (Key Types)

Các model học tập chính (Canonical learning models) nằm ở `web/core/models/learning-model.ts`. Tệp `web/lib/types.ts` hiện vẫn giữ một bản tương đương để duy trì tính tương thích với mã nguồn cũ.

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
  answer: string              // canonical source-backed answer, used by edit UI + SRS input
  detail?: string             // legacy only; new Stage 2 no longer generates it
  followUps: string[]         // lightweight AI tutor prompts, not citation/scoring truth
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_start?: string
  source_chunk_end?: string
  source_chunk_id?: string      // legacy
  sourceExcerpt?: string        // legacy
}

type LessonContent = {
  lesson_title: string
  concept?: ConceptCard       // legacy / first-card compatibility surface
  cards?: ConceptCard[]       // new Stage 2 output: usually 2-3 atomic cards per lesson
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

type ModuleMasteryPoint = {
  module_id: string
  module_name: string
  score: number | null  // trung bình UKT p_correct của các KC trong module
  percent: number | null
  uncertainty: number | null       // trung bình UKT sigma của các KC trong module
  certaintyPercent: number | null  // 1 - uncertainty, hiển thị ở dashboard
  evidenceCount: number
  kcIds: string[]
}
```

Generation state:

```ts
type GenerationStatus = 'idle' | 'parsing' | 'generating' | 'done'
type DiagnosticStatus = 'idle' | 'loading' | 'done' | 'error'
```

---

## Thành phần kiến thức (Knowledge Components - KC)

Định danh KC hiện tại là cố định (deterministic) và được hỗ trợ bởi một registry y khoa, giúp UKT có thể truy vết mức độ thông thạo xuyên suốt các phiên học và các tài liệu khác nhau.

### Nguồn chân lý (Source of truth):

- `web/core/models/knowledge.ts`
- `KNOWLEDGE_MAP_VERSION = medical-v1`
- Fixed spider chart modules: Giải phẫu, Sinh lý, Dược lý, Vi sinh, Bệnh lý, Lâm sàng, Hóa sinh, Miễn dịch (registry id vẫn dùng English slugs).
- Each KC has stable `kc_id`, display `kc_name`, and parent `module_id`.

### Quy tắc (Rules):

- **Stage 1 Planner**: Phải phân loại từng bài học (lesson) vào `Lesson.knowledge`.
- Planner chỉ được chọn `kc_id` từ registry cố định, không được tự tạo ID tự do.
- Hàm `normalizeCourseKnowledge()` ở server-side sẽ xác thực đầu ra của LLM và tự động chuyển về `{module}.general` hoặc `clinical.general` nếu cần.
- **Stage 2**: Không sở hữu định danh KC. Nó nhận `knowledge` đầu vào và hàm `attachChunkRange()` sẽ gắn `kc_id/module_id` vào các concept cards được tạo ra.
- **Câu hỏi chẩn đoán**: Sao chép metadata KC từ các đoạn bài học, sau đó `GenerateDiagnosticQuizUseCase` sẽ ghi đè metadata từ bản đồ chunk đáng tin cậy.
- **UKT**: Nhận `kc_id` trực tiếp, không dùng `topic` tự do.

### Ý nghĩa của Spider Chart:

- Trục (Axis) = `module_id` từ danh sách module cố định.
- `aggregateModuleMastery()` luôn trả về đúng 8 trục theo thứ tự trong `MEDICAL_MODULES`.
- Điểm số trên mỗi trục tổng hợp từ `p_correct` của các KC thuộc module đó, fallback sang `mu` nếu thiếu `p_correct`.
- Độ không chắc chắn (Uncertainty) tổng hợp từ `sigma` của UKT; UI vẽ thành dải mềm trên spider chart và hiển thị phần trăm độ chắc chắn (`1 - sigma`) trong danh sách bên cạnh.
- Module chưa có dữ liệu sẽ hiển thị ở trạng thái "no-data", không coi là đã thông thạo 0%.
- Cả Diagnostic và SRS đều gửi tín hiệu vào cùng một namespace KC.
- Dashboard chính đọc trạng thái UKT bền vững qua `/api/ukt/mastery`, biến chart thành bề mặt cá nhân hóa lâu dài cho người dùng.

---

## Luồng tạo khóa học (Course Generation Flow)

### Quy trình tổng quát (High-level pipeline)

```
Người dùng chọn PDF
    |
    | Client upload thẳng lên Firebase Storage: course-pdfs/{uid}/{uuid}.pdf
    v
POST /api/parse-pdf
    |
    | ParseDocumentUseCase -> MineruParserAdapter
    | - PDF <= 200 trang: xử lý trong 1 task MinerU
    | - PDF > 200 trang: chia nhỏ thành các đoạn 200 trang (overlap 3 trang)
    | - Gộp contentList, khử trùng lặp đoạn overlap, gắn sourceChunkIndex
    |
    | Trả về markdown + contentList + taskId
    | Client poll GET /api/parse-pdf/progress?taskId=...
    |
    | Client upload layout JSON lên Firebase Storage: course-layouts/{uid}/{uuid}.json
    | POST /api/extract-facts chạy song song cho Flash Facts UI
    v
POST /api/generate-course
    |
    | Stage 1 Planner qua GenerateCourseUseCase
    | ChainAiAdapter ưu tiên các provider được cấu hình trong di/ai.di.ts
    | Các bài học được chuẩn hóa với metadata KC cố định (medical-v1)
    | Cache: course_cache/{hash}
    |
    | Nếu phát hiện outline cũ (dạng string[]):
    |   Client gọi lại với force:true để tạo mới OutlinePoint[]
    v
POST /api/generate-content
    |
    | Stage 2 Generator per chapter
    | input = chapter outline + raw_context extracted from contentList
    | input also carries Lesson.knowledge; concept cards get kc_id/module_id attached post-generation
    | emits one canonical source-backed answer + followUps; detail is legacy only
    | large chapter input is split/merged by stage2-chunking.ts
    | cache: course_cache/{hash}/chapters/{i}
    |
    | Xác thực trích dẫn (citation markers) đối chiếu với ID chunk trong contentList
    v
Lưu khóa học (từng phần hoặc toàn bộ) vào Firestore: courses/{id}
    |
    | Sau khi có đầy đủ nội dung khóa học:
    | Xây dựng chunk chẩn đoán cho mỗi lesson id ("ci-li") từ outline + canonical answer
    | Fire-and-forget POST /api/diagnostic-quiz với { chunks }
    | Lưu localStorage: diagnosticQuestions_{id}
    v
Trạng thái = done
```

### Canonical answer token impact

Stage 2 now keeps `answer` as the only source-backed card response and stops asking the model for `detail`.
Each lesson can contain multiple atomic cards (`cards[]`); `concept` is retained as a first-card compatibility surface for older code/saved courses.
`followUps` stay because they are short tutor prompts and do not muddy citations or active-recall scoring.

Token impact:

- Removing `detail` still avoids a second long answer surface per card.
- Multi-card lessons intentionally spend more completion tokens than the old one-card-per-lesson design because dense lessons now produce 2-3 atomic recall cards.
- Prompt/cache savings still come from keeping `raw_context` chapter-scoped and invalidating stale concept-only cached chapters instead of rerunning Stage 1.

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
| `course_cache/{hash}/chapters/{i}` | chapter index | Stage 2 `ChapterContent` | skipped when chapter outline is legacy, cached card content still has legacy `detail`, or cached content is concept-only without `cards[]` |
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
| Cache fallback | Stage 1 cache exists but no full content or legacy outline | regenerate all Stage 2 chapters in parallel (Promise.all), validate citations, save once, prefetch diagnostic |
| Fresh | no Stage 1 cache | generate all Stage 2 chapters in parallel (Promise.all), validate citations, save full course once, prefetch diagnostic |

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
- Với user đã đăng nhập, fetch `/api/ukt/mastery` và render spider chart UKT 8 trục trên main page trước activity heatmap. Khi UKT chưa có state, chart vẫn hiện đủ axis ở trạng thái no-data.

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
- On diagnostic completion, `DiagnosticResults` posts KC-tagged interactions to `/api/ukt/interactions`, receives UKT `knowledge_state`, aggregates it into the 8-module spider chart, and local coloring continues even if UKT is unavailable.

LocalStorage keys:

| Key | Purpose |
| :--- | :--- |
| `justGenerated_{id}` | Course was just generated |
| `diagnosticDone_{id}` | Diagnostic was completed or skipped |
| `diagnosticResults_{id}` | Result map used to color lesson nodes |
| `diagnosticQuestions_{id}` | Prefetched diagnostic questions |

### CourseTree

`CourseTree` is the course viewer:

- Left pane: fixed 300px chapter/card tree. Clicking a chapter opens all lesson labels and their concept cards; lesson rows are grouping labels, not a second accordion.
- Right pane: card editor/detail area.
- Detail tabs: `EditMode` and `StudyMode`.
- Header CTA: review due cards starts a study overlay for all due cards.
- Keyboard navigation: left/right arrows move between cards when not typing.

Thứ tự ưu tiên mức nắm vững trong `lessonMastery()`:

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
UKT `/update` initializes missing student state, so SRS-only users can still build dashboard module mastery even if they skipped diagnostics.

| Rating | Label | Interval intent | Key |
| :--- | :--- | :--- | :--- |
| 0 | Again / khong nho | 1 minute | `1` |
| 1 | Hard / lo mo | 10 minutes | `2` |
| 2 | Good / nho roi | 1 day | `3` |
| 3 | Easy / qua de | 4 days | `4` |

`Space` reveals the canonical `answer` as `Câu trả lời`; legacy `detail` is not shown in the SRS reveal surface.

### SM2 status mapping (Anki-style)

Bộ SM2 ở `core/utils/sm2.ts` không có sub-day learning steps, nên `status` chỉ mang 2 nghĩa thực tế trên DB:

- `LEARNING` — chỉ được set khi rating = Again (re-learning sau khi lapse). Interval reset về 1 ngày, `repetitions=0`.
- `REVIEW` — set cho mọi rating non-Again (Hard/Good/Easy), bất kể interval. Card "graduate" ngay khỏi pha learning.
- `NEW` — chỉ tồn tại trên `initializeProgress()` trong-memory; không bao giờ persist vì `calculateNextProgress()` luôn ghi đè trước khi save.

### Card buckets hiển thị trên UI

| Bucket | Định nghĩa | Nguồn |
| :--- | :--- | :--- |
| Mới (`new`) | Card thuộc một saved course nhưng chưa có doc trong `user_progress` | `totalCards − reviewedDocs` |
| Đang học (`learning`) | Card có `status='LEARNING'` (vừa Again) | `count(status='LEARNING')` |
| Đến hạn (`due`) | Card có `nextReviewDate <= now` | `count(nextReviewDate<=now)` |
| Thuộc (`mature`) | Card `status='REVIEW'` và chưa đến hạn | Tính client-side trong CourseTree |

`GetSRSStatsUseCase` join `IProgressRepository.getStats()` với `ICourseRepository.listByUser()` để tổng hợp `totalCards` từ field `SavedCourse.totalCardCount` (cache khi save/update; backfill khi đọc nếu thiếu). Nhận optional `courseId` để giới hạn về một deck duy nhất.

`SRSStatsWidget` (home) gọi `/api/progress/stats` (global). `CourseTree` header tính buckets client-side từ `progressMap` đã fetch sẵn, không gọi thêm API.

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
3. Stage 2 adds inline markers like `[chunk-0-5-123]` to the canonical `answer`.
4. `validateCitationMarkers()` warns when generated answer markers are not in `buildValidChunkIds(contentList)`.
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

## Quan sát & Giám sát hệ thống (Observability)

### Web App:
- `/api/metrics`: Cung cấp metrics định dạng Prometheus.
- `prometheus.adapter.ts`: Ghi lại latency, mức sử dụng token và các chỉ số sức khỏe.
- `pino-logger.adapter.ts`: Cung cấp logs có cấu trúc, gửi sang Loki qua OTel.
- `instrumentation.ts`: Tự động gửi traces sang OpenTelemetry Collector.
- `webhook-alert.adapter.ts`: Gửi cảnh báo Discord cho các sự kiện quan trọng.

### Monitoring Stack:
- **Prometheus**: Thu thập (scrape) metrics từ Web và OTel Collector.
- **Grafana**: Hiển thị dashboard (cấu hình tại `monitoring/grafana/provisioning`).
- **Loki**: Lưu trữ logs tập trung.
- **Jaeger**: Tiếp nhận và hiển thị traces thông qua OTel Collector.
- **Alertmanager**: Quản lý và gửi cảnh báo.
- **OTel Collector**: Trạm trung chuyển trace/metrics/logs giữa ứng dụng và các backend giám sát.

---

## Quy trình CI/CD

Workflow trên GitHub Actions:

```
.github/workflows/cicd.yml
```

Quy trình hiện tại sẽ chạy khi có lệnh push vào nhánh `main` (bỏ qua các thay đổi trong `monitoring/**`). Sử dụng bộ lọc đường dẫn:

- Thay đổi trong `web/**`: Chạy cài đặt Node 20, kiểm tra kiểu (typecheck), lint, smoke tests, unit tests, sau đó deploy lên Railway cho service `web`.
- Thay đổi trong `UKT/**`: Chạy thiết lập Python 3.11, Ruff, pytest, sau đó deploy lên Railway cho service `ukt-service`.

Các lệnh chạy local từ thư mục `web/`:

```bash
npm run lint
npm run test
npm run build
```

Docker Compose từ gốc repo:

```bash
docker-compose up --build
```

`docker-compose.yml` ở root mặc định cấu hình `REDIS_URL=redis://redis:6379` cho cả Web và UKT nếu `.env` không ghi đè. Redis đã bật AOF và sử dụng volume định danh `redis-data`, giúp trạng thái thông thạo (mastery) của UKT local bền vững qua các lần khởi động lại container.

Các cổng (ports) trong Docker local:

| Dịch vụ | Cổng |
| :--- | :--- |
| Web | `http://localhost:3002` |
| UKT | `http://localhost:8000` |
| Grafana | `http://localhost:3001` |
| Prometheus | `http://localhost:9090` |
| Jaeger | `http://localhost:16686` |
| Loki | `http://localhost:3101` |
| Alertmanager | `http://localhost:9093` |
