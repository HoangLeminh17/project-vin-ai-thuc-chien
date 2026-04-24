# User Flow: Spaced Repetition System (SRS)

Hệ thống Spaced Repetition giúp người dùng chuyển kiến thức từ bộ nhớ ngắn hạn sang dài hạn thông qua hai luồng chính.

## 1. Luồng Học Mới (Learning Flow)
Khi người dùng đang học một khóa học và bắt gặp các Concept Card.

```mermaid
graph TD
    A[Người dùng học Course] --> B{Thấy Concept Card}
    B --> C[Đọc Question/Answer]
    C --> D[Chọn mức độ thuộc: Again/Hard/Good/Easy]
    D --> E[Gửi API: /api/progress/review]
    E --> F[Hệ thống khởi tạo Progress & Ngày ôn tập]
    F --> G[Card được đưa vào hàng đợi ôn tập]
```

## 2. Luồng Ôn Tập Hàng Ngày (Review Flow)
Khi người dùng quay lại Dashboard để duy trì kiến thức.

```mermaid
graph TD
    H[Dashboard] --> I{Widget: SRS Stats}
    I -- "Có thẻ đến hạn (Due > 0)" --> J[Nhấn 'Ôn tập ngay']
    I -- "Hết thẻ" --> K[Hiển thị 'Hôm nay đã xong!']
    
    J --> L[Trang Review: Hiện mặt trước Card]
    L --> M[Nhấn 'Reveal Answer']
    M --> N[Hiện mặt sau & 4 nút phản hồi]
    
    N -- Again --> O[Reset Interval = 1 ngày]
    N -- Hard/Good/Easy --> P[Tăng Interval theo EaseFactor]
    
    O & P --> Q[Lưu vào Database]
    Q --> R{Còn thẻ nào khác?}
    R -- Còn --> L
    R -- Hết --> S[Màn hình hoàn thành]
    S --> H
```

## 3. Trạng thái Thẻ (Card Status Transition)
Vòng đời của một thẻ trong hệ thống.

```mermaid
stateDiagram-v2
    [*] --> NEW: Card mới tạo
    NEW --> LEARNING: Lần đầu đánh giá
    LEARNING --> LEARNING: Ôn tập (Interval <= 7 ngày)
    LEARNING --> REVIEW: Ôn tập (Interval > 7 ngày)
    REVIEW --> REVIEW: Duy trì kiến thức
    REVIEW --> LEARNING: Nếu lỡ quên (Chọn 'Again')
```
