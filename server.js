// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// --------------------------------------------------------------------------------
// IN-MEMORY STORAGE (DỮ LIỆU SẼ BỊ MẤT KHI SERVER RESTART)
// --------------------------------------------------------------------------------

let inMemoryDB = {
    // Mật khẩu mặc định
    passwords: {
        site: "tinhyeu123",
        admin: "admin456"
    },
    // Tin nhắn
    messages: [
        { date: '2025-01-01', message: 'Chào mừng đến với trang bí mật!' }
    ],
    // URL ảnh
    loveImage: 'https://picsum.photos/seed/defaultlove/400/400',
    // Điểm game (Sắp xếp theo điểm giảm dần)
    gameScores: [
        { playerName: "Top Player", score: 180, level: 6, clicksPerMinute: 320, date: new Date().toISOString() },
        { playerName: "Medium", score: 85, level: 4, clicksPerMinute: 200, date: new Date().toISOString() }
    ]
};

// --------------------------------------------------------------------------------
// CẤU HÌNH SERVER VÀ MIDDLEWARE
// --------------------------------------------------------------------------------

// Cấu hình Multer để lưu file tạm thời (vẫn cần để xử lý upload file)
const upload = multer({ dest: UPLOADS_DIR });
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 
app.use('/uploads', express.static(UPLOADS_DIR)); 


/**
 * Xác thực cho Trang Chính (Site)
 */
const requireSiteAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    if (authHeader !== inMemoryDB.passwords.site) {
        return res.status(403).json({ error: 'Invalid site password.' });
    }
    next();
};

/**
 * Xác thực cho Admin
 */
const requireAdminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    if (authHeader !== inMemoryDB.passwords.admin) {
        return res.status(403).json({ error: 'Invalid admin password.' });
    }
    next();
};


// --------------------------------------------------------------------------------
// ENDPOINTS PHỤC VỤ FILE
// --------------------------------------------------------------------------------

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
['/tym1', '/tym2', '/tym3', '/tym4'].forEach(route => {
    app.get(route, (req, res) => {
        const fileMap = {
            '/tym1': 'index_tym1.html',
            '/tym2': 'index_tym2.html',
            '/tym3': 'index_tym3.html',
            '/tym4': 'index_tym4.html',
        };
        res.sendFile(path.join(__dirname, fileMap[route]));
    });
});


// --------------------------------------------------------------------------------
// API CHO TRANG CHÍNH (SITE API)
// --------------------------------------------------------------------------------

// GET /api/messages - Tải tin nhắn + Dùng để xác thực Trang Chính
app.get('/api/messages', requireSiteAuth, (req, res) => {
    // Tin nhắn được đảo ngược để hiển thị tin mới nhất trước trong danh sách
    const formattedMessages = [...inMemoryDB.messages].reverse().map(m => `${m.date}: ${m.message}`);
    res.json({ messages: formattedMessages });
});

// POST /api/messages-with-date - Gửi tin nhắn từ Trang Chính
app.post('/api/messages-with-date', requireSiteAuth, (req, res) => {
    const { date, message } = req.body;
    if (!date || !message) {
        return res.status(400).json({ error: 'Date and message are required.' });
    }
    
    inMemoryDB.messages.push({ date, message: message.substring(0, 500) });
    res.json({ message: 'Message posted successfully.' });
});


// --------------------------------------------------------------------------------
// API CHO TRANG ADMIN (ADMIN API)
// --------------------------------------------------------------------------------

// GET /api/passwords - Lấy mật khẩu hiện tại
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    res.json({ 
        sitePassword: inMemoryDB.passwords.site,
        adminPassword: inMemoryDB.passwords.admin
    });
});

// POST /api/change-site-password - Đổi mật khẩu trang chính
app.post('/api/change-site-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    }
    
    inMemoryDB.passwords.site = newPassword;
    res.json({ message: 'Đã đổi mật khẩu trang chính thành công!' });
});

// POST /api/change-admin-password - Đổi mật khẩu admin
app.post('/api/change-admin-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    }
    
    inMemoryDB.passwords.admin = newPassword;
    res.json({ message: 'Đã đổi mật khẩu Admin thành công!' });
});

// GET /api/love-image - Lấy URL ảnh tình yêu
app.get('/api/love-image', (req, res) => {
    // Cho phép cả Site và Admin truy cập
    const authHeader = req.headers['authorization'];
    if (authHeader !== inMemoryDB.passwords.site && authHeader !== inMemoryDB.passwords.admin) {
        return res.status(403).json({ error: 'Invalid password.' });
    }
    
    res.json({ image: inMemoryDB.loveImage });
});

// POST /api/upload-url - Upload ảnh từ URL
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'URL ảnh là bắt buộc.' });

    inMemoryDB.loveImage = imageUrl;
    res.json({ message: 'URL ảnh đã được cập nhật.', image: imageUrl });
});

// POST /api/upload-file - Upload ảnh từ file (lưu cục bộ tạm thời)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File ảnh là bắt buộc.' });
    
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.filename + fileExtension;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    // Đổi tên file để giữ nguyên extension
    fs.renameSync(req.file.path, filePath);

    // Lưu đường dẫn cục bộ (sẽ bị mất trên Railway sau khi server restart)
    inMemoryDB.loveImage = `/uploads/${fileName}`;

    res.json({ message: 'File ảnh đã được upload thành công (tạm thời).', image: inMemoryDB.loveImage });
});

// GET /api/love-messages - Lấy danh sách tin nhắn (cho Admin)
app.get('/api/love-messages', requireAdminAuth, (req, res) => {
    // Tin nhắn được đảo ngược để hiển thị tin mới nhất trước
    const formattedMessages = [...inMemoryDB.messages].reverse().map(m => `${m.date}: ${m.message}`);
    res.json({ messages: formattedMessages });
});

// POST /api/love-messages - Thêm tin nhắn (cho Admin)
app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Tin nhắn là bắt buộc.' });
    
    const today = new Date().toISOString().split('T')[0];
    inMemoryDB.messages.push({ date: today, message: message.substring(0, 500) });

    res.json({ message: 'Tin nhắn đã được thêm thành công.' });
});


// --------------------------------------------------------------------------------
// API CHO TRANG GAME (GAME API)
// --------------------------------------------------------------------------------

// GET /api/game-scores - Lấy bảng xếp hạng
app.get('/api/game-scores', requireSiteAuth, (req, res) => {
    // Sắp xếp theo điểm và chỉ lấy top 10
    const sortedScores = [...inMemoryDB.gameScores]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
        
    res.json({ scores: sortedScores });
});

// POST /api/game-score - Lưu điểm mới
app.post('/api/game-score', requireSiteAuth, (req, res) => {
    const { score, level, clicksPerMinute, playerName } = req.body;
    
    if (typeof score !== 'number' || score < 1) {
        return res.status(400).json({ error: 'Điểm không hợp lệ.' });
    }

    const newScore = {
        playerName: playerName || 'Người chơi bí mật',
        score,
        level: level || 1,
        clicksPerMinute: clicksPerMinute || 0,
        date: new Date().toISOString()
    };
    
    inMemoryDB.gameScores.push(newScore);

    res.json({ message: 'Điểm đã được lưu thành công.' });
});


// --------------------------------------------------------------------------------
// KHỞI ĐỘNG SERVER
// --------------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Site password: ${inMemoryDB.passwords.site}`);
    console.log(`Admin password: ${inMemoryDB.passwords.admin}`);
    console.log("WARNING: Data is stored in memory and will be LOST on server restart.");
});
