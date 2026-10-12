#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— init-db.sh
#
# 职责：数据库初始化与迁移（经隧道连云端库），迁移前自动备份
# 幂等：可重复执行（Flyway 自身幂等；备份文件按时间戳命名不覆盖）
# 依据：《灵犀系统技术规约2.0》§4.13.2 · §4.4.3
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

SCRIPT_NAME="init-db"
require_env LX_DB_USER LX_DB_PASSWORD

DB_LOCAL_PORT="${LX_DB_TUNNEL_PORT:-13306}"
DB_NAME="${LX_DB_NAME:-lingxi}"
BACKUP_DIR="${RUNTIME_DIR}/db-backup"
mkdir -p "${BACKUP_DIR}"

# ---- 前置：环境必须先通（E6）----
log "前置检查隧道…"
bash "${SCRIPT_DIR}/check-tunnel.sh" || fail "隧道不通，禁止执行数据库操作"

# ---- 迁移前备份（§4.4.3 变更评审要求含回滚预案）----
STAMP="$(date -u +%Y%m%d%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${STAMP}.dump"
if command -v pg_dump >/dev/null 2>&1; then
  log "迁移前备份 -> ${BACKUP_FILE}"
  PGPASSWORD="${LX_DB_PASSWORD}" pg_dump -h 127.0.0.1 -p "${DB_LOCAL_PORT}" -U "${LX_DB_USER}" \
    -d "${DB_NAME}" -Fc -f "${BACKUP_FILE}" || fail "备份失败，中止迁移（不允许无备份迁移）"
  log "备份完成：$(du -h "${BACKUP_FILE}" | cut -f1)"
else
  warn "未安装 pg_dump，跳过备份（生产环境必须安装）"
fi

# ---- 执行迁移（Flyway Maven 插件，位置清单见 config/db.yml）----
log "执行 Flyway 迁移…"
cd "${ROOT:-${OPS_ROOT}/../lingxi-server}" 2>/dev/null || cd "${OPS_ROOT}/../lingxi-server"
mvn -q -pl :yuanshu-platform -am flyway:migrate \
  -Dflyway.url="jdbc:postgresql://127.0.0.1:${DB_LOCAL_PORT}/${DB_NAME}" \
  -Dflyway.user="${LX_DB_USER}" \
  -Dflyway.password="${LX_DB_PASSWORD}" \
  -Dflyway.locations="filesystem:yuanshu/yuanshu-platform/src/main/resources/db/migration/sys,filesystem:yuanshu/yuanshu-data/src/main/resources/db/migration/dt,filesystem:lingxi/lingxi-agent/src/main/resources/db/migration/ag" \
  || fail "迁移失败；可用最新备份回滚：${BACKUP_FILE}"

log "迁移完成。已发布脚本禁止修改（§3.3 D8），修正请新增脚本"
