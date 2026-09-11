/// <reference types="vite/client" />

/**
 * 前端环境变量类型声明（技术规约2.0 §3.2 L4）。
 *
 * 铁律：前端只允许读取 VITE_ 前缀的构建期变量；密钥、数据库连接串等敏感配置
 * 一律不进入前端产物（前端能读到的东西等于公开）。
 *
 * 变量清单以 .env.example 为唯一权威，新增变量必须同步补此处声明——
 * 否则会退化成字符串松类型，拼错变量名在构建期不报错、上线后静默为空。
 */
interface ImportMetaEnv {
  /** 后端网关基地址（开发环境 http://localhost:8080） */
  readonly VITE_API_BASE_URL: string;
  /** 统一身份平台地址（Keycloak Realm URL），为空时登录页会明确提示不可用 */
  readonly VITE_OIDC_AUTHORITY?: string;
  /** OIDC 客户端 ID（公共客户端 + PKCE，不配置 secret） */
  readonly VITE_OIDC_CLIENT_ID?: string;
  /** 环境标识，用于底部状态栏与排障（dev / test / prod） */
  readonly VITE_APP_ENV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
