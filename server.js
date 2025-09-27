const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Đặt tên file là timestamp + tên gốc
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 6 * 4096 * 4096 }, // Giới hạn 5MB
    fileFilter: function (req, file, cb) {
        // Chỉ chấp nhận file ảnh
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được upload file ảnh!'), false);
        }
    }
});

// Bộ nhớ tạm
let loveMessages = [];
let loveImage = null;
const SITE_PASSWORD = "love123"; // Mật khẩu cho trang chính
const ADMIN_PASSWORD = "admin123"; // Mật khẩu cho admin

// 🔒 MIDDLEWARE BẢO MẬT
const requireSiteAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === SITE_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireAdminAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API: Kiểm tra mật khẩu trang chính
app.post('/api/check-password', (req, res) => {
    const { password } = req.body;
    if (password === SITE_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Sai mật khẩu!" });
    }
});

// API: đăng nhập admin
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Sai mật khẩu!" });
    }
});

// API: lưu tin nhắn (chỉ admin)
app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Tin nhắn không hợp lệ" });
    loveMessages.push(message);
    res.json({ success: true, message: "Đã lưu tin nhắn 💌" });
});

// API: lấy tin nhắn (cần mật khẩu trang chính)
app.get('/api/love-messages', requireSiteAuth, (req, res) => {
    res.json({ messages: loveMessages });
});

// API: Upload ảnh từ URL (chỉ admin)
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).json({ success: false, error: "URL ảnh không hợp lệ" });
    }
    loveImage = imageUrl;
    res.json({ success: true, image: loveImage, message: "Đã lưu URL ảnh thành công!" });
});

// API: Upload ảnh từ thiết bị (chỉ admin)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Không có file được chọn" });
        }
        
        // Lưu đường dẫn ảnh
        const imagePath = '/uploads/' + req.file.filename;
        loveImage = imagePath;
        
        res.json({ 
            success: true, 
            image: loveImage, 
            message: "Đã upload ảnh thành công!",
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Lỗi khi upload ảnh" });
    }
});

// API: lấy ảnh (cần mật khẩu trang chính)
app.get('/api/love-image', requireSiteAuth, (req, res) => {
    res.json({ image: loveImage });
});

// Phục vụ file upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🎯 ROUTING
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

// Xử lý lỗi upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File quá lớn! Tối đa 5MB.' });
        }
    }
    res.status(500).json({ error: error.message });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server chạy trên port ${PORT}`);
    console.log(`🔐 Mật khẩu trang chính: ${SITE_PASSWORD}`);
    console.log(`🔐 Mật khẩu admin: ${ADMIN_PASSWORD}`);
});
