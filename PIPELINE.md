# PIPELINE.md — File Map & Luồng dữ liệu

Tài liệu tham chiếu nhanh cho toàn bộ dự án: file map, key types, và trạng thái UI.

---

## File Map

### Core

```
core/
  ports/                        ← interfaces
  use-cases/                    ← business logic
  errors/                       ← domain exceptions
  models/
    learning-model.ts
    saved-course.ts
```

### Infrastructure

```
infrastructure/
  di.ts
  registry.ts                   ← re-exports all di/* for non-DI routes
  adapters/
    content-list-converter.ts   ← contentListToMarkdown() + chunk anchor injection
    fallback-ai.adapter.ts      ← ChainAiAdapter (Gemini → OpenAI fallback)
    firebase-auth.adapter.ts
    firebase-storage.adapter.ts
    firestore-course.adapter.ts
    gemini.adapter.ts
    huggingface.adapter.ts
    mineru-parser.adapter.ts
    openai.adapter.ts
    redis-ratelimit.adapter.ts  ← RedisRateLimitAdapter (REDIS_URL)
    ukt-service.adapter.ts
```

### API Routes

```
POST /api/auth/login            → app/api/auth/login/route.ts
POST /api/auth/logout           → app/api/auth/logout/route.ts
POST /api/parse-pdf             → app/api/parse-pdf/route.ts
POST /api/generate-course       → app/api/generate-course/route.ts  (force:true = bypass Stage 1 cache)
POST /api/generate-content      → app/api/generate-content/route.ts (skips Stage 2 cache for legacy outlines)
POST /api/extract-facts         → app/api/extract-facts/route.ts
POST /api/diagnostic-quiz       → app/api/diagnostic-quiz/route.ts
POST /api/progress/review       → app/api/progress/review/route.ts
GET  /api/courses               → app/api/courses/route.ts
GET  /api/courses/[id]          → app/api/courses/[id]/route.ts
GET  /api/progress/map          → app/api/progress/map/route.ts
GET  /api/progress/stats        → app/api/progress/stats/route.ts
GET  /api/progress/due          → app/api/progress/due/route.ts
GET  /api/pdf-serve             → app/api/pdf-serve/route.ts        (Admin SDK proxy → PDF bytes)
GET  /api/layout-serve          → app/api/layout-serve/route.ts     (Admin SDK proxy → layout JSON)
GET  /api/metrics               → app/api/metrics/route.ts          (Prometheus metrics)
GET  /api/admin/logs            → app/api/admin/logs/route.ts
```

### Pages

```
/                               → app/page.tsx           (home + library + generation)
/course/[id]                    → app/course/[id]/page.tsx
/review                         → app/review/page.tsx
/admin/monitor                  → app/admin/monitor/page.tsx
```

### Components

```
app/components/
  synapsy/                      ← design system (tokens + primitives)
    index.ts                    ← T (design tokens)
    SynapsyLogo, SynapsyRing, GeoDecoration, StateChip
  Spinner.tsx
  FlashFactGallery.tsx

  course/                       ← CourseFlow orchestrates views bên dưới
    CourseFlow.tsx              ← state machine (init → diagnostic → course-tree)
    CourseTree.tsx              ← master-detail: tree nav (trái 300px) + card detail pane (phải)
    StudyMode.tsx               ← SRS study deck; citations display-only (no click)
    EditMode.tsx                ← card detail; clickable [N] citation markers → PdfPanel
    PdfPanel.tsx                ← layout JSON viewer; highlight + scroll to source chunk

  diagnostic/
    DiagnosticIntro.tsx
    DiagnosticQuiz.tsx
    DiagnosticResults.tsx
```

### Lib

```
lib/
  types.ts                      ← OutlinePoint, isLegacyOutline, Course, Lesson, ConceptCard...
  ai.ts                         ← generateChapterContent (normalises legacy outlines)
  prompts.ts                    ← PLANNER_PROMPT (OutlinePoint schema), STAGE2_CHAPTER_PROMPT (citation rules)
  citations.ts                  ← parseCitations() → Segment[] (text | cite)
  citation-utils.ts             ← buildValidChunkIds(), validateCitationMarkers()
  contexts/
    generation-context.tsx      ← startGeneration, fetchChapter, diagnosticStatus
  hooks/
    use-courses.ts
```

