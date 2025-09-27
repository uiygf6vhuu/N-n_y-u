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
        // Tạo thư mục nếu chưa tồn tại
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file duy nhất dựa trên thời gian và số ngẫu nhiên
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
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
let loveImage = null;

// Hàm đọc mật khẩu từ file
function readPasswords() {
    try {
        if (fs.existsSync(PASSWORDS_FILE)) {
            const data = fs.readFileSync(PASSWORDS_FILE, 'utf8');
            return JSON.parse(data);
        }
        // Khởi tạo mặc định nếu file không tồn tại
        const defaultPasswords = {
            sitePassword: 'love',
            adminPassword: 'admin',
            messages: [],
            countdownDate: '2024-02-14' // Ngày mặc định
        };
        savePasswords(defaultPasswords);
        return defaultPasswords;
    } catch (e) {
        console.error("Lỗi khi đọc file passwords:", e);
        return { sitePassword: 'love', adminPassword: 'admin', messages: [], countdownDate: '2024-02-14' };
    }
}

// Hàm ghi mật khẩu vào file
function savePasswords(passwords) {
    try {
        fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 4), 'utf8');
    } catch (e) {
        console.error("Lỗi khi ghi file passwords:", e);
    }
}

let passwords = readPasswords();

// 🔒 MIDDLEWARE KIỂM TRA MẬT KHẨU

// Kiểm tra mật khẩu trang chính (index.html)
function requireSiteAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader === passwords.sitePassword) {
        next();
    } else {
        res.status(401).json({ error: 'Mật khẩu trang chính không đúng!' });
    }
}

// Kiểm tra mật khẩu Admin
function requireAdminAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader === passwords.adminPassword) {
        next();
    } else {
        res.status(401).json({ error: 'Mật khẩu Admin không đúng!' });
    }
}

// 🔑 API: ĐĂNG NHẬP

app.post('/api/login/site', (req, res) => {
    const { password } = req.body;
    if (password === passwords.sitePassword) {
        res.json({ success: true, message: 'Đăng nhập thành công!' });
    } else {
        res.status(401).json({ success: false, error: 'Mật khẩu không đúng.' });
    }
});

app.post('/api/login/admin', (req, res) => {
    const { password } = req.body;
    if (password === passwords.adminPassword) {
        res.json({ success: true, message: 'Đăng nhập Admin thành công!' });
    } else {
        res.status(401).json({ success: false, error: 'Mật khẩu Admin không đúng.' });
    }
});


// ⚙️ API: CẤU HÌNH & DỮ LIỆU CHUNG (Cần mật khẩu Admin)

// API: Lấy mật khẩu và ngày đếm ngược
app.get('/api/config', requireAdminAuth, (req, res) => {
    res.json({ 
        sitePassword: passwords.sitePassword,
        adminPassword: passwords.adminPassword,
        countdownDate: passwords.countdownDate
    });
});

// API: Cập nhật mật khẩu và ngày đếm ngược
app.post('/api/config', requireAdminAuth, (req, res) => {
    const { newSitePassword, newAdminPassword, newCountdownDate } = req.body;

    if (newSitePassword && newSitePassword.trim() !== '') {
        passwords.sitePassword = newSitePassword.trim();
    }

    if (newAdminPassword && newAdminPassword.trim() !== '') {
        passwords.adminPassword = newAdminPassword.trim();
    }
    
    if (newCountdownDate && newCountdownDate.trim() !== '') {
        passwords.countdownDate = newCountdownDate.trim();
    }

    savePasswords(passwords);
    res.json({ success: true, message: 'Cấu hình đã được cập nhật thành công.' });
});

// 💌 API: TIN NHẮN YÊU THƯƠNG

// API: Thêm tin nhắn (Cần mật khẩu trang chính)
app.post('/api/message', requireSiteAuth, (req, res) => {
    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }
    
    // Giới hạn tin nhắn để tránh quá tải file
    if (passwords.messages.length >= 100) {
        passwords.messages.shift(); // Xóa tin nhắn cũ nhất
    }

    passwords.messages.push(message.trim());
    savePasswords(passwords);
    res.json({ success: true, message: 'Tin nhắn của bạn đã được lưu lại! Cảm ơn bạn ❤️' });
});

// API: Lấy danh sách tin nhắn (Cần mật khẩu Admin)
app.get('/api/messages', requireAdminAuth, (req, res) => {
    res.json({ messages: passwords.messages });
});

// API: Xóa tất cả tin nhắn (Cần mật khẩu Admin)
app.post('/api/messages/clear', requireAdminAuth, (req, res) => {
    passwords.messages = [];
    savePasswords(passwords);
    res.json({ success: true, message: 'Đã xóa tất cả tin nhắn.' });
});

// 📅 API: LẤY DỮ LIỆU CHUNG (Cần mật khẩu trang chính)

// API: Lấy ngày đếm ngược và tin nhắn
app.get('/api/data', requireSiteAuth, (req, res) => {
    res.json({ 
        countdownDate: passwords.countdownDate, 
        messages: passwords.messages 
    });
});


// 🖼️ API: QUẢN LÝ ẢNH

// API: Upload ảnh (Cần mật khẩu Admin)
app.post('/api/upload', requireAdminAuth, upload.single('love-image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Không có file nào được chọn" });
        }
        
        const imagePath = '/uploads/' + req.file.filename;
        loveImage = imagePath; // Cập nhật đường dẫn ảnh hiện tại

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
    // Lỗi chung (bao gồm lỗi fileFilter)
    res.status(500).json({ error: error.message });
});

// 🚀 Khởi động Server

// 👇 CHỖ ĐƯỢC SỬA: Bỏ '0.0.0.0' để tăng khả năng tương thích khi deploy

app.listen(PORT, () => {
    console.log(`🚀 Server chạy trên port ${PORT}`);
    console.log(`🔐 Mật khẩu trang chính hiện tại: ${passwords.sitePassword}`);
    console.log(`🔐 Mật khẩu admin hiện tại: ${passwords.adminPassword}`);
});
