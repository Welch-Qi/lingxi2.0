import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Empty, Input, Segmented, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import { LxTakeoverButton } from '@lingxi/ui';
import { useUiStore } from '@/stores/uiStore';
import {
  approveTask,
  fetchMyPendingTasks,
  rejectTask,
  takeoverTask,
  type AgentTask,
} from '@/features/agent-task/api';

/**
 * 业务对象类型 → 一级分区路径段。
 *
 * 为什么需要映射而不是拼字符串：bizType 是后端数据字段，路径是前端路由，
 * 直接 toLowerCase 拼路径会把「后端改枚举值」变成「前端 404」。
 * 未登记的类型一律回落到工作台（页面不空白、不报错）。
 */
const BIZ_ROUTE: Record<string, string> = {
  CUSTOMER: 'customer',
  COMPANY: 'customer',
  CONTACT: 'customer',
  PRODUCT: 'product',
  ORDER: 'order',
  SERVICE_TICKET: 'service',
  CAMPAIGN: 'marketing',
  CONTENT: 'marketing',
  INSIGHT: 'intel',
  KNOWLEDGE: 'knowledge',
};

/**
 * 智能体任务抽屉（常驻全局）。
 *
 * 为什么是抽屉而不是一个「智能体中心」页面：
 * 人在别的页面干活时，智能体在后台跑或卡住；点三次才能看到「有个任务等你审批」是产品事故。
 * 因此任务中心挂在顶栏，任何页面一键可达（入口铁律：≤2 次点击）。
 *
 * 三条硬约束在此页体现：
 *  ① 待审批任务必须显示自主度与是否对外（外发内容 ≤A1，价格/合同/赔偿/投诉强制 A0）；
 *  ② 每个在途任务都有「接管」按钮，且接管必须填原因（留痕复盘）；
 *  ③ 任务必须能跳回业务对象——只在任务里审、不能跳到对象上改，等于审不了。
 */
export function AgentTaskDrawer() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { taskDrawerOpen, toggleTaskDrawer, setPendingTaskCount } = useUiStore();
  const [filter, setFilter] = useState<'ALL' | 'NEEDS_APPROVAL' | 'NEEDS_HUMAN'>('ALL');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // 条件展开而非显式传 undefined：exactOptionalPropertyTypes 下
  // 「属性存在但值为 undefined」是类型错误，也避免把 undefined 序列化进查询串
  const query = useMemo(
    () => ({
      pageNo: 1,
      pageSize: 50,
      ...(filter === 'ALL' ? {} : { status: [filter] }),
    }),
    [filter],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['agent-tasks', 'my-pending', query],
    queryFn: () => fetchMyPendingTasks(query),
    // 任务中心是「别人干活，我看结果」，必须轮询；30s 与后端任务心跳一致
    refetchInterval: taskDrawerOpen ? 15_000 : false,
  });

  const rows = data?.list ?? [];
  const total = data?.total ?? 0;

  // 顶栏徽标数量随查询结果同步（唯一数据源，避免两处数量不一致产生第二份真相）。
  // 注意：必须放在 effect 里——渲染期间写 store 会触发 React 警告并可能形成更新环。
  useEffect(() => {
    setPendingTaskCount(total);
  }, [total, setPendingTaskCount]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['pending-task-count'] });
  };

  const takeover = useMutation({
    mutationFn: ({ taskId, why }: { taskId: string; why: string }) => takeoverTask(taskId, why),
    onSuccess: () => {
      message.success(t('agent.takeoverDone'));
      invalidate();
    },
    onError: () => message.error(t('common.error.system')),
  });

  const approve = useMutation({
    mutationFn: (taskId: string) => approveTask(taskId),
    onSuccess: () => {
      message.success(t('agent.approved'));
      invalidate();
    },
    onError: () => message.error(t('common.error.system')),
  });

  const reject = useMutation({
    mutationFn: ({ taskId, why }: { taskId: string; why: string }) => rejectTask(taskId, why),
    onSuccess: () => {
      message.success(t('agent.rejected'));
      setRejectingId(null);
      setReason('');
      invalidate();
    },
    onError: () => message.error(t('common.error.system')),
  });

  const columns: ColumnsType<AgentTask> = [
    {
      title: t('agent.col.task'),
      dataIndex: 'summary',
      render: (_value, row) => (
        <Space direction="vertical" size={2}>
          <Space size={4} wrap>
            <span>{row.summary ?? row.sceneName}</span>
            <Tag color={row.autonomyLevel === 'A0' ? 'red' : row.autonomyLevel === 'A1' ? 'orange' : 'blue'}>
              {row.autonomyLevel}
            </Tag>
            {row.outbound ? <Tag color="magenta">{t('agent.outbound')}</Tag> : null}
          </Space>
          <span className="lx-muted">
            {row.agentName} · {row.sceneName}
          </span>
          {row.bizId ? (
            <Link to={`/${BIZ_ROUTE[row.bizType ?? ''] ?? 'workbench'}/${row.bizId}`}>
              {t('agent.gotoObject')}: {row.bizTitle ?? row.bizId}
            </Link>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('agent.col.status'),
      dataIndex: 'status',
      width: 120,
      render: (status: AgentTask['status']) => (
        <Tag color={status === 'NEEDS_APPROVAL' ? 'gold' : 'cyan'}>{t(`agent.status.${status}`)}</Tag>
      ),
    },
    {
      title: t('common.action'),
      key: 'actions',
      width: 210,
      render: (_value, row) => (
        <Space size={4} wrap>
          {row.status === 'NEEDS_APPROVAL' ? (
            <>
              <Button
                size="small"
                type="primary"
                loading={approve.isPending}
                onClick={() => approve.mutate(row.taskId)}
              >
                {t('agent.approve')}
              </Button>
              <Button size="small" danger onClick={() => setRejectingId(row.taskId)}>
                {t('agent.reject')}
              </Button>
            </>
          ) : null}
          <Tooltip title={t('agent.takeoverHint')}>
            <LxTakeoverButton
              taskId={row.taskId}
              disabled={row.status !== 'RUNNING' && row.status !== 'NEEDS_HUMAN'}
              onTakeover={(taskId) => takeover.mutate({ taskId, why: t('agent.takeoverByOperator') })}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Drawer
      title={t('agent.taskCenter')}
      placement="right"
      width={720}
      open={taskDrawerOpen}
      onClose={toggleTaskDrawer}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Segmented
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
          options={[
            { label: t('agent.filter.all'), value: 'ALL' },
            { label: t('agent.filter.approval'), value: 'NEEDS_APPROVAL' },
            { label: t('agent.filter.human'), value: 'NEEDS_HUMAN' },
          ]}
        />
        <Table<AgentTask>
          rowKey="taskId"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          locale={{ emptyText: <Empty description={t('agent.empty')} /> }}
        />
        {rejectingId ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              rows={3}
              value={reason}
              placeholder={t('agent.rejectReasonPlaceholder')}
              onChange={(e) => setReason(e.target.value)}
            />
            <Space>
              <Button
                danger
                type="primary"
                disabled={reason.trim().length === 0}
                loading={reject.isPending}
                onClick={() => reject.mutate({ taskId: rejectingId, why: reason })}
              >
                {t('agent.rejectConfirm')}
              </Button>
              <Button onClick={() => setRejectingId(null)}>{t('common.cancel')}</Button>
            </Space>
          </Space>
        ) : null}
      </Space>
    </Drawer>
  );
}
