package com.yuanshu.ac.api;

import java.util.List;

/**
 * 智能体注册 —— 集群智能体接入元枢运行时的唯一入口（AC-01 / AG-07~09）。
 *
 * <p>灵犀六智能体、开物五个场景智能体**必须注册到元枢智能体工厂**，
 * 自主度与边界拦截一律在元枢实现，禁止集群内自建（归口表 §6.3 风险3；三产品规划 §4 约束2）。
 */
public interface AgentRegistrationApi {

    /** 注册智能体，返回智能体 ID（雪花 Long）。写操作幂等由调用方携带 X-Idempotency-Key。 */
    Long register(AgentRegistrationCmd cmd);

    /** 取智能体注册信息只读视图。 */
    AgentView get(String agentCode);

    /** 注册命令：归属产品 + 场景码清单 + 默认自主度（缺省 A0）。 */
    record AgentRegistrationCmd(String agentCode, String name, OwnerProduct ownerProduct,
                                List<String> sceneCodes, AutonomyPolicyApi.AutonomyLevel defaultAutonomy) {
    }

    /** 智能体归属产品集群。KAIWU 为开物预留（一期不派发，但注册通道先占位）。 */
    enum OwnerProduct {
        LINGXI, KAIWU
    }

    /** 注册信息只读视图。status：CREATED / ACTIVE / SUSPENDED。 */
    record AgentView(Long id, String agentCode, String name, OwnerProduct ownerProduct, String status) {
    }
}
