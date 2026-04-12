# Hướng Dẫn Phát Triển Ứng Dụng (Clean Architecture)

Ứng dụng của chúng ta hiện đang được cấu trúc theo mô hình **Clean Architecture (Ports & Adapters)**. Hướng dẫn này giúp tất cả các thành viên (team members) hiểu rõ quy trình để tự mình đóng gói và phát triển một tính năng (feature) hoàn chỉnh từ A đến Z mà không phá vỡ quy tắc thiết kế.

---

## 1. Tổng Quan Về Kiến Trúc

Dự án được chia thành 4 lớp (layer) chính, tương tác theo nguyên tắc "Dependency Rule" (Mũi tên phụ thuộc chỉ được hướng từ ngoài vào trong lõi).

1. **`core/ports/` (Interfaces - Tầng Lõi)**: Định nghĩa "Hình hài" của các dịch vụ bên ngoài. Lõi không cần biết Database là gì, AI model gọi API ra sao.
2. **`core/use-cases/` (Business Logic - Tầng Nghiệp Vụ)**: Nơi chứa luật chơi, thuật toán và luồng xử lý chính của ứng dụng.
3. **`infrastructure/adapters/` (Cài Code Thực Tế)**: Nơi chứa code API, Firebase, SDK... Các tệp này sẽ triển khai (implements) Interface từ tầng Core.
4. **`app/` & `app/api/` (Presentation - Tầng Giao Diện/HTTP)**: Giao diện React (Next.js) và Controller. Tuyệt đối không chứa logic tính toán phức tạp ở đây.

---

## 2. Quy Trình "Chuẩn" Để Code Một Tính Năng Mới

Mỗi khi được giao một Feature, đừng vội code giao diện hay API ngay! Hãy làm theo **5 bước** sau:

### Bước 1: Suy nghĩ về Dữ liệu và Interface (Ports)
Khởi đầu từ lõi. Nếu tính năng cần giao tiếp ra hệ thống bên ngoài (Ví dụ: Gửi email, Kết nối Database), hãy tạo file ở `core/ports/`.
*Ví dụ: Yêu cầu tính năng Dịch văn bản.*
Tạo `core/ports/translator.port.ts`:
```typescript
export interface ITranslatorService {
  translate(text: string, toLang: string): Promise<string>;
}
```

### Bước 2: Viết Business Logic (Use Case)
Tạo luồng xử lý chính ở `core/use-cases/`. Tệp này **chỉ được phép Import Ports**, tuyệt đối không import Firebase, Axios hay thư viện ngoài.
*Ví dụ: `core/use-cases/translate-document.usecase.ts`*
```typescript
import { ITranslatorService } from '../ports/translator.port';

export class TranslateDocumentUseCase {
  constructor(private readonly translator: ITranslatorService) {}

  async execute(documentText: string) {
    if (!documentText) throw new Error("Văn bản rỗng!");
    return await this.translator.translate(documentText, 'vi');
  }
}
```

### Bước 3: Code Adapter Kết Nối (Infrastructure)
Bây giờ mới là lúc bạn chọn Framework (Google Translate API, ChatGPT, v.v.). Tạo file tại `infrastructure/adapters/`.
*Ví dụ: `infrastructure/adapters/google-translate.adapter.ts`*
```typescript
import { ITranslatorService } from '@/core/ports/translator.port';

export class GoogleTranslateAdapter implements ITranslatorService {
  async translate(text: string, toLang: string): Promise<string> {
    // Gọi fetch() tới API của Google ở đây
    return "Kết quả dịch...";
  }
}
```

### Bước 4: Khai Báo Ở Trung Tâm (Dependency Injection)
Mở file `infrastructure/di.ts` và tiêm Adapter vào Use Case để tạo ra một Object duy nhất (Singleton).
```typescript
import { TranslateDocumentUseCase } from '@/core/use-cases/translate-document.usecase';
import { GoogleTranslateAdapter } from './adapters/google-translate.adapter';

const translatorAdapter = new GoogleTranslateAdapter();
export const translateDocUseCase = new TranslateDocumentUseCase(translatorAdapter);
```

### Bước 5: Cắm Vào Giao Diện / API (NextJS App Router)
Giờ đây, bạn có thể gọi nó một cách gọn gàng vô cùng ở Route hoặc Server Actions (`app/api/...`).
```typescript
import { translateDocUseCase } from '@/infrastructure/di';
// ... trong logic POST/GET
const ketQua = await translateDocUseCase.execute("Hello");
```

---

## 3. Các Quy Tắc Tối Kỵ (Cần Nắm Thuộc Lòng)

⛔ **KHÔNG BAO GIỜ**: Import `infrastructure` hoặc `@/lib/` hoặc thư viện hệ thống gọi SDK vào trong thư mục `core/use-cases/`. Use Cases phải được code bằng TypeScript thuần túy.

⛔ **KHÔNG BAO GIỜ**: Viết logic tính toán tiền bạc, kiểm tra quyền hạn dông dài trong `app/api/.../route.ts` hay `page.tsx`. Hãy đẩy xuống Use Case!

✅ **LUÔN LUÔN**: Nếu một công nghệ dễ bị thay thế (như chuyển từ dịch AWS sang Google, bóc PDF từ Mineru sang GPT-4), hãy tạo Adapter cho nó! Tránh viết cứng (Hard-code) logic thư viện vào dự án.

## 4. Bắt Đầu Cùng Nhau
Các thành viên đội dự án hãy xem thử 2 file tham chiếu tốt nhất hiện nay:
- Phân tích tài liệu: `core/use-cases/parse-document.usecase.ts`
- Trợ lý AI: `core/use-cases/generate-course.usecase.ts`

Chúc bạn thiết kế ra những modules sạch sẽ, mạnh mẽ và độc lập nhất!
