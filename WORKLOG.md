# Worklog

Ghi lại các quyết định kỹ thuật, phân công, và brainstorming của nhóm.

> Cập nhật **bất cứ khi nào** nhóm ra quyết định kỹ thuật quan trọng hoặc thay đổi hướng đi. Sắp xếp **mới nhất ở trên cùng**.

---

## Sprint 8 — 17/05/2026 →

| Task | Người làm | PR |
|---|---|---|
| SRS overlay fallback cho thẻ mới + guard StudyMode deck rỗng | Codex | #142 |
| Synapsy v2 shell: TopBar + NavRail + DocDrawer folder tree | Nguyen Binh Thanh | #132 |
| CourseTree + StudyMode v2 visual reskin + tab routing (edit/study) | Nguyen Binh Thanh | #133 |
| Stage 2 dùng generator model riêng cho DeepSeek/OpenAI | Codex | branch `fix/stage2-generator-model` |

### [ADR-54] SRS overlay mở được deck mới - 17/05/2026

**Người làm:** Codex | **Ref:** PR #142 (`fix/srs-study-mode-flow`)

**Bối cảnh:** PR #126 đã merge short-answer self-check vào `StudyMode`, nhưng nút ôn trong `CourseTree` vẫn bị khóa theo `totalDue === 0`. Với khóa học mới, chưa có progress entry nên `totalDue` bằng 0 dù vẫn có thẻ để học. Overlay bên trong đã có fallback `dueCards.length > 0 ? dueCards : allCards`, nhưng button không cho mở overlay để đi tới flow đó.

**Quyết định:**
- Tách helper `getStudyDeck`/`hasStudyDeckCards` để dùng cùng một logic ưu tiên due cards rồi fallback all cards.
- Nút overlay enable khi deck fallback có thẻ; nếu không có due card thì hiển thị `Bắt đầu`.
- `StudyMode` guard trường hợp deck rỗng hoặc index ngoài phạm vi trước khi đọc `card.concept`.
- `/review` được xác minh vẫn đọc/ghi cùng nguồn SRS: `GET /api/progress/due` đọc `user_progress`, `POST /api/progress/review` ghi qua `ReviewCardUseCase`. Trang này chỉ hiện thẻ đã được schedule đến hạn, nên khóa học toàn thẻ mới vẫn cần bắt đầu từ course study overlay.

**Hệ quả:**
- (+) Course mới có thể vào luồng tự viết đáp án → xem đáp án → chọn rating 1-4 ngay cả khi chưa có due card.
- (+) Tránh crash UI nếu StudyMode nhận deck rỗng do dữ liệu chưa sẵn sàng.
- (-) `/review` global vẫn không tự tổng hợp thẻ mới từ mọi course vì endpoint due chỉ có progress records; muốn global học thẻ mới cần API ghép course content riêng.

### [ADR-53] Tách model planner/generator cho Stage 2 - 17/05/2026

**Người làm:** Codex | **Ref:** branch `fix/stage2-generator-model`

**Bối cảnh:** Trace production cho thấy các request `/api/generate-content` giữ kết nối 2-4 phút trong Stage 2. Các span Firebase/cache chỉ mất khoảng 1-2s và `fetch` tới DeepSeek chỉ đo tới response headers, còn thời gian lớn nằm ở lúc chờ model hoàn tất JSON body. Code trước đó dùng cùng `OpenAiAdapter.model` cho cả planner, generator, và diagnostic; với DeepSeek, adapter được cấu hình bằng `DEEPSEEK_PLANNER_MODEL || deepseek-v4-pro`, nên Stage 2 có thể vô tình dùng model planner/pro thay vì flash.

**Quyết định:**
- Mở rộng `OpenAiAdapter` với `plannerModel`, `generatorModel`, và `diagnosticModel`.
- Stage 1 `generateCourse` dùng planner model.
- Stage 2 `generateChapterContent` dùng generator model.
- Diagnostic quiz dùng diagnostic model, fallback về generator model.
- DI DeepSeek mặc định Stage 2 sang `deepseek-v4-flash` nếu chưa set `DEEPSEEK_GENERATOR_MODEL`.

**Hệ quả:**
- (+) Có thể đổi model Stage 2 qua Railway env mà không cần đổi key hay ảnh hưởng Stage 1.
- (+) Giảm rủi ro Stage 2 chạy bằng model planner/pro chậm.
- (-) Vẫn cần xử lý kiến trúc async/job nếu muốn UX giống upload xong dùng được ngay; đổi model chỉ giảm latency, không loại bỏ việc chờ full generation.

### [ADR-51] Synapsy v2 Shell Layout — 17/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #132 (`feat/ui-navrail-shell`)

**Bối cảnh:** Giao diện cũ (page.tsx) là một trang đơn không có điều hướng cố định — user phải scroll và không có cách nào chuyển giữa Dashboard, Thư viện, và SRS mà không mất context. Prototype Synapsy v2 (trong `Ai Course Flashcard-handoff/`) đã thiết kế sẵn shell 3-panel.

**Quyết định:**
- Thêm **TopBar** 44px full-width: logo + section label + user avatar/logout.
- Thêm **NavRail** 60px bên trái: 3 tab (KHO/THƯ VIỆN/SRS) với icon + label.
- Thêm **DocDrawer** 258px: folder tree với mock data fallback (Y Khoa Cơ Sở), tạo thư mục lưu localStorage, nút xóa tài liệu hover.
- Layout: `height:100vh flex-column` → TopBar + body row (NavRail | DocDrawer | main flex-1).
- Tab content switch bằng `activeTab` state, `key={activeTab}` để animate.

