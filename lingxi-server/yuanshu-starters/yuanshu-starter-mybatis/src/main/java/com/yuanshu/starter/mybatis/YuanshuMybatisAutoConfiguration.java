package com.yuanshu.starter.mybatis;

import com.baomidou.mybatisplus.annotation.DbType;
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

    @Bean
    @ConditionalOnMissingBean
    public TenantTableWhiteList tenantTableWhiteList() {
        return new TenantTableWhiteList();
    }

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
}
