# 🤝 Team A20 Code Conventions & Workflow
*Derived from BMAD Adversarial Review - 18/04/2026*

Tài liệu này quy chuẩn hóa cách viết code cho nhóm 3 người nhằm duy trì sự ổn định của hệ thống Clean Architecture.

## 1. Nguyên Tắc Viết Code (Coding Rules)

### A. Xử lý lỗi (Error Handling)
- **Domain Exceptions**: Tạo các class lỗi kế thừa từ `Error` tại `core/errors/`.
- **No Leaks**: Adapter phải bắt lỗi hạ tầng và chuyển đổi thành Domain Error trước khi ném lên Use Case.
- **HTTP Mapping**: Presentation Layer (API Routes) chịu trách nhiệm map Domain Error sang mã HTTP tương ứng (404, 422, 500).

### B. Dependency Injection & Config
- **Constructor Injection**: Adapter chỉ nhận cấu hình qua constructor.
- **Env Isolation**: Chỉ file `infrastructure/di.ts` (hoặc module di) mới được truy cập `process.env`.
- **Modular DI**: Dự án lớn cần tách `di.ts` thành `user.di.ts`, `course.di.ts` để tránh xung đột khi merge code.

### C. Data Integrity
- **DTOs & Mappers**: Luôn chuyển đổi dữ liệu từ External Schema (JSON API, DB Row) sang Domain Entity trước khi đưa vào Use Case.
- **Port First**: Luôn viết Port (Interface) trước khi viết Adapter.

---

## 2. Quy Trình Phát Triển Tính Năng (Feature Workflow)

Để tránh code chồng chéo, mọi thành viên tuân thủ 5 bước:

1. **DEFINE**: Viết Ports và Domain Models trong tầng `core`.
2. **LOGIC**: Viết Use Case + Unit Test (dùng mockup cho Ports).
3. **BRIDGE**: Viết Adapter thực tế trong `infrastructure` + Integration Test.
4. **WIRING**: Đăng ký instantiation trong hệ thống DI.
5. **DELIVERY**: Cắm vào API Route hoặc Page (Presentation).

---

## 3. Quy Tắc Kiểm Thử (Testing)

- **Unit Test (Bắt buộc)**: 100% Use Cases phải có unit test.
- **Integration Test**: Các Adapter phức tạp (AI, Payment, Storage) cần có integration test để verify kết nối cloud.

---
*Tài liệu này là một phần của quy trình quản lý BMAD. Mọi thay đổi cần được thảo luận qua phiên Brainstorming.*
