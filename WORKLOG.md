# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi. Sắp xếp **mới nhất ở trên cùng**.

---

## Sprint 4 — 20/04 → 26/04/2026

| Task | Người làm | Deadline | PR |
|---|---|---|---|
| Learning Dashboard (`/dashboard`, save & browse courses) | Nguyễn Bình Thành | 21/04 | #19 |
| Spaced Repetition System (SM2 + progress tracking + `/review` page) | Lê Kim Dũng | 22/04 | #22 |
| Refactor DI: centralize adapter initialization | Lê Kim Dũng | 22/04 | #22 |
| Course Player (`/course/[id]`) + Instant Load cache | Lê Kim Dũng | 22/04 | #22 |
| Nâng cấp UI/UX trang Study & Edit (phím tắt, nguồn) | Nguyễn Bình Thành | 23/04 | #26, #27 |
| Bổ sung Gamification (Streak, Heatmap, Mastery ring) | Nguyễn Bình Thành | 23/04 | #28, #31, #32 |
| Giao diện Tracker tiến độ AI tạo bài | Nguyễn Bình Thành | 23/04 | #29 |
| Nâng cấp trang Browse & Refactor Clean Architecture | Nguyễn Bình Thành | 23/04 | #30 |

---

### [ADR-22] Nâng cấp UI/UX & Hệ thống tạo động lực học — 23/04/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #26, #27, #28, #29, #31, #32

**Bối cảnh:** Trải nghiệm học cần mượt mà hơn và tạo được thói quen quay lại hàng ngày cho user. Đã quyết định bỏ "Citation popover" để giữ UI đơn giản.

**Quyết định:**
- **Thao tác nhanh:** Thêm phím tắt (E/A), dán nhãn nguồn (source badge).
- **Gamification (Home):** Hiển thị chuỗi ngày học (Streak), biểu đồ nhiệt 30 ngày (Heatmap) và Vòng tròn thành thạo (Mastery ring).
- **Trải nghiệm chờ:** Thêm thanh tiến trình (Pipeline tracker) lúc đợi AI tạo khóa học.

**Trade-offs:**
- ✅ Giao diện trực quan, tạo tín hiệu nhắc nhở thói quen tốt.
- ⚠️ **Chỉ số bị đếm hụt:** Streak và Heatmap hiện tại chỉ lưu lượt học *mới nhất* của thẻ bài. Sẽ cần làm một bảng lưu log riêng sau này để đếm chính xác.
- ⚠️ Trang nguồn đang dùng mã hash làm tạm, cần đợi generator đánh dấu để thay link thật.

---

### [ADR-21] Nâng cấp luồng Browse & Cấu trúc lại code — 23/04/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #30

**Bối cảnh:** Khi số lượng bài tăng, user cần lọc được thẻ nào đã học/chưa học. Đồng thời logic xử lý dữ liệu đang bị dính chặt vào giao diện.

**Quyết định:**
- Cải tổ giao diện Browse: thêm thanh điều hướng dọc (rail), chia cột và bộ lọc theo tiến độ.
- Tách code triệt để theo Clean Architecture (Port/Adapter/Use case/Route) để code UI độc lập với logic lấy data.

**Trade-offs:**
- ✅ Code sạch sẽ, dễ bảo trì, dễ mở rộng tính năng mới.
- ⚠️ **Lỗi trùng tiến độ:** Do `cardId` đang được tạo theo ID nội bộ của khóa học, nếu user có 2 khóa trùng ID thẻ thì tiến độ sẽ bị cập nhật chung. (Chấp nhận giới hạn này hiện tại).
- ⚠️ Bỏ qua các lỗi TypeScript cảnh báo ở các adapter cũ (`firebase-course-repository` và `local-course`).
---

### [ADR-20] Spaced Repetition System — 22/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** SM2 algorithm, `/api/progress/*`, `/review` page

