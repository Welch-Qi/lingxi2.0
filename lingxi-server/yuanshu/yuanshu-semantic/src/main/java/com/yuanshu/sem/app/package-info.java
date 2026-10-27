/**
 * 元枢 · 语义管理 — 应用层（CC-01~04 / DT-05 / KC-01~06 / IP-*）。
 *
 * <p>Controller 与应用服务（用例编排）· 事务边界（@Transactional 只出现在此层）· 状态机推进 · 事件发布。禁止写 SQL，禁止直接调 Mapper。
 *
 * <p>强制规则（技术规约2.0 §2.2）：依赖只能单向 {@code app -> domain <- infra}；
 * 跨模块只能依赖目标模块的 api 包；domain 层禁止依赖框架；api 包只放 DTO/接口/事件。
 * <p>由 yuanshu-platform 的 ArchitectureRuleTest 以 ArchUnit 在 CI 强制校验。
 */
package com.yuanshu.sem.app;