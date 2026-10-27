package com.yuanshu.starter.mybatis;

import com.baomidou.mybatisplus.extension.plugins.handler.TenantLineHandler;
import com.yuanshu.starter.core.tenant.TenantContext;
import net.sf.jsqlparser.expression.Expression;
import net.sf.jsqlparser.expression.LongValue;

/**
 * 租户隔离第一道防线：SQL 自动追加 {@code tenant_id = ?}（§4.9.4 ①）。
 *
 * <p>为什么放在插件层而不是让业务写 where：插件是全局强制，业务漏写不可能发生；
 * 第二道防线是数据权限过滤，第三道是 PostgreSQL RLS 兜底。
 */
public class YuanshuTenantLineHandler implements TenantLineHandler {

    private final TenantTableWhiteList whiteList;

    public YuanshuTenantLineHandler(TenantTableWhiteList whiteList) {
        this.whiteList = whiteList;
    }

    @Override
    public Expression getTenantId() {
        return new LongValue(TenantContext.currentTenantId());
    }

    @Override
    public String getTenantIdColumn() {
        return whiteList.getTenantColumn();
    }

    @Override
    public boolean ignoreTable(String tableName) {
        // 白名单外的表一律注入租户条件；缺租户上下文的请求在上游已被拒绝
        return !whiteList.isEnabled() || whiteList.getWhiteTables().contains(tableName.toLowerCase());
    }
}
