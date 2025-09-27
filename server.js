<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Admin - Trang Quản Trị Bí Mật 🔒</title>
    <link rel="stylesheet" href="style.css">
    <style>
        .admin-section {
            background: rgba(255, 255, 255, 0.95);
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            border: 2px solid #ff6b6b;
        }
        .login-box {
            text-align: center;
            max-width: 400px;
            margin: 50px auto;
        }
        .password-input {
            font-size: 1.2em;
            padding: 12px;
            width: 100%;
            margin: 15px 0;
        }
        .upload-options {
            display: flex;
            gap: 20px;
            margin: 20px 0;
        }
        .upload-option {
            flex: 1;
            padding: 20px;
            border: 2px dashed #ff6b6b;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .upload-option:hover {
            background: rgba(255, 107, 107, 0.1);
        }
        .upload-option.active {
            background: rgba(255, 107, 107, 0.2);
            border-style: solid;
        }
        #fileInput {
            display: none;
        }
        .file-info {
            margin-top: 10px;
            font-size: 0.9em;
            color: #666;
        }
        .current-image {
            max-width: 200px;
            border-radius: 10px;
            margin: 10px 0;
        }
        .password-section {
            background: linear-gradient(45deg, #ff9ff3, #f368e0);
            color: white;
        }
        .password-section h2 {
            color: white;
        }
        .password-form {
            display: grid;
            gap: 15px;
            margin-top: 20px;
        }
        .password-field {
            display: flex;
            flex-direction: column;
        }
        .password-field label {
            margin-bottom: 5px;
            font-weight: bold;
        }
        .current-password-display {
            background: #fff;
            color: #333;
            padding: 10px;
            border-radius: 5px;
            font-weight: normal;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div id="loginScreen" class="login-box">
            <h1>🔒 Trang Quản Trị Bí Mật</h1>
            <p>Vui lòng nhập mật khẩu admin:</p>
            <input type="password" id="adminPassword" class="password-input" placeholder="Nhập mật khẩu admin">
            <button onclick="login()" class="btn" style="width: 100%;">🔑 Đăng Nhập</button>
        </div>

        <div id="adminContent" style="display: none;">
            <h1>👑 Trang Quản Trị Bí Mật</h1>
            
            <div class="admin-section password-section">
                <h2>🔐 Quản Lý Mật Khẩu</h2>
                <p>Thay đổi mật khẩu truy cập các trang</p>
                
                <div class="password-form">
                    
                    <div class="password-field">
                        <label>🔒 Mật Khẩu Trang Chính Hiện Tại:</label>
                        <div id="currentSitePassword" class="current-password-display"></div>
                        <label>🔄 Đổi Mật Khẩu Trang Chính Mới</label>
                        <input type="password" id="newSitePassword" class="date-input" 
                               placeholder="Nhập mật khẩu mới cho trang chính">
                        <button onclick="changeSitePassword()" class="btn" style="margin-top: 10px;">
                            💾 Lưu Mật Khẩu Trang Chính
                        </button>
                    </div>
                    
                    <div class="password-field">
                        <label>🔑 Mật Khẩu Admin Hiện Tại:</label>
                        <div id="currentAdminPasswordDisplay" class="current-password-display"></div>
                        <label>🔒 Đổi Mật Khẩu Admin Mới</label>
                        <input type="password" id="newAdminPassword" class="date-input" 
                               placeholder="Nhập mật khẩu admin mới">
                        <button onclick="changeAdminPassword()" class="btn" style="margin-top: 10px;">
                            🔑 Lưu Mật Khẩu Admin
                        </button>
                    </div>
                </div>
                
                <div id="passwordMessage" style="margin-top: 15px; font-weight: bold;"></div>
            </div>

            <div class="admin-section">
                <h2>📷 Ảnh Hiện Tại</h2>
                <div id="currentImageContainer">
                    <div id="noCurrentImage">Chưa có ảnh nào</div>
                    <img id="currentImage" class="current-image" style="display:none;">
                </div>
            </div>

            <div class="admin-section">
                <h2>📤 Upload Ảnh Mới</h2>
                
                <div class="upload-options">
                    <div class="upload-option active" onclick="switchUploadMode('url', this)">
                        <h3>🌐 URL Ảnh</h3>
                        <p>Dán link ảnh từ internet</p>
                    </div>
                    <div class="upload-option" onclick="switchUploadMode('file', this)">
                        <h3>📁 File từ máy</h3>
                        <p>Tải ảnh từ thiết bị (Tối đa 5MB)</p>
                    </div>
                </div>

                <div id="urlUpload" class="upload-mode">
                    <input type="text" id="imageUrl" class="date-input" 
                           placeholder="Dán URL ảnh (ví dụ: https://i.imgur.com/abc123.jpg)">
                    <button onclick="uploadImageUrl()" class="btn">🖼️ Upload từ URL</button>
                </div>

                <div id="fileUpload" class="upload-mode" style="display:none;">
                    <input type="file" id="fileInput" accept="image/*">
                    <label for="fileInput" class="btn" style="cursor: pointer;">📁 Chọn Ảnh</label>
                    <button onclick="uploadImageFile()" class="btn">📤 Upload File</button>
                    <div id="fileInfo" class="file-info"></div>
                </div>
            </div>

            <div class="admin-section">
                <h2>💌 Thêm Tin Nhắn Mới</h2>
                <textarea id="newMessage" class="message-input" 
                          placeholder="Nhập tin nhắn yêu thương..."></textarea>
                <button onclick="addMessage()" class="btn">💝 Gửi Tin Nhắn</button>
            </div>

            <div class="admin-section">
                <h2>📋 Tin Nhắn Hiện Tại</h2>
                <div id="currentMessages"></div>
            </div>

            <div class="navigation" style="text-align: center; margin-top: 30px;">
                <a href="/" class="btn">🏠 Về Trang Chính</a>
                <a href="/game" class="btn">🎮 Chơi Game</a>
                <button onclick="logout()" class="btn" style="background: #ff4757;">🚪 Đăng Xuất</button>
            </div>
        </div>
    </div>

    <script>
        let isAuthenticated = false;
        let adminPassword = '';
        let currentUploadMode = 'url';

        async function login() {
            const password = document.getElementById('adminPassword').value;
            if (!password) return alert('Vui lòng nhập mật khẩu!');

            try {
                const response = await fetch('/api/admin-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();
                
                if (data.success) {
                    isAuthenticated = true;
                    adminPassword = password;
                    document.getElementById('loginScreen').style.display = 'none';
                    document.getElementById('adminContent').style.display = 'block';
                    loadCurrentData();
                    loadCurrentPasswords(); // Tải mật khẩu ngay sau khi đăng nhập
                } else {
                    alert('Sai mật khẩu! Vui lòng thử lại.');
                }
            } catch (error) {
                alert('Lỗi kết nối! Vui lòng thử lại.');
            }
        }
        
        async function loadCurrentPasswords() {
            if (!isAuthenticated) return;
            try {
                const response = await fetch('/api/passwords', {
                    headers: { 'Authorization': adminPassword }
                });
                const data = await response.json();
                
                document.getElementById('currentSitePassword').textContent = data.sitePassword;
                document.getElementById('currentAdminPasswordDisplay').textContent = data.adminPassword;
                
            } catch (error) {
                console.error('Lỗi tải mật khẩu:', error);
                showPasswordMessage('Lỗi tải thông tin mật khẩu!', 'error');
            }
        }

        async function changeSitePassword() {
            if (!isAuthenticated) return login();
            
            const newPassword = document.getElementById('newSitePassword').value.trim();
            if (!newPassword || newPassword.length < 3) {
                showPasswordMessage('Mật khẩu trang chính phải có ít nhất 3 ký tự!', 'error');
                return;
            }

            try {
                const response = await fetch('/api/change-site-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': adminPassword
                    },
                    body: JSON.stringify({ newPassword })
                });

                const data = await response.json();
                if (response.ok) {
                    showPasswordMessage(data.message, 'success');
                    document.getElementById('newSitePassword').value = '';
                    loadCurrentPasswords(); // Cập nhật hiển thị mật khẩu mới
                } else {
                    showPasswordMessage(data.error || 'Lỗi khi đổi mật khẩu trang chính', 'error');
                }
            } catch (error) {
                showPasswordMessage('Lỗi kết nối!', 'error');
            }
        }

        async function changeAdminPassword() {
            if (!isAuthenticated) return login();
            
            const newPassword = document.getElementById('newAdminPassword').value.trim();
            
            if (!newPassword || newPassword.length < 3) {
                showPasswordMessage('Mật khẩu admin mới phải có ít nhất 3 ký tự!', 'error');
                return;
            }

            try {
                const response = await fetch('/api/change-admin-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': adminPassword // Sử dụng mật khẩu cũ để xác thực
                    },
                    body: JSON.stringify({ newPassword })
                });

                const data = await response.json();
                if (response.ok) {
                    showPasswordMessage(data.message, 'success');
                    document.getElementById('newAdminPassword').value = '';
                    
                    // Cập nhật mật khẩu admin hiện tại trong bộ nhớ
                    adminPassword = newPassword;
                    loadCurrentPasswords(); // Cập nhật hiển thị
                } else {
                    showPasswordMessage(data.error || 'Lỗi khi đổi mật khẩu admin', 'error');
                }
            } catch (error) {
                showPasswordMessage('Lỗi kết nối!', 'error');
            }
        }

        function showPasswordMessage(message, type) {
            const messageElement = document.getElementById('passwordMessage');
            messageElement.textContent = message;
            messageElement.style.color = type === 'success' ? '#2ed573' : '#ff4757';
            
            setTimeout(() => {
                messageElement.textContent = '';
            }, 5000);
        }

        function switchUploadMode(mode, element) {
            currentUploadMode = mode;
            
            document.querySelectorAll('.upload-option').forEach(opt => {
                opt.classList.remove('active');
            });
            element.classList.add('active');
            
            document.getElementById('urlUpload').style.display = mode === 'url' ? 'block' : 'none';
            document.getElementById('fileUpload').style.display = mode === 'file' ? 'block' : 'none';
        }

        document.getElementById('fileInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileInfo = document.getElementById('fileInfo');
                fileInfo.innerHTML = `
                    📄 Tên file: ${file.name}<br>
                    📏 Kích thước: ${(file.size / 1024 / 1024).toFixed(2)} MB<br>
                    🖼️ Loại: ${file.type}
                `;
            }
        });

        async function uploadImageUrl() {
            if (!isAuthenticated) return login();
            
            const imageUrl = document.getElementById('imageUrl').value.trim();
            if (!imageUrl) return alert('Vui lòng nhập URL ảnh!');

            try {
                const response = await fetch('/api/upload-url', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': adminPassword
                    },
                    body: JSON.stringify({ imageUrl })
                });

                const data = await response.json();
                if (response.ok) {
                    alert('✅ Đã upload ảnh từ URL thành công!');
                    document.getElementById('imageUrl').value = '';
                    loadCurrentData();
                } else {
                    alert('❌ ' + (data.error || 'Lỗi upload ảnh!'));
                }
            } catch (error) {
                alert('Lỗi kết nối!');
            }
        }

        async function uploadImageFile() {
            if (!isAuthenticated) return login();
            
            const fileInput = document.getElementById('fileInput');
            const file = fileInput.files[0];
            
            if (!file) return alert('Vui lòng chọn file ảnh!');
            
            // Lỗi kích thước sẽ được bắt bởi Multer ở server, nhưng kiểm tra trước ở client là tốt
            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn! Tối đa 5MB.');
                return;
            }

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/upload-file', {
                    method: 'POST',
                    headers: { 
                        'Authorization': adminPassword
                    },
                    body: formData
                });

                const data = await response.json();
                if (response.ok) {
                    alert('✅ Đã upload ảnh từ file thành công!');
                    fileInput.value = '';
                    document.getElementById('fileInfo').innerHTML = '';
                    loadCurrentData();
                } else {
                    alert('❌ ' + (data.error || 'Lỗi upload ảnh!'));
                }
            } catch (error) {
                alert('Lỗi kết nối!');
            }
        }

        async function addMessage() {
            if (!isAuthenticated) return login();
            
            const message = document.getElementById('newMessage').value.trim();
            if (!message) return alert('Vui lòng nhập tin nhắn!');

            try {
                const response = await fetch('/api/love-messages', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': adminPassword
                    },
                    body: JSON.stringify({ message })
                });

                if (response.ok) {
                    alert('✅ Đã thêm tin nhắn thành công!');
                    document.getElementById('newMessage').value = '';
                    loadCurrentMessages();
                } else {
                    alert('❌ Lỗi khi thêm tin nhắn!');
                }
            } catch (error) {
                alert('Lỗi kết nối!');
            }
        }

        async function loadCurrentData() {
            await loadCurrentImage();
            await loadCurrentMessages();
        }

        async function loadCurrentImage() {
            try {
                // Admin cũng cần dùng mật khẩu admin để lấy ảnh
                const response = await fetch('/api/love-image', {
                    headers: { 'Authorization': adminPassword }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const currentImage = document.getElementById('currentImage');
                    const noCurrentImage = document.getElementById('noCurrentImage');
                    
                    if (data.image) {
                        currentImage.src = data.image;
                        currentImage.style.display = 'block';
                        noCurrentImage.style.display = 'none';
                    } else {
                        currentImage.style.display = 'none';
                        noCurrentImage.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('Lỗi tải ảnh:', error);
            }
        }

        async function loadCurrentMessages() {
            try {
                const response = await fetch('/api/love-messages', {
                    headers: { 'Authorization': adminPassword }
                });
                
                const data = await response.json();
                const container = document.getElementById('currentMessages');
                container.innerHTML = '';
                
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach((msg, index) => {
                        const div = document.createElement('div');
                        div.style.cssText = 'background: #f1f2f6; padding: 10px; margin: 5px 0; border-radius: 5px;';
                        div.innerHTML = `💬 ${msg}`;
                        container.appendChild(div);
                    });
                } else {
                    container.innerHTML = '<p>Chưa có tin nhắn nào.</p>';
                }
            } catch (error) {
                console.error('Lỗi tải tin nhắn:', error);
            }
        }

        function logout() {
            isAuthenticated = false;
            adminPassword = '';
            document.getElementById('loginScreen').style.display = 'block';
            document.getElementById('adminContent').style.display = 'none';
            document.getElementById('adminPassword').value = '';
        }

        // Enter để đăng nhập
        document.getElementById('adminPassword').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
        
        // Load data lần đầu khi trang được mở
        document.addEventListener('DOMContentLoaded', () => {
            // Không làm gì, chờ người dùng đăng nhập
        });
    </script>
</body>
</html>
