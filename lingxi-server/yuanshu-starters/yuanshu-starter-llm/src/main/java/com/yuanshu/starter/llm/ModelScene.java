package com.yuanshu.starter.llm;

/**
 * 模型场景码（§4.6.2）。
 *
 * <p>业务代码只声明场景码，<b>禁止指定具体模型名</b>——模型名只允许出现在 config/model.yml。
 * <p>为什么这样设计：模型可随时替换与升降级（主模型 → 备用模型 → 规则兜底），
 * 若业务代码写死模型名，换模型需要改业务代码并回归全部场景。
 *
 * <p>命名沿用附录C：{@code {域}.{场景}.{动作}}。示例：
 * <pre>
 *   mkg.email.write      邮件撰写
 *   kc.script.suggest    话术推荐
 *   ana.qa.answer        问答式取数
 *   cus.lead.score       线索评分
 *   kc.prompt.embed      知识向量化
 * </pre>
 */
public record ModelScene(String code) {

    public static final ModelScene EMAIL_WRITE = new ModelScene("mkg.email.write");
    public static final ModelScene SCRIPT_SUGGEST = new ModelScene("kc.script.suggest");
    public static final ModelScene QA_ANSWER = new ModelScene("ana.qa.answer");
    public static final ModelScene LEAD_SCORE = new ModelScene("cus.lead.score");
    public static final ModelScene KNOWLEDGE_EMBED = new ModelScene("kc.prompt.embed");
}
