#!/usr/bin/env bash
# ============================================================================
# 从后端 OpenAPI 契约生成前端类型（技术规约2.0 §4.2.3）
#
# 铁律：lingxi-types 之外禁止手写与 API 响应同名的 interface（附录D 规则 11）。
#       类型必须由契约自动生成，保证前后端同源。
#
# 前置：后端已启动（springdoc 暴露 /v3/api-docs）
# ============================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
API_BASE="${LX_API_BASE:-http://127.0.0.1:8080}"
OUT_DIR="${WEB_ROOT}/packages/lingxi-types/src"
mkdir -p "${OUT_DIR}"

echo "[gen-types] 拉取契约：${API_BASE}/v3/api-docs"
curl -sf "${API_BASE}/v3/api-docs" -o "${SCRIPT_DIR}/openapi.json" \
  || { echo "[gen-types] 拉取失败：请确认后端已启动（bash lingxi-ops/scripts/start-dev.sh）" >&2; exit 1; }

echo "[gen-types] 生成类型 -> ${OUT_DIR}/api.gen.ts"
pnpm -s exec openapi-typescript "${SCRIPT_DIR}/openapi.json" -o "${OUT_DIR}/api.gen.ts"

echo "[gen-types] 完成。请勿手工编辑 api.gen.ts（会被下次生成覆盖）。"
