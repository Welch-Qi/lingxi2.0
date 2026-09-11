package com.lingxi.starter.mybatis;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 租户列白名单（免注入 tenant_id 的表）。
 *
 * <p>白名单制而非黑名单制：<b>新增表默认必须带租户列</b>（§3.3 D3 / §4.1 全局禁止清单第 9 条）。
 * 仅字典、平台配置等全局共享表可列入白名单，新增白名单项须架构组评审。
 */
@ConfigurationProperties(prefix = "lingxi.tenant")
public class TenantTableWhiteList {

    /** 免注入租户条件的表名（小写，如 sys_dict_type）。 */
    private Set<String> whiteTables = new HashSet<>();

    /** 是否启用租户插件。生产环境禁止关闭。 */
    private boolean enabled = true;

    /** 租户列名，统一 tenant_id，不允许模块自定义。 */
    private String tenantColumn = "tenant_id";

    public Set<String> getWhiteTables() {
        return whiteTables;
    }

    public void setWhiteTables(List<String> tables) {
        this.whiteTables = tables == null ? new HashSet<>() : new HashSet<>(tables);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getTenantColumn() {
        return tenantColumn;
    }

    public void setTenantColumn(String tenantColumn) {
        this.tenantColumn = tenantColumn;
    }
}
