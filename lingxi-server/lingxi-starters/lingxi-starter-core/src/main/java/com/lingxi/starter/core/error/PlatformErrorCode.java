package com.lingxi.starter.core.error;

/**
 * 平台级与跨域公共错误码（技术规约2.0 附录A，模块段 01 / 02 / 60）。
 *
 * <p>各业务模块的错误码枚举按模块段自行定义，禁止复用平台段码值。
 */
public enum PlatformErrorCode implements ErrorCode {

    UNAUTHENTICATED(10001, "unauthenticated", "common.error.unauthenticated"),
    NO_FUNCTION_PERMISSION(10002, "no function permission", "common.error.noPermission"),
    NO_DATA_PERMISSION(10003, "no data permission", "common.error.noDataPermission"),
    PARAM_INVALID(10004, "parameter invalid", "common.error.paramInvalid"),
    RESOURCE_NOT_FOUND(10005, "resource not found", "common.error.notFound"),
    RESOURCE_CONFLICT(10006, "resource conflict", "common.error.conflict"),
    IDEMPOTENT_CONFLICT(10007, "idempotent conflict", "common.error.idempotent"),
    TENANT_QUOTA_EXCEEDED(10008, "tenant quota exceeded", "common.error.quotaExceeded"),
    RATE_LIMITED(10009, "rate limited", "common.error.rateLimited"),
    FEATURE_DISABLED(10010, "feature disabled", "common.error.featureDisabled"),

    SYSTEM_ERROR(19999, "internal system error", "common.error.system"),

    CHANNEL_EMAIL_FAILED(20001, "email channel failed", "connector.error.email"),
    CHANNEL_WHATSAPP_FAILED(20002, "whatsapp channel failed", "connector.error.whatsapp"),
    CHANNEL_SOCIAL_FAILED(20003, "social platform failed", "connector.error.social"),
    DATA_SOURCE_PULL_FAILED(20004, "external data source pull failed", "connector.error.dataSource"),

    LLM_CALL_FAILED(600001, "llm call failed (degraded)", "agent.error.llm"),
    AGENT_TASK_FAILED(600002, "agent task failed (escalated to human)", "agent.error.taskFailed"),
    /** 越界拦截：超出智能体职责，已转人工（§4.6.5）。 */
    AGENT_OUT_OF_BOUNDARY(600003, "agent out of boundary (escalated to human)", "agent.error.outOfBoundary"),
    /** 自主度不足：待人工审批（§4.6.5）。 */
    AGENT_NEEDS_APPROVAL(600004, "agent needs human approval", "agent.error.needsApproval"),
    AGENT_BUDGET_EXCEEDED(600005, "agent token budget exceeded", "agent.error.budgetExceeded");

    private final int code;
    private final String message;
    private final String messageKey;

    PlatformErrorCode(int code, String message, String messageKey) {
        this.code = code;
        this.message = message;
        this.messageKey = messageKey;
    }

    @Override
    public int code() {
        return code;
    }

    @Override
    public String message() {
        return message;
    }

    @Override
    public String messageKey() {
        return messageKey;
    }
}