---

## Key Types

```ts
// Course structure
type Course = {
  id: string
  title: string
  chapters: Chapter[]
}
type Chapter = {
  title: string
  lessons: Lesson[]
  quiz: { topic: string; questions: QuizQuestion[] }
}

// OutlinePoint — Stage 1 output; carries chunk IDs for Stage 2 to cite
type OutlinePoint = {
  point: string        // factual statement
  chunks: string[]     // 1–3 chunk IDs from source anchors, e.g. ["chunk-0-5", "chunk-0-6"]
}
type Lesson = {
  title: string
  key_concept: string
  outline: OutlinePoint[]    // 4–8 bullets (Stage 1 output, replaces old string[])
  source_chunk_start?: string
  source_chunk_end?: string
}
// isLegacyOutline(outline) — true when outline is the old string[] format (backward compat)

// ConceptCard (active recall) — answer/detail may contain [chunk-X-Y] inline citation markers
type ConceptCard = {
  question: string
  answer: string       // may include markers: "Text.[chunk-0-5] More text.[chunk-1-8]"
  detail?: string
  followUps: string[]
}

// Quiz
type QuizQuestion = {
  question: string
  options: string[]          // 4 options
  answer: number             // correct index 0–3
  explanation: string
  source_chunk_id?: string   // "ci-li" format — khớp lessonMastery() lookup key
}

// SRS Progress  (lib/types.ts)
type ProgressEntry = {
  status: string        // 'NEW' | 'LEARNING' | 'REVIEW'
  isDue: boolean
  lastReviewedAt?: string
}
type ProgressMap = Record<string, ProgressEntry>  // key = "ci-li"

// Diagnostic status
type DiagnosticStatus = 'idle' | 'loading' | 'done' | 'error'
```

---

## Luồng sinh khoá học

### AI Pipeline (2 giai đoạn)

```
Upload PDF
    │
    ├── uploadBytes → Firebase Storage course-pdfs/{uid}/{uuid}.pdf   (pdfStorageUrl)
    │
    ▼
POST /api/parse-pdf              (MinerU Precision API)
    │    → markdown (có <a id="chunk-P-I"> anchors)
    │    → contentList JSON
    │
    ├── uploadBytes → Firebase Storage course-layouts/{uid}/{uuid}.json  (layoutStorageUrl)
    ├── POST /api/extract-facts  (song song, animate Flash Facts)
    │
    ▼
POST /api/generate-course        Stage 1: GPT-4o (Planner)
    │    → Course JSON: chapters[].lessons[].{title, outline: OutlinePoint[]}
    │    → cache vào Firestore `course_cache/{hash}`
    │    ⚠ Nếu cache trả về outline string[] (legacy): tự động gọi lại với force:true
    │      để Stage 1 AI chạy lại → outline mới có chunk IDs
    │
    ▼ (sequential, từng chapter một)
POST /api/generate-content       Stage 2: GPT-4o-mini (Generator)
    │    → ChapterContent: lessons[].concept{answer/detail có [chunk-X-Y] markers} + quiz
    │    → cache vào `course_cache/{hash}/chapters/{i}`
    │      (bỏ qua cache nếu outline chapter là legacy string[])
    │    → partial save vào `courses/` (SavedCourse) sau mỗi chapter
    │
    ├── [sau chapter đầu tiên] POST /api/diagnostic-quiz  (song song, không chặn)
    │    → localStorage `diagnosticQuestions_{id}`
    │
    ▼
setStatus('done')
```

### Caching (2 tầng)

| Collection | Key | Nội dung | Bypass khi |
| :--- | :--- | :--- | :--- |
| `course_cache/{hash}` | content hash của markdown | Course JSON (Stage 1, OutlinePoint[]) | `force:true` — khi cache có legacy `string[]` outline |
| `course_cache/{hash}/chapters/{i}` | chapter index | ChapterContent (Stage 2) | Chapter có `isLegacyOutline` (không có chunk IDs để cite) |
| `courses/{id}` | Firestore doc ID | SavedCourse (full) | — |

**Storage:**

