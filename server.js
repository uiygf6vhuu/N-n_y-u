const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Khởi động server...');

// Lưu trữ dữ liệu trong RAM (ĐỒNG BỘ)
let storage = {
    passwords: {
        sitePassword: '611181',
        adminPassword: '611181'
    },
    messages: [],
    loveImages: [], // Lưu nhiều URL ảnh
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

// 🔐 Middleware xác thực ĐƠN GIẢN (dùng password làm token)
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

const requireAdminAuth = requireAuth('adminPassword');
const requireSiteAuth = requireAuth('sitePassword');

// 🔐 API Đăng nhập Admin
app.post('/api/admin-login', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng nhập mật khẩu' 
            });
        }

        if (password === storage.passwords.adminPassword) {
            res.json({ 
                success: true, 
                message: 'Đăng nhập admin thành công' 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'Sai mật khẩu admin' 
            });
        }
    } catch (error) {
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
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng nhập mật khẩu' 
            });
        }

        if (password === storage.passwords.sitePassword) {
            res.json({ 
                success: true, 
                message: 'Mật khẩu đúng' 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: 'Sai mật khẩu' 
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🔐 API Lấy thông tin mật khẩu
app.get('/api/passwords', requireAdminAuth, (req, res) => {
    try {
        res.json({ 
            success: true, 
            ...storage.passwords 
        });
    } catch (error) {
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
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Mật khẩu phải có ít nhất 3 ký tự' 
            });
        }

        storage.passwords.sitePassword = newPassword;
        
        res.json({ 
            success: true, 
            message: 'Đã đổi mật khẩu trang chính thành công!' 
        });
    } catch (error) {
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
        
        if (!newPassword || newPassword.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Mật khẩu phải có ít nhất 3 ký tự' 
            });
        }

        storage.passwords.adminPassword = newPassword;
        
        res.json({ 
            success: true, 
            message: 'Đã đổi mật khẩu admin thành công!' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server: ' + error.message 
        });
    }
});

// 💌 API Tin nhắn
app.get('/api/messages', requireSiteAuth, (req, res) => {
    try {
        res.json({ 
            success: true,
            messages: storage.messages
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

app.post('/api/message', requireSiteAuth, (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Vui lòng điền đủ thông tin.' 
            });
        }

        storage.messages.push({
            content: message,
            timestamp: new Date()
        });

        // Giới hạn số lượng tin nhắn (lưu 50 tin nhắn gần nhất)
        if (storage.messages.length > 50) {
            storage.messages = storage.messages.slice(-50);
        }
        
        res.json({ 
            success: true, 
            message: 'Đã lưu tin nhắn thành công!' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🖼️ API Upload từ URL (ADMIN ONLY)
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL ảnh không được để trống' 
            });
        }

        storage.loveImages.push(imageUrl);
        
        res.json({ 
            success: true, 
            message: 'Đã thêm ảnh từ URL thành công!', 
            image: imageUrl 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🖼️ API Upload file (ADMIN ONLY)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: "Không có file nào được chọn" 
            });
        }

        const imagePath = '/uploads/' + req.file.filename;
        storage.loveImages.push(imagePath);
        
        res.json({ 
            success: true, 
            image: imagePath, 
            message: "Đã upload ảnh thành công!"
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message || "Lỗi khi upload ảnh" 
        });
    }
});

// 🖼️ API lấy DANH SÁCH ẢNH
app.get('/api/love-images', requireSiteAuth, (req, res) => {
    try {
        // Nếu không có ảnh, thêm ảnh mặc định (để tránh lỗi)
        if (storage.loveImages.length === 0) {
            storage.loveImages = [
                'https://picsum.photos/seed/love1/400/400',
                'https://picsum.photos/seed/love2/400/400',
                'https://picsum.photos/seed/love3/400/400'
            ];
        }
        
        res.json({ 
            success: true,
            images: storage.loveImages 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// Phục vụ file upload
app.use('/uploads', express.static(uploadsDir));

// 🎯 ROUTING CHÍNH (URL sạch)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index (5).html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin (2).html'));
});

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
            return res.status(400).json({ 
                success: false, 
                error: 'File quá lớn! Tối đa 5MB.' 
            });
        }
    }
    res.status(500).json({ 
        success: false, 
        error: 'Lỗi server: ' + error.message 
    });
});

// Route mặc định - 404
app.use((req, res) => {
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
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});