**Hệ quả:**
- (+) User có thể chuyển tab mà không mất trạng thái upload/generation.
- (+) DocDrawer hiển thị mastery badge + due count cho từng tài liệu.
- (+) Drawer có thể collapse/expand bằng nút toggle nhỏ.
- (-) Page.tsx vẫn còn inline nhiều components — cần tách ra nếu tiếp tục scale.

---

### [ADR-52] Tab Routing — THƯ VIỆN → edit, SRS → study — 17/05/2026

**Người làm:** Nguyễn Bình Thành | **Ref:** PR #133 (`feat/ui-course-view`)

**Bối cảnh:** ADR-47 làm cho click card trong CourseTree luôn switch sang tab "Học" (flashcard). Điều này sai với ý muốn: tab THƯ VIỆN cần mở khóa học ở chế độ edit (QnA editor, citation, AI tutor); tab SRS mới cần mở flashcard.

**Quyết định:**
- `handleCourseAction` route theo `activeTab`: SRS → `?tab=study`, còn lại → `?tab=edit`.
- `/course/[id]/page.tsx` đọc `searchParams.get('tab')` và truyền `preferredDetailTab: 'study' | 'edit' | undefined` xuống `CourseFlow` → `CourseTree`.
- `CourseTree`: khi `preferredDetailTab === 'edit'`, auto-select card đầu tiên và expand chapter đầu tiên (1 chạm).
- Card click + arrow-key nav trong CourseTree đều respect `preferredDetailTab` thay vì hardcode `'study'`.

**Hệ quả:**
- (+) Tab THƯ VIỆN mở đúng chế độ edit; tab SRS mở đúng flashcard.
- (+) Single-tap navigation từ DocDrawer vào edit panel.
- (-) SRS integration với `/review` global và "Bắt đầu" button vẫn chưa hoàn chỉnh — cần PR riêng.

---

## Sprint 7 — 11/05 → 16/05/2026

| Task | Người làm | PR |
|---|---|---|
| Prometheus monitoring adapter + system dashboard visualization | Lê Kim Dũng | main@30e473d |
| Grafana dashboards + metrics collection API + course mode UI components | Lê Kim Dũng | main@296832a |
| Integration tests for `MineruParserAdapter` output extraction | Lê Kim Dũng | main@14fb97b |
| Study-first short-answer self-check flow + direct-to-study entry | Lê Minh Hoàng | #126 |
| Course ready-state action rail layout after pipeline | Lê Minh Hoàng | #121 |
| MinerU VLM parser output compatibility | Nguyen Binh Thanh | #122 |
| User-scoped UI state refresh + review UI consistency | Nguyen Binh Thanh | #120 |
| Parallelize fresh course generation (Promise.all) | Nguyen Binh Thanh | #118 |
| Parallel diagnostic quiz generation (3.5 min → ~10s) | Nguyen Binh Thanh | #117 |
| Fix Vitest CJS config startup path on Linux CI | Nguyen Binh Thanh | #116 |
| Multi-card lessons + chapter one-tap card tree | Nguyen Binh Thanh | #115 |
| Việt hóa kc_name registry + spider chart labels | Nguyen Binh Thanh | #114 |
| Enforce Vietnamese output trong diagnostic/quiz/Stage 2 prompts | Nguyen Binh Thanh | #113 |
| Fix Vitest Rolldown optional binding trên CI Linux | Nguyen Binh Thanh | #112 |
| Fix Railway deploy npm prefix trên self-hosted runner | Nguyen Binh Thanh | #111 |
| Việt hóa copy UKT dashboard/admin/docs | Nguyen Binh Thanh | #110 |
| Dashboard cá nhân hóa UKT + spider chart độ chắc chắn | Nguyen Binh Thanh | #109 |
| Spider chart UKT theo module y khoa | Nguyen Binh Thanh | #108 |
| Canonical ConceptCard answer + AI tutor follow-ups | Nguyen Binh Thanh | #107 |
| Stable Knowledge Components + UKT quiz/SRS signals | Nguyen Binh Thanh | #104, #105 |
| Diagnostic lesson-scoped coverage + partial-coverage acceptance | Nguyen Binh Thanh | #103 |
| Restore root AI logging scripts | Nguyen Binh Thanh | #102 |
| Dependency cleanup after Next/React peer conflict | Lê Kim Dũng | #101 |
| Manual environment setup clarification | Nguyen Binh Thanh | #100 |
| Web package-lock sync for Docker `npm ci` | Nguyen Binh Thanh | #99 |
| PIPELINE current-state documentation update | Nguyen Binh Thanh | #98 |
| Sprint worklog tracking cleanup | Nguyen Binh Thanh | #97 |
| Final monitoring restructure + `/api/auth/me` cleanup | Lê Kim Dũng | #96 |
| Điều chỉnh branch/base cho `monitoring_restructure` | Lê Kim Dũng | #95 |
| Distributed tracing và OpenTelemetry instrumentation | Lê Kim Dũng | #94 |
| Monitoring restructure: tách `web/`, bổ sung observability stack | Lê Kim Dũng | #93 |

### [ADR-50] Serve ảnh thật trong panel tài liệu nguồn - 16/05/2026

**Người làm:** Codex | **Ref:** branch `fix/real-source-images`

**Bối cảnh:** `PdfPanel` đã đọc được các item `type: "image"` từ MinerU `contentList`, nhưng chỉ render placeholder `[Hình ảnh]`. Sau PR #122, parser có thêm luồng MinerU VLM và fallback markdown-only; cần giữ hai trường hợp này tách bạch để chỉ render ảnh thật khi structured `contentList` có asset ảnh đã được lưu.

