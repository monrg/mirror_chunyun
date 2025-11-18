import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@note': path.resolve(__dirname, '../note'),
      '@analysis': path.resolve(__dirname, '../统计')
    }
  },
  server: {
    fs: {
      // 允许访问项目根目录的上一级，以便读取note和统计目录
      allow: ['..', '../..']
    }
  }
})
