# Weekly Journal

Ghi lại hành trình xây dựng sản phẩm mỗi tuần — những gì đã làm, học được gì, AI giúp như thế nào.

> **Cập nhật mỗi cuối tuần** (trước khi tạo PR). Không cần dài, chỉ cần thật.

---

## Tuần 1 — 05/04/2026

**Thành viên:** Nguyễn Bình Thành

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

**Thành viên:** Nguyễn Bình Thành, Lê Kim Dũng

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

**Thành viên:** Nguyễn Bình Thành, Lê Kim Dũng

---

### Nguyễn Bình Thành

#### Đã làm
- (Đang chờ cập nhật từ Thành)

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
