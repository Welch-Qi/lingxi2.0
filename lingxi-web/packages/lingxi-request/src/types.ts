/**
 * 全站统一响应体（与后端 lingxi-starter-core 的 R<T> 严格对齐，技术规约2.0 §4.1.3）。
 *
 * 禁止各模块自定义返回结构；类型由后端 OpenAPI 契约生成，此处仅声明信封结构。
 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  messageKey: string;
  data: T;
  traceId: string;
}

/** 分页响应（§4.3.1）：固定 { list, total, pageNo, pageSize }。 */
export interface PageResult<T> {
  list: T[];
  total: number;
  pageNo: number;
  pageSize: number;
}

/** 分页请求参数：pageNo 从 1 起，pageSize 默认 20、最大 200。 */
export interface PageQuery {
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 业务错误：携带 code 与 i18n key，便于前端按语言渲染提示。 */
export class ApiError extends Error {
  constructor(
    readonly code: number,
    readonly messageKey: string,
    message: string,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
