import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 离线单文件构建：把 JS / CSS 全部内联进 index.html，并输出 IIFE 格式。
// 目的：产出一个可直接双击打开（file:// 协议）、可离线运行、可拷贝给他人单独分发的 HTML。
// 注意：会放弃代码分包（首屏体积变大），仅用于离线分发场景；常规部署仍用 `npm run build`。

// file:// 下浏览器会以 origin=null 拦截 ES 模块（type="module" / crossorigin），
// 故构建结束后把入口脚本降级为经典脚本，IIFE 产物无需模块机制即可执行；
// 经典脚本默认同步执行（早于 <body> 解析），须补 defer 才能在 #root 就绪后挂载。
function fileProtocolPatch() {
  return {
    name: 'palm-oracle:file-protocol-patch',
    closeBundle() {
      const file = resolve(process.cwd(), 'dist-offline/index.html');
      const patched = readFileSync(file, 'utf-8')
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin/g, '')
        .replace(/<script (?![^>]*\bdefer\b)/g, '<script defer ');
      writeFileSync(file, patched);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), fileProtocolPatch()],
  build: {
    target: 'es2020',
    outDir: 'dist-offline',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    // 离线包本就不分包，体积警告在此场景无意义。
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});
