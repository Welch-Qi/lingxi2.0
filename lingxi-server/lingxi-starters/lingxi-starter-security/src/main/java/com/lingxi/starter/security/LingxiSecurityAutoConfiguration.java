package com.lingxi.starter.security;

import org.casbin.jcasbin.main.Enforcer;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * 安全能力自动装配。
 *
 * <p>注意：<b>认证本身不自研</b>（§4.9.1）——统一由 Keycloak（OIDC / OAuth2.1）承担，
 * 本配置只装配权限决策与注解切面。JWT 校验由 spring-boot-starter-oauth2-resource-server 完成，
 * 认证服务端的 issuer-uri 与 realm（Realm 对应租户）全部来自配置，禁止硬编码（§3.5 F1）。
 */
@AutoConfiguration
public class LingxiSecurityAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public Enforcer casbinEnforcer() {
        // 模型与策略来源：
        //   模型：classpath:casbin/lingxi_model.conf（三层：功能 / 行级 / 字段）
        //   策略：数据库（配置中心管理，带版本与操作人）
        Enforcer enforcer = new Enforcer("casbin/lingxi_model.conf", "casbin/lingxi_policy.csv");
        enforcer.enableAutoSave(true);
        return enforcer;
    }

    @Bean
    @ConditionalOnMissingBean
    public PermissionService permissionService(Enforcer enforcer) {
        return new PermissionService(enforcer);
    }

    @Bean
    @ConditionalOnMissingBean
    public RequirePermissionAspect requirePermissionAspect(PermissionService permissionService) {
        return new RequirePermissionAspect(permissionService);
    }
}
