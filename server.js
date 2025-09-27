const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Kiểm tra file tồn tại
const checkFileExists = (filename) => {
  return fs.existsSync(path.join(__dirname, filename));
};

console.log('📁 Kiểm tra file tồn tại:');
console.log('- index.html:', checkFileExists('index.html'));
console.log('- admin.html:', checkFileExists('admin.html'));
console.log('- game.html:', checkFileExists('game.html'));

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

// 🚨 QUAN TRỌNG: Routing chính xác
app.get('/', (req, res) => {
  console.log('📄 Phục vụ index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  console.log('🔑 Phục vụ admin.html');
  if (checkFileExists('admin.html')) {
    res.sendFile(path.join(__dirname, 'admin.html'));
  } else {
    res.status(404).send('File admin.html không tồn tại');
  }
});

app.get('/game', (req, res) => {
  console.log('🎮 Phục vụ game.html');
  if (checkFileExists('game.html')) {
    res.sendFile(path.join(__dirname, 'game.html'));
  } else {
    res.status(404).send('File game.html không tồn tại');
  }
});

// Route trực tiếp đến file
app.get('/admin.html', (req, res) => {
  res.redirect('/admin');
});

app.get('/game.html', (req, res) => {
  res.redirect('/game');
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Trang không tồn tại</h1>
    <p>Các trang có sẵn:</p>
    <ul>
      <li><a href="/">Trang chủ</a></li>
      <li><a href="/admin">Admin</a></li>
      <li><a href="/game">Game</a></li>
    </ul>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server chạy trên port ${PORT}`);
  console.log(`🌐 Truy cập: http://localhost:${PORT}`);
  console.log(`🔗 Admin: http://localhost:${PORT}/admin`);
  console.log(`🎮 Game: http://localhost:${PORT}/game`);
});
