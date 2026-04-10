# Setup Guide

## Yêu cầu
- Node.js 18+
- Python 3.10+

## Bước 1 — Pull code mới nhất
```
git pull
```

## Bước 2 — Install Node dependencies
```
npm install
```

## Bước 3 — Install Python dependencies
```
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

## Bước 4 — Tạo file .env
Tạo file `.env` ở root, điền các keys sau:

```
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
```

## Bước 5 — Chạy dev server
```
npm run dev
```
Mở http://localhost:3000

## Git Commit Convention
Dùng [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: mô tả ngắn       # tính năng mới
fix: mô tả ngắn        # sửa bug
chore: mô tả ngắn      # setup, config, deps
refactor: mô tả ngắn   # đổi code không đổi behavior
docs: mô tả ngắn       # tài liệu
```

Ví dụ: `feat: add upload UI + course viewer with accordion`

> Ghi chi tiết quyết định kỹ thuật, phân công, brainstorming vào [WORKLOG.md](WORKLOG.md)

## Bước 6 — Test
Tìm 1 file PDF ngắn có heading rõ ràng (ví dụ: slide bài giảng, tài liệu học)
Upload lên → xem kết quả chapters và lessons
