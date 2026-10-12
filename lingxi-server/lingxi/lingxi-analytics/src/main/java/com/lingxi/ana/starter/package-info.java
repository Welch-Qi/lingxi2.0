/**
 * 经营分析 — 模块装配层（DM- / OP-BA-）。
 *
 * <p>本模块的 Spring Boot 自动配置装配（@AutoConfiguration + @Configuration）。
 *
 * <p>强制规则（技术规约2.0 §2.2）：依赖只能单向 {@code app -> domain <- infra}；
 * 跨模块只能依赖目标模块的 api 包；domain 层禁止依赖框架；api 包只放 DTO/接口/事件。
 * <p>由 yuanshu-platform 的 ArchitectureRuleTest 以 ArchUnit 在 CI 强制校验。
 */
package com.lingxi.ana.starter;
