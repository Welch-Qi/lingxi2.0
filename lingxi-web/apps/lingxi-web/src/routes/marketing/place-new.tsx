import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { App, DatePicker, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { RocketOutlined } from '@ant-design/icons';
import { PageContainer } from '@/components/PageContainer';
import { CAMPAIGNS } from './campaign-data';
import { MKG_CHANNEL_KEYS } from './data';
import { findPlaceDetail } from './place-data';

/**
 * 营销中心 · 投放计划创建/编辑（/marketing/place/new）—— 需求4：「创建投放计划」入口。
 *
 * 计划名称、关联活动、投放渠道、预算、投放周期、备注。提交后回投放管理主视图。
 *
 * 2026-10-06 **编辑态**（用户反馈"点编辑后投放基础信息没带过来"）：
 *   列表的「编辑」原先不带任何参数跳到本页，打开的是一张**空白**表单 ——
 *   关联活动、渠道、预算、周期全空，用户看不出在改哪条计划。现按 `?id=dN` 取
 *   该明细行的基础信息预填，并把标题/按钮文案切成"编辑"态。
 *   数据来自 `./place-data`（与投放管理列表同一份事实源，不在页面里另存一份）。
 *
 * 周期用 `dayjs` 把 `periodStart` / `periodEnd` 还原成 RangePicker 需要的 Dayjs 区间；
 * 预填的计划名存的是 i18n key（数据层约定），Input 直接吃 key 字符串回显即可。
 */

export default function MarketingPlaceNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const id = params.get('id');
  const detail = useMemo(() => (id ? findPlaceDetail(id) : undefined), [id]);
  const isEdit = Boolean(detail);

  const [name, setName] = useState(detail ? t(detail.planNameKey) : '');
  const [campaign, setCampaign] = useState<string | undefined>(undefined);
  const [channels, setChannels] = useState<string[]>(detail ? [detail.channelKey] : []);
  const [budget, setBudget] = useState(detail?.cost ?? '');
  const [period, setPeriod] = useState<[Dayjs, Dayjs] | null>(
    detail
      ? [dayjs(detail.periodStart), dayjs(detail.periodEnd)]
      : null,
  );
  const [remark, setRemark] = useState('');

  const submit = () => {
    if (!name.trim()) {
      message.error(t('mkg.plan.requireName'));
      return;
    }
    message.success(isEdit ? t('mkg.plan.editDone') : t('mkg.plan.done'));
    void navigate('/marketing/place');
  };

  return (
    <PageContainer
      titleKey={isEdit ? 'mkg.plan.editTitle' : 'mkg.plan.title'}
      subtitleKey={isEdit ? 'mkg.plan.editSub' : 'mkg.plan.sub'}
    >
      <div className="lx-form lx-form--compact">
        <div className="lx-form__section">
          <div className="lx-form__grid">
            <div className="lx-field lx-field--wide">
              <label className="lx-field__label">
                {t('mkg.plan.name')}
                <i className="lx-field__required">*</i>
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('mkg.plan.namePlaceholder')} />
            </div>
            <div className="lx-field">
              <label className="lx-field__label">{t('mkg.plan.campaign')}</label>
              <Select
                style={{ width: '100%' }}
                placeholder={t('mkg.plan.campaignPlaceholder')}
                value={campaign}
                onChange={setCampaign}
                options={CAMPAIGNS.map((c) => ({ label: t(c.nameKey), value: c.id }))}
              />
            </div>
            <div className="lx-field">
              <label className="lx-field__label">{t('mkg.plan.channel')}</label>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder={t('mkg.plan.channelPlaceholder')}
                value={channels}
                onChange={setChannels}
                options={MKG_CHANNEL_KEYS.map((key) => ({ label: t(`mkg.channel.${key}`), value: key }))}
              />
            </div>
            <div className="lx-field">
              <label className="lx-field__label">{t('mkg.plan.budget')}</label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t('mkg.plan.budgetPlaceholder')} />
            </div>
            <div className="lx-field lx-field--wide">
              <label className="lx-field__label">{t('mkg.plan.period')}</label>
              <DatePicker.RangePicker
                style={{ width: '100%' }}
                value={period}
                onChange={(value) => setPeriod(value as [Dayjs, Dayjs] | null)}
                placeholder={[t('mkg.plan.periodStart'), t('mkg.plan.periodEnd')]}
              />
            </div>
            <div className="lx-field lx-field--wide">
              <label className="lx-field__label">{t('mkg.plan.remark')}</label>
              <Input.TextArea
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={t('mkg.plan.remarkPlaceholder')}
              />
            </div>
          </div>

          <div className="lx-form__foot">
            <button type="button" className="lx-btn lx-focusable" onClick={() => void navigate(-1)}>
              {t('mkg.plan.cancel')}
            </button>
            <button type="button" className="lx-btn lx-btn--primary lx-focusable" onClick={submit}>
              <RocketOutlined />
              {isEdit ? t('mkg.plan.editSubmit') : t('mkg.plan.submit')}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
