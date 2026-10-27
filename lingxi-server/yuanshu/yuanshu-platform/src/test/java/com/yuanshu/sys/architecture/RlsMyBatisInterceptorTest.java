package com.yuanshu.sys.architecture;

import com.yuanshu.starter.core.tenant.TenantContext;
import com.yuanshu.starter.mybatis.YuanshuRlsSessionInterceptor;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.Configuration;
import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.apache.ibatis.session.SqlSessionFactoryBuilder;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.postgresql.ds.PGSimpleDataSource;

import javax.sql.DataSource;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * RLS 拦截器在 **MyBatis 真实链路**中的验证。
 *
 * <p>前一个测试（RlsSessionVariableTest）验证的是「{@code set_config} → RLS 生效」这层机制；
 * 本测试验证的是「MyBatis 拦截器链<b>确实调用</b>了本组件」——
 * 若 {@code @Signature} 与 MyBatis 实际方法签名不匹配，拦截器会<b>静默失效</b>
 * （不报错、不生效），只有真正跑一次 MyBatis 查询才能发现。
 *
 * <p>测试用<b>非 owner、非 superuser</b>账号连接：PostgreSQL 规则 ——
 * superuser 与表 owner 默认绕过 RLS，用它们测会得到假象。
 */
@DisplayName("RLS 拦截器：MyBatis 真实链路验证")
@EnabledIfEnvironmentVariable(named = "LX_TEST_DB_URL", matches = ".+")
class RlsMyBatisInterceptorTest {

    /** 租户 A 的测试数据 id。 */
    private static final long TENANT_A_ROW = 99101L;
    /** 租户 B 的测试数据 id。 */
    private static final long TENANT_B_ROW = 99102L;

    private static DataSource adminDs;
    private static DataSource rlsDs;

    /** 极简 Mapper：只查两行固定数据，验证 RLS 过滤效果。 */
    interface ProbeMapper {
        @Select("SELECT id FROM dt_entity_company WHERE id IN (99101, 99102) ORDER BY id")
        List<Long> probe();
    }