**Quyết định:**
- Khi parser giải nén zip MinerU, upload các file ảnh trong zip vào Firebase Storage theo namespace `course-layout-images/{userId}/{taskId}/...`.
- Giữ `img_path` gốc của MinerU, nhưng gắn thêm `img_storage_path`, `img_url`, và `image_mime_type` vào item ảnh trong `contentList` trước khi frontend lưu layout JSON.
- Thêm `/api/layout-image` để proxy ảnh có xác thực, chỉ cho phép đọc path dưới prefix của chính user.
- `PdfPanel` render ảnh thật nếu layout có `img_url`; course cũ, markdown-only fallback, hoặc upload ảnh fail vẫn fallback về placeholder.

**Hệ quả:**
- (+) Panel tài liệu nguồn hiển thị được hình thật từ PDF thay vì chỉ có placeholder.
- (+) Tương thích với cả output MinerU VLM đã normalize về flat `contentList` và output pipeline/normal có `img_path`.
- (+) API ảnh không expose public bucket URL; quyền đọc gắn với session user.
- (-) Course đã tạo trước thay đổi này không tự có ảnh thật vì layout JSON cũ chưa có `img_url`.
- (-) Fallback markdown-only từ MinerU không có structured image item nên không thể render ảnh thật.

---

### [ADR-49] MinerU VLM output contract compatibility - 16/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #122 (`fix/mineru-vlm-output`)

**Bối cảnh:** Sau khi chuyển hướng dùng MinerU VLM theo tài liệu mới, một số job parse trả về zip không còn khớp giả định cũ của adapter. Code cũ chỉ đọc `content_list.json` / `_content_list_v2.json`; nếu zip chỉ có markdown hoặc `*_content_list_v2.json` dạng page-grouped của VLM thì `/api/parse-pdf` trả lỗi generic `An internal service failure occurred`.

**Quyết định:**
- Gửi `model_version: "vlm"` khi submit task Precision API, có thể override bằng `PDF_MINERU_MODEL_VERSION` nếu cần rollback sang `pipeline`.
- Không dùng `make_mode`; tài liệu MinerU hiện mô tả `model_version` và output mặc định gồm `full.md`, `*_content_list.json`, `*_content_list_v2.json`.
- Normalize `content_list_v2.json` từ cấu trúc page-grouped `type + content` về flat content list tương thích `contentListToMarkdown`, citation anchors, và `PdfPanel`.
- Nếu không có structured content list nhưng zip có markdown (`content_list_parsed.md`, `full.md`, hoặc file `.md` khác), dùng markdown làm fallback để không chặn course generation.
- Nếu zip thật sự không có nội dung đọc được, `/api/parse-pdf` trả lỗi user-actionable thay vì generic infrastructure failure.

**Hệ quả:**
- (+) Tương thích tốt hơn với VLM backend MinerU 2.5/3.0 và các zip markdown-only.
- (+) Giữ contract nội bộ hiện tại (`contentList` flat) nên Stage 1/Stage 2, citation validation, và source panel không cần đổi lớn.
- (-) Fallback markdown không có bbox/contentList đầy đủ, nên source highlighting có thể kém hơn với những file không có structured JSON.
- (-) `content_list_v2.json` là development format theo tài liệu MinerU, cần test regression khi MinerU đổi schema.

---

### [ADR-48] Parallelize Stage 2 generation cho Fresh Course - 16/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #118 (`perf/parallel-stage2-generation`)

**Bối cảnh:** Sau khi Stage 1 (Planner) hoàn thành, hệ thống tạo Stage 2 (Generator) cho từng chương. Trước đây, `GenerationContext` gọi `fetchChapter` tuần tự cho từng chương để tiết kiệm rate limit và dễ theo dõi tiến độ từng phần. Tuy nhiên, với các khóa học lớn (8-12 chương), tổng thời gian chờ có thể lên tới 3-5 phút dù mỗi chương chỉ mất ~20-30 giây.

**Quyết định:**
- Trong `GenerationContext`, sử dụng `Promise.all` để kích hoạt toàn bộ các lời gọi Stage 2 cùng lúc thay vì đợi từng chương.
- Các chương vẫn được lưu vào cache và Firestore khi hoàn thành lời gọi song song.
- UI `PipelineTracker` vẫn hiển thị tiến độ tổng hợp dựa trên số lượng chương đã hoàn thành trong `courseContentMap`.
- Vẫn giữ cơ chế retry/error handling riêng lẻ cho từng chương để đảm bảo một chương lỗi không làm hỏng cả khóa học.

**Hệ quả:**
- (+) Latency tạo toàn bộ nội dung khóa học giảm từ vài phút xuống còn ~30-40 giây (bằng thời gian của chương dài nhất).
- (+) Tận dụng tối đa concurrency của AI providers (DeepSeek/OpenAI).
- (-) Tăng rủi ro chạm Rate Limit (429) khi gửi 10+ request cùng lúc. Được xử lý bằng cơ chế retry có backoff đã cài đặt ở tầng adapter.
- (-) Khó theo dõi "luồng" sinh từng chương theo thứ tự, nhưng UX tổng thể tốt hơn nhiều vì quá trình "Done" nhanh hơn.

---

### [ADR-47] Parallel per-chunk generation để giảm latency diagnostic quiz - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #117 (`perf/parallel-diagnostic-quiz`)

