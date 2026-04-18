# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi.

---

## Pivot: Đổi hướng sản phẩm — 15/04/2026

**Người đề xuất:** Lê Minh Hoàng, Nguyễn Bình Thành

**Painpoint cũ:** "Tôi có tài liệu PDF, muốn chuyển thành khóa học có cấu trúc." — Scope quá rộng, không xác định rõ user là ai, dùng trong hoàn cảnh nào.

**Painpoint mới:** "Tôi có kỳ thi ngày mai. Tôi cần ôn nhanh nhất có thể trong tối nay."

**Hướng đi mới:** Vẫn là document → course, nhưng toàn bộ output được thiết kế cho mục tiêu ôn thi nhanh.

**Tech/pipeline:** Chưa xác định cụ thể — sẽ làm rõ khi bắt đầu implement.

---

## Sprint 1 — 05/04 → ???. MVP

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Next.js 15 setup (Tailwind, TypeScript, shadcn/ui) | Nguyễn Bình Thành | 05/04 | ✅ |
| Kết nối MinerU API — parse PDF ra markdown | Nguyễn Bình Thành | 05/04 | ✅ |
| Firebase Storage — trung gian upload file cho MinerU | Nguyễn Bình Thành | 05/04 | ✅ |
| POST /api/parse-pdf — nhận PDF, trả markdown | Nguyễn Bình Thành | 05/04 | ✅ |
| POST /api/generate-course — Gemini đọc markdown, trả Course JSON | Nguyễn Bình Thành | 05/04 | ✅ (chuyển sang OpenAI) |
| UI upload + xem chapters/lessons | Nguyễn Bình Thành | 05/04 | ✅ |
| Extract content_list_v2 từ MinerU zip | Nguyễn Bình Thành | 12/04 | ✅ |
| Refactor schema: thêm Quiz, Course title; AI nhận contentList thay markdown | Nguyễn Bình Thành | 12/04 | ✅ |
| SSE streaming: streamCourse() + progressive chapter rendering | Nguyễn Bình Thành | 12/04 | ✅ |
| Stage 2: generateChapterContent() + /api/generate-content | Nguyễn Bình Thành | 12/04 | ✅ |
| Reveal.js slide viewer (CDN, embedded mode) | Nguyễn Bình Thành | 12/04 | ✅ |
| Quiz UI: single-choice, show answer + explanation | Nguyễn Bình Thành | 12/04 | ✅ |
| Fix Stage 2: bullet quality, source_text flow, speaker notes panel, Reveal theme | Nguyễn Bình Thành | 12/04 | ✅ |
| Refactor codebase theo Clean Architecture (Ports & Adapters) | Nguyễn Bình Thành | 12/04 | ✅ |

---

### [ADR-11] Thay thế source_text verbatim bằng outline do planner tạo — 16/04/2026

**Bối cảnh:** Stage 1 (PLANNER_PROMPT) yêu cầu LLM copy verbatim 200–600 words/lesson vào field `source_text`. Điều này gây ra 8,173 completion tokens chỉ để re-type text đã có sẵn trong markdown, làm Stage 1 mất ~88s với GPT-4o.

**Các lựa chọn đã xem xét:**
- **Giữ verbatim copy:** Grounded tốt nhưng token waste cực lớn, chậm.
- **source_heading marker:** LLM chỉ output `##` heading, code extract text. Thất bại vì MinerU output dùng `#` không phải `##`, và approach này fragile với doc không có heading.
- **Planner tạo outline:** LLM đọc toàn bộ, trích 4–8 bullet points cụ thể (facts, examples, numbers) thay vì copy verbatim. Stage 2 nhận outline và expand thành slides.

**Quyết định:** `Lesson.source_text` → `Lesson.outline: string[]`. Planner prompt yêu cầu 4–8 bullet points factual per lesson. Stage 2 prompt dùng outline thay vì source_text. `generate-content` route không cần nhận markdown nữa.

**Hệ quả:**
- Stage 1 completion tokens: 8,173 → 1,737 (-79%). Stage 1 time: ~88s → ~28s.
- Pipeline sạch hơn: không cần truyền raw markdown sang Stage 2.
- Fallback minimal content dùng `l.outline.slice(0, 4)` thay vì `l.source_text`.

---

