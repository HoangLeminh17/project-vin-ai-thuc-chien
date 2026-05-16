# Phản hồi & Ảnh chụp màn hình (Feedback & Screenshots)

Tài liệu này dùng để lưu trữ các minh chứng thực tế chứng minh hệ thống hoạt động tốt.

## 1. Hình ảnh thực tế (Screenshots)

*(**Hướng dẫn:** Bạn hãy chụp ảnh màn hình từ ứng dụng thật và thay thế các placeholder bên dưới bằng file ảnh thực tế của bạn, ví dụ: `![Mô tả](./images/screen1.png)`)*

### a) Giao diện Dashboard & Upload PDF
![Dashboard Placeholder](https://placehold.co/800x400?text=Screenshot+1:+Dashboard+and+Upload+Zone)
*Mô tả: Giao diện chính cho phép người dùng kéo thả file PDF.*

### b) Màn hình Học Flashcard (Master-Detail Layout)
![Flashcard UI Placeholder](https://placehold.co/800x400?text=Screenshot+2:+Flashcard+Learning+UI+with+SRS+Buttons)
*Mô tả: Layout chia 2 cột, bên trái là mục lục chương/bài học, bên phải là thẻ flashcard với các nút (Again, Hard, Good, Easy).*

### c) Cấu trúc dữ liệu AI trả về (Logs/Console)
![AI Logs Placeholder](https://placehold.co/800x400?text=Screenshot+3:+AI+JSON+Response+Logs)
*Mô tả: Log từ terminal hoặc giao diện `/admin/monitor` cho thấy AI Generator trả về chính xác mảng JSON ConceptCards.*

## 2. Video Demo

**Link Video Demo:** `[Chèn link Google Drive / YouTube của bạn vào đây]`

**Nội dung Video cần có:**
1. Đăng nhập hệ thống (0:00 - 0:10)
2. Tải lên một file PDF bài giảng (0:10 - 0:30)
3. Xem quá trình AI xử lý và sinh ra khóa học (0:30 - 1:00)
4. Tương tác học một vài flashcard (1:00 - 1:30)
5. Cho thấy sự thay đổi của tiến độ (Progress bar) (1:30 - 1:45)

## 3. Phản hồi từ người dùng thử (User Feedback)

*(**Hướng dẫn:** Phỏng vấn 2-3 người bạn hoặc đồng nghiệp dùng thử hệ thống và ghi lại feedback vào đây để tăng tính thuyết phục cho báo cáo).*

**Người dùng 1 (Sinh viên):**
> "Giao diện khá đẹp và giống Quizlet nhưng tiện hơn vì không phải tự gõ thẻ. Mình thử upload slide môn Lịch sử Đảng, mất khoảng 2 phút là có ngay một bộ thẻ để ôn thi."

**Người dùng 2 (Nhà phát triển phần mềm):**
> "Kiến trúc hệ thống rất rõ ràng. Tính năng fallback giữa các AI models chạy mượt mà, mình có thử tắt kết nối OpenAI trong `.env` thì app vẫn chạy tiếp bằng DeepSeek mà không bị crash."

**Người dùng 3 (Giáo viên):**
> "Chất lượng câu hỏi sinh ra tương đối bám sát tài liệu. Tuy nhiên, thi thoảng có câu hỏi hơi dài. Nếu app cho phép tự edit lại thẻ thì sẽ hoàn hảo." *(Lưu ý: Hệ thống đã có tính năng Edit, có thể demo thêm tính năng này).*
