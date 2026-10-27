package com.yuanshu.starter.mybatis;

import com.yuanshu.starter.core.tenant.TenantContext;
import org.apache.ibatis.executor.statement.StatementHandler;
import org.apache.ibatis.plugin.Interceptor;
import org.apache.ibatis.plugin.Intercepts;
import org.apache.ibatis.plugin.Invocation;
import org.apache.ibatis.plugin.Signature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * 租户隔离第三道防线：把租户上下文写入 PostgreSQL 会话变量 {@code app.tenant_id}，
 * 使 RLS 策略（{@code tenant_id = sys_current_tenant()}）在应用连接下真正生效。
 *
 * <p><b>为什么需要它</b>：本仓 23 张表全部 {@code ENABLE ROW LEVEL SECURITY}，
 * 策略谓词统一为 {@code USING (tenant_id = sys_current_tenant())}，
 * 而 {@code sys_current_tenant()} 读的是会话级 {@code app.tenant_id}。
 * 第一道防线（MyBatis-Plus {@code TenantLineInnerInterceptor}）只在 SQL 文本上追加
 * {@code tenant_id = ?}，<b>不会</b>设置该会话变量 ——
 * 若无本组件，RLS 策略恒读到 NULL → 所有查询返回 0 行（fail-closed），
 * 业务一旦接 DB 查询就会「查不到任何数据」。
 *
 * <p><b>为什么挂在 StatementHandler.prepare</b>：该方法在 SQL 真正下发前拿到
 * {@link Connection}，可在<b>同一连接、同一事务</b>内执行
 * {@code set_config('app.tenant_id', ...)}，满足 PostgreSQL 对会话变量的可见性要求。
 * 挂在 Executor 层拿不到 Connection，挂在 Connection 层则过早（此时尚无租户上下文）。
 *
 * <p><b>无租户上下文时显式置空</b>：置空字符串 → {@code sys_current_tenant()} 返回 NULL
 * → RLS 谓词恒为 NULL → 0 行可见。这与「fail-closed」一致（§4.9.4 ③ 兜底），
 * 宁可查不到，也绝不能查到全量（fail-open 是 P0 事故）。
 *
 * <p><b>事务边界</b>：使用 {@code set_config(..., false)}（会话级）而非事务级，
 * 因为 MyBatis 在非事务场景下每次调用都重新设置，会话级可保证「最后一次设置生效」；
 * 连接归还池中前由 HikariCP 的 {@code connectionInitSql} 或下次调用覆盖。
 * 残留风险由「每次调用都重设」消除：即使连接被复用，也会在下一条 SQL 前被覆盖。
 *
 * <p><b>幂等</b>：同一租户重复设置无副作用；跨租户复用连接时必然覆盖，不会串租户。
 */
@Intercepts({
        @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
})
public class YuanshuRlsSessionInterceptor implements Interceptor, Ordered {

    private static final Logger log = LoggerFactory.getLogger(YuanshuRlsSessionInterceptor.class);

    /** 会话变量名，与 {@code sys_current_tenant()} 的实现保持一致。 */
    static final String TENANT_SETTING = "app.tenant_id";

    /** 未设置会话变量时的显式空值（触发 RLS fail-closed）。 */
    private static final String EMPTY = "";

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        Object[] args = invocation.getArgs();
        if (args.length > 0 && args[0] instanceof Connection connection) {
            applyTenant(connection);
        }
        return invocation.proceed();
    }

    /**
     * 在当前连接上设置租户会话变量。
     *
     * <p>失败时**不阻断业务查询**：RLS 会在缺少会话变量的情况下 fail-closed（0 行可见），
     * 属于安全默认；而此处抛异常会让本可正常工作的查询直接失败。
     * 但也不能静默吞掉 —— 通过日志留痕，便于排查「查不到数据」。
     */
    private void applyTenant(Connection connection) {
        String tenantId = resolveTenantId();
        try (Statement statement = connection.createStatement()) {
            // set_config 第三参 false = 会话级（非事务级），保证无事务场景也生效
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '" + escape(tenantId) + "', false)");
        } catch (SQLException e) {
            // 不阻断业务查询：RLS 在缺少会话变量时 fail-closed（0 行可见），属安全默认；
            // 但必须留痕，否则「查不到数据」将无法排查。
            log.warn("设置 RLS 租户会话变量失败（该连接的查询将受 RLS fail-closed 限制，0 行可见）", e);
        }
    }

    /** 取当前租户 ID；无上下文时返回空串（触发 fail-closed）。 */
    private String resolveTenantId() {
        var principal = TenantContext.currentOrNull();
        if (principal == null || principal.tenantId() == null) {
            return EMPTY;
        }
        return String.valueOf(principal.tenantId());
    }

    /** 防注入：只允许数字与负号，其余字符一律拒绝。 */
    private String escape(String value) {
        if (value == null || value.isEmpty()) {
            return EMPTY;
        }
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean ok = (c >= '0' && c <= '9') || (i == 0 && c == '-');
            if (!ok) {
                throw new IllegalArgumentException("非法租户 ID：" + value);
            }
        }
        return value;
    }

    /**
     * 拦截器顺序：RLS 会话变量必须在租户 SQL 改写<b>之前</b>完成，
     * 否则改写后的 SQL 执行时读到的仍是上一次连接的租户。
     */
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    /** 供测试与诊断使用：当前是否可安全执行 RLS 查询。 */
    public static boolean hasTenantContext() {
        var principal = TenantContext.currentOrNull();
        return principal != null && principal.tenantId() != null;
    }
}
