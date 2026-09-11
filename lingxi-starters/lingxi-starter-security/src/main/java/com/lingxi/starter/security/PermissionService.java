package com.lingxi.starter.security;

import org.casbin.jcasbin.main.Enforcer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 权限决策入口（Casbin 三层：功能 / 行级 / 字段，§4.9.2）。
 *
 * <p>性能设计：Enforcer 全量策略常驻内存，决策为本地内存计算（微秒级）；
 * 策略变更经 Valkey 发布订阅通知各实例重载，保障撤权即时生效。
 */
public class PermissionService {

    private static final Logger log = LoggerFactory.getLogger(PermissionService.class);

    private final Enforcer enforcer;

    public PermissionService(Enforcer enforcer) {
        this.enforcer = enforcer;
    }

    /** 功能权限：subject=userId, object=权限码, action=access。 */
    public boolean hasPermission(Long userId, String permCode) {
        if (userId == null || permCode == null || permCode.isBlank()) {
            return false;
        }
        boolean allowed = enforcer.enforce(String.valueOf(userId), permCode, "access");
        if (log.isDebugEnabled()) {
            log.debug("BIZ|perm|enforce|{}|{}|{}", userId, permCode, allowed);
        }
        return allowed;
    }

    /** 策略变更后重载（由配置中心变更事件触发）。 */
    public void reload() {
        enforcer.loadPolicy();
        log.info("BIZ|perm|policy|reloaded");
    }
}
