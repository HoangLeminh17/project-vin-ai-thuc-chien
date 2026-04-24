# [PRD-05] Spaced Repetition System (Hệ thống Lặp lại ngắt quãng)

## 1. Mục tiêu (Objective)
Cung cấp cơ chế ôn tập thông minh dựa trên khoa học về trí nhớ, giúp người dùng ghi nhớ kiến thức từ Concept Cards lâu dài với nỗ lực tối thiểu.

## 2. Đối tượng sử dụng
- **Học viên ôn thi cấp tốc**: Cần biết chính xác cái gì cần học lại ngay lập tức.
- **Người học trọn đời**: Muốn duy trì kiến thức từ hàng ngàn thẻ card mà không bị quá tải.

## 3. Quy trình người dùng (User Flow)
1. Người dùng vào **Dashboard** thấy thông báo "Bạn có 15 thẻ cần ôn hôm nay".
2. Người dùng nhấn "Ôn ngay" -> Hệ thống hiển thị mặt trước (Câu hỏi) của Concept Card.
3. Người dùng tự trả lời -> Nhấn "Reveal" để xem đáp án.
4. Người dùng chọn 1 trong 4 mức độ: **Again** (Quên), **Hard** (Khó), **Good** (Được), **Easy** (Dễ).
5. Hệ thống tính toán và cập nhật ngày ôn tập tiếp theo (`nextReviewDate`). Card biến mất khỏi hàng đợi và sẽ xuất hiện lại vào ngày đã định.

## 4. Thuật toán Spaced Repetition (SM-2 Simplified)
Mỗi Card Progress cần lưu trữ:
- `interval`: Số ngày chờ cho lần ôn tiếp theo (mặc định ban đầu = 1).
- `easeFactor`: Độ dễ của thẻ (mặc định = 2.5).
- `repetitions`: Số lần liên tiếp chọn "Good" hoặc "Easy".
- `nextReviewDate`: Ngày giờ cụ thể để hiển thị lại thẻ.

**Công thức cập nhật (Sơ bộ):**
- Nếu chọn `Again`: `repetitions = 0`, `interval = 1`.
- Nếu chọn từ `Hard` trở lên:
  - `interval = interval * easeFactor`.
  - Cập nhật `easeFactor` dựa trên feedback của người dùng.

## 5. Yêu cầu kỹ thuật & Clean Architecture
- **Core Entity**: `CardProgress`.
- **Port**: `IProgressRepository` (Save/Get progress).
- **UseCase**: `ReviewCardUseCase`, `GetDueCardsUseCase`.
- **Infrastructure**: Cần tích hợp một Database có khả năng lưu trữ lâu dài (Firebase Firestore hoặc Supabase/PostgreSQL).

## 6. Giao diện (UI/UX)
- Widget "Daily Progress" hiển thị số lượng thẻ theo trạng thái: Mới (New), Đang học (Learning), Cần ôn (Due).
- Hiệu ứng chuyển cảnh giữa các Card mượt mà.

---
## 7. Success Metrics
- Tỷ lệ thẻ được trả lời là "Good" hoặc "Easy" tăng dần theo thời gian.
- Thời gian trung bình người dùng dành cho Dashboard hàng ngày: 5-10 phút.
