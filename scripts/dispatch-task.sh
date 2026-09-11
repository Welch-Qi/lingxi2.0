#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— dispatch-task.sh（任务派发）
#
# 职责：读统一任务清单 tasks/ -> 按 tier 分级选模型 -> 调 AI Coding 工具执行
# 幂等：按任务 ID 去重（已在运行或已完成的任务不重复派发）
# 依据：《灵犀系统技术规约2.0》§1.3 AI Coding 适配原则 · 附录D
#
# 铁律：
#   - T5（重构/架构调整）禁止 AI 自主，必须先人设计（§1.3 A2）
#   - 任务边界永不包含 docs/ 与 config/（§1.3 A3）
#   - 交付前先跑 check-env.sh，环境不通不派发（§3.1 E6）
# ============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${OPS_ROOT}/.." && pwd)"
TASK_DIR="${PROJECT_ROOT}/lingxi-server/tasks"
ARTIFACT_DIR="${OPS_ROOT}/artifacts"
RUNTIME_DIR="${OPS_ROOT}/artifacts/runtime"
PAUSE_FLAG="${RUNTIME_DIR}/.tunnel-down"
DISPATCHED_FILE="${RUNTIME_DIR}/dispatched.list"

[[ -f "${OPS_ROOT}/.env" ]] && { set -a; source "${OPS_ROOT}/.env"; set +a; }

SCRIPT_NAME="dispatch-task"
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [dispatch] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [dispatch] [FAIL] $*" >&2; exit 1; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [dispatch] [WARN] $*" >&2; }

MAX_TASKS="${1:-${LX_NIGHTLY_MAX_TASKS:-3}}"     # 单晚 2~4 个任务，控制失败半径

# ---- 前置 1：隧道不通不派发（§3.1 E6）----
if [[ -f "${PAUSE_FLAG}" ]]; then
  fail "检测到 ${PAUSE_FLAG}：环境不通，今晚禁止派发任务（先修复隧道）"
fi

# ---- 前置 2：TASKS.md 唯一写入者是协调 Agent；本脚本只读 ----
TASKS_MD="${TASK_DIR}/TASKS.md"
[[ -f "${TASKS_MD}" ]] || fail "未找到任务清单：${TASKS_MD}"

log "扫描 READY 任务（上限 ${MAX_TASKS} 个）…"

# tier -> 模型与轮次上限映射（任务简报首行形如： tier: T1  id: T1042）
model_for_tier() {
  case "$1" in
    T1) echo "${LX_MODEL_TIER1:-qwen3.8-max}" ;;      # 核心功能：Max 档
    T2) echo "${LX_MODEL_TIER2:-qwen3.8-plus}" ;;     # 修复/CRUD/对接：Plus 档
    T3) echo "${LX_MODEL_TIER3:-qwen3.8-effective}" ;; # 测试/文档/迁移：Effective 档
    T4) echo "${LX_MODEL_TIER4:-qwen3.8-plus}" ;;     # 数据与集成适配器
    T5) echo "" ;;                                    # 禁止 AI 自主
    *)  echo "${LX_MODEL_TIER2:-qwen3.8-plus}" ;;
  esac
}

maxturns_for_tier() {
  case "$1" in
    T1) echo 60 ;; T2) echo 40 ;; T3) echo 25 ;; T4) echo 40 ;; *) echo 40 ;;
  esac
}

timeout_for_tier() {
  case "$1" in
    T1) echo 90m ;; T2) echo 60m ;; T3) echo 30m ;; T4) echo 60m ;; *) echo 60m ;;
  esac
}

