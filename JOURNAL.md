# Weekly Journal

Ghi lại hành trình xây dựng sản phẩm mỗi tuần — những gì đã làm, học được gì, AI giúp như thế nào.

> **Cập nhật mỗi cuối tuần** (trước khi tạo PR). Không cần dài, chỉ cần thật.

**Thành viên:** Nguyễn Bình Thành, Lê Kim Dũng, Lê Minh Hoàng

---

## Tuần 8 — 17/05/2026

### Nhóm

#### Đã làm
- Refactor IP-11 hardening: shared generic API route handler types, dọn `any` ở middleware/API wrappers
- Sửa đồng bộ dashboard/course library sau khi generate-save xong bằng callback refresh từ `GenerationProvider`
- Siết UKT `StateStore.update()` với retry Redis `WATCH` có giới hạn + backoff để tránh loop vô hạn
- Bổ sung test coverage cho `answer-evaluation`, generation partial failure/cancel/cache hit, UKT concurrency/Redis fallback, monitoring bridge malformed payload
- Dọn warning lint cũ ở `CourseTree.tsx` và `StudyMode.tsx`

#### Khó nhất tuần này
- Giữ workflow generation/cache nhất quán mà không làm lệch sidebar course list hoặc đẩy thêm fetch thừa
- Cân bằng retry Redis đủ an toàn nhưng không để request treo vô hạn

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Rà refactor IP-11, sửa regression, cập nhật docs | Giảm rủi ro và giữ code/type/lint/test sạch |

#### Học được
- Những bug “nhỏ” như refresh state, retry cap, và cache flag sai thường gây lỗi UX lớn hơn mình nghĩ.
- Khi đổi kiến trúc, test regression cho các nhánh partial/cached/fallback là bắt buộc.

#### Nếu làm lại, sẽ làm khác
- Tách dashboard state và generation orchestration sớm hơn để tránh phải sửa nhiều lớp cùng lúc.

#### Kế hoạch tuần tới
- Theo dõi trace Firestore AggregationQuery và tối ưu các request dashboard còn chậm
- Rà lại các warning lint còn ở những file không thuộc phạm vi refactor hiện tại

---

## Tuần 1 — 05/04/2026

#### Đã làm
- Setup Next.js 15 + Tailwind + TypeScript từ đầu
- Kết nối MinerU Precision API để parse PDF ra markdown (upload qua Firebase Storage → gọi extract → poll kết quả → trả markdown)
- Tạo Firebase Admin SDK init (`lib/firebase-admin.ts`) làm trung gian upload file cho MinerU
- Xây POST `/api/parse-pdf` — nhận file PDF, trả markdown
- Xây Planner Agent với Gemini 2.0 Flash — đọc markdown, chia thành chapters/lessons, trả Course JSON (`lib/ai.ts`, `lib/prompts.ts`, `lib/types.ts`)
- Tạo POST `/api/generate-course` — endpoint cho Planner Agent
- Xây UI: drag-drop upload PDF → accordion chapters → click lesson xem source_text trong modal
- Chia 9 commits nhỏ theo logic, viết WORKLOG + ADR-1 + ADR-2

#### Khó nhất tuần này
- Adapt theo nhịp học của trường 

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Build toàn bộ pipeline: parser layer, Firebase upload, Planner Agent, API routes, UI | Hoàn thành MVP trong 1 ngày, 9 commits clean |
| Claude (claude.ai) | Thought partner, viết prompt cho Claude Code, thiết kế flow | Giúp ra quyết định nhanh hơn (MinerU flow, Gemini JSON mode) |

#### Học được
- Kinh nghiệm quý giá và góc nhìn độc đáo từ các anh chị trong chương trình

#### Nếu làm lại, sẽ làm khác
- Không gì cả

#### Kế hoạch tuần tới
- MVP: Slide Agent + Quiz Agent

---

## Tuần 2 — 12/04/2026

---

### Nguyễn Bình Thành

