# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi. Sắp xếp **mới nhất ở trên cùng**.

---

## Sprint 8 — 17/05/2026 →

| Task | Người làm | PR |
|---|---|---|
| Deliverables cuối sprint: pitch deck, demo package, docs refresh, thumbnail; architecture diagram; quality control | Nguyễn Bình Thành, Lê Kim Dũng, Lê Minh Hoàng | docs/demo handoff |
| SRS review flow: mở deck mới, feedback khi ôn, thống kê Mới/Đang học/Đến hạn kiểu Anki, và docs bucket mapping | Nguyễn Bình Thành | #142, #146, #153, #154, #155 |
| Synapsy v2: shell 3 vùng, CourseTree/StudyMode v2, auto-start upload, routing sau diagnostic, landing page public | Nguyễn Bình Thành | #132, #133, #135, #136, #152 |
| Stage 2 chọn đúng model generator cho DeepSeek/OpenAI | Nguyễn Bình Thành | #140 |
| Dọn log AI dùng chung và sửa attribution WORKLOG bị ghi nhầm tên AI assistant | Nguyễn Bình Thành | #141, #148 |
| Fix lỗi màn đỏ khi F5 do `authLoading` render sai | Nguyễn Bình Thành | #147 |
| Learning-flow cleanup: giữ đúng tab khi chuyển thẻ, bỏ AI Tutor recommendation, sửa competency map trang chính | Lê Minh Hoàng | #143, #144, #145 |
| Observability/IP-11 hardening tiếp tục: API middleware, UKT engine, dashboard API, answer evaluation, evidence docs | Lê Kim Dũng | #137, #138, #139, #150 |
| Generation speedups và metric thời gian generate course | Lê Kim Dũng | #151 |

> Không tính vào kết quả đã giao: PR #149 closed nhưng không merge.

**Phân công deliverables cuối sprint:** Nguyễn Bình Thành phụ trách pitch deck, demo package gửi kênh ngoài, viết lại docs và tạo thumbnail; Lê Kim Dũng phụ trách architecture diagram; Lê Minh Hoàng phụ trách quality control trước khi nộp.

### [ADR-58] SRS review flow và thống kê kiểu Anki — 17/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #142, #146, #153, #154, #155

**Bối cảnh:** Deck mới không mở được ôn vì chưa có progress record, `/review` thiếu feedback sau mỗi lần chấm thẻ, và widget SRS hiển thị `0 Thẻ mới` dù user đã có nhiều card chưa học. Nguyên nhân chính là `NEW` không tồn tại lâu trong Firestore; thẻ chưa từng review cũng chưa có document để đếm.

**Quyết định:**
- Cho CourseTree/StudyMode fallback từ due cards sang toàn bộ card của deck, kèm guard deck rỗng.
- Thêm toast, fade và phím tắt 1-4/Space/Enter cho review flow.
- Strip field `undefined` trước khi ghi progress vào Firestore để review save ổn định hơn.
- Cache `totalCardCount` trên saved course, để `Mới = totalCards - reviewed` thay vì query status `NEW`.
- Đổi `LEARNING` thành trạng thái của thẻ vừa lapse/Again; các rating còn lại chuyển sang `REVIEW`.
- Ghi lại mapping `Mới / Đang học / Đến hạn / Thuộc` trong docs để UI và backend dùng cùng ngôn ngữ.

**Hệ quả:** Số thẻ mới phản ánh cả card chưa từng được chạm tới, course mới học được ngay từ overlay, và thống kê SRS bớt gây hiểu nhầm. Điểm còn để mở: `cardId` vẫn chưa namespace theo course nên có thể collide nếu hai khóa học sinh cùng layout ID.

---

### [ADR-57] Synapsy v2 chuyển sang app shell có điều hướng rõ ràng — 17/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #132, #133, #135, #136, #152

**Bối cảnh:** Màn hình cũ là một trang dài, khó chuyển giữa Dashboard, Thư viện và SRS. Sau khi có CourseTree/StudyMode v2, user cũng cần routing rõ hơn: vào từ Thư viện thì đọc/sửa bài, vào từ SRS thì ôn flashcard.

