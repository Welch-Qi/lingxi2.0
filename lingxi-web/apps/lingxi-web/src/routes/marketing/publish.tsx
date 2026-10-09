import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { App, DatePicker, Input, Radio, Select } from 'antd';
import { type Dayjs } from 'dayjs';
import { CloudUploadOutlined } from '@ant-design/icons';
import { PageContainer } from '@/components/PageContainer';
import { CONTENT_ROWS } from './content-data';
import { MKG_CHANNEL_KEYS } from './data';

/**
 * 营销中心 · 内容发布（/marketing/publish）—— 需求3：内容分发页的「内容发布」入口。
 *
 * 选内容、选渠道、补文案、定时间（立即 / 定时）。提交后回到内容分发主视图。
 * 演示骨架：本地校验必填，提交走 message 反馈，接入后 POST /api/v1/mkg/distributions。
 */

export default function MarketingPublishPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();

  const [content, setContent] = useState<string | undefined>(undefined);
  const [channels, setChannels] = useState<string[]>([]);
  const [copy, setCopy] = useState('');
  const [timeMode, setTimeMode] = useState<'now' | 'later'>('now');
  const [schedule, setSchedule] = useState<Dayjs | null>(null);

  const submit = () => {
    if (!content) {
      message.error(t('mkg.pub.requireContent'));
      return;
    }
    if (channels.length === 0) {
      message.error(t('mkg.pub.requireChannel'));
      return;
    }
    message.success(t('mkg.pub.done'));
    void navigate('/marketing/distribute');
  };

  return (
    <PageContainer titleKey="mkg.pub.title" subtitleKey="mkg.pub.sub">
      <div className="lx-form lx-form--compact">
        <div className="lx-form__section">
          <div className="lx-form__grid">
            <div className="lx-field">
              <label className="lx-field__label">
                {t('mkg.pub.content')}
                <i className="lx-field__required">*</i>
              </label>
              <Select
                style={{ width: '100%' }}
                placeholder={t('mkg.pub.contentPlaceholder')}
                value={content}
                onChange={setContent}
                options={CONTENT_ROWS.map((row) => ({ label: t(row.titleKey), value: row.code }))}
              />
            </div>
            <div className="lx-field">
              <label className="lx-field__label">
                {t('mkg.pub.channel')}
                <i className="lx-field__required">*</i>
              </label>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder={t('mkg.pub.channelPlaceholder')}
                value={channels}
                onChange={setChannels}
                options={MKG_CHANNEL_KEYS.map((key) => ({ label: t(`mkg.channel.${key}`), value: key }))}
              />
            </div>
            <div className="lx-field lx-field--wide">
              <label className="lx-field__label">{t('mkg.pub.copy')}</label>
              <Input.TextArea
                rows={3}
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder={t('mkg.pub.copyPlaceholder')}
              />
            </div>
            <div className="lx-field lx-field--wide">
              <label className="lx-field__label">{t('mkg.pub.time')}</label>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={timeMode}
                onChange={(e) => setTimeMode(e.target.value as 'now' | 'later')}
                options={[
                  { label: t('mkg.pub.time.now'), value: 'now' },
                  { label: t('mkg.pub.time.later'), value: 'later' },
                ]}
              />
              {timeMode === 'later' ? (
                <DatePicker
                  showTime
                  style={{ width: '100%' }}
                  value={schedule}
                  onChange={(value) => setSchedule(value)}
                  placeholder={t('mkg.pub.datetimePlaceholder')}
                />
              ) : null}
            </div>
          </div>

          <div className="lx-form__foot">
            <button type="button" className="lx-btn lx-focusable" onClick={() => void navigate(-1)}>
              {t('mkg.pub.cancel')}
            </button>
            <button type="button" className="lx-btn lx-btn--primary lx-focusable" onClick={submit}>
              <CloudUploadOutlined />
              {t('mkg.pub.submit')}
            </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
