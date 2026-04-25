# [PRD-01] AI PDF Parsing Pipeline

## 1. Mục tiêu (Objective)
Cung cấp một pipeline ổn định để trích xuất nội dung văn bản, bảng biểu và cấu trúc từ các tệp PDF học thuật, làm đầu vào chất lượng cao cho các AI Agent phía sau.

## 2. Đối tượng sử dụng (User Personas)
- **Learner/Student**: Người muốn chuyển đổi tài liệu thô sang lộ trình học tập.
- **Developer**: Người cần một bộ dữ liệu sạch (Markdown/JSON) để xử lý logic AI.

## 3. Quy trình người dùng (User Flow)
1. Người dùng kéo thả tập tin PDF vào UI.
2. Hệ thống upload tệp lên **Firebase Storage**.
3. Hệ thống gửi Public URL của tệp cho **MinerU Precision API**.
4. Hệ thống thực hiện Polling kết quả cho đến khi hoàn thành.
5. Dữ liệu trích xuất (Markdown + ContentList JSON) được trả về để lưu trữ tạm thời trong session.

## 4. Yêu cầu chức năng (Functional Requirements)
- [ ] Hỗ trợ upload tệp PDF dung lượng lên đến 50MB và số lượng trang > 200.
- [ ] Tích hợp mô hình OCR nâng cao để xử lý tiếng Việt chính xác (đặc biệt là các ký tự có dấu phức tạp).
- [ ] Trích xuất văn bản có giữ nguyên định dạng (Bold, Italic, Bullet points).
- [ ] Trích xuất bảng biểu (Tables) sang định dạng HTML/Markdown.
- [ ] **Traceability:** Lưu trữ mapping giữa các chunk văn bản và metadata (số trang, vị trí) để phục vụ việc tra cứu gốc.

## 5. Yêu cầu kỹ thuật (Technical Requirements)
- **Adapter**: `MinerUParserAdapter` implement `IParserPort`.
- **Infrastructure**: Sử dụng Firebase Admin SDK.
- **Polling:** Tăng timeout xử lý lên 15 phút (900s) cho các tài liệu dài.
- **Error Handling**: Xử lý UI/UX khi gặp lỗi MinerU timeout, hiển thị thông báo lỗi tường minh thay vì màn hình trống.

---
## 6. Success Metrics
- Tỷ lệ trích xuất thành công: >95% với các tệp PDF tiếng Việt.
- Thời gian xử lý: Tỷ lệ thuận với số trang, hỗ trợ tốt các tài liệu chuyên ngành y khoa/kỹ thuật.
