# UKT (Uncertainty Knowledge Tracing) Microservice

Dịch vụ này chịu trách nhiệm phân tích dữ liệu tương tác của học viên để ước lượng trạng thái kiến thức và dự đoán hiệu suất trong tương lai, sử dụng các kỹ thuật AI tiên tiến để xử lý sự bất định (Uncertainty).

## 🧠 Các tính năng cốt lõi

### 1. Ước lượng Kiến thức (Knowledge State Estimation)
Dịch vụ cung cấp cặp giá trị $(\mu, \sigma)$ cho từng Chủ đề kiến thức (Knowledge Component - KC):
- **$\mu$ (Mean):** Đại diện cho mức độ thông thạo của học viên (0.0 đến 1.0).
- **$\sigma$ (Standard Deviation):** Đại diện cho độ bất định của hệ thống về kiến thức đó. $\sigma$ cao nghĩa là học viên chưa tương tác đủ hoặc kết quả tương tác không nhất quán.

### 2. Thuật toán lai (Hybrid Algorithm)
- **Deep Learning Model:** Sử dụng **Wasserstein Self-Attention** và **Stochastic Embeddings** để xử lý các chuỗi tương tác dài.
- **Bayesian Fallback:** Khi chưa có đủ dữ liệu hoặc model checkpoint, hệ thống tự động sử dụng **Bayesian Knowledge Tracing (Beta Distribution)** để cung cấp kết quả xấp xỉ chính xác.

### 3. Phát hiện Phản ứng Bất thường (Aleatory Flag)
Hệ thống có khả năng phát hiện các trường hợp:
- **Lucky Guess (Đoán mò):** Trả lời đúng một câu khó trong khi các câu nền tảng lại sai.
- **Careless Error (Làm ẩu):** Trả lời sai một câu rất dễ trong khi đang có chuỗi trả lời đúng liên tục.

### 4. Gợi ý Lộ trình (Adaptive Recommendation)
- **Priority Order:** Sắp xếp các chủ đề dựa trên công thức $(\mu - \sigma)$. Các phần học viên yếu nhất và hệ thống ít dữ liệu nhất sẽ được đẩy lên hàng đầu.
- **Zone of Proximal Development (ZPD):** Gợi ý các thẻ bài học có xác suất trả lời đúng khoảng **0.7**, giúp học viên luôn ở trạng thái tập trung cao nhất (không quá dễ, không quá khó).

## 🚀 API Endpoints

- `POST /predict`: Nhận lịch sử tương tác, trả về trạng thái kiến thức và thứ tự ưu tiên học tập.
- `POST /update`: Cập nhật trạng thái tức thời sau mỗi lần học viên đánh giá thẻ bài (Hard/Ok/Easy).
- `GET /health`: Kiểm tra sức khỏe hệ thống và trạng thái load model.

## 🛠 Cài đặt & Chạy
Dịch vụ được Dockerize hoàn toàn và tích hợp trong `docker-compose.yml` của toàn dự án.

---
*Phát triển dựa trên nghiên cứu về Uncertainty-aware Knowledge Tracing.*
