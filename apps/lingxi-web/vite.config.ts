import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * 灵犀系统前端构建配置（技术规约2.0 §4.2.1）。
 *
 * 强制约定：
 *  - 纯 SPA，不做 SSR、不做微前端（§3.2 L4）
 *  - 按路由分区代码分割；ECharts 与地图/热力单独 chunk（避免首屏体积膨胀）
 *  - 设计令牌通过 CSS 变量注入，与 AntD ConfigProvider theme token 双轨（§4.2.5）
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.LX_WEB_PORT ?? 5173),
    proxy: {
      // 开发期直连后端（生产由 Nginx 反向代理，前端不感知网关地址）
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2023',
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-antd': ['antd', '@ant-design/pro-components'],
          'vendor-chart': ['echarts', '@antv/g2'],
          'vendor-query': ['@tanstack/react-query', 'zod', 'react-hook-form'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'json'] },
  },
});
