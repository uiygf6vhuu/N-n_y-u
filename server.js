const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose'); // Import Mongoose
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

// 🔐 QUẢN LÝ MẬT KHẨU BỀN VỮNG (Sử dụng MongoDB)

// 1. KẾT NỐI MONGODB
// Sử dụng MONGO_URI (tự động cung cấp bởi Railway) hoặc fallback cho local
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/love_site";
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// 2. ĐỊNH NGHĨA SCHEMA VÀ MODEL
// Schema để lưu Mật khẩu Trang Chính và Mật khẩu Admin
const PasswordSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // 'site' hoặc 'admin'
    value: { type: String, required: true }
});
const PasswordModel = mongoose.model('Password', PasswordSchema);

// 3. BIẾN GLOBAL TẠM THỜI (được tải từ DB khi khởi động)
let passwords = { sitePassword: "love123", adminPassword: "admin123" };
let loveMessages = []; // Vẫn dùng bộ nhớ tạm
let loveImage = null; // Vẫn dùng bộ nhớ tạm

// 4. HÀM TẢI MẬT KHẨU TỪ DB
async function loadPasswords() {
    try {
        const site = await PasswordModel.findOne({ key: 'site' });
        const admin = await PasswordModel.findOne({ key: 'admin' });
        
        // Tạo mặc định nếu chưa tồn tại trong DB
        if (!site) {
            await PasswordModel.create({ key: 'site', value: 'love123' });
            passwords.sitePassword = 'love123';
        } else {
            passwords.sitePassword = site.value;
        }

        if (!admin) {
            await PasswordModel.create({ key: 'admin', value: 'admin123' });
            passwords.adminPassword = 'admin123';
        } else {
            passwords.adminPassword = admin.value;
        }

        console.log('Database passwords loaded successfully.');
    } catch (error) {
        console.error('Error loading passwords from DB:', error);
    }
}

// 5. HÀM LƯU MẬT KHẨU VÀO DB
async function savePassword(key, newPassword) {
    try {
        await PasswordModel.findOneAndUpdate(
            { key: key },
            { value: newPassword },
            { upsert: true, new: true } // upsert: tạo nếu chưa có
        );
        return true;
    } catch (error) {
        console.error('Error saving password to DB:', error);
        return false;
    }
}


// 🔒 MIDDLEWARE BẢO MẬT (Sử dụng biến 'passwords' đã được tải)
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

// ... (API Kiểm tra/Đăng nhập giữ nguyên) ...

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

// API: Đổi mật khẩu trang chính (Sử dụng DB)
app.post('/api/change-site-password', requireAdminAuth, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ success: false, error: "Mật khẩu phải có ít nhất 3 ký tự" });
    }
    
    if (await savePassword('site', newPassword)) {
        passwords.sitePassword = newPassword; // Cập nhật biến tạm
        res.json({ success: true, message: "✅ Đã thay đổi mật khẩu trang chính thành công!" });
    } else {
        res.status(500).json({ success: false, error: "Lỗi khi lưu mật khẩu" });
    }
});

// API: Đổi mật khẩu admin (Sử dụng DB)
app.post('/api/change-admin-password', requireAdminAuth, async (req, res) => {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ success: false, error: "Mật khẩu mới phải có ít nhất 3 ký tự" });
    }
    
    if (await savePassword('admin', newPassword)) {
        passwords.adminPassword = newPassword; // Cập nhật biến tạm
        res.json({ success: true, message: "✅ Đã thay đổi mật khẩu admin thành công!" });
    } else {
        res.status(500).json({ success: false, error: "Lỗi khi lưu mật khẩu" });
    }
});

// ... (Các API khác giữ nguyên) ...

app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Tin nhắn không hợp lệ" });
    loveMessages.push(message);
    res.json({ success: true, message: "Đã lưu tin nhắn 💌" });
});

app.get('/api/love-messages', requireSiteAuth, (req, res) => {
    res.json({ messages: loveMessages });
});

app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return res.status(400).json({ success: false, error: "URL ảnh không hợp lệ" });
    }
    loveImage = imageUrl;
    res.json({ success: true, image: loveImage, message: "Đã lưu URL ảnh thành công!" });
});

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

app.get('/api/love-image', requireSiteAuth, (req, res) => {
    res.json({ image: loveImage });
});

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

// Tuyến đường cho các file trái tim gốc
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
    res.status(500).json({ error: error.message });
});

// 6. KHỞI ĐỘNG SERVER (phải chờ tải mật khẩu)
const startServer = async () => {
    await loadPasswords(); // Chờ tải mật khẩu từ DB
    
    app.listen(PORT, () => {
        console.log(`🚀 Server chạy trên port ${PORT}`);
        console.log(`🔐 Mật khẩu trang chính hiện tại: ${passwords.sitePassword}`);
        console.log(`🔐 Mật khẩu admin hiện tại: ${passwords.adminPassword}`);
    });
};

startServer(); // Khởi động ứng dụng
