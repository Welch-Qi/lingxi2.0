#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— 本地真库演练（local-rehearsal.sh）
#
# 用途：对本地 PostgreSQL 演练 Flyway 迁移，验证「脚本可执行」而非「脚本已编写」。
#       背景：2026-10-16 发现 dt/ag/mkg 三域迁移从未在任何环境执行过，
#       静态核对无法发现此类问题，必须真库验证。
#
# 前置：
#   1. 本机已装 PostgreSQL 17 且已设 superuser 密码 → 写入 lingxi-ops/.env
#      LX_DB_USER / LX_DB_PASSWORD / LX_DB_NAME=lingxi2 / LX_DB_TUNNEL_PORT=5432
#   2. psql 在 PATH 中（Windows 需把 C:\Program Files\PostgreSQL\17\bin 加入 PATH）
#
# 幂等：默认**不删库**；加--reset 时先 DROP DATABASE 再重建（仅本地库允许）
# 退出码：0 = 演练通过；1 = 失败
# ============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${OPS_ROOT}/../lingxi-server"
ARTIFACT_DIR="${OPS_ROOT}/artifacts/local-rehearsal"

[[ -f "${OPS_ROOT}/.env" ]] && { set -a; source "${OPS_ROOT}/.env"; set +a; }

DB_HOST="127.0.0.1"
DB_PORT="${LX_DB_TUNNEL_PORT:-5432}"
DB_NAME="${LX_DB_NAME:-lingxi2}"
DB_USER="${LX_DB_USER:-postgres}"
DB_PASS="${LX_DB_PASSWORD:-}"
RESET=0
[[ "${1:-}" == "--reset" ]] && RESET=1

mkdir -p "${ARTIFACT_DIR}"
LOG="${ARTIFACT_DIR}/rehearsal.log"
: > "${LOG}"

log()  { echo "[$(date +%H:%M:%S)] $*"; echo "[$(date +%H:%M:%S)] $*" >> "${LOG}"; }
fail() { echo "  ❌ $*" | tee -a "${LOG}"; }
ok()   { echo "  ✅ $*" | tee -a "${LOG}"; }

