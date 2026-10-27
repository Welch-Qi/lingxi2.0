package com.yuanshu.starter.observability;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * 可观测统一装配（§4.11）。
 *
 * <p>统一提供：结构化 JSON 日志（含 timestamp/level/service/traceId/tenantId/userId）·
 * OTel 语义约定 · Micrometer 指标注册。禁止各模块自定义 span 命名。
 */
@AutoConfiguration
@ConditionalOnClass(MeterRegistry.class)
public class YuanshuObservabilityAutoConfiguration {

    /** 统一指标门面：模块只声明业务指标，命名与标签由公共服务统一。 */
    @Bean
    @ConditionalOnMissingBean
    public YuanshuMetrics yuanshuMetrics(MeterRegistry registry) {
        return new YuanshuMetrics(registry);
    }
}
