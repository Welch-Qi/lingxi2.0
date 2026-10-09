/**
 * 营销中心共享枚举（`mkg_channel`）—— 只有一个职责：
 * **对外分发渠道只写一份**，让「分发」与「排期日历」两页不各存一份。
 *
 * 背景：`/marketing/distribute` 的渠道列与 `/marketing/calendar` 的泳道是同一个业务对象。
 * 渠道是随投放策略增删的（今天五个，明年可能加 X / 小红书），
 * 分成两份必然出现"日历里有、分发里没有"的孤儿渠道，或反过来删了 A 渠道在两页残留。
 *
 * 这里只放**渠道标识本身**（key + 展示用 i18n key），
 * 各页自己的呈现字段（触达量、排期完成度百分比）仍留在各页 ——
 * 那些是演示数据，不属于业务枚举。
 */

/** 对外分发渠道。加渠道时先加这里，再补 `mkg.channel.*` 语言包键。 */
export type ChannelKey = 'tiktok' | 'instagram' | 'youtube' | 'linkedin' | 'facebook';

export const MKG_CHANNEL_KEYS: readonly ChannelKey[] = [
  'tiktok',
  'instagram',
  'youtube',
  'linkedin',
  'facebook',
];