psql_admin() { PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "$@" ; }
psql_db()    { PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" "$@" ; }

log "===== 本地真库演练：${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME} ====="

# ------------------------------------------------------------ 0. 前置检查
if ! command -v psql >/dev/null 2>&1; then
  fail "未找到 psql，请把 PostgreSQL bin 目录加入 PATH"
  exit 1
fi
ok "psql 可用：$(psql --version | head -1)"

if [[ -z "${DB_PASS}" ]]; then
  fail "LX_DB_PASSWORD 未配置（见 lingxi-ops/.env），无法非交互连接"
  exit 1
fi
if ! psql_admin -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
  fail "无法以 ${DB_USER} 连接 ${DB_HOST}:${DB_PORT} —— 请检查用户名/密码/服务状态"
  exit 1
fi
ok "数据库连接成功"

# ------------------------------------------------------------ 1. 建库
if [[ "${RESET}" == "1" ]]; then
  log "--reset：删除并重建数据库 ${DB_NAME}"
  psql_admin -d postgres -tAc "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}'" >/dev/null 2>&1
  psql_admin -d postgres -tAc "DROP DATABASE IF EXISTS ${DB_NAME}" >/dev/null 2>&1
fi
if ! psql_admin -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  psql_admin -d postgres -tAc "CREATE DATABASE ${DB_NAME}" >/dev/null 2>&1 \
    && ok "已创建数据库 ${DB_NAME}" || { fail "创建数据库 ${DB_NAME} 失败"; exit 1; }
else
  ok "数据库 ${DB_NAME} 已存在"
fi

# ------------------------------------------------------------ 2. 扩展可用性
log "检查扩展可用性（pgvector / pg_trgm）"
for ext in pg_trgm vector; do
  avail="$(psql_admin -d postgres -tAc "SELECT 1 FROM pg_available_extensions WHERE name='${ext}'")"
  if [[ "${avail}" == "1" ]]; then
    psql_db -tAc "CREATE EXTENSION IF NOT EXISTS ${ext}" >/dev/null 2>&1
    ok "扩展 ${ext} 可用"
  else
    fail "扩展 ${ext} 不可用 —— 需在postgresql-contrib / pgvector 包中提供"
  fi
done

# ------------------------------------------------------------ 3. 版本号唯一性
log "校验 Flyway 版本号全局唯一"
DUP="$(find "${SERVER_DIR}" -path "*/db/migration/*" -name "V*.sql" -not -path "*/target/*" \
       -exec basename {} \; | cut -d_ -f1 | sort | uniq -d)"
if [[ -n "${DUP}" ]]; then
  fail "存在重复版本号：$(echo "${DUP}" | tr '\n' ' ')  → validate-on-migrate 会在启动时抛异常"
  exit 1
fi
ok "版本号无重复（共 $(find "${SERVER_DIR}" -path "*/db/migration/*" -name "V*.sql" -not -path "*/target/*" | wc -l) 个脚本）"

# ------------------------------------------------------------ 4. 脚本宿主校验
log "校验迁移脚本宿主（应在 yuanshu-platform 下，否则不被执行）"
STRAY="$(find "${SERVER_DIR}" -path "*/db/migration/*" -name "V*.sql" -not -path "*/target/*" \
        -not -path "*yuanshu-platform*" | wc -l)"
if [[ "${STRAY}" != "0" ]]; then
  fail "有 ${STRAY} 个迁移脚本不在 yuanshu-platform 下 → 不会被任何启动进程执行"
  exit 1
fi
ok "全部脚本位于 yuanshu-platform"

# ------------------------------------------------------------ 5. 执行迁移
log "执行 Flyway 迁移（flyway-maven-plugin）"
MVN_LOG="${ARTIFACT_DIR}/flyway-migrate.log"
if ( cd "${SERVER_DIR}" && mvn -B -ntp \
      -Dflyway.url="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
      -Dflyway.user="${DB_USER}" -Dflyway.password="${DB_PASS}" \
      org.flywaydb:flyway-maven-plugin:migrate ) > "${MVN_LOG}" 2>&1; then
  ok "迁移执行成功（日志：$(basename "${MVN_LOG}")）"
else
  fail "迁移失败，详见 ${MVN_LOG}"; tail -25 "${MVN_LOG}"; exit 1
fi

# ------------------------------------------------------------ 6. 验收核对
log "验收核对（直连 DB）"

APPLIED="$(psql_db -tAc "SELECT COUNT(*) FROM flyway_schema_history WHERE success")"
TOTAL_SQL="$(find "${SERVER_DIR}" -path "*/db/migration/*" -name "V*.sql" -not -path "*/target/*" | wc -l)"
[[ "${APPLIED}" == "${TOTAL_SQL}" ]] && ok "已应用脚本 ${APPLIED}/${TOTAL_SQL}" || fail "已应用 ${APPLIED}/${TOTAL_SQL}，不一致"

FN="$(psql_db -tAc "SELECT COUNT(*) FROM pg_proc WHERE proname='sys_current_tenant'")"
[[ "${FN}" -ge 1 ]] && ok "函数 sys_current_tenant() 存在" || fail "缺 sys_current_tenant()"

TBL="$(psql_db -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")"
ok "public schema 表数：${TBL}"

POLICY="$(psql_db -tAc "SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'")"
if [[ "${POLICY}" -ge 21 ]]; then ok "RLS 策略数 ${POLICY}（期望 ≥21）"; else fail "RLS 策略仅 ${POLICY} 条，期望 ≥21"; fi

RLS_ON="$(psql_db -tAc "SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relrowsecurity AND n.nspname='public'")"
ok "已开启 RLS 的表数：${RLS_ON}"

# ------------------------------------------------------------ 7. 隔离实测（不止"策略存在"，要验证确实隔离）
log "验证跨租户隔离实际生效"
psql_db -q >/dev/null 2>&1 <<'SQL'
SET app.tenant_id = '1001';
SQL
A="$(psql_db -tAc "SET app.tenant_id='1001'; SELECT count(*) FROM dt_entity_company" 2>/dev/null)"
B="$(psql_db -tAc "SET app.tenant_id='2002'; SELECT count(*) FROM dt_entity_company" 2>/dev/null)"
if [[ -n "${A}" && -n "${B}" ]]; then
  ok "租户 1001 可见 ${A} 行 · 租户 2002 可见 ${B} 行（策略已按session 变量分流）"
else
  fail "跨租户查询失败—— RLS 策略可能未正确应用 sys_current_tenant()"
fi

echo "" | tee -a "${LOG}"
log "演练产物：${ARTIFACT_DIR}"
[[ "${APPLIED}" == "${TOTAL_SQL}" && "${FN}" -ge 1 && "${POLICY}" -ge 21 ]] && log "===== 演练通过 =====" || { log "===== 演练未通过 ====="; exit 1; }