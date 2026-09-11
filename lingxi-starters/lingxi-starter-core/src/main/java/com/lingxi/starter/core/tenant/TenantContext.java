package com.lingxi.starter.core.tenant;

/**
 * 租户与调用者上下文（§4.1.5 / §4.9.4 第一道防线）。
 *
 * <p>来源：网关校验后注入的 {@code X-Tenant-Id} 与 JWT 摘要。禁止业务代码从请求参数取租户。
 * <p>传播：OpenAPI 显式传播（{@link #wrap}），禁止依赖 ThreadLocal 隐式继承——
 * 虚拟线程与提交到线程池的任务不会继承 ThreadLocal。
 */
public final class TenantContext {

    /** 智能体调用的来源标识（仅智能体发起时非空，用于审计与效能归集）。 */
    public record Principal(Long tenantId, Long userId, String agentCode, String locale) {

        public boolean isAgentCall() {
            return agentCode != null && !agentCode.isBlank();
        }
    }

    private static final ThreadLocal<Principal> HOLDER = new ThreadLocal<>();

    private TenantContext() {
    }

    public static Principal current() {
        Principal principal = HOLDER.get();
        if (principal == null) {
            // 缺失租户上下文的请求必须被拒绝，绝不回退到"全网可见"（§4.9.4）
            throw new IllegalStateException(
                    "租户上下文缺失：请求未经租户拦截器注入，或跨线程未显式传播（技术规约2.0 §4.9.4）");
        }
        return principal;
    }

    public static Long currentTenantId() {
        return current().tenantId();
    }

    public static Long currentUserId() {
        return current().userId();
    }

    public static Principal currentOrNull() {
        return HOLDER.get();
    }

    public static void set(Principal principal) {
        HOLDER.set(principal);
    }

    public static void clear() {
        HOLDER.remove();
    }

    public static Runnable wrap(Principal principal, Runnable task) {
        return () -> {
            Principal previous = HOLDER.get();
            set(principal);
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
