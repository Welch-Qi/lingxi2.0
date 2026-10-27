package com.yuanshu.starter.llm;

/**
 * 模型调用结果。
 *
 * @param content      模型输出文本
 * @param modelCode    实际命中的模型编码（来自 model.yml，用于计量与观测）
 * @param promptTokens 提示 Token 数
 * @param outputTokens 输出 Token 数
 * @param degraded     是否发生降级（主模型不可用，已切备用模型或规则兜底）
 */
public record ModelResponse(
        String content,
        String modelCode,
        long promptTokens,
        long outputTokens,
        boolean degraded) {
}