**Bối cảnh:** Endpoint `/api/diagnostic-quiz` mất ~3.5 phút để hoàn thành. Jaeger trace cho thấy bottleneck nằm ở một lời gọi LLM duy nhất trong `GenerateDiagnosticQuizUseCase.execute()`: toàn bộ chunk của course (thường 20-30 lesson) được nối thành một prompt khổng lồ rồi gửi đi một lần. DeepSeek phải sinh 5,000–8,000 output token trong một response trước khi trả về bất cứ dữ liệu nào — Node.js bị block trong suốt thời gian đó.

**Phân tích các phương án:**
- **Parallel (Promise.all)**: Tách thành N lời gọi song song (1 chunk = 1 câu hỏi), concurrency limit 4. Latency giảm từ ~210s xuống ~10s. Tăng token do lặp lại system prompt N lần, nhưng DeepSeek không có fixed RPM/TPM — giới hạn là dynamic, retry bằng exponential backoff.
- **Streaming (Vercel AI SDK)**: Giữ 1 lời gọi, stream kết quả về UI. Không giảm backend time, chỉ cải thiện perceived UX. Phức tạp hơn nhiều (SSE, partial JSON parsing, UI thay đổi).
- **Batching**: Chia thành nhóm N chunk, xử lý tuần tự. Ít rủi ro rate limit nhưng không tối ưu latency.

**Quyết định:**
- Chọn **Parallel per-chunk** với semaphore concurrency=4 và `withRetry` (exponential backoff, max 3 retries) để xử lý 429 dynamic từ DeepSeek.
- Mỗi lời gọi sinh đúng 1 câu hỏi cho 1 chunk; kết quả được merge lại thành `DiagnosticQuiz` đầy đủ.
- Token usage được cộng dồn từ tất cả lời gọi song song và báo cáo về `IUsageRepository` như cũ.
- Không thay đổi interface `IAiService` hay contract của use case — chỉ thay đổi implementation trong `OpenAiAdapter`.

**Hệ quả:**
- (+) Latency giảm từ ~3.5 phút xuống ~8–15 giây (phụ thuộc DeepSeek server load).
- (+) DeepSeek không có fixed rate limit — dynamic 429 được handle tự động bằng backoff.
- (-) Tổng token tăng do system prompt lặp lại N lần (khoảng +500 tokens/chunk). Với 25 chunk: +12,500 prompt tokens so với call đơn.
- (-) Nếu DeepSeek chịu tải cao, 4 concurrent requests vẫn có thể bị 429 — retry giải quyết được nhưng có thể tăng latency trong peak hours.

---

### [ADR-47] Study-first short-answer self-check flow - 16/05/2026

**Người làm:** Lê Minh Hoàng | **Ref:** PR #126 (`feat/input-short-answer-and-check`), commits `eb4d20e`, `9341569`

**Bối cảnh:** `StudyMode` trước đây chỉ cho reveal đáp án và đánh giá SRS, chưa có luồng active recall nhập câu trả lời ngắn. Flow vào khóa học sau khi generate cũng còn đi vào tab Sửa trước, còn card hành động "Khóa học đã sẵn sàng" nằm xa khu Pipeline nên không gần ngữ cảnh.

**Quyết định:**
- Thêm `web/app/api/answer-evaluation/route.ts` để chấm câu trả lời qua provider AI đang cấu hình (`AI_PROVIDER`) theo 3 nhãn `correct`/`partial`/`incorrect`, có timeout, cache server-side, và fallback về heuristic local trong `web/lib/answer-similarity.ts` khi provider fail.
- `StudyMode` thêm textbox active recall, cache client-side cho cùng câu trả lời, phân biệt 2 hành vi: `Enter` = nút chính (`Xem đáp án` hoặc `Nộp & xem đáp án`), `Space` = chỉ xem nhanh đáp án, `Esc` = blur khỏi textbox.
- Chỉ chạy luồng chấm điểm khi canonical answer đủ dài (`> 30` từ hoặc `> 100` ký tự); card có đáp án ngắn sẽ reveal thẳng, không chấm.
- UI reveal hiển thị `Câu trả lời của bạn` + `Câu trả lời chính xác`; trạng thái `Không chính xác` / `Không chính xác hoàn toàn` dùng tông màu nhẹ, bỏ hiển thị điểm số để giảm cảm giác bị "chấm phạt".
- Luồng `Vào học luôn` chuyển sang `/course/[id]?tab=study`; `CourseFlow`, `CourseTree`, `web/app/course/[id]/page.tsx` nhận `preferredDetailTab='study'` để mở ngay tab Học, auto chọn card đầu tiên, và click/arrow navigation trong tree cũng đi thẳng vào study.
- Card hành động "Khóa học đã sẵn sàng" trên `web/app/page.tsx` chuyển sang rail bên phải, đặt ngay dưới Pipeline để hợp ngữ cảnh hơn.

**Hệ quả:**
- (+) `StudyMode` có active recall flow rõ ràng: người học có thể gõ nháp, xem nhanh, hoặc nộp để so đáp án theo ngữ nghĩa.
- (+) Các card định nghĩa / notation ngắn không bị over-grade; các card dài vẫn có AI evaluation khi cần.
- (+) Luồng sau-generate và vào course từ library bám sát mục tiêu "học ngay", không còn rớt vào tab Sửa trừ khi user chủ động chuyển.
- (-) Tăng thêm một server route phụ thuộc env/provider AI; khi provider chưa set đúng hoặc timeout, UI vẫn phải fallback sang local heuristic.

---

### [ADR-46] Tránh Vitest CJS config startup path trên Linux CI - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #116 (`fix/vitest-config-esm`)

