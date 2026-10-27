/**
 * 工作台 + 角色工作台 — 领域层（UW- / RW-）。
 *
 * <p>实体 · 值对象 · 领域服务 · 仓储接口。禁止依赖 Spring / MyBatis / HTTP 等任何框架（ArchUnit 强制校验）。
 *
 * <p>强制规则（技术规约2.0 §2.2）：依赖只能单向 {@code app -> domain <- infra}；
 * 跨模块只能依赖目标模块的 api 包；domain 层禁止依赖框架；api 包只放 DTO/接口/事件。
 * <p>由 yuanshu-platform 的 ArchitectureRuleTest 以 ArchUnit 在 CI 强制校验。
 */
package com.lingxi.wb.domain;
