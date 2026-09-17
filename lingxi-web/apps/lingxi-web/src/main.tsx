import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/design-tokens.css';
import '@/styles/global.css';
import '@/styles/layout.css';
import '@/styles/lingxi-ui.css';
import '@/styles/pages.css';

/**
 * 前端入口。
 *
 * 样式加载顺序即级联顺序，不可调整（前者被后者覆盖）：
 *   design-tokens（令牌）→ global（基础 + 签名元素）→ layout（外壳）
 *   → lingxi-ui（业务组件）→ pages（页面级）
 *
 * 注意（技术规约2.0 §4.2.5）：设计令牌以 CSS 变量 + AntD theme token 双轨落地，
 * 与设计规范一一对应；禁止在组件内写死颜色/字号/圆角魔法值。
 */
const container = document.getElementById('root');
if (!container) {
  // 面向开发者的不变式报错，不是用户可见文案：用英文，避免污染语言包（附录D 规则10）
  throw new Error('Mount node #root not found — check index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
