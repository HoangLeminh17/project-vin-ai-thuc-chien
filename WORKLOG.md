# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi. Sắp xếp **mới nhất ở trên cùng**.

---

### [ADR-33] Chunked Stage 2 generation for oversized chapters — 10/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** local implementation

**Bối cảnh:** Stage 2 (`generate-content`) already works chapter-by-chapter, but a single chapter can still exceed the model context window when it contains too many lessons or very large raw contexts.

**Quyết định:**
- Tách chapter input thành các lesson batches trước khi gọi model khi payload vượt ngưỡng an toàn.
- Merge lại các partial lesson outputs theo đúng thứ tự gốc.
- Gộp quiz questions từ các batch, khử trùng lặp theo question text, rồi giới hạn output hợp lệ cho chapter.

**Kết quả:** Stage 2 giữ nguyên API contract, nhưng có fallback an toàn hơn cho chapter quá lớn.

### [ADR-32] Chunked Stage 1 generation for oversized markdown — 10/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** local implementation

**Bối cảnh:** `generate-course` có thể vượt context window khi PDF parse ra markdown quá dài, dẫn đến lỗi token limit trước khi course outline được tạo.

**Quyết định:**
- Chia markdown lớn thành các chunk theo boundary gần nhất trước khi gọi planner.
- Gọi AI planner từng chunk, rồi merge lại thành một course outline duy nhất.
- Giữ usage logging trên đường đi mới và thêm test cho small input, large input, và invalid input.

**Ghi chú:** Stage 2 generate-per-chapter đã có sẵn ở `generate-content`; thay đổi này tập trung chặn token overflow ở Stage 1.
### [Fix] Edge Case Hunting & Reliability Improvements — 10/05/2026

**Người làm:** Antigravity (BMAD Agent) | **Ref:** ECH Review report

**Bối cảnh:** Sau khi chạy `bmad-review-edge-case-hunter`, phát hiện một số điểm yếu trong luồng xử lý JSON và fallback nội dung có thể gây crash hoặc hiển thị lỗi `[object Object]` cho người dùng.

**Các thay đổi:**
1.  **Bảo vệ JSON Parsing:** Thêm try-catch cho tất cả các lệnh `req.json()` tại các API route chính (`generate-course`, `generate-content`).
2.  **Fix Fallback Content:** Sửa logic tại `/api/generate-content` để xử lý đúng format `OutlinePoint[]` mới, tránh việc hiển thị `[object Object]` khi AI gặp lỗi và phải dùng nội dung dự phòng.
3.  **Validation Context:** Thêm kiểm tra độ dài `rawContexts` trong `lib/ai.ts` để đảm bảo trích dẫn nguồn (citation) không bị gán nhầm bài học khi dữ liệu đầu vào không khớp.

**Kết quả:** Hệ thống chịu lỗi tốt hơn, UI không bị vỡ khi gặp sự cố mạng hoặc lỗi AI provider.

---

## Sprint 6 — 04/05 → 10/05/2026

| Task | Người làm | PR |
|---|---|---|
| Source Base Cleanup & Documentation Reorg | Lê Kim Dũng | #cleanup-01 |
| Redesign `/course/[id]` — Master-Detail CourseTree | Nguyễn Bình Thành | #53, #54, #55 |
| Railway Deployment & Grafana Monitoring | Lê Kim Dũng | #monitoring-01 |
| ... (giữ nguyên các task khác) ... | | |

---

### [ADR-33] Observability Stack (Prometheus & Grafana) trên Railway — 09/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** Conversation b925e6e2-c45f-4cb7-93c6-4098111a0c09

**Bối cảnh:** Hệ thống cần khả năng giám sát thời gian thực về hiệu năng, tỷ lệ lỗi AI, và tình trạng tài nguyên. Việc deploy manual hoặc dùng log đơn thuần không đủ để DevOps theo dõi sức khỏe hệ thống trên môi trường production (Railway).