**Quyết định:**
- Dùng shell 3 vùng: TopBar, NavRail, DocDrawer và main content.
- Course action route theo ngữ cảnh: Thư viện mở `?tab=edit`, SRS mở `?tab=study`.
- Khi user chọn PDF, generation bắt đầu ngay thay vì cần thêm một click "Tạo khóa học".
- Sau diagnostic, nút "Bắt đầu học" đưa user vào tab đọc/sửa bài để xem nội dung trước.
- Thay login screen trống bằng landing page public cho visitor chưa đăng nhập.

**Hệ quả:** Luồng vào khóa học nhất quán hơn, giảm bước thừa lúc upload, và sản phẩm có cửa vào rõ ràng cho người mới. Debt còn lại là `page.tsx` vẫn chứa nhiều component inline cần tách dần nếu shell tiếp tục mở rộng.

---

### [ADR-56] Tách model Stage 2 và giảm thời gian chờ generation — 17/05/2026

**Người làm:** Nguyễn Bình Thành (#140), Lê Kim Dũng (#151) | **Ref:** PR #140, #151

**Bối cảnh:** Production trace cho thấy Stage 2 giữ kết nối 2-4 phút chủ yếu vì chờ model trả JSON body. DeepSeek có thể đang dùng model planner/pro chậm cho generator, trong khi generation flow còn có idle time chưa được đo rõ.

**Quyết định:**
- `OpenAiAdapter` nhận riêng `plannerModel`, `generatorModel`, `diagnosticModel`.
- Stage 1 dùng planner model, Stage 2 dùng generator model, diagnostic fallback về generator model khi chưa cấu hình riêng.
- DeepSeek Stage 2 mặc định sang `deepseek-v4-flash` nếu chưa set `DEEPSEEK_GENERATOR_MODEL`.
- Giảm idle time trong course generation và export metric duration để theo dõi tiếp bằng observability.

**Hệ quả:** Có thể đổi model Stage 2 qua env mà không ảnh hưởng Stage 1, đồng thời có metric để biết speedup thật ở production. Đây vẫn là tối ưu latency, chưa thay thế nhu cầu async job nếu muốn UX không phải chờ full generation.

---

### [ADR-55] Observability/IP-11 hardening chuyển từ ghi log sang vận hành được — 17/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #137, #138, #139, #150; liên quan #131, #134 ở Sprint 7

**Bối cảnh:** Sau monitoring/tracing ban đầu, hệ thống vẫn thiếu lớp API chuẩn, dashboard data orchestration, answer evaluation ổn định, UKT state engine và bằng chứng đánh giá hiệu năng đủ rõ để debug/regression.

**Quyết định:**
- Chuẩn hóa API/auth/logging/metrics middleware và kiểm soát storage path an toàn hơn.
- Bổ sung dashboard API/hook, GenerationProvider, PDF parse progress polling và answer evaluation có cache/fallback.
- Củng cố UKT bằng Bayesian state engine, FastAPI bridge, Redis/in-memory state và test validation.
- Thêm bridge Alertmanager -> Discord, evaluation evidence và cleanup docs kiến trúc cũ.

**Hệ quả:** Observability không chỉ là Grafana/Prometheus mà đã nối vào API, dashboard, UKT và evidence review. Cần tiếp tục tách các commit log/session ra khỏi tài liệu vận hành để tránh nhiễu repo.

---

### [ADR-54] Learning flow giữ đúng ngữ cảnh học — 17/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** PR #143, #144, #145

**Bối cảnh:** Sau khi StudyMode có short-answer flow, một số thao tác vẫn kéo user về sai tab hoặc hiển thị gợi ý AI Tutor không còn phù hợp. Trang chính cũng cần sửa competency map cho đúng thông tin học tập hiện tại.

**Quyết định:** Giữ nguyên tab học khi chuyển thẻ trong Study tab, bỏ AI Tutor recommendation gây nhiễu, và chỉnh competency map ở main page.

**Hệ quả:** Flow học ít bị nhảy ngữ cảnh hơn và UI trang chính phản ánh đúng trạng thái năng lực hơn.

---

## Sprint 7 — 11/05 → 16/05/2026

| Task | Người làm | PR |
|---|---|---|
| MinerU VLM + ảnh nguồn thật: output compatibility, image proxy, TS return type | Nguyễn Bình Thành | #122, #124, #125 |
| Study-first flow: action rail sau pipeline, short-answer self-check, ADR/docs cho flow học | Lê Minh Hoàng | #121, #126, #129, #130 |
| Generation/diagnostic speed và correctness: coverage theo lesson, multi-card lesson, parallel diagnostic, parallel Stage 2 | Nguyễn Bình Thành | #103, #115, #117, #118 |
| User-scoped state refresh và review UI consistency | Nguyễn Bình Thành | #120 |
| UKT/KC/dashboard surface: canonical answer, stable KC, spider chart, Vietnamese copy/prompts, UKT timeout retry | Nguyễn Bình Thành | #104, #105, #107, #108, #109, #110, #113, #114, #127 |
| CI/deploy/package/docs reliability: lockfile, env docs, merge rules, AI log scripts, Railway/Vitest fixes, bad-merge cleanup | Nguyễn Bình Thành | #97, #98, #99, #100, #102, #106, #111, #112, #116, #128 |
| Dependency cleanup after Next/React peer conflict | Lê Kim Dũng | #101 |
| Monitoring restructure, tracing, auth cleanup, and observability hardening kickoff | Lê Kim Dũng | #93, #94, #95, #96, #131, #134, main@30e473d, main@296832a, main@14fb97b |

> Không tính vào kết quả đã giao: PR #119 và #123 closed nhưng không merge.

### [ADR-53] MinerU VLM và ảnh nguồn thật trong tài liệu nguồn — 16/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #122, #124, #125

**Bối cảnh:** MinerU VLM có thể trả zip khác contract cũ: `content_list_v2` dạng page-grouped, markdown-only fallback, hoặc image asset chỉ có path nội bộ trong zip. Nếu adapter vẫn giả định `content_list.json` flat, parse PDF fail hoặc panel nguồn chỉ hiện placeholder `[Hình ảnh]`.

**Quyết định:** Chuẩn hóa VLM output về `contentList` flat, fallback sang markdown khi thiếu structured JSON, upload image assets trong zip lên Firebase Storage theo namespace user/task, và đọc ảnh qua `/api/layout-image` có session auth. Return type của helper image được mở để TypeScript thấy các field `img_url`, `img_storage_path`, `image_mime_type` sau khi attach.

**Hệ quả:** Pipeline vẫn giữ contract nội bộ cho Stage 1/Stage 2/citation, nhưng source panel có thể hiển thị ảnh thật khi MinerU cung cấp asset. Course cũ hoặc markdown-only fallback vẫn không có ảnh thật vì thiếu metadata ảnh.

---

### [ADR-52] Study-first flow thêm tự trả lời ngắn — 16/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** PR #121, #126, #129, #130; follow-up build fix: Nguyễn Bình Thành #128

**Bối cảnh:** Sau generation, action card nằm xa pipeline và StudyMode vẫn chỉ là reveal đáp án + chấm SRS. Người học cần một bước active recall rõ hơn: tự nhập câu trả lời, so với đáp án chuẩn, rồi mới chọn rating.

**Quyết định:** Đưa action rail về gần pipeline, mở thẳng Study tab khi user chọn học, thêm textbox short-answer trong `StudyMode`, gọi answer evaluation khi đáp án đủ dài, cache kết quả cho cùng câu trả lời và fallback sang heuristic local khi provider lỗi. PR #128 sửa các duplicate export/import do merge conflict của PR #126 để giữ TypeScript build được.

**Hệ quả:** Flow học gần hơn với mục tiêu active recall. Hệ thống có thêm route phụ thuộc AI provider, nên fallback local vẫn cần giữ để UX không vỡ khi provider timeout.

---

### [ADR-51] Generation và diagnostic ưu tiên latency thấp nhưng vẫn giữ coverage — 15/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #103, #115, #117, #118, #120

**Bối cảnh:** Diagnostic prefetch từng map sai về `legacy-full`, diagnostic quiz mất khoảng 3.5 phút vì một LLM call lớn, và Stage 2 fresh course chạy tuần tự từng chương. Đồng thời lesson dày nội dung bị ép vào một card nên học và SRS không đủ granular.

**Quyết định:** Build diagnostic chunks theo lesson id `ci-li`, chấp nhận partial coverage có kiểm soát khi tài liệu lớn, tách diagnostic generation thành per-chunk calls có concurrency/backoff, chạy Stage 2 bằng `Promise.all`, và cho mỗi lesson sinh nhiều concept cards. UI state được refresh theo user scope để tránh nhầm dữ liệu giữa session/course.

**Hệ quả:** Diagnostic latency giảm về mức giây, Stage 2 chờ theo chương lâu nhất thay vì tổng các chương, và SRS có đơn vị học nhỏ hơn. Trade-off là tăng concurrency/token overhead và cần retry tốt để chịu được 429 động từ provider.

---

### [ADR-50] UKT/KC trở thành lớp dữ liệu học tập ổn định — 14/05 → 16/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #104, #105, #107, #108, #109, #110, #113, #114, #127

**Bối cảnh:** UKT không thể dựa vào free-text topic do LLM sinh vì tên kỹ năng sẽ drift giữa các lần chạy. Dashboard cũng cần biểu diễn năng lực theo module y khoa bằng tiếng Việt, không lộ jargon nội bộ cho learner.

**Quyết định:** Tạo registry `medical-v1` với `kc_id/module_id` ổn định, ép Stage 1 gán KC cho từng lesson và server normalize lại, dùng canonical `answer` duy nhất cho card, aggregate UKT state thành spider chart theo module, Việt hóa UI/prompt/registry, và thêm timeout/retry/logging cho UKT adapter để xử lý cold start/502.

**Hệ quả:** Diagnostic, SRS và dashboard cùng nói về một namespace KC ổn định. User thấy module tiếng Việt và mức nắm vững/độ chắc thay vì field kỹ thuật. Course cũ có thể giữ label cũ đã lưu, nhưng aggregate vẫn dựa trên stable id.

---

### [ADR-49] CI/deploy/docs phải chặn lỗi môi trường trước khi chặn dev — 12/05 → 15/05/2026

**Người làm:** Nguyễn Bình Thành (#97, #98, #99, #100, #102, #106, #111, #112, #116, #128), Lê Kim Dũng (#101)

**Bối cảnh:** Web deploy và smoke tests nhiều lần fail vì môi trường hơn là logic: npm global prefix trên self-hosted runner, optional Rolldown binding Linux, Vitest CJS/ESM startup path, lockfile lệch, dependency peer conflict, và merge conflict giữ cả hai phía.

**Quyết định:** Đồng bộ `web/package-lock`, ghi rõ manual env setup, khôi phục root scripts, làm rõ merge strategy không squash, dùng local Railway CLI với `NPM_CONFIG_PREFIX` ổn định, ép cài optional binding Linux, bỏ `defineConfig` import gây CJS/ESM startup lỗi, và sửa duplicate export/import sau merge hỏng.

**Hệ quả:** CI/deploy phản ánh lỗi code thật hơn thay vì vỡ ở bootstrap. Các docs workflow cũng rõ hơn để tránh lặp lại lỗi squash/merge ambiguity.

---

### [ADR-48] Monitoring restructure và hardening kickoff — 11/05 → 16/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #93, #94, #95, #96, #131, #134, main@30e473d, main@296832a, main@14fb97b

**Bối cảnh:** Sau Prometheus/Grafana Sprint 6, repo cần tách `web/`, monitoring config, tracing collector và auth endpoint rõ ràng hơn. Hardening sau đó mở rộng sang Chain AI adapter, dashboard/SRS hooks, progress repository, UKT service và evaluation/test evidence.

**Quyết định:** Restructure repo quanh `web/` và `monitoring/`, thêm OpenTelemetry Collector/Alertmanager/Loki/Jaeger provisioning, instrument Web App/UKT, thêm `/api/auth/me`, rồi bắt đầu hardening các adapter/progress/dashboard/UKT/test paths. Các commit main@30e473d, main@296832a, main@14fb97b được giữ như evidence khi không có PR riêng rõ ràng trong history.

**Hệ quả:** Observability chuyển từ cấu hình phụ trợ sang một phần của vận hành sản phẩm: có trace, metrics, dashboard và test evidence. Một phần hardening kéo sang Sprint 8 và được ghi tiếp ở ADR-55.

---

## Sprint 6 — 04/05 → 10/05/2026

| Task | Người làm | PR |
|---|---|---|
| Pipeline/README/WORKLOG Sprint 6 wrap-up | Nguyễn Bình Thành | #77 |
| PIPELINE/README/CLAUDE documentation updates | Nguyễn Bình Thành | #52, #56, #57, #58, #61 |
| Redesign `/course/[id]` — Master-Detail CourseTree | Nguyễn Bình Thành | #53, #54, #55 |
| Merge stacked diagnostic fixes + diagnostic flow/generation tracker/session cache | Nguyễn Bình Thành | #51, #59, #60, #62, #63, #64 |
| Citation source panel, inline markers, cache bypass, chunk ID fixes | Nguyễn Bình Thành | #65, #66, #67, #69, #70, #71, #72, #73, #74, #76, #91, #92 |
| Prometheus/Grafana monitoring, guardrails, admin RBAC | Lê Kim Dũng | #75, #83, #87, #89 |
| Railway Prometheus deployment fixes | Lê Kim Dũng | #78, #79, #80, #81, #82 |
| MinerU over-200-pages handling và chunked generation refactor | Lê Minh Hoàng | #84, #85, #86, #88 |
| Flashcards UI/UX improvements | Lê Minh Hoàng | #90 |

---

### [Fix] Citation display và PdfPanel scroll — 10/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #92 (`fix/citation-display-and-pdfpanel`)

**Bối cảnh:** PR #84 đổi chunk ID từ 2 số (`chunk-P-I`) sang 3 số (`chunk-S-P-I`) nhưng không cập nhật các consumer phía FE, gây ra 5 bug cùng lúc.

**Các bug đã sửa:**
1. **Marker hiện raw text** `[chunk-0-1-12]` — `MARKER_RE` regex chỉ match 2-số. Sửa: `(?:-\d+)?` để match cả 3-số.
2. **Marker hiện `(?)`** — `buildValidChunkIds` tạo ID 2-số nhưng AI embed ID 3-số (dùng `?? 0`). Sửa: luôn dùng `sourceChunkIndex ?? 0` và chỉ tạo thêm ID 2-số cho backward-compat khi `sourceChunkIndex === undefined`.
3. **PdfPanel không tự scroll** — `querySelector('[data-chunk-id]')` không tìm ra vì format khác nhau. Sửa: thêm `data-flat-idx={index}` (flat array index, luôn là số cuối của chunk ID) vào mọi element, scroll bằng `[data-flat-idx]`.
4. **Highlight chỉ dòng đầu** — `parseGlobalIdx` dùng regex `/chunk-\d+-(\d+)/` capture `page_idx` thay vì flat index. Sửa: `/(\d+)$/` lấy số cuối cùng.
5. **Số citation reset về `[1]` mỗi lesson** — `EditMode` chỉ thấy cards của 1 lesson khi build `globalCiteMap`. Sửa: thêm prop `allCards` vào `EditMode`, `CourseTree` truyền toàn bộ course cards.

**Kết quả:** Citation markers hiện số `[N]` tăng liên tục toàn document, PdfPanel scroll và highlight đúng chunk.

---

### [ADR-33] Chunked Stage 2 generation for oversized chapters — 10/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** PR #85, #86

**Bối cảnh:** Stage 2 (`generate-content`) already works chapter-by-chapter, but a single chapter can still exceed the model context window when it contains too many lessons or very large raw contexts.

**Quyết định:**
- Tách chapter input thành các lesson batches trước khi gọi model khi payload vượt ngưỡng an toàn.
- Merge lại các partial lesson outputs theo đúng thứ tự gốc.
- Gộp quiz questions từ các batch, khử trùng lặp theo question text, rồi giới hạn output hợp lệ cho chapter.

**Kết quả:** Stage 2 giữ nguyên API contract, nhưng có fallback an toàn hơn cho chapter quá lớn.

### [ADR-32] Chunked Stage 1 generation for oversized markdown — 10/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** PR #84, #88

**Bối cảnh:** `generate-course` có thể vượt context window khi PDF parse ra markdown quá dài, dẫn đến lỗi token limit trước khi course outline được tạo.

**Quyết định:**
- Chia markdown lớn thành các chunk theo boundary gần nhất trước khi gọi planner.
- Gọi AI planner từng chunk, rồi merge lại thành một course outline duy nhất.
- Giữ usage logging trên đường đi mới và thêm test cho small input, large input, và invalid input.

**Ghi chú:** Stage 2 generate-per-chapter đã có sẵn ở `generate-content`; thay đổi này tập trung chặn token overflow ở Stage 1.

---

### [Fix] Edge Case Hunting & Reliability Improvements — 10/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #83, #87, #89

**Bối cảnh:** Sau khi chạy `bmad-review-edge-case-hunter`, phát hiện một số điểm yếu trong luồng xử lý JSON và fallback nội dung có thể gây crash hoặc hiển thị lỗi `[object Object]` cho người dùng.

**Các thay đổi:**
1.  **Bảo vệ JSON Parsing:** Thêm try-catch cho tất cả các lệnh `req.json()` tại các API route chính (`generate-course`, `generate-content`).
2.  **Fix Fallback Content:** Sửa logic tại `/api/generate-content` để xử lý đúng format `OutlinePoint[]` mới, tránh việc hiển thị `[object Object]` khi AI gặp lỗi và phải dùng nội dung dự phòng.
3.  **Validation Context:** Thêm kiểm tra độ dài `rawContexts` trong `lib/ai.ts` để đảm bảo trích dẫn nguồn (citation) không bị gán nhầm bài học khi dữ liệu đầu vào không khớp.

**Kết quả:** Hệ thống chịu lỗi tốt hơn, UI không bị vỡ khi gặp sự cố mạng hoặc lỗi AI provider.

---

### [ADR-33] Observability Stack (Prometheus & Grafana) trên Railway — 09/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #75, #78, #79, #80, #81, #82

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

Nếu user click marker cụ thể, panel scroll/highlight theo marker đó. Nếu chưa click marker, panel mới fallback về range của lesson.

Lý do: Lesson-range highlight hữu ích khi mở PdfPanel lần đầu (hiện toàn bộ đoạn nguồn). Khi user click marker cụ thể, họ muốn focus chính xác 1 chunk đó, không phải cả range.

---

### [ADR-29] Direct client-side Firebase upload cho PDF + layout JSON persistence — 09/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #69 (`fix/citation-ui-storage`)

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
| Backend diagnostic quiz use case, SRS prioritization, monitoring, traceability | Lê Kim Dũng | #42, #43, #44 |
| Sprint 5 worklog table | Nguyễn Bình Thành | #45 |
| Synapsy UI redesign + CourseFlow component split | Nguyễn Bình Thành | #46 |
| Diagnostic UI/flow, tree coloring, prefetch, first-generation quiz, course-scoped progress | Nguyễn Bình Thành | #47, #48, #49, #50 |

---

### [ADR-26] Backend Diagnostic Quiz Use Case — 02/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #42

**Bối cảnh:** Trước đây diagnostic quiz được generate hoàn toàn ở frontend hoặc gộp chung trong luồng Stage 2. Điều này làm tăng độ trễ và khó kiểm soát chất lượng câu hỏi. Cần một Use Case riêng biệt ở backend để đảm bảo mỗi lesson có đúng 1 câu hỏi chẩn đoán với độ phủ 100%.

**Quyết định:**
- Xây dựng `GenerateDiagnosticQuizUseCase` tại tầng Core.
- Logic: Nhận danh sách chunks (lessons), gọi LLM để sinh chính xác 1 câu hỏi cho mỗi chunk ID.
- Kết quả được trả về dưới dạng JSON schema chuẩn `DiagnosticQuiz`.

**Hệ quả:**
- (+) Đảm bảo độ phủ kiến thức 100% (lesson-scoped coverage).
- (+) Tách biệt logic chẩn đoán giúp dễ dàng bảo trì và tối ưu prompt độc lập với Stage 2.

---

### [ADR-25] SRS Prioritization và Monitoring Base — 01/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #43, #44

**Bối cảnh:** Khi số lượng thẻ bài lớn, user cần biết thẻ nào cần ưu tiên ôn tập trước. Đồng thời, hệ thống bắt đầu cần cơ chế giám sát (Monitoring) để theo dõi các lỗi AI và latency.

**Quyết định:**
- Implement logic sắp xếp thẻ dựa trên `next_due_date` của thuật toán SM2 trong `ProgressRepository`.
- Thiết lập các endpoint `/api/metrics` cơ bản để Prometheus có thể bắt đầu scrape dữ liệu.
- Thêm `trace_id` vào các log AI để phục vụ việc truy vết (traceability) sau này.

**Hệ quả:**
- (+) Dashboard ôn tập hiển thị thẻ theo thứ tự ưu tiên chính xác.
- (+) Đặt nền móng cho hệ thống giám sát tập trung.

---

### [ADR-24] Tách CourseFlow + luồng chẩn đoán + sửa lỗi generation — 03/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #46, #47, #48, #49, #50

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

| Task | Người làm | PR |
|---|---|---|
| Learning Dashboard (`/dashboard`, save & browse courses) | Nguyễn Bình Thành | #19 |
| Spaced Repetition System, DI refactor, Course Player, Firestore cache | Lê Kim Dũng | #22 |
| Unified home, course sandbox, Study/Edit UX, generation tracker | Nguyễn Bình Thành | #24, #25, #26, #27, #28, #29 |
| Browse progress filters + repository/use-case refactor | Nguyễn Bình Thành | #30 |
| Worklog Sprint 4 update and PR workflow docs | Nguyễn Bình Thành | #33, #38 |
| Chọn AI provider (Gemini / OpenAI fallback) | Lê Minh Hoàng | #34 |
| Fix log hook UTF-8 encoding and course style border conflict | Nguyễn Bình Thành | #35, #39 |
| Gamification follow-up: library mastery ring + 30-day heatmap | Nguyễn Bình Thành | #36, #37 |
| UKT service, duplicate course flow, planning/content transformation groundwork | Lê Kim Dũng | #40, #41 |

---

### [ADR-23b] UKT Service Groundwork và Duplicate Course Flow — 25/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #40, #41

**Bối cảnh:** Hệ thống cần theo dõi kiến thức người dùng (Knowledge Tracing) một cách hệ thống thay vì chỉ dựa trên SRS. Đồng thời, cần xử lý trường hợp user upload cùng một file PDF nhiều lần để tránh lãng phí token.

**Quyết định:**
- Khởi tạo `UKT service` (Python/FastAPI) tách biệt để xử lý các mô hình học máy về kiến thức (BKT/DKT).
- Xây dựng luồng check `contentHash` trước khi bắt đầu generation. Nếu course đã tồn tại và thuộc về user khác, thực hiện "clone" thay vì regenerate.

**Hệ quả:**
- (+) Tiết kiệm token cho các nội dung phổ biến.
- (+) Chuẩn bị sẵn sàng cho việc phân tích năng lực người dùng sâu hơn.

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

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #24, #25, #26, #27, #28, #29, #36, #37

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

**Người làm:** Lê Kim Dũng | **Ref:** PR #22

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

**Người làm:** Lê Kim Dũng | **Ref:** PR #22

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

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #19

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

**Người làm:** Lê Kim Dũng | **Ref:** PR #22

**Bối cảnh:** Dashboard lists courses; learner needs `/course/[id]` to view chapters/lessons.

**Quyết định:**
- `/course/[id]` → load from Firestore, render ConceptCards + Quiz per lesson.
- Session auth verify user ownership.

**Trade-offs:**
- ✅ Active recall via ConceptCard (learner self-tests before reveal).
- ✅ Persistent storage (Firestore).

---

### [ADR-16] Firestore Adapter: Unified Cache + User Storage — 21/04/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #22

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

| Task | Người làm | PR |
|---|---|---|
| Author/log branch setup and early auth/doc support | Lê Kim Dũng | #7, #14, #15, #17 |
| Docs consolidation, workflow rules, product pivot, hook fixes | Nguyễn Bình Thành | #8, #9, #10, #16 |
| Chuyển 2 stage sang GPT-4o-mini | Nguyễn Bình Thành | #11 |
| Thay source_text verbatim bằng outline do planner tạo | Nguyễn Bình Thành | #12 |
| Xóa Reveal.js + thêm ConceptCard (active recall) | Nguyễn Bình Thành | #13 |
| Parser classifier + content_list.json dedupe | Nguyễn Bình Thành | #18 |

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

**Shape mới — `ConceptCard`:** gồm câu hỏi gợi nhớ, câu trả lời ngắn, phần giải thích chi tiết tùy chọn và một vài câu hỏi follow-up để đào sâu.

**UI 2 trạng thái:**
- **Trước khi Reveal:** Hiện câu hỏi + ô input để tự trả lời + nút Reveal.
- **Sau khi Reveal:** Input mờ đi, hiện TL;DR, follow-up chips, 4 nút Anki mock (Again/Hard/Good/Easy).

**Fallback nếu model không trả về concept:** dùng title của lesson làm câu hỏi mặc định, lấy vài ý đầu trong outline làm câu trả lời và bỏ follow-up.

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

| Task | Người làm | PR |
|---|---|---|
| Weekly journal setup | Nguyễn Bình Thành | #1, #2 |
| OpenAI migration from Gemini | Nguyễn Bình Thành | #3 |
| Content-list pipeline, sidebar layout, schema/course generation updates | Nguyễn Bình Thành | #4 |
| Author/log branch setup | Lê Kim Dũng | #5, #6 |

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
