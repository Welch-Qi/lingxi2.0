package com.lingxi.starter.core.trace;

import org.slf4j.MDC;

/**
 * traceId 上下文：一条 Trace 贯穿「前端请求 → 网关 → 业务模块 → Outbox → 智能体运行时 → 工具调用 → 外部 API/LLM」（§4.11.2）。
 *
 * <p>透传路径：HTTP header(X-Trace-Id) → 事件信封 → LLM 调用 → 工具调用。
 * <p>线程边界必须显式传播：虚拟线程 / 异步任务不得依赖 ThreadLocal 隐式继承。
 */
public final class TraceContext {

    /** MDC 键名，日志 pattern 与结构化 JSON 输出均取此键。 */
    public static final String MDC_KEY = "traceId";

    private TraceContext() {
    }

    public static String currentTraceId() {
        return MDC.get(MDC_KEY);
    }

    public static void set(String traceId) {
        MDC.put(MDC_KEY, traceId);
    }

    public static void clear() {
        MDC.remove(MDC_KEY);
    }

    /**
     * 以指定 traceId 执行任务并在结束后恢复（跨线程显式传播用）。
     */
    public static Runnable wrap(String traceId, Runnable task) {
        return () -> {
            String previous = currentTraceId();
            set(traceId);
            try {
                task.run();
            } finally {
                if (previous == null) {
                    clear();
                } else {
                    set(previous);
                }
            }
        };
    }
}
