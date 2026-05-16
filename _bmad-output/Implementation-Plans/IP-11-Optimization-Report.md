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

---

## 🗄️ 3. Database & Queries

### 3.1 `getStats()` load toàn bộ user_progress (High) 🔴

[firebase-progress-repository.adapter.ts:L71-L97](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firebase-progress-repository.adapter.ts#L71-L97):

```ts
const snapshot = await getDb()
  .collection(this.collectionName)
  .where('userId', '==', userId)
  .get(); // ← LOAD TẤT CẢ documents
```

Nếu user có 500+ thẻ, mỗi lần vào trang chủ sẽ đọc **toàn bộ** rồi filter trong JS. Chi phí Firestore reads tăng tuyến tính.

**Khuyến nghị:**
- Duy trì counter doc `user_stats/{userId}` được update atomic mỗi khi review
- Hoặc dùng Firestore aggregation queries (countDocuments)

### 3.2 `getAllForUser()` dùng cho progress map cũng load hết (Medium)

Tương tự vấn đề trên. [firebase-progress-repository.adapter.ts:L63-L69](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firebase-progress-repository.adapter.ts#L63-L69) load toàn bộ user_progress chỉ để build một map status.

### 3.3 `course_cache` không có TTL / cleanup (Medium)

[firestore-course.adapter.ts:L132-L158](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L132-L158): Course cache ghi vào Firestore vĩnh viễn, không có logic xóa cache cũ. Theo thời gian sẽ tích lũy data thừa.

---

## 🔐 4. Bảo Mật

### 4.1 UKT CORS `allow_origins=["*"]` (High) 🔴

[main.py:L55-L60](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/main.py#L55-L60):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # production: chỉ định domain frontend
)
```
Comment thừa nhận vấn đề nhưng chưa fix. Trong production, bất kỳ domain nào cũng có thể gọi API UKT.

### 4.2 Grafana admin password hardcoded (High) 🔴

[docker-compose.yml:L90](file:///d:/AI%20In%20Action/A20-App-046/docker-compose.yml#L90):
```yaml
- GF_SECURITY_ADMIN_PASSWORD=admin
```
Password `admin` trong plaintext. Cần chuyển sang env var.

### 4.3 `getById()` double-fetch pattern (Medium)

[firestore-course.adapter.ts:L74-L85](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L74-L85): `getById()` fetch doc, check userId, trả về data — nhưng `delete()` [L87-L98](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/firestore-course.adapter.ts#L87-L98) cũng fetch + check rồi delete. API route nào gọi `getById` rồi `delete` sẽ fetch doc **2 lần**.

### 4.4 Error messages leak internal details (Medium)

Nhiều adapter trả raw error messages lên client:
- [ai.ts:L78](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts#L78): `Gemini API error (${res.status}): ${msg}` — có thể leak API endpoint
- [mineru-parser.adapter.ts:L216](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/adapters/mineru-parser.adapter.ts#L216): `Check PDF_MINERU_API_KEY` — leak env var names

**Khuyến nghị:** Wrap lỗi trước khi trả client, chỉ log chi tiết server-side.

---

## 🐳 5. Docker & Infrastructure

### 5.1 `.mineru-output` được tạo trong container nhưng ephemeral (Medium)

[Dockerfile:L65](file:///d:/AI%20In%20Action/A20-App-046/web/Dockerfile#L65): `RUN mkdir .mineru-output` — thư mục này chứa output parse nhưng không mount volume. Mỗi khi container restart, toàn bộ parsed output mất.

Nếu dùng cho cache/debug thì cần mount volume. Nếu không cần thì `MineruParserAdapter` nên clean up sau khi process.

### 5.2 UKT Dockerfile cài `build-essential` nhưng requirements.txt chỉ là pure Python (Low)

[UKT/Dockerfile:L6-L8](file:///d:/AI%20In%20Action/A20-App-046/UKT/Dockerfile#L6-L8): Cài `build-essential` (~200MB) cho compilation, nhưng [requirements.txt](file:///d:/AI%20In%20Action/A20-App-046/UKT/requirements.txt) chủ yếu là wheel packages. Có thể dùng multi-stage build để giảm image size.

### 5.3 Docker Compose thiếu resource limits (Medium)

Không service nào có `deploy.resources.limits` — một AI generation spike có thể OOM toàn bộ host.

```yaml
# Khuyến nghị thêm cho mỗi service:
deploy:
  resources:
    limits:
      memory: 512M
```

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

### 6.2 `_build_sequence_tensor` dùng `hash()` không reproducible (Medium)

[ukt_engine.py:L205](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/ukt_engine.py#L205):
```python
seq = [[i.question_id, hash(i.kc_id) % 1000, i.response] for i in interactions]
```
Python `hash()` khác nhau giữa các process (do PYTHONHASHSEED). Model inference sẽ **không deterministic** giữa các restart.

**Fix:** Dùng `hashlib.md5(kc_id.encode()).hexdigest()[:8]` hoặc lookup table.

### 6.3 Redis không pipeline batch operations (Low)

[state_store.py](file:///d:/AI%20In%20Action/A20-App-046/UKT/app/state_store.py): Mỗi `get()`/`set()` là 1 round-trip Redis. Nếu predict xử lý 50+ KCs, nên dùng Redis pipeline.

---

## 📊 7. Observability

### 7.1 Structured logging chưa đồng bộ (Low)

- Web app dùng **Pino** (structured JSON)
- UKT dùng **Python logging** (plaintext)
- Cả hai đều gửi về Loki nhưng format khác nhau → khó query cross-service

### 7.2 `console.log` còn nhiều trong production code (Low)

Nhiều file dùng `console.log`/`console.warn` thay vì logger adapter:
- [ai.ts](file:///d:/AI%20In%20Action/A20-App-046/web/lib/ai.ts): 15+ `console.log/warn/error`
- [di.ts](file:///d:/AI%20In%20Action/A20-App-046/web/infrastructure/di.ts): 10+ `console.log/error`

Nên route qua `PinoLoggerAdapter` để tận dụng structured logging + Loki.

---

## 🎯 Ưu Tiên Hành Động (Roadmap Đề Xuất)

### Ngay lập tức (Sprint hiện tại)
1. **Fix CORS wildcard** trên UKT → chỉ cho phép domain frontend
2. **Đổi Grafana admin password** → env var
3. **Tăng polling interval** 500ms → 3000ms

### Sprint tới
4. **Gộp dashboard API** → giảm 4 calls thành 1
5. **Tách `page.tsx`** → component tree hợp lý
6. **Thêm stats counter doc** → tránh full-scan getStats()
7. **Fix `hash()` trong UKT** → deterministic hashing

### Backlog
8. **Thống nhất AI fallback chain** → loại bỏ duplicate logic
9. **Xóa dead code** (`generateCourse_UNUSED`, unused prompts)
10. **Docker resource limits** + multi-stage UKT build
11. **Route console.log** qua structured logger