### [ADR-10] Chuyển cả 2 stage sang GPT-4o-mini — 16/04/2026

**Bối cảnh:** Stage 1 và Stage 2 đều dùng GPT-4o. Stage 1 mất ~88s, Stage 2 mỗi chapter mất ~15–20s. GPT-4o-mini generate tokens nhanh hơn ~5x với chi phí thấp hơn đáng kể.

**Quyết định:** Đổi `model: 'gpt-4o'` → `'gpt-4o-mini'` ở cả `infrastructure/adapters/openai.adapter.ts` (Stage 1) và `lib/ai.ts` (Stage 1 legacy + Stage 2). Sau đó tách tiếp: Stage 1 (planner) dùng model thông minh hơn khi cần thiết, Stage 2 (generator) dùng model nhanh/rẻ.

**Hệ quả:** Stage 1 time giảm từ ~88s xuống ~20–28s. Stage 2 nhanh hơn đáng kể. Trade-off: output quality có thể giảm nhẹ nhưng chấp nhận được cho curriculum structuring.

---

### [ADR-9] Thiết kế lại hệ thống theo Clean Architecture (Ports & Adapters) — 12/04/2026

**Bối cảnh:** Source code ban đầu gắn chặt logic nghiệp vụ (PDF-to-Lesson) với các third-party service (Firebase, MinerU, OpenAI) trực tiếp trong các API routes. Việc này làm codebase khó bảo trì, khó viết unit test, và khó thay thế service trong tương lai. Nhóm không có hướng dẫn cụ thể về file organization khiến các thành viên gặp khó khi implement tính năng mới.

**Các lựa chọn đã xem xét:**
- **Giữ nguyên:** Phát triển nhanh ở giai đoạn đầu nhưng tech debt cao, luồng logic rải rác.
- **Clean Architecture (Ports & Adapters):** Tách tách biệt logic cốt lõi (Use Cases) khỏi các phụ thuộc bên ngoài (Adapters). Thống nhất quy ước cho team.

**Quyết định:** Áp dụng Clean Architecture cho dự án:
- Define rõ các **Ports** (Interfaces) nằm ở thư mục core (VD: `IStoragePort`, `ILLMPort`, `IParserPort`). Core domain không phụ thuộc external framework.
- Triển khai các **Adapters** ở layer infrastructure (VD: `FirebaseStorageAdapter`, `MinerUParserAdapter`, `OpenAIAdapter`) để implement các Ports tương ứng.
- Đóng gói logic tại các **Use Cases**. Next.js API routes chỉ đóng vai trò là Delivery Mechanism (Controllers) - gọi ra Use Case và inject Adapter vào.

**Hệ quả:**
- (+) Đảm bảo Separation of Concerns, dễ bảo trì và dễ scale.
- (+) Dễ dàng Unit Test bằng mocking các Ports. Dễ dàng đổi module (ví dụ đổi từ OpenAI API sang Local LLM hoặc API khác).
- (+) Chuẩn hóa luồng làm việc, team work dễ dàng hơn.
- (-) Số lượng file boilerplate và code setup interface tăng lên.

---

### Bug: Stage 1 bỏ sót lessons + source_text quá ngắn — 12/04/2026

**Triệu chứng:**
- "AI in Retail" biến mất khỏi chapter "Applications of AI" dù tài liệu có nội dung đầy đủ.
- `[Stage2 Input]` log cho thấy `source_text` của mỗi lesson chỉ 1–3 câu, trong khi tài liệu gốc có ~500 words cho cùng topic.

**Root cause:** `PLANNER_PROMPT` không enforce đủ 2 điều:
1. Không yêu cầu include ALL topics — LLM tự ý merge hoặc drop topics nhỏ.
2. Instruction về `source_text` ("copied VERBATIM") không đủ rõ về độ dài, dẫn đến LLM chỉ lấy 1–2 câu đại diện thay vì toàn bộ đoạn liên quan.

**Fix:** Cập nhật `PLANNER_PROMPT` trong `lib/prompts.ts`:
- Thêm: *"Include ALL topics as separate lessons. Do NOT merge. Do NOT skip."*
- Thay instruction source_text thành: *"Copy ALL relevant paragraphs verbatim. Include every sentence. Typically 200–600 words."*

---