**Bối cảnh:** Job "Run Build Safety Smoke Tests" gọi trực tiếp `NEXT_PHASE=phase-production-build npx vitest run tests/smoke tests/lib` trên Linux Node 20 và fail trước khi chạy test. Stack trace nằm ở `vitest/dist/config.cjs` khi `require()` ESM-only `std-env/dist/index.mjs`.

**Quyết định:**
- Bỏ runtime import `defineConfig` từ `vitest/config` trong `web/vitest.config.ts`.
- Export plain config object tương đương để Vitest load config mà không đi qua helper CJS gây lỗi ESM.
- Giữ nguyên alias `@` và test environment `node`.

**Hệ quả:**
- (+) Lệnh smoke/lib CI load được config mà không chạm lỗi `ERR_REQUIRE_ESM`.
- (+) Không đổi test behavior.
- (-) Mất wrapper `defineConfig`, nhưng config nhỏ và vẫn được `next build`/lint/test xác nhận.

---

### [ADR-45] Multi-card lessons và CourseTree mở chapter một chạm - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #115 (`feat/multi-card-lessons`)

**Bối cảnh:** Thiết kế `CourseTree` đang ép 1 lesson = 1 concept card. Với các lesson dày nội dung, card bị nén quá nhiều fact và người học phải bấm 2 lần: mở chapter rồi mở lesson mới thấy card. Diagnostic vẫn nên bản đồ hóa theo lesson/KC, còn SRS cần đơn vị nhỏ hơn.

**Quyết định:**
- Stage 2 sinh `cards[]` cho mỗi lesson, thường 2-3 card atomic, tối đa 4 khi lesson có nhiều learning point riêng biệt.
- Giữ `concept` là compatibility surface trỏ về card đầu tiên để course cũ và các surface phụ không gãy.
- Cache Stage 2 concept-only không có `cards[]` được coi là stale và sẽ regenerate.
- CourseTree bỏ accordion lesson: bấm chapter một lần sẽ hiện lesson label và toàn bộ concept cards bên dưới.
- Diagnostic tiếp tục map theo lesson id `ci-li`; SRS card id mới dùng `ci-li-cardIndex`, có fallback progress cho card đầu tiên từ legacy `ci-li`.

**Hệ quả:**
- (+) Dense lesson không còn bị nén vào một card duy nhất.
- (+) UI giống course outline hơn: chapter mở ra các lesson label và card item trực tiếp.
- (+) Diagnostic, SRS và UKT vẫn tách đúng vai trò: diagnostic/practice theo lesson/KC, SRS theo card/KC.
- (+) Course cũ concept-only vẫn render được, nhưng course/cache mới sẽ chuyển sang `cards[]`.

---

### [ADR-44] Việt hóa kc_name registry và spider chart labels - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #114 (`fix/knowledge-registry-vietnamese-labels`)

**Bối cảnh:** Sau khi xây spider chart và diagnostic results, section "Theo chủ đề" hiển thị tên KC trực tiếp từ `kc_name` trong registry — nhưng các giá trị này đang là tiếng Anh ("General clinical reasoning", "General anatomy"). Spider chart có 3 label jargon nội bộ ("Bản đồ UKT", "Mức độ nắm vững theo module y khoa", "mastery + độ chắc") không thân thiện với người học. ADR-40 đã Việt hóa một phần UI nhưng bỏ qua tầng registry.

**Quyết định:**
- Dịch `MEDICAL_MODULES[].name` sang tiếng Việt: Anatomy → Giải phẫu, Physiology → Sinh lý, Pharmacology → Dược lý, Microbiology → Vi sinh, Pathology → Bệnh lý, Clinical Medicine → Lâm sàng, Biochemistry → Hóa sinh, Immunology → Miễn dịch.
- Dịch toàn bộ 48 `MEDICAL_KCS[].kc_name` sang tiếng Việt (ví dụ: "General clinical reasoning" → "Lý luận lâm sàng đại cương").
- Đổi 3 label spider chart: "Bản đồ UKT" → "Bản đồ năng lực", "Mức độ nắm vững theo module y khoa" → "Năng lực theo module y khoa", "mastery + độ chắc" → "Thành thạo · độ chắc chắn".
- `kc_id` và `module_id` (English slugs) giữ nguyên — đây là stable identifier cho UKT, Firestore, và prompts.

**Hệ quả:**
- (+) "Theo chủ đề" trong DiagnosticResults hiển thị tên tiếng Việt thay vì English.
- (+) Spider chart label thân thiện, không lộ jargon UKT với người học.
- (+) `module_name` trong `KnowledgeComponentRef` (ghi vào Firestore) sẽ là tiếng Việt với các course mới. Course cũ giữ nguyên English `module_name` đã lưu — UKT aggregate theo `module_id` (slug) nên không ảnh hưởng tính toán.

---

### [ADR-43] Enforce Vietnamese output trong diagnostic/quiz/Stage 2 prompts - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #113 (`fix/prompts-vietnamese-quiz-output`)

**Bối cảnh:** Diagnostic quiz và quiz trong Stage 2 đôi khi ra tiếng Anh, đôi khi tiếng Việt — không nhất quán. Concept cards Stage 2 luôn ra tiếng Việt vì phần đó có ví dụ schema tiếng Việt rõ ràng ("X hoạt động như thế nào?"). Nhưng phần quiz trong `STAGE2_CHAPTER_PROMPT` và toàn bộ `DIAGNOSTIC_QUIZ_PROMPT` / `DIAGNOSTIC_QUIZ_PROMPT_LIGHTWEIGHT` chỉ có ví dụ schema tiếng Anh ("Question text here?", "Option A is correct because…") → LLM follow example language.

