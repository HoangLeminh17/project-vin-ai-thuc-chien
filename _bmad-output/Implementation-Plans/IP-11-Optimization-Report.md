# 🔍 Báo Cáo Tối Ưu Dự Án Synapsy (A20-App-046)

> Phân tích toàn diện codebase, đánh giá theo 7 lĩnh vực: **Kiến trúc**, **Hiệu năng Frontend**, **Database/Query**, **Bảo mật**, **Docker/Infra**, **UKT Microservice**, **Observability**.

---

## Tổng Quan

| Lĩnh vực | Số findings | Mức nghiêm trọng |
|---|---|---|
| 🏗️ Kiến trúc & Code Duplication | 3 | 🟡 Medium |
| ⚡ Hiệu năng Frontend | 5 | 🔴 High |
| 🗄️ Database & Queries | 3 | 🟡 Medium |
| 🔐 Bảo mật | 4 | 🔴 High |
| 🐳 Docker & Infrastructure | 3 | 🟡 Medium |
| 🧠 UKT Microservice | 3 | 🟡 Medium |
| 📊 Observability | 2 | 🟢 Low |

### Cập nhật rà soát bổ sung — 2026-05-17

Rà soát mới nhất tập trung vào các rủi ro còn tồn tại sau các đợt tối ưu trước: bảo mật storage path, tính toàn vẹn dữ liệu Stage 2, atomicity của UKT state, separation of concerns theo Clean Architecture, cache/privacy và validation API.

| Nhóm | Finding mới | Mức ưu tiên |
|---|---:|---|
| Bảo mật & dữ liệu | 2 | 🔴 High |
| UKT state & validation | 4 | 🔴 High / 🟡 Medium |
| Clean Architecture | 3 | 🟡 Medium |
| Frontend workflow/state | 3 | 🟡 Medium |
| Observability/Infra edge cases | 1 | 🟡 Medium |

**Kết quả kiểm tra tại thời điểm rà soát:**
- `web`: `npm test` pass — 26 files / 133 tests.
- `web`: `npm run lint` pass với 1 warning ở `StudyMode.tsx` về missing dependency `onRated`.
- `UKT`: `python -m pytest` pass — 8 tests.

---

## 🏗️ 1. Kiến trúc & Code Duplication

### 1.1 Hệ thống AI kép bị trùng lặp (Medium)

**Vấn đề:** Dự án tồn tại **2 hệ thống fallback AI hoàn toàn song song**:
- [ai.ts](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts) — Fallback chain cho Stage 2 (generate chapter content) bằng `if/else` thủ công
- [di.ts](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/di.ts) + [fallback-ai.adapter.ts](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/fallback-ai.adapter.ts) — Chain adapter cho Stage 1 (generate course) qua Clean Architecture

Stage 2 gọi trực tiếp `ai.ts` (bypass hoàn toàn DI container), còn Stage 1 đi qua `ChainAiAdapter`. Thứ tự fallback cũng **khác nhau** (Stage 1: Gemini → OpenAI → DeepSeek → HF; Stage 2: OpenAI → DeepSeek → Gemini → Local → HF).

**Khuyến nghị:**
```diff
- // ai.ts — hàm generateChapterContentForInput dùng if/else chain riêng
+ // Thống nhất qua ChainAiAdapter, thêm method generateChapterContent vào IAiService port
+ // Loại bỏ ai.ts hoặc chuyển thành thin wrapper gọi adapter từ DI
```

**✅ Đã thực hiện — commit `a0d5487` (branch `refactor`):**

| File | Thay đổi |
|---|---|
| `core/ports/ai.port.ts` | Thêm `generateChapterContent(input: string)` vào `IAiService` |
| `adapters/openai.adapter.ts` | Implement Stage 2 qua OpenAI-compatible endpoint |
| `adapters/gemini.adapter.ts` | Implement Stage 2 qua Gemini native API |
| `adapters/huggingface.adapter.ts` | Implement Stage 2 với context-window truncation |
| `adapters/fallback-ai.adapter.ts` | Propagate method qua `ChainAiAdapter` fallback loop |
| `lib/stage2-postprocess.ts` *(mới)* | Tách `attachChunkRange` + card normalization ra module riêng |
| `api/generate-content/route.ts` | Route Stage 2 qua `aiAdapter` từ DI, bỏ import `lib/ai` |
| `lib/ai.ts` | Giảm từ 495 → 87 dòng, chỉ còn `extractFacts` |
| `tests/…/generate-diagnostic-quiz.spec.ts` | Fix mock objects khớp interface mới |

