package com.lingxi.starter.core.web;

import com.lingxi.starter.core.error.ErrorCode;
import com.lingxi.starter.core.trace.TraceContext;

/**
 * 全站统一响应体（§4.1.3）。禁止各模块自行定义返回结构。
 *
 * <pre>
 * { "code":0, "message":"success", "messageKey":"common.success", "data":{}, "traceId":"..." }
 * </pre>
 *
 * <p>code=0 表示成功，非 0 见附录A错误码表。
 */
public record R<T>(int code, String message, String messageKey, T data, String traceId) {

    public static final String SUCCESS_MESSAGE_KEY = "common.success";

    public static <T> R<T> ok(T data) {
        return new R<>(0, "success", SUCCESS_MESSAGE_KEY, data, TraceContext.currentTraceId());
    }

    public static R<Void> ok() {
        return ok(null);
    }

    public static <T> R<T> fail(ErrorCode errorCode) {
        return new R<>(errorCode.code(), errorCode.message(), errorCode.messageKey(), null,
                TraceContext.currentTraceId());
    }

    public boolean succeeded() {
        return code == 0;
    }
}