| Path | Nội dung | Dùng để |
| :--- | :--- | :--- |
| `course-pdfs/{uid}/{uuid}.pdf` | File PDF gốc | `/api/pdf-serve` proxy → PDF viewer |
| `course-layouts/{uid}/{uuid}.json` | MinerU contentList JSON | `/api/layout-serve` proxy → PdfPanel source highlight |

### Status machine (`generation-context.tsx`)

```
idle → parsing → generating → done
```

Bốn nhánh trong `startGeneration()`:

| Nhánh | Điều kiện | Hành động |
| :--- | :--- | :--- |
| **existing** | Firestore có course trùng hash + `chapters.length > 0` + API alive | Restore `courseContentMap`, `setStatus('done')` |
| **fromCache + content** | `fromCache: true` + `chapters.length > 0` + `!hasLegacyOutline` | Load map từ cache, saveCourse, runDiagnosticPrefetch, `setStatus('done')` |
| **fromCache fallback** | `fromCache: true` nhưng chapters rỗng hoặc legacy outline | Sequential `fetchChapter` per chapter (Stage 2 regen) |
| **fresh** | Không có cache Stage 1 | Sequential `fetchChapter`, save từng chapter, diagnostic sau chapter đầu |

> **Legacy detection:** `isLegacyOutline(lesson.outline)` = `true` khi outline là `string[]` cũ (trước OutlinePoint schema). Cả Stage 1 và Stage 2 cache đều bị bypass để tái tạo với markers.

`runDiagnosticPrefetch(courseId, rawMarkdown)`:
- Fire-and-forget ngay sau khi chapter đầu tiên save xong (có courseId)
- Set `diagnosticStatus = 'loading'` → PipelineTracker hiện `◉` song song với concept cards
- POST rawMarkdown → `/api/diagnostic-quiz` → `{ quiz: { questions: [] } }`
- Success: lưu `diagnosticQuestions_{id}` vào localStorage, status = `'done'`
- Fail/empty: status = `'error'`

`buildMarkdown` đánh dấu lesson theo `### [ci-li] Tên bài`
→ AI trả `source_chunk_id: "0-2"` khớp với `lessonMastery()` lookup.

**PipelineTracker** — 4 bước hiển thị trên UI (concept cards và diagnostic chạy song song):

| Bước | Active khi | Done khi |
| :--- | :--- | :--- |
| Đọc PDF | parse-pdf đang chạy | `rawMarkdown` có nội dung |
| Phân tích cấu trúc | Stage 1 đang chạy | `course` JSON resolve |
| Tạo concept cards · X/N | Stage 2 đang chạy | tất cả chapter trong `courseContentMap` |
| Tạo bài test trình độ | `diagnosticStatus = 'loading'` (song song!) | `diagnosticStatus = 'done'` hoặc `'error'` |

---

## UI State Machine — CourseFlow

`/course/[id]/page.tsx` load `SavedCourse` → render `<CourseFlow />`.

```
init
  │  (loading guard, chống flicker)
  ▼
diagnostic-intro          ← first visit only; bỏ qua nếu có justGenerated_
  │
  ▼
diagnostic-loading        ← spinner / fetch /api/diagnostic-quiz
  │
  ▼
diagnostic-quiz           ← DiagnosticQuiz (10 câu MCQ)
  │
  ▼
course-tree               ← CourseTree master-detail (self-contained: card selection + study)
```

`CourseTree` quản lý nội bộ: accordion tree nav trái, card detail pane phải (tab Sửa/Học), study overlay khi click "Ôn X thẻ". Không còn trạng thái `lesson` — `CourseFlow` kết thúc tại `course-tree`.

**localStorage flags:**

| Key | Mục đích |
| :--- | :--- |
| `justGenerated_{id}` | Set sau generation; consumed lần mount đầu |
| `diagnosticDone_{id}` | Set sau quiz/skip; ngăn re-trigger |
| `diagnosticResults_{id}` | JSON kết quả quiz → tô màu CourseTree nodes |
| `diagnosticQuestions_{id}` | Pre-cached questions từ prefetch; xoá sau khi load vào state |

---

## Mastery & Màu sắc (CourseTree)

`lessonMastery()` ưu tiên theo thứ tự:

1. **SRS entry** `progressMap["ci-li"].lastReviewedAt >= course.createdAt`
   → 100 (không đến hạn) | 30 (LEARNING) | 10 (đến hạn/Again)
