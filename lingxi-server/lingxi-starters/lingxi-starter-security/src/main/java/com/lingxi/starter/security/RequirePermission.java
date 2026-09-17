package com.lingxi.starter.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 功能权限声明（§4.8.1 / 附录C）：权限码格式 {@code {域}:{对象}:{动作}}，如 cus:lead:assign。
 *
 * <p>禁止业务代码自写权限判断、禁止模块私有 ACL 表（§4.9.2）。
 * <p>为什么不放在 JWT 里：JWT 只放摘要，完整权限实时走 Casbin 决策，撤权即时生效。
 */
@Documented
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {

    /** 需要的权限码；多个为「与」关系。 */
    String[] value();

    /** 是否要求全部满足。默认 true。 */
    boolean requireAll() default true;
}
