# [PRD-04] Secure Authentication System

## 1. Mục tiêu (Objective)
Cung cấp cơ chế xác thực an toàn và bảo mật cho người dùng, đảm bảo dữ liệu khóa học cá nhân được bảo vệ và chống lại các cuộc tấn công phổ biến (XSS, CSRF).

## 2. Công nghệ sử dụng
- **Firebase Auth (Client)**: Xử lý giao diện login và lấy ID Token.
- **Firebase Admin SDK (Server)**: Xác thực ID Token và tạo Session Cookie.
- **Next.js Middleware**: Kiểm tra quyền truy cập route dựa trên Cookie.

## 3. Đặc tả chức năng
- [ ] **Login**: Hỗ trợ đăng nhập (Email/Password hoặc Social).
- [ ] **Session Persistence**: Sử dụng **HttpOnly Cookie** với thời hạn 5 ngày.
- [ ] **Logout**: Xóa cookie và vô hiệu hóa session từ phía server.
- [ ] **Auth State Management**: Cung cấp Hook hoặc Context để Client biết trạng thái User.

## 4. Bảo mật (Security Requirements)
- Cookie phải được set thuộc tính `HttpOnly`, `Secure`, và `SameSite: Strict`.
- Tuyệt đối không lưu Token trong `localStorage` hoặc `sessionStorage` (ADR-14).
- Phải có cơ chế Refresh Session nếu cần thiết.

## 5. Quy trình kỹ thuật (Architecture)
1. Browser gửi ID Token (sau login) tới `/api/auth/login`.
2. Server gọi Firebase `createSessionCookie`.
3. Server trả về Response có header `Set-Cookie`.
4. Các request tiếp theo tự động đính kèm Cookie này.

---
## 6. Success Metrics
- 100% người dùng không thể truy cập tài nguyên bảo mật nếu chưa có Session Cookie.
- Thời gian login/logout: < 2 giây.
