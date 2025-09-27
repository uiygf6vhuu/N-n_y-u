const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB từ Railway
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lovewebsite';

// 1. Khởi tạo kết nối Mongoose (KHÔNG CHẶN SERVER)
mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000, // Tăng thời gian chờ kết nối lên 30 giây
})
.then(() => console.log('✅ Đã khởi tạo kết nối MongoDB.')) 
.catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// Schema cho mật khẩu
const passwordSchema = new mongoose.Schema({
    sitePassword: { type: String, default: '611181' },
    adminPassword: { type: String, default: '611181' }
});
const Password = mongoose.model('Password', passwordSchema);

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
    content: String,
    date: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Schema cho ảnh
const imageSchema = new mongoose.Schema({
    imageUrl: String,
    filename: String,
    timestamp: { type: Date, default: Date.now }
});
const LoveImage = mongoose.model('LoveImage', imageSchema);

// Schema cho điểm game
const scoreSchema = new mongoose.Schema({
    playerName: String,
    score: Number,
    level: Number,
    clicksPerMinute: Number,
    timestamp: { type: Date, default: Date.now }
});
const GameScore = mongoose.model('GameScore', scoreSchema);

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

// 🔐 Hàm đọc mật khẩu từ database
async function readPasswords() {
    try {
        let passwords = await Password.findOne();
        if (!passwords) {
            passwords = new Password();
            await passwords.save();
        }
        return passwords;
    } catch (error) {
        console.error('Lỗi đọc mật khẩu từ database:', error);
        return { sitePassword: 'love', adminPassword: 'admin' };
    }
}

// Middleware xác thực (Site)
const requireAuth = (passwordType) => async (req, res, next) => {
    try {
        const password = req.headers['authorization'];
        const passwords = await readPasswords();
        
        if (password === passwords[passwordType]) {
            next();
        } else {
            res.status(401).json({ error: 'Mật khẩu không hợp lệ' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi xác thực' });
    }
};

// ❌ BỎ MẬT KHẨU ADMIN: Luôn cho phép truy cập
const requireAdminAuth = (req, res, next) => {
    next();
};

const requireSiteAuth = requireAuth('sitePassword');

// 🔐 API Đăng nhập Admin
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        const passwords = await readPasswords();
        
        if (password === passwords.adminPassword) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Sai mật khẩu' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Kiểm tra mật khẩu trang chính (Dùng cho index.html)
app.post('/api/check-password', async (req, res) => {
    try {
        const { password } = req.body;
        const passwords = await readPasswords();
        
        if (password === passwords.sitePassword) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: 'Sai mật khẩu' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Lấy thông tin mật khẩu
app.get('/api/passwords', requireAdminAuth, async (req, res) => {
    try {
        const passwords = await readPasswords();
        res.json(passwords);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Đổi mật khẩu trang chính
app.post('/api/change-site-password', requireAdminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
        }
        
        let passwords = await Password.findOne();
        if (!passwords) {
            passwords = new Password();
        }
        passwords.sitePassword = newPassword;
        await passwords.save();
        
        res.json({ success: true, message: 'Đã đổi mật khẩu trang chính thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Đổi mật khẩu admin
app.post('/api/change-admin-password', requireAdminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
        }
        
        let passwords = await Password.findOne();
        if (!passwords) {
            passwords = new Password();
        }
        passwords.adminPassword = newPassword;
        await passwords.save();
        
        res.json({ success: true, message: 'Đã đổi mật khẩu admin thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 💌 API Tin nhắn (Cần Site Auth)
app.get('/api/messages', requireSiteAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        res.json({ messages: messages.map(m => `[${m.date}] ${m.content}`) });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.post('/api/message', requireSiteAuth, async (req, res) => {
    try {
        const { date, message } = req.body;
        if (!message || !date) {
            return res.status(400).json({ error: 'Vui lòng điền đủ thông tin.' });
        }
        
        const newMessage = new Message({ content: message, date });
        await newMessage.save();
        
        res.json({ success: true, message: 'Đã lưu tin nhắn thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 💌 API Quản lý tin nhắn (admin)
app.get('/api/love-messages', requireAdminAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json({ messages: messages.map(m => m.content) });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.post('/api/love-messages', requireAdminAuth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Tin nhắn không được để trống' });
        }
        
        const newMessage = new Message({ 
            content: message, 
            date: new Date().toLocaleDateString('vi-VN') 
        });
        await newMessage.save();
        
        res.json({ success: true, message: 'Đã thêm tin nhắn thành công!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.delete('/api/messages', requireAdminAuth, async (req, res) => {
    try {
        await Message.deleteMany({});
        res.json({ success: true, message: 'Đã xóa toàn bộ tin nhắn.' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🖼️ API Upload từ URL
app.post('/api/upload-url', requireAdminAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ error: 'URL ảnh không được để trống' });
        }
        
        await LoveImage.deleteMany({});
        
        const newImage = new LoveImage({ imageUrl });
        await newImage.save();
        
        res.json({ success: true, message: 'Đã lưu ảnh từ URL thành công!', image: imageUrl });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🖼️ API Upload file
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Không có file nào được chọn" });
        }
        
        const imagePath = '/uploads/' + req.file.filename;
        
        await LoveImage.deleteMany({});
        
        const newImage = new LoveImage({ 
            imageUrl: imagePath,
            filename: req.file.filename
        });
        await newImage.save();
        
        res.json({ 
            success: true, 
            image: imagePath, 
            message: "Đã upload ảnh thành công!",
            filename: req.file.filename
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || "Lỗi khi upload ảnh" });
    }
});

// 🖼️ API lấy ảnh
app.get('/api/love-image', requireSiteAuth, async (req, res) => {
    try {
        const image = await LoveImage.findOne().sort({ timestamp: -1 });
        res.json({ image: image ? image.imageUrl : '' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🎮 API Game - Lưu điểm số
app.post('/api/game-score', requireSiteAuth, async (req, res) => {
    try {
        const { score, level, clicksPerMinute, playerName = 'Người chơi' } = req.body;
        
        const newScore = new GameScore({
            playerName,
            score,
            level,
            clicksPerMinute,
            timestamp: new Date()
        });
        
        await newScore.save();
        res.json({ success: true, message: 'Đã lưu điểm số!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🎮 API Game - Lấy bảng xếp hạng
app.get('/api/game-scores', requireSiteAuth, async (req, res) => {
    try {
        const scores = await GameScore.find().sort({ score: -1 }).limit(10);
        res.json({ scores });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
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

// Tuyến đường cho các trang kỷ niệm
app.get('/tym1', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym1.html'));
});

app.get('/tym2', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym2.html'));
});

app.get('/tym3', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_tym3.html'));
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

// 2. CHỈNH SỬA CUỐI CÙNG: Buộc server chờ kết nối DB
const startServer = async () => {
    // Chờ Mongoose báo hiệu kết nối DB đã mở thành công
    await mongoose.connection.once('open', async () => {
        console.log("MongoDB đã sẵn sàng. Khởi động Server...");
        
        // Server lắng nghe request chỉ sau khi DB đã sẵn sàng
        app.listen(PORT, () => {
            console.log(`🚀 Server đang chạy trên port ${PORT}`);
            console.log(`🔗 Truy cập: http://localhost:${PORT}`);
            console.log(`🗄️ Database: ${MONGODB_URI}`);
        });
    });
    
    // Nếu kết nối bị lỗi trong quá trình chạy
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error (Event):', err);
    });
};

startServer();
