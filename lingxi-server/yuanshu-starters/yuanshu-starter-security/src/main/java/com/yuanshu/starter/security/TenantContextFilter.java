package com.yuanshu.starter.security;

import com.yuanshu.starter.core.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 租户上下文入口过滤器（§4.9.4 第一道防线的前置）。
 *
 * <p>租户来源优先级与信任级别：
 * <ol>
 *   <li><b>JWT 的 {@code tenant_id} claim</b> —— 唯一可信来源（Keycloak 签发，签名已校验）。
 *       规约 §5「Token 只放摘要：user_id / tenant_id / roles」。</li>
 *   <li><b>{@code X-Tenant-Id} 请求头</b> —— 网关校验 JWT 后注入、供服务间透传。
 *       本 Filter 用它与 JWT 做<b>一致性比对</b>，不一致即拒绝（防头伪造）。</li>
 * </ol>
 *
 * <p>缺失租户上下文的请求<b>一律拒绝</b>（{@code reject-missing-context: true}），
 * 绝不回退到「全网可见」—— fail-open 是 P0 事故。
 *
 * <p>本 Filter 只负责把租户上下文放进 {@link TenantContext}（ThreadLocal）；
 * 数据库侧的 RLS 会话变量由 {@code YuanshuRlsSessionInterceptor} 负责写入
 * （第三道防线），两者配合才构成完整链路。
 *
 * <p>传播：{@code TenantContext} 基于 ThreadLocal，虚拟线程与线程池任务<b>不继承</b>
 * （§4.1.5）—— 跨线程必须显式 {@link TenantContext#wrap} 传播。
 */
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class TenantContextFilter extends OncePerRequestFilter {

    /** 网关注入 / 服务间透传的租户头。 */
    public static final String HEADER = "X-Tenant-Id";

    /** JWT 中承载租户 ID 的 claim 名。 */
    public static final String CLAIM_TENANT_ID = "tenant_id";

    /** JWT 中承载用户 ID 的 claim 名。 */
    public static final String CLAIM_USER_ID = "user_id";

    /** 智能体调用来源标识（智能体发起时非空）。 */
    public static final String CLAIM_AGENT_CODE = "agent_code";

    /** 语言偏好（用于多语言输出）。 */
    public static final String CLAIM_LOCALE = "locale";

    /** 是否拒绝缺失租户上下文的请求（生产强制 true）。 */
    private final boolean rejectMissingContext;

    /** 租户上下文头名（来自 yuanshu.tenant.header-name）。 */
    private final String headerName;

    public TenantContextFilter(boolean rejectMissingContext, String headerName) {
        this.rejectMissingContext = rejectMissingContext;
        this.headerName = StringUtils.hasText(headerName) ? headerName : HEADER;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Long tenantId = resolveTenantId(request);
        if (tenantId == null) {
            if (rejectMissingContext) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "缺少租户上下文");
                return;
            }
            // 明确放行（仅本地调试）：不放 TenantContext，DB 查询将因缺会话变量而 fail-closed
            chain.doFilter(request, response);
            return;
        }

        TenantContext.Principal principal = new TenantContext.Principal(
                tenantId,
                resolveUserId(),
                resolveStringClaim(CLAIM_AGENT_CODE),
                resolveStringClaim(CLAIM_LOCALE));
        TenantContext.set(principal);
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * 解析租户 ID：JWT claim 与请求头必须一致。
     *
     * @return 租户 ID；两者均缺失返回 null
     */
    private Long resolveTenantId(HttpServletRequest request) {
        Long fromJwt = resolveJwtTenantId();
        Long fromHeader = parseTenantId(request.getHeader(headerName));

        if (fromJwt != null && fromHeader != null && !fromJwt.equals(fromHeader)) {
            // 请求头与 Token 不一致 —— 可能是伪造或串租户，必须拒绝
            throw new IllegalStateException(
                    "租户上下文不一致：请求头 " + headerName + "=" + fromHeader + " 与 Token 声明 " + fromJwt + " 冲突");
        }
        return fromJwt != null ? fromJwt : fromHeader;
    }

    private Long resolveJwtTenantId() {
        return resolveLongClaim(CLAIM_TENANT_ID);
    }

    private Long resolveUserId() {
        return resolveLongClaim(CLAIM_USER_ID);
    }

    private Long resolveLongClaim(String name) {
        Object value = resolveClaim(name);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.valueOf(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String resolveStringClaim(String name) {
        Object value = resolveClaim(name);
        return value == null ? null : value.toString();
    }

    private Object resolveClaim(String name) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            Jwt jwt = jwtAuthentication.getToken();
            return jwt.getClaims().get(name);
        }
        return null;
    }

    private Long parseTenantId(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return Long.valueOf(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
