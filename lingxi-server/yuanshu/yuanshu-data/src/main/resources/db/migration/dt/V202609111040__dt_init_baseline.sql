-- ============================================================================
-- 灵犀系统 L1 数据底座基线迁移（DT-）
-- 依据：技术规约2.0 §4.5（L1 数据底座规约）· 架构方案 §4.4
--
-- 定位：L1 不是新的存储系统，而是 PostgreSQL 内的一组规范化表 + 物化视图 + 定时任务。
--       企业实体中心是「数据壁垒枢纽」：三类数据以统一实体 ID 挂接，形成一企一档。
-- ============================================================================

-- ---------------------------------------------------------------- 数据源接入（DT-01）
CREATE TABLE dt_data_source (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    source_code         VARCHAR(64)  NOT NULL,
    source_type         VARCHAR(32)  NOT NULL,
    adapter_class       VARCHAR(256) NOT NULL,
    rate_limit_json     JSONB,
    retry_policy_json   JSONB,
    field_mapping       JSONB,
    credential_ref      VARCHAR(128),
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    health_status       VARCHAR(16),
    last_pull_at        TIMESTAMPTZ,
    watermark_value     VARCHAR(256),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_data_source PRIMARY KEY (id),
    CONSTRAINT uk_dt_data_source UNIQUE (tenant_id, source_code)
);
COMMENT ON TABLE dt_data_source IS '数据源注册。新增数据源 = 新增适配器实现 + 注册配置，不得改动同步主流程（§4.5.1）';
COMMENT ON COLUMN dt_data_source.credential_ref IS '凭证引用 ID，真实凭证走密钥管理，禁止落表明文（§3.5 F4）';
COMMENT ON COLUMN dt_data_source.watermark_value IS '增量水位。断连后从水位续跑，不从头开始（§3.1 E8）';

-- ---------------------------------------------------------------- 企业实体中心（DT-02）
CREATE TABLE dt_entity_company (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    biz_code            VARCHAR(64)  NOT NULL,
    name                VARCHAR(512) NOT NULL,
    name_normalized     VARCHAR(512) NOT NULL,
    domain              VARCHAR(256),
    country_code        VARCHAR(8),
    city                VARCHAR(128),
    industry_code       VARCHAR(64),
    employee_scale      VARCHAR(32),
    confidence          NUMERIC(5, 4) NOT NULL DEFAULT 0,
    is_merged           SMALLINT     NOT NULL DEFAULT 0,
    merged_into_id      BIGINT,
    first_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    source_type         VARCHAR(16)  NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT pk_dt_entity_company PRIMARY KEY (id),
    CONSTRAINT uk_dt_entity_company UNIQUE (tenant_id, biz_code)
);
COMMENT ON TABLE dt_entity_company IS '企业实体主表（一企一档，统一实体 ID）。三类数据在此挂接：海关采购商 / 社媒访客公司 / CRM 客户';
COMMENT ON COLUMN dt_entity_company.name_normalized IS '名称规范化结果（去法律后缀/标点/大小写归一），供 pg_trgm 相似度检索（§4.5.2）';
COMMENT ON COLUMN dt_entity_company.is_merged IS '归并可逆：不物理删除，用 is_merged + merged_into_id，拆分即回滚映射';

-- 域名唯一（强匹配第一优先）
CREATE UNIQUE INDEX uk_dt_entity_domain ON dt_entity_company (tenant_id, lower(domain))
    WHERE domain IS NOT NULL AND is_merged = 0 AND is_deleted = 0;
-- 规范化名称模糊检索（弱匹配，阈值 0.85）
CREATE INDEX idx_dt_entity_name_trgm ON dt_entity_company USING gin (name_normalized gin_trgm_ops);
CREATE INDEX idx_dt_entity_geo ON dt_entity_company (tenant_id, country_code, city, industry_code);

