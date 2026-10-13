package com.yuanshu.starter.core.mybatis;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.yuanshu.starter.core.tenant.TenantContext;
import org.apache.ibatis.reflection.MetaObject;

import java.time.Instant;

/**
 * 审计字段自动填充（§4.4.1 / §3.3 D2）。
 *
 * <p>每张业务表必备：id / tenant_id / created_by / created_at / updated_by / updated_at /
 * is_deleted / version，均由本处理器填充，<b>禁止在业务代码手工赋值</b>。
 * <p>时间一律 UTC 存储（§3.3 D6），展示时按用户时区格式化。
 */
public class AuditMetaObjectHandler implements MetaObjectHandler {

    private static final String TENANT_ID = "tenantId";
    private static final String CREATED_BY = "createdBy";
    private static final String CREATED_AT = "createdAt";
    private static final String UPDATED_BY = "updatedBy";
    private static final String UPDATED_AT = "updatedAt";
    private static final String IS_DELETED = "isDeleted";
    private static final String VERSION = "version";

    @Override
    public void insertFill(MetaObject metaObject) {
        Instant now = Instant.now();
        TenantContext.Principal principal = TenantContext.currentOrNull();
        Long userId = principal == null ? null : principal.userId();
        if (principal != null) {
            strictInsertFill(metaObject, TENANT_ID, Long.class, principal.tenantId());
        }
        strictInsertFill(metaObject, CREATED_BY, Long.class, userId);
        strictInsertFill(metaObject, CREATED_AT, Instant.class, now);
        strictInsertFill(metaObject, UPDATED_BY, Long.class, userId);
        strictInsertFill(metaObject, UPDATED_AT, Instant.class, now);
        strictInsertFill(metaObject, IS_DELETED, Integer.class, 0);
        strictInsertFill(metaObject, VERSION, Integer.class, 0);
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        TenantContext.Principal principal = TenantContext.currentOrNull();
        Long userId = principal == null ? null : principal.userId();
        strictUpdateFill(metaObject, UPDATED_BY, Long.class, userId);
        strictUpdateFill(metaObject, UPDATED_AT, Instant.class, Instant.now());
    }
}
