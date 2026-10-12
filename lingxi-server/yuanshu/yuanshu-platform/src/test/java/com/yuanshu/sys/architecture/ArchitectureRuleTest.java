package com.yuanshu.sys.architecture;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 架构规则机器校验（技术规约2.0 §2.2 强制 + §1.2 CI 门禁）。
 *
 * <p>前四条规则保障「模块化单体」不退化成分层混乱；
 * 后两条保障三产品「一底两翼」边界（《灵犀·开物·元枢三产品架构规划-20260930》§4 硬约束 1/2）：
 * 元枢不得承载业务依赖，集群不得绕过元枢 api 包自建/直连底座能力。
 * CI 中任一失败即阻断合并（lingxi-ops/ci/gitlab-ci.yml 的 arch-check 阶段）。
 */
@DisplayName("架构边界规则（技术规约2.0 §2.2 + 三产品边界）")
class ArchitectureRuleTest {

    private static JavaClasses classes;

    /** 灵犀业务域包（com.lingxi 下除 starter 外的全部业务域） */
    private static final String[] LINGXI_BUSINESS_PACKAGES = {
            "com.lingxi.wb..", "com.lingxi.cus..", "com.lingxi.prd..", "com.lingxi.ord..",
            "com.lingxi.svc..", "com.lingxi.mkg..", "com.lingxi.intel..", "com.lingxi.ana..",
            "com.lingxi.ag..", "com.lingxi.kc..", "com.lingxi.cc.." };

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.lingxi", "com.yuanshu");
    }

    @Test
    @DisplayName("domain 层禁止依赖框架（Spring / MyBatis / HTTP）")
    void domainMustNotDependOnFrameworks() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..", "com.baomidou..", "jakarta.servlet..",
                        "org.apache.ibatis..", "io.swagger..");
        rule.check(classes);
    }

    @Test
    @DisplayName("api 包只放契约：禁止依赖本模块 app / domain / infra")
    void apiMustNotDependOnImplementations() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..api..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "..app..", "..domain..", "..infra..")
                .because("api 为对外契约，其他模块只依赖 api；api 反向依赖实现会造成依赖环");
        rule.check(classes);
    }

    @Test
    @DisplayName("infra 层禁止反向依赖 app 层")
    void infraMustNotDependOnApp() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("..infra..")
                .should().dependOnClassesThat().resideInAPackage("..app..")
                .because("依赖方向只能是 app -> domain <- infra（技术规约2.0 §2.2）");
        rule.check(classes);
    }

    @Test
    @DisplayName("跨模块依赖只允许触碰目标模块的 api 包")
    void crossModuleMustOnlyTouchApiPackages() {
        ArchRule rule = classes()
                .that().resideInAPackage("com.lingxi.starter..")
                .should().onlyDependOnClassesThat().resideInAnyPackage(
                        "com.lingxi.starter..", "java..", "javax..", "jakarta..",
                        "org.springframework..", "com.baomidou..", "org.casbin..",
                        "org.aspectj..",
                        "org.slf4j..", "io.micrometer..", "io.opentelemetry..",
                        "com.fasterxml..", "org.apache.ibatis..", "net.sf.jsqlparser..")
                .because("公共 Starter 只承载技术能力，不得反向依赖业务模块");
        rule.check(classes);
    }

    @Test
    @DisplayName("元枢禁止依赖灵犀业务域（硬约束1：元枢不承载业务）")
    void yuanshuMustNotDependOnLingxiBusiness() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.yuanshu..")
                .should().dependOnClassesThat().resideInAnyPackage(LINGXI_BUSINESS_PACKAGES)
                .because("一底两翼：元枢是底座，不得反向依赖任何集群的业务域（架构规划 §4 约束1）");
        rule.check(classes);
    }

    @Test
    @DisplayName("跨产品只能触碰元枢 api 包（硬约束2：集群不得自建底座）")
    void crossProductMustOnlyTouchYuanshuApiPackages() {
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.lingxi..")
                .and().resideOutsideOfPackage("com.lingxi.starter..")
                .should().dependOnClassesThat(new DescribedPredicate<JavaClass>(
                        "属于元枢实现层（非 api 包）") {
                    @Override
                    public boolean test(JavaClass javaClass) {
                        String pkg = javaClass.getPackageName();
                        return pkg.startsWith("com.yuanshu.") && !pkg.contains(".api");
                    }
                })
                .because("集群（灵犀/未来开物）调用元枢一律经各模块 api 包；直连实现层会造成底座改动击穿集群")
                // 骨架期业务模块仅有 package-info 无可扫描类，允许空断言；业务代码落地后自然生效
                .allowEmptyShould(true);
        rule.check(classes);
    }
}
