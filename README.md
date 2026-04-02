# ExamHub - Hệ thống luyện thi trực tuyến 🎓

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)

## 📚 Giới thiệu

ExamHub là hệ thống luyện thi trực tuyến toàn diện, hỗ trợ:
- ✅ Tạo và quản lý phòng thi, đề thi
- ✅ Ngân hàng câu hỏi đa dạng
- ✅ Tích hợp AI để sinh câu hỏi và giải thích đáp án
- ✅ Hệ thống token và premium
- ✅ Quản trị người dùng, thống kê

## 🛠 Công nghệ sử dụng

### Backend
- **Node.js** + **Express.js** - REST API server
- **MySQL** - Database chính
- **Redis** - Cache và session
- **JWT** - Xác thực
- **OpenRouter AI** - Tích hợp AI

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Router DOM** - Routing
- **Axios** - HTTP client

## 🚀 Cài đặt và chạy local

### Yêu cầu
- Node.js >= 18
- MySQL >= 8.0
- Redis >= 7.0

### Các bước

1. **Clone repository**
```bash
git clone https://github.com/TuanTu9999/ExamHub.git
cd ExamHub
cd server
npm install

cd ../client
npm install
# Tạo database
mysql -u root -p
CREATE DATABASE examhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Chạy migration
cd ../server
npm run migrate

# Seed dữ liệu
npm run seed
# Copy env mẫu
cp .env.example .env
# Chỉnh sửa các biến môi trường
git remote add origin https://github.com/TuanTu9999/ExamHub.git
git push -u origin main

clear

### Bước 9: Tạo file .env.example để chia sẻ cấu hình mẫu

```bash
cat > server/.env.example << 'EOF'
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password_here
DB_NAME=examhub

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=deepseek/deepseek-chat

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=TuanTu3008@ExamHub
ADMIN_EMAIL=admin@examhub.vn
ADMIN_NAME=Admin System

# Client
CLIENT_URL=http://localhost:5173

# Cache
AI_CACHE_TTL=3600
