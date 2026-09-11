package com.lingxi.starter.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 数据权限声明（行级，§4.9.2）。与 PostgreSQL RLS 组成双重防线。
 *
 * <p>作用维度：归属人 / 部门 / 区域 / 市场。
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireDataScope {

    /** 数据资源标识，如 cus:lead。 */
    String resource();

    /** 取值为 {@link DataScope} 名称；留空表示按当前用户配置的动态范围。 */
    String value() default "";
}
