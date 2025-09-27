const express = require('express');
const path = require('path');
// const multer = require('multer'); <--- Đã xóa Multer
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Phục vụ file tĩnh từ thư mục HIỆN TẠI (ngang hàng với server.js)
app.use(express.static(path.join(__dirname))); 

// Bộ nhớ tạm (Lưu trữ dữ liệu chỉ tồn tại khi server chạy)
let loveMessages = [];
let loveImage = null; // Sẽ lưu trữ URL ảnh, không phải file

// API: đăng nhập admin
const ADMIN_PASSWORD = "admin123"; // Đổi mật khẩu tại đây
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Sai mật khẩu" });
  }
});

// API: lưu tin nhắn
app.post('/api/love-messages', (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return res.status(400).json({ error: "Tin nhắn không hợp lệ" });
  loveMessages.push(message);
  res.json({ success: true, message: "Đã lưu tin nhắn 💌" });
});

// API: lấy tin nhắn
app.get('/api/love-messages', (req, res) => {
  res.json({ messages: loveMessages });
});

// API MỚI: Nhận URL ảnh từ Admin
app.post('/api/upload-url', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).json({ success: false, error: "URL ảnh không hợp lệ" });
  }
  loveImage = imageUrl; // Lưu trữ URL
  res.json({ success: true, image: loveImage, message: "Đã lưu URL ảnh thành công!" });
});

// API: lấy ảnh
app.get('/api/love-image', (req, res) => {
  res.json({ image: loveImage });
});

// Route chính
app.get('/', (req, res) => {
    // Trả về index.html nằm ngang hàng
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server love đang chạy trên port http://localhost:${PORT}`));
