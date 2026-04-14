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

## Bước 6 — Tạo branch trước khi code

Mỗi tính năng / task làm trên branch riêng, **không commit thẳng vào `main`**.

```bash
git checkout -b <type>/<mô-tả-ngắn>
# Ví dụ:
git checkout -b feat/upload-ui
git checkout -b fix/parse-pdf-error
git checkout -b docs/weekly-report-week1
```

Quy tắc đặt tên branch: `<type>/<short-description>` — type giống commit convention ở trên.

## Bước 7 — Commit & Push

```bash
git add <files>
git commit -m "feat: mô tả thay đổi"
git push -u origin <tên-branch>
```

**Lưu ý:** Mỗi commit chỉ chứa **một thay đổi logic** — không gộp nhiều feature/fix vào một commit.

## Bước 8 — Tạo Pull Request (PR)

1. Vào GitHub repo → nhấn **"Compare & pull request"** (hoặc tạo PR thủ công)
2. Điền theo format:

```
Title: Mô tả ngắn gọn

## Summary
<mô tả tổng quan thay đổi>

## Changes
- <file 1>: mô tả
- <file 2>: mô tả
```

3. Chọn reviewer (nếu có) → nhấn **Create pull request**
4. Chờ review xong → **Merge** vào `main`

> Trước khi tạo PR, chạy `bash scripts/setup_hooks.sh` để cài git hooks.

## Bước 9 — Test
Tìm 1 file PDF ngắn có heading rõ ràng (ví dụ: slide bài giảng, tài liệu học)
Upload lên → xem kết quả chapters và lessons
