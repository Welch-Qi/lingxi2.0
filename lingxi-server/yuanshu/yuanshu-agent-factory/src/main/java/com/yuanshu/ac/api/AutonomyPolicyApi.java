package com.yuanshu.ac.api;

/**
 * 场景自主度解析 —— **运行时唯一自主度判据**（AG-08）。
 *
 * <p>禁止业务代码自行判断能否放行；灵犀六智能体与开物五场景智能体共用同一判据（归口表 §6.3 风险3）。
 * <p>原登记于 lingxi-agent 契约，三产品归口后治理面由元枢智能体工厂承载。
 */
public interface AutonomyPolicyApi {

    /** 解析「智能体 × 场景」的自主度档位；无显式配置时按最严返回 A0（§4.6.5 默认从严）。 */
    AutonomyLevel resolve(String agentCode, String sceneCode);

    /** 自主度档位（A0 全人工确认 ~ A3 全自动）。is_outbound=true 的场景禁止配 A2/A3，DB CHECK 兜底。 */
    enum AutonomyLevel {
        A0, A1, A2, A3
    }
}
