package com.lingxi.starter.security;

import com.lingxi.starter.core.error.BizException;
import com.lingxi.starter.core.error.PlatformErrorCode;
import com.lingxi.starter.core.tenant.TenantContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.core.annotation.Order;

import java.util.Arrays;

/**
 * 权限注解切面：所有带 {@link RequirePermission} 的入口在执行业务前完成校验。
 *
 * <p>红线提示（技术规约2.0 附录E ②）：本文件属「租户隔离与权限」红线，
 * diff 命中即冻结 PR，必须人工 Review，禁止自动合并。
 */
@Aspect
@Order(1)
public class RequirePermissionAspect {

    private final PermissionService permissionService;

    public RequirePermissionAspect(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Before("@annotation(requirePermission)")
    public void check(RequirePermission requirePermission) {
        Long userId = TenantContext.currentUserId();
        String[] codes = requirePermission.value();
        boolean allowed = requirePermission.requireAll()
                ? Arrays.stream(codes).allMatch(code -> permissionService.hasPermission(userId, code))
                : Arrays.stream(codes).anyMatch(code -> permissionService.hasPermission(userId, code));
        if (!allowed) {
            throw new BizException(PlatformErrorCode.NO_FUNCTION_PERMISSION, String.join(",", codes));
        }
    }
}
