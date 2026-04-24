# [PRD-03] Active Learning Content Generator (Stage 2)

## 1. Mục tiêu (Objective)
Cổng nâng cao hiệu quả học tập bằng cách chuyển đổi nội dung tóm tắt sang định dạng **Học chủ động (Active Recall)** thông qua Concept Cards và câu hỏi trắc nghiệm (Quiz).

## 2. Các thành phần chính (Core Components)

### A. Concept Cards
- **Format**: Câu hỏi gợi nhớ (active recall question) -> Câu trả lời tóm tắt -> Chi tiết/Ví dụ.
- **Tương tác**: Người dùng phải tự trả lời trước khi nhấn "Reveal" để xem đáp án.
- **Feedback**: Hệ thống nút đánh giá độ khó (Anki-style: Easy/Good/Hard) để phục vụ cho thuật toán lặp lại ngắt quãng sau này.

### B. Lesson Quiz
- **Format**: Trắc nghiệm lựa chọn duy nhất (Single Choice).
- **Phản hồi**: Giải thích lý do đúng/sai ngay lập tức cho người dùng.

## 3. Quy trình AI (Stage 2 Logic)
1. Nhận data từ Stage 1 (Outline).
2. Với mỗi bài học, tạo 1-3 Concept Cards tập trung vào các khái niệm khó/quan trọng.
3. Tạo 1 bộ câu hỏi Quiz (3-5 câu) dựa trên nội dung bài học.
4. Output định dạng JSON đồng bộ với giao diện người dùng.

## 4. UI/UX Requirements
- Giao diện dạng Card lật (Flip animation hoặc Reveal overlay).
- Nút "Reveal" phải nằm ở vị trí dễ bấm.
- Hỗ trợ phím tắt (nếu có thể) cho việc phản hồi độ khó.

## 5. Ràng buộc kỹ thuật
- **Fallback**: Nếu AI không tạo được card, hệ thống tự lấy Outline tạo card mặc định (ADR-13).
- **Parallelism**: Chạy `Promise.allSettled` cho tất cả các bài học trong chương để tối ưu thời gian chờ.

---
## 6. Success Metrics
- Người dùng tương tác (Reveal) > 80% số card được tạo.
- Tỷ lệ lỗi sinh content: < 2%.
