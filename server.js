// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config(); // Tải biến môi trường (ví dụ: MONGO_URI)

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// --------------------------------------------------------------------------------
// KẾT NỐI VÀ MODEL MONGOOSE
// --------------------------------------------------------------------------------

// Kết nối tới MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/love_site', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB successfully! 💖");
}).catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});

// Định nghĩa Mongoose Schemas (Collections)
const ConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});
const Config = mongoose.model('Config', ConfigSchema);

const MessageSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    message: { type: String, required: true, maxlength: 500 }
});
const Message = mongoose.model('Message', MessageSchema);

const ScoreSchema = new mongoose.Schema({
    playerName: { type: String, default: 'Người chơi bí mật' },
    score: { type: Number, required: true },
    level: { type: Number, default: 1 },
    clicksPerMinute: { type: Number, default: 0 },
    date: { type: Date, default: Date.now }
});
const GameScore = mongoose.model('GameScore', ScoreSchema);

// --------------------------------------------------------------------------------
// LOGIC KHỞI TẠO DATABASE
// --------------------------------------------------------------------------------

/**
 * Khởi tạo mật khẩu và ảnh mặc định nếu chúng chưa tồn tại.
 */
async function initializeDatabase() {
    try {
        const defaultConfigs = [
            { key: 'site_password', value: 'tinhyeu123' },
            { key: 'admin_password', value: 'admin456' },
            { key: 'love_image', value: 'https://picsum.photos/seed/defaultlove/400/400' }
        ];

        for (const config of defaultConfigs) {
            await Config.findOneAndUpdate({ key: config.key }, { value: config.value }, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        
        const currentSitePass = await Config.findOne({ key: 'site_password' });
        const currentAdminPass = await Config.findOne({ key: 'admin_password' });

        console.log(`Initial Site password: ${currentSitePass.value}`);
        console.log(`Initial Admin password: ${currentAdminPass.value}`);

    } catch (error) {
        console.error("Error initializing database:", error);
    }
}


// --------------------------------------------------------------------------------
// CẤU HÌNH SERVER VÀ MIDDLEWARE
// --------------------------------------------------------------------------------

// Cấu hình Multer để lưu file tạm thời
const upload = multer({ dest: UPLOADS_DIR });
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 
app.use('/uploads', express.static(UPLOADS_DIR)); 

/**
 * Lấy mật khẩu từ DB
 */
async function getPasswords() {
    const configs = await Config.find({ key: { $in: ['site_password', 'admin_password'] } });
    const passwords = {};
    configs.forEach(conf => {
        passwords[conf.key] = conf.value;
    });
    return passwords;
}

/**
 * Xác thực cho Trang Chính (Site)
 */
const requireSiteAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    const passwords = await getPasswords();
    if (authHeader !== passwords.site_password) {
        return res.status(403).json({ error: 'Invalid site password.' });
    }
    next();
};

/**
 * Xác thực cho Admin
 */
const requireAdminAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Authorization header required.' });
    
    const passwords = await getPasswords();
    if (authHeader !== passwords.admin_password) {
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
app.get('/api/messages', requireSiteAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 }); // Lấy mới nhất trước
        const formattedMessages = messages.map(m => `${m.date.toISOString().split('T')[0]}: ${m.message}`);
        res.json({ messages: formattedMessages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

// POST /api/messages-with-date - Gửi tin nhắn từ Trang Chính
app.post('/api/messages-with-date', requireSiteAuth, async (req, res) => {
    const { date, message } = req.body;
    if (!date || !message) {
        return res.status(400).json({ error: 'Date and message are required.' });
    }
    
    try {
        const newMessage = new Message({ date: new Date(date), message });
        await newMessage.save();
        res.json({ message: 'Message posted successfully.' });
    } catch (error) {
        console.error("Error inserting message:", error);
        res.status(500).json({ error: 'Failed to post message.' });
    }
});


// --------------------------------------------------------------------------------
// API CHO TRANG ADMIN (ADMIN API)
// --------------------------------------------------------------------------------

// GET /api/passwords - Lấy mật khẩu hiện tại
app.get('/api/passwords', requireAdminAuth, async (req, res) => {
    try {
        const passwords = await getPasswords();
        res.json({ 
            sitePassword: passwords.site_password,
            adminPassword: passwords.admin_password
        });
    } catch (error) {
        console.error("Error fetching passwords:", error);
        res.status(500).json({ error: 'Failed to fetch passwords.' });
    }
});

// POST /api/change-site-password - Đổi mật khẩu trang chính
app.post('/api/change-site-password', requireAdminAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    }
    
    try {
        await Config.findOneAndUpdate({ key: 'site_password' }, { value: newPassword });
        res.json({ message: 'Đã đổi mật khẩu trang chính thành công!' });
    } catch (error) {
        console.error("Error changing site password:", error);
        res.status(500).json({ error: 'Failed to change site password.' });
    }
});

// POST /api/change-admin-password - Đổi mật khẩu admin
app.post('/api/change-admin-password', requireAdminAuth, async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự.' });
    }
    
    try {
        await Config.findOneAndUpdate({ key: 'admin_password' }, { value: newPassword });
        res.json({ message: 'Đã đổi mật khẩu Admin thành công!' });
    } catch (error) {
        console.error("Error changing admin password:", error);
        res.status(500).json({ error: 'Failed to change admin password.' });
    }
});

