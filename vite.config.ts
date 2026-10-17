/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 纯静态站点：所有核心计算都在浏览器本地完成，不依赖后端。
// base 设为 './' 以便直接部署到任意子路径（GitHub Pages 项目页 / Cloudflare Pages / 静态服务器）。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    exclude: ['src/tests/**/*.spec.ts', 'node_modules/**'],
    reporters: ['default'],
  },
});