#### Đã làm
- Chuyển AI provider từ Gemini sang OpenAI GPT-4o
- Tách pipeline thành 2 stage: Stage 1 (outline) → Stage 2 (slides + quiz); dùng `contentList` thay markdown làm input
- Xây Stage 2 (`/api/generate-content`): generate slides + quiz song song cho tất cả chapters (`Promise.allSettled`)
- Tích hợp Reveal.js slide viewer (CDN, embedded) với speaker notes panel; sync index qua event listener
- Xây Quiz UI: single-choice, hiển thị đáp án + giải thích
- Fix Stage 1 bỏ sót/gộp lessons: inject `##` markers vào contentList trước khi gửi LLM thay vì chỉ sửa prompt
- Thêm AI logging + monitoring

#### Khó nhất tuần này
- Stage 1 vẫn gộp lessons dù prompt có "do NOT merge" — vì input là plain string, LLM không có boundary signal. Fix: emit `## heading` cho section titles → deterministic, không phụ thuộc LLM.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Build Stage 2 pipeline, Reveal.js integration, fix lesson-splitting bug, viết ADRs | Hoàn thành toàn bộ trong tuần, commit sạch theo convention |

#### Học được
- Structural signal quan trọng hơn prompt instruction: `## marker` trong input hiệu quả hơn "do NOT merge" trong prompt.

#### Nếu làm lại, sẽ làm khác
- Luôn inspect input string gửi LLM trước khi debug prompt.

#### Kế hoạch tuần tới
- Hiển thị ảnh từ PDF gốc vào slides
- Cải thiện UI/UX, thiết kế slide đẹp hơn
- Interactive lesson: highlight text đồng bộ theo speech
- TTS (Text-to-Speech) integration

---

### Lê Kim Dũng

#### Đã làm
- **Dự án chính (PDF-to-Lesson):**
  - Tái cấu trúc (refactor) codebase từ dạng monolithic trong Next.js API sang chuẩn Clean Architecture (Ports & Adapters).

#### Khó nhất tuần này
- Thiết kế boilerplate cho Clean Architecture: phải đưa ra quyết định chuyển logic từ API Route sang Use Cases và tách Adapter (Firebase, MinerU, OpenAI) cho đúng chuẩn.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| AI Agent | Refactor dự án sang Clean Architecture, tư vấn thiết kế luồng Stage 2, prompt engineering, và log docs (WORKLOG/JOURNAL) | Tiết kiệm nhiều giờ setup boilerplate, tìm ra cách fix lỗi merge topic bằng cách inject `##` markers vào input. |

#### Học được
- Áp dụng sơ đồ Clean Architecture từ đầu sẽ vất vả phần setup nhưng khi cần swap provider hoặc thêm tính năng mới ở core sẽ rất khỏe và tránh technical debt rải rác.

#### Nếu làm lại, sẽ làm khác
- Thiết kế cấu trúc file theo hướng Interface/Use Case (Clean Architecture) ngay từ tuần đầu để khỏi mất một đợt refactoring lớn.

#### Kế hoạch tuần tới
- Làm tính năng authentication

---

## Tuần 3 — 19/04/2026

---

### Nguyễn Bình Thành

#### Đã làm
- Đổi model Gemini → OpenAI GPT-4o để giảm chi phí token, thêm debug pipeline
- Xây dựng structure tree cho khóa học từ tài liệu PDF
- **Đổi hướng sản phẩm:** chuyển từ "tạo slide" sang target cụ thể "học sinh ôn thi trong 1 đêm" — scope sâu hơn, painpoint chính xác hơn
- Quyết định xóa toàn bộ tính năng slide (sau nhiều ngày phân vân giữa 3 hướng: closed API / JS-based / pptx native) — thay bằng ConceptCard text đơn giản hơn
- Tối ưu số token trong pipeline: chuyển 2 stage sang GPT-4o-mini, thay `source_text` verbatim bằng `outline: string[]` (−79% completion tokens)
- Implement ConceptCard: câu hỏi → ô input tự trả lời → Reveal → TL;DR + follow-ups + Anki mock buttons
- Chuyển parser sang `content_list.json` + viết regex classifier + seen-set dedupe (72 marker → 8 `##` + 20 `###`)