**Quyết định:**
- Thêm rule tường minh "Write ALL questions, options, and explanations in Vietnamese" vào phần quiz của `STAGE2_CHAPTER_PROMPT`.
- Thêm "ALL question, options, and explanation text MUST be written in Vietnamese" vào `DIAGNOSTIC_QUIZ_PROMPT` và `DIAGNOSTIC_QUIZ_PROMPT_LIGHTWEIGHT`.
- Cập nhật ví dụ schema trong cả 3 prompt từ tiếng Anh sang tiếng Việt ("Cơ chế hoạt động của X là gì?", "Đáp án A đúng vì…").
- Không thay đổi `PLANNER_PROMPT` — planner dùng rule "Output MUST match source document language" đã đúng.

**Hệ quả:**
- (+) Diagnostic quiz và chapter quiz nhất quán tiếng Việt.
- (+) Concept cards Stage 2 không bị ảnh hưởng — đã có ví dụ tiếng Việt từ trước.
- Đây là bổ sung cho ADR-40 (không phải đảo ngược) — ADR-40 chỉ Việt hóa UI copy, còn prompts chưa được enforce language.

---

### [ADR-42] Fix Rolldown optional binding cho Vitest CI - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #112 (`fix/ci-rolldown-optional-binding`)

**Bối cảnh:** Sau PR #111, `web-build-test` fail ở bước smoke tests với lỗi `Cannot find native binding` từ `rolldown`, thiếu package optional `@rolldown/binding-linux-x64-gnu`. `web/package-lock.json` đã có binding này, nên lỗi đến từ npm optional-dependency handling trên self-hosted Linux runner, không phải thiếu lockfile.

**Quyết định:**
- Đổi bước web dependency install thành `npm ci --include=optional` để ép npm cài optional dependencies.
- Thêm bước Linux-only repair sau `npm ci`: cài local `@rolldown/binding-linux-x64-gnu@1.0.0-rc.15` bằng `npm install --no-save --include=optional --no-audit --no-fund`.
- Verify ngay bằng `node -e "require.resolve('@rolldown/binding-linux-x64-gnu')"` trước khi chạy typecheck/lint/Vitest.

**Kết quả mong đợi:** Vitest không còn fail startup vì thiếu native Rolldown binding trên Linux CI; nếu test fail tiếp thì lỗi sẽ nằm ở test/app logic thật.

---

### [ADR-41] Fix Railway deploy npm prefix - 15/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #111 (`fix/railway-deploy-npm-prefix`)

**Bối cảnh:** `web-build-test` đã pass nhưng job `deploy-web` fail ở bước `npx railway up` với lỗi npm `ENOENT ... _work/_temp/npm-global`. Lỗi xảy ra trước khi Railway deploy thật sự chạy, do self-hosted runner có npm global prefix trỏ tới thư mục temp chưa tồn tại hoặc không ổn định.

**Quyết định:**
- Deploy job tạo rõ thư mục npm prefix bằng `${RUNNER_TEMP:-/tmp}/npm-global`.
- Export `NPM_CONFIG_PREFIX` qua `$GITHUB_ENV` để các bước sau dùng cùng prefix hợp lệ.
- Cài Railway CLI local bằng `npm install --no-save --no-audit --no-fund @railway/cli`.
- Gọi trực tiếp `./node_modules/.bin/railway up ...` thay vì `npx railway ...` để tránh `npx` chạm vào global prefix lỗi.
- Áp dụng cùng pattern cho cả `deploy-web` và `deploy-ukt`.

**Kết quả mong đợi:** CI deploy không còn fail vì thiếu thư mục npm global temp; nếu deploy fail tiếp thì lỗi sẽ đến từ Railway/project config thật, không phải npm bootstrap.

---

### [ADR-40] Việt hóa copy sau dashboard UKT - 14/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #110 (`refactor/vietnamese-ukt-copy`)

**Bối cảnh:** Sau khi dashboard UKT chạy được, một số bề mặt user-facing vẫn còn English copy như `UKT mastery`, `Medical module spider chart`, Admin Monitor labels và README/PIPELINE đoạn mới. Product muốn ưu tiên tiếng Việt cho UI và documentation, nhưng giữ thuật ngữ kỹ thuật khi cần rõ contract.

**Quyết định:**
- Việt hóa text nhìn thấy trong spider chart UKT, trạng thái đồng bộ UKT ở diagnostic result và Admin Monitor.
- Chart hiển thị tên module bằng tiếng Việt: Giải phẫu, Sinh lý, Dược lý, Vi sinh, Bệnh lý, Lâm sàng, Hóa sinh, Miễn dịch.
- README, PIPELINE và WORKLOG đổi các đoạn user-facing mới sang tiếng Việt; giữ route/API field/code identifier như `kc_id`, `p_correct`, `sigma`, `/api/ukt/mastery`.
- Không dịch prompt/schema contract trong `web/lib/prompts.ts` để tránh làm thay đổi hành vi LLM và provider parsing.

**Kết quả mong đợi:** App và tài liệu chính nhất quán tiếng Việt hơn, còn thuật ngữ kỹ thuật vẫn đủ rõ để dev/test không bị nhầm contract.

---

### [ADR-39] Dashboard cá nhân hóa UKT - 14/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #109 (`feat/dashboard-ukt-mastery`)

**Bối cảnh:** PR #108 mới hiển thị spider chart ngay sau diagnostic quiz. Product cần chart này là bề mặt cá nhân hóa ở main page: đọc lịch sử tín hiệu UKT đã tích lũy của user, không phụ thuộc việc vừa làm diagnostic xong.

