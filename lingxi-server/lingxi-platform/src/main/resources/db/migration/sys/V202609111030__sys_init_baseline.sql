-- ============================================================================
-- 灵犀系统 L0 平台基线迁移
-- 依据：技术规约2.0 §4.4（数据库规约）· §4.9.4（租户隔离四道防线）· §附录A（错误码）
--
-- 命名：V{yyyyMMddHHmm}__{域}_{描述}.sql
-- 规则：合并主干后禁止修改本脚本，修正用新脚本（D8）；只增列不删列（§4.4.3）
-- ============================================================================

-- ---------------------------------------------------------------- 通用函数
-- 当前租户：应用连接时 SET app.tenant_id（RLS 判定依据，§4.4.5）
CREATE OR REPLACE FUNCTION sys_current_tenant() RETURNS bigint AS $$
    SELECT nullif(current_setting('app.tenant_id', true), '')::bigint;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION sys_current_tenant() IS 'RLS 租户判定函数：读取会话级 app.tenant_id';

-- 通用审计字段（每张业务表必备，§4.4.1）
-- 说明：此为模板注释，实际建表逐列显式声明，便于评审 DDL 影响

-- ---------------------------------------------------------------- 租户
CREATE TABLE sys_tenant (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    biz_code            VARCHAR(64)  NOT NULL,
    name                VARCHAR(128) NOT NULL,
    realm               VARCHAR(64)  NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    locale              VARCHAR(16)  NOT NULL DEFAULT 'zh-CN',
    timezone            VARCHAR(64)  NOT NULL DEFAULT 'Asia/Shanghai',
    currency            VARCHAR(8)   NOT NULL DEFAULT 'CNY',
    quota_json          JSONB,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_tenant PRIMARY KEY (id),
    CONSTRAINT uk_sys_tenant_code UNIQUE (tenant_id, biz_code)
);
COMMENT ON TABLE sys_tenant IS '租户。realm 与 Keycloak Realm 一一对应（§4.2）';
CREATE INDEX idx_sys_tenant_status ON sys_tenant (tenant_id, status);

-- ---------------------------------------------------------------- 用户与组织
CREATE TABLE sys_user (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    biz_code            VARCHAR(64)  NOT NULL,
    username            VARCHAR(64)  NOT NULL,
    display_name        JSONB,
    email               VARCHAR(128),
    phone               VARCHAR(32),
    dept_id             BIGINT,
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    idp_subject         VARCHAR(128),
    last_login_at       TIMESTAMPTZ,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    source_type         VARCHAR(16)  NOT NULL DEFAULT 'HUMAN',
    CONSTRAINT pk_sys_user PRIMARY KEY (id),
    CONSTRAINT uk_sys_user_code UNIQUE (tenant_id, biz_code)
);
COMMENT ON TABLE sys_user IS '用户。口令与凭证由 Keycloak 管理，本表禁止存密码（§4.9.1）';
COMMENT ON COLUMN sys_user.display_name IS '多语言字段统一 JSONB：{"zh-CN":"张三","en-US":"San Zhang"}（§3.3 D7）';
CREATE UNIQUE INDEX uk_sys_user_username ON sys_user (tenant_id, username) WHERE is_deleted = 0;
CREATE UNIQUE INDEX uk_sys_user_idp ON sys_user (tenant_id, idp_subject) WHERE idp_subject IS NOT NULL;
CREATE INDEX idx_sys_user_dept ON sys_user (tenant_id, dept_id);

CREATE TABLE sys_dept (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    parent_id           BIGINT,
    biz_code            VARCHAR(64)  NOT NULL,
    name                JSONB,
    path                VARCHAR(512),
    sort_no             INT          NOT NULL DEFAULT 0,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_dept PRIMARY KEY (id),
    CONSTRAINT uk_sys_dept_code UNIQUE (tenant_id, biz_code)
);
CREATE INDEX idx_sys_dept_path ON sys_dept (tenant_id, path);

