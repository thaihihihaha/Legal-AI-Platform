#!/bin/bash

# ============================================
# Plesk Deployment Script
# Hướng dẫn deploy lên Plesk
# ============================================

echo "🚀 Bắt đầu deploy lên Plesk..."

# Step 1: Build Frontend
echo "📦 Step 1: Build Frontend..."
cd client
npm install --production
npm run build
cd ..

# Step 2: Setup Backend
echo "📦 Step 2: Setup Backend..."
cd server
npm install --production
cd ..

# Step 3: Kiểm tra build
if [ ! -d "client/dist" ]; then
    echo "❌ Lỗi: client/dist không tồn tại"
    exit 1
fi

echo "✅ Build hoàn tất"
echo ""
echo "📋 Các bước tiếp theo trên Plesk:"
echo "1. Upload folder 'server' lên domain"
echo "2. Upload folder 'client/dist' vào 'server' (hoặc copy nếu SSH)"
echo "3. Cấu hình Node.js Application:"
echo "   - Document Root: /"
echo "   - Application Root: server"
echo "   - Startup File: index.js"
echo "   - Node.js version: 18.x hoặc cao hơn"
echo ""
echo "4. Cấu hình Environment Variables trong Plesk:"
echo "   APP_PORT=8080"
echo "   NODE_ENV=production"
echo "   FRONTEND_URL=<ten-mien-production-cua-ban>"
echo "   CORS_ORIGINS=<ten-mien-production-cua-ban>"
echo "   DATABASE_URL=<your-db-url>"
echo "   JWT_SECRET=<secure-secret>"
echo "   SESSION_SECRET=<secure-secret>"
echo ""
echo "5. Khởi động Node.js application"
echo "6. Kiểm tra: curl https://<ten-mien-production-cua-ban>/v1/health"
echo ""
echo "🎉 Deploy hoàn tất!"
