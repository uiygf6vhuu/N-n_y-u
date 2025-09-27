const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Bộ nhớ tạm
let loveMessages = [];
let loveImage = null;

// API: đăng nhập admin
const ADMIN_PASSWORD = "admin123";
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

// API: Nhận URL ảnh từ Admin
app.post('/api/upload-url', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return res.status(400).json({ success: false, error: "URL ảnh không hợp lệ" });
  }
  loveImage = imageUrl;
  res.json({ success: true, image: loveImage, message: "Đã lưu URL ảnh thành công!" });
});

// API: lấy ảnh
app.get('/api/love-image', (req, res) => {
  res.json({ image: loveImage });
});

// Routes cho các trang HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

// Route cho truy cập trực tiếp file HTML
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

// Xử lý các route khác
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server chạy trên port ${PORT}`);
});