    @BeforeAll
    static void setUp() throws Exception {
        String url = System.getenv("LX_TEST_DB_URL");
        adminDs = dataSource(url,
                System.getenv().getOrDefault("LX_TEST_DB_ADMIN_USER", "postgres"),
                System.getenv().getOrDefault("LX_TEST_DB_ADMIN_PASSWORD", ""));
        rlsDs = dataSource(url,
                System.getenv().getOrDefault("LX_TEST_DB_USER", "lx_rls_test"),
                System.getenv().getOrDefault("LX_TEST_DB_PASSWORD", ""));

        seed();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    private static DataSource dataSource(String url, String user, String password) {
        PGSimpleDataSource ds = new PGSimpleDataSource();
        ds.setUrl(url);
        ds.setUser(user);
        ds.setPassword(password);
        return ds;
    }

    private static void seed() throws Exception {
        try (var conn = adminDs.getConnection(); var st = conn.createStatement()) {
            st.execute("""
                    INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
                    VALUES (99101, 99101, 'MP-A', 'MP Tenant A', 'mp tenant a', 1.0)
                    ON CONFLICT (id) DO NOTHING
                    """);
            st.execute("""
                    INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
                    VALUES (99102, 99102, 'MP-B', 'MP Tenant B', 'mp tenant b', 1.0)
                    ON CONFLICT (id) DO NOTHING
                    """);
        }
    }

    /** 构建带 RLS 拦截器的 SqlSessionFactory（模拟 YuanshuMybatisAutoConfiguration 的装配）。 */
    private static SqlSessionFactory buildFactory(DataSource ds) {
        Configuration configuration = new Configuration(
                new Environment("test", new JdbcTransactionFactory(), ds));
        configuration.setMapUnderscoreToCamelCase(true);
        // 与生产 db.yml 一致：一级缓存作用域 = STATEMENT。
        // 默认 SESSION 作用域下，一级缓存跨语句存活 —— 同一 SqlSession 内租户变化时，
        // 第二次相同 SQL 会直接命中缓存而不下发数据库 → 读到上一个租户的数据。
        configuration.setLocalCacheScope(org.apache.ibatis.session.LocalCacheScope.STATEMENT);
        // 与生产一致：把 RLS 拦截器挂进插件链
        configuration.addInterceptor(new YuanshuRlsSessionInterceptor());
        configuration.addMapper(ProbeMapper.class);
        return new SqlSessionFactoryBuilder().build(configuration);
    }

    @Test
    @DisplayName("无租户上下文 → 拦截器置空会话变量 → RLS fail-closed（0 行）")
    void noTenantContextFailsClosed() {
        TenantContext.clear();
        SqlSessionFactory factory = buildFactory(rlsDs);
        try (SqlSession session = factory.openSession(true)) {
            List<Long> ids = session.getMapper(ProbeMapper.class).probe();
            assertTrue(ids.isEmpty(),
                    "无租户上下文时必须 0 行可见（fail-closed）；实际可见 " + ids);
        }
    }

    @Test
    @DisplayName("租户 A 上下文 → 只查到租户 A 的行")
    void tenantASeesOnlyOwnRow() {
        TenantContext.set(new TenantContext.Principal(99101L, 1L, null, "zh-CN"));
        SqlSessionFactory factory = buildFactory(rlsDs);
        try (SqlSession session = factory.openSession(true)) {
            List<Long> ids = session.getMapper(ProbeMapper.class).probe();
            assertEquals(List.of(TENANT_A_ROW), ids, "租户 A 只能看到自己的行");
        }
    }

    @Test
    @DisplayName("租户 B 上下文 → 只查到租户 B 的行（跨租户不可见）")
    void tenantBSeesOnlyOwnRow() {
        TenantContext.set(new TenantContext.Principal(99102L, 2L, null, "zh-CN"));
        SqlSessionFactory factory = buildFactory(rlsDs);
        try (SqlSession session = factory.openSession(true)) {
            List<Long> ids = session.getMapper(ProbeMapper.class).probe();
            assertEquals(List.of(TENANT_B_ROW), ids, "租户 B 只能看到自己的行");
            assertFalse(ids.contains(TENANT_A_ROW), "跨租户不可见");
        }
    }

    @Test
    @DisplayName("连接池复用：不同 SqlSession 换租户 → 可见集随之切换（不串租户）")
    void switchingTenantAcrossSessionsDoesNotLeak() {
        SqlSessionFactory factory = buildFactory(rlsDs);

        TenantContext.set(new TenantContext.Principal(99101L, 1L, null, "zh-CN"));
        try (SqlSession session = factory.openSession(true)) {
            assertEquals(List.of(TENANT_A_ROW), session.getMapper(ProbeMapper.class).probe());
        }

        // 新 SqlSession（连接池可能复用同一物理连接）→ 必须按新租户过滤
        TenantContext.set(new TenantContext.Principal(99102L, 2L, null, "zh-CN"));
        try (SqlSession session = factory.openSession(true)) {
            assertEquals(List.of(TENANT_B_ROW), session.getMapper(ProbeMapper.class).probe(),
                    "连接池复用时不得串租户");
        }
    }

    @Test
    @DisplayName("同一连接切换租户 → 可见数据随之切换（一级缓存作用域须为 STATEMENT）")
    void switchingTenantSwitchesVisibilityOnSameConnection() {
        SqlSessionFactory factory = buildFactory(rlsDs);
        try (SqlSession session = factory.openSession(true)) {
            var mapper = session.getMapper(ProbeMapper.class);

            TenantContext.set(new TenantContext.Principal(99101L, 1L, null, "zh-CN"));
            assertEquals(List.of(TENANT_A_ROW), mapper.probe(), "租户 A 阶段");

            TenantContext.set(new TenantContext.Principal(99102L, 2L, null, "zh-CN"));
            assertEquals(List.of(TENANT_B_ROW), mapper.probe(), "切到租户 B 后应立即换可见集");
        }
    }
}
