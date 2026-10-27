import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/** 内部包入口：packages/<name>/src/index.ts（与 tsconfig paths 一一对应） */
function pkgSrc(name: string): string {
  return fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));
}

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
    // 内部包（@lingxi/*）直接指向包源码，而非依赖 node_modules 工作区软链接：
    //  ① 与 tsconfig.json 的 paths 用同一套映射，类型解析与打包解析口径一致
    //     （否则 tsc 通过、vite 失败，出现「类型对了但打不出包」的假绿灯）；
    //  ② 开发期改内部包源码即时生效，无需先单独构建包；
    //  ③ 避免 Windows 下长中文路径 + 工作区链接带来的解析不稳。
    // 顺序敏感：'@lingxi/' 命中后立即返回，不能被 'src' 相对路径抢先。
    alias: [
      { find: '@lingxi/ui', replacement: pkgSrc('lingxi-ui') },
      { find: '@lingxi/request', replacement: pkgSrc('lingxi-request') },
      { find: '@lingxi/types', replacement: pkgSrc('lingxi-types') },
      { find: '@lingxi/utils', replacement: pkgSrc('lingxi-utils') },
      { find: '@lingxi/i18n', replacement: pkgSrc('lingxi-i18n') },
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
    ],
  },
  server: {
    port: Number(process.env.LX_WEB_PORT ?? 5173),
    // 内部包源码位于 apps/lingxi-web 之外，需显式放行工作区根，否则 dev 下 403
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
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
        // 用「函数形式 + 按实际模块路径分组」，而不是「对象形式 + 包名」。
        //
        // 理由：对象形式写的是包名，依赖 Rollup 把包名解析成入口模块（main entry），
        // 而本仓的图表是按需引入的（只 import 'echarts/core'，从不 import 'echarts'），
        // 包名指向的入口根本不在依赖图里 —— 分组结果取决于解析行为，不确定。
        // 函数形式直接按模块路径归组，结果确定、可预期。
        //
        // ⚠️ 关于体积：vendor-chart 约 524 kB，这是 echarts/core + zrender + 折线/柱状 +
        // 网格/提示/图例的真实体积（echarts 全量 min 为 1096 kB、simple 为 489 kB，
        // 已实测对照）。**它不是"没做按需引入"的症状**，别误判成分包配置写错。
        // 真正让首屏变轻的手段是 LxChart 的懒加载：echarts 已改为动态 import，
        // 本 chunk 只在页面真的渲染图表时才被拉取。
        //
        // 后续接入 AntV G2 / ProComponents 时无需改这里——只要真的被 import 就会自动归组。
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/[\\/]node_modules[\\/](antd|@ant-design|rc-[^\\/]+|@rc-component)[\\/]/.test(id)) {
            return 'vendor-antd';
          }
          if (/[\\/]node_modules[\\/](echarts|zrender)[\\/]/.test(id)) {
            return 'vendor-chart';
          }
          if (/[\\/]node_modules[\\/](@tanstack|zod|react-hook-form|@hookform)[\\/]/.test(id)) {
            return 'vendor-query';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // 前端骨架期尚无单测文件：空测试视为通过（与 yuanshu-console 一致，避免 `pnpm -r test:unit` 误红）
    passWithNoTests: true,
    coverage: { provider: 'v8', reporter: ['text', 'json'] },
  },
});