### [ADR-7] Sync Reveal.js slide index với React state qua event listener — 12/04/2026

**Bối cảnh:** Cần hiển thị speaker notes của slide đang active trong panel riêng bên cạnh Reveal.js viewer. React không có access trực tiếp vào Reveal.js internal slide state.

**Quyết định:** Dùng `deck.on('slidechanged', (e) => setCurrentIndex(e.indexh))` sau khi `deck.initialize()` resolve. `currentIndex` là React state, khi đổi sẽ re-render notes panel với nội dung đúng. Dùng `mounted` flag để tránh `setCurrentIndex` sau khi component đã unmount (React warning). `deck.initialize()` trả về `Promise<void>` nên cần `async` IIFE trong `useEffect`.

**Hệ quả:** Notes panel update khi user navigate slides (arrow keys hoặc click controls). Không cần polling hay timeout — event-driven. `key` prop ở parent (`${ci}-${li}`) force remount khi đổi lesson → cleanup effect gọi `deck.destroy()` và reset `currentIndex` về 0.

---

### [ADR-5] Stage 2 là API call riêng, fire-and-forget từ client — 12/04/2026

**Bối cảnh:** Stage 2 (generate slides + quiz) cần chạy sau Stage 1. Có 2 lựa chọn: bundle vào cùng 1 API call hoặc tách riêng.

**Các lựa chọn đã xem xét:**
- **Bundle Stage 1 + Stage 2 trong 1 API call**: Đơn giản hơn, nhưng user phải chờ cả 2 stage xong mới thấy sidebar. Với N chapters thì timeout serverless có thể bị hit.
- **Stage 2 tách riêng, gọi fire-and-forget từ client**: Stage 1 xong → sidebar hiện ngay → Stage 2 chạy nền → khi xong slides mới load. UX tốt hơn, mỗi stage có timeout riêng.

**Quyết định:** `/api/generate-content` là route mới, nhận `Course` JSON và chạy `Promise.allSettled()` cho tất cả chapters song song. Client gọi ngay sau khi `setStatus('done')` mà không await — hiển thị "Generating slides..." badge ở top bar. Dùng `Promise.allSettled` thay `Promise.all` để 1 chapter fail không crash toàn bộ — chapter fail nhận fallback minimal ChapterContent.

**Hệ quả:** Thêm `courseContent`, `stage2Loading`, `stage2Error` state. Sidebar + Stage 1 data available ngay sau ~10s. Slides + quiz available sau thêm ~10-20s tùy số chapters.

---

### [ADR-6] Load Reveal.js từ CDN trong layout.tsx — 12/04/2026

**Bối cảnh:** Cần render presentation slides trong right panel. Reveal.js là thư viện presentation phổ biến nhưng có vấn đề với Next.js SSR (dùng `window`, `document`).

**Các lựa chọn đã xem xét:**
- **npm install reveal.js + dynamic import**: Sạch hơn về dependency management, nhưng phức tạp hơn với SSR và bundle size.
- **CDN script trong layout.tsx**: Load một lần cho toàn app, `window.Reveal` available sau DOMContentLoaded. Đơn giản, không cần handle SSR.

**Quyết định:** Load CSS + JS từ `cdn.jsdelivr.net/npm/reveal.js@5.1.0` trong `layout.tsx`. Script dùng `defer` — chạy sau HTML parse. `RevealDeck` component dùng `useEffect` + `useRef` để init `new Reveal(containerRef.current, { embedded: true })`. Dùng React `key` prop để force remount khi đổi lesson — cleanup effect tự gọi `deck.destroy()`.

**Hệ quả:** Reveal.js CSS là global (scoped to `.reveal` selector nên không ảnh hưởng Tailwind). Bundle size tăng ~300KB nhưng load lazy qua CDN. Cần internet để load slides.

---

### [ADR-4] Tách pipeline thành Stage 1 (outline) + Stage 2 (content); dùng contentList thay markdown — 12/04/2026

**Bối cảnh:** AI Planner Agent ban đầu nhận markdown thuần và trả về toàn bộ nội dung chapter/lesson trong một lần gọi. Cách này tốn nhiều token và khó kiểm soát chất lượng từng phần.

