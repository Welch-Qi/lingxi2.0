package com.yuanshu.starter.mybatis;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.autoconfigure.SqlSessionFactoryBeanCustomizer;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.BlockAttackInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.OptimisticLockerInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.yuanshu.starter.core.web.PageResult;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * 数据访问统一装配：租户插件 / 分页 / 乐观锁 / 防全表更新删除。
 *
 * <p>拦截器顺序不可调整：租户必须在分页之前，否则分页 count 不会带租户条件。
 */
@AutoConfiguration
@EnableConfigurationProperties(TenantTableWhiteList.class)
public class YuanshuMybatisAutoConfiguration {

    // 注意：TenantTableWhiteList 已由 @EnableConfigurationProperties 注册为 Bean
    // （名为 yuanshu.tenant-<FQCN>），此处**不得**再声明 @Bean 方法，
    // 否则同名两个 Bean 导致启动失败：
    //   "Parameter 0 of method mybatisPlusInterceptor ... required a single bean, but 2 were found"
    // @ConditionalOnMissingBean 也挡不住 —— @EnableConfigurationProperties 注册的 Bean
    // 在更早的 ConfigurationPropertiesBindingPostProcessor 阶段完成注册。
    // 该类必须保留 @ConfigurationProperties 注解（需从 yuanshu.tenant.* 绑定白名单配置）。

    @Bean
    @ConditionalOnMissingBean
    public MybatisPlusInterceptor mybatisPlusInterceptor(TenantTableWhiteList whiteList) {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        // ① 租户隔离（必须第一）
        interceptor.addInnerInterceptor(new TenantLineInnerInterceptor(new YuanshuTenantLineHandler(whiteList)));
        // ② 分页：单页上限 200（§4.3.1）
        PaginationInnerInterceptor pagination = new PaginationInnerInterceptor(DbType.POSTGRE_SQL);
        pagination.setMaxLimit((long) PageResult.MAX_PAGE_SIZE);
        interceptor.addInnerInterceptor(pagination);
        // ③ 乐观锁 version；冲突返回 010006（§4.1.4）
        interceptor.addInnerInterceptor(new OptimisticLockerInnerInterceptor());
        // ④ 阻断全表更新与删除
        interceptor.addInnerInterceptor(new BlockAttackInnerInterceptor());
        return interceptor;
    }

    /**
     * 租户隔离第三道防线：写入 PostgreSQL 会话变量 {@code app.tenant_id}，
     * 使 RLS 策略（{@code tenant_id = sys_current_tenant()}）在应用连接下真正生效。
     *
     * <p>与上面 ① 的 {@code TenantLineInnerInterceptor} 是<b>互补</b>关系，不是重复：
     * ① 在 SQL 文本上追加 {@code tenant_id = ?}（第一道防线）；
     * 本组件在连接上设置会话变量，让数据库侧的 RLS 兜底（第三道防线）能读到租户。
     * 缺本组件时 RLS 恒读到 NULL → 所有查询 0 行可见（fail-closed）。
     *
     * <p>注册为独立 MyBatis 拦截器（非 InnerInterceptor）：InnerInterceptor 作用于
     * SQL 改写阶段，拿不到 Connection；本组件需在 StatementHandler.prepare 阶段
     * 拿到同一连接执行 {@code set_config}，故走 {@code Interceptor} 插件通道。
     */
    @Bean
    @ConditionalOnMissingBean
    public YuanshuRlsSessionInterceptor yuanshuRlsSessionInterceptor() {
        return new YuanshuRlsSessionInterceptor();
    }

    /**
     * 把 RLS 会话变量拦截器挂进 MyBatis 插件链。
     *
     * <p>MyBatis-Plus 的 {@code MybatisPlusAutoConfiguration} 只收集
     * {@code MybatisPlusInterceptor}（InnerInterceptor 通道），<b>不注入</b>
     * {@code Interceptor[]} —— 独立 {@code Interceptor} 必须经
     * {@link SqlSessionFactoryBeanCustomizer} 显式 {@code setPlugins}，
     * 否则 Bean 存在但不生效（易误判为「拦截器没跑」）。
     */
    @Bean
    @ConditionalOnMissingBean
    public SqlSessionFactoryBeanCustomizer yuanshuSqlSessionFactoryBeanCustomizer(
            YuanshuRlsSessionInterceptor rlsInterceptor) {
        return factoryBean -> factoryBean.setPlugins(rlsInterceptor);
    }
}
