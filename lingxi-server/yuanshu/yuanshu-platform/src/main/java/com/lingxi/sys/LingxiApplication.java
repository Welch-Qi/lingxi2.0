package com.lingxi.sys;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 灵犀系统后端启动类（模块化单体，一个进程）。
 *
 * <p>部署形态：模块化单体 + 单一 SPA + 三个独立进程（agent-runtime / data-jobs）。
 * 模块边界从第一天严格划定，二期任一模块可整体剥离为独立服务（§4.8）。
 *
 * <p>启动前置（§3.1 E6）：必须先执行 {@code scripts/check-env.sh} 通过四层体检
 * （隧道 / DB / 缓存 / 服务），环境不通不启动。
 */
@SpringBootApplication(scanBasePackages = "com.lingxi")
@EnableScheduling
public class LingxiApplication {

    public static void main(String[] args) {
        SpringApplication.run(LingxiApplication.class, args);
    }
}
