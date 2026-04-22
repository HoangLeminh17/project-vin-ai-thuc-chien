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
- [ ] Hỗ trợ upload tệp PDF dung lượng lên đến 20MB.
- [ ] Trích xuất văn bản có giữ nguyên định dạng (Bold, Italic, Bullet points).
- [ ] Trích xuất bảng biểu (Tables) sang định dạng HTML/Markdown.
- [ ] Trích xuất danh sách nội dung có phân cấp (`text_level`).

## 5. Yêu cầu kỹ thuật (Technical Requirements)
- **Adapter**: `MinerUParserAdapter` implement `IParserPort`.
- **Infrastructure**: Sử dụng Firebase Admin SDK để quản lý quyền truy cập file.
- **Error Handling**: Xử lý các trường hợp MinerU API timeout hoặc file lỗi cấu trúc.

---
## 6. Success Metrics
- Tỷ lệ trích xuất thành công: >95% với các tệp PDF không bị scan mờ.
- Thời gian xử lý trung bình: < 30 giây cho mỗi tài liệu 20 trang.
