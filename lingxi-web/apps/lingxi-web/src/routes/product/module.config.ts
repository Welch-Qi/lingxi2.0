import type { ModuleConfig } from '@/app/router/types';

/**
 * 商品中心分区清单（一级菜单「商品中心」）。
 *
 * 功能编号对应《功能清单V2.1》五、商品中心（OP-PRD-）。
 *
 * 为什么"数据完整度"是要害指标：商品主数据被内容营销、社媒运营、订单建单三处消费，
 * 字段缺失不是本模块的问题，会直接放大成内容质量与交付准确性问题，
 * 因此完整度必须显性度量并可一键交给智能体补全（HS 编码 / 属性 / 多语种素材）。
 *
 * 2026-09-27 增第二条路由：产品素材库 `/product/assets`（`OP-PRD-02`，P0-A ★新增）。
 * 说明书 §2.5 与《功能清单V2.1》都把"图片/视频上传、分类、打标、多语言版本、与 SKU 关联"
 * 列为商品中心的独立能力，原先只以首页页内的第二种视图存在 —— 能力有、落点有两个。
 * 收敛后首页只管商品主数据，素材一律进这一页（首页的素材入口改为只做跳转）。
 *
 * 2026-09-28 再增两条：`/product/new`（新建商品）与 `/product/upload`（上传素材）。
 * 首页动作栏那三个按钮原先只有文案没有去向 —— 四级页做完了，一级入口却点不动。
 * 两条路各自独立而不是共用一条带 `?mode=` 的页：新建商品要填规格与合规，
 * 上传素材要挑文件与打标，字段集毫无交集，合并只会让两边都多出一半无关字段。
 */
const config: ModuleConfig = {
  key: 'product',
  basePath: '/product',
  titleKey: 'prd.menu.product',
  subtitleKey: 'prd.subtitle',
  bizCodes: 'OP-PRD-',
  permPrefix: 'prd',
  enabled: true,
  icon: 'product',
  layout: () => import('./layout'),
  routes: [
    {
      path: '/product',
      element: () => import('./index'),
      permCode: 'prd:product:view',
      titleKey: 'prd.menu.home',
    },
    {
      // 产品素材库：内容创意的弹药库，从首页的「商品素材数」指标卡进入
      path: '/product/assets',
      element: () => import('./assets'),
      permCode: 'prd:material:view',
      titleKey: 'prd.assets.title',
    },
    {
      // 分类与属性：类目树挂属性模板，自定义字段补位
      // `OP-PRD-06/07`。做成独立二级页而不是首页的一种视图，因为"选类目 → 换模板"
      // 是个带状态的过程（当前类目、当前模板、字段差异），塞进首页做不成。
      path: '/product/category',
      element: () => import('./category'),
      permCode: 'prd:category:view',
      titleKey: 'prd.category.title',
    },
    {
      // 新建商品：三组字段（基础 / 规格合规 / 销售交付）的录入页，`OP-PRD-01`
      path: '/product/new',
      element: () => import('./new'),
      permCode: 'prd:product:create',
      titleKey: 'prd.new.title',
    },
    {
      // 上传素材：文件 + 归属检索属性，`OP-PRD-03`
      // 与素材库（`/product/assets`）分工：那里是"有哪些"，这里是"放进去并且放对位置"。
      path: '/product/upload',
      element: () => import('./upload'),
      permCode: 'prd:material:upload',
      titleKey: 'prd.upload.title',
    },
    {
      // SKU 编辑子页：一个商品可配置多个 SKU（编码 / 名称 / 规格 / 价格 / 图片 / 库存），
      // 从商品列表「SKU」或商品编辑页「管理 SKU」进入。`OP-PRD-01` 的延伸能力。
      path: '/product/:id/sku',
      element: () => import('./sku'),
      permCode: 'prd:product:view',
      titleKey: 'prd.sku.title',
      hideInMenu: true,
    },
  ],
};

export default config;
