import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Client gọi API bằng đường dẫn TƯƠNG ĐỐI (/v1, /uploads) thay vì địa chỉ tuyệt đối.
  //
  // VÌ SAO: bản dựng production được chính Express phục vụ trên CÙNG origin
  // (server/src/app.js: express.static cho client/dist + các route /v1/*), nên đường dẫn
  // tương đối luôn trỏ đúng ở mọi tên miền mà không cần nhúng VITE_API_URL lúc build.
  // Trước đây các file client rơi về 'http://localhost:8080' khi VITE_API_URL rỗng, khiến
  // trình duyệt người dùng gọi vào máy của chính họ → ERR_CONNECTION_REFUSED.
  //
  // Lúc dev thì Vite chạy cổng 5173 còn API ở 8080, nên cần proxy chuyển tiếp.
  // Đặt VITE_API_URL nếu API dev nằm ở nơi khác.
  server: {
    proxy: {
      '/v1': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
