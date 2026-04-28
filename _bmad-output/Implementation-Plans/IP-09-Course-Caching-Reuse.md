# Implementation Plan: Course Caching & Content Reuse

Kế hoạch này giúp hệ thống nhận diện các file PDF đã từng được xử lý để trả về kết quả ngay lập tức, tiết kiệm chi phí AI và thời gian của người dùng.

## 1. Cơ chế hoạt động (The Hashing Strategy)
- Sử dụng thuật toán **SHA-256** để băm chuỗi văn bản (Markdown) thu được sau khi parse PDF.
- Lưu trữ kết quả trong Firestore theo cấu trúc:
    - Collection `courses`: Lưu Outline (Stage 1). Document ID chính là `contentHash`.
    - Sub-collection `chapters`: Lưu nội dung chi tiết từng chương (Stage 2).

## 2. Các thành phần cần thay đổi

### 2.1. Core Domain
- Tạo Entity `CourseCache`: Lưu trữ thông tin khóa học đã sinh.
- Tạo Interface `ICourseRepository`: Định nghĩa các phương thức `saveCourse`, `getCourseByHash`.

### 2.2. Infrastructure
- Triển khai `FirebaseCourseRepository`: Adapter kết nối với Firestore.
- Tạo Utility `crypto-utils.ts`: Hàm băm nội dung văn bản.

### 2.3. API Layer
- **`/api/courses/check-cache`**: Nhận vào mã hash, trả về Course Outline nếu có.
- **`/api/courses/save`**: Lưu Outline hoặc từng Chương vào cache sau khi AI sinh xong.

## 3. Các bước thực hiện (Steps)

### Step 1: Utility & Repository Setup
- [ ] Cài đặt hàm `getContentHash(text)` sử dụng thư viện `crypto`.
- [ ] Triển khai `FirebaseCourseRepository` với Firestore.
- [ ] Đăng ký dịch vụ vào DI Container (`infrastructure/di.ts`).

### Step 2: Backend Integration
- [ ] Cập nhật `/api/generate-course`: Trước khi gọi AI, kiểm tra cache. Nếu có, trả về ngay.
- [ ] Cập nhật `/api/generate-content`: Lưu kết quả chương vào DB sau khi sinh thành công.

### Step 3: Frontend Optimization
- [ ] Gửi mã hash lên server để kiểm tra.
- [ ] Nếu "Cache Hit" (Trùng file cũ): Hiển thị toàn bộ khóa học ngay lập tức, bỏ qua mọi Spinner.
- [ ] Nếu "Cache Miss": Hiển thị luồng sinh như hiện tại.

## 4. Lợi ích & Hiệu quả
- **Tốc độ**: Giảm thời gian chờ từ 2-3 phút xuống còn < 2 giây cho các tài liệu phổ biến (ví dụ: giáo trình, slide bài giảng dùng chung).
- **Chi phí**: Tiết kiệm 100% chi phí Token OpenAI cho các lần yêu cầu trùng lặp.

## 5. Lưu ý kỹ thuật
- Cần xử lý trường hợp nội dung PDF giống nhau nhưng user muốn tạo course với mục tiêu khác nhau (có thể dùng `hash(content + prompt)` làm khóa).
- Đảm bảo quyền truy cập Firestore đã được cấu hình đúng (vượt qua lỗi Permission Denied hiện tại).
