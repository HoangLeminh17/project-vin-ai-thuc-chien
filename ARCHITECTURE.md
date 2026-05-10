# 🏛️ Tài liệu Kiến Trúc Hệ Thống (System Architecture)

Tài liệu này mô tả cấu trúc hệ thống và luồng dữ liệu của dự án, dựa trên mô hình **Clean Architecture (Ports & Adapters)**.

---

## 1. Tổng Quan Về Kiến Trúc

Dự án được chia thành 4 lớp chính dựa trên nguyên tắc **Dependency Rule** — Mũi tên phụ thuộc chỉ được hướng từ ngoài vào trong lõi.

### 📐 Sơ đồ kiến trúc tổng thể

```mermaid
graph TD
    subgraph "1. Presentation Layer (Next.js 15)"
        UI["UI (Dashboard, Study, Diagnostic)"]
        API["API Routes (Server Handlers)"]
        Middleware["Auth & Rate Limit Middleware"]
    end

    subgraph "2. Core Layer (Domain & Use Cases)"
        UC_Parse["ParseDocument UseCase"]
        UC_GenCourse["GenerateCourse UseCase"]
        UC_Diag["Diagnostic UseCase"]
        UC_SRS["SRS (Spaced Repetition)"]
        Ports["Interfaces (Ports)"]
        Entities["Entities (Course, Progress, Log)"]
    end

    subgraph "3. Infrastructure Layer (Adapters)"
        direction TB
        subgraph "AI & Parsers"
            Parser["MinerU Adapter (OCR)"]
            AI_Fallback["Fallback AI (Chain)"]
            LLM["OpenAI / Gemini / HuggingFace"]
        end
        subgraph "Storage & Data"
            Storage["Firebase Storage / Local"]
            DB["Firestore / Repository"]
            Cache["Redis (Rate Limiting)"]
        end
        subgraph "Observability"
            Prom["Prometheus Adapter"]
            Log["Pino / Console Logger"]
            Alert["Discord Webhook Alert"]
        end
    end

    subgraph "4. External Services & Monitoring"
        UKT_Service["Python UKT Microservice"]
        Prom_Srv["Prometheus Server"]
        Grafana["Grafana Dashboards"]
        Discord["Discord Channels"]
    end

    %% Interaction Flow
    UI --> Middleware
    Middleware --> API
    API --> UC_Parse
    API --> UC_GenCourse
    API --> UC_Diag
    
    UC_Parse -.-> Ports
    UC_GenCourse -.-> Ports
    UC_Diag -.-> Ports

    %% Implementation
    Parser -- "Implements" --> Ports
    AI_Fallback -- "Implements" --> Ports
    LLM -- "Implements" --> Ports
    Storage -- "Implements" --> Ports
    DB -- "Implements" --> Ports
    Cache -- "Implements" --> Ports
    Prom -- "Implements" --> Ports
    Log -- "Implements" --> Ports
    Alert -- "Implements" --> Ports

    %% Service Communication
    Ports <== "REST API" ==> UKT_Service
    Prom_Srv -- "Scrapes" --> Prom
    Grafana -- "Queries" --> Prom_Srv
    Alert -- "Webhooks" --> Discord

    style UKT_Service fill:#f9f,stroke:#333,stroke-width:2px
```

### Chi tiết các lớp
1.  **`core/ports/` (Interfaces)**: Định nghĩa "hình hài" của các dịch vụ. Lõi không phụ thuộc vào công nghệ cụ thể (Database, AI API).
2.  **`core/use-cases/` (Business Logic)**: Chứa luật chơi và luồng xử lý chính (Quy trình tạo khóa học, thuật toán SRS). Đây là trái tim của hệ thống.
3.  **`infrastructure/adapters/` (Implementation)**: 
    - **AI Adapters**: Hỗ trợ đa dạng nhà cung cấp (OpenAI, Gemini, HuggingFace) với cơ chế **Fallback**.
    - **Persistence**: Firebase (Firestore/Storage) và Local Storage.
    - **Observability**: Prometheus (metrics), Pino (logging) và Discord Webhooks (alerting).
4.  **`app/` (Presentation)**: Giao diện React (Next.js) và API Routes. Tuyệt đối không chứa logic tính toán phức tạp.

---

## 2. Luồng Dữ Liệu Tiêu Biểu (Data Flow)

1. **Người dùng tải PDF**:
   - Middleware kiểm tra **Rate Limit** qua Redis.
   - `ParseDocumentUseCase` gọi `MinerUAdapter` để chuyển PDF thành Markdown.
   - Kết quả được lưu vào `Firebase Storage`.

2. **Chẩn đoán kiến thức (Diagnostic)**:
   - `DiagnosticUseCase` sử dụng `FallbackAIAdapter` để sinh câu hỏi.
   - Kết quả làm bài được gửi sang `UKT Microservice` để tính toán trạng thái kiến thức.
   - Hệ thống ghi lại metrics (latency, token usage) vào `Prometheus`.

3. **Giám sát & Cảnh báo**:
   - Nếu `UKT Service` hoặc `AI Provider` gặp lỗi, `WebhookAlertAdapter` sẽ gửi cảnh báo ngay lập tức vào Discord.
   - DevOps theo dõi hiệu năng qua Dashboard trên `Grafana`.

---

## 3. Tài liệu Tham Chiếu
*   **Phân tích tài liệu**: `core/use-cases/parse-document.usecase.ts`
*   **Cấu hình DI**: `infrastructure/di/`
*   **Hệ thống lỗi**: `core/errors/`

---
*Tài liệu này là một phần của quy trình quản lý BMAD. Mọi thay đổi lớn cần được thảo luận qua phiên Brainstorming.*


