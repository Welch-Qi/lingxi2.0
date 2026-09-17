package com.lingxi.starter.core;

import com.lingxi.starter.core.mybatis.AuditMetaObjectHandler;
import com.lingxi.starter.core.trace.TraceIdFilter;
import com.lingxi.starter.core.web.GlobalExceptionHandler;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * 公共内核自动配置。业务模块只引依赖，不做装配（约定优于配置）。
 */
@AutoConfiguration
public class LingxiCoreAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public TraceIdFilter traceIdFilter() {
        return new TraceIdFilter();
    }

    @Bean
    @ConditionalOnMissingBean
    public GlobalExceptionHandler globalExceptionHandler() {
        return new GlobalExceptionHandler();
    }

    /**
     * 审计字段填充器。仅在 MyBatis-Plus 存在时生效（由 starter-mybatis 引入）。
     */
    @Bean
    @ConditionalOnMissingBean
    public AuditMetaObjectHandler auditMetaObjectHandler() {
        return new AuditMetaObjectHandler();
    }
}
