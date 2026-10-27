package com.yuanshu.sys.architecture;

import com.yuanshu.starter.core.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * RLS 第三道防线真库验证（技术规约2.0 §4.9.4 ③）。
 *
 * <p>验证「应用层设置 {@code app.tenant_id} 会话变量 → RLS 策略真正生效」这条链路：
 * <ol>
 *   <li>不设会话变量 → RLS fail-closed（0 行可见）</li>
 *   <li>设 {@code app.tenant_id=租户A} → 只可见租户 A 的行</li>
 *   <li>设 {@code app.tenant_id=租户B} → 只可见租户 B 的行，看不到 A</li>
 * </ol>
 *
 * <p><b>为何直连真库而非 Testcontainers</b>：项目红线禁止 Docker/K8s（§3.2 L7），
 * Testcontainers 必须依赖 Docker 运行时 —— 故用本机 PostgreSQL 17（§3.1 E1）。
 * 未配置 {@code LX_TEST_DB_URL} 时整个测试跳过（CI 无本地库时不误报失败）。
 *
 * <p><b>⚠️ 必须用非 owner、非 superuser 账号连接</b>：PostgreSQL 规则 ——
 * superuser 与表 owner <b>默认绕过 RLS</b>（除非 FORCE ROW LEVEL SECURITY，
 * 本仓 23 张表均未 force）。用 postgres 账号连库测出的「RLS 生效」是<b>假象</b>
 * —— 这正是 verify-tenant-isolation.sh 第⑥项曾踩的坑。
 * 故本测试用 {@code LX_TEST_DB_USER}（默认 lx_rls_test，非 owner 非超管）连接，
 * 造数据与清理另用 admin 连接。
 */
@DisplayName("RLS 第三道防线：app.tenant_id 会话变量与策略联动")
@EnabledIfEnvironmentVariable(named = "LX_TEST_DB_URL", matches = ".+")
class RlsSessionVariableTest {

    private static final String TENANT_SETTING = "app.tenant_id";
    private static final long TENANT_A = 99001L;
    private static final long TENANT_B = 99002L;

    /** 造数据 / 清理用（超管，可绕过 RLS）。 */
    private static Connection admin;
    /** 验证 RLS 用（必须非 owner 非超管，否则绕过 RLS 测不出真东西）。 */
    private static Connection rlsUser;

    private static String url;
    private static String adminUser;
    private static String adminPassword;

    @BeforeAll
    static void setUp() throws Exception {
        url = System.getenv("LX_TEST_DB_URL");
        adminUser = System.getenv().getOrDefault("LX_TEST_DB_ADMIN_USER", "postgres");
        adminPassword = System.getenv().getOrDefault("LX_TEST_DB_ADMIN_PASSWORD", "");
        admin = DriverManager.getConnection(url, adminUser, adminPassword);

        // 验证连接用非 owner 账号
        String rlsUser = System.getenv().getOrDefault("LX_TEST_DB_USER", "lx_rls_test");
        String rlsPassword = System.getenv().getOrDefault("LX_TEST_DB_PASSWORD", "");
        RlsSessionVariableTest.rlsUser = DriverManager.getConnection(url, rlsUser, rlsPassword);

        assertFalse(isSuperuser(), "验证连接必须是非 superuser 账号，否则 RLS 被绕过、测试无效");
        seed();
    }

    /** 当前验证连接是否 superuser（超管会绕过 RLS，测试即失效）。 */
    private static boolean isSuperuser() throws SQLException {
        try (Statement statement = rlsUser.createStatement();
                ResultSet rs = statement.executeQuery("SELECT usesuper FROM pg_user WHERE usename = current_user")) {
            rs.next();
            return rs.getBoolean(1);
        }
    }

    @AfterEach
    void clearTenant() throws SQLException {
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '', false)");
        }
        TenantContext.clear();
    }

    /** 造两条分属不同租户的数据（用 admin 连接，绕过 RLS）。 */
    private static void seed() throws SQLException {
        try (Statement statement = admin.createStatement()) {
            statement.execute("""
                    INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
                    VALUES (99001, 99001, 'RLS-A', 'RLS Tenant A', 'rls tenant a', 1.0)
                    ON CONFLICT (id) DO NOTHING
                    """);
            statement.execute("""
                    INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
                    VALUES (99002, 99002, 'RLS-B', 'RLS Tenant B', 'rls tenant b', 1.0)
                    ON CONFLICT (id) DO NOTHING
                    """);
        }
    }

    private static long visibleCount(long tenantId) throws SQLException {
        try (PreparedStatement ps = rlsUser.prepareStatement(
                "SELECT count(*) FROM dt_entity_company WHERE id IN (99001, 99002)")) {
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                long visible = rs.getLong(1);
                // 查询本身在当前会话的租户上下文下被 RLS 过滤
                return visible;
            }
        }
    }

    @Test
    @DisplayName("未设置 app.tenant_id → RLS fail-closed（0 行可见）")
    void missingTenantContextSeesNothing() throws SQLException {
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '', false)");
        }
        assertEquals(0L, visibleCount(TENANT_A),
                "缺租户上下文时 RLS 必须 fail-closed（0 行），fail-open 即 P0 事故");
    }

    @Test
    @DisplayName("设置 app.tenant_id=租户A → 只可见租户 A 的行")
    void tenantASeesOnlyOwnRows() throws SQLException {
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '" + TENANT_A + "', false)");
        }
        long visible = visibleCount(TENANT_A);
        assertEquals(1L, visible, "租户 A 应只看到自己的 1 行");
        assertFalse(isVisible(99002L), "租户 A 不得看到租户 B 的行");
    }

    @Test
    @DisplayName("设置 app.tenant_id=租户B → 只可见租户 B 的行（跨租户互不可见）")
    void tenantBSeesOnlyOwnRows() throws SQLException {
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '" + TENANT_B + "', false)");
        }
        long visible = visibleCount(TENANT_B);
        assertEquals(1L, visible, "租户 B 应只看到自己的 1 行");
        assertFalse(isVisible(99001L), "租户 B 不得看到租户 A 的行");
    }

    @Test
    @DisplayName("切换租户上下文 → 可见数据随之切换（连接复用不串租户）")
    void switchingTenantSwitchesVisibility() throws SQLException {
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '" + TENANT_A + "', false)");
        }
        assertTrue(isVisible(99001L), "租户 A 应看到 99001");
        assertFalse(isVisible(99002L), "租户 A 不应看到 99002");

        // 同一连接切换租户 —— 模拟连接池复用
        try (Statement statement = rlsUser.createStatement()) {
            statement.execute("SELECT set_config('" + TENANT_SETTING + "', '" + TENANT_B + "', false)");
        }
        assertTrue(isVisible(99002L), "切到租户 B 后应看到 99002");
        assertFalse(isVisible(99001L), "切到租户 B 后不应再看到 99001");
    }

    /** 在当前会话租户上下文下，某 id 是否可见。 */
    private boolean isVisible(long id) throws SQLException {
        try (PreparedStatement ps = rlsUser.prepareStatement(
                "SELECT count(*) FROM dt_entity_company WHERE id = ?")) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                return rs.getLong(1) > 0;
            }
        }
    }

    @Test
    @DisplayName("TenantContext 无上下文时 currentOrNull 返回 null（不抛异常，供 RLS 拦截器判定 fail-closed）")
    void tenantContextAbsentIsNull() {
        TenantContext.clear();
        assertEquals(null, TenantContext.currentOrNull());
    }
}
