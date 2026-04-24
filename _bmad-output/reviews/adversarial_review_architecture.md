# Adversarial Review: ARCHITECTURE.md

Dưới đây là các lỗ hổng, thiếu sót và điểm chưa rõ ràng trong tài liệu kiến trúc hiện tại, được đánh giá dưới góc nhìn cực kỳ khắt khe:

1.  **Thiếu cơ chế chuẩn hóa lỗi (Error Propagation):** Tài liệu nói "Core không cần biết Database", nhưng không định nghĩa cách Core trả về lỗi (Domain Exceptions) để Presentation layer có thể map sang mã HTTP thích hợp mà không làm lộ chi tiết implementation.
2.  **Ranh giới Presentation Layer mơ hồ trong Next.js:** Tài liệu chưa phân biệt rõ trách nhiệm giữa Server Components, Client Components và Route Handlers. Cụ thể: đâu là nơi thực hiện `vaildate content-type` hay `parsing body` trước khi gọi Use Case?
3.  **Rủi ro "God File" tại `di.ts`:** Việc dồn toàn bộ instantiations vào một file `infrastructure/di.ts` sẽ sớm biến file này thành một mớ hỗn độn khi dự án scale. Thiếu gợi ý về việc module hóa DI.
4.  **Bỏ quên việc kiểm thử Adapter (Integration Testing):** Bước 4 chỉ tập trung vào Unit Test cho Use Case bằng Mocking. Không có hướng dẫn về việc làm sao đảm bảo các Adapter thực sự tương tác đúng với External API/SDK (Integration tests).
5.  **Quản lý cấu hình Adapter thiếu nhất quán:** Không quy định việc Adapter nên nhận config qua constructor (từ DI) hay đọc trực tiếp `process.env`. Việc đọc `process.env` trực tiếp trong Adapter làm giảm khả năng testable và portability.
6.  **Thiếu quy định về DTO và Domain Entities:** Khi dữ liệu đi từ Adapter vào Core, nó cần được chuyển đổi. Tài liệu không nhắc đến lớp Mapper hoặc quy định dùng Type/Interface/Class cho Domain Model để tránh rò rỉ Schema từ DB/API vào Core.
7.  **Sự lệ thuộc vào Proxy để Logging:** Việc bọc mọi thứ qua `withUseCaseLogging` ở `di.ts` là tốt, nhưng nếu một Use Case cần log nội dung cụ thể trong vòng lặp (internal logging), tài liệu không chỉ dẫn cách thực hiện mà không phá vỡ Clean Architecture.
8.  **Vấn đề rò rỉ logic vào `@/lib/`:** Tài liệu cấm import `@/lib/` vào Core, nhưng thực tế `pino` hay các utility cơ bản thường nằm ở đó. Cần định nghĩa rõ "Shared Kernal" hay các utils nào là "Safe" để Core sử dụng.
9.  **Vắng bóng quy tắc xử lý tác vụ bất đồng bộ phức tạp:** Nếu một Use Case cần chạy Background Task hoặc Webhook, kiến trúc này chưa chỉ rõ nơi đặt logic "Fire-and-forget" hay "Queueing".
10. **Thiếu guidelines về "Performance vs Abstraction":** Việc map dữ liệu qua nhiều layer và bọc Proxy chắc chắn gây overhead. Tài liệu cần chỉ rõ khi nào được phép "đi tắt" (Short-circuit) cho các critical paths hoặc các read-only simple queries.
