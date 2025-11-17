import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true, // 自动打开浏览器
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // 生成源码映射（方便调试）
  },
});
