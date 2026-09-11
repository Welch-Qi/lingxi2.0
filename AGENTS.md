# AGENTS.md · lingxi-ops（运维与配置）

> 总纲见仓库组根级 `../AGENTS.md`（本文件冲突时以根级为准）。

## 这是 AI Agent 操作环境的**唯一入口**

```bash
./scripts/tunnel-up.sh              # 建隧道（幂等，重复执行不产生重复进程）
./scripts/check-tunnel.sh           # 三层探测 + 失败自动重建
./scripts/init-db.sh                # 初始化/迁移（含迁移前备份）
./scripts/start-dev.sh | stop-dev.sh
./scripts/check-env.sh              # 四层体检（隧道/DB/缓存/服务）
./scripts/qa-gate.sh                # 验收门禁（6 步）
./scripts/dispatch-task.sh {任务号}
./scripts/verify-tenant-isolation.sh
./scripts/deploy.sh | rollback.sh
```

## 本仓库特有约束

1. **所有脚本必须幂等**——Agent 会重跑，重复执行不得产生重复进程/重复数据/报错退出。
2. **禁止绕过脚本手敲命令**（如直接 `mvn spring-boot:run`、手工 `psql` 改数据）。
3. **`config/*.yml` 只放非敏感配置**；密钥/口令一律进 `.env`（**严禁入库**，`.gitignore` 已锁）。
   `model.yml` 是**唯一**允许出现模型名的地方，业务代码只引用场景码。
4. **夜间派发前必须 `check-env.sh` 通过**；隧道不通则不派发（避免整夜产出废代码）。
5. **`deploy.sh` 必须保留上一版本产物**，回滚目标 <5 分钟。
6. **禁止引入 Docker / K8s**：出现 `Dockerfile` / `docker-compose` / k8s 清单即违反规约。
7. 采集与发布脚本改动属高风险动作，须人工 Review。

## 隧道参数（`config/tunnel.yml`）

`ServerAliveInterval 30` · `ServerAliveCountMax 3` · `ExitOnForwardFailure yes`（autossh 保活）
