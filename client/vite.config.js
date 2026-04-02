import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/ExamHub/', // Tên repository của bạn
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://your-backend-url.onrender.com', // Sẽ thay sau
        changeOrigin: true
      }
    }
  }
})