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
            const data = fs.readFileSync(PASSWORDS_FILE);
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Lỗi đọc file passwords:", e);
    }
    return { sitePassword: 'love', adminPassword: 'admin' };
}

// Hàm ghi mật khẩu vào file
function writePasswords(passwords) {
    try {
        fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
    } catch (e) {
        console.error("Lỗi ghi file passwords:", e);
    }
}

// 💬 QUẢN LÝ TIN NHẮN
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
let messages = [];
let loveImage = ''; // Đường dẫn file ảnh

// Khởi tạo/Đọc tin nhắn
function initData() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE);
            messages = JSON.parse(data);
        }
    } catch (e) {
        console.error("Lỗi đọc file messages:", e);
    }
}
initData();

function saveMessages() {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (e) {
        console.error("Lỗi ghi file messages:", e);
    }
}

// Middleware xác thực (Dùng chung cho cả Admin và Site)
const requireAuth = (passwordType) => (req, res, next) => {
    const password = req.headers['authorization'];
    const passwords = readPasswords();
    if (password === passwords[passwordType]) {
        next();
    } else {
        res.status(401).json({ error: 'Mật khẩu không hợp lệ' });
    }
};

const requireAdminAuth = requireAuth('adminPassword');
const requireSiteAuth = requireAuth('sitePassword');


// 🔄 API: Tin Nhắn
app.get('/api/messages', requireSiteAuth, (req, res) => {
    res.json({ messages });
});

app.post('/api/message', requireSiteAuth, (req, res) => {
    const { date, message } = req.body;
    if (!message || !date) {
        return res.status(400).json({ error: 'Vui lòng điền đủ thông tin.' });
    }
    messages.push(`[${date}] ${message}`);
    saveMessages();
    res.json({ success: true, message: 'Đã lưu tin nhắn thành công!' });
});

// API Admin: Xóa tin nhắn
app.delete('/api/messages', requireAdminAuth, (req, res) => {
    messages = [];
    saveMessages();
    res.json({ success: true, message: 'Đã xóa toàn bộ tin nhắn.' });
});

// API Admin: Lấy tất cả tin nhắn
app.get('/api/admin-messages', requireAdminAuth, (req, res) => {
    res.json({ messages });
});

// 🔒 API Admin: Đổi mật khẩu
app.post('/api/change-password', requireAdminAuth, (req, res) => {
    const { type, newPassword } = req.body; // type là 'sitePassword' hoặc 'adminPassword'
    if (!newPassword || (type !== 'sitePassword' && type !== 'adminPassword')) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    }

    const passwords = readPasswords();
    passwords[type] = newPassword;
    writePasswords(passwords);
    res.json({ success: true, message: `Đã đổi mật khẩu ${type === 'sitePassword' ? 'Trang Chính' : 'Admin'} thành công!` });
});

// 🖼️ API: Upload và Lấy ảnh
app.post('/api/upload-image', requireAdminAuth, upload.single('loveImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Không có file nào được chọn" });
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

// 🎯 ROUTING CHÍNH
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html'));
});

// 🆕 ROUTING CHO CÁC TRANG KỶ NIỆM (index_tymN.html)
app.get('/tym1', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym1.html'));
});
app.get('/tym2', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym2.html'));
});
app.get('/tym3', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym3.html'));
});

// 🆕 ROUTING CHO CÁC FILE NỀN GỐC (tymN_bg.html)
app.get('/tym1_bg', (req, res) => {
    res.sendFile(path.join(__dirname, 'tym1_bg.html'));
});
app.get('/tym2_bg', (req, res) => {
    res.sendFile(path.join(__dirname, 'tym2_bg.html'));
});
app.get('/tym3_bg', (req, res) => {
    res.sendFile(path.join(__dirname, 'tym3_bg.html'));
});


// Xử lý lỗi upload (lỗi Multer)
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File quá lớn! Tối đa 5MB.' });
        }
    }
    // Lỗi khác
    next(error);
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
