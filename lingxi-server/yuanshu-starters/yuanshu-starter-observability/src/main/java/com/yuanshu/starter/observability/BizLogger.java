package com.yuanshu.starter.observability;

import org.slf4j.Logger;

/**
 * 业务关键动作统一打点（§4.11.1）：格式 {@code BIZ|{域}|{动作}|{实体类型}|{实体ID}|{结果}}。
 *
 * <p>为什么收敛成统一格式：日志可被解析成业务事件流，用于审计追溯与效能分析，
 * 而不是散落成不可解析的自由文本。
 */
public final class BizLogger {

    private BizLogger() {
    }

    public static void info(Logger log, String domain, String action, String entityType,
                            Object entityId, String result) {
        log.info("BIZ|{}|{}|{}|{}|{}", domain, action, entityType, entityId, result);
    }

    public static void warn(Logger log, String domain, String action, String entityType,
                            Object entityId, String result) {
        log.warn("BIZ|{}|{}|{}|{}|{}", domain, action, entityType, entityId, result);
    }

    /**
     * 智能体动作打点：额外携带 agentCode 与 taskId，供效能归集（§4.6.6）。
     */
    public static void agent(Logger log, String domain, String action, String agentCode,
                             Object taskId, String result) {
        log.info("BIZ|{}|{}|AGENT|{}/{}|{}", domain, action, agentCode, taskId, result);
    }
}