**Các lựa chọn đã xem xét:**
- **Một lần gọi duy nhất (markdown → full course)**: Đơn giản, nhưng prompt dài, token cao, và AI dễ hallucinate nội dung khi cố generate cả outline lẫn lesson content cùng lúc.
- **Tách 2 stage (outline → content)**: Stage 1 chỉ tạo skeleton (chapters, lessons, quiz topic). Stage 2 (sau này) gen nội dung từng lesson riêng. Mỗi stage dễ kiểm tra và retry độc lập.

**Quyết định:**
- Stage 1 (`/api/generate-course`) chỉ tạo Course outline: `title`, `chapters[].title`, `chapters[].lessons[]{title, key_concept, source_text}`, `chapters[].quiz.topic`.
- Stage 2 (chưa implement) sẽ gen nội dung quiz question/answer và lesson detail từ outline.
- API nhận `contentList` (array từ MinerU `content_list.json`) thay vì `markdown`. Route tự parse: `text`/`title` → append text, `table` → append HTML, `image` → placeholder, `discarded` → bỏ qua. Substring(0, 50000) để giới hạn token.

**Lý do dùng contentList thay markdown:** contentList giữ nguyên type metadata (heading vs paragraph vs table), cho phép filter chính xác hơn. Markdown flatten tất cả thành text, mất thông tin loại block.

**Hệ quả:** `lib/types.ts` thêm `Quiz`, `Course.title`, đổi `Chapter.chapter → Chapter.title`. `lib/ai.ts` đổi param `markdown → parsedContent`. `app/page.tsx` gửi `contentList` lên generate-course thay vì `markdown`.

---

### [ADR-3] Dùng make_mode content_list_v2 cho MinerU extract — 12/04/2026

**Bối cảnh:** MinerU trả về zip chứa `full.md` (markdown) nhưng thiếu structured content blocks (heading, paragraph, table, formula…). Planner Agent cần metadata chi tiết hơn markdown thuần để tách chapter/lesson chính xác hơn.

**Các lựa chọn đã xem xét:**
- **Chỉ dùng markdown**: Đơn giản, nhưng mất thông tin loại content block.
- **content_list_v2**: MinerU trả thêm file JSON chứa danh sách content blocks có type, text, và metadata. Cho phép Planner Agent hiểu cấu trúc tài liệu tốt hơn.

**Quyết định:** Thêm `make_mode: 'content_list_v2'` vào request body khi submit extract task. Parse file `content_list.json` hoặc `_content_list_v2.json` từ zip nếu có. Fallback về markdown-only nếu không tìm thấy file.

**Hệ quả:** `ParsePDF` return type đổi từ `Promise<string>` thành `Promise<{ markdown: string; contentList?: any[] }>`. API route `/api/parse-pdf` trả thêm field `contentList` trong response. Nếu MinerU API không support param `make_mode`, nó sẽ bị ignore silently và fallback hoạt động bình thường.

---

### [ADR-1] Dùng MinerU Official API làm PDF parser — 05/04/2026

**Bối cảnh:** Cần parse PDF ra markdown có structure để Planner Agent xử lý.

**Quyết định:** MinerU Official API (free beta, 2000 trang/ngày). Gọi qua REST: upload file → trigger extract → poll kết quả → trả markdown.

**Hệ quả:** Cần `PDF_MINERU_BASE_URL` + `PDF_MINERU_API_KEY` trong env. Interface `lib/parsers/index.ts` (`ParsePDF`) cho phép swap parser sau mà không đổi pipeline.

---

### [ADR-2] Dùng Firebase Storage làm trung gian upload cho MinerU — 05/04/2026

**Bối cảnh:** MinerU Precision API chỉ nhận URL public, không nhận file upload trực tiếp.

**Quyết định:** Upload file lên Firebase Storage (firebase-admin), `makePublic()` để lấy public URL, gửi URL đó cho MinerU extract API.

**Hệ quả:** Cần `firebase-admin` package + 4 env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`). File được cleanup (xóa khỏi Storage) sau khi parse xong.

---

## Template

### Quyết định kỹ thuật

```markdown
### [ADR-N] Tiêu đề quyết định — DD/MM/YYYY

**Bối cảnh:** Vấn đề cần giải quyết là gì?

**Các lựa chọn đã xem xét:**
- Option A: ...
- Option B: ...

**Quyết định:** Chọn option nào và tại sao.