**Bối cảnh:** Learner cần ôn tập ConceptCards theo rhythm tối ưu (spaced repetition).

**Quyết định:**
- Implement SM2 (SuperMemo 2) algorithm: track `ease_factor`, `interval`, `next_due_date` per card.
- `ProgressRepository` port → persist learning progress (Firestore adapter).
- `/api/progress/due` — get due cards; `/api/progress/review` — grade card (Again/Hard/Good/Easy).
- `/review` page — show due cards + SRS stats.

**Trade-offs:**
- ✅ Learner ôn tập theo cá nhân rhythm (dễ → review mau, khó → review chậm).
- ✅ Measurable: track learning curve qua ease_factor, interval.
- ⚠️ Complexity: SM2 state tracking + due card compute.
- ⚠️ User must grade cards → thêm action, không chỉ quiz.

---

### [ADR-19] DI Refactoring — 22/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** `infrastructure/di.ts`

**Bối cảnh:** Adapter instantiation scattered ở API routes → khó reuse, khó test.

**Quyết định:**
- `infrastructure/di.ts` — single source: `getCourseRepository()`, `getProgressRepository()`, `getAIAdapter()`.
- Env vars (FIREBASE_*, NEXT_PUBLIC_COURSE_STORE) inject vào adapter constructor.
- API routes call DI function, không `new Adapter()` trực tiếp.

**Trade-offs:**
- ✅ Centralized config + easy to swap adapter.
- ✅ Clean separation: adapter logic ≠ route handler.

---

### [ADR-18] Course Repository Port + Adapters — 21/04/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** `core/ports/course-repository.port.ts`

**Bối cảnh:** Sau generate course, learner save & browse later.

**Quyết định:**
- `ICourseRepository` port: `save()`, `list(userId)`, `getById()`, `delete()`.
- `FirestoreCourseAdapter` (prod) + `LocalCourseAdapter` (dev fallback).
- Auto-save course sau Stage 2 completes.
- Switch via `NEXT_PUBLIC_COURSE_STORE`.

**Trade-offs:**
- ✅ Clean abstraction → easy swap storage backend.
- ✅ Dev offline testing (localStorage).
- ⚠️ Maintain 2 adapters.

---

### [ADR-17] Course Player + ConceptCard Flow — 21/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** `/course/[id]`, interactive player

**Bối cảnh:** Dashboard lists courses; learner needs `/course/[id]` to view chapters/lessons.

**Quyết định:**
- `/course/[id]` → load from Firestore, render ConceptCards + Quiz per lesson.
- Session auth verify user ownership.

**Trade-offs:**
- ✅ Active recall via ConceptCard (learner self-tests before reveal).
- ✅ Persistent storage (Firestore).

---

### [ADR-16] Firestore Adapter: Unified Cache + User Storage — 21/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** `infrastructure/adapters/firestore-course.adapter.ts`

**Bối cảnh:** Generate course = expensive (AI tokens). Need caching + persistence.

**Quyết định:**
- Firestore adapter manage: hash-based cache (content hash → course) + user storage (user_id → courses).
- `/api/generate-course` check cache → call AI if miss → save to Firestore.

**Trade-offs:**
- ✅ Token savings + faster response (cache hits).
- ✅ Course persistence across restarts.
- ⚠️ Firestore rules + cost monitoring needed.

---

## Sprint 3 — 13/04 → 19/04/2026

| Task | Người làm | Deadline | Trạng thái |
|---|---|---|---|
| Chuyển 2 stage sang GPT-4o-mini | Nguyễn Bình Thành | 16/04 | ✅ |
| Thay source_text verbatim bằng outline do planner tạo | Nguyễn Bình Thành | 16/04 | ✅ |
| Xóa Reveal.js + thêm ConceptCard (active recall) | Nguyễn Bình Thành | 17/04 | ✅ |
| Cấu hình CI/CD Pipeline (GitHub Actions) | Lê Kim Dũng | 18/04 | ✅ |
| Implement Authentication (Firebase + Session Cookie) | Lê Kim Dũng | 18/04 | ✅ |
| API Routes: /login, /logout, /me | Lê Kim Dũng | 18/04 | ✅ |
| Switch parser source: full.md → content_list.json | Nguyễn Bình Thành | 19/04 | ✅ |