count=0
for brief in "${TASK_DIR}"/M*.md; do
  [[ -f "${brief}" ]] || continue
  (( count >= MAX_TASKS )) && break

  TASK_ID="$(grep -m1 -oE 'id:[[:space:]]*[A-Za-z0-9_-]+' "${brief}" | awk '{print $2}' || true)"
  TIER="$(grep -m1 -oE 'tier:[[:space:]]*T[0-9]' "${brief}" | awk '{print $2}' || true)"
  [[ -z "${TASK_ID}" ]] && { warn "跳过无 id 的简报：${brief}"; continue; }
  [[ -z "${TIER}" ]] && { warn "${TASK_ID} 缺 tier 字段，按 T2 处理（分级是模型路由依据）"; TIER="T2"; }

  # 去重：已完成/已派发的不重复派发
  if [[ -f "${DISPATCHED_FILE}" ]] && grep -qx "${TASK_ID}" "${DISPATCHED_FILE}"; then
    log "${TASK_ID} 已派发过，跳过（幂等）"
    continue
  fi

  # T5 红线：重构与架构调整禁止 AI 自主（§1.3 A2）
  if [[ "${TIER}" == "T5" ]]; then
    warn "${TASK_ID} 为 T5（重构/架构调整）：禁止 AI 自主执行，需人工设计后拆分为 T1/T2 再派发"
    continue
  fi

  MODEL="$(model_for_tier "${TIER}")"
  MAX_TURNS="$(maxturns_for_tier "${TIER}")"
  TMO="$(timeout_for_tier "${TIER}")"
  OUT_DIR="${ARTIFACT_DIR}/${TASK_ID}"
  mkdir -p "${OUT_DIR}"

  log "派发 ${TASK_ID}（tier=${TIER} model=${MODEL} maxTurns=${MAX_TURNS} timeout=${TMO}）"

  # 简报由协调 Agent 先写入仓库，AI 工具自行读取（需求变更只改简报，派发逻辑不动）
  PROMPT="读取任务简报 ${brief#${PROJECT_ROOT}/}，严格按 docs/08-standards 技术规约与 contracts.md 实现；"
  PROMPT+="任务边界不包含 docs/ 与 config/；完成后运行本地 lint 与单元测试，"
  PROMPT+="并将结果写入 artifacts/${TASK_ID}/result.json（含 status / prUrl / tests / coverage / changedFiles）。"

  case "${LX_DISPATCH_TOOL:-qoder}" in
    qoder)
      # Qoder CLI：headless 同步执行，执行完即拿结果（比云端 API 链路更短）
      timeout "${TMO}" qodercli -p "${PROMPT}" \
        --model "${MODEL}" \
        --max-turns "${MAX_TURNS}" \
        --worktree \
        --output-format json \
        > "${OUT_DIR}/dispatch.stdout.json" 2> "${OUT_DIR}/dispatch.stderr.log"
      ;;
    cursor)
      # Cursor Headless CLI：小任务与修复类
      timeout "${TMO}" cursor-agent -p --force --output-format json \
        --model "${MODEL}" "${PROMPT}" \
        > "${OUT_DIR}/dispatch.stdout.json" 2> "${OUT_DIR}/dispatch.stderr.log"
      ;;
    *)
      fail "未知的 LX_DISPATCH_TOOL=${LX_DISPATCH_TOOL}（支持 qoder / cursor）"
      ;;
  esac
  RC=$?

  if (( RC == 0 )); then
    log "${TASK_ID} 派发执行结束（exit=0）"
    echo "${TASK_ID}" >> "${DISPATCHED_FILE}"
  elif (( RC == 124 )); then
    warn "${TASK_ID} 超时（${TMO}）：按硬截止处理，产出可能不完整，交由验收判定"
    echo "${TASK_ID}" >> "${DISPATCHED_FILE}"
  else
    warn "${TASK_ID} 执行失败（exit=${RC}）：日志见 artifacts/${TASK_ID}/dispatch.stderr.log"
  fi
  count=$((count + 1))
done

log "本轮派发结束，共处理 ${count} 个任务"
log "下一步：由协调 Agent 跑 qa-gate.sh 验收，并按结果更新 TASKS.md 状态机"
