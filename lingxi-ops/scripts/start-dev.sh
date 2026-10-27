#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— start-dev.sh
#
# 职责：启动本地开发环境（后端服务 + 前端 dev server），PID 文件管理并检查端口占用
# 幂等：重复执行安全（已在运行则跳过）
# 依据：《灵犀系统技术规约2.0》§4.13.2 · §2.5
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

# ---- 配置单一来源（2026-10-23 收敛）----
# 权威配置目录 = lingxi-ops/config（verify-skeleton.sh 校验它）。
# 应用侧 application.yml 的 spring.config.import 用 ${LX_CONFIG_DIR:./config} 解析，
# 此处注入绝对路径 -> 后端无论从哪个工作目录启动都读同一份配置。
# 此前 lingxi-server/config/ 存着一份完全相同的副本，改一份不生效另一份（已造成多次排查耗时）。
export LX_CONFIG_DIR="${CONFIG_DIR}"
log "配置来源（单一来源）：${LX_CONFIG_DIR}"
for cfg in app db cache model tunnel; do
  [[ -f "${LX_CONFIG_DIR}/${cfg}.yml" ]] || fail "权威配置缺失：${LX_CONFIG_DIR}/${cfg}.yml（先补齐再启动）"
done

require_env() {
  local missing=()
  for key in "$@"; do
    [[ -z "${!key:-}" ]] && missing+=("${key}")
  done
  if (( ${#missing[@]} > 0 )); then
    fail "以下环境变量未配置：${missing[*]}（见 .env.example）"
  fi
}

SCRIPT_NAME="start-dev"
SERVER_DIR="${OPS_ROOT}/../lingxi-server"
WEB_DIR="${OPS_ROOT}/../lingxi-web"
BACKEND_PID="${RUNTIME_DIR}/backend.pid"
FRONTEND_PID="${RUNTIME_DIR}/frontend.pid"
BACKEND_PORT="${SERVER_PORT:-8080}"
FRONTEND_PORT="${LX_WEB_PORT:-5173}"

is_running() {
  local pid_file="$1"
  [[ -f "${pid_file}" ]] && kill -0 "$(cat "${pid_file}" 2>/dev/null)" 2>/dev/null
}

port_busy() {
  (echo > "/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

# ---- 前置：环境体检（环境不通不启动，§3.1 E6）----
log "环境体检…"
bash "${SCRIPT_DIR}/check-env.sh" || fail "环境体检未通过，禁止启动服务"

# ---- 后端 ----
if is_running "${BACKEND_PID}"; then
  log "后端已在运行（PID=$(cat "${BACKEND_PID}")），跳过"
else
  port_busy "${BACKEND_PORT}" && fail "端口 ${BACKEND_PORT} 已被占用，请先执行 stop-dev.sh 或排查占用进程"
  log "启动后端（spring-boot:run，profile=${SPRING_PROFILES_ACTIVE:-dev}）…"
  ( cd "${SERVER_DIR}" && nohup mvn -q -pl :yuanshu-platform -am spring-boot:run \
      -Dspring-boot.run.profiles="${SPRING_PROFILES_ACTIVE:-dev}" \
      > "${LOG_DIR}/backend.log" 2>&1 & echo $! > "${BACKEND_PID}" )
  log "后端 PID=$(cat "${BACKEND_PID}")，日志：${LOG_DIR}/backend.log"
fi

# ---- 前端 ----
if is_running "${FRONTEND_PID}"; then
  log "前端已在运行（PID=$(cat "${FRONTEND_PID}")），跳过"
else
  port_busy "${FRONTEND_PORT}" && fail "端口 ${FRONTEND_PORT} 已被占用"
  log "启动前端（pnpm dev）…"
  ( cd "${WEB_DIR}" && nohup pnpm dev --port "${FRONTEND_PORT}" \
      > "${LOG_DIR}/frontend.log" 2>&1 & echo $! > "${FRONTEND_PID}" )
  log "前端 PID=$(cat "${FRONTEND_PID}")，日志：${LOG_DIR}/frontend.log"
fi

# ---- 就绪等待 ----
log "等待后端健康检查通过…"
for i in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/actuator/health" >/dev/null 2>&1; then
    log "后端就绪：http://127.0.0.1:${BACKEND_PORT}（前端：http://127.0.0.1:${FRONTEND_PORT}）"
    exit 0
  fi
  sleep 2
done
warn "后端 120 秒内未就绪，请查看 ${LOG_DIR}/backend.log"