-- ---------------------------------------------------------------- 权限（三层）
CREATE TABLE sys_role (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    biz_code            VARCHAR(64)  NOT NULL,
    name                JSONB,
    role_type           VARCHAR(16)  NOT NULL DEFAULT 'CUSTOM',
    data_scope          VARCHAR(16)  NOT NULL DEFAULT 'SELF',
    description         TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_role PRIMARY KEY (id),
    CONSTRAINT uk_sys_role_code UNIQUE (tenant_id, biz_code)
);
COMMENT ON COLUMN sys_role.data_scope IS '数据权限范围：SELF/DEPT/DEPT_AND_SUB/CUSTOM/ALL（§4.8.2 统一定义，模块不得自定义）';

CREATE TABLE sys_user_role (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    user_id             BIGINT       NOT NULL,
    role_id             BIGINT       NOT NULL,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_user_role PRIMARY KEY (id),
    CONSTRAINT uk_sys_user_role UNIQUE (tenant_id, user_id, role_id)
);
CREATE INDEX idx_sys_user_role_user ON sys_user_role (tenant_id, user_id);

CREATE TABLE sys_permission (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    perm_code           VARCHAR(128) NOT NULL,
    perm_type           VARCHAR(16)  NOT NULL DEFAULT 'FUNCTION',
    domain              VARCHAR(16)  NOT NULL,
    name                JSONB,
    module_key          VARCHAR(64),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_permission PRIMARY KEY (id),
    CONSTRAINT uk_sys_permission_code UNIQUE (tenant_id, perm_code)
);
COMMENT ON TABLE sys_permission IS '权限资源登记表。新 API 上线必须完成权限码绑定（§4.8.2）';
COMMENT ON COLUMN sys_permission.perm_code IS '格式 {域}:{对象}:{动作}，如 cus:lead:assign';

CREATE TABLE sys_role_permission (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    role_id             BIGINT       NOT NULL,
    perm_id             BIGINT       NOT NULL,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_role_permission PRIMARY KEY (id),
    CONSTRAINT uk_sys_role_permission UNIQUE (tenant_id, role_id, perm_id)
);

-- Casbin 策略（功能/行级/字段三层统一模型，§4.9.2 禁止模块私有 ACL 表）
CREATE TABLE casbin_rule (
    id                  BIGSERIAL    PRIMARY KEY,
    ptype               VARCHAR(16)  NOT NULL,
    v0                  VARCHAR(256),
    v1                  VARCHAR(256),
    v2                  VARCHAR(256),
    v3                  VARCHAR(256),
    v4                  VARCHAR(256),
    v5                  VARCHAR(256)
);
COMMENT ON TABLE casbin_rule IS 'Casbin 策略存储。全站唯一权限决策源；策略变更留版本与操作人';
-- 说明：本表为全局白名单表（不注入租户条件），租户维度通过 v0/v1 编码承载

-- ---------------------------------------------------------------- 业务配置（配置中心）
CREATE TABLE sys_config (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    config_key          VARCHAR(128) NOT NULL,
    config_value        JSONB        NOT NULL,
    scope               VARCHAR(16)  NOT NULL DEFAULT 'TENANT',
    effective_from      TIMESTAMPTZ,
    version_no          INT          NOT NULL DEFAULT 1,
    changed_by          BIGINT,
    change_note         TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_config PRIMARY KEY (id),
    CONSTRAINT uk_sys_config_key UNIQUE (tenant_id, config_key, version_no)
);
COMMENT ON TABLE sys_config IS '业务配置（企业公约/品牌规范/业务规则）。分层优先级：用户偏好 > 租户配置 > 平台默认 > 代码默认（§3.5 F3）';

CREATE TABLE sys_config_history (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    config_key          VARCHAR(128) NOT NULL,
    version_no          INT          NOT NULL,
    config_value        JSONB,
    changed_by          BIGINT,
    changed_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    change_note         TEXT,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_config_history PRIMARY KEY (id)
);

-- ---------------------------------------------------------------- 字典（免租户白名单）
CREATE TABLE sys_dict_type (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    dict_code           VARCHAR(64)  NOT NULL,
    name                JSONB,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_dict_type PRIMARY KEY (id),
    CONSTRAINT uk_sys_dict_type UNIQUE (tenant_id, dict_code)
);

CREATE TABLE sys_dict_item (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    dict_code           VARCHAR(64)  NOT NULL,
    item_code           VARCHAR(64)  NOT NULL,
    item_value          JSONB,
    sort_no             INT          NOT NULL DEFAULT 0,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_dict_item PRIMARY KEY (id),
    CONSTRAINT uk_sys_dict_item UNIQUE (tenant_id, dict_code, item_code)
);

