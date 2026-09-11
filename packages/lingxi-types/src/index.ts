/**
 * API 类型出口（技术规约2.0 §4.2.3）。
 *
 * 铁律：本包内容全部由后端 OpenAPI 契约自动生成（见 lingxi-web/openapi/gen-types.sh）。
 * 禁止手写与 API 响应同名的 interface（附录D 规则 11）——手写类型会与契约漂移，
 * 而漂移在运行时才暴露（前端拿不到后端改名的字段时静默为 undefined）。
 */
export type * from './api.gen';
