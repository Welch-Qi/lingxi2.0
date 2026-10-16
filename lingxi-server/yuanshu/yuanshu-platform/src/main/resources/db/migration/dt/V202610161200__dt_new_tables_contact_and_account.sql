-- ============================================================================
-- 灵犀系统 L1 数据底座 · 新增实体联系人与触达账号资产（DT-）
--
-- 依据：ADR-0004 V2 §69/§70（2026-10-14 采纳·本 Wave 2026-10-16 落地）
--       02-data §2.2 `dt_entity_contact`、§1.4 `dt_account_asset` 字段级定义
--
-- 承 ADR-0004 V2 强制约束：
--   §69：dt_entity_contact 须带 tenant_id + RLS，不得建成无 tenant_id 的公域表
--   §70：dt_account_asset UNIQUE(tenant_id, asset_code) WHERE is_deleted=0；RLS 兜底
-- ============================================================================

-- ---------------------------------------------------------------- 企业级联系人（DT-02 §2.2）
CREATE TABLE dt_entity_contact (
    id                  BIGINT        NOT NULL,
    tenant_id           BIGINT        NOT NULL,
    entity_id           BIGINT        NOT NULL,
    name                VARCHAR(128)  NOT NULL,
    title               VARCHAR(128),
    email               VARCHAR(256),
    phone               VARCHAR(32),
    linkedin            VARCHAR(256),
    channel_json        JSONB,
    role_tags_json      JSONB,
    confidence          NUMERIC(4,3),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted          SMALLINT      NOT NULL DEFAULT 0,
    version             INT           NOT NULL DEFAULT 0,
    source_type         VARCHAR(16)   NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT pk_dt_entity_contact PRIMARY KEY (id)
);
COMMENT ON TABLE dt_entity_contact IS '企业级"人"权威表（Wave 0 ① 已定：L1 存人、L2 存客户内角色）。cus_contact.entity_contact_id 可空引用本表';
COMMENT ON COLUMN dt_entity_contact.entity_id IS '→ dt_entity_company.id（FK 关系由应用层维护，禁跨租户）';
COMMENT ON COLUMN dt_entity_contact.channel_json IS '多通道 JSONB（WhatsApp/微信/电话…），承前端 channel-data.ts';
COMMENT ON COLUMN dt_entity_contact.role_tags_json IS '决策/采购/技术等角色标签（E45 对应 cus_contact.role_type 的 L1 维度）';

CREATE INDEX idx_dt_entity_contact_entity ON dt_entity_contact (tenant_id, entity_id);
CREATE INDEX idx_dt_entity_contact_email ON dt_entity_contact USING gin (email gin_trgm_ops);
CREATE INDEX idx_dt_entity_contact_name ON dt_entity_contact USING gin (name gin_trgm_ops);

ALTER TABLE dt_entity_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_entity_contact_tenant ON dt_entity_contact
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ---------------------------------------------------------------- 触达账号资产（DT-01 §1.4 P0-4）
CREATE TABLE dt_account_asset (
    id                      BIGINT        NOT NULL,
    tenant_id               BIGINT        NOT NULL,
    asset_code              VARCHAR(64)   NOT NULL,
    channel_type            VARCHAR(16)   NOT NULL,
    provider                VARCHAR(64),
    display_name            VARCHAR(128),
    account_identifier      VARCHAR(256),
    credential_ref          VARCHAR(128)  NOT NULL,
    health_status           VARCHAR(16),
    rate_limit              INTEGER,
    is_active               BOOLEAN       NOT NULL DEFAULT true,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by              BIGINT,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted              SMALLINT      NOT NULL DEFAULT 0,
    version                 INT           NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_account_asset PRIMARY KEY (id),
    CONSTRAINT uk_dt_account_asset UNIQUE (tenant_id, asset_code)
);
COMMENT ON TABLE dt_account_asset IS '触达账号资产（P0-4 合规骨架）：发送类渠道（邮件/WhatsApp/社媒）账号凭证管理。连接器按 asset_code 引用，不自存凭证（双份真相禁止）。§4.7.4【强制】';
COMMENT ON COLUMN dt_account_asset.channel_type IS 'E51 渠道类型';
COMMENT ON COLUMN dt_account_asset.credential_ref IS '凭证引用 ID → 密钥管理服务，禁存明文、永不出网关（🔴安全红线·§3.5 F4）';
COMMENT ON COLUMN dt_account_asset.health_status IS 'E15 复用（账号健康度：HEALTHY/WARNING/DISABLED…）';
COMMENT ON COLUMN dt_account_asset.rate_limit IS '该账号发送频控上限（连接器 rateLimit 依据）';

CREATE UNIQUE INDEX uk_dt_account_asset_active ON dt_account_asset (tenant_id, asset_code) WHERE is_deleted = 0;
CREATE INDEX idx_dt_account_asset_channel ON dt_account_asset (tenant_id, channel_type, is_active);

ALTER TABLE dt_account_asset ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_account_asset_tenant ON dt_account_asset
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());
