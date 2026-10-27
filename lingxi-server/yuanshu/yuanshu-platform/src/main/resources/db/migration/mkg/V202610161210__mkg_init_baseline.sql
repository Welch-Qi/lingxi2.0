-- ============================================================================
-- 灵犀系统 营销域基线迁移（MKG-）
--
-- 依据：ADR-0004 V2 §70 · 06 §2.1 mkg_unsubscribe · 07 §4.1 mkg_social_account
--       技术规约 2.0 §4.7 触达合规 · §4.2 营销域
--
-- 本文件为 mkg_ 前缀表的首份 Flyway 基线（lingxi-marketing 模块）。
-- 仅建两张已定字段级建模且承 ADR-0004 已结案的表；其余 mkg_ 表留后续 Wave。
-- ============================================================================

-- ---------------------------------------------------------------- 退订名单（06 §2.1 · P0-4②）
CREATE TABLE mkg_unsubscribe (
    id                      BIGINT        NOT NULL,
    tenant_id               BIGINT        NOT NULL,
    channel_type            VARCHAR(16)   NOT NULL,
    target_type             VARCHAR(16)   NOT NULL,
    target_value            VARCHAR(256)  NOT NULL,
    target_norm             VARCHAR(256)  NOT NULL,
    source_campaign_id      BIGINT,
    reason                  VARCHAR(256),
    unsubscribed_at         TIMESTAMPTZ   NOT NULL,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by              BIGINT,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted              SMALLINT      NOT NULL DEFAULT 0,
    version                 INT           NOT NULL DEFAULT 0,
    CONSTRAINT pk_mkg_unsubscribe PRIMARY KEY (id)
);
COMMENT ON TABLE mkg_unsubscribe IS '退订名单（合规必需·承 ADR-0004 V2 租户私域）。触达链路发送前强校验：本租户命中即拦截';
COMMENT ON COLUMN mkg_unsubscribe.channel_type IS 'E51 渠道类型';
COMMENT ON COLUMN mkg_unsubscribe.target_type IS 'E56 退订对象类型（EMAIL/PHONE/SOCIAL…）';
COMMENT ON COLUMN mkg_unsubscribe.target_value IS '退订目标原值（邮箱/号码；敏感值可哈希，见 05-security）';
COMMENT ON COLUMN mkg_unsubscribe.target_norm IS '规范化值（小写邮箱等），唯一索引键';
COMMENT ON COLUMN mkg_unsubscribe.source_campaign_id IS '触发退订的活动（→ mkg_campaign.id，逻辑引用·不建 FK）';

-- 承 ADR-0004 V2 §70：UNIQUE(tenant_id, channel_type, target_norm) WHERE is_deleted=0
CREATE UNIQUE INDEX uk_mkg_unsubscribe_tenant ON mkg_unsubscribe (tenant_id, channel_type, target_norm) WHERE is_deleted = 0;
CREATE INDEX idx_mkg_unsubscribe_target ON mkg_unsubscribe (tenant_id, target_norm);

ALTER TABLE mkg_unsubscribe ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_mkg_unsubscribe_tenant ON mkg_unsubscribe
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

-- ---------------------------------------------------------------- 社媒账号业务档案（07 §4.1）
CREATE TABLE mkg_social_account (
    id                      BIGINT        NOT NULL,
    tenant_id               BIGINT        NOT NULL,
    platform                VARCHAR(16)   NOT NULL,
    handle                  VARCHAR(128)  NOT NULL,
    region_code             VARCHAR(32),
    owner_user_id           BIGINT,
    auth_status             VARCHAR(16)   NOT NULL,
    auth_expire_at          DATE,
    account_asset_id        BIGINT,
    followers               INTEGER,
    health                  SMALLINT,
    posts_30d               INTEGER,
    created_by              BIGINT,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by              BIGINT,
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted              SMALLINT      NOT NULL DEFAULT 0,
    version                 INT           NOT NULL DEFAULT 0,
    CONSTRAINT pk_mkg_social_account PRIMARY KEY (id)
);
COMMENT ON TABLE mkg_social_account IS '社媒账号业务档案（承 ADR-0004 V2 租户私域）。据前端 channel-data.ts SocialAccount。本页盯"号还在不在"——授权到期/被收回/健康度下降使整批排期失效';
COMMENT ON COLUMN mkg_social_account.platform IS 'E67 分发渠道（平台即账号渠道，复用枚举）';
COMMENT ON COLUMN mkg_social_account.handle IS '账号名（@handle/主页路径，语言中立不翻译）';
COMMENT ON COLUMN mkg_social_account.auth_status IS 'E68 授权状态（CONNECTED/EXPIRING/EXPIRED/REVOKED）';
COMMENT ON COLUMN mkg_social_account.auth_expire_at IS '授权到期日（与今天比较得出预警档 daysToExpire）';
COMMENT ON COLUMN mkg_social_account.account_asset_id IS '→ dt_account_asset.id（凭证/密钥权威在 L1 侧，本表仅业务档案）';
COMMENT ON COLUMN mkg_social_account.health IS '健康度 0-100（派生：发布频次不足/违规/资料缺失综合）';

CREATE UNIQUE INDEX uk_mkg_social_account ON mkg_social_account (tenant_id, platform, handle) WHERE is_deleted = 0;
CREATE INDEX idx_mkg_social_account_auth ON mkg_social_account (tenant_id, auth_status, auth_expire_at);

ALTER TABLE mkg_social_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_mkg_social_account_tenant ON mkg_social_account
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());
