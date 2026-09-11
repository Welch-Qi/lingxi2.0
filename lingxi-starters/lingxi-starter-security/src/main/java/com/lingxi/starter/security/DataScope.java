package com.lingxi.starter.security;

/**
 * 数据权限范围枚举（§4.8.2）。平台统一定义，各模块<b>不得自定义口径</b>。
 */
public enum DataScope {

    /** 仅本人数据。 */
    SELF,

    /** 本部门数据。 */
    DEPT,

    /** 本部门及下级部门数据。 */
    DEPT_AND_SUB,

    /** 自定义范围（按配置的资源集合）。 */
    CUSTOM,

    /** 全部数据（仍受租户隔离约束）。 */
    ALL
}