CREATE TABLE dt_entity_source_map (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    entity_id           BIGINT       NOT NULL,
    source_code         VARCHAR(64)  NOT NULL,
    external_id         VARCHAR(256) NOT NULL,
    match_rule          VARCHAR(32),
    match_score         NUMERIC(5, 4),
    raw_snapshot        JSONB,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_entity_source_map PRIMARY KEY (id),
    CONSTRAINT uk_dt_entity_source_map UNIQUE (tenant_id, source_code, external_id)
);
COMMENT ON TABLE dt_entity_source_map IS '多源映射（CUSTOMS / GLOBAL_DB / SOCIAL / CRM / MANUAL）。归并依据与置信度留痕';
CREATE INDEX idx_dt_entity_source_entity ON dt_entity_source_map (tenant_id, entity_id);

CREATE TABLE dt_entity_review_queue (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    candidate_a_id      BIGINT       NOT NULL,
    candidate_b_id      BIGINT       NOT NULL,
    similarity          NUMERIC(5, 4) NOT NULL,
    match_dimensions    JSONB,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    reviewed_by         BIGINT,
    reviewed_at         TIMESTAMPTZ,
    decision_note       TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_entity_review_queue PRIMARY KEY (id)
);
COMMENT ON TABLE dt_entity_review_queue IS '弱匹配人工确认队列（国家+城市+行业一致 且 名称相似度>=0.85）。人工结论必须回写规则库（§4.5.2）';
CREATE INDEX idx_dt_entity_review_pending ON dt_entity_review_queue (tenant_id, status) WHERE status = 'PENDING';

CREATE TABLE dt_entity_relation (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    from_entity_id      BIGINT       NOT NULL,
    to_entity_id        BIGINT       NOT NULL,
    relation_type       VARCHAR(32)  NOT NULL,
    confidence          NUMERIC(5, 4) NOT NULL DEFAULT 0,
    evidence            JSONB,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_entity_relation PRIMARY KEY (id),
    CONSTRAINT uk_dt_entity_relation UNIQUE (tenant_id, from_entity_id, to_entity_id, relation_type)
);
COMMENT ON TABLE dt_entity_relation IS '关系边：CONTACT_OF / SAME_GROUP / SUPPLIER_OF / COMPETITOR_OF。图能力一期用 PG 关系表 + 递归 CTE';
CREATE INDEX idx_dt_entity_relation_from ON dt_entity_relation (tenant_id, from_entity_id, relation_type);

-- 名称规范化后缀词典（可配置，人工纠错回写）
CREATE TABLE dt_name_suffix_dict (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    locale              VARCHAR(16)  NOT NULL,
    suffix              VARCHAR(64)  NOT NULL,
    is_active           SMALLINT     NOT NULL DEFAULT 1,
    hit_count           BIGINT       NOT NULL DEFAULT 0,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_name_suffix_dict PRIMARY KEY (id),
    CONSTRAINT uk_dt_name_suffix UNIQUE (tenant_id, locale, suffix)
);
COMMENT ON TABLE dt_name_suffix_dict IS '多语言法律后缀词典（Ltd/LLC/GmbH/Co.,Ltd/Pty…）。名称规范化必须走统一函数 + 本词典，禁止各模块自写清洗逻辑（§4.5.2）';

-- ---------------------------------------------------------------- 指标体系（DT-04/05）
CREATE TABLE dt_metric_definition (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    metric_code         VARCHAR(64)  NOT NULL,
    name                JSONB,
    formula_type        VARCHAR(32)  NOT NULL,
    sql_template        TEXT         NOT NULL,
    available_dimensions JSONB,
    available_filters   JSONB,
    unit                VARCHAR(16),
    precision_scale     INT          NOT NULL DEFAULT 2,
    owner_user_id       BIGINT,
    version_no          INT          NOT NULL DEFAULT 1,
    is_active           SMALLINT     NOT NULL DEFAULT 1,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_metric_definition PRIMARY KEY (id),
    CONSTRAINT uk_dt_metric_definition UNIQUE (tenant_id, metric_code, version_no)
);
COMMENT ON TABLE dt_metric_definition IS '指标注册表。全系统统一口径，禁止在业务代码或 SQL 里硬编码指标计算逻辑（§4.5.3）';
COMMENT ON COLUMN dt_metric_definition.available_dimensions IS '可用维度白名单。问答式取数只允许使用注册的指标与维度，超范围一律拒绝（§4.6.7）';

