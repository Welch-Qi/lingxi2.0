package com.yuanshu.starter.core.error;

/**
 * 错误码契约。实现类只能是枚举（错误码表见技术规约2.0 附录A）。
 *
 * <p>为什么用接口而不是常量类：让错误码携带 i18n 键，前端可直接按 messageKey 渲染本地化提示，
 * 无需在后端硬编码中文文案（§4.10 国际化规约）。
 */
public interface ErrorCode {

    /** 6 位整数 AABBCC：AA 模块段 / BB 子模块段 / CC 序号。 */
    int code();

    /** 面向开发者的英文描述（进日志与排查文档）。 */
    String message();

    /** 面向用户的 i18n 键（前端按当前语言渲染）。 */
    String messageKey();
}
