package com.yuanshu.starter.security;

import org.casbin.jcasbin.main.Enforcer;
import org.casbin.jcasbin.model.Model;
import org.casbin.jcasbin.persist.file_adapter.FileAdapter;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * 安全能力自动装配。
 *
 * <p>注意：<b>认证本身不自研</b>（§4.9.1）——统一由 Keycloak（OIDC / OAuth2.1）承担，
 * 本配置只装配权限决策与注解切面。JWT 校验由 spring-boot-starter-oauth2-resource-server 完成，
 * 认证服务端的 issuer-uri 与 realm（Realm 对应租户）全部来自配置，禁止硬编码（§3.5 F1）。
 */
@AutoConfiguration
public class YuanshuSecurityAutoConfiguration {

    /** Casbin 模型：三层（功能 / 行级 / 字段）。 */
    private static final String MODEL_RESOURCE = "casbin/lingxi_model.conf";
    /** Casbin 策略：随包基线（生产由配置中心覆盖，带版本与操作人）。 */
    private static final String POLICY_RESOURCE = "casbin/lingxi_policy.csv";

    @Bean
    @ConditionalOnMissingBean
    public Enforcer casbinEnforcer() {
        // 模型与策略来源：
        //   模型：classpath:casbin/lingxi_model.conf（三层：功能 / 行级 / 字段）
        //   策略：数据库（配置中心管理，带版本与操作人）
        //
        // ⚠️ 必须走 classpath 资源流，不能用 new Enforcer(String, String)：
        //    该构造器把两个参数当**文件系统路径**读，打成 jar 后不存在 →
        //    启动即抛 "casbin\lingxi_model.conf (系统找不到指定的路径。)"。
        //    正确用法：Model.newModelFromString(内容) + new FileAdapter(InputStream)。
        Model model = Model.newModelFromString(readClasspath(MODEL_RESOURCE));
        Enforcer enforcer = new Enforcer(model, new FileAdapter(openClasspath(POLICY_RESOURCE)));
        enforcer.enableAutoSave(true);
        return enforcer;
    }

    private static String readClasspath(String path) {
        try (InputStream in = openClasspath(path)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("读取 Casbin 模型失败: " + path, e);
        }
    }

    private static InputStream openClasspath(String path) {
        ClassPathResource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new IllegalStateException("Casbin 资源不存在: " + path);
        }
        try {
            return resource.getInputStream();
        } catch (IOException e) {
            throw new IllegalStateException("打开 Casbin 资源失败: " + path, e);
        }
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