2. **Diagnostic result** `diagnosticState["ci-li"]` (0–100)
3. **null** → grey "Chưa test"

> SRS entry cũ hơn `course.createdAt` bị bỏ qua — tránh ghost data từ khoá học đã xoá/thay thế.

**CourseTree node colors:** red (due/failed) · amber (learning) · green (mastered) · grey (new)

**Layout master-detail:**
- Trái (300px): chapters accordion → lessons accordion → thẻ inline. Click thẻ → hiện detail pane phải.
- Phải (flex-1): tab **Sửa** (`EditMode` không card list) hoặc **Học** (`StudyMode` cho bài đó).
- Header: nút **"Ôn X thẻ"** gom toàn bộ thẻ due thành 1 deck study overlay.

---

## StudyMode

`advance()` sau mỗi rating: submit SRS → show toast → slide out.  
Sau animation: `nextIdx >= total` → gọi `onExit()` (kết thúc deck, không wrap-around).

| Rating | Nhãn | Interval | Phím |
| :--- | :--- | :--- | :--- |
| 0 — Again | "không nhớ" | 1 phút | `1` |
| 1 — Hard | "lờ mờ" | 10 phút | `2` |
| 2 — Good | "nhớ rồi" | 1 ngày | `3` |
| 3 — Easy | "quá dễ" | 4 ngày | `4` |

`Space` = xem đáp án.

---

## Library Refresh

`app/page.tsx` theo dõi generation status qua `useRef(prevStatus)`.  
Khi status chuyển từ bất kỳ non-idle → `'idle'`: tự gọi `refreshCourses()`.  
→ Library cập nhật khoá học mới mà không cần F5.

---

## Citation Markers (NotebookLM-style)

**Chunk ID format (hiện tại):** `chunk-{sourceChunkIndex}-{page_idx}-{flat_array_index}` — 3 số, gán bởi `content-list-converter.ts` khi tạo anchor `<a id="chunk-S-P-I">`. `sourceChunkIndex` mặc định `0` với PDF ≤200 trang; với PDF >200 trang (chunked), mang index chunk MinerU.

> **Legacy format (trước PR #84):** `chunk-{page_idx}-{flat_array_index}` — 2 số. Regex và `buildValidChunkIds` hỗ trợ cả hai format (backward compat).

**Flow:**
1. Stage 1 (Planner): mỗi `OutlinePoint.chunks[]` liệt kê chunk IDs hỗ trợ điểm đó
2. Stage 2 (Generator): nhúng `[chunk-S-P-I]` inline vào `answer`/`detail` sau mỗi câu tuyên bố
3. `validateCitationMarkers()`: sau Stage 2, warn nếu marker không nằm trong `validChunkIds`
4. FE (`parseCitations()`): tách text → `Segment[]` (text | cite); `displayNum` global across toàn khóa học (không reset theo lesson)
5. `CitedText` trong `EditMode`: valid chunk → clickable `[N]` → mở `PdfPanel` scroll đến chunk; invalid → gray `[?]`; no layout loaded → gray `[N]`

**Global citation numbering:**
- `EditMode` nhận `allCards` (toàn khóa học) và `cards` (lesson hiện tại)
- `globalCiteMap` được build từ `allCards` theo thứ tự document → số [1], [2], [3]... tăng liên tục xuyên suốt, không reset khi chuyển lesson
- `CourseTree` truyền `allCards` xuống `EditMode`

**PdfPanel highlight:**
- `chunkStart`/`chunkEnd` từ lesson-level navigation (range highlight)
- `selectedChunkId` từ click marker → override range → highlight single chunk
- Scroll dùng `data-flat-idx` (số cuối của chunk ID) để tìm element — độc lập với format 2 hay 3 số
- `parseGlobalIdx()` extract số cuối của chunk ID (flat array index) — hoạt động cho cả 2 và 3-number format

**`buildValidChunkIds(contentList)`**:
- Items có `sourceChunkIndex`: sinh `chunk-{sourceChunkIndex}-{page_idx}-{index}` (3 số)
- Items không có `sourceChunkIndex`: sinh cả `chunk-0-{page_idx}-{index}` (3 số, default 0) **và** `chunk-{page_idx}-{index}` (2 số backward compat)
