const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Bộ nhớ tạm
let loveMessages = [];
let loveImage = null;
const ADMIN_PASSWORD = "admin123";

// 🔒 MIDDLEWARE BẢO MẬT CHO ADMIN
const requireAdminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
};

// API: đăng nhập admin
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Sai mật khẩu" });
    }
});

// API: lưu tin nhắn (chỉ admin)
app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Tin nhắn không hợp lệ" });
    loveMessages.push(message);
    res.json({ success: true, message: "Đã lưu tin nhắn 💌" });
});

// API: lấy tin nhắn (công khai)
app.get('/api/love-messages', (req, res) => {
    res.json({ messages: loveMessages });
});

// API: Upload URL ảnh (chỉ admin)
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).json({ success: false, error: "URL ảnh không hợp lệ" });
    }
    loveImage = imageUrl;
    res.json({ success: true, image: loveImage, message: "Đã lưu URL ảnh thành công!" });
});

// API: lấy ảnh (công khai)
app.get('/api/love-image', (req, res) => {
    res.json({ image: loveImage });
});

// 🎯 ROUTING CHÍNH XÁC
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server chạy trên port ${PORT}`);
});
