import DictConfigPage from '../dict-page';

/**
 * 业务配置 · 商品类目（/config/business/category）。
 *
 * 2026-10-06 起不再是"跳出到 /product/category"：类目的可配置项（顺序 / 启用）
 * 归到配置中心，因为它是**业务规则**（类目怎么分层、哪些还在启用），
 * 而 /product/category 是**商品中心的类目视图**（看商品挂在哪）。
 * 两者关心的问题不同，放在一处会让人搞不清"改这里会不会动到商品"。
 */
export default function CategoryConfigPage() {
  return <DictConfigPage dictId="category" />;
}