import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/design-tokens.css';
import '@/styles/global.css';

/**
 * 前端入口。
 *
 * 注意（技术规约2.0 §4.2.5）：设计令牌以 CSS 变量 + AntD theme token 双轨落地，
 * 与设计规范一一对应；禁止在组件内写死颜色/字号/圆角魔法值。
 */
const container = document.getElementById('root');
if (!container) {
  throw new Error('未找到挂载节点 #root，请检查 index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
