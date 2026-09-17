/**
 * 本包的环境变量声明。
 *
 * 为什么自己声明而不引 `vite/client`：`@lingxi/request` 是平台无关的请求层，
 * 不应该依赖构建器的客户端类型。`vite/client` 的 ImportMetaEnv 带 `[key: string]: any`
 * 索引签名，会让 `import.meta.env.VITE_API_BASE_URL` 变成 any，
 * 一路污染成 no-unsafe-assignment / no-unsafe-member-access 报错。
 * 显式声明需要的变量，既去掉 any，也让"这个包依赖哪些环境变量"一目了然。
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
