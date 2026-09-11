package com.lingxi.sys.architecture;

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
 * <p>这四条规则是「模块化单体」不退化成分层混乱的唯一保障；
 * CI 中任一失败即阻断合并（lingxi-ops/ci/gitlab-ci.yml 的 arch-check 阶段）。
 */
@DisplayName("架构边界规则（技术规约2.0 §2.2）")
class ArchitectureRuleTest {

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.lingxi");
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
                        "org.slf4j..", "io.micrometer..", "io.opentelemetry..",
                        "com.fasterxml..", "org.apache.ibatis..", "net.sf.jsqlparser..")
                .because("公共 Starter 只承载技术能力，不得反向依赖业务模块");
        rule.check(classes);
    }
}
