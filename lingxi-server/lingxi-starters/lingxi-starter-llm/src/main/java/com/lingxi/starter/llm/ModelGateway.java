package com.lingxi.starter.llm;

import java.util.Map;

/**
 * 统一模型网关（§4.6.2 / §4.8.1「LLM 调用」强制接入项）。
 *
 * <p>强制约束：
 * <ul>
 *   <li>所有 LLM 调用经此网关，禁止业务代码直连模型厂商 API；
 *   <li>每次调用必须携带租户 ID（Token 计量归账）· 场景码 · traceId；
 *   <li>超时：流式首 token 10s，非流式 30s；重试由网关统一（换模型重试），业务侧不重试；
 *   <li>降级链：主模型 → 备用模型 → 规则兜底，降级必须记录并可观测；
 *   <li>成本控制：租户级 Token 预算 + 单任务上限 + 语义缓存。
 * </ul>
 */
public interface ModelGateway {

    /**
     * 单轮对话（业务内嵌 AI 场景，与业务同事务的低延迟调用）。
     *
     * @param scene   场景码，决定实际模型与参数
     * @param prompt  已渲染并完成 PII 脱敏的提示词（禁止内联提示词字符串，§4.6.3）
     * @param options 可选参数（温度、最大 Token、结构化输出 Schema 等）
     */
    ModelResponse chat(ModelScene scene, String prompt, Map<String, Object> options);

    /**
     * 结构化输出：要求模型返回符合 Schema 的 JSON，不合规拒绝执行（§4.6.7）。
     */
    <T> T chatForEntity(ModelScene scene, String prompt, Class<T> responseType);

    /** 文本向量化（知识 / 话术 / 画像 embedding），入 pgvector。 */
    float[] embed(ModelScene scene, String text);
}