CREATE TABLE dt_tag (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    tag_code            VARCHAR(64)  NOT NULL,
    tag_type            VARCHAR(32)  NOT NULL,
    name                JSONB,
    rule_json           JSONB,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_tag PRIMARY KEY (id),
    CONSTRAINT uk_dt_tag UNIQUE (tenant_id, tag_code)
);

CREATE TABLE dt_tag_relation (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    tag_id              BIGINT       NOT NULL,
    object_type         VARCHAR(32)  NOT NULL,
    object_id           BIGINT       NOT NULL,
    score               NUMERIC(5, 4),
    source_type         VARCHAR(16)  NOT NULL DEFAULT 'SYSTEM',
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_tag_relation PRIMARY KEY (id),
    CONSTRAINT uk_dt_tag_relation UNIQUE (tenant_id, tag_id, object_type, object_id)
);
CREATE INDEX idx_dt_tag_relation_obj ON dt_tag_relation (tenant_id, object_type, object_id);

-- ---------------------------------------------------------------- 数据质量（DT-06）
CREATE TABLE dt_quality_rule (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    rule_code           VARCHAR(64)  NOT NULL,
    rule_category       VARCHAR(16)  NOT NULL,
    target_table        VARCHAR(128) NOT NULL,
    rule_expression     TEXT         NOT NULL,
    severity            VARCHAR(16)  NOT NULL DEFAULT 'WARN',
    threshold_json      JSONB,
    is_active           SMALLINT     NOT NULL DEFAULT 1,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_quality_rule PRIMARY KEY (id),
    CONSTRAINT uk_dt_quality_rule UNIQUE (tenant_id, rule_code)
);
COMMENT ON COLUMN dt_quality_rule.rule_category IS '五类：完整性/唯一性/及时性/一致性/有效性。规则必须配置化，禁止硬编码检查逻辑（§4.5.4）';

CREATE TABLE dt_quality_issue (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    rule_code           VARCHAR(64)  NOT NULL,
    object_type         VARCHAR(32),
    object_id           BIGINT,
    detail              JSONB,
    detected_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    handled_status      VARCHAR(16)  NOT NULL DEFAULT 'OPEN',
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_quality_issue PRIMARY KEY (id)
);
CREATE INDEX idx_dt_quality_issue_open ON dt_quality_issue (tenant_id, handled_status) WHERE handled_status = 'OPEN';

-- ---------------------------------------------------------------- 向量（RAG）
CREATE TABLE dt_knowledge_embedding (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    object_type         VARCHAR(32)  NOT NULL,
    object_id           BIGINT       NOT NULL,
    locale              VARCHAR(16),
    embedding           vector(1024),
    model_code          VARCHAR(64),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_dt_knowledge_embedding PRIMARY KEY (id)
);
COMMENT ON TABLE dt_knowledge_embedding IS 'pgvector 向量表。检索必须带 tenant_id + 知识权限过滤，引用来源随结果返回（§4.6.7 / §3.6 G12）';
CREATE INDEX idx_dt_embedding_hnsw ON dt_knowledge_embedding
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_dt_embedding_obj ON dt_knowledge_embedding (tenant_id, object_type, object_id);

-- ---------------------------------------------------------------- RLS
ALTER TABLE dt_entity_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_entity_company_tenant ON dt_entity_company
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE dt_entity_source_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_entity_source_map_tenant ON dt_entity_source_map
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE dt_knowledge_embedding ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dt_embedding_tenant ON dt_knowledge_embedding
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());
