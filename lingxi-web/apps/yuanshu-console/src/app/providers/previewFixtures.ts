import type { AgentTask } from '@/features/agent-task/api';

/**
 * 静态骨架预览数据（开发环境专用，配合 previewSession.isStaticPreview 使用）。
 *
 * 为什么需要：任务中心是常驻全局外壳的一部分，若它空着，
 * 「待审批 / 待接管」这两个核心交互在自检时完全看不到，
 * 也就无法验证顶栏红点、侧边栏角标与抽屉三态是否连通。
 *
 * 与 previewSession.ts 的分工：那里放会话占位（用户/租户/权限），
 * 这里放业务占位数据。类型只用 `import type`，避免与 api.ts 形成运行时循环依赖。
 *
 * 注意：文案字段（summary / sceneName）在后端是数据而非 i18n key，
 * 因此这里存放的是可直接展示的文本；接入后端后整个文件不再被引用，可安全删除。
 */
export const PREVIEW_PENDING_TASKS: AgentTask[] = [
  {
    taskId: 'task-preview-1',
    agentCode: 'muse',
    agentName: 'Muse',
    sceneCode: 'MKG_CONTENT_REVIEW',
    sceneName: 'Content review',
    status: 'NEEDS_APPROVAL',
    autonomyLevel: 'A1',
    outbound: true,
    bizType: 'CONTENT',
    bizId: 'CT-20260911-018',
    bizTitle: 'CT-20260911-018',
    progress: 100,
    summary: '4 LinkedIn posts ready for approval',
    failReason: null,
    createdAt: '2026-09-11T01:10:00Z',
    updatedAt: '2026-09-11T01:42:00Z',
  },
  {
    taskId: 'task-preview-2',
    agentCode: 'echo',
    agentName: 'Echo',
    sceneCode: 'CUS_LEAD_VERIFY',
    sceneName: 'Lead verification',
    status: 'NEEDS_HUMAN',
    autonomyLevel: 'A0',
    outbound: false,
    bizType: 'CUSTOMER',
    bizId: 'LD-2026-0187',
    bizTitle: 'Nordwind Energie GmbH',
    progress: 62,
    summary: '12 customs leads need manual confirmation',
    failReason: null,
    createdAt: '2026-09-11T00:20:00Z',
    updatedAt: '2026-09-11T02:05:00Z',
  },
  {
    taskId: 'task-preview-3',
    agentCode: 'echo',
    agentName: 'Echo',
    sceneCode: 'MKT_OUTBOUND_EMAIL',
    sceneName: 'Outbound email',
    status: 'NEEDS_HUMAN',
    autonomyLevel: 'A1',
    outbound: true,
    bizType: 'CUSTOMER',
    bizId: 'LD-2026-0185',
    bizTitle: 'BluePeak Storage LLC',
    progress: 40,
    summary: 'Outbound email blocked by the do-not-do list',
    failReason: null,
    createdAt: '2026-09-10T23:40:00Z',
    updatedAt: '2026-09-11T01:58:00Z',
  },
  {
    taskId: 'task-preview-4',
    agentCode: 'sage',
    agentName: 'Sage',
    sceneCode: 'ANA_MONTHLY_REPORT',
    sceneName: 'Monthly report',
    status: 'RUNNING',
    autonomyLevel: 'A3',
    outbound: false,
    bizType: null,
    bizId: null,
    bizTitle: null,
    progress: 28,
    summary: 'Generating the August business analysis report',
    failReason: null,
    createdAt: '2026-09-11T01:55:00Z',
    updatedAt: '2026-09-11T02:02:00Z',
  },
];
