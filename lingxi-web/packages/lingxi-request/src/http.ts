import axios, { type AxiosInstance, type AxiosRequestConfig, AxiosHeaders } from 'axios';
import { ApiError, type ApiEnvelope, type PageResult } from './types';

/**
 * 统一 HTTP 客户端（技术规约2.0 §4.2.1 / §4.3.3）。
 *
 * 铁律：
 *  - 组件内禁止直调 axios / fetch（附录D 规则 12），一律经本模块；
 *  - 写操作自动注入 X-Idempotency-Key（UUID），服务端按 key + 租户去重（§4.3.3）；
 *  - 租户上下文只从认证态读取（禁止业务代码从请求参数取租户）；
 *  - traceId 由后端回传，前端透传并写入错误对象，便于用户报错时定位链路。
 */

/** 由应用在启动时注入（避免本包反向依赖认证模块） */
interface ContextProvider {
  getAccessToken: () => string | null;
  getTenantId: () => string | null;
  onUnauthenticated: () => void;
}

let contextProvider: ContextProvider = {
  getAccessToken: () => null,
  getTenantId: () => null,
  onUnauthenticated: () => undefined,
};

export function configureHttp(provider: ContextProvider): void {
  contextProvider = provider;
}

function newIdempotencyKey(): string {
  // crypto.randomUUID 在所有现代浏览器可用；降级用时间戳 + 随机数
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 30_000, // 域间同步调用超时默认 ≤3s 是后端约定；前端交互接口放宽到 30s
  headers: { 'Content-Type': 'application/json' },
});

// ---- 请求拦截：注入认证、租户、幂等键、语言 ----
http.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers ?? {});
  const token = contextProvider.getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const tenantId = contextProvider.getTenantId();
  if (tenantId) {
    // 租户上下文由网关校验后注入；前端只透传，不参与判定（§4.3.3）
    headers.set('X-Tenant-Id', tenantId);
  }
  const method = (config.method ?? 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method) && !headers.has('X-Idempotency-Key')) {
    headers.set('X-Idempotency-Key', newIdempotencyKey());
  }
  headers.set('Accept-Language', localStorage.getItem('lx.locale') ?? 'zh-CN');
  config.headers = headers;
  return config;
});

// ---- 响应拦截：解包统一响应体、错误本地化、401 跳登录 ----
http.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiEnvelope<unknown> | undefined;
    // 非统一响应体的接口（文件流等）原样返回
    if (!payload || typeof payload.code !== 'number') {
      return response;
    }
    if (payload.code === 0) {
      return response;
    }
    // 业务失败：抛带 messageKey 的错误，由调用方或全局处理决定提示方式
    throw new ApiError(payload.code, payload.messageKey, payload.message, payload.traceId);
  },
  (error: unknown) => {
    // axios 的 error 回调参数是 any，这里显式收窄，避免 any 扩散到错误处理逻辑
    const axiosError = axios.isAxiosError(error) ? error : undefined;
    const status = axiosError?.response?.status;
    const body = axiosError?.response?.data as ApiEnvelope<unknown> | undefined;
    if (status === 401) {
      // 登录态失效：统一跳登录，禁止各页面自行处理
      contextProvider.onUnauthenticated();
      throw new ApiError(10001, 'common.error.unauthenticated', 'unauthenticated');
    }
    if (body && typeof body.code === 'number') {
      throw new ApiError(body.code, body.messageKey, body.message, body.traceId);
    }
    throw new ApiError(status ?? -1, 'common.error.system', axiosError?.message ?? 'network error');
  },
);

// ---- 语义化方法封装 ----
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<ApiEnvelope<T>>(url, { params });
  return res.data.data;
}

export async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<PageResult<T>> {
  const res = await http.get<ApiEnvelope<PageResult<T>>>(url, { params });
  return res.data.data;
}

/** 读操作接口，仅用于文档化：参数必须含 id（便于审计）；禁止在前端拼接业务规则参数 */
export interface IdempotentRequestOptions extends AxiosRequestConfig {
  /** 显式指定幂等键：仅用于「同一业务操作」的显式重试，默认由拦截器生成 UUID */
  idempotencyKey?: string;
}

function withIdempotency(options?: IdempotentRequestOptions): AxiosRequestConfig {
  if (!options?.idempotencyKey) {
    return options ?? {};
  }
  return {
    ...options,
    headers: { ...(options.headers ?? {}), 'X-Idempotency-Key': options.idempotencyKey },
  };
}

/**
 * 写操作统一入口（POST）。
 *
 * 铁律（技术规约2.0 §4.3.3）：
 *  - 写操作不自动重试；重试由用户显式触发，后端以幂等键保证重复提交安全；
 *  - 幂等键由拦截器自动注入（UUID），仅显式重试时才手工透传同一个键；
 *  - 组件内禁止直调 axios / fetch（附录D 规则 12）。
 */
export async function post<T>(url: string, body?: unknown, options?: IdempotentRequestOptions): Promise<T> {
  const res = await http.post<ApiEnvelope<T>>(url, body, withIdempotency(options));
  return res.data.data;
}

/** 写操作统一入口（PUT，全量更新）。语义：幂等，重复提交结果一致。 */
export async function put<T>(url: string, body?: unknown, options?: IdempotentRequestOptions): Promise<T> {
  const res = await http.put<ApiEnvelope<T>>(url, body, withIdempotency(options));
  return res.data.data;
}

/** 写操作统一入口（PATCH，局部更新）。用于状态流转与字段级修改。 */
export async function patch<T>(url: string, body?: unknown, options?: IdempotentRequestOptions): Promise<T> {
  const res = await http.patch<ApiEnvelope<T>>(url, body, withIdempotency(options));
  return res.data.data;
}

/**
 * 删除统一入口。
 *
 * 说明：业务删除一律为软删除（is_deleted + 审计留痕），
 * 前端不区分「物理/逻辑」——由后端保证可恢复性。
 */
export async function del<T>(url: string, params?: Record<string, unknown>, options?: IdempotentRequestOptions): Promise<T> {
  const res = await http.delete<ApiEnvelope<T>>(url, { params, ...withIdempotency(options) });
  return res.data.data;
}
