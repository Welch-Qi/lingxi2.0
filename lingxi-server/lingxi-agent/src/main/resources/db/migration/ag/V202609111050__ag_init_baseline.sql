-- ============================================================================
-- 灵犀系统 L3 智能体中心基线迁移（AG- / AC-）
-- 依据：技术规约2.0 §4.6（智能体与 AI）· §3.6（智能体约束 G1~G14）
--
-- 三类表：智能体配置 / 任务与检查点（支撑接管） / 自主度策略与审批 / 技能与工具 / 轨迹与效能
-- ============================================================================

CREATE TABLE ag_agent (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    agent_code          VARCHAR(64)  NOT NULL,
    name                JSONB,
    agent_type          VARCHAR(32)  NOT NULL,
    orchestration_mode  VARCHAR(32)  NOT NULL,
    boundary_rule_json  JSONB        NOT NULL,
    tool_set_json       JSONB,
    model_scene_prefix  VARCHAR(64),
    default_autonomy    VARCHAR(8)   NOT NULL DEFAULT 'A0',
    status              VARCHAR(16)  NOT NULL DEFAULT 'DRAFT',
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_agent PRIMARY KEY (id),
    CONSTRAINT uk_ag_agent UNIQUE (tenant_id, agent_code)
);
COMMENT ON TABLE ag_agent IS '智能体配置。六大智能体：客户开发/市场分析/内容创意/社媒运营/营销客服/经营分析';
COMMENT ON COLUMN ag_agent.boundary_rule_json IS '「不做清单」（AgentBoundaryRule）。未声明边界规则的智能体不允许上线（§4.6.5）';
COMMENT ON COLUMN ag_agent.orchestration_mode IS '编排模式：ROUTING/CHAIN/PARALLEL/SUPERVISOR（LangChain4j agentic）';
COMMENT ON COLUMN ag_agent.default_autonomy IS '默认自主度：新增智能体默认 A0，需显式上调并留审批记录（§3.6 G4/G5）';

CREATE TABLE ag_agent_task (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    biz_code            VARCHAR(64)  NOT NULL,
    agent_code          VARCHAR(64)  NOT NULL,
    task_type           VARCHAR(64)  NOT NULL,
    status              VARCHAR(24)  NOT NULL DEFAULT 'CREATED',
    trigger_type        VARCHAR(16)  NOT NULL DEFAULT 'MANUAL',
    trigger_event_id    VARCHAR(64),
    initiator_user_id   BIGINT,
    context_snapshot    JSONB,
    current_step        VARCHAR(128),
    checkpoint_id       BIGINT,
    result_ref_type     VARCHAR(64),
    result_ref_id       BIGINT,
    fail_reason         VARCHAR(512),
    consecutive_failures INT         NOT NULL DEFAULT 0,
    needs_human_reason  VARCHAR(256),
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_agent_task PRIMARY KEY (id),
    CONSTRAINT uk_ag_agent_task UNIQUE (tenant_id, biz_code)
);
COMMENT ON TABLE ag_agent_task IS '智能体任务。状态机：CREATED→QUEUED→RUNNING→(COMPLETED|PAUSED|TAKEN_OVER|NEEDS_HUMAN|FAILED)';
COMMENT ON COLUMN ag_agent_task.checkpoint_id IS '当前检查点。状态逐步落库，保证任意步骤可接管、可恢复、可终止（§4.6.6）';

CREATE INDEX idx_ag_task_status ON ag_agent_task (tenant_id, status);
CREATE INDEX idx_ag_task_agent ON ag_agent_task (tenant_id, agent_code, created_at DESC);
CREATE INDEX idx_ag_task_needs_human ON ag_agent_task (tenant_id, created_at DESC)
    WHERE status = 'NEEDS_HUMAN';

CREATE TABLE ag_agent_task_checkpoint (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    task_id             BIGINT       NOT NULL,
    step_no             INT          NOT NULL,
    step_name           VARCHAR(128) NOT NULL,
    state_json          JSONB        NOT NULL,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_task_checkpoint PRIMARY KEY (id),
    CONSTRAINT uk_ag_task_checkpoint UNIQUE (tenant_id, task_id, step_no)
);
COMMENT ON TABLE ag_agent_task_checkpoint IS '编排检查点。人工接管后可从检查点恢复或继续由智能体推进（上下文无损交接）';

