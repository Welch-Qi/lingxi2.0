package com.yuanshu.starter.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 租户上下文相关配置（{@code yuanshu.tenant.*}）。
 *
 * <p>与 {@code TenantTableWhiteList}（starter-mybatis）共用同一前缀但分属不同模块，
 * 各取所需字段 —— Spring Boot 的宽松绑定允许同前缀被多个绑定类使用。
 */
@ConfigurationProperties(prefix = "yuanshu.tenant")
public class TenantContextProperties {

    /** 租户上下文头（网关注入 / 服务间透传）。 */
    private String headerName = "X-Tenant-Id";

    /** 缺失租户上下文是否一律拒绝。生产环境强制 true（fail-closed）。 */
    private boolean rejectMissingContext = true;

    public String getHeaderName() {
        return headerName;
    }

    public void setHeaderName(String headerName) {
        this.headerName = headerName;
    }

    public boolean isRejectMissingContext() {
        return rejectMissingContext;
    }

    public void setRejectMissingContext(boolean rejectMissingContext) {
        this.rejectMissingContext = rejectMissingContext;
    }
}
