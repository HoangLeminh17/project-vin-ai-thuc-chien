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

## 4. Hướng Dẫn Viết Unit Test Cho Tính Năng

Chúng ta sử dụng `vitest` để viết Unit Test. Bất kỳ Use Case hay Middleware cốt lõi nào cũng cần được test đầy đủ.
- File test nên được đặt trong thư mục `tests/` ở thư mục gốc của dự án, và tái tạo lại đúng cấu trúc thư mục của file code thật. Hãy dùng đuôi `.spec.ts` (ví dụ: `tests/core/use-cases/your-use-case.spec.ts`).
- **Để test Use case**: Do các Dependency đã được đưa ra interface (Ports), bạn chỉ cần dùng `vi.fn()` để mock lại các object truyền vào. Điều này giúp test chạy rất nhanh mà không đụng tới Database hay External API.

*Ví dụ*:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TranslateDocumentUseCase } from '@/core/use-cases/translate-document.usecase';

describe('TranslateDocumentUseCase', () => {
  it('should translate correctly', async () => {
    // 1. Mock Port
    const mockTranslator = { translate: vi.fn().mockResolvedValue('Hello') };
    // 2. Init UseCase
    const useCase = new TranslateDocumentUseCase(mockTranslator as any);
    // 3. Execute & Expect
    const result = await useCase.execute('Xin chào');
    
    expect(result).toBe('Hello');
    expect(mockTranslator.translate).toHaveBeenCalledWith('Xin chào', 'vi');
  });
});
```
*Chạy test bằng câu lệnh:* `npm run test`

---

## 5. Logging và Monitoring Tập Trung (Centralized)

Chúng ta **KHÔNG rải rác** những câu `console.log()` hay gọi API ghi lỗi (như gửi lên Sentry) một cách thủ công bên trong tầng Core (Use Cases) hay Controller, vì sẽ làm bẩn và rối code. Thay vào đó, chúng ta có các Proxy và Middleware để gánh vác việc đó.

- **Đối với Use Cases**: Đã có wrapper `withUseCaseLogging` (Proxy). Bạn chỉ cần tiêm Use Case qua hàm này ở `infrastructure/di.ts` thì nó sẽ tự động log thông tin ("bắt đầu chạy", "hoàn thành bao lâu") và "tự động capture exception vào monitoring nếu lỗi".

*Ví dụ tích hợp trong `di.ts`:*
```typescript
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger-and-monitor-instances';

const rawUseCase = new TranslateDocumentUseCase(translatorAdapter);

// Bọc use-case bằng proxy logger
export const translateDocUseCase = withUseCaseLogging(
  rawUseCase, 
  'TranslateDocument', // Tên theo dõi
  logger, 
  monitoring
);
```

- **Đối với API Routes (Next.js)**: Sử dụng middleware `withApiLogging` bọc lấy handler trong file `route.ts`. 

*Ví dụ trong `app/api/.../route.ts`:*
```typescript
import { withApiLogging } from '@/lib/middlewares/with-api-logging';

async function logicHandler(req: Request) { ... }

export const POST = withApiLogging('TranslateAPI', logicHandler);
```

✅ Tuân thủ thiết kế này, các hàm xử lý logic (Use Cases, API Handlers) của bạn mãi mãi "Sạch sẽ", bạn tập trung 100% vào Business Rule thay vì ngồi viết `.catch(e => logger.error(...))`!

---

## 6. Lời Kết

Các thành viên dự án hãy xem thử những file này làm tham chiếu:
- Phân tích tài liệu: `core/use-cases/parse-document.usecase.ts`
- Cách config Dependency Injection: `infrastructure/di.ts`
- Middleware & Proxy Logger: `core/utils/use-case-logger.ts` và `lib/middlewares/with-api-logging.ts`

Chúc bạn thiết kế ra những ứng dụng sạch sẽ, mạnh mẽ và dễ mở rộng!
