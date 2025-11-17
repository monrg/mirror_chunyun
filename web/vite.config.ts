import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // 允许访问项目根目录的上一级，以便读取note和统计目录
      allow: ['..']
    }
  }
})
