const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Khởi động server...');

// TẮT MONGODB - SỬ DỤNG BỘ NHỚ TRONG RAM
console.log('🗄️ Chế độ không database - sử dụng bộ nhớ RAM');

// Lưu trữ dữ liệu trong RAM
let storage = {
    passwords: {
        sitePassword: '611181',
        adminPassword: '611181'
    },
    messages: [],
    loveImage: null,
    gameScores: []
};

// Middleware cơ bản
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Đã tạo thư mục uploads');
}

// Cấu hình multer đơn giản
const storageConfig = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storageConfig,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được upload file ảnh!'), false);
        }
    }
});

// 🔐 Middleware xác thực ĐƠN GIẢN
const requireAuth = (passwordType) => (req, res, next) => {
    try {
        const password = req.headers['authorization'];
        
        if (!password) {
            console.log(`❌ Thiếu mật khẩu cho ${passwordType}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Thiếu mật khẩu xác thực' 
            });
        }

        const correctPassword = storage.passwords[passwordType];
        
        if (password === correctPassword) {
            console.log(`✅ Xác thực ${passwordType} thành công`);
            next();
        } else {
            console.log(`❌ Mật khẩu ${passwordType} không đúng`);
            res.status(401).json({ 
                success: false, 
                error: 'Mật khẩu không hợp lệ' 
            });
        }
    } catch (error) {
        console.error('❌ Lỗi xác thực:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server trong quá trình xác thực' 
        });
    }
};

// Middleware cho admin (luôn cho phép truy cập)
const requireAdminAuth = (req, res, next) => {
    console.log('🔓 Truy cập admin');
    next();
};

const requireSiteAuth = requireAuth('sitePassword');

// 🔐 API Đăng nhập Admin
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        console.log('🔐 Yêu cầu đăng nhập admin');
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng nhập mật khẩu' 
            });
        }

        if (password === storage.passwords.adminPassword) {
            console.log('✅ Đăng nhập admin thành công');
            res.json({ 
                success: true, 
                message: 'Đăng nhập admin thành công' 
            });
        } else {
            console.log('❌ Sai mật khẩu admin');
            res.status(401).json({ 
                success: false, 
                error: 'Sai mật khẩu admin' 
            });
        }
    } catch (error) {
        console.error('❌ Lỗi đăng nhập admin:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🔐 API Kiểm tra mật khẩu trang chính
app.post('/api/check-password', async (req, res) => {
    try {
        const { password } = req.body;
        console.log('🔐 Yêu cầu kiểm tra mật khẩu site');
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng nhập mật khẩu' 
            });
        }

        if (password === storage.passwords.sitePassword) {
            console.log('✅ Mật khẩu site đúng');
            res.json({ 
                success: true, 
                message: 'Mật khẩu đúng' 
            });
        } else {
            console.log('❌ Sai mật khẩu site');
            res.status(401).json({ 
                success: false, 
                error: 'Sai mật khẩu' 
            });
        }
    } catch (error) {
        console.error('❌ Lỗi kiểm tra mật khẩu:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🔐 API Lấy thông tin mật khẩu
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    try {
        console.log('🔐 Yêu cầu lấy thông tin mật khẩu');
        res.json({ 
            success: true, 
            ...storage.passwords 
        });
    } catch (error) {
        console.error('❌ Lỗi lấy mật khẩu:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🔐 API Đổi mật khẩu trang chính
app.post('/api/change-site-password', requireAdminAuth, (req, res) => {
    try {
        const { newPassword } = req.body;
        console.log('🔄 Yêu cầu đổi mật khẩu site');
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Mật khẩu phải có ít nhất 3 ký tự' 
            });
        }

        storage.passwords.sitePassword = newPassword;
        
        console.log('✅ Đã đổi mật khẩu site thành công');
        res.json({ 
            success: true, 
            message: 'Đã đổi mật khẩu trang chính thành công!' 
        });
    } catch (error) {
        console.error('❌ Lỗi đổi mật khẩu site:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// 🔐 API Đổi mật khẩu admin
app.post('/api/change-admin-password', requireAdminAuth, (req, res) => {
    try {
        const { newPassword } = req.body;
        console.log('🔄 Yêu cầu đổi mật khẩu admin');
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Mật khẩu phải có ít nhất 3 ký tự' 
            });
        }

        storage.passwords.adminPassword = newPassword;
        
        console.log('✅ Đã đổi mật khẩu admin thành công');
        res.json({ 
            success: true, 
            message: 'Đã đổi mật khẩu admin thành công!' 
        });
    } catch (error) {
        console.error('❌ Lỗi đổi mật khẩu admin:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// 💌 API Tin nhắn
app.get('/api/messages', requireSiteAuth, (req, res) => {
    try {
        console.log('💌 Yêu cầu lấy tin nhắn');
        
        res.json({ 
            success: true,
            messages: storage.messages.map(msg => `${msg.date}: ${msg.content}`) 
        });
    } catch (error) {
        console.error('❌ Lỗi lấy tin nhắn:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

app.post('/api/message', requireSiteAuth, (req, res) => {
    try {
        const { date, message } = req.body;
        console.log('💌 Yêu cầu gửi tin nhắn:', date);
        
        if (!message || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng điền đủ thông tin.' 
            });
        }

        storage.messages.push({
            content: message,
            date: date,
            timestamp: new Date()
        });

        // Giới hạn số lượng tin nhắn (lưu 50 tin nhắn gần nhất)
        if (storage.messages.length > 50) {
            storage.messages = storage.messages.slice(-50);
        }
        
        console.log('✅ Đã lưu tin nhắn thành công');
        res.json({ 
            success: true, 
            message: 'Đã lưu tin nhắn thành công!' 
        });
    } catch (error) {
        console.error('❌ Lỗi gửi tin nhắn:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🖼️ API Upload từ URL
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    try {
        const { imageUrl } = req.body;
        console.log('🖼️ Yêu cầu upload URL ảnh');
        
        if (!imageUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL ảnh không được để trống' 
            });
        }

        storage.loveImage = imageUrl;
        
        console.log('✅ Đã lưu ảnh từ URL thành công');
        res.json({ 
            success: true, 
            message: 'Đã lưu ảnh từ URL thành công!', 
            image: imageUrl 
        });
    } catch (error) {
        console.error('❌ Lỗi upload URL ảnh:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🖼️ API Upload file
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    try {
        console.log('🖼️ Yêu cầu upload file ảnh');
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: "Không có file nào được chọn" 
            });
        }

        const imagePath = '/uploads/' + req.file.filename;
        storage.loveImage = imagePath;
        
        console.log('✅ Đã upload ảnh từ file thành công:', imagePath);
        res.json({ 
            success: true, 
            image: imagePath, 
            message: "Đã upload ảnh thành công!"
        });
    } catch (error) {
        console.error('❌ Lỗi upload file ảnh:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message || "Lỗi khi upload ảnh" 
        });
    }
});

// 🖼️ API lấy ảnh
app.get('/api/love-image', requireSiteAuth, (req, res) => {
    try {
        console.log('🖼️ Yêu cầu lấy ảnh');
        
        res.json({ 
            success: true,
            image: storage.loveImage || '' 
        });
    } catch (error) {
        console.error('❌ Lỗi lấy ảnh:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🎮 API Game scores
app.get('/api/game-scores', requireSiteAuth, (req, res) => {
    try {
        console.log('🎮 Yêu cầu lấy điểm game');
        
        res.json({ 
            success: true, 
            scores: storage.gameScores.sort((a, b) => b.score - a.score).slice(0, 10)
        });
    } catch (error) {
        console.error('❌ Lỗi lấy điểm game:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

app.post('/api/game-score', requireSiteAuth, (req, res) => {
    try {
        const { score, level, clicksPerMinute, playerName } = req.body;
        console.log('🎮 Yêu cầu lưu điểm game:', score);
        
        storage.gameScores.push({
            score: parseInt(score),
            level: parseInt(level),
            clicksPerMinute: parseInt(clicksPerMinute),
            playerName: playerName || 'Người chơi bí mật',
            timestamp: new Date()
        });

        // Giới hạn số lượng điểm (lưu 100 điểm gần nhất)
        if (storage.gameScores.length > 100) {
            storage.gameScores = storage.gameScores.slice(-100);
        }
        
        res.json({ 
            success: true, 
            message: 'Đã lưu điểm!' 
        });
    } catch (error) {
        console.error('❌ Lỗi lưu điểm game:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// Phục vụ file upload
app.use('/uploads', express.static(uploadsDir));

// 🎯 ROUTING CHÍNH
app.get('/', (req, res) => {
    console.log('🏠 Truy cập trang chính');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    console.log('⚙️ Truy cập trang admin');
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/game', (req, res) => {
    console.log('🎮 Truy cập trang game');
    res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/tym1', (req, res) => {
    console.log('💖 Truy cập trang tym1');
    res.sendFile(path.join(__dirname, 'index_tym1.html'));
});

app.get('/tym2', (req, res) => {
    console.log('💖 Truy cập trang tym2');
    res.sendFile(path.join(__dirname, 'index_tym2.html'));
});

app.get('/tym3', (req, res) => {
    console.log('💖 Truy cập trang tym3');
    res.sendFile(path.join(__dirname, 'index_tym3.html'));
});

// Xử lý lỗi upload
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                error: 'File quá lớn! Tối đa 5MB.' 
            });
        }
    }
    console.error('❌ Lỗi upload:', error.message);
    res.status(500).json({ 
        success: false, 
        error: 'Lỗi server: ' + error.message 
    });
});

// Route mặc định - 404
app.use((req, res) => {
    console.log('❓ Truy cập trang không tồn tại:', req.url);
    res.status(404).json({ 
        success: false, 
        error: 'Trang không tồn tại' 
    });
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`🔗 Truy cập: http://localhost:${PORT}`);
    console.log('💾 Chế độ: Lưu trữ bộ nhớ RAM (không cần database)');
    console.log('🔐 Mật khẩu mặc định: 611181');
});

// Xử lý tắt server
process.on('SIGINT', () => {
    console.log('🛑 Đang tắt server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Server bị tắt bởi hệ thống...');
    process.exit(0);
});
