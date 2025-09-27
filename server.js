const express = require('express');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Phục vụ file tĩnh từ thư mục HIỆN TẠI (ngang hàng với server.js)
app.use(express.static(path.join(__dirname))); 

// Bộ nhớ tạm
let loveMessages = [];
let loveImage = null;

// Thiết lập upload ảnh
const storage = multer.diskStorage({
  // Lưu ảnh vào thư mục 'uploads' ngang hàng server.js
  destination: (req, file, cb) => cb(null, 'uploads/'), 
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// API: đăng nhập admin
const ADMIN_PASSWORD = "admin123"; // đổi mật khẩu tại đây
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

// API: upload ảnh
app.post('/api/upload', upload.single('image'), (req, res) => {
  loveImage = "/uploads/" + req.file.filename;
  res.json({ success: true, image: loveImage });
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

app.listen(PORT, () => console.log(`🚀 Running on http://localhost:${PORT}`));
