# Deploy Prometheus & Grafana lên Railway

## Cấu trúc thư mục

```
monitoring/
├── prometheus/
│   ├── Dockerfile
│   └── prometheus.yml
└── grafana/
    ├── Dockerfile
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml   ← tự động kết nối Prometheus
        └── dashboards/
            └── dashboard.yml    ← tự động load dashboard
```

---

## BƯỚC 1: Đẩy thư mục monitoring lên GitHub repo của bạn

Thêm thư mục `monitoring/` vào root của repo hiện tại rồi push lên GitHub.

---

## BƯỚC 2: Deploy Prometheus

1. Vào Railway dashboard → **New Service** → **GitHub Repo**
2. Chọn repo của bạn
3. Ở mục **Root Directory**, nhập: `monitoring/prometheus`
4. Railway sẽ tự detect Dockerfile và build
5. Vào **Settings** → **Networking**:
   - Đổi tên service thành **`prometheus`** (quan trọng! để Grafana kết nối qua `prometheus.railway.internal`)
   - Bấm **Generate Domain** nếu muốn truy cập Prometheus UI từ bên ngoài (port 9090)

---

## BƯỚC 3: Deploy Grafana

1. Vào Railway dashboard → **New Service** → **GitHub Repo**
2. Chọn cùng repo
3. Ở mục **Root Directory**, nhập: `monitoring/grafana`
4. Vào **Variables**, thêm các biến:

   | Key | Value |
   |-----|-------|
   | `GF_SECURITY_ADMIN_USER` | `admin` |
   | `GF_SECURITY_ADMIN_PASSWORD` | mật khẩu bạn muốn |
   | `GF_SERVER_ROOT_URL` | URL public của Grafana (lấy sau khi deploy) |

5. Vào **Settings** → **Networking**:
   - Đổi tên service thành **`grafana`**
   - Bấm **Generate Domain** → đây là URL bạn dùng để mở Grafana

---

## BƯỚC 4: Kiểm tra

1. Mở URL public của Grafana
2. Đăng nhập với `admin` / mật khẩu đã set
3. Vào **Connections** → **Data Sources** → Prometheus đã được kết nối tự động
4. Bấm **Save & Test** để kiểm tra kết nối

---

## Lưu ý tên service

File `prometheus.yml` dùng các target sau — đảm bảo tên service trên Railway khớp:

| Target | Tên service Railway cần đặt |
|--------|---------------------------|
| `web.railway.internal:3000` | `web` |
| `ukt-service.railway.internal:8000` | `ukt-service` |
| `prometheus.railway.internal:9090` | `prometheus` |

Nếu tên service Railway của bạn khác, vào `monitoring/prometheus/prometheus.yml` sửa lại targets cho khớp.

---

## Thêm Volume cho Prometheus (giữ data khi restart)

Vào service Prometheus trên Railway:
- **Settings** → **Volumes** → **Add Volume**
- Mount path: `/prometheus`

---

## Sửa prometheus.yml sau khi deploy (không cần redeploy)

Prometheus hỗ trợ hot-reload. Sau khi sửa file và push lên GitHub:
```
curl -X POST http://<prometheus-public-url>/-/reload
```
