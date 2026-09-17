import { get, getPage, post, type PageQuery, type PageResult } from '@lingxi/request';
import { isStaticPreview } from '@/app/providers/previewSession';
import { PREVIEW_PENDING_TASKS } from '@/app/providers/previewFixtures';

/**
 * 智能体任务接口（技术规约2.0 §4.6）。
 *
 * 重要：本文件只调用业务域自身的接口，不存在 /api/agent/** 影子写接口——
 * 智能体与人工走同一套 Application Service、同一张表（双通道同源铁律，§3.5 G6）。
 *
 * 任务中心之所以常驻全局：智能体在后台跑，人必须有唯一收口看它、管它、接管它。
 */

export type AgentTaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'NEEDS_HUMAN'
  | 'NEEDS_APPROVAL'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TAKEN_OVER';

/** 自主度（§4.6.3）：对外内容与触达 ≤A1；价格/合同/赔偿/投诉强制 A0 */
export type AutonomyLevel = 'A0' | 'A1' | 'A2' | 'A3';

export interface AgentTask {
  taskId: string;
  agentCode: string;
  agentName: string;
  sceneCode: string;
  sceneName: string;
  status: AgentTaskStatus;
  autonomyLevel: AutonomyLevel;
  /** 是否对外动作：为 true 时禁止 A2/A3（后端已用 CHECK 约束兜底，见 ag_autonomy_policy） */
  outbound: boolean;
  /** 关联业务对象：用于跳回对象详情——「可在界面直接操作」是产品底线 */
  bizType: string | null;
  bizId: string | null;
  bizTitle: string | null;
  /** 0~100；不可用时为 null（不显示假进度条） */
  progress: number | null;
  summary: string | null;
  failReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTaskQuery extends PageQuery {
  status?: AgentTaskStatus[];
  agentCode?: string;
  bizType?: string;
  bizId?: string;
}

function toParams(query: AgentTaskQuery): Record<string, unknown> {
  return {
    pageNo: query.pageNo ?? 1,
    pageSize: query.pageSize ?? 20,
    status: query.status?.length ? query.status.join(',') : undefined,
    agentCode: query.agentCode,
    bizType: query.bizType,
    bizId: query.bizId,
  };
}

/** 我的待处理任务：NEEDS_HUMAN（需人工接手）+ NEEDS_APPROVAL（待审批） */
export function fetchMyPendingTasks(query: AgentTaskQuery = {}): Promise<PageResult<AgentTask>> {
  // 静态骨架阶段（DEV）：用占位任务撑起任务中心三态，接入后端后此分支不可达
  if (isStaticPreview()) {
    const pageSize = query.pageSize ?? 20;
    return Promise.resolve({
      list: PREVIEW_PENDING_TASKS,
      total: PREVIEW_PENDING_TASKS.length,
      pageNo: query.pageNo ?? 1,
      pageSize,
    });
  }
  return getPage<AgentTask>('/api/v1/agent/tasks/my-pending', toParams(query));
}

/** 任务分页列表（可按域、按业务对象过滤） */
export function fetchAgentTasks(query: AgentTaskQuery = {}): Promise<PageResult<AgentTask>> {
  return getPage<AgentTask>('/api/v1/agent/tasks', toParams(query));
}

/** 任务详情（含步骤轨迹，用于排障与审计回溯） */
export function fetchAgentTask(taskId: string): Promise<AgentTask> {
  return get<AgentTask>(`/api/v1/agent/tasks/${taskId}`);
}

/**
 * 静态骨架阶段（DEV）的本地回显：让「接管 / 通过 / 驳回」在无后端时可点通，
 * 便于验证抽屉交互与状态文案。后端就绪后此函数不再被调用。
 */
function previewTaskResult(taskId: string, status: AgentTaskStatus): Promise<AgentTask> {
  const now = new Date().toISOString();
  const found = PREVIEW_PENDING_TASKS.find((task) => task.taskId === taskId);
  const empty: AgentTask = {
    taskId,
    agentCode: 'preview',
    agentName: 'Preview',
    sceneCode: 'PREVIEW',
    sceneName: 'Preview',
    status,
    autonomyLevel: 'A0',
    outbound: false,
    bizType: null,
    bizId: null,
    bizTitle: null,
    progress: null,
    summary: null,
    failReason: null,
    createdAt: now,
    updatedAt: now,
  };
  return Promise.resolve({ ...empty, ...(found ?? {}), status });
}

/**
 * 人工接管（产品「接管铁律」/ §4.6.6）。
 *
 * 后端语义：撤销该任务后续排队动作 + 释放并发锁 + 记录接管人与原因；
 * 已产生的下游动作不自动回滚（避免雪崩），由人在对象上修正。
 * 传 reason 是强制的——接管必须留痕，否则无法复盘智能体为何跑偏。
 */
export function takeoverTask(taskId: string, reason: string): Promise<AgentTask> {
  if (isStaticPreview()) {
    return previewTaskResult(taskId, 'TAKEN_OVER');
  }
  return post<AgentTask>(`/api/v1/agent/tasks/${taskId}/takeover`, { reason });
}

/** 审批通过（仅 NEEDS_APPROVAL 状态可调用；通过后按原自主度继续执行） */
export function approveTask(taskId: string, comment?: string): Promise<AgentTask> {
  if (isStaticPreview()) {
    return previewTaskResult(taskId, 'RUNNING');
  }
  return post<AgentTask>(`/api/v1/agent/tasks/${taskId}/approve`, { comment });
}

/** 审批驳回：任务终止，不自动重试（重试须重新发起，避免反复消耗额度） */
export function rejectTask(taskId: string, reason: string): Promise<AgentTask> {
  if (isStaticPreview()) {
    return previewTaskResult(taskId, 'CANCELLED');
  }
  return post<AgentTask>(`/api/v1/agent/tasks/${taskId}/reject`, { reason });
}
