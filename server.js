const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Thêm middleware để log các request
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ... (phần API của bạn giữ nguyên)

// Route chính
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  console.log('Admin page accessed');
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
  console.log('Game page accessed');
  res.sendFile(path.join(__dirname, 'game.html'));
});

// Route cho truy cập trực tiếp file HTML
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server love đang chạy trên port ${PORT}`);
  console.log(`🌐 Truy cập: https://your-project.railway.app`);
  console.log(`🔗 Admin: https://your-project.railway.app/admin`);
  console.log(`🎮 Game: https://your-project.railway.app/game`);
});
