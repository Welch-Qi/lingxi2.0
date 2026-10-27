-- ============================================================================
-- 灵犀系统 L1 数据底座 · 移除 dt_account_asset 表级唯一约束（DT-）
--
-- 依据：ADR-0004 V2 §70（2026-10-14 采纳·A1 顺代码）
--       02-data §1.4 `dt_account_asset` 字段级定义（V0.7）
--
-- 背景（缺陷来源）：
--   V202610161200__dt_new_tables_contact_and_account.sql 建表时同时声明了
--     ① CONSTRAINT uk_dt_account_asset UNIQUE (tenant_id, asset_code)   -- 表级全列唯一
--     ② CREATE UNIQUE INDEX uk_dt_account_asset_active
--          ON dt_account_asset (tenant_id, asset_code) WHERE is_deleted = 0
--   ② 正是 ADR-0004 V2 §70 与 02-data V0.7 要求的「UNIQUE(tenant_id, 业务键) WHERE is_deleted=0」
--   部分唯一索引 —— 其设计意图是**允许软删除后用同一业务键重建**（如账号资产停用后重新接入）。
--   但 ① 是表级全列唯一约束，**不区分 is_deleted**，与 ② 语义冲突。
--
--   真库实测（PostgreSQL 17.11 / lingxi2，2026-10-20）复现：
--     1) 租户 1001 插入 asset_code=ACC1（未删）        -> 成功
--     2) 软删除 is_deleted=1
--     3) 再插入同 asset_code                           -> 失败：
--        ERROR: duplicate key value violates unique constraint "uk_dt_account_asset"
--        DETAIL: Key (tenant_id, asset_code)=(1001, ACC1) already exists.
--   即「停用后无法重新接入同名账号资产」，与部分唯一索引的设计意图相反。
--
--   对照：mkg_unsubscribe / mkg_social_account 仅声明部分唯一索引，
--         软删后可正常重建 —— 行为一致，本迁移将 dt_account_asset 拉齐。
--
-- 处理：删除冗余的表级唯一约束，保留 uk_dt_account_asset_active 部分唯一索引。
--       ⚠️ 已执行的历史脚本 V202610161200 禁止修改（规约 §3.3 D8），
--          故以本 Wave 迁移修正，不回改原脚本。
--
-- 影响：仅放宽 dt_account_asset 的 (tenant_id, asset_code) 唯一性口径，
--       活跃行（is_deleted=0）仍受 uk_dt_account_asset_active 约束 —— 唯一性保障不变。
-- ============================================================================

ALTER TABLE dt_account_asset DROP CONSTRAINT uk_dt_account_asset;

-- 说明：uk_dt_account_asset_active 是 UNIQUE **索引**（非表约束），故用 COMMENT ON INDEX。
COMMENT ON INDEX uk_dt_account_asset_active IS
    '租户内账号资产编码唯一（仅约束未删除行）：软删除后可复用同一 asset_code 重新接入。ADR-0004 V2 §70。';
