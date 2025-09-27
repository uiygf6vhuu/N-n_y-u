const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Phục vụ file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Route chính
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

app.listen(PORT, () => {
    console.log(`🚀 Server love đang chạy trên port ${PORT}`);
    console.log(`💝 Truy cập: http://localhost:${PORT}`);
});