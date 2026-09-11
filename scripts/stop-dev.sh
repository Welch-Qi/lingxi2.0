#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— stop-dev.sh
#
# 职责：停止本地前后端服务并释放端口（优雅停机）
# 幂等：重复执行安全（无进程则直接退出）
# 依据：《灵犀系统技术规约2.0》§4.13.2
#
# 约束（§3.1 E5）：所有环境操作只能通过 scripts/ 中的脚本执行，禁止手工操作。
# 本脚本为 lingxi-ops 权威版本；各仓库根级 scripts/ 只放薄封装，禁止复制修改。
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_DIR="${OPS_ROOT}/config"
RUNTIME_DIR="${LX_RUNTIME_DIR:-${OPS_ROOT}/artifacts/runtime}"
LOG_DIR="${LX_LOG_DIR:-${OPS_ROOT}/artifacts/logs}"
mkdir -p "${RUNTIME_DIR}" "${LOG_DIR}"

# ---- 载入环境变量（.env 优先；缺失则用 .env.example 兜底仅用于提示） ----
if [[ -f "${OPS_ROOT}/.env" ]]; then
  set -a; # shellcheck disable=SC1091
  source "${OPS_ROOT}/.env"; set +a
else
  echo "[WARN] 未找到 ${OPS_ROOT}/.env；请先执行： cp .env.example .env 并填写真实值" >&2
fi

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] [FAIL] $*" >&2; exit 1; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [${SCRIPT_NAME}] [WARN] $*" >&2; }

require_env() {
  local missing=()
  for key in "$@"; do
    [[ -z "${!key:-}" ]] && missing+=("${key}")
  done
  if (( ${#missing[@]} > 0 )); then
    fail "以下环境变量未配置：${missing[*]}（见 .env.example）"
  fi
}

SCRIPT_NAME="stop-dev"
BACKEND_PID="${RUNTIME_DIR}/backend.pid"
FRONTEND_PID="${RUNTIME_DIR}/frontend.pid"

stop_one() {
  local name="$1" pid_file="$2"
  if [[ -f "${pid_file}" ]]; then
    local pid; pid="$(cat "${pid_file}" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      log "停止 ${name}（PID=${pid}）…"
      kill "${pid}" 2>/dev/null || true
      for _ in $(seq 1 15); do
        kill -0 "${pid}" 2>/dev/null || break
        sleep 1
      done
      kill -0 "${pid}" 2>/dev/null && { warn "${name} 未响应 TERM，强制结束"; kill -9 "${pid}" 2>/dev/null || true; }
      log "${name} 已停止"
    else
      log "${name} 未在运行"
    fi
    rm -f "${pid_file}"
  else
    log "${name} 无 PID 文件，跳过"
  fi
}

# 先停前端（避免请求打到正在关闭的后端）
stop_one "前端" "${FRONTEND_PID}"
stop_one "后端" "${BACKEND_PID}"

# 清理可能残留的 Maven / Vite 子进程
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

log "端口状态检查："
for p in "${SERVER_PORT:-8080}" "${LX_WEB_PORT:-5173}"; do
  if (echo > "/dev/tcp/127.0.0.1/${p}") >/dev/null 2>&1; then
    warn "端口 ${p} 仍被占用"
  else
    log "端口 ${p} 已释放"
  fi
done
