# Implementation Plan: Optimized Course Generation (UX & Performance)

Kế hoạch này hiện thực hóa các ý tưởng từ phiên Brainstorming nhằm loại bỏ Spinner chờ đợi lâu và thay thế bằng trải nghiệm "Mục lục động" và "Flash Fact Gallery".

## 1. Mục tiêu
- Giảm thời gian chờ đợi ban đầu xuống < 15 giây (chỉ còn bước Parse và Outline).
- Cung cấp nội dung học đầu tiên (Chương 1) ngay khi sẵn sàng.
- Tận dụng thời gian chờ để cung cấp thông tin hữu ích (Flash Facts).

## 2. Thay đổi Kiến trúc & API

### 2.1. API mới: `/api/extract-facts` (Tốc độ Cao)
- **Chức năng**: Lấy 5-10 câu trích dẫn/sự thật thú vị từ văn bản đã được parse (Markdown của MinerU).
- **Lý do**: Bước này không cần AI thông minh, chỉ cần Regex hoặc AI xử lý cực nhanh (mini-model) nên phản hồi gần như tức thì.

### 2.2. API `/api/generate-content` (Cải tiến)
- **Thay đổi**: Chấp nhận tham số `chapterIndex` để chỉ sinh nội dung cho 1 chương duy nhất thay vì toàn bộ khóa học.
- **Lợi ích**: Giảm tải cho AI và phản hồi nhanh hơn 5-10 lần cho mỗi lần gọi.

## 3. Các giai đoạn thực hiện (Steps)

### Step 1: Backend Refactoring (API Enhancements)
- [ ] Cập nhật `app/api/generate-content/route.ts` để hỗ trợ sinh theo từng chương.
- [ ] Tạo `app/api/extract-facts/route.ts` để lấy thông tin sơ bộ từ Markdown.
- [ ] Đảm bảo tính ổn định của dữ liệu khi sinh từng phần.

### Step 2: Giao diện Mục lục động (Dynamic TOC)
- [ ] Chỉnh sửa `app/page.tsx`: Loại bỏ Modal Spinner toàn màn hình khi ở trạng thái `generating`.
- [ ] Render danh sách các chương (Course Outline) ngay khi có Stage 1 kết thúc.
- [ ] Thêm trạng thái `loading`, `pending`, `done` cho từng mục Chương trong danh sách.

### Step 3: Flash Fact Gallery Component
- [ ] Tạo component `FlashFactGallery.tsx`: Hiển thị các câu trích dẫn với hiệu ứng chuyển động mượt mà (Fade/Slide).
- [ ] Tích hợp vào khu vực chờ của người dùng.

### Step 4: Orchestration (Phối hợp thực thi)
- [ ] Logic Frontend: Ngay khi có Outline, tự động gọi API sinh nội dung cho Chương 1.
- [ ] Khi Chương 1 hoàn thành, cho phép người dùng mở xem ngay.
- [ ] Tiếp tục gọi sinh Chương 2, 3... theo hàng chờ (background).

## 4. Rủi ro & Giải pháp
- **Rủi ro API Rate Limit**: Gọi nhiều API liên tục có thể bị block. 
    - *Giải pháp*: Sử dụng hàng chờ (Queue) phía Frontend, chỉ gọi tối đa 2 chương cùng lúc.
- **Dữ liệu không đồng bộ**: Người dùng refresh trang làm mất dữ liệu đang sinh ngầm.
    - *Giải pháp*: Lưu tạm (Caching) nội dung chương vào LocalStorage hoặc Firestore nếu đã đăng nhập.

## 5. Tiêu chuẩn Hoàn thành (Definition of Done)
- [ ] Người dùng thấy mục lục khóa học trong vòng 15 giây sau khi upload.
- [ ] Chương 1 sẵn sàng để học trong vòng < 60 giây.
- [ ] Không còn Spinner quay vô tận mà không có thông tin phản hồi.
