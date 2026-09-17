import type { AuthTenant, AuthUser } from '@/app/providers/AuthProvider';

/**
 * 静态骨架预览会话（开发环境专用）。
 *
 * 为什么需要它：静态页面搭建阶段后端与 Keycloak 尚未就绪，
 * 若不放开闸门，打开 http://localhost:5173 只会停在登录页，
 * 已完成的 11 个分区页面一个都看不到，前端无法自检视觉与信息结构。
 *
 * 安全边界（必须遵守，否则退化成后门）：
 *  - 仅在 `import.meta.env.DEV` 为真、且显式配置 `VITE_LX_STATIC_PREVIEW=true` 时生效；
 *    生产构建中 DEV 恒为 false，该分支被摇树移除，产物里不存在任何绕过逻辑；
 *  - 权限码是演示集合，不代表任何真实授权；后端一旦就绪必须置 false 并走真实会话。
 *
 * ⚠️ 本绕过逻辑触及「认证会话」红线（技术规约2.0 附录E ①），
 * 合并前必须人工 Review，且上线前确认 .env.development 未被打进生产环境。
 */
export function isStaticPreview(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_LX_STATIC_PREVIEW === 'true';
}

export const PREVIEW_USER: AuthUser = {
  id: 'preview-user',
  username: 'preview',
  displayName: 'Preview',
  email: 'preview@example.com',
  roles: ['demo.role.owner'],
};

export const PREVIEW_TENANT: AuthTenant = {
  id: 'preview-tenant',
  code: 'demo',
  name: 'NovaVolt Energy',
  timezone: 'Asia/Shanghai',
  locale: 'zh-CN',
};

/** 预览权限码：覆盖一期 11 个分区的首页查看权，便于逐个菜单点开自检。 */
export const PREVIEW_PERMISSIONS: readonly string[] = [
  'wb:home:view',
  'wb:brief:view',
  'cus:lead:view',
  'prd:product:view',
  'ord:order:view',
  'svc:ticket:view',
  'mkg:content:view',
  'intel:trend:view',
  'ana:alert:view',
  'ag:task:view',
  'kc:asset:view',
  'cc:user:view',
];
