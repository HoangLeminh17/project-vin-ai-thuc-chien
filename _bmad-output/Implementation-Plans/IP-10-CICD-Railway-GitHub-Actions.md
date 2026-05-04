# Implementation Plan: CI/CD Pipeline to Railway via GitHub Actions

Bản kế hoạch này mô tả các bước kỹ thuật để tự động hóa quá trình kiểm thử (CI) và triển khai (CD) hệ thống Synapsy (Web & UKT Service) lên nền tảng đám mây Railway thông qua GitHub Actions.

## 🛠 Mục tiêu & Kiến trúc
- **Continuous Integration (CI):** Chạy linter, unit tests tự động mỗi khi có Push hoặc Pull Request vào nhánh `main`.
- **Continuous Deployment (CD):** Nếu CI pass, tự động build và deploy cả 2 services (`web` và `ukt-service`) lên Railway.
- **Mô hình Monorepo:** Tận dụng file `docker-compose.yml` hoặc triển khai đa dịch vụ (multi-service) trên Railway từ một Git Repository duy nhất.

---

## 📋 Bước 1: Thiết lập Project trên Railway (Manual Setup)
Trước khi cấu hình GitHub Actions, bạn cần chuẩn bị hạ tầng trên Railway.

1. **Tạo Project:** Đăng nhập vào Railway.app, tạo một Project trống (Empty Project).
2. **Tạo Services:**
   Vì repo có 2 service độc lập, bạn cần tạo 2 "Empty Service" trên Railway, sau đó liên kết mã nguồn từ thư mục tương ứng. Hoặc sử dụng CLI từ GitHub Actions để push lên.
   - Service 1: `web` (Next.js)
   - Service 2: `ukt-service` (Python FastAPI)
3. **Lấy RAILWAY_TOKEN:**
   - Vào mục **Settings > Tokens** của tài khoản Railway.
   - Tạo một token mới, copy giá trị này (sẽ dùng để cấp quyền cho GitHub Actions).
4. **Cấu hình Environment Variables:**
   Trên Dashboard của Railway, thêm các biến môi trường cho service `web`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `FIREBASE_PRIVATE_KEY`, `OPENAI_API_KEY`, `PDF_MINERU_API_KEY`, v.v.
   - Lưu ý: URL của UKT Service (`UKT_SERVICE_URL`) trên Railway sẽ lấy địa chỉ public/internal của service `ukt-service` vừa tạo thay vì `http://ukt-service:8000` nội bộ.

---

## ⚙️ Bước 2: Cấu hình GitHub Secrets
Truy cập kho lưu trữ (Repository) trên GitHub:
- Đi đến **Settings > Secrets and variables > Actions**.
- Thêm mới các `Repository secrets`:
  - `RAILWAY_TOKEN`: Giá trị Token lấy từ Bước 1.

*(Lưu ý: Không cần đặt biến môi trường Firebase/OpenAI trong GitHub Secrets cho bước deploy, vì Railway sẽ build container sử dụng biến môi trường được cấu hình trực tiếp trên Railway Dashboard).*

---

## 🚀 Bước 3: Cập nhật GitHub Actions Workflow

Thay thế/Cập nhật file `.github/workflows/cicd.yml` hiện tại bằng kịch bản sau để tích hợp CI và CD.

```yaml
name: CI/CD Pipeline to Railway

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  # 1. CI: Chạy Test & Linting trước khi Deploy
  ci-build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npx vitest run

  # 2. CD: Deploy lên Railway (Chỉ chạy khi push vào main và CI đã pass)
  cd-deploy-to-railway:
    name: Deploy to Railway
    needs: ci-build-and-test
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy UKT Service to Railway
        run: railway up --service ukt-service --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Web App to Railway
        run: railway up --service web --detach
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

*(Ghi chú: Cờ `--service` của Railway CLI yêu cầu bạn phải liên kết chính xác tên Service hoặc cung cấp Service ID trong project).*

### Phương án thay thế cho Docker Compose:
Railway hiện nay hỗ trợ kết nối GitHub Repository trực tiếp và nó có thể tự nhận diện `docker-compose.yml`. Thay vì đẩy bằng CLI, cấu hình **Native GitHub Integration** của Railway thường được ưa chuộng hơn cho các dự án Monorepo/Docker-compose.
Nếu chọn cách này, GitHub Actions của bạn sẽ chỉ làm nhiệm vụ CI (Testing), và Railway sẽ tự kích hoạt quá trình build CD khi có code được gộp vào nhánh `main`.

---

## 🔄 Bước 4: Validation & Monitoring (Kiểm tra)
1. **Push thử code:** `git add .`, `git commit -m "Test CI/CD"`, `git push origin main`.
2. **Kiểm tra Actions:** Vào tab `Actions` trên GitHub để theo dõi job `Build & Test` chạy thành công.
3. **Kiểm tra Railway:** Mở Dashboard Railway, theo dõi log hệ thống quá trình build Docker. Nếu service Web khởi động ở cổng 3000 và kết nối thành công tới UKT Service, thì pipeline CD đã thành công rực rỡ!