**Hệ quả:** Những gì bị ảnh hưởng / trade-off.
```

### Phân công

```markdown
### Sprint N — DD/MM → DD/MM/YYYY

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| | | | |
```

### Brainstorming

```markdown
### Brainstorm: [Chủ đề] — DD/MM/YYYY

**Câu hỏi:** ...

**Các ý tưởng:**
- Ý tưởng 1: ...
- Ý tưởng 2: ...

**Kết luận:** ...
```

---

## Ví dụ (KHÔNG phải progress thật — chỉ để tham khảo format)

### [ADR-1] Dùng TypeScript thay vì Python — 30/03/2026

**Bối cảnh:** Cả nhóm cần chọn 1 ngôn ngữ chính để xây dựng agent. Có 2 thành viên quen Python, 1 thành viên quen TypeScript.

**Các lựa chọn đã xem xét:**
- **Python**: Ecosystem ML tốt hơn, syntax đơn giản, thành viên quen hơn.
- **TypeScript**: Type safety, dễ refactor khi project lớn, nhiều library AI mới ra bản TS trước.

**Quyết định:** Chọn TypeScript vì project này focus vào agent architecture, không cần ML library nặng. Type safety sẽ giúp bắt lỗi sớm hơn khi codebase phình ra.

**Hệ quả:** 2 thành viên Python cần học TypeScript cơ bản (ước tính 1 tuần). Sẽ không dùng được `langchain` Python trực tiếp.

---

### [ADR-2] Lưu conversation history bằng file JSON — 03/04/2026

**Bối cảnh:** Agent cần nhớ context giữa các lần chạy. Cần chọn storage.

**Các lựa chọn đã xem xét:**
- **In-memory array**: Đơn giản nhất nhưng mất khi restart.
- **File JSON**: Persistent, không cần setup, dễ inspect bằng tay.
- **SQLite**: Có thể query, tốt cho production nhưng overkill cho prototype.
- **Redis**: Fast nhưng cần chạy thêm service.

**Quyết định:** File JSON cho giai đoạn prototype. Thiết kế interface `MemoryStore` để sau này swap sang SQLite không cần sửa logic agent.

**Hệ quả:** Không query được theo thời gian hay user. Chấp nhận được ở giai đoạn này.

---

### Sprint 1 — 31/03 → 06/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Setup TypeScript project + CI | Văn A | 01/04 | ✅ Xong |
| Implement agent loop cơ bản | Thị B | 02/04 | ✅ Xong |
| Tool: `search_web` (Brave API) | Văn C | 03/04 | ✅ Xong |
| Tool: `read_file`, `write_file` | Thị B | 05/04 | ✅ Xong |
| Conversation memory (JSON) | Văn A | 06/04 | ✅ Xong |
| README + setup docs | Văn C | 06/04 | ✅ Xong |

---

### Sprint 2 — 07/04 → 13/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Fix infinite loop: thêm `max_iterations` | Thị B | 08/04 | 🔄 Đang làm |
| Tool: `run_tests` (chạy pytest) | Văn C | 10/04 | ⏳ Chờ |
| Sliding window memory | Văn A | 09/04 | ⏳ Chờ |
| Demo prep + slides | Cả nhóm | 13/04 | ⏳ Chờ |

---

### Brainstorm: Tính năng cho demo — 05/04/2026

**Câu hỏi:** Demo tuần tới nên show gì để ấn tượng nhất trong 5 phút?

**Các ý tưởng:**
- **Ý tưởng 1 (Văn A):** Cho agent đọc 1 file Python có bug, tự fix, rồi chạy test để verify. Trực quan, dễ hiểu.
- **Ý tưởng 2 (Thị B):** Agent tự build 1 tính năng nhỏ từ mô tả bằng tiếng Việt. Show khả năng hiểu ngôn ngữ tự nhiên.
- **Ý tưởng 3 (Văn C):** Agent review PR, comment vào từng dòng code có vấn đề. Gần với use case thực tế nhất.

**Pros/Cons:**
| Ý tưởng | Pros | Cons |
|---|---|---|
| Fix bug | Dễ làm, chắc chắn chạy được | Ít "wow" hơn |
| Build từ mô tả | Ấn tượng nhất | Có thể fail nếu prompt phức tạp |
| Review PR | Thực tế, liên quan trực tiếp đến khóa học | Cần setup GitHub webhook |

**Kết luận:** Chọn ý tưởng 1 (fix bug) cho demo chính vì đảm bảo. Nếu còn thời gian sẽ show thêm ý tưởng 2 như bonus.

---

### Bug quan trọng: Tool call loop vô hạn — 04/04/2026

**Triệu chứng:** Agent gọi `search_web` liên tục không dừng khi tool trả về lỗi network.

**Root cause:** Không có stop condition khi tool raise exception. Agent nhận `"error": "timeout"` nhưng interpret là cần thử lại.

**Fix:** Thêm 2 điều kiện dừng:
1. `max_iterations = 10` — hard stop sau 10 vòng
2. Nếu tool trả về lỗi 3 lần liên tiếp → dừng và báo user

**Code thay đổi:** `src/agent.ts` lines 45-67

**Học được:** Luôn thiết kế stop condition trước khi implement retry logic.

---

### Bug: Stage 1 merge nhiều topics thành 1 lesson — 12/04/2026

**Triệu chứng:** "AI in Healthcare", "AI in Agriculture", "AI in Retail" bị gộp thành 1 lesson "Areas of Application of AI". `source_text` là summary chứ không phải verbatim. Stage 2 thiếu ngữ liệu → slide sơ sài.

**Root cause:** `contentListToString()` trong `app/api/generate-course/route.ts` flatten toàn bộ content_list thành plain string, không giữ lại structural markers từ MinerU. Field `text_level: 1` (section heading) bị bỏ qua hoàn toàn — GPT-4o nhận plain text, không có boundary signal, nên tự quyết định gộp các sub-topics gần nhau vào 1 lesson.

**Hướng đã chọn: Direction A — Fix ở parser layer**

Lý do chọn A thay vì B:
- Prompt (Direction B) đã có instruction "do NOT merge" nhưng vẫn fail — LLM không có structural signal để act on.
- Direction A deterministic: emit `## heading` cho mọi `text_level === 1` / `type === 'title'` item → LLM thấy ranh giới rõ ràng, không cần "đoán" boundary.
- Ít phụ thuộc LLM hơn; dễ debug (inspect input string trước khi gửi).