#### Khó nhất tuần này
- Không biết chọn hướng nào để gen slide (closed API vs JS-based vs pptx native) — mất thời gian nghiên cứu trước khi quyết định bỏ slide hoàn toàn.
- content_list naive emit `##` cho mọi `text_level=1` → LLM bị flood context, drop chapter, output sai ngôn ngữ. Fix bằng regex classifier + dedupe.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Viết regex classifier, content-list-converter, tái cấu trúc ConceptCard type + UI, tối ưu token | Hoàn thành trong sprint |

#### Học được
- Bỏ feature đúng thời điểm (xóa slide) giảm complexity lớn hơn là tối ưu feature đó.
- Structural signal trong input (marker `##`) quan trọng hơn instruction trong prompt.
- Đổi hướng sớm (tuần 3) tốt hơn đổi hướng muộn — pivot nhanh ít tốn công hơn.

#### Nếu làm lại, sẽ làm khác
- Quyết định bỏ slide từ tuần 2 thay vì mất 1 tuần phân vân giữa các hướng gen slide.

#### Kế hoạch tuần tới
- Learning Dashboard: lưu & browse khóa học đã tạo
- Gamification: Streak, Heatmap, Mastery ring
- Giao diện theo dõi tiến trình AI tạo bài

---

### Lê Kim Dũng

#### Đã làm
- **Tính năng Authentication (Xác thực):**
  - Hoàn thiện luồng xác thực sử dụng Firebase Admin SDK và cơ chế Session Cookie (HttpOnly).
  - Tách biệt logic xác thực thành các Use Cases (`CreateSession`, `VerifySession`) và Port/Adapter để đảm bảo tính Module hóa.
  - Xây dụng các endpoint API: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
  - Kiểm thử thành công luồng login và tạo session cookie trên môi trường dev.
- **Pipeline CI/CD:**
  - Khởi tạo branch `cicd` và thiết lập GitHub Actions workflow tự động (`cicd.yml`).
  - Cấu hình các bước tự động Lint, Unit Test (Vitest), và Build để đảm bảo chất lượng code trước khi merge.
  - Chuẩn bị tài liệu mô tả kiến trúc tính năng Authentication cho team.

#### Khó nhất tuần này
- Xử lý các vấn đề liên quan đến biến môi trường (Environment Variables) cho Firebase Private Key khi chạy trên GitHub Actions và local.
- Đổi hướng từ sử dụng JWT thuần túy sang Session Cookie để tăng độ bảo mật chống XSS.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| AI Agent | Hỗ trợ viết code cho Auth Ports/Adapters, thiết kế pipeline CI/CD, viết tài liệu mô tả và cập nhật logs. | Tăng tốc độ triển khai phần khung (scaffolding) và giải quyết các lỗi cấu hình GitHub Actions nhanh chóng. |

#### Học được
- Hiểu sâu hơn về sự khác biệt giữa ID Token và Session Cookie trong hệ sinh thái Firebase.
- Cách thiết lập một pipeline CI/CD cơ bản nhưng chặt chẽ cho dự án Next.js 15.

#### Nếu làm lại, sẽ làm khác
- Nên viết spec cho các API Auth trước khi code để frontend có thể song hành nhanh hơn.

#### Kế hoạch tuần tới
- Hiện thực hóa phân quyền (Authorization) dựa trên Role người dùng.
- Tích hợp thêm bước tự động deploy (CD) lên Railway hoặc Vercel ngay khi check-in code.

---

## Tuần 4 — 26/04/2026

---

### Nguyễn Bình Thành

