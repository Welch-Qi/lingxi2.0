package com.yuanshu.agentruntime;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 元枢 · L3 智能体运行时启动类（独立部署进程，ADR-0003：后端仓库内独立进程）。
 *
 * <p>编排 / 工具网关 / 护栏 / 边界拦截 / Token 计量；灵犀与开物两集群共用（AG-07~09）。
 * 与业务模块的边界是 MCP 工具契约与 REST（技术规约2.0 §4.6.1），禁止直连业务库表。
 *
 * <p>启停只能经 {@code lingxi-ops/scripts/*.sh}（铁律 7），启动前置同 check-env.sh 四层体检。
 */
@SpringBootApplication
public class AgentRuntimeApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgentRuntimeApplication.class, args);
    }
}
