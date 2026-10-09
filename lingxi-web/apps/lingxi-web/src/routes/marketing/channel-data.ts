/**
 * 社媒账号演示数据（`mkg_social_account`）—— §2.8「社媒账号维护」。
 *
 * 这一页盯的不是"内容好不好"，而是**号还在不在**：
 * 授权到期、被平台收回、健康度掉下去，都发生在内容生产之外，
 * 但后果是排期整个失效 —— 排了三十条，号被解绑，一条都发不出去。
 * 因此"授权到期预警"是本页的第一等公民，不是附在列表里的一个小标签。
 *
 * 健康度不是自增的炫技指标，它对应三件会真发生的事：
 * 发布频次不足（降权）、内容违规（限流）、账号资料缺失（不被推荐）。
 * 数值仅用于演示排序，接入后由平台侧数据 `health_score` 提供。
 *
 * 日期锚点与排期日历一致（`MKG_SCHEDULE_TODAY`）：授权到期日是与"今天"比较出来的，
 * 用系统时间会让同一份演示数据在不同日子分出不同的预警档位。
 */

import type { ChannelKey } from './data';

export type AuthStatus = 'connected' | 'expiring' | 'expired' | 'revoked';

export interface SocialAccount {
  id: string;
  /** 平台 key（复用分发渠道枚举 —— 分发渠道就是社媒账号本身） */
  platformKey: ChannelKey;
  /** 账号名（`@` 开头，语言中立标识，不翻译） */
  handle: string;
  /** 主要目标市场的展示名 key 后缀（`mkg.chn.region.*`） */
  regionKey: string;
  ownerKey: string;
  /** 粉丝数（原样，展示层按语言格式化） */
  followers: number;
  /** 健康度 0–100 */
  health: number;
  authStatus: AuthStatus;
  /** 授权到期日 `YYYY-MM-DD` */
  authExpireAt: string;
  /** 近 30 天发布条数 */
  posts30d: number;
}

export const MKG_ACCOUNT_TODAY = '2026-09-24';

export const SOCIAL_ACCOUNTS: readonly SocialAccount[] = [
  {
    id: 'AC-TK-01',
    platformKey: 'tiktok',
    handle: '@tianneng-energy',
    regionKey: 'sea',
    ownerKey: 'zhoumu',
    followers: 128_400,
    health: 88,
    authStatus: 'connected',
    authExpireAt: '2027-01-15',
    posts30d: 42,
  },
  {
    id: 'AC-IG-01',
    platformKey: 'instagram',
    handle: '@tianneng.solar',
    regionKey: 'emea',
    ownerKey: 'linlan',
    followers: 96_200,
    health: 76,
    authStatus: 'expiring',
    authExpireAt: '2026-10-08',
    posts30d: 28,
  },
  {
    id: 'AC-YT-01',
    platformKey: 'youtube',
    handle: '@tianneng-eu',
    regionKey: 'emea',
    ownerKey: 'echo',
    followers: 54_800,
    health: 91,
    authStatus: 'connected',
    authExpireAt: '2027-03-30',
    posts30d: 11,
  },
  {
    id: 'AC-LI-01',
    platformKey: 'linkedin',
    handle: '/company/tianneng',
    regionKey: 'emea',
    ownerKey: 'echo',
    followers: 38_600,
    health: 64,
    authStatus: 'expiring',
    authExpireAt: '2026-09-30',
    posts30d: 16,
  },
  {
    id: 'AC-FB-01',
    platformKey: 'facebook',
    handle: 'tianneng.energy',
    regionKey: 'namer',
    ownerKey: 'linlan',
    followers: 21_300,
    health: 47,
    authStatus: 'revoked',
    authExpireAt: '2026-09-18',
    posts30d: 6,
  },
  {
    id: 'AC-LI-02',
    platformKey: 'linkedin',
    handle: '/company/tianneng-na',
    regionKey: 'namer',
    ownerKey: 'zhoumu',
    followers: 14_700,
    health: 82,
    authStatus: 'connected',
    authExpireAt: '2027-06-12',
    posts30d: 19,
  },
];

/** 授权到期还有几天（负 = 已过期）。 */
export function daysToExpire(account: SocialAccount, today = MKG_ACCOUNT_TODAY): number {
  const from = Date.parse(`${today}T00:00:00Z`);
  const to = Date.parse(`${account.authExpireAt}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** 按"最该处理的先排"：已过期 → 即将到期 → 健康度低的。 */
export function sortedByUrgency(accounts: readonly SocialAccount[]): readonly SocialAccount[] {
  return [...accounts].sort((a, b) => {
    const byDays = daysToExpire(a) - daysToExpire(b);
    if (byDays !== 0) {
      return byDays;
    }
    return a.health - b.health;
  });
}
