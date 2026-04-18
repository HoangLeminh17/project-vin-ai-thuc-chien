# 🏛️ Hướng Dẫn Kiến Trúc & Quy Chuẩn Phát Triển (Clean Architecture)

Tài liệu này quy chuẩn hóa cấu trúc dự án và quy trình làm việc cho đội ngũ phát triển, dựa trên mô hình **Clean Architecture (Ports & Adapters)**. Mục tiêu là đảm bảo mã nguồn dễ đọc, dễ bảo trì và ổn định khi mở rộng.

---

## 1. Tổng Quan Về Kiến Trúc

Dự án được chia thành 4 lớp chính. Nguyên tắc cốt lõi: **Dependency Rule** — Mũi tên phụ thuộc chỉ được hướng từ ngoài vào trong lõi.

1.  **`core/ports/` (Interfaces)**: Định nghĩa "hình hài" của các dịch vụ. Lõi không phụ thuộc vào công nghệ cụ thể (Database, AI API).
2.  **`core/use-cases/` (Business Logic)**: Chứa luật chơi và luồng xử lý chính. Đây là trái tim của hệ thống.
3.  **`infrastructure/adapters/` (Implementation)**: Nơi chứa code thực tế (Firebase, SDK, API calls). Các tệp này triển khai (implement) Interface từ tầng Core.
4.  **`app/` (Presentation)**: Giao diện React (Next.js) và API Routes. Tuyệt đối không chứa logic tính toán phức tạp.

---

## 2. Nguyên Tắc Cốt Lõi (Coding Rules)

Để duy trì sự ổn định, mọi thành viên phải tuân thủ các quy tắc sau:

### A. Xử lý lỗi (Error Handling)
*   **Domain Exceptions**: Tạo các class lỗi kế thừa từ `Error` tại `core/errors/`.
*   **No Leaks**: Adapter phải bắt lỗi hạ tầng và chuyển đổi thành Domain Error trước khi ném lên Use Case.
*   **HTTP Mapping**: Presentation Layer (API Routes) chịu trách nhiệm map Domain Error sang mã HTTP tương ứng (404, 422, 500).

### B. Dependency Injection & Cấu hình
*   **Constructor Injection**: Adapter/Use Case chỉ nhận phụ thuộc qua constructor.
*   **Env Isolation**: Chỉ các file trong hệ thống DI (ví dụ `infrastructure/di/`) mới được phép truy cập `process.env`.
*   **Modular DI**: Tách biệt DI theo module (ví dụ: `auth.di.ts`, `storage.di.ts`) để tránh xung đột khi merge code.

### C. Tính Toàn Vẹn Dữ Liệu (Data Integrity)
*   **DTOs & Mappers**: Luôn chuyển đổi dữ liệu từ bên ngoài (JSON API, DB Row) sang Domain Entity trước khi đưa vào Use Case.
*   **Port First**: Luôn viết Port (Interface) trước khi viết Adapter.

---

## 3. Quy Trình Phát Triển Tính Năng (5 Bước Chuẩn)

Mọi tính năng mới đều phải đi qua vòng đời 5 bước:

1.  **DEFINE (Core)**: Định nghĩa dữ liệu (Models) và hợp đồng giao tiếp (Ports) trong `core/`.
2.  **LOGIC (Use Case)**: Viết logic xử lý chính + Unit Test (dùng mockup cho Ports).
3.  **BRIDGE (Infrastructure)**: Triển khai Adapter thực tế để kết nối với Cloud/DB/Service + Integration Test.
4.  **WIRING (DI)**: Đăng ký và tiêm các phụ thuộc (Instantiate) trong hệ thống DI.
5.  **DELIVERY (Presentation)**: Cắm vào Giao diện (Page) hoặc API Route.

---

## 4. Các Quy Tắc Tối Kỵ (Anti-patterns)

| Hành động | Tại sao không? | Giải pháp |
| :--- | :--- | :--- |
| **Import lib/sdk vào core** | Làm hỏng tính độc lập của logic nghiệp vụ. | Sử dụng Ports (Interface). |
| **Logic phức tạp trong Route** | Khó test và tái sử dụng. | Đẩy logic xuống Use Case. |
| **Hard-code API keys** | Rủi ro bảo mật và khó cấu hình. | Dùng `.env` và quản lý qua DI. |
| **Dùng `any` vô tội vạ** | Mất lợi thế của TypeScript. | Định nghĩa Interface/DTO rõ ràng. |

---

## 5. Chiến Lược Kiểm Thử (Testing)

*   **Unit Test (Bắt buộc 100% Use Cases)**: Sử dụng `vitest` và mock các Ports để test logic độc lập.
*   **Integration Test**: Áp dụng cho các Adapter phức tạp (AI, Storage, Payment) để xác thực kết nối thực tế.
*   **Vị trí**: File test đặt trong `tests/` và tái tạo đúng cấu trúc thư mục của logic nguồn.

```typescript
// Ví dụ Mock Port trong Vitest
const mockTranslator = { translate: vi.fn().mockResolvedValue('Hello') };
const useCase = new TranslateDocumentUseCase(mockTranslator as any);
```

---

## 6. Logging & Monitoring Tập Trung

Chúng ta sử dụng Proxy và Middleware để tách biệt việc quan sát (observability) khỏi logic nghiệp vụ:

*   **Use Cases**: Sử dụng `withUseCaseLogging` để bọc Use Case trong file DI. Tự động ghi lại thời gian chạy và lỗi.
*   **API Routes**: Sử dụng middleware `withApiLogging` bọc handler trong `route.ts`.

---

## 7. Tài liệu Tham Chiếu
*   **Phân tích tài liệu**: `core/use-cases/parse-document.usecase.ts`
*   **Cấu hình DI**: `infrastructure/di/`
*   **Hệ thống lỗi**: `core/errors/`

---
*Tài liệu này là một phần của quy trình quản lý BMAD. Mọi thay đổi lớn cần được thảo luận qua phiên Brainstorming.*
