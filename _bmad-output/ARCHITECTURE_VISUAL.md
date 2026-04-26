# 📐 System Architecture Visualization (Clean Architecture)

Tài liệu này cung cấp cái nhìn trực quan về cách mã nguồn của dự án **A20-App-046** được tổ chức.

## 1. Sơ đồ kiến trúc tổng thể

```mermaid
graph TD
    subgraph "1. Presentation Layer (Next.js 15)"
        UI["UI (Dashboard, Diagnostic Mode)"]
        API["API Routes (Next.js Handlers)"]
    end

    subgraph "2. Core Layer (Clean Architecture)"
        UC_Parse["ParsePDF UseCase"]
        UC_Diagnostic["Diagnostic Quiz UseCase"]
        UC_SR["SRS & Priority Map UseCase"]
        Ports["Interfaces (Ports)"]
        Entities["Entities (Course, CardProgress)"]
    end

    subgraph "3. Infrastructure Layer (Adapters)"
        Parser["MinerU Adapter (OCR)"]
        LLM["OpenAI / Gemini Adapter"]
        UKT_Adp["UKT Service Adapter"]
        Storage["Firebase Storage"]
        DB["Firestore Database"]
    end

    subgraph "4. External Services"
        UKT_Service["Python UKT Microservice (FastAPI)"]
    end

    %% Interaction Flow
    UI --> API
    API --> UC_Parse
    API --> UC_Diagnostic
    API --> UC_SR

    UC_Diagnostic -.-> Ports
    UC_SR -.-> Ports

    %% Implementation
    Parser -- "Implements" --> Ports
    LLM -- "Implements" --> Ports
    UKT_Adp -- "Implements" --> Ports
    DB -- "Implements" --> Ports

    %% Service Communication
    UKT_Adp <== "REST API" ==> UKT_Service

    style UKT_Service fill:#f9f,stroke:#333,stroke-width:2px
    style UC_Diagnostic fill:#bbf,stroke:#333,stroke-width:2px
```

---

## 2. Luồng dữ liệu (Data Flow)

### A. Pipeline Chẩn đoán (Diagnostic Loop):
1. **Upload**: UI gửi PDF -> MinerU Parser trích xuất Markdown.
2. **Diagnostic**: `DiagnosticUseCase` gọi LLM để sinh 15-20 câu hỏi chẩn đoán dựa trên nội dung đã parse.
3. **UKT Inference**: Kết quả làm bài (Đúng/Sai + Độ tự tin) được gửi sang **UKT Microservice**.
4. **Priority Map**: UKT trả về trạng thái kiến thức $(\mu, \sigma)$ -> UI hiển thị bản đồ ưu tiên học tập.

### B. Pipeline Lặp lại ngắt quãng (SRS):
1. **Study**: Người dùng học thẻ bài -> Gửi đánh giá (Hard/Ok/Easy).
2. **UKT Update**: Dữ liệu gửi sang **UKT Microservice** để cập nhật trạng thái kiến thức tức thời.
3. **Schedule**: Hệ thống tính toán ngày ôn tập tiếp theo dựa trên kết quả từ UKT.

## 3. Lợi ích của kiến trúc này
- **Testability**: Có thể test toàn bộ logic nghiệp vụ (Core) mà không cần mạng hay database thực tế bằng cách dùng Mock Adapters.
- **Maintainability**: Thay đổi công nghệ ở lớp Infrastructure không ảnh hưởng đến logic ở lớp Core.
- **Teamwork**: Các thành viên có thể làm việc song song trên các Layer khác nhau mà không bị xung đột code.