#### Đã làm
- Xây Learning Dashboard (`/dashboard`): lưu và browse các khóa học đã tạo
- Tích hợp Spaced Repetition System (SM2): theo dõi tiến độ từng thẻ, lên lịch ôn tập
- Nâng cấp UX trang Study & Edit: phím tắt (E/A), dán nhãn nguồn (source badge)
- Thêm Gamification ở trang Home: Streak (chuỗi ngày học), Heatmap 30 ngày, Mastery ring
- Giao diện Pipeline Tracker: thanh tiến trình lúc đợi AI tạo khóa học
- Cải tổ trang Browse: thêm rail điều hướng, cột lọc theo tiến độ
- Refactor Browse theo Clean Architecture (Port/Adapter/Use case)
- Fix log hook UTF-8 encoding trên Windows (PR #35)

#### Khó nhất tuần này
- UI/UX vẫn là điểm yếu — biết muốn cải thiện nhưng chưa có direction cụ thể để thực hiện.
- Merge PR #30 xong GitHub tự động đóng PR #31 và #32 đang target vào branch đó — phải tạo lại thành PR #36, #37.
- Điểm PR bị đánh thấp (~52/100) vì nhồi nhiều tính năng vào một PR, thiếu mô tả lý do và bằng chứng.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Build Dashboard, Gamification components, Browse refactor, fix UTF-8 hook | Hoàn thành 7 PR trong sprint |

#### Học được
- Atomic PR quan trọng: 1 PR = 1 concern. Nhồi tính năng vào 1 PR khó review và bị điểm thấp.
- Không xóa branch trước khi chắc chắn không có PR nào đang target vào đó.

#### Nếu làm lại, sẽ làm khác
- Chia PR từ đầu theo 3 lớp (Structure → UI → Logic) thay vì commit xong mới chia.

#### Kế hoạch tuần tới
- Synapsy UI redesign
- Tách CourseFlow thành component nhỏ hơn
- Fix luồng diagnostic và generation bugs

---

### Lê Kim Dũng

#### Đã làm
- **Spaced Repetition System (SRS)**: Hiện thực hóa thuật toán SM2 để theo dõi và lên lịch ôn tập cho từng thẻ ConceptCard.
- **Progress Persistence**: Xây dựng `ProgressRepository` và Firestore adapter để lưu trữ bền vững trạng thái học tập của user.
- **DI Refactoring**: Tái cấu trúc Dependency Injection tập trung tại `infrastructure/di.ts`, giúp tách biệt logic nghiệp vụ khỏi infrastructure.
- **Course Player**: Xây dựng trang `/course/[id]` hỗ trợ tải dữ liệu trực tiếp từ Firestore, cho phép lưu và xem lại khóa học bất cứ lúc nào.
- **UKT Groundwork**: Khởi tạo cấu trúc cho User Knowledge Tracing service và xử lý luồng khóa học trùng lặp.

#### Khó nhất tuần này
- Xử lý logic tính toán `next_due_date` và `interval` trong thuật toán SM2 để đảm bảo đồng bộ chính xác giữa client và server (Firestore).
- Refactor DI cho toàn bộ hệ thống mà không làm gián đoạn luồng tạo khóa học đang chạy.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Refactor DI, implement SM2 algorithm, thiết kế Firestore schema cho progress | Hoàn thành bộ khung SRS ổn định |

#### Học được
- Việc tách biệt Infrastructure qua DI giúp việc đổi từ LocalStorage sang Firestore cực kỳ nhanh chóng mà không phải sửa code UI.

#### Nếu làm lại, sẽ làm khác
- Sẽ thiết kế schema cho Progress linh hoạt hơn để hỗ trợ nhiều loại bài tập khác nhau (không chỉ ConceptCard).

#### Kế hoạch tuần tới
- Xây dựng hệ thống chẩn đoán kiến thức (Diagnostic) ở backend.

---

## Tuần 5 — 03/05/2026

---

### Nguyễn Bình Thành

#### Đã làm
- Synapsy UI redesign toàn bộ trang `/course/[id]`
- Tách `CourseFlow` monolithic (~1973 dòng) thành state machine với các component riêng: `DiagnosticIntro`, `DiagnosticQuiz`, `CourseTree`, `LessonView`
- Fix luồng diagnostic: dùng `localStorage` flag (`justGenerated_`) để chỉ hiện diagnostic khi user vào từ thư viện, không hiện sau redirect tự động từ generation
- Dùng `useRef` guard chống React Strict Mode double-mount khiến flag bị tiêu thụ 2 lần
- Fix generation: branch `fromCache` thiếu `saveCourse` → course không lưu vào thư viện, nút "Học ngay" không hoạt động
- Fix redirect vào 404 khi course bị xóa rồi tạo lại cùng file
- Thay auto-redirect bằng màn hình hoàn thành 2 nút: "Học luôn →" vs "← Quay về thư viện"

#### Khó nhất tuần này
- React Strict Mode mount component 2 lần → `useEffect` chạy 2 lần → flag `justGenerated_` bị đọc ở lần 1, lần 2 không còn flag và hiển thị diagnostic nhầm. Mất thời gian debug vì hành vi này chỉ xuất hiện trong dev mode.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Tách CourseFlow, debug double-mount, fix 4 bug generation | PR #46 hoàn thành trong sprint |

#### Học được
- `useRef` không bị reset giữa các lần mount của React Strict Mode — dùng làm "run-once guard" thay vì `useState`.
- `await` trong Promise chain còn có tác dụng phụ là phá batch React update, ảnh hưởng thứ tự render.

#### Nếu làm lại, sẽ làm khác
- Viết integration test cho CourseFlow state machine trước khi refactor để phát hiện regression sớm hơn.

#### Kế hoạch tuần tới
- Redesign `/course/[id]` sang Master-Detail layout

---

### Lê Kim Dũng

#### Đã làm
- **Diagnostic Use Case**: Hiện thực hóa `GenerateDiagnosticQuizUseCase` ở backend, trích xuất kiến thức trọng tâm từ bài học để tạo câu hỏi chẩn đoán.
- **SRS Prioritization**: Xây dựng logic ưu tiên thẻ ôn tập dựa trên độ khó (ease_factor) và thời gian đến hạn.
- **Monitoring Research**: Nghiên cứu và thiết lập các metrics cơ bản cho hệ thống sử dụng Prometheus.
- **Traceability**: Cải thiện khả năng truy vết dữ liệu trong luồng xử lý AI để phục vụ debug và audit.

#### Khó nhất tuần này
- Thiết kế prompt chẩn đoán sao cho AI sinh đúng 1 câu hỏi cho mỗi bài học (lesson-scoped) để đảm bảo độ phủ kiến thức 100%.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| AI Agent | Tư vấn thiết kế Diagnostic use case và prompt engineering | Diagnostic API trả về kết quả ổn định |

#### Học được
- Luồng chẩn đoán (Diagnostic) là bước đệm quan trọng để cá nhân hóa lộ trình học tập ngay từ giây đầu tiên.

#### Nếu làm lại, sẽ làm khác
- Sẽ gộp bước chẩn đoán vào giai đoạn cuối của Stage 2 để tiết kiệm số lần gọi API từ frontend.

#### Kế hoạch tuần tới
- Triển khai Monitoring stack (Prometheus & Grafana) lên môi trường sản xuất (Railway).

---

## Tuần 6 — 10/05/2026

---

### Nguyễn Bình Thành

#### Đã làm
- Redesign `/course/[id]` thành layout Master-Detail 2 cột: `CourseTree` (300px, navigation cố định) + Detail pane (flex-1)
- Xóa `LessonView.tsx` và 3 tab Thẻ/Học/Sửa — thẻ hiện inline trong cây bài học, không cần màn hình trung gian
- Thêm nút "Ôn X thẻ" ở header gom toàn bộ thẻ due trong 1 click
- Chuyển `ProgressEntry` từ component UI ra `lib/types.ts` (domain type, không phụ thuộc UI)
- Thêm `hideList` và `controlledCardId` vào `EditMode` để reuse mà không duplicate code
- Fix diagnostic silent-skip: hiện `diagnostic-error` view thay vì skip thầm lặng khi API fail
- Thêm UI retry/skip vào diagnostic-error state
- Fix timing: hiện `DiagnosticIntro` trước quiz, đợi diagnostic xong mới chuyển sang ready state
- Xóa nút Study xuất hiện giữa chừng generation — chỉ hiện CTA khi generation hoàn toàn xong

#### Khó nhất tuần này
- Hết quota Claude Design API giữa sprint — thiếu design reference để hoàn thiện learning interface, phải làm thủ công từ handoff cũ. Đây là lý do tiến độ tuần này chậm hơn dự kiến.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Implement Master-Detail layout, fix diagnostic flow, debug timing issues | PR #53–55, #59 và branch fix/diagnostic |
| Claude Design | Thiết kế Synapsy Prototype (handoff cho implementation) | Hết quota giữa sprint |

#### Học được
- Dependency vào external design tool là bottleneck không lường trước — cần export đủ assets trước khi bắt đầu implement.

#### Nếu làm lại, sẽ làm khác
- Export đầy đủ design spec và assets từ Claude Design ngay khi có quota, trước khi bắt đầu code.

#### Kế hoạch tuần tới
- Hoàn thiện MVP: stabilize toàn bộ CourseFlow, merge diagnostic fixes, hoàn thiện learning interface

---

### Lê Kim Dũng

#### Đã làm
- **Observability Stack**: Triển khai thành công Prometheus và Grafana lên Railway với cơ chế lưu trữ dữ liệu bền vững (Railway Volumes).
- **Edge Case Hunting**: Rà soát và sửa lỗi hàng loạt các trường hợp biên liên quan đến JSON parsing và fallback content (PR #83, #87, #89).
- **Documentation Reorg**: Tái cấu trúc toàn bộ tài liệu dự án, tách file `CONVENTIONS.md` và dọn dẹp các tệp rác trong repository.
- **Admin RBAC**: Cấu hình phân quyền cơ bản cho các trang giám sát hệ thống.

#### Khó nhất tuần này
- Xử lý các vấn đề về quyền ghi file (permissions) và cấu hình mạng nội bộ trên Railway khi deploy cụm Monitoring.
- Đảm bảo tính tương thích của hệ thống sau đợt dọn dẹp lớn (Refactor/Cleanup).

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| AI Agent | Fix lỗi Docker/Railway config, hỗ trợ dọn dẹp repo và tái cấu trúc docs | Repository sạch sẽ, chuẩn hóa quy trình PR |
| Edge Case Hunter | Tìm kiếm các lỗi tiềm ẩn trong logic fallback | Phát hiện và fix 3 điểm yếu nghiêm trọng |

#### Học được
- "Dọn dẹp là một tính năng": Một repo sạch giúp team tăng tốc đáng kể và giảm bớt gánh nặng tâm lý khi review code.

#### Nếu làm lại, sẽ làm khác
- Sẽ setup Alerting (cảnh báo) ngay cùng lúc với Grafana thay vì để sang tuần sau.

#### Kế hoạch tuần tới
- Nâng cấp Monitoring lên kiến trúc Observability tập trung (Distributed Tracing với OTel).

---

## Tuần 7 — 16/05/2026

---

### Nguyễn Bình Thành

#### Đã làm
- **Parallel Generation**: Song song hóa Stage 2 và Diagnostic Quiz (giảm latency từ ~210s xuống còn ~10-15s bằng `Promise.all` + semaphore).
- **Multi-card Stage 2**: Cập nhật Generator để sinh 2-3 thẻ atomic mỗi lesson thay vì 1 thẻ nén thông tin; giữ `concept` làm compatibility layer.
- **CourseTree Redesign**: Bỏ accordion lesson, chapter mở ra hiện ngay toàn bộ nhãn bài học và card; tối ưu hóa luồng điều hướng (Master-Detail).
- **UKT Mastery Dashboard**: Cá nhân hóa trang chủ với Spider Chart 8 trục y khoa, hiển thị cả mức nắm vững (mastery) và dải độ chắc chắn (uncertainty).
- **Việt hóa Registry**: Dịch toàn bộ 48 Knowledge Components và 8 module y khoa sang tiếng Việt để đồng bộ UI "Theo chủ đề".
- **Fix CI/CD**: Xử lý lỗi Railway deploy (`npm-global` path) và lỗi Vitest native binding (`rolldown`) trên self-hosted Linux runner.

#### Khó nhất tuần này
- Xử lý lỗi 429 (Too Many Requests) từ DeepSeek khi song song hóa 10+ request cùng lúc. Phải implement cơ chế semaphore để giới hạn concurrency và retry với exponential backoff.
- Debug lỗi native binding của Vitest trên CI Linux: do npm không tự cài optional dependencies cho đúng platform khi dùng self-hosted runner.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Refactor parallel generation, xây dựng Spider Chart component, debug CI/CD pipeline, Việt hóa registry | Hoàn thành 15 PR lớn nhỏ, hệ thống ổn định và nhanh hơn rõ rệt |

#### Học được
- **Concurrency control** quan trọng không kém gì logic: gọi song song mà không giới hạn sẽ bị API provider ban ngay lập tức.
- **Distributed Tracing** là "ánh sáng" khi debug latency: nhìn vào Jaeger trace thấy ngay diagnostic quiz bị block ở đâu thay vì đoán mò.

#### Nếu làm lại, sẽ làm khác
- Sẽ implement parallel generation sớm hơn (từ tuần 5) thay vì để user đợi 3 phút mỗi khi tạo khóa học.

#### Kế hoạch tuần tới
- Hoàn thiện AI Tutor chuyên sâu: gợi ý tài liệu đọc thêm dựa trên lỗ hổng kiến thức UKT.
- Tinh chỉnh UI cho mobile.

---

### Lê Kim Dũng

#### Đã làm
- **Observability Stack**: Tách cấu trúc monorepo (`web/`, `UKT/`, `monitoring/`) và triển khai bộ công cụ giám sát: OTel Collector, Jaeger, Loki, Prometheus, Grafana, Alertmanager.
- **Distributed Tracing**: Cấu hình OpenTelemetry instrumentation xuyên suốt từ Next.js đến FastAPI để truy vết request end-to-end.
- **Alerting**: Tích hợp Discord Bridge cho Alertmanager, tự động gửi cảnh báo lỗi hệ thống về kênh Discord nhóm.
- **Infrastructure Cleanup**: Refactor luồng `/api/auth/me` và dọn dẹp các adapter cũ không còn sử dụng sau khi chuyển sang OTel.

#### Khó nhất tuần này
- Cấu hình OTel Collector để tiếp nhận và chuyển hướng (export) dữ liệu từ nhiều ngôn ngữ khác nhau (Node.js và Python) về đúng các backend (Jaeger, Loki, Prometheus) trong mạng nội bộ của Railway.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| AI Agent | Tư vấn kiến trúc monitoring, hỗ trợ viết Docker Compose cho 6 dịch vụ giám sát, debug cấu hình gRPC cho OTel | Setup thành công stack giám sát chuẩn production trong 2 ngày |

#### Học được
- "Observability is not just logs": Log chỉ cho biết "chuyện gì đã xảy ra", còn Tracing cho thấy "nó đã xảy ra như thế nào và tại sao lại chậm".
- Tầm quan trọng của việc tách biệt service giám sát để không ảnh hưởng đến hiệu năng của service chính.

#### Nếu làm lại, sẽ làm khác
- Sẽ setup Prometheus và Grafana ngay từ tuần 2 để theo dõi chi phí token AI chặt chẽ hơn từ đầu.

#### Kế hoạch tuần tới
- Xây dựng dashboard Admin chuyên sâu hiển thị tỷ lệ lỗi của từng AI Provider.

---

## Template

```markdown
## Tuần N — DD/MM/YYYY

### Đã làm
-

### Khó nhất tuần này
-

### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | | |

### Học được
-

### Nếu làm lại, sẽ làm khác
-

### Kế hoạch tuần tới
-
```

---

## Ví dụ

### Tuần 1 — 31/03/2026

**Thành viên:** Nguyễn Văn A, Trần Thị B, Lê Văn C

#### Đã làm
- Setup project TypeScript + cấu hình `.env`
- Xây dựng agent loop cơ bản: nhận input → gọi Claude API → in output
- Thêm tool `search_web` đầu tiên (dùng Brave Search API)
- Viết README cho repo nhóm

#### Khó nhất tuần này
- Tool call response của Claude trả về sai format — mất 2 tiếng debug mới phát hiện ra thiếu `"type": "tool_result"` trong message history.
- Lần đầu dùng TypeScript nên type error khá nhiều, phải học cách dùng `as` và generic.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Giải thích Anthropic tool use API, debug message format | Giải quyết được bug trong 15 phút |
| Cursor | Autocomplete TypeScript types | Tiết kiệm khoảng 30% thời gian gõ |

#### Học được
- Tool use trong Claude hoạt động theo vòng lặp: model gọi tool → app trả kết quả → model tiếp tục. Cần giữ đúng message history.
- `zod` rất hữu ích để validate tool input schema.
- Nên đặt timeout cho API call ngay từ đầu, không để sau mới thêm.

#### Nếu làm lại, sẽ làm khác
- Setup TypeScript strict mode ngay từ đầu thay vì thêm sau (refactor mệt hơn).
- Viết unit test cho `parseToolCall()` trước khi tích hợp vào agent loop.

#### Kế hoạch tuần tới
- Thêm tool `read_file` và `write_file`
- Implement memory: lưu conversation history vào file JSON
- Thử chạy agent giải 1 bài tập thực tế

---

### Tuần 2 — 07/04/2026

**Thành viên:** Nguyễn Văn A, Trần Thị B, Lê Văn C

#### Đã làm
- Thêm tool `read_file`, `write_file`, `list_dir`
- Agent có thể tự đọc file trong repo và đề xuất refactor
- Implement conversation memory: lưu 20 message gần nhất
- Thử nghiệm: cho agent tự fix 3 bug đơn giản → thành công 2/3

#### Khó nhất tuần này
- Memory bị lỗi khi conversation quá dài (vượt context window). Phải implement sliding window: chỉ giữ system prompt + 20 message gần nhất.
- Agent đôi khi loop vô hạn khi tool trả lỗi — chưa có stop condition tốt.

#### AI tool đã dùng
| Tool | Dùng để làm gì | Kết quả |
|---|---|---|
| Claude Code | Thiết kế sliding window memory, review code agent loop | Phát hiện thêm edge case khi tool throw exception |
| Gemini CLI | So sánh approach lưu memory: file JSON vs SQLite | Tư vấn dùng JSON cho prototype, SQLite khi cần query |

#### Học được
- Context window là resource có hạn — cần thiết kế memory strategy từ sớm.
- Stop condition quan trọng không kém gì agent logic: `max_iterations`, `no_new_tool_calls`, `explicit_done`.
- AI agent review code của mình rất có ích: Claude Code tìm ra 2 potential null pointer mà mình bỏ sót.

#### Nếu làm lại, sẽ làm khác
- Viết interface `Memory` trước, rồi implement sau — thay vì hard-code array từ đầu.
- Log tất cả tool call ra file ngay từ đầu để debug dễ hơn.

#### Kế hoạch tuần tới
- Fix vòng lặp vô hạn: thêm `max_iterations = 10`
- Thêm tool `run_tests` để agent tự kiểm tra code sau khi sửa
- Demo cho instructor cuối tuần
