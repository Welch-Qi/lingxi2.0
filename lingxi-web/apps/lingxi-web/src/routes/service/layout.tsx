import { useOutlet } from 'react-router';

/**
 * 客服中心分区外壳（2026-09-29 重构）。
 *
 * 旧版用本文件做「四模块切换器」（.lx-mkgnav）。重构后客服中心是一个**坐席工作台**，
 * 四能力内聚在 /service 单页里，不再需要顶部切换器——外壳只负责把路由出口放进
 * 全高的 `.lx-svc-shell`（让工作台撑满内容区），其余交给 index.tsx。
 */
export default function ServiceLayout() {
  const outlet = useOutlet();
  return <div className="lx-svc-shell">{outlet}</div>;
}