**Quyết định:** Triển khai ngăn xếp giám sát (Observability Stack) tách biệt:
1.  **Prometheus**: Thu thập metrics từ Web App và UKT Service qua các endpoints `/api/metrics`. Cấu hình scraper với interval 15s.
2.  **Grafana**: Trực quan hóa dữ liệu. Tự động kết nối Prometheus làm Data Source qua cấu hình provisioning.
3.  **Deployment**: Đóng gói thành các Docker service riêng biệt trong thư mục `monitoring/`, deploy lên Railway dưới dạng các service phụ trợ.
4.  **Data Persistence**: Sử dụng Railway Volumes (`/prometheus`) để giữ lại dữ liệu lịch sử metrics khi service khởi động lại.

**Hệ quả:**
- ✅ Theo dõi được latency, token usage, và error rates của AI theo thời gian thực.
- ✅ Cảnh báo (Alerting) có thể cấu hình qua Prometheus Alertmanager gửi về Discord.
- ⚠️ Tăng chi phí tài nguyên trên Railway (cần thêm 2 service chạy 24/7).

---

### [ADR-32] Source Base Cleanup & Documentation Reorganization — 10/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** Báo cáo dọn dẹp hệ thống

**Bối cảnh:** Sau một thời gian phát triển nhanh, repository tích tụ nhiều file rác, tệp tạm và cấu hình dư thừa từ nhiều công cụ AI khác nhau (Claude, Cursor, Codex). Tài liệu hướng dẫn cũng bị phân mảnh ở nhiều file (`README.md`, `index.md`, `ARCHITECTURE.md`, `ARCHITECTURE_VISUAL.md`).

**Các hành động đã thực hiện:**
1.  **Dọn dẹp tệp rác & Bảo mật:**
    - Xóa thư mục `me/` chứa Firebase Service Account Key (chuyển sang quản lý qua Env).
    - Xóa `prometheus.yml` dư thừa ở root (giữ lại bản trong `monitoring/`).
    - Xóa các tệp tạm: `build_log.txt`, `image.png`.
    - Xóa các thư mục cache & IDE trash: `.claude`, `.cursor`, `.codex`, `.ai-log`, `.pytest_cache`, `.ruff_cache`.
2.  **Tái cấu trúc tài liệu (Documentation Reorg):**
    - Gộp `index.md` (mục lục) vào `README.md`.
    - Tích hợp sơ đồ Mermaid từ `ARCHITECTURE_VISUAL.md` vào `ARCHITECTURE.md`.
    - Tách các quy tắc code (Coding Rules/Conventions) từ `ARCHITECTURE.md` ra một file riêng là **`CONVENTIONS.md`** đặt tại thư mục root để dễ tra cứu.
3.  **Bảo toàn cấu trúc:**
    - Khôi phục các file route/page bị xóa nhầm trong quá trình quét tự động (`app/api/courses/[id]`, `app/course/[id]`).
    - Thêm `.gitkeep` vào các thư mục placeholder trống (`public/uploads`, `UKT/model/checkpoints`) để tránh bị xóa trong tương lai.

**Kết quả:** 
- Source base sạch sẽ, tập trung vào logic nghiệp vụ.
- Tài liệu được phân cấp rõ ràng: `README` (Tổng quan), `ARCHITECTURE` (Bản đồ hệ thống), `CONVENTIONS` (Quy chuẩn code).
- Hệ thống vượt qua 73/73 unit tests sau khi dọn dẹp.

---

### [ADR-31] Legacy outline cache bypass — 09/05/2026


**Người làm:** Nguyễn Bình Thành | **Ref:** PR #73, #76

