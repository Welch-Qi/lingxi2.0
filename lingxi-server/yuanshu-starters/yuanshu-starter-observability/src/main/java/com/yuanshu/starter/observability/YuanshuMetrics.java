package com.yuanshu.starter.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

/**
 * 指标注册门面（§4.11.2）。
 *
 * <p>统一命名前缀 {@code lingxi_}，标签固定含 {@code domain} 与 {@code tenantId}，
 * 保障 Prometheus 看板可按域与租户下钻。
 */
public class YuanshuMetrics {

    private static final String PREFIX = "lingxi_";

    private final MeterRegistry registry;

    public YuanshuMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void count(String domain, String name, String... tags) {
        Counter.builder(PREFIX + name)
                .tag("domain", domain)
                .tags(tags)
                .register(registry)
                .increment();
    }

    public Timer.Sample startTimer() {
        return Timer.start(registry);
    }

    public void stopTimer(Timer.Sample sample, String domain, String name, String... tags) {
        sample.stop(Timer.builder(PREFIX + name).tag("domain", domain).tags(tags).register(registry));
    }
}
