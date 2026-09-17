# 人工 Review 申请：AuthProvider 静态预览旁路

| 项 | 内容 |
|---|---|
| 申请日期 | 2026-09-16 |
| 审查对象 | `lingxi-web/apps/lingxi-web/src/app/providers/previewSession.ts`<br>`lingxi-web/apps/lingxi-web/src/app/providers/previewFixtures.ts`<br>`lingxi-web/apps/lingxi-web/src/app/providers/AuthProvider.tsx`（调用点）<br>`lingxi-web/apps/lingxi-web/src/features/agent-task/api.ts`（调用点） |
| 命中红线 | 技术规约2.0 **附录E ① 认证 / 会话**（不可自动合并，须人工 Review） |
| 结论建议 | 具备合并条件，但**上线前有一项前置动作必须完成**（见文末） |

---

## 一、这次改了什么

静态页面搭建阶段后端与 Keycloak 尚未就绪。若不放开闸门，打开 `localhost:5173` 只会停在登录页，
已完成的 11 个分区页面一个都看不到，前端无法自检视觉与信息结构。

为此新增两条旁路，**仅用于本地自检**：

1. **会话占位**（`previewSession.ts`）：`isStaticPreview()` 为真时，直接把用户/租户/权限码
   置为演示值并标记为已认证，跳过 OIDC。
2. **数据占位**（`previewFixtures.ts`）：任务中心在预览态返回固定的待办任务，替代后端接口。

原有认证链路（OIDC 授权码 + PKCE、租户注入、静默续期、令牌仅存内存）**未做任何改动**，
`AuthProvider` 仅在 `bootstrap()` 开头插入了一个提前 return 的分支。

## 二、安全边界是怎么做的

```ts
export function isStaticPreview(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_LX_STATIC_PREVIEW === 'true';
}
```

- **双重条件**：`import.meta.env.DEV` 由构建器静态注入，生产构建恒为 `false`；
  且必须显式配置 `VITE_LX_STATIC_PREVIEW=true` 才生效。
- 因 `DEV` 是编译期常量，`DEV && ...` 在生产构建中被判定为死代码并摇树移除。
- 开关只存在于 `apps/lingxi-web/.env.development`（当前值 `VITE_LX_STATIC_PREVIEW=true`），
  **不存在于 `.env.production` / `.env`**。

## 三、已验证的证据（请 reviewer 复核，勿只采信本段结论）

### 证据 1：生产产物中无旁路逻辑

对构建产物全部 **38 个 JS 文件**做字符串扫描：

| 特征串 | 产物中出现情况 |
|---|---|
| `VITE_LX_STATIC_PREVIEW` | 未出现 ✅ |
| `preview-user`（预览用户 id） | 未出现 ✅ |
| `preview-tenant`（预览租户 id） | 未出现 ✅ |
| `preview@example.com` | 未出现 ✅ |
| `PREVIEW_PENDING_TASKS` / `4 LinkedIn posts ready for approval` / `2026-09-11T01:42:00Z` | 未出现 ✅ |

**两处"看似残留"经追查均与旁路无关**，供 reviewer 免于重复排查：

- `demo.role.owner`、`NovaVolt Energy` → 来自 `src/locales/{zh-CN,en-US}/common.json`
  的 i18n key 与 `ws.tenantName` 取值，本应随语言包进产物。
- `BluePeak Storage LLC` → 出现在 `routes/{customer,order,service}/index.tsx` 的演示行数据里，
  属页面级静态数据，非预览模块。

### 证据 2：运行时失效

用生产构建产物（`SHOT_MODE=static`）打开任意路由，页面显示「身份认证服务暂不可用」，
即 DEV-only 旁路在构建产物中确实不生效。

### 证据 3：门禁

`pnpm typecheck` 通过、`pnpm lint` 0 error、`pnpm build` 成功。

## 四、请 reviewer 明确回答的问题

1. **是否接受**在前端保留 DEV-only 的会话旁路（而非改用 mock server / MSW 拦截请求）？
2. `previewSession.ts` 里的权限码集合（12 个 `*:view`）**是否会被误当成真实授权依据**？
   当前它只喂给 `PermissionContext` 做渲染控制，不参与任何后端请求。是否需要在类型或命名上再加防误用约束？
3. 旁路代码位于 `app/providers/` 而非测试目录，**是否接受**？若倾向更隔离，可迁至 `src/dev/` 并以
   `import.meta.env.DEV` 动态导入，代价是本地自检多一层异步。
4. 是否同意把「**后端与 Keycloak 就绪后置 `VITE_LX_STATIC_PREVIEW=false` 并删除这两个文件**」
   作为一期联调完成的退出条件写进任务清单？

## 五、上线前必须完成的前置动作（阻塞项）

- [ ] 确认 `apps/lingxi-web/.env.development` **不会**被打进生产镜像 / 部署包；
      生产环境不得存在 `VITE_LX_STATIC_PREVIEW=true`。
- [ ] 打包流水线增加一条断言：生产产物中不得出现 `VITE_LX_STATIC_PREVIEW` 字符串
      （本次人工扫描用的就是这条判据，建议固化成 CI 检查）。
- [ ] 后端会话接口 `/api/v1/platform/session` 与 Keycloak 就绪后，删除
      `previewSession.ts`、`previewFixtures.ts` 及两处调用点，并移除该环境变量。

---

## 附：复审用的复现命令

```bash
cd lingxi-web
pnpm build

# 断言一：产物中不得出现旁路开关
node -e "const fs=require('fs'),p='apps/lingxi-web/dist/assets';const h=fs.readdirSync(p).filter(f=>f.endsWith('.js')).filter(f=>fs.readFileSync(p+'/'+f,'utf8').includes('VITE_LX_STATIC_PREVIEW'));console.log(h.length===0?'PASS 无旁路残留':'FAIL '+h.join(','))"

# 断言二：产物入口不得含 vendor-chart（图表按需加载，见 vite.config.ts）
node -e "const fs=require('fs');console.log(fs.readFileSync('apps/lingxi-web/dist/index.html','utf8').includes('vendor-chart')?'FAIL 图表进了首屏':'PASS 图表未进首屏')"
```
