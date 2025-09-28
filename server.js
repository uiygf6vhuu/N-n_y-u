const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Kết nối MongoDB đơn giản
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lovewebsite';

// Kết nối MongoDB với xử lý lỗi tốt hơn
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ Đã kết nối MongoDB thành công'))
.catch(err => {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    console.log('🔄 Sử dụng cơ sở dữ liệu tạm thời...');
});

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

// Cấu hình multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
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
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Chỉ được upload file ảnh!'), false);
    }
});

// 🔐 Hàm đọc mật khẩu từ database (ĐÃ SỬA)
async function readPasswords() {
    try {
        let passwords = await Password.findOne();
        if (!passwords) {
            passwords = new Password({ sitePassword: '611181', adminPassword: '611181' });
            await passwords.save();
            console.log('✅ Đã tạo mật khẩu mặc định');
        }
        return passwords;
    } catch (error) {
        console.log('⚠️ Sử dụng mật khẩu mặc định do lỗi database');
        return { sitePassword: '611181', adminPassword: '611181' };
    }
}

// 🔐 Middleware xác thực ĐƠN GIẢN (ĐÃ SỬA)
const requireAuth = (passwordType) => async (req, res, next) => {
    try {
        const password = req.headers['authorization'];
        console.log(`🔐 Xác thực ${passwordType}:`, password ? 'Có mật khẩu' : 'Không có mật khẩu');
        
        const passwords = await readPasswords();
        const correctPassword = passwords[passwordType];
        
        if (password === correctPassword) {
            next();
        } else {
            console.log(`❌ Mật khẩu sai: Nhập "${password}", Đúng phải là "${correctPassword}"`);
            res.status(401).json({ error: 'Mật khẩu không hợp lệ' });
        }
    } catch (error) {
        console.error('❌ Lỗi xác thực:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
};

// Middleware đơn giản cho admin
const requireAdminAuth = (req, res, next) => {
    next(); // Tạm thời bỏ qua xác thực admin
};

const requireSiteAuth = requireAuth('sitePassword');

// 🔐 API Đăng nhập Admin (ĐÃ SỬA)
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        const passwords = await readPasswords();
        
        if (password === passwords.adminPassword) {
            res.json({ success: true, message: 'Đăng nhập admin thành công' });
        } else {
            res.status(401).json({ success: false, error: 'Sai mật khẩu admin' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Kiểm tra mật khẩu trang chính (ĐÃ SỬA)
app.post('/api/check-password', async (req, res) => {
    try {
        const { password } = req.body;
        const passwords = await readPasswords();
        
        if (password === passwords.sitePassword) {
            res.json({ success: true, message: 'Mật khẩu đúng' });
        } else {
            res.status(401).json({ success: false, error: 'Sai mật khẩu' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Lấy thông tin mật khẩu (ĐÃ SỬA)
app.get('/api/passwords', requireAdminAuth, async (req, res) => {
    try {
        const passwords = await readPasswords();
        res.json(passwords);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Đổi mật khẩu trang chính (ĐÃ SỬA)
app.post('/api/change-site-password', requireAdminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        console.log('🔄 Đổi mật khẩu site:', newPassword);
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
        }
        
        let passwords = await Password.findOne();
        if (!passwords) passwords = new Password();
        
        passwords.sitePassword = newPassword;
        await passwords.save();
        
        console.log('✅ Đã đổi mật khẩu site thành công');
        res.json({ success: true, message: 'Đã đổi mật khẩu trang chính thành công!' });
    } catch (error) {
        console.error('❌ Lỗi đổi mật khẩu site:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🔐 API Đổi mật khẩu admin (ĐÃ SỬA)
app.post('/api/change-admin-password', requireAdminAuth, async (req, res) => {
    try {
        const { newPassword } = req.body;
        console.log('🔄 Đổi mật khẩu admin:', newPassword);
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 3 ký tự' });
        }
        
        let passwords = await Password.findOne();
        if (!passwords) passwords = new Password();
        
        passwords.adminPassword = newPassword;
        await passwords.save();
        
        console.log('✅ Đã đổi mật khẩu admin thành công');
        res.json({ success: true, message: 'Đã đổi mật khẩu admin thành công!' });
    } catch (error) {
        console.error('❌ Lỗi đổi mật khẩu admin:', error);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 💌 API Tin nhắn (ĐÃ SỬA)
app.get('/api/messages', requireSiteAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 }).limit(50);
        res.json({ 
            success: true,
            messages: messages.map(m => `${m.date}: ${m.content}`) 
        });
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

// 🖼️ API Upload từ URL (ĐÃ SỬA)
app.post('/api/upload-url', requireAdminAuth, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) return res.status(400).json({ error: 'URL ảnh không được để trống' });
        
        await LoveImage.deleteMany({});
        const newImage = new LoveImage({ imageUrl });
        await newImage.save();
        
        res.json({ success: true, message: 'Đã lưu ảnh từ URL thành công!', image: imageUrl });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🖼️ API Upload file (ĐÃ SỬA)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Không có file nào được chọn" });
        
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
            message: "Đã upload ảnh thành công!"
        });
    } catch (error) {
        res.status(500).json({ error: error.message || "Lỗi khi upload ảnh" });
    }
});

// 🖼️ API lấy ảnh (ĐÃ SỬA)
app.get('/api/love-image', requireSiteAuth, async (req, res) => {
    try {
        const image = await LoveImage.findOne().sort({ timestamp: -1 });
        res.json({ 
            success: true,
            image: image ? image.imageUrl : '' 
        });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// 🎮 API Game scores
app.get('/api/game-scores', requireSiteAuth, async (req, res) => {
    try {
        const scores = await GameScore.find().sort({ score: -1 }).limit(10);
        res.json({ success: true, scores });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

app.post('/api/game-score', requireSiteAuth, async (req, res) => {
    try {
        const { score, level, clicksPerMinute, playerName } = req.body;
        const newScore = new GameScore({ score, level, clicksPerMinute, playerName });
        await newScore.save();
        res.json({ success: true, message: 'Đã lưu điểm!' });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Phục vụ file upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🎯 ROUTING CHÍNH
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/game', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
app.get('/tym1', (req, res) => res.sendFile(path.join(__dirname, 'index_tym1.html')));
app.get('/tym2', (req, res) => res.sendFile(path.join(__dirname, 'index_tym2.html')));
app.get('/tym3', (req, res) => res.sendFile(path.join(__dirname, 'index_tym3.html')));

// Xử lý lỗi upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: 'File quá lớn! Tối đa 5MB.' });
    }
    next(error);
});

// Route mặc định
app.use((req, res) => {
    res.status(404).send('Trang không tồn tại');
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`🔗 Truy cập: http://localhost:${PORT}`);
});
