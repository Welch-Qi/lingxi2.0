# 创建 PR 步骤（3 步，2 分钟）

## 第 1 步：打开 PR 创建页

点这个链接（base 与 head 已预填）：

```
https://github.com/Welch-Qi/lingxi2.0/compare/feature/infra-three-product-repo-upgrade-M0000-001...fix/three-product-module-split-M0000-001?expand=1
```

页面上的两个下拉框应该已经是：
- **base**：`feature/infra-three-product-repo-upgrade-M0000-001`  ← **必须是这个，不能是 main**
- **compare**：`fix/three-product-module-split-M0000-001`

> ⚠️ 若 base 显示成 `main`，说明是默认选错了 —— **手动改成上面那个**。
> 本分支是堆叠链的第 4 层，直接对 main 开 PR 会混入下层 7 笔改动。

## 第 2 步：填标题与正文

- **标题**（可直接复制）：
```
三产品模块拆分 + 文档先行五件套 + 真库演练闭环
```

- **正文**：打开同目录的 `PR-DESCRIPTION.md`，**全选复制**，
  粘贴到 PR 正文的第一个编辑框。

> 想省事的话，直接点这个预填链接（标题+正文都已填好，25KB 的 URL，
> 个别浏览器可能截断，若正文空白则改用手动粘贴）：
```
（见 .workbuddy/pr-url.txt）
```

## 第 3 步：核对并提交

提交前核对 GitHub 页面上的统计数字，应与下表**完全一致**：

| 项 | 期望值 |
|---|---|
| Commits | **20** |
| Files changed | **133** |
| Additions | **+5426** |
| Deletions | **−822** |

✅ 一致即可点 **Create pull request**。

---

## 合并顺序提醒（本 PR 是第 4 层）

```
main
 └─ fix/build-pom-unblock-M0000-001                          ← 第1层，先合
     └─ fix/server-deps-boot4-adapt-M0000-001                ← 第2层
         └─ feature/infra-three-product-repo-upgrade-M0000-001 ← 第3层
             └─ fix/three-product-module-split-M0000-001     ← 本 PR，第4层，最后合
```

四层关系已用 `git merge-base --is-ancestor` 逐层校验，严格线性。
**必须按序合**，否则下一层的 base 不存在。

---

## 提交后建议的 PR 标签 / 评审人

- 标签：`M0000-008`（本 PR 主体）、`M0000-001`（模块拆分部分）
- 评审人：**必须包含 1 名元枢底座 Owner** ——
  本 PR 触及**租户隔离权限**红线（RLS 策略 + 拦截器 + Filter），
  按 AGENTS.md 铁律 10 需人工 Review，不能自动合并
- 建议同时挂 `需要裁决` 标签（3 条红线待决策，详见正文「评审关注点」）

## 合并前必须绿的两项

```bash
bash lingxi-ops/scripts/qa-gate.sh                       # 验收门禁
bash lingxi-ops/scripts/verify-tenant-isolation.sh <A_TOKEN> <B_TOKEN>   # 6 项隔离套件
```

> ⚠️ 隔离套件 ①~⑤ 当前**仍会失败** —— 所依赖的 `/api/v1/cus|kc|ag` 接口尚无 Controller 实现。
> 这是**已知遗留**（本 PR 未引入），已在 PR 描述的「已知遗留」段落声明，
> 并已写成任务简报（`tasks/`）。评审时可据此判断是否放行本 PR。
