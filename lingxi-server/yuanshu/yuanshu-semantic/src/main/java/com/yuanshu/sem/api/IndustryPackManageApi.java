package com.yuanshu.sem.api;

import java.util.List;

/**
 * 行业包管理 —— 五件套（语义字典 / 工艺路线模板 / 碳因子库 / 质量标准模板 / 设备特征库）的注册 / 版本 / 扩展 / 下发（IP-06）。
 *
 * <p>归口规则：行业包**资产托管于元枢，内容由开物维护**（三产品规划 §3.1）；
 * 本接口只承载托管与生命周期治理，不解释业务语义。
 */
public interface IndustryPackManageApi {

    /** 注册行业包版本，返回包版本 ID（雪花 Long）。写操作幂等由调用方携带 X-Idempotency-Key。 */
    Long register(IndustryPackRegisterCmd cmd);

    /** 取行业包只读视图（含版本与状态）。 */
    IndustryPackView get(String packCode, String version);

    /** 注册命令。contentRefs 指向内容存储（本体在元枢、维护界面归属见归口表）。 */
    record IndustryPackRegisterCmd(String packCode, String industryCode, String version,
                                   String maintainerProduct, List<String> contentRefs) {
    }

    /** 行业包只读视图。status：DRAFT / ACTIVE / RETIRED。 */
    record IndustryPackView(String packCode, String industryCode, String version,
                            String maintainerProduct, String status) {
    }
}
