import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TableProps } from 'antd';
import {
  LxEmpty,
  LxFilterButton,
  LxInsightCard,
  LxKpi,
  LxQuickAction,
  LxSearchInput,
  LxSectionHeader,
  LxTable,
  LxTableCard,
} from '@lingxi/ui';
import type { LxAgentTone, LxInsightAccent, LxKpiProps, LxQuickTone } from '@lingxi/ui';
import { PageContainer } from '@/components/PageContainer';

/**
 * 模块首页统一组合件。
 *
 * 为什么抽出来：11 个分区里除工作台与内容营销有专属版式外，其余分区首页的结构是同构的
 * ——「指标行 → 智能体建议 → 主列表」。若各写一份，会出现 9 种指标卡间距、
 * 9 套空态文案；抽成组合件后，结构一致、改动只需一处，
 * 且新增分区（二期）可直接复用（技术规约2.0 §4.2.3 组件复用要求）。
 *
 * 文案一律传 i18n key，禁止硬编码中文（附录 D 规则 10）。
 */

/** 表格行：值既可能是文本也可能是标签/链接组件，统一按 ReactNode 承载。 */
export interface ModuleHomeRow {
  id: string | number;
  [key: string]: ReactNode;
}

/** 指标卡规格（labelKey 走 i18n，其余为数据或枚举）。 */
export interface ModuleKpiSpec extends Omit<LxKpiProps, 'label'> {
  labelKey: string;
}

/** 智能体建议卡规格。 */
export interface ModuleInsightSpec {
  typeKey: string;
  textKey: string;
  sourceKey: string;
  accent?: LxInsightAccent | undefined;
  tone?: LxAgentTone | undefined;
  icon: ReactNode;
}

/** 快捷操作规格。 */
export interface ModuleQuickSpec {
  titleKey: string;
  descKey?: string | undefined;
  icon: ReactNode;
  tone?: LxQuickTone | undefined;
}

export interface ModuleHomeProps<T extends ModuleHomeRow> {
  titleKey: string;
  subtitleKey?: string | undefined;
  /** 指标行：默认 4 列（≤1100px 2 列，≤768px 2 列） */
  kpis: readonly ModuleKpiSpec[];
  /**
   * 指标行之后的自定义区。用于"分区主体不是列表"的场景——
   * 例如智能体中心要先给名册（有形象的智能体卡片），再给任务列表。
   * 之所以做成插槽而不是给 ModuleHome 堆各种可选区，是为了避免它长成一个万能页面组件。
   */
  extra?: ReactNode | undefined;
  /** 智能体建议区；无产出时不渲染（详情页槽位同理：无产出不占位） */
  insightsTitleKey?: string | undefined;
  insightsSubKey?: string | undefined;
  insightsMoreKey?: string | undefined;
  insights?: readonly ModuleInsightSpec[] | undefined;
  /** 快捷操作区 */
  quicks?: readonly ModuleQuickSpec[] | undefined;
  /** 主列表 */
  listTitleKey: string;
  listSubKey?: string | undefined;
  listMoreKey?: string | undefined;
  searchPlaceholderKey: string;
  filterLabelKey: string;
  /** 列定义必填：列缺失属配置错误，应在编译期暴露，而非静默渲染空表 */
  columns: NonNullable<TableProps<T>['columns']>;
  rows: readonly T[];
  emptyTextKey: string;
  emptyHintKey?: string | undefined;
  total?: number | undefined;
}

export function ModuleHome<T extends ModuleHomeRow>({
  titleKey,
  subtitleKey,
  kpis,
  extra,
  insightsTitleKey,
  insightsSubKey,
  insightsMoreKey,
  insights,
  quicks,
  listTitleKey,
  listSubKey,
  listMoreKey,
  searchPlaceholderKey,
  filterLabelKey,
  columns,
  rows,
  emptyTextKey,
  emptyHintKey,
  total,
}: ModuleHomeProps<T>) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  const visibleRows = keyword
    ? rows.filter((row) =>
        Object.values(row).some((value) => typeof value === 'string' && value.includes(keyword)),
      )
    : rows;

  return (
    <PageContainer titleKey={titleKey} subtitleKey={subtitleKey}>
      <div className="lx-grid lx-grid--kpi-4">
        {kpis.map(({ labelKey, ...kpi }) => (
          <LxKpi key={labelKey} label={t(labelKey)} {...kpi} />
        ))}
      </div>

      {extra}

      {insights && insights.length > 0 && insightsTitleKey ? (
        <section className="lx-section">
          <LxSectionHeader
            title={t(insightsTitleKey)}
            sub={insightsSubKey ? t(insightsSubKey) : undefined}
            actionLabel={insightsMoreKey ? t(insightsMoreKey) : undefined}
          />
          <div className="lx-grid lx-grid--3">
            {insights.map((item) => (
              <LxInsightCard
                key={item.textKey}
                type={t(item.typeKey)}
                text={t(item.textKey)}
                source={t(item.sourceKey)}
                accent={item.accent}
                tone={item.tone}
                icon={item.icon}
              />
            ))}
          </div>
        </section>
      ) : null}

      {quicks && quicks.length > 0 ? (
        <div className="lx-grid lx-grid--3">
          {quicks.map((quick) => (
            <LxQuickAction
              key={quick.titleKey}
              title={t(quick.titleKey)}
              desc={quick.descKey ? t(quick.descKey) : undefined}
              icon={quick.icon}
              tone={quick.tone}
            />
          ))}
        </div>
      ) : null}

      <section className="lx-section">
        <LxSectionHeader
          title={t(listTitleKey)}
          sub={listSubKey ? t(listSubKey) : undefined}
          actionLabel={listMoreKey ? t(listMoreKey) : undefined}
        />
        <LxTableCard
          tools={
            <>
              <LxSearchInput value={keyword} placeholder={t(searchPlaceholderKey)} onChange={setKeyword} />
              <LxFilterButton label={t(filterLabelKey)} />
            </>
          }
        >
          <LxTable<T>
            columns={columns}
            dataSource={[...visibleRows]}
            total={total ?? rows.length}
            pageNo={1}
            pageSize={20}
            locale={{
              emptyText: <LxEmpty title={t(emptyTextKey)} hint={emptyHintKey ? t(emptyHintKey) : undefined} />,
            }}
          />
        </LxTableCard>
      </section>
    </PageContainer>
  );
}
