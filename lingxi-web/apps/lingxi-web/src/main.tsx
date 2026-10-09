import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/design-tokens.css';
import '@/styles/global.css';
import '@/styles/layout.css';
import '@/styles/lingxi-ui.css';
import '@/styles/workspace.css';
import '@/styles/pages.css';
import '@/styles/reception.css';
import '@/styles/studio.css';
// 商机详情页（/opportunity/:id）专用版式。放在最后：它只给本页用的 `lx-oppd__*`，
// 放到前面会被 workspace.css 里同级的通用块盖掉。
import '@/styles/opportunity.css';
import '@/styles/product.css';
// 营销日历（/marketing/calendar，兼 /marketing 默认正文）。同样放最后：
// 它只给自己的 `lx-mcal*` 命名空间写规则，不覆盖上面任何一块。
import '@/styles/mkg-calendar.css';
// 配置中心（/config）专用版式：抽屉编辑器 / 权限授予矩阵 / 数据范围选择器。
// 同样放最后：只给自己的 `lx-cc-` 前缀写规则。
import '@/styles/config-center.css';
// 录入表单页与导入向导（跨分区共用）。放在 pages/product 之后：
// 它只给自己的 `lx-form__*` / `lx-imp__*` 命名空间写规则，不覆盖上面任何一块。
import '@/styles/forms.css';

/**
 * 前端入口。
 *
 * 样式加载顺序即级联顺序，不可调整（前者被后者覆盖）：
 *   design-tokens（令牌）→ global（基础 + 签名元素）→ layout（外壳）
 *   → lingxi-ui（业务组件）→ workspace（业务工作区组件）→ pages（页面级）
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