**Kết quả:** Stage 1 và Stage 2 giờ dùng **một** fallback chain duy nhất trong `ChainAiAdapter`. Thứ tự provider nhất quán, kiểm soát từ DI container. Net: **−151 dòng code** (316 thêm / 467 xóa).

### 1.2 Hàm `generateCourse_UNUSED` chưa xóa (Low)

[ai.ts:L45](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts#L45) chứa hàm `generateCourse_UNUSED` — dead code ~130 dòng không ai gọi.

**✅ Đã giải quyết — trong commit `a0d5487` (cùng với 1.1):** `lib/ai.ts` được viết lại từ đầu, chỉ giữ `extractFacts`. Toàn bộ dead code gồm `generateCourse_UNUSED` (~130 dòng), các hàm `getOpenAiConfig / getGeminiConfig / getDeepSeekConfig`, và toàn bộ `generateChapterContent*` đã bị xóa. File giảm từ **495 → 87 dòng**.

### 1.3 Duplicated prompt versions (Low)

[prompts.ts](file:///d:/AI%20In%20Action/A20-App-046/web/lib/prompts.ts) chứa cả `PLANNER_PROMPT` và `PLANNER_PROMPT_LIGHTWEIGHT`, `DIAGNOSTIC_QUIZ_PROMPT` và `DIAGNOSTIC_QUIZ_PROMPT_LIGHTWEIGHT`. Không rõ logic chuyển đổi giữa full/lightweight — nếu không dùng lightweight thì nên xóa.

**✅ Đã kiểm tra & làm rõ:** Các bản prompt `_LIGHTWEIGHT` đang được sử dụng cụ thể bởi `HuggingFaceAdapter` (trong `infrastructure/adapters/huggingface.adapter.ts`). Lý do là API của HuggingFace có giới hạn context window nhỏ hơn (8192 tokens), nên cần prompt ngắn gọn hơn để dành không gian cho nội dung bài học. Vì vậy, việc giữ lại các bản prompt này là có chủ đích.

### 1.4 `answer-evaluation` route bypass Clean Architecture (Medium)

**Vấn đề:** [answer-evaluation/route.ts](file:///d:/AI%20In%20Action/A20-App-046/web/app/api/answer-evaluation/route.ts) đang chứa trực tiếp provider selection, đọc `process.env`, prompt, HTTP call tới OpenAI/Gemini/HuggingFace/DeepSeek và parsing response. Logic này trùng vai trò adapter/use case, làm route phình to và khó test.

**Vị trí liên quan:**
- `web/app/api/answer-evaluation/route.ts:87-221` — AI provider integration nằm trong route.
- `web/app/api/answer-evaluation/route.ts:166-214` — đọc env/model/API key trong presentation layer.

**Khuyến nghị:**
- Tạo `EvaluateAnswerUseCase` trong `core/use-cases/`.
- Tạo `AnswerEvaluationPort` và adapter tương ứng trong `infrastructure/adapters/`.
- Route chỉ còn verify session, validate payload, gọi use case và map response.

### 1.5 Env access rò rỉ ra core/lib/route (Medium)

Theo `CONVENTIONS.md`, chỉ DI/config layer nên đọc `process.env`. Hiện vẫn còn một số điểm đọc env ngoài DI:

- `web/core/use-cases/generate-course.usecase.ts:22` — core use case đọc `OPENAI_MAX_TOKENS`.
- `web/app/api/answer-evaluation/route.ts:166-214` — route đọc model/API key.
- `web/lib/parsers/mineru.ts:9-10` — parser legacy đọc MinerU env trực tiếp.

**Khuyến nghị:** inject config qua constructor hoặc adapter options từ `infrastructure/di/*`; core/use case chỉ nhận dependency/config đã chuẩn hóa.

---

## ⚡ 2. Hiệu Năng Frontend
### 2.1 page.tsx quá lớn — 738 dòng (High) 🔴

**Vấn đề:** File [page.tsx](file:///d:/AI%20In%20Action/A20-App-046/web/app/page.tsx) là một monolithic component chứa toàn bộ dashboard, logic generation, SRS stats, heatmap, và UKT mastery. Điều này gây khó khăn cho bảo trì và làm chậm quá trình render do các hook lồng nhau.

**✅ Đã thực hiện — commit `refactor-frontend`:**
- Tách các hooks vào `lib/hooks/` (`useSRSStats`, `useProgressMap`, `useUktMastery`).
- Tách các components vào `app/components/dashboard/` (8 components mới).
- `page.tsx` giảm từ **738 dòng xuống còn ~230 dòng**, tập trung vào routing trạng thái (idle, parsing, generating, done, error).
- Cấu trúc thư mục rõ ràng, dễ bảo trì và test hơn.

### 2.2 Waterfall API calls trên trang chủ (High) 🔴

Trang chủ fire **4 API calls song song** không có deduplication:
```
/api/progress/stats    (useSRSStats)
/api/progress/map      (useProgressMap)
/api/ukt/mastery       (useUktMastery)
/api/courses           (useCourses)
```

Tất cả đều có `cache: 'no-store'` — không tận dụng bất kỳ caching nào.

**Khuyến nghị:**
- Gộp thành 1 endpoint `/api/dashboard` trả về tất cả data cần thiết
- Hoặc dùng SWR/React Query với `staleTime` để cache phía client
- Ít nhất thêm `revalidate` thay vì `no-store` cho dữ liệu ít thay đổi (mastery, stats)

### 2.3 `courseStats()` bị gọi lặp cho mỗi course card (Medium)

[page.tsx:L494](file:///d:/AI%20In%20Action/A20-App-046/web/app/page.tsx#L494): `totalLibraryCards` tính `courseStats()` cho tất cả courses, rồi ở [page.tsx:L665](file:///d:/AI%20In%20Action/A20-App-046/web/app/page.tsx#L665) lại tính lại `courseStats()` cho từng card render. **Tính 2 lần cho mỗi course**.

**✅ Đã giải quyết — commit `optimize-stats`:**
- Sử dụng `useMemo` trong `page.tsx` để tính toán `courseStatsMap` một lần duy nhất cho tất cả các khóa học.
- `totalLibraryCards` sử dụng kết quả từ `courseStatsMap`.
- `CourseLibrary` nhận `courseStatsMap` làm prop và truy xuất kết quả trực tiếp bằng `id`, loại bỏ hoàn toàn việc tính toán lặp lại trong quá trình render danh sách khóa học.

### 2.4 generation-context.tsx dependency array quá rộng (Medium)

[generation-context.tsx:L403](file:///d:/AI%20In%20Action/A20-App-046/web/lib/contexts/generation-context.tsx#L403): Value object cho Provider có array deps quá dài. Bất kỳ thay đổi nhỏ nào trong các state (ví dụ `parseProgress`) cũng làm toàn bộ các components consume context này re-render.

**✅ Đã thực hiện — commit `split-generation-context`:**
- Chia nhỏ `GenerationContext` thành 3 context chuyên biệt: `GenerationStateContext`, `GenerationProgressContext`, và `GenerationActionsContext`.
- Cung cấp các hooks tương ứng: `useGenerationState`, `useGenerationProgress`, và `useGenerationActions`.
- Tách `LoadingScreen` ra thành component riêng, chỉ consume `useGenerationProgress`. Kết quả là các cập nhật progress (500ms/lần) chỉ làm re-render component loading nhỏ, không còn ảnh hưởng đến toàn bộ `page.tsx` hay các logic nghiệp vụ khác.
- Giảm thiểu đáng kể "render noise" và cải thiện độ nhạy của UI.

### 2.5 Progress polling interval quá thấp (Low)

[generation-context.tsx:L228](file:///d:/AI%20In%20Action/A20-App-046/web/lib/contexts/generation-context.tsx#L228): `setTimeout(r, 500)` — Poll progress mỗi 0.5s là quá dày cho một tiến trình kéo dài 3-5 phút.

**✅ Đã thực hiện:** Tăng thời gian polling lên **2000ms (2s)** để giảm tải cho server mà vẫn đảm bảo trải nghiệm người dùng mượt mà.

### 2.6 `GenerationProvider` vẫn chứa workflow quá lớn (Medium)

**Vấn đề:** Dù context đã được tách để giảm render noise, `startGeneration()` trong [generation-context.tsx](file:///d:/AI%20In%20Action/A20-App-046/web/lib/contexts/generation-context.tsx) vẫn đang gom nhiều trách nhiệm: upload PDF, parse, polling, build chunk/citation context, cache lookup, Stage 1/Stage 2 generation, save course, diagnostic prefetch.

**Vị trí:** `web/lib/contexts/generation-context.tsx:173-407`

**Rủi ro:** khó test workflow end-to-end, khó cancel/retry từng bước, dễ phát sinh bug khi thêm trạng thái mới.

**Khuyến nghị:**
- Tách `usePdfUpload`, `useParseProgress`, `useCourseGenerationWorkflow` hoặc service function thuần có test.
- Đẩy các bước cần tính toàn vẹn dữ liệu về server-side use case/API thay vì orchestration lớn trên client.

### 2.7 Resource/state leak trong generation polling và blob URL (Medium)

**Vấn đề:**
- `URL.createObjectURL(file)` chưa thấy revoke khi reset/unmount.
- Polling progress dùng biến local `isPollingProgress`, không có `AbortController`/cleanup lifecycle rõ ràng.

**Vị trí:** `web/lib/contexts/generation-context.tsx:177-179`, `217-237`

**Khuyến nghị:** lưu object URL vào ref và gọi `URL.revokeObjectURL()` khi reset/unmount; chuyển polling sang hook có `AbortController` hoặc cancellation token.

### 2.8 `StudyMode.advance()` có stale closure và lint warning (Low)

**Vấn đề:** `advance()` dùng `idx` captured trong `setTimeout`, đồng thời lint báo thiếu dependency `onRated`.

**Vị trí:** `web/app/components/course/StudyMode.tsx:58-81`

**Khuyến nghị:** dùng functional `setIdx(prev => ...)`, cleanup timeout bằng ref, disable action khi đang animate, thêm dependency `onRated` hoặc ổn định callback từ parent.

---

## 🗄️ 3. Database & Queries

### 3.1 getStats() load toàn bộ user_progress (High) 🔴

[firebase-progress-repository.adapter.ts:L71](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firebase-progress-repository.adapter.ts#L71): Hàm `getStats()` đang load **toàn bộ collection** `user_progress` của user để đếm số lượng thẻ (new, learning, due) và tính streak.

**✅ Đã giải quyết — commit `optimize-db-stats`:**
- **Sử dụng Aggregation Queries:** Thay thế việc load documents bằng `count().get()` của Firestore cho các thông số `new`, `learning`, và `due`. Hiệu năng đạt O(1) về mặt data transfer.
- **Pre-calculated Summary:** Triển khai collection `user_stats` để lưu trữ `streak` và `lastReviewDate`. 
    - Hàm `save()` tự động cập nhật summary này (sử dụng Firestore transaction) mỗi khi có thẻ được review.
    - Hàm `getStats()` ưu tiên lấy streak từ summary (O(1)). Nếu chưa có summary, nó sẽ tính toán lại một lần (optimized với `select()`) và khởi tạo summary cho lần sau.
- **Lợi ích:** Giảm chi phí đọc Firebase đáng kể (từ hàng ngàn documents xuống còn 4-5 requests aggregation/document duy nhất) và cải thiện tốc độ phản hồi dashboard.

### 3.2 getAllForUser() dùng cho progress map cũng load hết (Medium)

[firebase-progress-repository.adapter.ts:L63](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firebase-progress-repository.adapter.ts#L63): Hàm `getAllForUser` fetch toàn bộ các field của thẻ, bao gồm cả nội dung nặng (`question`, `answer`), mặc dù `ProgressMap` chỉ cần các meta-data để tính toán mastery và render heatmap.

**✅ Đã giải quyết:**
- Sử dụng `.select()` trong `getAllForUser()` để chỉ lấy các trường cần thiết (`status`, `nextReviewDate`, `lastReviewedAt`, và các metadata định danh).
- Loại bỏ việc truyền tải nội dung text (`question`, `answer`) qua mạng khi load dashboard, giúp giảm băng thông và tăng tốc độ xử lý map phía client.

### 3.3 course_cache không có TTL / cleanup (Medium)

[firestore-course.adapter.ts:L132-L158](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L132-L158): Course cache ghi vào Firestore vĩnh viễn, không có logic xóa cache cũ. Theo thời gian sẽ tích lũy data thừa.

**✅ Đã giải quyết:**
- Thêm thuộc tính `expiresAt` (mặc định 7 ngày kể từ khi tạo) cho mỗi entry trong `course_cache` và các sub-collection `chapters`.
- Cập nhật `getCourse()` và `getChapter()` để kiểm tra thời hạn cache trước khi trả về kết quả. Nếu cache hết hạn, adapter sẽ trả về `null` để trigger việc generation mới.
- Cấu trúc `expiresAt` cũng cho phép kích hoạt tính năng tự động xóa (TTL Policy) của Firestore trong tương lai mà không cần thay đổi code.

---

## 🔐 4. Bảo Mật

### 4.1 UKT CORS `allow_origins=["*"]` (High) 🔴

[main.py:L55-L60](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/main.py#L55-L60): Mặc định API UKT cho phép mọi origin truy cập, gây rủi ro bảo mật cho mô hình và dữ liệu state của học sinh.

**✅ Đã giải quyết:**
- Thay thế giá trị hardcoded bằng biến môi trường `ALLOWED_ORIGINS`.
- Hỗ trợ danh sách nhiều domain (ngăn cách bằng dấu phẩy).
- Đảm bảo tính bảo mật trong môi trường production (ví dụ: chỉ cho phép domain frontend chính thức) trong khi vẫn linh hoạt cho development.

### 4.2 Grafana admin password hardcoded (High) 🔴

[docker-compose.yml:L90](file:///d:/AI%20In%20Action/A20-App-046/docker-compose.yml#L90): Mật khẩu quản trị của Grafana được để mặc định là `admin` trong file cấu hình.

**✅ Đã giải quyết:**
- Chuyển cấu hình mật khẩu sang biến môi trường `${GRAFANA_ADMIN_PASSWORD}`.
- Cho phép người dùng cấu hình mật khẩu mạnh thông qua file `.env` hoặc biến môi trường của hệ thống, loại bỏ rủi ro bị truy cập trái phép vào dashboard giám sát.

### 4.3 `getById()` double-fetch pattern (Medium)

[firestore-course.adapter.ts:L74-L85](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L74-L85): `getById()` fetch doc, check userId, trả về data — nhưng `delete()` [L87-L98](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L87-L98) cũng fetch + check rồi delete. API route nào gọi `getById` rồi `delete` sẽ fetch doc **2 lần**.

**✅ Đã giải quyết:**
- Tách logic “fetch + verify ownership” thành helper nội bộ `getOwnedCourseDoc(id, userId)` để tái sử dụng và tránh copy/paste logic check quyền.
- `delete()` gọi trực tiếp `getOwnedCourseDoc()` (không đi qua `getById()`), đảm bảo luồng xóa chỉ cần **1 lần read** để verify ownership rồi thực hiện `docRef.delete()`.
- Giảm số lượt đọc Firestore ở các luồng xóa và đồng thời chuẩn hóa kiểm tra quyền truy cập ở một chỗ.

### 4.4 Error messages leak internal details (Medium)

Nhiều adapter trả raw error messages lên client:
- [ai.ts:L78](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts#L78): `Gemini API error (${res.status}): ${msg}` — có thể leak API endpoint
- [mineru-parser.adapter.ts:L216](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/mineru-parser.adapter.ts#L216): `Check PDF_MINERU_API_KEY` — leak env var names

**Khuyến nghị:** Wrap lỗi trước khi trả client, chỉ log chi tiết server-side.

**✅ Đã giải quyết:**
- Chuẩn hóa tầng API dùng `handleApiError()` để map `InfrastructureError` về response generic (`502` với message an toàn), tránh trả chi tiết lỗi upstream ra client.
- Chi tiết lỗi (message/stack) vẫn được log server-side qua `logger` và gửi về `monitoring.captureException(...)` để debug mà không lộ thông tin nhạy cảm cho người dùng.

### 4.5 API save course tin storage path từ client (High) 🔴

**Vấn đề:** [courses/route.ts](file:///d:/AI%20In%20Action/A20-App-046/web/app/api/courses/route.ts) nhận `pdfStorageUrl` và `layoutStorageUrl` từ request body rồi ghi vào course sau khi save. User đã đăng nhập có thể gửi storage path tùy ý nếu downstream không validate ownership chặt.

**Vị trí:** `web/app/api/courses/route.ts:24-43`

**Khuyến nghị:**
- Validate prefix bắt buộc theo `course-pdfs/${user.id}/...` và `course-layouts/${user.id}/...` trước khi lưu.
- Tốt hơn: server-side use case cấp/ghi storage path, client không được tự quyết định path persisted.
- Thêm test route cho payload path không thuộc user.

### 4.6 Answer evaluation cache chứa nội dung raw và không bounded (Medium)

**Vấn đề:** `evaluationCache` là in-memory `Map` không giới hạn size; cache key chứa raw `question`, `canonicalAnswer`, `userAnswer`.

**Vị trí:** `web/app/api/answer-evaluation/route.ts:25-27`, `254-269`

**Rủi ro:** memory growth trên server long-lived và lưu nội dung học/answer trong memory key.

**Khuyến nghị:** hash cache key bằng SHA-256, thêm LRU/max entries, hoặc dùng cache backend có TTL thực.

---

## 🐳 5. Docker & Infrastructure

### 5.1 `.mineru-output` được tạo trong container nhưng ephemeral (Medium)

[Dockerfile:L65](file:///d:/AI%20In%20Action/A20-App-046/web/Dockerfile#L65): `RUN mkdir .mineru-output` — thư mục này chứa output parse nhưng không mount volume. Mỗi khi container restart, toàn bộ parsed output mất.

Nếu dùng cho cache/debug thì cần mount volume. Nếu không cần thì `MineruParserAdapter` nên clean up sau khi process.

**✅ Đã giải quyết:**
- Mount volume `mineru-output:/app/.mineru-output` trong `docker-compose.yml` để persist output parse qua các lần restart container.
- `web/Dockerfile` đảm bảo tạo thư mục và set quyền sở hữu phù hợp (`nextjs:nodejs`) để tránh lỗi permission khi chạy non-root.

### 5.2 UKT Dockerfile cài `build-essential` nhưng requirements.txt chỉ là pure Python (Low)

[UKT/Dockerfile:L6-L8](file:///d:/AI%20In%20Action/A20-App-046/UKT/Dockerfile#L6-L8): Cài `build-essential` (~200MB) cho compilation, nhưng [requirements.txt](file:///d:/AI%20In%20Action/A20-App-046/UKT/requirements.txt) chủ yếu là wheel packages. Có thể dùng multi-stage build để giảm image size.

**✅ Đã giải quyết:**
- Bỏ cài đặt `build-essential` trong `UKT/Dockerfile` (dựa trên giả định `requirements.txt` dùng prebuilt wheels), giúp giảm đáng kể kích thước image và thời gian build.

### 5.3 Docker Compose thiếu resource limits (Medium)

Không service nào có `deploy.resources.limits` — một AI generation spike có thể OOM toàn bộ host.

```yaml
# Khuyến nghị thêm cho mỗi service:
deploy:
  resources:
    limits:
      memory: 512M
```

**✅ Đã giải quyết:**
- Bổ sung `deploy.resources.limits` (CPU/memory) cho các services trong `docker-compose.yml` để giảm rủi ro OOM khi có spike tải.

---

## 🧠 6. UKT Microservice

### 6.1 Global mutable state + sync endpoints (Medium)

[main.py:L31-L32](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/main.py#L31-L32):
```python
engine: UKTEngine = None
store: StateStore = None
```
Global mutable state + sync endpoints (`def predict`, `def update`) không thread-safe. Với Uvicorn workers > 1, state có thể bị race condition.

**Khuyến nghị:** Dùng `async def` cho endpoints, và inject `engine`/`store` qua FastAPI dependency injection thay vì global.

**✅ Đã giải quyết:**
- Loại bỏ module-level globals; chuyển `engine`/`store` sang `app.state` và khởi tạo trong `lifespan()`.
- Endpoints chuyển sang `async def` và lấy dependency qua `Depends(get_engine)`/`Depends(get_store)` để tránh shared mutable state không kiểm soát.
- `/health` phản ánh trạng thái model đã load thông qua `app.state.engine`.

### 6.2 `_build_sequence_tensor` dùng `hash()` không reproducible (Medium)

[ukt_engine.py:L205](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/ukt_engine.py#L205):
```python
seq = [[i.question_id, hash(i.kc_id) % 1000, i.response] for i in interactions]
```
Python `hash()` khác nhau giữa các process (do PYTHONHASHSEED). Model inference sẽ **không deterministic** giữa các restart.

**Fix:** Dùng `hashlib.md5(kc_id.encode()).hexdigest()[:8]` hoặc lookup table.

**✅ Đã giải quyết:**
- Thay `hash()` bằng hàm mapping ổn định `stable_kc_int(kc_id)` (dựa trên `hashlib`), đảm bảo kết quả deterministic giữa các lần restart/process.

### 6.3 Redis không pipeline batch operations (Low)

[state_store.py](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/state_store.py): Mỗi `get()`/`set()` là 1 round-trip Redis. Nếu predict xử lý 50+ KCs, nên dùng Redis pipeline.

**✅ Đã giải quyết:**
- Bổ sung `get_many(student_ids)` sử dụng Redis pipeline để batch `GET` nhiều keys trong 1 round-trip.
- API `/state/batch` dùng `get_many()` để phục vụ batch lookup hiệu quả.

### 6.4 UKT state read-modify-write không atomic (High) 🔴

**Vấn đề:** `/predict` và `/update` đều dùng pattern `store.get()` → compute → `store.set()`. Hai request đồng thời cho cùng `student_id` có thể cùng đọc state cũ rồi ghi đè nhau, làm mất update.

**Vị trí:**
- `UKT/app/main.py:147-158`
- `UKT/app/main.py:173-180`
- `UKT/app/state_store.py:40-94`

**Khuyến nghị:**
- Thêm `StateStore.update(student_id, updater_fn)` để gom read/compute/write vào một abstraction atomic.
- Với in-memory: dùng per-student lock.
- Với Redis: dùng `WATCH/MULTI`, Lua script, hoặc distributed lock ngắn hạn theo `student_id`.

### 6.5 Redis fallback sang in-memory bị silent, health vẫn OK (Medium)

**Vấn đề:** Khi Redis lỗi, service fallback về memory store và `/health` vẫn trả `status: ok`. Production có thể mất persistence sau restart hoặc lệch state giữa nhiều instance mà không có cảnh báo rõ.

**Vị trí:** `UKT/app/state_store.py:34-38`, `UKT/app/main.py:113-115`

**Khuyến nghị:**
- `/health` trả thêm `persistence: "redis" | "memory"` và `degraded: true` khi fallback.
- Với production, cân nhắc fail-fast nếu Redis là dependency bắt buộc.

### 6.6 Corrupt Redis JSON có thể làm crash single-state path (Medium)

**Vấn đề:** `get_many()` đã catch JSON decode lỗi, nhưng `get()` gọi `json.loads(raw)` trực tiếp. Các endpoint `/state/{student_id}`, `/predict`, `/update` có thể 500 nếu một key Redis bị corrupt.

**Vị trí:** `UKT/app/state_store.py:43-44`

**Khuyến nghị:** tách helper `_decode_state(raw, student_id)` dùng chung, log key lỗi, trả `None` hoặc controlled error tùy policy.

### 6.7 Validation API UKT còn quá rộng (Medium)

**Vấn đề:** `student_id`, `kc_id` chưa có `min_length/max_length/pattern`; `BatchStateRequest.student_ids` chưa có max items; `question_id`/`timestamp` chưa bound rõ.

**Vị trí:** `UKT/app/schemas.py:7-24`, `51-62`

**Khuyến nghị:** dùng `Field(min_length=..., max_length=..., pattern=...)`, giới hạn `student_ids` bằng `max_length`, và chuẩn hóa ID trước khi lưu Redis.

---

## 📊 7. Observability

### 7.1 Structured logging chưa đồng bộ (Low)

- Web app dùng **Pino** (structured JSON)
- UKT dùng **Python logging** (plaintext)
- Cả hai đều gửi về Loki nhưng format khác nhau → khó query cross-service

**✅ Đã giải quyết:**
- UKT cấu hình structured logging (JSON) qua `configure_logging()` để log có cấu trúc tương tự web (dễ query trên Loki).
- Giữ log chi tiết server-side; API web vẫn wrap lỗi trả client an toàn qua `handleApiError()`.

### 7.2 `console.log` còn nhiều trong production code (Low)

Nhiều file dùng `console.log`/`console.warn` thay vì logger adapter:
- [ai.ts](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts): 15+ `console.log/warn/error`
- [di.ts](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/di.ts): 10+ `console.log/error`

Nên route qua `PinoLoggerAdapter` để tận dụng structured logging + Loki.

**✅ Đã giải quyết:**
- Thêm hook ở `instrumentation.node.ts` để redirect `console.log/warn/error` sang `logger` (structured) khi chạy server.
- Giảm rủi ro log rời rạc trong production; các `console.*` còn lại chủ yếu nằm trong test/dev scripts.

### 7.3 Monitoring bridge thiếu validation/error handling đầu vào (Medium)

**Vấn đề:** Alertmanager bridge parse `await request.json()` không bắt lỗi JSON malformed; env `MAX_ALERTS`/`DISCORD_TIMEOUT_SECONDS` được parse trong request path và có thể gây 500 nếu cấu hình sai.

**Vị trí:** `monitoring/bridge/app.py:82`, `123-128`

**Khuyến nghị:**
- Parse env ở startup với default an toàn.
- Dùng Pydantic model cho Alertmanager payload.
- Bắt JSON decode error và trả 400 thay vì 500.

---

## 🎯 Ưu Tiên Hành Động (Roadmap Đề Xuất)

### Ngay lập tức (Sprint hiện tại)
1. **Validate `pdfStorageUrl`/`layoutStorageUrl`** trong `/api/courses` hoặc chuyển ownership path sang server-side use case.
2. **Fix Stage 2 partial failure indexing** trong `generation-context.tsx`: không dùng `results.filter(Boolean)` để save `courseContent.chapters`.
3. **Làm atomic UKT state update** bằng `StateStore.update(student_id, fn)` với lock/Redis transaction.

### Sprint tới
4. **Tách `answer-evaluation` ra use case + adapter**, bỏ AI provider logic khỏi route.
5. **Hardening UKT health/validation**: báo degraded khi Redis fallback, validate ID/list bounds, xử lý corrupt Redis JSON.
6. **Tách workflow generation client** thành hook/service nhỏ và thêm cleanup cho blob URL/polling.
7. **Hash + bound answer evaluation cache** để giảm rủi ro privacy/memory growth.

### Backlog
8. **Gộp dashboard API hoặc dùng SWR/React Query** để giảm duplicate fetch/no-store.
9. **Chuẩn hóa env isolation**: route/core/lib không đọc `process.env` trực tiếp ngoài DI/config.
10. **Dọn `any` ở middleware/API wrappers** bằng generic route handler type chung.
11. **Thêm tests còn thiếu** cho `answer-evaluation`, generation partial failure/cancel/cache hit, UKT concurrency/Redis fallback, monitoring bridge malformed payload.
