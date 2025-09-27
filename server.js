[file name]: server.js
[file content begin]
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

// 🎮 QUẢN LÝ GAME SCORE
const SCORES_FILE = path.join(__dirname, 'scores.json');
let gameScores = [];

// Khởi tạo/Đọc dữ liệu
function initData() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            const data = fs.readFileSync(MESSAGES_FILE);
            messages = JSON.parse(data);
        }
        
        if (fs.existsSync(SCORES_FILE)) {
            const data = fs.readFileSync(SCORES_FILE);
            gameScores = JSON.parse(data);
        }
    } catch (e) {
        console.error("Lỗi đọc file dữ liệu:", e);
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

function saveScores() {
    try {
        fs.writeFileSync(SCORES_FILE, JSON.stringify(gameScores, null, 2));
    } catch (e) {
        console.error("Lỗi ghi file scores:", e);
    }
}

// Middleware xác thực
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

// 🔐 API Đăng nhập Admin
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    const passwords = readPasswords();
    if (password === passwords.adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Sai mật khẩu' });
    }
});

// 🔐 API Lấy thông tin mật khẩu
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    const passwords = readPasswords();
    res.json(passwords);
});

// 🔐 API Đổi mật khẩu trang chính
app.post('/api/change-site-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
    }
    const passwords = readPasswords();
    passwords.sitePassword = newPassword;
    writePasswords(passwords);
    res.json({ success: true, message: 'Đã đổi mật khẩu trang chính thành công!' });
});

// 🔐 API Đổi mật khẩu admin
app.post('/api/change-admin-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
    }
    const passwords = readPasswords();
    passwords.adminPassword = newPassword;
    writePasswords(passwords);
    res.json({ success: true, message: 'Đã đổi mật khẩu admin thành công!' });
});

// 💌 API Tin nhắn
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

// 💌 API Quản lý tin nhắn (admin)
app.get('/api/love-messages', requireAdminAuth, (req, res) => {
    res.json({ messages });
});

app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Tin nhắn không được để trống' });
    }
    messages.push(message);
    saveMessages();
    res.json({ success: true, message: 'Đã thêm tin nhắn thành công!' });
});

app.delete('/api/messages', requireAdminAuth, (req, res) => {
    messages = [];
    saveMessages();
    res.json({ success: true, message: 'Đã xóa toàn bộ tin nhắn.' });
});

// 🖼️ API Upload từ URL
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return res.status(400).json({ error: 'URL ảnh không được để trống' });
    }
    loveImage = imageUrl;
    res.json({ success: true, message: 'Đã lưu ảnh từ URL thành công!', image: loveImage });
});

// 🖼️ API Upload file
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
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

// 🖼️ API lấy ảnh
app.get('/api/love-image', requireSiteAuth, (req, res) => {
    res.json({ image: loveImage });
});

// 🎮 API Game - Lưu điểm số
app.post('/api/game-score', requireSiteAuth, (req, res) => {
    const { score, level, clicksPerMinute, playerName = 'Người chơi' } = req.body;
    
    const newScore = {
        playerName,
        score,
        level,
        clicksPerMinute,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    
    gameScores.push(newScore);
    // Giữ chỉ 50 điểm số gần nhất
    if (gameScores.length > 50) {
        gameScores = gameScores.slice(-50);
    }
    
    saveScores();
    res.json({ success: true, message: 'Đã lưu điểm số!' });
});

// 🎮 API Game - Lấy bảng xếp hạng
app.get('/api/game-scores', requireSiteAuth, (req, res) => {
    // Sắp xếp theo điểm số giảm dần
    const sortedScores = [...gameScores].sort((a, b) => b.score - a.score);
    res.json({ scores: sortedScores.slice(0, 10) }); // Top 10
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

// 🎯 ROUTING CHO CÁC HIỆU ỨNG TIM (SỬ DỤNG 3 FILE BẠN ĐÃ CUNG CẤP)
app.get('/tym1', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // File gốc của bạn
});

app.get('/tym2', (req, res) => {
    res.sendFile(path.join(__dirname, 'index2.html')); // File gốc của bạn
});

app.get('/tym3', (req, res) => {
    res.sendFile(path.join(__dirname, 'index3.html')); // File gốc của bạn
});

// Xử lý lỗi upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File quá lớn! Tối đa 5MB.' });
        }
    }
    next(error);
});

// Route mặc định
app.use((req, res) => {
    res.status(404).send('Trang không tồn tại');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`🔗 Truy cập: http://localhost:${PORT}`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin`);
    console.log(`🎮 Game: http://localhost:${PORT}/game`);
    console.log(`💖 Tym1: http://localhost:${PORT}/tym1`);
    console.log(`💖 Tym2: http://localhost:${PORT}/tym2`);
    console.log(`💖 Tym3: http://localhost:${PORT}/tym3`);
});
[file content end]