---

### [ADR-15] Parser classifier + dedupe cho content_list.json — 19/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** `contentListToMarkdown()` naive emit `##` cho mọi `text_level=1`, tạo ra 72 marker trong file ĐTĐ (33 Roman numeral lặp, nhiều noise decorative như "INSULIN REGULAR", "THANK YOU"). Kết quả: Stage 1 bị flood context → drop nhóm Glinid, Amylin, tạo phantom chapter "Introduction", output tiếng Anh dù source tiếng Việt.

**Các lựa chọn đã xem xét:**
- **Giữ naive (emit ## cho mọi text_level=1):** Đơn giản nhưng flood LLM, mất thông tin thực sự.
- **Chỉ dedupe, không classifier:** Bớt lặp nhưng vẫn emit ## cho "INSULIN REGULAR" và noise decorative.
- **Classifier + dedupe (lựa chọn chọn):** Regex phân loại `##` (Roman numeral chương) vs `###` (Roman.digit hoặc numeric sub-section) vs plain text. Seen-set dedupe theo `text.trim()` — lần đầu emit marker, lần sau giữ plain text.

**Quyết định:** Regex theo thứ tự ưu tiên:
1. `/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\s+\S/` → `##` chapter
2. `/^(I{1,3}|IV|V|VI{0,3}|IX|X)\.\d+\.?\s+\S/` → `###` lesson
3. `/^\d+\.(\d+\.)?\s+\S/` → `###` lesson
4. Không match → plain text (bỏ marker)

Dedupe: `Set<string>` theo `text.trim()`, áp dụng cho cả `##` và `###`.

Bug fix kèm theo: `item.img_path` đã có prefix `images/` sẵn → bỏ prefix thừa trong template.

**Hệ quả:**
- (+) 72 marker → 8 `##` + 20 `###` cho file ĐTĐ. Glinid và Amylin không còn bị mất.
- (+) Logic tách thành `content-list-converter.ts` — có unit test với fixture thật (15 test cases).
- (+) Prompt PLANNER thêm 4 rule: ngôn ngữ, `##` = chapter boundary, `###` = lesson boundary, table expansion rule.
- (-) Regex phụ thuộc vào convention đánh số La Mã của tài liệu y khoa Việt Nam — tài liệu không theo convention này cần điều chỉnh regex.

---

### [ADR-14] Dùng Session Cookie (HttpOnly) cho đăng nhập — 18/04/2026

**Người làm:** Lê Kim Dũng

**Bối cảnh:** Cần xác thực user để mỗi người có khóa học riêng. Chọn giữa 2 cách lưu token đăng nhập ở phía trình duyệt.

**Các lựa chọn đã xem xét:**
- **JWT lưu ở localStorage:** Đơn giản, stateless, nhưng JavaScript đọc được → dễ bị đánh cắp qua XSS (kẻ tấn công inject script để lấy token).
- **Session Cookie (HttpOnly):** Trình duyệt giữ cookie, JavaScript **không** đọc được → an toàn trước XSS. Firebase Admin SDK có sẵn API tạo/verify session cookie.

**Quyết định:** Dùng Session Cookie HttpOnly + Secure. Khi login, server đổi ID Token (Firebase) lấy session cookie rồi set vào trình duyệt.

**Hệ quả:**
- (+) Chống XSS tốt hơn.
- (+) Server có thể thu hồi session bất cứ lúc nào.
- (-) Phải xử lý CSRF sau này (Next.js App Router đã có bảo vệ mặc định).

---

### [ADR-13] ConceptCard thay thế slide — 17/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Sau khi xóa tính năng slide (ADR-12), Stage 2 cần format mới cho nội dung lesson. Mục tiêu: **active recall** (learner tự trả lời) thay vì passive presentation.

**Shape mới — `ConceptCard`:**
```ts
type ConceptCard = {
  question: string    // câu hỏi gợi nhớ, kiểu "X hoạt động như thế nào?"
  answer: string      // TL;DR 2-3 câu, không bullet
  detail?: string     // 3-5 câu, có analogy/ví dụ nếu concept trừu tượng
  followUps: string[] // 2 câu hỏi follow-up đào sâu
}
```

**UI 2 trạng thái:**
- **Trước khi Reveal:** Hiện câu hỏi + ô input để tự trả lời + nút Reveal.
- **Sau khi Reveal:** Input mờ đi, hiện TL;DR, follow-up chips, 4 nút Anki mock (Again/Hard/Good/Easy).

**Fallback nếu model không trả về concept:**
```ts
{ question: `${lesson.title} là gì?`, answer: outline.slice(0, 2).join('. '), followUps: [] }
```

**Lưu ý:** Anki buttons + follow-up chips hiện chỉ `console.log`, **chưa lưu dữ liệu**. Đây là mock UI để validate format trước khi làm spaced repetition thật.

**Hệ quả:**
- (+) Learner tự trả lời trước khi reveal → học chủ động.
- (+) Feedback loop kiểu Anki (mock) — chuẩn bị cho spaced repetition sau này.
- (+) Fallback đảm bảo UI không vỡ khi model fail.
- (-) Follow-up chips và Anki buttons chưa có logic thực — cần implement sau.

---

### [ADR-12] Xóa tính năng tạo slide — 17/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Stage 2 trước đây sinh 2–4 slide/lesson render bằng Reveal.js. Sau khi dùng thực tế:
- Learner chỉ đọc lướt bullet → học thụ động, không recall được.
- Reveal.js load thêm ~200KB từ CDN, tăng complexity cho 1 feature không còn cần.
- Với use case "ôn thi 1 đêm", slide không đáng đầu tư.

**Quyết định: Ngừng đầu tư vào định dạng slide.** Xóa toàn bộ Reveal.js (CDN script, component RevealDeck, type `Slide`, slide generation prompt). Thay vào đó Stage 2 gen ConceptCard (xem ADR-13).

**Hệ quả:**
- (-) Không còn slide viewer.
- (+) Giảm prompt complexity + token cho Stage 2.
- (+) Không còn phụ thuộc CDN external; không còn `window.Reveal` global.
- **Obsolete:** 2 ADR cũ đã bị xóa cùng feature — ADR-6 (load Reveal.js từ CDN), ADR-7 (sync slide index với React state).

---

### [ADR-11] Thay thế source_text verbatim bằng outline do planner tạo — 16/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Stage 1 yêu cầu AI copy nguyên văn 200–600 từ/lesson vào field `source_text`. Gây tốn 8,173 completion tokens chỉ để re-type text đã có sẵn trong markdown, làm Stage 1 mất ~88s với GPT-4o.

**Các lựa chọn đã xem xét:**
- **Giữ verbatim copy:** Grounded tốt nhưng tốn token, chậm.
- **source_heading marker:** AI chỉ output `##` heading, code tự extract text. Thất bại vì MinerU output dùng `#` không phải `##`, và fragile với doc không có heading.
- **Planner tạo outline:** AI đọc toàn bộ, trích 4–8 bullet points cụ thể (facts, examples, numbers) thay vì copy verbatim. Stage 2 nhận outline và expand thành ConceptCard.

**Quyết định:** `Lesson.source_text` → `Lesson.outline: string[]`. Planner prompt yêu cầu 4–8 bullet points factual/lesson. Stage 2 dùng outline thay vì source_text. Route `generate-content` không cần nhận markdown nữa.

**Hệ quả:**
- Stage 1 completion tokens: 8,173 → 1,737 (-79%). Thời gian: ~88s → ~28s.
- Pipeline sạch hơn: không cần truyền raw markdown sang Stage 2.
- Fallback minimal content dùng `l.outline.slice(0, 4)` thay vì `l.source_text`.

---

### [ADR-10] Chuyển cả 2 stage sang GPT-4o-mini — 16/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Stage 1 và Stage 2 đều dùng GPT-4o. Stage 1 mất ~88s, Stage 2 mỗi chapter mất ~15–20s. GPT-4o-mini generate tokens nhanh hơn ~5x với chi phí thấp hơn đáng kể.

**Quyết định:** Đổi `model: 'gpt-4o'` → `'gpt-4o-mini'` ở cả Stage 1 (`infrastructure/adapters/openai.adapter.ts`) và Stage 2 (`lib/ai.ts`).

**Hệ quả:** Stage 1 giảm từ ~88s xuống ~20–28s. Stage 2 nhanh hơn đáng kể. Trade-off: output quality giảm nhẹ nhưng chấp nhận được cho curriculum structuring.

---

## Pivot: Đổi hướng sản phẩm — 15/04/2026

**Người đề xuất:** Lê Minh Hoàng, Nguyễn Bình Thành

**Painpoint cũ:** "Tôi có tài liệu PDF, muốn chuyển thành khóa học có cấu trúc." — Scope quá rộng, không xác định rõ user là ai, dùng trong hoàn cảnh nào.

**Painpoint mới:** "Tôi có kỳ thi ngày mai. Tôi cần ôn nhanh nhất có thể trong tối nay."

**Hướng đi mới:** Vẫn là document → course, nhưng toàn bộ output được thiết kế cho mục tiêu ôn thi nhanh.

**Tech/pipeline:** Chưa xác định cụ thể — sẽ làm rõ khi bắt đầu implement.

---

## Sprint 1 — 05/04 → 12/04/2026. MVP

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
| Reveal.js slide viewer (CDN, embedded mode) | Nguyễn Bình Thành | 12/04 | ✅ (sau đó bị xóa, xem ADR-12) |
| Quiz UI: single-choice, show answer + explanation | Nguyễn Bình Thành | 12/04 | ✅ |
| Fix Stage 2: bullet quality, source_text flow, speaker notes panel, Reveal theme | Nguyễn Bình Thành | 12/04 | ✅ |
| Refactor codebase theo Clean Architecture | Lê Kim Dũng | 12/04 | ✅ |

---

### [ADR-9] Tổ chức lại code theo kiến trúc sạch (Clean Architecture) — 12/04/2026

**Người làm:** Lê Kim Dũng

**Bối cảnh:** Ban đầu logic nghiệp vụ (xử lý PDF → course) bị trộn lẫn với lời gọi Firebase, MinerU, OpenAI ngay trong API route. Khó bảo trì, khó test, khó đổi service. Nhóm không có hướng dẫn chung về tổ chức file → mỗi người làm 1 kiểu.

**Các lựa chọn đã xem xét:**
- **Giữ nguyên:** Phát triển nhanh lúc đầu nhưng tech debt cao, logic rải rác.
- **Clean Architecture:** Tách biệt logic lõi khỏi các thư viện/service bên ngoài. Có quy ước chung cho team.

**Quyết định:** Tách code thành 3 lớp:
- **Core (`core/ports/`, `core/use-cases/`):** logic chính. Không biết gì về thư viện bên ngoài — chỉ khai báo "interface" cho những gì cần (lưu file, gọi LLM, parse PDF).
- **Infrastructure (`infrastructure/adapters/`):** code cụ thể gọi Firebase / OpenAI / MinerU. Mỗi adapter implement 1 interface ở Core.
- **App (`app/api/`):** nhận HTTP request, gọi use case ở Core, inject adapter vào.

**Hệ quả:**
- (+) Đổi provider (OpenAI → local LLM, MinerU → parser khác) không phải sửa logic nghiệp vụ.
- (+) Unit test dễ — mock interface thay vì mock service thực.
- (+) Chuẩn hóa luồng làm việc, team work dễ dàng hơn.
- (-) Số file và boilerplate setup interface tăng.

---

### [ADR-4] Pipeline tạo khóa học: chia 2 bước + giữ cấu trúc heading — 12/04/2026

**Người làm:** Nguyễn Bình Thành

> Gộp từ 4 ADR cũ (ADR-3, ADR-4, ADR-5, ADR-8) + 1 bug note. Cả 4 cùng giải quyết 1 bài toán: đưa tài liệu thành Course JSON chính xác, nhanh.

**Bối cảnh:** Bản đầu tiên: AI nhận toàn bộ markdown của PDF, trả về cả khung khóa học lẫn nội dung chi tiết trong 1 lần gọi. 3 vấn đề phát sinh:
- **Tốn token, dễ bịa:** AI phải vừa tạo khung vừa gen chi tiết → output chất lượng thấp.
- **AI gộp các bài học:** Markdown flatten của MinerU không giữ heading → AI tự ý gộp "AI in Healthcare", "AI in Retail", "AI in Agriculture" thành 1 lesson "Areas of Application".
- **Server timeout:** Nhiều chapter thì 1 call không chạy xong.

**Quyết định:**
1. **Chia 2 bước:**
   - **Bước 1** (`/api/generate-course`): AI chỉ tạo **khung** — tên chapter, tên lesson, topic của quiz.
   - **Bước 2** (`/api/generate-content`): AI gen **chi tiết** từng chapter (ConceptCard + quiz).
2. **Bước 2 chạy nền, fire-and-forget từ client:** User thấy sidebar ngay sau bước 1, chi tiết load sau. Dùng `Promise.allSettled` nên 1 chapter fail không kill cả pipeline.
3. **Dùng content_list_v2 (JSON có metadata) thay vì markdown thuần** làm input cho AI → giữ thông tin heading, bảng, hình. Thêm `make_mode: 'content_list_v2'` vào request khi submit task cho MinerU.
4. **Emit `## heading`** cho mọi section quan trọng (`text_level: 1` hoặc `type: 'title'`) trong `parseContentList()` ở `lib/parsers/index.ts` → AI nhìn thấy ranh giới rõ, không gộp bài.

**Hệ quả:**
- Sidebar hiện sau ~10s, chi tiết sau ~10–20s tùy số chapter.
- Bài học không còn bị gộp (fix bug: "AI in Retail biến mất khỏi chapter Applications of AI").
- `ParsePDF` return type đổi từ `Promise<string>` thành `Promise<{ markdown, contentList? }>`.
- Nếu MinerU đổi cách dùng `text_level` sau này, chỉ cần sửa `parseContentList()` — không phải sửa prompt.

---

### [ADR-2] Dùng Firebase Storage làm trung gian upload cho MinerU — 05/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** MinerU Precision API chỉ nhận URL public, không nhận file upload trực tiếp.

**Quyết định:** Upload file lên Firebase Storage (firebase-admin), `makePublic()` để lấy public URL, gửi URL đó cho MinerU extract API.

**Hệ quả:** Cần `firebase-admin` package + 4 env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`). File được cleanup (xóa khỏi Storage) sau khi parse xong.

---

### [ADR-1] Dùng MinerU Official API làm PDF parser — 05/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Cần parse PDF ra markdown có structure để Planner Agent xử lý.

**Quyết định:** MinerU Official API (free beta, 2000 trang/ngày). Gọi qua REST: upload file → trigger extract → poll kết quả → trả markdown.

**Hệ quả:** Cần `PDF_MINERU_BASE_URL` + `PDF_MINERU_API_KEY` trong env. Interface `lib/parsers/index.ts` (`ParsePDF`) cho phép swap parser sau mà không đổi pipeline.