// GET /api/love-image - Lấy URL ảnh tình yêu
app.get('/api/love-image', async (req, res) => {
    // API này yêu cầu xác thực Site hoặc Admin
    const authHeader = req.headers['authorization'];
    const passwords = await getPasswords();

    if (authHeader !== passwords.site_password && authHeader !== passwords.admin_password) {
        return res.status(403).json({ error: 'Invalid password.' });
    }
    
    try {
        const result = await Config.findOne({ key: 'love_image' });
        res.json({ image: result ? result.value : null });
    } catch (error) {
        console.error("Error fetching love image:", error);
        res.status(500).json({ error: 'Failed to fetch love image URL.' });
    }
});

// POST /api/upload-url - Upload ảnh từ URL
app.post('/api/upload-url', requireAdminAuth, async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'URL ảnh là bắt buộc.' });

    try {
        await Config.findOneAndUpdate({ key: 'love_image' }, { value: imageUrl });
        res.json({ message: 'URL ảnh đã được cập nhật.', image: imageUrl });
    } catch (error) {
        console.error("Error updating image URL:", error);
        res.status(500).json({ error: 'Failed to update image URL.' });
    }
});

// POST /api/upload-file - Upload ảnh từ file (lưu cục bộ tạm thời)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'File ảnh là bắt buộc.' });
    
    // Lưu file vào thư mục uploads (Cảnh báo: TẠM THỜI TRÊN RAILWAY/SERVER KHÔNG CÓ PERSISTENT STORAGE)
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileName = req.file.filename + fileExtension;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    fs.renameSync(req.file.path, filePath);

    const imageUrl = `/uploads/${fileName}`;

    try {
        await Config.findOneAndUpdate({ key: 'love_image' }, { value: imageUrl });
        res.json({ message: 'File ảnh đã được upload thành công (tạm thời).', image: imageUrl });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: 'Failed to process file upload.' });
    }
});

// GET /api/love-messages - Lấy danh sách tin nhắn (cho Admin)
app.get('/api/love-messages', requireAdminAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ date: -1 });
        const formattedMessages = messages.map(m => `${m.date.toISOString().split('T')[0]}: ${m.message}`);
        res.json({ messages: formattedMessages });
    } catch (error) {
        console.error("Error fetching love messages (Admin):", error);
        res.status(500).json({ error: 'Failed to fetch messages.' });
    }
});

// POST /api/love-messages - Thêm tin nhắn (cho Admin)
app.post('/api/love-messages', requireAdminAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Tin nhắn là bắt buộc.' });
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const newMessage = new Message({ date: new Date(today), message });
        await newMessage.save();
        res.json({ message: 'Tin nhắn đã được thêm thành công.' });
    } catch (error) {
        console.error("Error adding love message:", error);
        res.status(500).json({ error: 'Failed to add message.' });
    }
});


// --------------------------------------------------------------------------------
// API CHO TRANG GAME (GAME API)
// --------------------------------------------------------------------------------

// GET /api/game-scores - Lấy bảng xếp hạng
app.get('/api/game-scores', requireSiteAuth, async (req, res) => {
    try {
        const scores = await GameScore.find().sort({ score: -1 }).limit(10);
        const formattedScores = scores.map(row => ({
            playerName: row.playerName,
            score: row.score,
            level: row.level,
            clicksPerMinute: row.clicksPerMinute,
            date: row.date
        }));
        res.json({ scores: formattedScores });
    } catch (error) {
        console.error("Error fetching game scores:", error);
        res.status(500).json({ error: 'Failed to fetch game scores.' });
    }
});

// POST /api/game-score - Lưu điểm mới
app.post('/api/game-score', requireSiteAuth, async (req, res) => {
    const { score, level, clicksPerMinute, playerName } = req.body;
    
    if (typeof score !== 'number' || score < 1) {
        return res.status(400).json({ error: 'Điểm không hợp lệ.' });
    }

    try {
        const newScore = new GameScore({
            playerName: playerName || 'Người chơi bí mật',
            score,
            level: level || 1,
            clicksPerMinute: clicksPerMinute || 0,
        });
        await newScore.save();
        res.json({ message: 'Điểm đã được lưu thành công.' });
    } catch (error) {
        console.error("Error saving game score:", error);
        res.status(500).json({ error: 'Failed to save game score.' });
    }
});


// --------------------------------------------------------------------------------
// KHỞI ĐỘNG SERVER
// --------------------------------------------------------------------------------

initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
});
