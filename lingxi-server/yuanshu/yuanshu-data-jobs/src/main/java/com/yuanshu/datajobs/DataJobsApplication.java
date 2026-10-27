package com.yuanshu.datajobs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 元枢 · 数据任务进程启动类（独立部署进程，单实例运行）。
 *
 * <p>采集 / 清洗 / 实体消歧 / 指标计算（DT-01~07、GM-01~12）；
 * 只允许 import com.yuanshu.dt.api.*，边界由 yuanshu-platform 的 ArchitectureRuleTest 校验。
 *
 * <p>启停只能经 {@code lingxi-ops/scripts/*.sh}（铁律 7），启动前置同 check-env.sh 四层体检。
 */
@SpringBootApplication
@EnableScheduling
public class DataJobsApplication {

    public static void main(String[] args) {
        SpringApplication.run(DataJobsApplication.class, args);
    }
}
