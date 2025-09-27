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
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được upload file ảnh!'), false);
        }
    }
});

// 🔐 QUẢN LÝ MẬT KHẨU ĐỘNG
const PASSWORDS_FILE = path.join(__dirname, 'passwords.json');

// Hàm đọc mật khẩu từ file
function readPasswords() {
    try {
        if (fs.existsSync(PASSWORDS_FILE)) {
            return JSON.parse(fs.readFileSync(PASSWORDS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Lỗi đọc file mật khẩu:', error);
    }
    
    // Mật khẩu mặc định nếu file không tồn tại
    return {
        sitePassword: "love123",
        adminPassword: "admin123"
    };
}

// Hàm ghi mật khẩu vào file
function writePasswords(passwords) {
    try {
        fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
        return true;
    } catch (error) {
        console.error('Lỗi ghi file mật khẩu:', error);
        return false;
    }
}

// Đọc mật khẩu khi khởi động
let passwords = readPasswords();

// 🔒 MIDDLEWARE BẢO MẬT
const requireSiteAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === passwords.sitePassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const requireAdminAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (auth === passwords.adminPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Bộ nhớ tạm cho tin nhắn và ảnh
let loveMessages = [];
let loveImage = null;

// API: Kiểm tra mật khẩu trang chính
app.post('/api/check-password', (req, res) => {
    const { password } = req.body;
    if (password === passwords.sitePassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Sai mật khẩu!" });
    }
});

// API: đăng nhập admin
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === passwords.adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Sai mật khẩu!" });
    }
});

// API: Lấy mật khẩu hiện tại (chỉ admin)
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    res.json({
        sitePassword: passwords.sitePassword,
        adminPassword: passwords.adminPassword
    });
});

// API: Đổi mật khẩu trang chính (chỉ admin)
app.post('/api/change-site-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ success: false, error: "Mật khẩu phải có ít nhất 3 ký tự" });
    }
    
    passwords.sitePassword = newPassword;
    
    if (writePasswords(passwords)) {
        res.json({ success: true, message: "✅ Đã thay đổi mật khẩu trang chính thành công!" });
    } else {
        res.status(500).json({ success: false, error: "Lỗi khi lưu mật khẩu" });
    }
});

// API: Đổi mật khẩu admin (chỉ admin, không cần currentPassword)
app.post('/api/change-admin-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ success: false, error: "Mật khẩu mới phải có ít nhất 3 ký tự" });
    }
    
    passwords.adminPassword = newPassword;
    
    if (writePasswords(passwords)) {
        res.json({ success: true, message: "✅ Đã thay đổi mật khẩu admin thành công!" });
    } else {
        res.status(500).json({ success: false, error: "Lỗi khi lưu mật khẩu" });
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
        
        const imagePath = '/uploads/' + req.file.filename;
        loveImage = imagePath;
        
        res.json({ 
            success: true, 
            image: loveImage, 
            message: "Đã upload ảnh thành công!",
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || "Lỗi khi upload ảnh" });
    }
});

// API: lấy ảnh (cần mật khẩu trang chính)
app.get('/api/love-image', requireSiteAuth, (req, res) => {
    res.json({ image: loveImage });
});

// Phục vụ file upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🎯 ROUTING (Tuyến đường)

// Trang chính (đã tích hợp đăng nhập và slideshow)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Trang Admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Trang Game
app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

// Tuyến đường cho các file trái tim gốc (Không cần mật khẩu)
app.get('/tym1', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym1.html'));
});
app.get('/tym2', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym2.html'));
});
app.get('/tym3', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym3.html'));
});

// Tuyến đường cho index4.html
app.get('/tym4', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym4.html'));
});


// Xử lý lỗi upload (lỗi Multer)
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File quá lớn! Tối đa 5MB.' });
        }
    }
    // Lỗi chung (bao gồm lỗi fileFilter)
    res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
    console.log(`🚀 Server chạy trên port ${PORT}`);
    console.log(`🔐 Mật khẩu trang chính hiện tại: ${passwords.sitePassword}`);
    console.log(`🔐 Mật khẩu admin hiện tại: ${passwords.adminPassword}`);
});
