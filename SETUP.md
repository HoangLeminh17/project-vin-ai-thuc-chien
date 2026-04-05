# Setup Guide

## Yêu cầu
- Node.js 18+

## Bước 1 — Pull code mới nhất
git pull

## Bước 2 — Install dependencies
npm install

## Bước 3 — Tạo .env.local
Tạo file .env.local ở root, điền các keys sau:

GEMINI_API_KEY=
# Lấy tại: aistudio.google.com → Get API key

PDF_MINERU_BASE_URL=https://mineru.net/api/v4
PDF_MINERU_API_KEY=
# Lấy tại: mineru.net → đăng ký → API Management

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
# Lấy tại: Firebase Console → Project Settings → Service Accounts → Generate new private key

## Bước 4 — Chạy dev server
npm run dev
Mở http://localhost:3000

## Bước 5 — Test
Tìm 1 file PDF ngắn có heading rõ ràng (ví dụ: slide bài giảng, tài liệu học)
Upload lên → xem kết quả chapters và lessons