CREATE TABLE ag_agent_task_trace (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    task_id             BIGINT       NOT NULL,
    step_no             INT          NOT NULL,
    trace_type          VARCHAR(32)  NOT NULL,
    tool_code           VARCHAR(128),
    input_digest        JSONB,
    output_digest       JSONB,
    prompt_tokens       BIGINT       NOT NULL DEFAULT 0,
    output_tokens       BIGINT       NOT NULL DEFAULT 0,
    model_code          VARCHAR(64),
    latency_ms          INT,
    success             SMALLINT     NOT NULL DEFAULT 1,
    occurred_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_agent_task_trace PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
COMMENT ON TABLE ag_agent_task_trace IS '完整轨迹：输入/规划步骤/工具调用与结果/Token/输出（§3.6 G11）。供监控与效能评估';

CREATE TABLE ag_agent_task_trace_202609 PARTITION OF ag_agent_task_trace
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE ag_agent_task_trace_default PARTITION OF ag_agent_task_trace DEFAULT;
CREATE INDEX idx_ag_trace_task ON ag_agent_task_trace (tenant_id, task_id, step_no);

-- ---------------------------------------------------------------- 自主度与审批
CREATE TABLE ag_autonomy_policy (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    agent_code          VARCHAR(64)  NOT NULL,
    action_code         VARCHAR(64)  NOT NULL,
    autonomy_level      VARCHAR(8)   NOT NULL,
    is_outbound         SMALLINT     NOT NULL DEFAULT 0,
    is_sensitive        SMALLINT     NOT NULL DEFAULT 0,
    requires_approval   SMALLINT     NOT NULL DEFAULT 0,
    approved_by         BIGINT,
    approved_at         TIMESTAMPTZ,
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_autonomy_policy PRIMARY KEY (id),
    CONSTRAINT uk_ag_autonomy_policy UNIQUE (tenant_id, agent_code, action_code),
    -- 铁律的数据库级兜底：对外动作禁止 A2/A3；敏感动作强制 A0（§3.6 G4/G5）
    CONSTRAINT ck_ag_policy_outbound CHECK (is_outbound = 0 OR autonomy_level IN ('A0', 'A1')),
    CONSTRAINT ck_ag_policy_sensitive CHECK (is_sensitive = 0 OR autonomy_level = 'A0')
);
COMMENT ON TABLE ag_autonomy_policy IS '自主度策略表（智能体 × 动作）。铁律：对外内容与触达 <=A1；价格/合同/赔偿/投诉强制 A0';
COMMENT ON CONSTRAINT ck_ag_policy_outbound ON ag_autonomy_policy IS '对外动作禁止配置为 A2/A3——保存时校验拒绝（技术规约2.0 §3.6 G5）';

CREATE TABLE ag_approval_request (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    task_id             BIGINT,
    agent_code          VARCHAR(64)  NOT NULL,
    action_code         VARCHAR(64)  NOT NULL,
    payload             JSONB        NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
    approved_by         BIGINT,
    approved_at         TIMESTAMPTZ,
    reject_reason       VARCHAR(512),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_approval_request PRIMARY KEY (id)
);
CREATE INDEX idx_ag_approval_pending ON ag_approval_request (tenant_id, status) WHERE status = 'PENDING';

CREATE TABLE ag_boundary_intercept_log (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    task_id             BIGINT,
    agent_code          VARCHAR(64)  NOT NULL,
    intercept_layer     VARCHAR(16)  NOT NULL,
    action_code         VARCHAR(64),
    reason              VARCHAR(512),
    occurred_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_boundary_intercept_log PRIMARY KEY (id)
);
COMMENT ON COLUMN ag_boundary_intercept_log.intercept_layer IS '拦截层：PROMPT(软) / GATEWAY(硬，只暴露允许工具) / RULE(兜底)';

-- ---------------------------------------------------------------- 技能与 MCP 工具
CREATE TABLE ag_skill_registry (
    id                  BIGINT       NOT NULL,
    tenant_id           BIGINT       NOT NULL,
    skill_id            VARCHAR(128) NOT NULL,
    name                JSONB,
    domain              VARCHAR(16)  NOT NULL,
    tool_name           VARCHAR(128) NOT NULL,
    version_no          INT          NOT NULL DEFAULT 1,
    perm_codes          JSONB,
    high_risk           SMALLINT     NOT NULL DEFAULT 0,
    outbound            SMALLINT     NOT NULL DEFAULT 0,
    requires_approval   SMALLINT     NOT NULL DEFAULT 0,
    autonomy_max        VARCHAR(8)   NOT NULL DEFAULT 'A2',
    timeout_ms          INT          NOT NULL DEFAULT 5000,
    retry_policy        VARCHAR(16)  NOT NULL DEFAULT 'none',
    tenant_scope        VARCHAR(16)  NOT NULL DEFAULT 'ALL',
    mcp_server          VARCHAR(128),
    input_schema        JSONB,
    output_schema       JSONB,
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
    created_by          BIGINT,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by          BIGINT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted          SMALLINT     NOT NULL DEFAULT 0,
    version             INT          NOT NULL DEFAULT 0,
    CONSTRAINT pk_ag_skill_registry PRIMARY KEY (id),
    CONSTRAINT uk_ag_skill_registry UNIQUE (tenant_id, skill_id, version_no)
);
COMMENT ON TABLE ag_skill_registry IS '技能/MCP 工具注册表。工具命名 {域}_{实体}_{动作}，未注册技能禁止被调用（§4.6.4）';
COMMENT ON COLUMN ag_skill_registry.autonomy_max IS '该工具允许的最高自主度；危险动作（群发触达/合同/价格/删除）必须 A0 或 A1';
COMMENT ON COLUMN ag_skill_registry.outbound IS '是否对外触达。为 1 时工具网关注入对 A2/A3 的硬拦截';

-- ---------------------------------------------------------------- RLS
ALTER TABLE ag_agent_task ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ag_task_tenant ON ag_agent_task
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE ag_autonomy_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ag_policy_tenant ON ag_autonomy_policy
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());

ALTER TABLE ag_agent_task_checkpoint ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ag_checkpoint_tenant ON ag_agent_task_checkpoint
    USING (tenant_id = sys_current_tenant())
    WITH CHECK (tenant_id = sys_current_tenant());