**Bối cảnh:** Sau khi deploy OutlinePoint schema (PR #70), user re-upload PDF cũ vẫn nhận concept cards không có `[chunk-X-Y]` markers. Hai cache layer độc lập cùng gây ra vấn đề.

**Ba bug được tìm và fix:**

**Bug 1 — Stage 2 cache bypass không đủ (PR #73):**
`generate-content` vẫn trả cached chapter cũ dù frontend detect legacy outline. Fix: thêm `isLegacyOutline` check trong route — nếu chapter's lessons có legacy outline → skip `getChapter()` cache.

**Bug 2 — Stage 1 cache vẫn trả outline rỗng (PR #76 — root cause):**
Ngay cả khi Stage 2 được regenerate, `generate-course` vẫn trả cached Course với `string[]` outline. Khi normalize → `OutlinePoint[]{chunks:[]}` → AI Stage 2 không có chunk IDs nào để cite → cards generate ra không có markers.
Fix: sau khi nhận response từ `generate-course`, nếu detect `isLegacyOutline` → gọi lại ngay với `force:true` để bypass Stage 1 cache và chạy Planner AI lại → outline mới có chunk IDs thực.

**Bug 3 — Diagnostic quiz không bao giờ save (PR #73):**
`runDiagnosticPrefetch` check `data.questions?.length` nhưng API trả `{ quiz: { questions: [] }, tokens }`. Fix: đổi thành `data.quiz?.questions?.length`.

**Quyết định thiết kế:**
- Không xóa cache cũ thủ công — detect và bypass tự động
- `force:true` trong `generate-course` là escape hatch dùng lại được cho các trường hợp khác
- Stage 2 cache vẫn hữu ích cho courses mới (OutlinePoint format) — chỉ bypass khi legacy

⚠️ **Known issue còn lại:** Cache bypass đang không hoàn toàn reliable trong một số edge case — cần theo dõi thêm.

---

### [ADR-30] Citation marker per claim trong ConceptCard — 09/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #70, #71

**Bối cảnh:** Người dùng không biết câu trả lời trong ConceptCard lấy từ đoạn nào trong PDF gốc. Cần cơ chế truy vết từng câu tuyên bố (`answer`, `detail`) về đúng chunk nguồn, đồng thời cho phép click vào để nhảy đến đoạn tương ứng trong `PdfPanel`.

**Ba quyết định:**

**1. `OutlinePoint` mang `chunks[]` xuyên Stage 1 → Stage 2**

Thay vì `outline: string[]`, Stage 1 (planner) giờ trả về `outline: OutlinePoint[]` với `{ point: string; chunks: string[] }`. Mỗi điểm outline gắn với danh sách chunk ID mà nó xuất phát từ đó. Stage 2 (generator) nhận `chunks[]` làm "nguồn được phép trích dẫn" cho từng điểm — giúp LLM biết chính xác chunk nào hợp lệ để chèn marker, tránh tự bịa chunk ID.

Lý do không truyền toàn bộ `content_list` vào prompt Stage 2: quá lớn, tốn token. Truyền chỉ `chunks[]` của outline là đủ và sạch hơn.

**2. Marker `[chunk-X-Y]` nhúng inline thay vì mảng citations riêng**

Marker được chèn trực tiếp sau mỗi câu tuyên bố trong `answer`/`detail` (ví dụ: `"Câu trả lời.[chunk-1-5]"`), không lưu thành một mảng `citations: []` tách biệt.

Lý do chọn inline: (a) Giữ nguyên schema `ConceptCard` hiện tại — không thêm field mới; (b) Dễ render từng vị trí superscript đúng chỗ trong văn bản; (c) Backward compatible — text cũ không có marker vẫn render bình thường.

Validation: Sau mỗi `generateChapterContent`, `validateCitationMarkers()` (trong `lib/citation-utils.ts`) kiểm tra từng marker. Marker không nằm trong `validChunkIds` → `console.warn`, giữ nguyên text (không throw, không xóa marker).

**3. FE dùng single-chunk override lên lesson-range highlight**

`PdfPanel` nhận hai nguồn highlight: (`chunkStart`, `chunkEnd`) từ lesson-level navigation và `selectedChunkId` từ click marker. Khi cả hai có giá trị, `selectedChunkId` thắng hoàn toàn:

```ts
const scrollTarget    = selectedChunkId ?? chunkStart ?? null
const highlightStart  = selectedChunkId ?? chunkStart ?? null
const highlightEnd    = selectedChunkId ?? chunkEnd   ?? null
```

Lý do: Lesson-range highlight hữu ích khi mở PdfPanel lần đầu (hiện toàn bộ đoạn nguồn). Khi user click marker cụ thể, họ muốn focus chính xác 1 chunk đó, không phải cả range.

---

### [ADR-29] Direct client-side Firebase upload cho PDF + layout JSON persistence — 09/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR fix/citation-ui-storage

**Bối cảnh:** Sau PR #65 (citation source excerpt), phát hiện 2 bug độc lập chặn toàn bộ citation panel:

**Bug 1 — UI Citation không hiện:** `hasCitation` dùng điều kiện `source_chunk_id || sourceExcerpt`. AI đôi khi không trả về `sourceExcerpt`, khiến button ① ẩn dù `source_chunk_id` hợp lệ.
Fix: Đổi guard thành `!!card?.concept.source_chunk_id` — chỉ cần chunk ID là đủ để navigate.

**Bug 2 — `pdfStorageUrl` không bao giờ được lưu vào Firestore:** `generation-context.tsx` tạo `URL.createObjectURL(file)` (blob URL trong browser) rồi gửi lên server trong JSON body. Server dùng `fs.readFile(blobUrl)` → Node.js không đọc được blob URL → ENOENT → silent fail → Firestore không có `pdfStorageUrl`.

**Quyết định: Client-side upload thẳng lên Firebase Storage**

Lý do chọn thay vì server-side:
- Blob URL chỉ sống trong browser session — không thể gửi lên server
- Vercel limit 4.5MB body cho API routes — không thể gửi file qua FormData + JSON
- Client đã có Firebase Auth token → `uploadBytes()` trực tiếp không cần proxy

Flow mới:
1. `URL.createObjectURL(file)` → `pdfLocalPath` (blob URL, dùng trong session hiện tại)
2. `uploadBytes(ref, file)` → `course-pdfs/{uid}/{uuid}.pdf` → `pdfStorageUrl = ref.fullPath`
3. Sau `parse-pdf` trả về, upload `contentList` JSON → `course-layouts/{uid}/{uuid}.json` → `layoutStorageUrl`
4. Cả `pdfStorageUrl` và `layoutStorageUrl` được lưu vào Firestore qua `updatePdfUrl` và `updateLayoutUrl`
5. `/api/pdf-serve?courseId=X` proxy đọc `pdfStorageUrl` từ Firestore, download qua Admin SDK, stream về browser

`layoutStorageUrl` chuẩn bị cho Phase 3 (bbox highlighting dùng MinerU `content_list.json`).

---

### [ADR-28] Fix pipeline tracker stuck + lesson list — 08/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #64

**Triệu chứng ban đầu:** Pipeline tracker hiện `Tạo concept cards · 0/2` không tiến, `/api/generate-content` không được gọi, generate-course trả về 872ms (nghi cache hit).

**Ba bug được tìm và fix:**

**Bug 1 — `setCourseContentMap` bị bỏ sót (nhánh existing course):**
Khi user re-upload PDF đã có trong Firestore, code build `map` từ `existing.courseContent` để truyền vào `runDiagnosticPrefetch` nhưng quên gọi `setCourseContentMap(map)`. Early return với `courseContentMap = {}` → tracker stuck mãi.
Fix: Thêm `setCourseContentMap(map)` trước khi early return.

**Bug 2 — Guard `chapters.length` bị thiếu:**
`getFullCachedCourse` trả `{ chapters: [] }` (object truthy) khi Stage 1 cache có nhưng Stage 2 chưa generate. Cả hai nhánh "existing" và "fromCache" thiếu kiểm tra `chapters.length > 0` → nhảy vào cache path với map rỗng, stuck lại.
Fix: Đổi điều kiện thành `existing.courseContent?.chapters?.length` và `data.courseContent?.chapters?.length`.

**Bug 3 — Lesson list không hiển thị trong GenerationScreen:**
Chapter cards chỉ show title + trạng thái, không hiện lesson list dù Stage 1 đã có `course.chapters[ci].lessons[]`. User mất feedback về nội dung đang generate.
Fix: Luôn render lesson list dưới mỗi chapter card: `○` pending → `◉` loading → `✓` done.

**Thay đổi kèm:** Cập nhật `PIPELINE.md` faithful với thực tế — sơ đồ flow đầy đủ, bảng caching 2 tầng, 4 nhánh `startGeneration` với guard condition.

---

### [ADR-27] In-memory TTL cache cho VerifySessionUseCase — 08/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #63

**Bối cảnh:** Mỗi API request đều gọi `VerifySessionUseCase.execute()` để xác thực session cookie. Mỗi lần verify gọi Firebase Admin `auth.verifySessionCookie()` tốn ~400–600ms. Với một trang như thư viện load đồng thời nhiều API (courses, progress/stats, progress/map…), mỗi request đều bị cộng thêm latency này.

**Quyết định: Module-level Map cache với TTL 5 phút**

- `sessionCache` là `Map<string, { user: User; expiresAt: number }>` khai báo ở module scope của `verify-session.usecase.ts` — sống theo Node.js process, clear khi restart server.
- Cache key = session cookie value (chuỗi JWT dài, đủ unique theo session).
- TTL = 5 phút: ngắn hơn nhiều so với Firebase session expiry (1 tuần), đủ an toàn nếu token bị revoke.
- Cache hit: return `cached.user` ngay, không gọi Firebase.
- Cache miss hoặc hết TTL: gọi Firebase → lưu kết quả mới.
- Verify thất bại: `sessionCache.delete(key)` để evict entry cũ (tránh serve stale data nếu token vừa bị revoke).

**Lý do đặt cache ở use case thay vì adapter:** Task yêu cầu cache "kết quả VerifySessionUseCase" — tức là cache ở tầng use case, không phải tầng infrastructure. `Map` là stdlib JavaScript, không vi phạm "no external deps" của core layer.

---

### [ADR-26] Optimistic update cho xóa course — 08/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #62

**Bối cảnh:** Flow xóa course cũ: gọi DELETE API → chờ response (~1–2s) → gọi GET /api/courses để refresh → UI mới cập nhật. User phải đợi latency của 2 round-trip trước khi thấy kết quả.

**Quyết định: Optimistic update trong `useCourses` hook**

- Dùng functional `setCourses(prev => ...)` để capture snapshot và filter ngay lập tức — UI cập nhật tức thì, không chờ network.
- Gọi DELETE API ngầm sau đó.
- Thành công: không cần gọi `refresh()` thêm — state đã đúng từ bước optimistic.
- Thất bại: `setCourses(snapshot)` để revert về danh sách cũ + `setError(...)` để hiện banner lỗi trong library section.
- Loại bỏ `refresh()` khỏi success path của `deleteCourse`, `refresh` cũng được bỏ khỏi dependency array của callback này.

**Lý do không tạo toast riêng:** Hook đã có `error` state được consumer đọc; reuse tránh thêm dependency và component mới không cần thiết.

**Kết quả đo thực tế (network tab):**

| | Trước PR #62 | Sau PR #62 |
|---|---|---|
| Network calls | DELETE (1623ms) → GET (700ms) | DELETE (840ms) |
| Tổng latency user thấy | ~2.3s | ~0ms (optimistic) |
| DELETE time | 1623ms | 840ms — giảm ~48% |

Lý do DELETE nhanh hơn: bỏ được overhead chờ serial response chain (trước đây GET phải đợi DELETE xong mới fire, tạo head-of-line blocking trên cùng connection).

---

### [ADR-25] Redesign trang khóa học thành Master-Detail — 07/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #53, #54, #55

**Bối cảnh:** Trang `/course/[id]` theo thiết kế cũ buộc user phải điều hướng qua nhiều lớp màn hình: CourseTree → click lesson → LessonView (3 tab: Thẻ/Học/Sửa). Mỗi lần click lesson là mất toàn bộ context của cây bài học. Nút "Ôn" nằm trong từng bài riêng lẻ khiến không có cách ôn toàn bộ thẻ due trong một phiên. Thiết kế Synapsy Prototype (handoff từ Claude Design) đề xuất bố cục Master-Detail giải quyết 3 vấn đề này cùng lúc.

**Các quyết định:**

**1. Layout Master-Detail 2 cột cố định**
- Trái (300px): `CourseTree` là navigation panel cố định — chapters accordion → lessons accordion → thẻ inline. Click lesson → expand ngay tại chỗ, không navigate sang trang khác.
- Phải (flex-1): Detail pane — click thẻ bất kỳ → hiện nội dung thẻ ngay bên phải.
- Lý do: User thấy toàn bộ cây bài học và nội dung thẻ đồng thời, không mất context.

**2. Xóa LessonView và 3 tab Thẻ/Học/Sửa**
- `LessonView.tsx` bị xóa hoàn toàn. Tab "Thẻ" (browse) không còn cần thiết vì thẻ đã hiện inline trong cây.
- Detail pane bên phải có tab `Sửa / Học` ở đầu pane: Sửa = `EditMode` không có card list (tree IS the list), Học = `StudyMode` cho bài học đó.
- Lý do: Bố cục cũ buộc user chọn 1 trong 3 tab rồi mới thấy nội dung. Bố cục mới loại bỏ bước trung gian này.

**3. Nút "Ôn" duy nhất ở header, gom tất cả thẻ due**
- Nút "Ôn X thẻ" nằm ở header `CourseTree`, kích hoạt study overlay với toàn bộ thẻ due (không phân theo bài).
- Nếu không có thẻ due, nút bị disabled.
- Lý do: Trước đây mỗi bài có nút "Học ngay" riêng → user phải ôn từng bài. Với SRS, thẻ due phân tán khắp các bài → cần 1 deck tổng hợp.

**4. `ProgressEntry` chuyển từ `LessonView` sang `lib/types.ts`**
- Đây là domain type (SRS progress state từ API), không phải UI type — không nên import từ component.
- Lý do: Tránh dependency ngược (domain type bị gắn với UI component), dễ gây nhầm lẫn cho dev sau.

**5. `EditMode` thêm `hideList` và `controlledCardId`**
- `hideList=true`: ẩn panel card list bên trái khi tree nav đã đóng vai trò đó.
- `controlledCardId`: sync card đang chọn từ parent (CourseTree) xuống EditMode qua `useEffect`.
- Lý do: Reuse EditMode mà không duplicate code, đảm bảo single source of truth cho card selection.

**Hệ quả:**
- (+) User thấy cây bài học và nội dung thẻ cùng lúc — không còn mất context khi điều hướng.
- (+) Ôn tập toàn bộ thẻ due trong 1 click thay vì phải vào từng bài.
- (+) Giảm state machine trong `CourseFlow` (bỏ `lesson` view + 2 handler).
- (+) `LessonView.tsx` bị xóa — giảm 1 file cần maintain.
- (-) Layout 2 cột yêu cầu màn hình đủ rộng — mobile chưa được xử lý trong sprint này.

---

## Sprint 5 — 27/04 → 03/05/2026

| Task | Người làm | PR |
|---|---|---|
| UKT Python service engine + Redis state + TypeScript adapter | Lê Kim Dũng | #40 |
| Full-stack course generation workflow (context providers, repository adapters, API orchestration) + Persistent course management (Firestore) | Lê Kim Dũng | #41 |
| Course viewer page (browse / study / edit modes) + Course planning & content transformation | Lê Kim Dũng | #42 |
| Monitoring & alerting infrastructure (log persistence, observability adapters) + Diagnostic quiz generation & spaced-repetition prioritization | Lê Kim Dũng | #43 |
| Traceability | Lê Kim Dũng | #44 |
| Synapsy UI redesign + CourseFlow component split + diagnostic flow + generation bug fixes | Nguyễn Bình Thành | #46 |

---

### [ADR-24] Tách CourseFlow + luồng chẩn đoán + sửa lỗi generation — 03/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #46

**Bối cảnh:** Sau Sprint 5, trang `/course/[id]` là một file monolithic ~1973 dòng, khó bảo trì. Đồng thời phát sinh nhiều lỗi nghiêm trọng trong luồng tạo khóa học: course cached không được lưu vào thư viện, màn hình chờ tạo khóa học không hiển thị, bài test chẩn đoán kích hoạt sai thời điểm.

**Các quyết định:**

**1. Tách component theo View state machine**
- `CourseFlow` là orchestrator duy nhất, quản lý View: `init → diagnostic-intro → diagnostic-quiz → course-tree → lesson`.
- Mỗi view là một component riêng: `DiagnosticIntro`, `DiagnosticQuiz`, `CourseTree`, `LessonView` (chứa `StudyMode` + `EditMode`).
- Lý do: file 1973 dòng không thể review, không thể test từng view độc lập.

**2. Hệ thống cờ localStorage để kiểm soát diagnostic**
- `justGenerated_{id}`: đặt ngay sau khi tạo xong, CourseFlow đọc lần đầu mount để skip diagnostic. Bị xóa khi user chọn "Quay về thư viện" — lần vào tiếp theo từ thư viện sẽ thấy diagnostic bình thường.
- `diagnosticQuestions_{id}`: pre-cache câu hỏi trong lúc chờ generate content (fire-and-forget), để khi user bấm "Bắt đầu chẩn đoán" là load ngay, không chờ API.
- Lý do: UX yêu cầu diagnostic chỉ xuất hiện khi user chủ động vào từ thư viện, không xuất hiện sau redirect tự động.

**3. Dùng `useRef` chống React Strict Mode double-mount**
- React Strict Mode mount component 2 lần liên tiếp để phát hiện side effect. `useEffect` chạy 2 lần → flag `justGenerated_` bị tiêu thụ ở lần 1, lần 2 thấy không có flag và hiển thị diagnostic-intro nhầm.
- Fix: dùng `const diagInitialized = useRef(false)` làm guard. Ref được giữ nguyên qua cả 2 lần mount của Strict Mode, nên lần 2 thoát sớm mà không đọc localStorage lần nữa.

**4. Sửa luồng tạo khóa học cho path cached**
- Bug: branch `fromCache && data.courseContent` thiếu lời gọi `saveCourse` → course không được lưu vào thư viện, `savedCourseId` null → màn hình generation hiển thị nút "Học ngay" không hoạt động.
- Fix: thêm `await saveCourse(...)` vào tất cả 3 nhánh (cached-full, cached-fallback, sequential). Lệnh `await` còn có tác dụng phụ là phá batch React → `GenerationScreen` được render trước khi `setStatus('done')`.

**5. Kiểm tra khóa học còn tồn tại trước khi redirect**
- Bug: `courses` list trong GenerationContext là snapshot client-side. Nếu user xóa khóa học rồi tạo lại cùng file, code tìm thấy `existing` trong list cũ và redirect vào ID đã bị xóa → 404.
- Fix: gọi `fetch('/api/courses/${existing.id}')` để verify trước khi redirect. Nếu 404 thì fall-through tạo mới.

**6. Màn hình hoàn thành với 2 lựa chọn thay vì auto-redirect**
- Sau khi generation xong, không còn tự `router.push('/course/:id')`. Thay vào đó hiện màn hình với 2 nút: "Học luôn →" (vào khóa học) và "← Quay về thư viện" (về home).
- Lý do: user cần được lựa chọn; auto-redirect bỏ qua bước chẩn đoán và gây confusion khi trang nhảy đột ngột.

**Hệ quả:**
- (+) Course cached được lưu vào thư viện đúng cách.
- (+) Diagnostic chỉ xuất hiện khi user mở khóa học lần đầu từ thư viện, không xuất hiện sau generation.
- (+) Màn hình generation hiển thị đúng cho cả cached lẫn non-cached path.
- (+) Không còn redirect vào 404 khi course bị xóa và tạo lại.
- (-) Thêm 4 cờ localStorage cần quản lý thủ công — cần cleanup nếu user xóa khóa học.

---

## Sprint 4 — 20/04 → 26/04/2026

| Task | Người làm | Deadline | PR |
|---|---|---|---|
| Learning Dashboard (`/dashboard`, save & browse courses) | Nguyễn Bình Thành | 21/04 | #19 |
| Spaced Repetition System (SM2 + progress tracking + `/review` page) | Lê Kim Dũng | 22/04 | #22 |
| Refactor DI: centralize adapter initialization | Lê Kim Dũng | 22/04 | #22 |
| Course Player (`/course/[id]`) + Instant Load cache | Lê Kim Dũng | 22/04 | #22 |
| Nâng cấp UI/UX trang Study & Edit (phím tắt, nguồn) | Nguyễn Bình Thành | 23/04 | #26, #27 |
| Bổ sung Gamification (Streak, Heatmap, Mastery ring) | Nguyễn Bình Thành | 23/04 | #28, #36, #37 |
| Giao diện Tracker tiến độ AI tạo bài | Nguyễn Bình Thành | 23/04 | #29 |
| Nâng cấp trang Browse & Refactor Clean Architecture | Nguyễn Bình Thành | 23/04 | #30 |
| Fix log hook UTF-8 encoding (Windows) | Nguyễn Bình Thành | 24/04 | #35 |
| Chọn AI provider (Gemini / OpenAI fallback) | Lê Minh Hoàng | 24/04 | #34 |

---

### [ADR-23] Chuẩn hóa quy trình PR — 24/04/2026

**Người làm:** Nguyễn Bình Thành

**Bối cảnh:** Các PR Sprint 4 bị đánh giá điểm thấp (~52/100) do: nhồi nhét nhiều tính năng vào một PR, mô tả thiếu lý do và bằng chứng, không có unit test, dùng ID số dễ bị trùng.

Thêm vào đó, khi merge PR #30 (`feat/browse-progress-driven` → `main`), branch bị xóa khiến PR #31 và #32 đang target vào branch đó bị GitHub tự động đóng (auto-close) mà không merge. Phải tạo lại thành PR #36, #37.

**Quyết định:**

1. **Atomic PR — chia 3 lớp:** Mỗi tính năng tách thành tối đa 3 PR: (1) Structure/Types, (2) UI/Component, (3) Logic/Error handling. Không nhồi cả 3 vào một PR.
2. **Mô tả chuẩn What/Why/Evidence:** Mọi PR phải có 3 mục: What (làm gì), Why (lý do kỹ thuật/kiến trúc), Evidence (ảnh màn hình hoặc test output).
3. **Luôn target `main` trực tiếp:** Không chain PR lên feature branch của PR khác — khi branch bị xóa sau merge, GitHub auto-close toàn bộ PR phụ thuộc.
4. **Unit test tối thiểu:** 3 test case cho mỗi hàm logic quan trọng (success, lỗi mạng, input rỗng).

**Hệ quả:**
- (+) PR dễ review hơn, điểm đánh giá dự kiến tăng lên ~90+.
- (+) Không còn rủi ro mất PR do auto-close khi xóa branch.
- (+) Code có test → bắt lỗi sớm trước khi merge.
- (-) Mỗi tính năng cần mở nhiều PR hơn trước — tốn thêm thời gian setup.

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
