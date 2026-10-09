# 灵犀 1.0 参考截图（设计依据留档）

来源：`产品开发/灵犀前端.zip` 内 `_shots/`（1.0 高保真原型在 2026-08-18 的截图）。

为什么要入库：2.0 的工作台、市场情报、经营分析三个首页已按 1.0 版式重构
（结构照搬、数据换 2.0 口径）。把 1.0 的原图留在仓里，"照搬"这件事才是可核对的——
否则 reviewer 只能凭描述判断，无从比对区块顺序、栅格划分与信息密度。

| 文件 | 对应 1.0 页面 | 2.0 落点 |
| --- | --- | --- |
| `dashboard.png` / `lingxi-dashboard.png` | 超级工作台 | `/workbench` |
| `analytics.png` | 经营分析 | `/analytics` |
| `analytics-map.png` | 经营分析 · 全球销量热度地图 | `/analytics` 第 ③ 段 |
| `analytics-funnel.png` | 经营分析 · 营销转化漏斗 | `/analytics` 第 ④ 段右栏 |
| `analytics-charts2.png` | 经营分析 · 近 30 天趋势 | `/analytics` 第 ⑤ 段 |
| `analytics-chat.png` | 经营分析 · AI 问答面板 | `/analytics` 第 ⑥ 段 |

市场情报的版式来源是 1.0《产品开发》页，该页 1.0 侧未留存截图，
原型仍在 zip 内，需要时可重新解压比对。

不要把这些图当验收基线：1.0 是 Next.js + react-simple-maps + CDN 地图，
2.0 是 React 19 + ECharts + 同源 GeoJSON，视觉细节（字体、圆角、色阶）
本就应按 2.0 的极光通感令牌走，照搬的是**结构与动线**，不是像素。
