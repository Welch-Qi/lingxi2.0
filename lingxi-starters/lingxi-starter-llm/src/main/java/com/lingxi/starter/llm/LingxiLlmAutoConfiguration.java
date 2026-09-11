package com.lingxi.starter.llm;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

/**
 * LLM 能力装配。
 *
 * <p>模型注册表来自 config/model.yml（唯一允许出现模型名的地方，§4.13.1）；
 * API Key 来自环境变量 / 密钥服务，禁止入库入代码（§3.5 F4）。
 */
@AutoConfiguration
public class LingxiLlmAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public GuardrailChain guardrailChain() {
        return new DefaultGuardrailChain();
    }

    /** 兜底实现：真实实现在 lingxi-platform 接入模型厂商后覆盖。 */
    static class DefaultGuardrailChain implements GuardrailChain {
        @Override
        public String sanitizeInput(String rawInput) {
            return rawInput;
        }

        @Override
        public void validateOutput(String output, String outputSchema) {
            // 结构化 Schema 校验在模型网关实现处完成（§4.6.7）
        }
    }
}
