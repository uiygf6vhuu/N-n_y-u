const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Khởi động server...');

// Lưu trữ dữ liệu trong RAM (ĐỒNG BỘ)
let storage = {
    // THAY ĐỔI LỚN: Tài khoản cố định
    accounts: {}, // SẼ LÀ MẢNG RỖNG BAN ĐẦU, CHỜ ĐĂNG KÝ
    admin: { password: '611181', authKey: 'admin_key' },
    messages: [], // Dòng tin nhắn chung
    loveImages: [], // Lưu nhiều URL ảnh
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

// 🔐 Middleware xác thực (Dùng AUTH KEY)
const requireAuth = (req, res, next) => {
    try {
        const authKey = req.headers['authorization'];
        
        if (!authKey) {
            return res.status(401).json({ success: false, error: 'Thiếu hoặc sai khóa xác thực' });
        }

        let user = null;
        if (authKey === storage.admin.authKey) {
            user = { name: 'Admin', authKey: storage.admin.authKey, isAdmin: true };
        } else if (storage.accounts.owner && authKey === storage.accounts.owner.authKey) {
            user = storage.accounts.owner;
        } else if (storage.accounts.lover && authKey === storage.accounts.lover.authKey) {
            user = storage.accounts.lover;
        } else {
            return res.status(401).json({ success: false, error: 'Khóa xác thực không hợp lệ' });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server trong quá trình xác thực' });
    }
};

const requireAdminAuth = (req, res, next) => {
    const authKey = req.headers['authorization'];
    if (authKey === storage.admin.authKey) {
        req.user = { name: 'Admin', authKey: storage.admin.authKey };
        next();
    } else {
        res.status(401).json({ success: false, error: 'Chỉ Admin được truy cập' });
    }
};

// 💖 API Ping (Cơ chế Heartbeat)
app.post('/api/ping', requireAuth, (req, res) => {
    if (req.user.authKey === storage.accounts.owner.authKey) {
        storage.accounts.owner.lastActive = new Date();
    } else if (req.user.authKey === storage.accounts.lover.authKey) {
        storage.accounts.lover.lastActive = new Date();
    }
    res.json({ success: true, timestamp: new Date() });
});

// 💖 API Lấy trạng thái Online của người yêu
app.get('/api/online-status', requireAuth, (req, res) => {
    try {
        if (!storage.accounts.owner || !storage.accounts.lover) {
            return res.json({ success: true, isOnline: false, otherUserName: 'Chưa Đăng Ký' });
        }
        
        const isOwner = req.user.authKey === storage.accounts.owner.authKey;
        const otherAccount = isOwner ? storage.accounts.lover : storage.accounts.owner;
        
        const now = new Date();
        const lastActiveTime = new Date(otherAccount.lastActive);
        
        const isOnline = (now - lastActiveTime) < 30000; 

        res.json({
            success: true,
            isOnline: isOnline,
            otherUserName: otherAccount.name
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});


// 🔐 API Đăng ký Cặp Tài khoản (Owner/Lover)
app.post('/api/register', async (req, res) => {
    try {
        const { ownerName, ownerPassword, loverName, loverPassword, adminPassword } = req.body;

        if (storage.accounts.owner || storage.accounts.lover) {
            return res.status(400).json({ success: false, error: 'Tài khoản Owner/Lover đã tồn tại. Vui lòng đăng nhập.' });
        }
        if (adminPassword !== storage.admin.password) {
            return res.status(401).json({ success: false, error: 'Mật khẩu Admin không đúng.' });
        }

        // Tạo Auth Key và lưu vào Server
        storage.accounts.owner = { name: ownerName, password: ownerPassword, authKey: 'owner_' + Date.now(), lastActive: new Date(0) };
        storage.accounts.lover = { name: loverName, password: loverPassword, authKey: 'lover_' + Date.now(), lastActive: new Date(0) };
        
        return res.json({ success: true, message: 'Đăng ký cặp tài khoản thành công. Vui lòng đăng nhập lại.' });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// 🔐 API Đăng nhập Chung (Owner, Lover, Admin)
app.post('/api/login', async (req, res) => {
    try {
        const { name, password } = req.body;
        
        if (!name || !password) {
            return res.status(400).json({ success: false, error: 'Vui lòng nhập Tên và Mật khẩu' });
        }

        let user = null;
        
        if (name === 'Admin' && password === storage.admin.password) {
             user = { name: 'Admin', authKey: storage.admin.authKey, isAdmin: true };
        } else if (storage.accounts.owner && name === storage.accounts.owner.name && password === storage.accounts.owner.password) {
            user = storage.accounts.owner;
        } else if (storage.accounts.lover && name === storage.accounts.lover.name && password === storage.accounts.lover.password) {
            user = storage.accounts.lover;
        } else {
            return res.status(401).json({ success: false, error: 'Sai Tên hoặc Mật khẩu' });
        }
        
        // Cập nhật lastActive chỉ cho Owner/Lover
        if (!user.isAdmin) {
            const accountType = user.authKey.split('_')[0];
            storage.accounts[accountType].lastActive = new Date();
        }
        
        res.json({ 
            success: true, 
            authKey: user.authKey, 
            userName: user.name,
            isAdmin: !!user.isAdmin
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});


// 5. ⚙️ API Lấy cấu trúc tài khoản (ĐỂ CLIENT TỰ XỬ LÝ)
app.get('/api/account-structure', (req, res) => {
    const isRegistered = !!storage.accounts.owner;
    res.json({ 
        success: true, 
        isRegistered: isRegistered,
        ownerName: isRegistered ? storage.accounts.owner.name : null,
        loverName: isRegistered ? storage.accounts.lover.name : null,
        adminPassword: storage.admin.password,
        accounts: storage.accounts 
    });
});

// ⚙️ API Cập nhật thông tin tài khoản (Dùng Admin Auth)
app.post('/api/update-account', requireAdminAuth, (req, res) => {
    try {
        const { accountType, name, password } = req.body; // accountType: 'owner' hoặc 'lover'
        
        if (!accountType || !storage.accounts[accountType]) {
            return res.status(400).json({ success: false, error: 'Loại tài khoản không hợp lệ' });
        }
        
        if (name) {
            storage.accounts[accountType].name = name;
        }
        if (password) {
            storage.accounts[accountType].password = password;
        }
        
        res.json({ 
            success: true, 
            message: `Thông tin tài khoản ${accountType} đã được cập nhật!` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// 💌 API Lấy tin nhắn (Dùng User Auth)
app.get('/api/messages', requireAuth, (req, res) => {
    try {
        res.json({ success: true, messages: storage.messages });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// 💌 API Gửi tin nhắn (Dùng User Auth)
app.post('/api/message', requireAuth, (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, error: 'Vui lòng điền đủ thông tin.' });
        }
        
        storage.messages.push({
            sender: req.user.name,
            content: message,
            timestamp: new Date()
        });

        if (storage.messages.length > 50) {
            storage.messages = storage.messages.slice(-50);
        }
        
        res.json({ success: true, message: 'Đã lưu tin nhắn thành công!' });
        
    } catch (error) {
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// 🖼️ API Upload từ URL (ADMIN ONLY)
app.post('/api/upload-url', requireAdminAuth, (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, error: 'URL ảnh không được để trống' });
    storage.loveImages.push(imageUrl);
    res.json({ success: true, message: 'Đã thêm ảnh từ URL thành công!', image: imageUrl });
});

// 🖼️ API Upload file (ADMIN ONLY)
app.post('/api/upload-file', requireAdminAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: "Không có file nào được chọn" });
    const imagePath = '/uploads/' + req.file.filename;
    storage.loveImages.push(imagePath);
    res.json({ success: true, image: imagePath, message: "Đã upload ảnh thành công!"});
});

// 🖼️ API lấy DANH SÁCH ẢNH
app.get('/api/love-images', requireAuth, (req, res) => {
    if (storage.loveImages.length === 0) {
        storage.loveImages = [
            'https://picsum.photos/seed/love1/400/400',
            'https://picsum.photos/seed/love2/400/400',
            'https://picsum.photos/seed/love3/400/400'
        ];
    }
    res.json({ success: true, images: storage.loveImages });
});

// Phục vụ file upload
app.use('/uploads', express.static(uploadsDir));

// 🎯 ROUTING CHÍNH (Đã sửa để khớp tên file)
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// URL /auth trỏ đến file admin (2).html
app.get('/auth', (req, res) => { res.sendFile(path.join(__dirname, 'admin.html')); }); 

app.get('/tym1', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'index_tym1.html')); }); 
app.get('/tym2', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'index_tym2.html')); }); 
app.get('/tym3', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'index_tym3.html')); }); 

// Xử lý lỗi upload và 404
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File quá lớn! Tối đa 5MB.' });
    }
    res.status(500).json({ success: false, error: 'Lỗi server: ' + error.message });
});
app.use((req, res) => { res.status(404).json({ success: false, error: 'Trang không tồn tại' }); });

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy trên port ${PORT}`);
    console.log(`🔗 Truy cập: http://localhost:${PORT}`);
    console.log('💾 Chế độ: Lưu trữ bộ nhớ RAM (không cần database)');
    console.log('🔐 Tài khoản mặc định: Admin(611181). Owner/Lover CHƯA ĐĂNG KÝ.');
});

// Xử lý tắt server
process.on('SIGINT', () => { process.exit(0); });
process.on('SIGTERM', () => { process.exit(0); });
