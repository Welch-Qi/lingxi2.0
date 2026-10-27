package com.yuanshu.starter.llm;

/**
 * 输入输出护栏（LangChain4j Guardrails 等价能力；§4.6.7 AI 特有风险对策）。
 *
 * <p>三道防线（缺一不可）：
 * <ol>
 *   <li><b>输入护栏</b>：提示词注入模式检测 + 用户输入与系统指令分隔 + PII 脱敏
 *       （敏感字段如成本价、联系方式禁止送入外部模型）；</li>
 *   <li><b>输出护栏</b>：结构化 Schema 强校验（不合规拒绝执行）+ 敏感词与合规检测
 *       （AI 生成内容对外发送前必须过检，命中即阻断并记录）；</li>
 *   <li><b>越界拦截</b>：动作分类与风险规则校验（金额阈值 / 投诉情绪 / 超知识库问题）→ 转人工。</li>
 * </ol>
 */
public interface GuardrailChain {

    /** 输入校验与脱敏，返回可安全送入模型的文本。 */
    String sanitizeInput(String rawInput);

    /** 输出校验；不合规则抛 BizException（600003 越界拦截 / 010004 参数非法）。 */
    void validateOutput(String output, String outputSchema);
}
