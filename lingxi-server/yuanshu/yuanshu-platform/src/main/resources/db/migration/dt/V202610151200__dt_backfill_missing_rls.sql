-- ============================================================================
-- 灵犀系统 L1 数据底座 · RLS 缺口补齐迁移（DT-）
--
-- 依据：ADR-0004 V2 §影响与后续约束·2026-10-14 采纳
--       技术规约 2.0 §4.9.4 租户四道防线之「PG RLS 兜底」
--
-- 背景：V202609111040__dt_init_baseline.sql 仅对 dt_entity_company /
--       dt_entity_source_map / dt_knowledge_embedding 三表开启 RLS。
--       其余带 tenant_id 的 dt_* 表存在第三道防线缺口，本迁移一次性补齐。
--
-- 覆盖：9 张表（含 ADR-0004 §68 点名的 8 张 + 同批核查新发现的 dt_name_suffix_dict）
--       写法与既有 p_dt_entity_company_tenant 严格一致：
--         USING (tenant_id = sys_current_tenant())
--         WITH CHECK (tenant_id = sys_current_tenant())
--
-- 未覆盖（本 Wave 之外）：
--       dt_entity_contact / dt_account_asset / mkg_social_account / mkg_unsubscribe
--       —— 表本身尚未创建，属"新表建表 Wave"，建表时必须一次带 tenant_id + RLS。
-- ============================================================================

-- ① 数据源接入（DT-01）
ALTER TABLE dt_data_source ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_data_source_tenant ON dt_data_source
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ② 归并人工确认队列（DT-02）· ADR-0004 §67 特别点名
ALTER TABLE dt_entity_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_entity_review_queue_tenant ON dt_entity_review_queue
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ③ 实体关系边（DT-02）
ALTER TABLE dt_entity_relation ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_entity_relation_tenant ON dt_entity_relation
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ④ 名称规范化后缀词典（DT-02）· 同批核查发现，ADR-0004 §68 未点名但同类缺口
ALTER TABLE dt_name_suffix_dict ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_name_suffix_dict_tenant ON dt_name_suffix_dict
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ⑤ 指标注册表（DT-04/05）
ALTER TABLE dt_metric_definition ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_metric_definition_tenant ON dt_metric_definition
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ⑥ 标签主表（DT-04/05）
ALTER TABLE dt_tag ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_tag_tenant ON dt_tag
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ⑦ 标签关系表（DT-04/05）
ALTER TABLE dt_tag_relation ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_tag_relation_tenant ON dt_tag_relation
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ⑧ 数据质量规则（DT-06）
ALTER TABLE dt_quality_rule ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_quality_rule_tenant ON dt_quality_rule
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ⑨ 数据质量问题（DT-06）
ALTER TABLE dt_quality_issue ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_quality_issue_tenant ON dt_quality_issue
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());