**Files thay đổi:**
- `lib/parsers/index.ts` — thêm `ContentItem` type + `parseContentList()` function (emit `## marker` cho headings)
- `app/api/generate-course/route.ts` — xóa local `contentListToString`, import `parseContentList` từ `@/lib/parsers`
- `lib/prompts.ts` — thêm instruction: "Each ## heading MUST become its own separate lesson, never merge two ## sections"

---

### ADR-8: parseContentList() emit ## markers cho text_level: 1 headings — 12/04/2026

**Context:** MinerU content_list trả về items với field `text_level: 1` đánh dấu section heading. Trước đây các item này được join phẳng vào string, mất hết cấu trúc.

**Decision:** `parseContentList()` trong `lib/parsers/index.ts` là single source of truth cho việc chuyển đổi content_list → string input cho LLM. Items với `type === 'title'` hoặc `text_level === 1` được emit là `## text` thay vì plain text.

**Consequences:**
- (+) LLM thấy explicit `##` boundary → lesson splitting deterministic hơn.
- (+) Parse logic tập trung trong `lib/parsers/`, không bị duplicate ở route.
- (-) Nếu MinerU thay đổi cách dùng `text_level` thì cần update lại function này.
- Prompt được cập nhật để reference `##` markers, giữ alignment giữa input format và instruction.

---

## Sprint 2 — 17/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Remove Reveal.js + Add ConceptCard | Nguyễn Bình Thành | 17/04 | ✅ |

---

### [ADR-12] Remove Reveal.js — 17/04/2026

**Bối cảnh:** Stage 2 sinh slides (2–4 slides/lesson) được render bằng Reveal.js embedded mode. Sau khi sử dụng thực tế, slide format không phù hợp với mục tiêu học tập chủ động: learner thụ động xem bullet points thay vì tự recall kiến thức. Ngoài ra, Reveal.js CDN load thêm ~200KB, tăng complexity cho một tính năng không còn cần thiết.

