/**
 * 营销中心 — 对外契约层（OP-MKT- / BO-MKG-）。
 *
 * <p>本模块唯一对外开放的包：DTO / 模块接口 / 领域事件定义。其他模块只允许依赖本包，禁止依赖本模块的 app / domain / infra。
 *
 * <p>强制规则（技术规约2.0 §2.2）：依赖只能单向 {@code app -> domain <- infra}；
 * 跨模块只能依赖目标模块的 api 包；domain 层禁止依赖框架；api 包只放 DTO/接口/事件。
 * <p>由 lingxi-platform 的 ArchitectureRuleTest 以 ArchUnit 在 CI 强制校验。
 */
package com.lingxi.mkg.api;
