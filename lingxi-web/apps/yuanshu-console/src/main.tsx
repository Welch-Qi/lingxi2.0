import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/design-tokens.css';
import '@/styles/global.css';
import '@/styles/layout.css';
import '@/styles/lingxi-ui.css';
import '@/styles/workspace.css';
import '@/styles/pages.css';
// IAM 管理台（/iam）专用版式：抽屉编辑器 / 权限授予矩阵 / 数据范围选择器。
// 放最后：只给自己的 `lx-cc-` 前缀写规则（与 lingxi-web 同源样式，保证迁移页视觉不漂移）。
import '@/styles/config-center.css';
// 录入表单页（跨分区共用）。放在 config-center 之后：
// 它只给自己的 `lx-form__*` / `lx-imp__*` 命名空间写规则，不覆盖上面任何一块。
import '@/styles/forms.css';

/**
 * 元枢管理台入口。
 *
 * 样式加载顺序即级联顺序，不可调整（前者被后者覆盖）：
 *   design-tokens（令牌）→ global（基础 + 签名元素）→ layout（外壳）
 *   → lingxi-ui（业务组件）→ workspace（工作区组件）→ pages（页面级）
 *
 * 与 lingxi-web 的差异：本 app 只挂管理台需要的样式子集
 * （商机/商品/营销日历/接待/工作室等灵犀业务专用版式不引入）。
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
