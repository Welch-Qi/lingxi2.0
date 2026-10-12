package com.yuanshu.sem.api;

import java.util.List;

/**
 * 行业本体查询 —— 五类语义：产品 / 物料 / 工序 / 设备 / 能源（含质量与碳扩展字段）。
 *
 * <p>所有产品读同一份行业本体，不允许私建（三产品规划 §3.2 唯一语义接口）。
 * 开物的行业包建立在元枢本体之上；灵犀商品主数据的产品本体与唯一产品 ID 亦源于此（OP-PRD-01 / PC-01）。
 */
public interface OntologyQueryApi {

    /** 按本体节点 ID 取只读视图。 */
    ConceptView getById(Long id);

    /** 按语义类别 + 关键词检索本体节点（术语字典 / 编码体系同口径）。 */
    List<ConceptView> search(OntologyKind kind, String keyword);

    /** 五类语义本体类别。 */
    enum OntologyKind {
        PRODUCT, MATERIAL, PROCESS, EQUIPMENT, ENERGY
    }

    /** 本体节点只读视图。id 为雪花 Long（技术规约2.0 §4.1.3）。 */
    record ConceptView(Long id, OntologyKind kind, String code, String name,
                       String parentCode, String encodingSystem) {
    }
}
