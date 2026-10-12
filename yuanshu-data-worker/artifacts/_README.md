# artifacts/ · 任务产出与验收结果

> 命名：`artifacts/M{模块}/result.json`（单任务）与 `artifacts/{taskId}/qa-result.json`（门禁结果）。

## 规则

1. **验收凭产物，不凭自报**：任务置 `QA_PASS` 必须依据本目录下的结果文件
   （AGENTS.md 铁律 9）。仅口头或文字声明「已完成」视为未完成。
2. 本目录下的**结论文件入库**（评审证据），日志与临时文件不入库（见根级 `.gitignore`）。
3. 结果文件至少包含：任务号、执行时间、变更文件清单、测试与覆盖率、门禁各步结论、失败原因。

## 典型内容

```
artifacts/
├── M0202/
│   └── result.json            # 任务产物
└── M0202-001/
    └── qa-result.json         # qa-gate.sh 输出（6 步门禁结论）
```
