/**
 * 工作台 + 角色工作台 — 基础设施层（UW- / RW-）。
 *
 * <p>仓储实现 · 外部适配器（连接器 / MCP 工具 / 数据源）。禁止写业务判断。
 *
 * <p>强制规则（技术规约2.0 §2.2）：依赖只能单向 {@code app -> domain <- infra}；
 * 跨模块只能依赖目标模块的 api 包；domain 层禁止依赖框架；api 包只放 DTO/接口/事件。
 * <p>由 lingxi-platform 的 ArchitectureRuleTest 以 ArchUnit 在 CI 强制校验。
 */
package com.lingxi.wb.infra;
