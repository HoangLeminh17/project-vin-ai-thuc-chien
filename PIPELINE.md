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
  adapters/
    firebase-auth.adapter.ts
    firebase-storage.adapter.ts
    firestore-course.adapter.ts
    mineru-parser.adapter.ts
    openai.adapter.ts
    ukt-service.adapter.ts
```

### API Routes

```
POST /api/auth/login            → app/api/auth/login/route.ts
POST /api/auth/logout           → app/api/auth/logout/route.ts
POST /api/parse-pdf             → app/api/parse-pdf/route.ts
POST /api/generate-course       → app/api/generate-course/route.ts
POST /api/generate-content      → app/api/generate-content/route.ts
POST /api/extract-facts         → app/api/extract-facts/route.ts
POST /api/diagnostic-quiz       → app/api/diagnostic-quiz/route.ts
POST /api/progress/review       → app/api/progress/review/route.ts
GET  /api/courses               → app/api/courses/route.ts
GET  /api/courses/[id]          → app/api/courses/[id]/route.ts
GET  /api/progress/map          → app/api/progress/map/route.ts
GET  /api/progress/stats        → app/api/progress/stats/route.ts
GET  /api/progress/due          → app/api/progress/due/route.ts
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
    StudyMode.tsx
    EditMode.tsx

  diagnostic/
    DiagnosticIntro.tsx
    DiagnosticQuiz.tsx
    DiagnosticResults.tsx
```

### Lib

```
lib/
  types.ts
  ai.ts
  prompts.ts
  parsers/
    content-list-converter.ts
  contexts/
    generation-context.tsx
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
type Lesson = {
  title: string
  key_concept: string
  outline: string[]          // 4–8 bullet (Stage 1 output)
  concept?: ConceptCard      // populated after Stage 2
}

// ConceptCard (active recall)
type ConceptCard = {
  question: string
  answer: string
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
    ▼
POST /api/parse-pdf          (MinerU Precision API)
    │
    ▼
Markdown source
    │
    ├─── POST /api/generate-course      Stage 1: GPT-4o (Planner)
    │         → Chapter + Lesson outlines
    │
    └─── POST /api/generate-content     Stage 2: GPT-4o-mini (Generator)
              → ConceptCard + quiz per lesson
                    │
                    ▼
              SavedCourse → Firestore
                    │
                    ▼
              POST /api/diagnostic-quiz (prefetch, parallel)
                    │
                    ▼
              localStorage `diagnosticQuestions_{id}`
```

### Status machine (`generation-context.tsx`)

```
idle → parsing → generating → done
```

Bốn nhánh trong `startGeneration()`:

| Nhánh | Điều kiện | Hành động |
| :--- | :--- | :--- |
| **existing** | contentHash match + API alive | set `justGenerated_` → redirect; prefetch diagnostic nếu chưa có |
| **fromCache + content** | cache hit kèm courseContent | load map, saveCourse, runDiagnosticPrefetch |
| **fromCache fallback** | cache hit, không có content | parallel fetchChapter, saveCourse, runDiagnosticPrefetch |
| **fresh** | không cache | sequential fetchChapter per chapter, saveCourse, prefetch sau cùng |

`runDiagnosticPrefetch(courseId, markdown)`:
- Set `diagnosticStatus = 'loading'`
- POST markdown → `/api/diagnostic-quiz`
- Success: lưu `diagnosticQuestions_{id}` vào localStorage, status = `'done'`
- Fail/empty: status = `'error'`

`buildMarkdown` đánh dấu lesson theo `### [ci-li] Tên bài`
→ AI trả `source_chunk_id: "0-2"` khớp với `lessonMastery()` lookup.

**PipelineTracker** — 4 bước hiển thị trên UI:

| Bước | Done khi |
| :--- | :--- |
| Phân tích tài liệu | status rời `'parsing'` |
| Tạo cấu trúc khoá học | course JSON resolve |
| Tạo nội dung bài học | toàn bộ chapter content resolve |
| Tạo bài test chẩn đoán | `diagnosticStatus` = `'done'` hoặc `'error'` |

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