**Quyết định:**
- UKT service thêm `GET /state/{student_id}` để trả persisted `knowledge_state` theo KC.
- Web thêm `/api/ukt/mastery`: verify session, đọc UKT state của user hiện tại, aggregate thành 8 module từ `MEDICAL_MODULES`.
- Main dashboard gọi `/api/ukt/mastery` và render spider chart trước activity heatmap. User mới vẫn thấy đủ 8 trục ở trạng thái no-data.
- `aggregateModuleMastery()` giờ gom cả `p_correct`/`mu` cho mức nắm vững và `sigma` cho độ không chắc; UI vẽ band độ không chắc và hiện phần trăm độ chắc.
- Root `docker-compose.yml` default `REDIS_URL=redis://redis:6379` cho web/UKT và bật Redis AOF + named volume để state không rơi về in-memory khi local `.env` chưa set Redis.
- Chapter quiz signal sẽ dùng cùng `/api/ukt/interactions` với `kc_id` khi chapter quiz UI được nối vào luồng submit; hiện tại diagnostic và SRS đã ghi vào cùng KC namespace.

**Kết quả mong đợi:** Main page trở thành nơi soi mức nắm vững/độ chắc theo module xuyên suốt lịch sử diagnostic và SRS; chart không còn bị giới hạn trong màn hình kết quả diagnostic.

---

### [ADR-38] Spider chart UKT theo module - 14/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #108 (`feat/spider-chart-structure`)

**Bối cảnh:** Sau PR #104/#105, UKT đã nhận `kc_id` ổn định và trả `knowledge_state` theo KC. Product cần một lớp hiển thị theo module lớn để learner nhìn nhanh điểm mạnh/yếu theo 8 trục y khoa thay vì đọc từng KC rời rạc.

**Quyết định:**
- Spider chart dùng đúng 8 axis từ `MEDICAL_MODULES`: Giải phẫu, Sinh lý, Dược lý, Vi sinh, Bệnh lý, Lâm sàng, Hóa sinh, Miễn dịch.
- Điểm nguồn là UKT `knowledge_state[KC].p_correct`; nếu thiếu mới fallback sang `mu`.
- `aggregateModuleMastery()` gom nhiều KC cùng `module_id` bằng trung bình cộng và trả đủ 8 module theo thứ tự registry.
- Module chưa có KC evidence hiển thị dạng no-data (`score = null`), không coi là 0% mastery.
- Diagnostic results sync `/api/ukt/interactions` và hiển thị spider chart ngay trên màn hình kết quả. Nếu UKT lỗi, diagnostic coloring local vẫn tiếp tục như trước.

**Kết quả mong đợi:** Learner thấy mức nắm vững theo module ngay sau diagnostic quiz; SRS vẫn tiếp tục cập nhật cùng KC namespace để spider chart có thể mở rộng thành dashboard bền vững sau này.

---

### [ADR-37] Canonical ConceptCard answer and AI tutor follow-ups - 14/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #107 (`feat/canonical-card-answer`)

**Bối cảnh:** Card editor đang tách `TL;DR` và `Chi tiết` thành hai answer surfaces. Hai field có thể khác nội dung và khác citation, làm learner khó biết đâu là câu trả lời chính thống. Khi thêm cosine similarity/active recall scoring, nhiều answer surfaces sẽ làm muddy source và có nguy cơ chấm điểm theo text không giống UI user vừa học.

**Quyết định:**
- Stage 2 chỉ sinh một `answer` canonical, source-backed, có inline citation markers.
- `detail` giữ optional để backward compatible với saved courses cũ, nhưng không còn được generate hoặc render như một ô đáp án riêng trong `EditMode`.
- `followUps` được giữ lại vì ngắn, tốn ít token, và dùng như AI tutor prompts. Follow-up không có citation và không tham gia active-recall scoring.
- Diagnostic chunk input bỏ `Detail:` và chỉ đưa outline + concept question + canonical answer vào prompt.
- Citation validation chỉ validate marker trong `answer`, vì đây là source truth duy nhất của card mới.
- Cache guard coi Stage 2 cache/saved content còn `detail` là stale để cùng một PDF/hash vẫn regenerate canonical cards thay vì reuse TL;DR/Chi tiết cũ.
- StudyMode reveal cũng đổi label từ `TL;DR` sang `Câu trả lời` và không render legacy `detail`; SRS rating flow giữ nguyên.
- Xóa nút `nguồn` riêng trong `EditMode`; user mở source trực tiếp bằng citation number cạnh từng claim.
- SRS review UI chưa đổi trong phase này; SRS input tiếp tục gửi `concept.answer` làm đáp án canonical.

**Ước tính giảm token:**
- Prompt: giảm khoảng 94 prompt tokens cho mỗi Stage 2 chapter call do schema/rules ngắn hơn.
- Completion: giảm khoảng 100-220 completion tokens mỗi lesson vì không còn emit `detail` 3-5 câu.
- Stage 2 completion: giảm ước tính 15-30%, tùy độ dài answer và quiz.
- Tổng Stage 2 tokens: giảm ước tính 8-18% khi `raw_context` dài.
- Tổng pipeline: giảm ước tính 5-12% vì Stage 1, raw_context input và quiz vẫn giữ nguyên.

**Kết quả:** Edit tab có một ô `Câu trả lời` canonical và AI tutor/follow-up prompts phía sau. Source citation và input chấm active recall sau này đều quy về một answer duy nhất.

---

### [ADR-36] Stable Knowledge Components for UKT tracing - 14/05/2026

