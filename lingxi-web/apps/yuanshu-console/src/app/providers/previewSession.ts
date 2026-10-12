import type { AuthTenant } from '@/app/providers/AuthProvider';

/**
 * 静态骨架预览会话（开发环境专用）。
 *
 * 为什么需要它：静态页面搭建阶段后端与 Keycloak 尚未就绪，
 * 若不放开闸门，打开 http://localhost:5173 只会停在登录页，
 * 已完成的 13 个分区页面一个都看不到，前端无法自检视觉与信息结构。
 *
 * 安全边界（必须遵守，否则退化成后门）：
 *  - 仅在 `import.meta.env.DEV` 为真、且显式配置 `VITE_LX_STATIC_PREVIEW=true` 时生效；
 *    生产构建中 DEV 恒为 false，该分支被摇树移除，产物里不存在任何绕过逻辑；
 *  - 身份与权限**不在本文件写死**，而是由配置中心（cc-store）派生，见 AuthProvider 的 previewIdentity。
 *
 * 2026-10-06 变化：原先这里的 `PREVIEW_PERMISSIONS` 是 15 条手写演示码。
 * 侧边栏与路由守卫接上权限过滤后，那份码表会让一级菜单整片消失，
 * 而它与配置中心毫无关系 —— 在配置中心勾掉任何权限都不可能有反应。
 * 故预览权限改为从 cc-store 派生，演示码常量随之删除（不再有消费方）。
 *
 * ⚠️ 本绕过逻辑触及「认证会话」红线（技术规约2.0 附录E ①），
 * 合并前必须人工 Review，且上线前确认 .env.development 未被打进生产环境。
 */
export function isStaticPreview(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_LX_STATIC_PREVIEW === 'true';
}

export const PREVIEW_TENANT: AuthTenant = {
  id: 'preview-tenant',
  code: 'demo',
  name: 'NovaVolt Energy',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
};