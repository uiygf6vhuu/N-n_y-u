// server.js (Phiên bản sử dụng File System để lưu dữ liệu)
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json'); 

// --------------------------------------------------------------------------------
// HÀM XỬ LÝ DỮ LIỆU BỀN VỮNG (PERSISTENCE)
// --------------------------------------------------------------------------------

let inMemoryDB = {}; 

/**
 * Mẫu dữ liệu mặc định ban đầu
 */
const DEFAULT_DATA = {
    passwords: {
        site: "tinhyeu123",
        admin: "newadmin123" // <-- MẬT KHẨU ADMIN ĐÃ ĐỔI ĐỂ KHẮC PHỤC LỖI
    },
    messages: [
        { date: '2025-01-01', message: 'Chào mừng đến với trang bí mật!' }
    ],
    loveImage: 'https://picsum.photos/seed/defaultlove/400/400',
    gameScores: [
        { playerName: "Top Player", score: 180, level: 6, clicksPerMinute: 320, date: new Date().toISOString() },
        { playerName: "Medium", score: 85, level: 4, clicksPerMinute: 200, date: new Date().toISOString() }
    ]
};

/**
 * Tải dữ liệu từ file JSON. Nếu file không tồn tại, dùng dữ liệu mặc định.
 */
const loadData = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            inMemoryDB = JSON.parse(data);
            console.log('✅ Dữ liệu đã được tải thành công từ data.json.');
        } else {
            inMemoryDB = DEFAULT_DATA;
            saveData(); 
            console.log('⚠️ Không tìm thấy data.json. Đã tạo dữ liệu mặc định.');
        }
    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu:', error.message);
        inMemoryDB = DEFAULT_DATA;
    }
};

/**
 * Lưu dữ liệu vào file JSON.
 */
const saveData = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryDB, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Lỗi khi lưu dữ liệu:', error.message);
    }
};

// --------------------------------------------------------------------------------
// CẤU HÌNH SERVER VÀ MIDDLEWARE
// --------------------------------------------------------------------------------

// Cấu hình Multer để lưu file tạm thời
const upload = multer({ dest: UPLOADS_DIR });
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Tải dữ liệu ngay khi server khởi động
loadData(); 

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 
app.use('/uploads', express.static(UPLOADS_DIR)); 

/** Xác thực cho Trang Chính (Site) */
const requireSiteAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    if (authHeader !== inMemoryDB.passwords.site) {
        return res.status(403).json({ error: 'Invalid site password.' });
    }
    next();
};

/** Xác thực cho Admin */
const requireAdminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    if (authHeader !== inMemoryDB.passwords.admin) {
        return res.status(403).json({ error: 'Invalid admin password.' });
    }
    next();
};


// --------------------------------------------------------------------------------
// ENDPOINTS VÀ API (CHỈ CẬP NHẬT saveData() KHI CẦN)
// --------------------------------------------------------------------------------

// ENDPOINTS PHỤC VỤ FILE
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

// API CHO TRANG CHÍNH
app.get('/api/messages', requireSiteAuth, (req, res) => {
    const formattedMessages = [...inMemoryDB.messages].reverse().map(m => `${m.date}: ${m.message}`);
    res.json({ messages: formattedMessages });
});

app.post('/api/messages-with-date', requireSiteAuth, (req, res) => {
    const { date, message } = req.body;
    if (!date || !message) return res.status(400).json({ error: 'Date and message are required.' });
    inMemoryDB.messages.push({ date, message: message.substring(0, 500) });
    saveData(); 
    res.json({ message: 'Message posted successfully.' });
});

// API CHO TRANG ADMIN
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    res.json({ 
        sitePassword: inMemoryDB.passwords.site,
        adminPassword: inMemoryDB.passwords.admin
    });
});

app.post('/api/change-site-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    inMemoryDB.passwords.site = newPassword;
    saveData(); 
    res.json({ message: 'Đã đổi mật khẩu trang chính thành công!' });
});

app.post('/api/change-admin-password', requireAdminAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    inMemoryDB.passwords.admin = newPassword;
    saveData(); 
    res.json({ message: 'Đã đổi mật khẩu Admin thành công!' });
});

app.get('/api/love-image', (req, res) => {
    const authHeader = req.headers['authorization'];
    if (authHeader !== inMemoryDB.passwords.site && authHeader !== inMemoryDB.passwords.admin) {
        return res.status(403).json({ error: 'Invalid password.' });
    }
    res.json({ image: inMemoryDB.loveImage });
});

app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'URL ảnh là bắt buộc.' });
    inMemoryDB.loveImage = imageUrl;
    saveData(); 
    res.json({ message: 'URL ảnh đã được cập nhật.', image: imageUrl });
});

app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File ảnh là bắt buộc.' });
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.filename + fileExtension;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.renameSync(req.file.path, filePath);
    inMemoryDB.loveImage = `/uploads/${fileName}`;
    saveData(); 
    res.json({ message: 'File ảnh đã được upload thành công (tạm thời).', image: inMemoryDB.loveImage });
});

app.get('/api/love-messages', requireAdminAuth, (req, res) => {
    const formattedMessages = [...inMemoryDB.messages].reverse().map(m => `${m.date}: ${m.message}`);
    res.json({ messages: formattedMessages });
});

app.post('/api/love-messages', requireAdminAuth, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Tin nhắn là bắt buộc.' });
    const today = new Date().toISOString().split('T')[0];
    inMemoryDB.messages.push({ date: today, message: message.substring(0, 500) });
    saveData(); 
    res.json({ message: 'Tin nhắn đã được thêm thành công.' });
});

// API CHO TRANG GAME
app.get('/api/game-scores', requireSiteAuth, (req, res) => {
    const sortedScores = [...inMemoryDB.gameScores].sort((a, b) => b.score - a.score).slice(0, 10);
    res.json({ scores: sortedScores });
});

app.post('/api/game-score', requireSiteAuth, (req, res) => {
    const { score, level, clicksPerMinute, playerName } = req.body;
    if (typeof score !== 'number' || score < 1) return res.status(400).json({ error: 'Điểm không hợp lệ.' });
    const newScore = {
        playerName: playerName || 'Người chơi bí mật',
        score,
        level: level || 1,
        clicksPerMinute: clicksPerMinute || 0,
        date: new Date().toISOString()
    };
    inMemoryDB.gameScores.push(newScore);
    saveData(); 
    res.json({ message: 'Điểm đã được lưu thành công.' });
});


// --------------------------------------------------------------------------------
// KHỞI ĐỘNG SERVER
// --------------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Site password: ${inMemoryDB.passwords.site}`);
    console.log(`Admin password: ${inMemoryDB.passwords.admin}`);
    console.log("LƯU Ý: Dữ liệu được lưu trong data.json.");
});
