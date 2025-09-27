const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Phục vụ file tĩnh ngay trong thư mục gốc
app.use(express.static(__dirname));

// Route chính
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API trả về quotes tình yêu
app.get('/api/love-quotes', (req, res) => {
    const quotes = [
        "Tình yêu không phải là tìm thấy người hoàn hảo, mà là nhìn thấy sự hoàn hảo trong một người không hoàn hảo.",
        "Yêu là khi ánh mắt em trở thành nhà của trái tim anh.",
        "Tình yêu đích thực là khi bạn tìm thấy một nửa của mình mà bạn chưa từng biết là mình đang thiếu.",
        "Trong ánh mắt em, anh tìm thấy cả bầu trời sao lấp lánh.",
        "Tình yêu không cần phải hoàn hảo, nó chỉ cần chân thành."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    res.json({ quote: randomQuote });
});

// Bộ nhớ tạm để lưu tin nhắn yêu thương
let loveMessages = [];

// API lưu tin nhắn
app.post('/api/love-messages', (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
        return res.status(400).json({ error: "Tin nhắn không hợp lệ" });
    }
    loveMessages.push(message);
    res.json({ success: true, message: "Đã lưu tin nhắn yêu thương 💌" });
});

// API lấy danh sách tin nhắn
app.get('/api/love-messages', (req, res) => {
    res.json({ messages: loveMessages });
});

app.listen(PORT, () => {
    console.log(`🚀 Server love đang chạy trên port ${PORT}`);
    console.log(`💝 Truy cập: http://localhost:${PORT}`);
});