-- ---------------------------------------------------------------- 审计（按月分区）
CREATE TABLE sys_audit_log (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    trace_id            VARCHAR(64),
    actor_type          VARCHAR(16)  NOT NULL DEFAULT 'HUMAN',
    actor_id            VARCHAR(64),
    agent_code          VARCHAR(64),
    task_id             VARCHAR(64),
    domain              VARCHAR(16),
    action              VARCHAR(64)  NOT NULL,
    entity_type         VARCHAR(64),
    entity_id           VARCHAR(64),
    before_value        JSONB,
    after_value         JSONB,
    client_ip           VARCHAR(64),
    result              VARCHAR(16)  NOT NULL DEFAULT 'SUCCESS',
    occurred_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_audit_log PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE sys_audit_log IS '全量操作审计（含智能体）。按月分区，分区由定时任务提前 2 个月生成（§4.4.5）';

CREATE TABLE sys_audit_log_202609 PARTITION OF sys_audit_log
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE sys_audit_log_202610 PARTITION OF sys_audit_log
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE sys_audit_log_default PARTITION OF sys_audit_log DEFAULT;

CREATE INDEX idx_sys_audit_trace ON sys_audit_log (tenant_id, trace_id);
CREATE INDEX idx_sys_audit_entity ON sys_audit_log (tenant_id, entity_type, entity_id);

-- ---------------------------------------------------------------- Outbox（即时沉淀）
CREATE TABLE sys_outbox (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    event_id            VARCHAR(64)  NOT NULL,
    event_version       INT          NOT NULL DEFAULT 1,
    topic               VARCHAR(128) NOT NULL,
    actor_type          VARCHAR(16)  NOT NULL DEFAULT 'HUMAN',
    actor_id            VARCHAR(64),
    trace_id            VARCHAR(64),
    payload             JSONB        NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    retry_count         INT          NOT NULL DEFAULT 0,
    next_retry_at       TIMESTAMPTZ,
    published_at        TIMESTAMPTZ,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_outbox PRIMARY KEY (id),
    CONSTRAINT uk_sys_outbox_event UNIQUE (event_id)
);
COMMENT ON TABLE sys_outbox IS '事务性 Outbox。业务写入与 Outbox 记录必须同一事务（§4.5.5）；投递由定时轮询 + ShedLock 单实例执行';
CREATE INDEX idx_sys_outbox_pending ON sys_outbox (status, next_retry_at) WHERE status = 'PENDING';

CREATE TABLE sys_event_consume_log (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    event_id            VARCHAR(64)  NOT NULL,
    consumer            VARCHAR(128) NOT NULL,
    consumed_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_event_consume_log PRIMARY KEY (id),
    CONSTRAINT uk_sys_event_consume UNIQUE (event_id, consumer)
);
COMMENT ON TABLE sys_event_consume_log IS '消费幂等表。消费者必须按 eventId 去重（§4.7.2）';

-- ---------------------------------------------------------------- 幂等键
CREATE TABLE sys_idempotency (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    idem_key            VARCHAR(64)  NOT NULL,
    request_hash        VARCHAR(128),
    response_body       JSONB,
    expire_at           TIMESTAMPTZ  NOT NULL,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_sys_idempotency PRIMARY KEY (id),
    CONSTRAINT uk_sys_idempotency UNIQUE (tenant_id, idem_key)
);
COMMENT ON TABLE sys_idempotency IS '写操作幂等键（X-Idempotency-Key），有效期 24 小时（§4.3.3）';
CREATE INDEX idx_sys_idempotency_expire ON sys_idempotency (expire_at);

-- ---------------------------------------------------------------- RLS 第三道防线
-- 说明：应用层拦截器（第一道）+ 数据权限过滤（第二道）之外，RLS 保证
--       即使应用层漏写 where tenant_id，数据库层也拦得住（§4.9.4 ③）
ALTER TABLE sys_user ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sys_user_tenant ON sys_user
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE sys_dept ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sys_dept_tenant ON sys_dept
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE sys_role ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sys_role_tenant ON sys_role
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE sys_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sys_config_tenant ON sys_config
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

COMMENT ON POLICY p_sys_user_tenant ON sys_user IS '租户隔离第三道防线（技术规约2.0 §4.9.4）';
