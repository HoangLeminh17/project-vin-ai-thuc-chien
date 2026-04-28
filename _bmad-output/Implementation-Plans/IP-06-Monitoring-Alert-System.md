# Implementation Plan: PRD-06 Monitoring & Alerting System

## 1. Overview
Bản kế hoạch này mô tả các bước kỹ thuật để triển khai hệ thống giám sát (Monitoring) và cảnh báo (Alerting) cho ứng dụng Synapsy, giúp theo dõi sức khỏe của AI Pipeline, hạ tầng và trải nghiệm người dùng, đúng theo yêu cầu trong PRD-06.

## 2. Các mốc triển khai (Milestones)

### 🛠 Milestone 1: Nâng cấp Logging & Monitoring Adapters (Core & Infrastructure)
Mục tiêu: Đưa logs và metrics ra khỏi console cục bộ, chuyển tới hệ thống lưu trữ tập trung và kênh thông báo.

#### 1.1. Tích hợp Webhook (Alerting)
- **Hành động:** Tạo mới `WebhookAlertAdapter` (kế thừa từ một Port mới `IAlertPort`).
- **Nhiệm vụ:** Gửi HTTP POST request tới Slack/Discord Webhook khi có sự kiện nghiêm trọng.
- **Thực hiện:** Cấu hình biến môi trường `SLACK_WEBHOOK_URL` (hoặc Discord) trong `.env`.

#### 1.2. Mở rộng PinoLoggerAdapter
- **Hành động:** Cập nhật `PinoLoggerAdapter` trong `infrastructure/adapters/pino-logger.adapter.ts`.
- **Nhiệm vụ:** Tích hợp Pino transport (ví dụ `pino-axiom` hoặc `pino-logflare`) để đẩy logs lên nền tảng đám mây (Axiom, BetterStack).

#### 1.3. Cập nhật Monitoring Adapter
- **Hành động:** Thay thế/Cập nhật `ConsoleMonitoringAdapter`.
- **Nhiệm vụ:** Ghi nhận metrics (Latency, Error count) và gửi cảnh báo tự động qua `IAlertPort` nếu vượt ngưỡng (ví dụ: `response time > 5000ms`).

---

### 🛠 Milestone 2: Tích hợp vào AI Pipeline & API Routes (Use Case & API Layer)
Mục tiêu: Đảm bảo toàn bộ các quá trình quan trọng (đặc biệt là AI sinh nội dung và xử lý PDF) được theo dõi sát sao.

#### 2.1. AI Pipeline Tracking
- Cập nhật các AI Adapters (`MinerU`, `Gemini`, `OpenAI`):
  - Bắt (Catch) và log chi tiết các lỗi `Token Limit`, `Timeout`.
  - Tính toán thời gian phản hồi (Latency) của từng request AI.
  - Kích hoạt cảnh báo nếu: MinerU lỗi > 3 lần liên tiếp cho một User.

#### 2.2. Global API Error Handling
- Tạo một Error Handler Middleware / Wrapper cho các route trong `app/api/`.
- Tự động bắt lỗi 4xx/5xx, gửi log kèm thông tin User (nếu có) và Context.

---

### 🛠 Milestone 3: Xây dựng System Dashboard (UI/Presentation)
Mục tiêu: Giao diện trực quan cho admin/dev theo dõi tình trạng server trực tiếp trên app.

#### 3.1. Admin Monitoring Page
- **Vị trí:** `app/admin/monitor/page.tsx` (Bảo vệ bằng quyền Admin).
- **Tính năng:**
  - Hiển thị System Status (Up/Down).
  - Thống kê (Metrics): Số lỗi hôm nay, Thời gian phản hồi trung bình.
  - Real-time Log Stream (hiển thị danh sách logs/cảnh báo mới nhất lấy từ Database hoặc service thứ 3).

---

## 3. Quá trình kiểm thử (Testing Plan)
- **Unit Tests:** Kiểm tra logic kích hoạt cảnh báo khi vượt ngưỡng (ví dụ giả lập latency = 6000ms xem webhook có được gọi không).
- **Integration Tests:** Gửi log test lên môi trường staging của dịch vụ Logging (Axiom) và kênh Webhook (Discord/Slack).

## 4. Thứ tự công việc đề xuất (Next Steps)
1. Bổ sung `IAlertPort` và code `WebhookAlertAdapter` để gửi cảnh báo qua Discord/Slack.
2. Cập nhật `pino-logger.adapter.ts` và `ConsoleMonitoringAdapter`.
3. Nhúng cảnh báo vào AI Pipeline (MinerU/Gemini).