**Người làm:** Nguyen Binh Thanh | **Ref:** PR #104 (`feat/kc-pipeline-metadata`), PR #105 (`feat/kc-main-squash`)

**Bối cảnh:** UKT cần trace tiến độ học xuyên nhiều session và nhiều tài liệu, nhưng `topic` cũ là free-text do LLM sinh nên không ổn định. Nếu cùng một nội dung lúc được gọi là "General physiology", lúc khác là "Physiology basics", UKT sẽ coi là hai kỹ năng khác nhau và spider chart/module mastery mất ý nghĩa.

**Quyết định:**
- Tạo registry y khoa cố định `medical-v1` gồm tối đa 8 module lớn: anatomy, physiology, pharmacology, microbiology, pathology, clinical, biochemistry, immunology.
- Stage 1 Planner phải gán mỗi lesson vào `knowledge: { kc_id, kc_name, module_id, module_name, confidence }`; server normalize lại bằng `normalizeCourseKnowledge()` để `kc_id` deterministic.
- Giữ fallback `{module}.general` để mọi lesson đều có KC hợp lệ nếu classifier chưa đủ chi tiết.
- Stage 2 chỉ propagate metadata, không tự tạo KC identity mới; concept cards nhận `kc_id/module_id` từ lesson.
- Diagnostic quiz và SRS đều gửi tín hiệu vào UKT: diagnostic dùng `/api/ukt/interactions`, review card dùng `/update` với `kc_id`.
- Diagnostic prompt nhận `[[KC_ID]]`/`[[MODULE_ID]]`, nhưng use case vẫn overwrite metadata từ trusted chunk map để tránh LLM drift.

**Kết quả:** Diagnostic response đã trả `student_id` thật và `knowledge_state` theo KC ổn định như `pathology.general`, `physiology.general`, `biochemistry.general`. `priority_order` dùng được cho ưu tiên học, còn spider chart có thể aggregate theo `module_id`.

**Ghi chú merge:** PR #104 đã merge vào branch `fix/diagnostic-lesson-coverage`, không phải `main`. Khi đưa lên `main`, dùng Squash and merge để giữ nhiều commit làm việc trong PR nhưng chỉ tạo một commit tổng hợp trên `main`.

---

### [ADR-35] Diagnostic quiz maps 1-1 to lesson progress - 12/05/2026

**Nguoi lam:** Nguyen Binh Thanh | **Ref:** PR #103 (`fix/diagnostic-lesson-coverage`)

**Boi canh:** Fresh generation dang prefetch diagnostic ngay sau chapter dau tien va gui raw MinerU markdown. API legacy boc markdown thanh chunk `legacy-full`, nen AI co the tra `source_chunk_id = legacy-full` thay vi key lesson `ci-li`. Ket qua: user lam diagnostic xong nhung CourseTree van hien nhieu lesson "Chua test".

**Quyet dinh:**
- Tao `lib/diagnostic-chunks.ts` de build moi lesson thanh mot chunk `{ id: "ci-li", text }`.
- Strip inline citation markers `[chunk-X-Y]` truoc khi gui sang diagnostic prompt de AI khong nham voi `source_chunk_id`.
- Doi prefetch tu `{ markdown }` sang `{ chunks }` va chi chay sau khi full course content da co, ke ca fresh generation.
- Prompt diagnostic yeu cau exactly one question per `SOURCE_CHUNK_ID`; use case normalize id neu provider tra thieu/sai/duplicate.
- Validate localStorage cache: questions/results cu dung `legacy-full` hoac khong cover du lesson ids se bi xoa va regenerate.

**Ket qua:** Khi diagnostic generation thanh cong, moi lesson trong course co mot question map ve key `ci-li`; `DiagnosticResults` tao `diagnosticState["ci-li"]` va CourseTree khong con grey do sai id. Neu AI khong tra du coverage, UI chuyen `diagnostic-error` de retry/skip thay vi save cache hong.

**Follow-up fix (14/05/2026):** Với tài liệu lớn, AI có thể trả ít câu hỏi hơn số lesson. Strict 100% coverage làm UI fail dù server trả 200. Đổi sang partial-coverage acceptance: questions chỉ cần non-empty, results được giữ nếu có ít nhất một key khớp lesson hiện tại, và lesson không có câu diagnostic vẫn grey "Chua test".

---

### [ADR-34] Monitoring restructure và distributed tracing — 12/05/2026

**Người làm:** Lê Kim Dũng | **Ref:** PR #93, #94, #95, #96

**Bối cảnh:** Sau khi có Prometheus/Grafana ở Sprint 6, monitoring cần được tổ chức lại rõ hơn theo service, đồng thời bổ sung tracing để quan sát luồng request qua Web App, UKT service và collector.

**Quyết định:**
- Restructure repo để phần Next.js nằm dưới `web/`, giữ monitoring config tách riêng trong `monitoring/`.
- Thêm OpenTelemetry Collector, Alertmanager, Loki/Jaeger datasource provisioning và rule files cho Prometheus.
- Instrument Web App và UKT service để gửi trace/metrics qua collector.
- Bổ sung network alias cho `otel-collector`, requirements cho UKT, và endpoint `/api/auth/me` để verify session.

**Kết quả:** Sprint 7 bắt đầu bằng nhánh monitoring restructure, tập trung vào observability/tracing thay vì các task citation/generation của Sprint 6.

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

```ts
const scrollTarget    = selectedChunkId ?? chunkStart ?? null
const highlightStart  = selectedChunkId ?? chunkStart ?? null
const highlightEnd    = selectedChunkId ?? chunkEnd   ?? null
```

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