**Các lựa chọn đã xem xét:**
- **Giữ Reveal.js:** Format quen thuộc nhưng passive learning, token waste (Stage 2 dùng nhiều tokens để format slides).
- **Xóa Reveal.js, thay bằng outline view:** Đơn giản hơn, dùng outline từ Stage 1 trực tiếp — không cần Stage 2 để render nội dung lesson.
- **Xóa Reveal.js, thay bằng ConceptCard:** Active recall format, Stage 2 tập trung vào việc tạo câu hỏi + quiz thay vì format slides.

**Quyết định:** Xóa toàn bộ Reveal.js (CDN, RevealDeck component, Slide type, slide generation prompt). Lesson view hiển thị outline từ Stage 1. Stage 2 chuyển sang generate ConceptCard và quiz.

**Hệ quả:**
- (-) Mất slide viewer — nhưng outline bullets đủ informative cho learner.
- (+) Giảm Stage 2 prompt complexity, giảm tokens.
- (+) Không còn phụ thuộc CDN external; không còn `window.Reveal` global state.
- (+) Mở đường cho ConceptCard format active recall.

---

### [ADR-13] ConceptCard thay thế slide — 17/04/2026

**Bối cảnh:** Sau khi xóa Reveal.js, Stage 2 cần format mới cho nội dung lesson. Mục tiêu là active recall thay vì passive presentation.

**Shape mới — `ConceptCard`:**
```ts
type ConceptCard = {
  question: string    // active recall question, dạng "X hoạt động như thế nào?"
  answer: string      // TL;DR 2-3 câu dense, không bullet
  detail?: string     // 3-5 câu, có analogy/ví dụ nếu concept abstract
  followUps: string[] // 2 follow-up questions đào sâu
}
```

**2-state UI:**
- **State A (default):** Progress pips, label "Concept N/total", câu hỏi, input để tự trả lời, nút Reveal.
- **State B (sau Reveal):** Input disabled/faded, divider, TL;DR (teal), follow-up chips, 4 Anki mock buttons (Again/Hard/Good/Easy).

**Fallback nếu model không trả về concept:**
```ts
{ question: `${lesson.title} là gì?`, answer: outline.slice(0, 2).join('. '), followUps: [] }
```

**Anki buttons + follow-up chips:** `onClick` chỉ `console.log`, không có persistence hay Supabase. Đây là mock UI để validate format trước khi implement spaced repetition.

**Hệ quả:**
- (+) Active recall format — learner tự trả lời trước khi reveal.
- (+) Anki-style feedback loop (mock) — chuẩn bị cho future spaced repetition.
- (+) Fallback đảm bảo UI không bị break khi model fail.
- (-) Follow-up chips và Anki buttons chưa có logic thực — cần implement spaced repetition ở sprint sau.

---

## Sprint 3 — 18/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Cấu hình CI/CD Pipeline (GitHub Actions) | Lê Kim Dũng | 18/04 | ✅ |
| Implement Authentication (Firebase + Session Cookie) | Lê Kim Dũng | 18/04 | ✅ |
| API Routes: /login, /logout, /me | Lê Kim Dũng | 18/04 | ✅ |

---

### [ADR-14] Bảo mật xác thực bằng Session Cookie (HttpOnly) — 18/04/2026

**Bối cảnh:** Cần cơ chế xác thực để quản lý khóa học của từng người dùng. Lựa chọn giữa JWT lưu ở LocalStorage và Session Cookie lưu ở Server.

**Các lựa chọn đã xem xét:**
- **JWT (LocalStorage):** Dễ triển khai, stateless. Tuy nhiên dễ bị tấn công XSS (đánh cắp token qua javascript).
- **Session Cookie (HttpOnly):** Bảo mật cao hơn trước XSS. Firebase Admin SDK hỗ trợ mạnh mẽ việc tạo và xác thực session cookie.

**Quyết định:** Sử dụng **Session Cookie (HttpOnly, Secure)**. Khi người dùng login, server sẽ đổi ID Token lấy Session Cookie và set vào trình duyệt.

**Hệ quả:**
- (+) Chống XSS tốt hơn.
- (+) Có thể thu hồi session từ server-side ngay khi cần.
- (-) Phải xử lý logic CSRF kỹ hơn trong tương lai (hiện tại Next.js App Router đã có những bảo vệ mặc định).
