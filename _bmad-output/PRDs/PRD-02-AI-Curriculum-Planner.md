# [PRD-02] AI Curriculum Planner (Stage 1)

## 1. Mục tiêu (Objective)
Sử dụng AI để phân tích dữ liệu văn bản thô và tự động thiết kế một khóa học có cấu trúc gồm các Chương (Chapters) và Bài học (Lessons), đảm bảo tính sư phạm và bao quát toàn bộ kiến thức.

## 2. User Stories
- "Là một học sinh, tôi muốn tài liệu của mình được chia nhỏ thành các bài học vừa sức để tôi có thể học từng phần một mà không bị quá tải."
- "Là một giáo viên, tôi muốn AI gợi ý các concept cốt lõi từ tài liệu để tôi kiểm tra nhanh độ bao quát."

## 3. Quy trình xử lý (AI Logic Flow)
1. **Input**: Toàn bộ chuỗi văn bản hoặc `contentList` từ Stage 1.
2. **Analysis**: AI tìm kiếm các `## heading` hoặc các đoạn chuyển đổi chủ đề.
3. **Structure**: Phân rã thành cấu trúc JSON:
   - `title`: Tên khóa học.
   - `chapters[]`: Tiêu đề chương.
   - `lessons[]`: Tiêu đề bài học, Key Concepts, và Outline (4-8 bullets).
4. **Validation**: Kiểm tra tính duy nhất của lesson key và đảm bảo không gộp (merge) các chủ đề quan trọng.

## 4. Đặc tả tính năng (Features)
- [ ] **Deterministic Splitting**: Sử dụng các marker `##` để đảm bảo bài học được chia đúng ranh giới.
- [ ] **Progressive Rendering**: Trả kết quả từng chương (Streaming) để người dùng thấy ngay kết quả.
- [ ] **Verbatim Outline**: Trích xuất các sự kiện, con số, ví dụ cụ thể từ văn bản gốc vào phần Outline.

## 5. Ràng buộc kỹ thuật
- **Model**: Ưu tiên `gpt-4o-mini` để tối ưu tốc độ và chi phí (ADR-10).
- **Prompt**: Sử dụng `PLANNER_PROMPT` với các chỉ thị nghiêm ngặt về việc không bỏ sót nội dung.

---
## 6. Tiêu chí nghiệm thu (Acceptance Criteria)
- Toàn bộ nội dung cốt lõi của PDF phải xuất hiện trong Outline.
- Không có bài học nào bị rỗng hoặc không có Outline.
