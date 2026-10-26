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

# 连接前置检查：
#   · 有口令 → 校验口令能否连上
#   · 无口令 → **允许免密认证**（CI 的 PostgreSQL service 用 trust 模式，
#     此时 PGPASSWORD 为空也能连上）。原实现硬性要求口令非空 →
#     CI 环境下必然报「LX_DB_PASSWORD 未配置」而失败。
#     改为：先试连，连不上才报错 —— 判定依据是**实际连通性**而非配置有无。
if [[ -z "${DB_PASS}" ]]; then
  if psql_admin -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    ok "数据库连接成功（免密认证模式，LX_DB_PASSWORD 未配置）"
  else
    fail "无法以 ${DB_USER} 连接 ${DB_HOST}:${DB_PORT}（LX_DB_PASSWORD 未配置且免密连接失败）—— 见 lingxi-ops/.env"
    exit 1
  fi
else
  if ! psql_admin -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
    fail "无法以 ${DB_USER} 连接 ${DB_HOST}:${DB_PORT} —— 请检查用户名/密码/服务状态"
    exit 1
  fi
  ok "数据库连接成功"
fi

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
# 只做「可用性检查」，不预先创建 ——
# 扩展由迁移脚本自身的 CREATE EXTENSION IF NOT EXISTS 建立（保证任何环境都能正确初始化），
# 此处预建会导致迁移时出现「extension already exists」警告。
for ext in pg_trgm vector; do
  avail="$(psql_admin -d postgres -tAc "SELECT 1 FROM pg_available_extensions WHERE name='${ext}'")"
  if [[ "${avail}" == "1" ]]; then
    ok "扩展 ${ext} 可用（由迁移脚本创建）"
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
log "执行 Flyway 迁移（独立 Java 执行器）"
MVN_LOG="${ARTIFACT_DIR}/flyway-migrate.log"
# 为什么不用 flyway-maven-plugin：
#   flyway 13.x 把数据库驱动拆成独立模块，CLI 以 default-cli 方式调用时不会加载
#   pom 里声明的插件依赖，报 "No Flyway database plugin found to handle ********"。
#   改用直调 Flyway Java API，classpath 显式带齐 core + database-postgresql + JDBC 驱动。
# classpath 解析：**动态**用 mvn dependency:build-classpath 取，
# 不再硬编码 ~/.m2 路径与版本号 ——
#   历史缺陷：硬编码 ${HOME}/.m2/repository + 固定 flyway 版本，
#   在 CI（全新 runner，m2 为空）与任何版本变动后即失效，
#   表现为「classpath 缺失: .../flyway-core-13.6.0.jar」而原因被掩盖。
#   动态解析后：mvn 负责确定版本与下载路径，脚本只取结果。
FLYWAY_VER="$(grep -oE '<flyway.version>[^<]+' "${SERVER_DIR}/lingxi-dependencies/pom.xml" | head -1 | sed 's/.*>//')"
[[ -z "${FLYWAY_VER}" ]] && FLYWAY_VER="13.6.0"
M2_REPO="${HOME}/.m2/repository"

resolve_cp() {
  # 输出 classpath（分隔符随平台）；解析不到则输出空。
  #
  # 为何不用 mvn dependency:build-classpath：
  #   在聚合根 pom 上执行时，它解析的是 **BOM 自身**的依赖（dependencyManagement
  #   不含实际依赖），得到的是本地仓库里的**旧残留版本**（实测 12.4.0）
  #   而非本仓声明的 flyway.version（13.6.0）—— 而 12.4.0 没有
  #   flyway-database-postgresql 模块（13.x 才拆分出来），运行必然失败。
  #
  # 改为：按**版本号精确匹配**在本地仓库定位 jar —— 版本号来自本仓 BOM，
  # 路径由本地仓库决定，两者都与环境无关。
  local cp_file="${ARTIFACT_DIR}/flyway-cp.txt"
  mkdir -p "${ARTIFACT_DIR}"
  rm -f "${cp_file}"
  ( cd "${SERVER_DIR}" && mvn -B -ntp -q dependency:build-classpath \
      -Dmdep.outputFile="${cp_file}" \
      -Dmdep.includeScope=runtime \
      -DincludeGroupIds=org.flywaydb,org.postgresql ) >/dev/null 2>&1 || true
  if [[ -s "${cp_file}" ]]; then
    tr -d '\r\n' < "${cp_file}"
  fi
}

# 按精确版本号定位 jar（避开本地仓库里的旧残留版本）
find_jar() {
  # $1 = groupPath, $2 = artifactId, $3 = version
  local g="$1" a="$2" v="$3"
  find "${M2_REPO}/${g}/${a}/${v}" -maxdepth 1 -name "${a}-${v}.jar" 2>/dev/null | head -1
}

FLYWAY_CORE_JAR="$(find_jar org/flywaydb flyway-core "${FLYWAY_VER}")"
FLYWAY_PG_JAR="$(find_jar org/flywaydb flyway-database-postgresql "${FLYWAY_VER}")"
# PostgreSQL 驱动版本由 spring-boot-starter-parent 决定（BOM 无显式属性）→ 取仓库中已有版本
PG_JDBC="$(find "${M2_REPO}/org/postgresql/postgresql" -maxdepth 2 -name 'postgresql-*.jar' 2>/dev/null | sort -V | tail -1)"

JARS=()
if [[ -n "${FLYWAY_CORE_JAR}" && -n "${FLYWAY_PG_JAR}" && -n "${PG_JDBC}" ]]; then
  JARS=("${FLYWAY_CORE_JAR}" "${FLYWAY_PG_JAR}" "${PG_JDBC}")
else
  # 兜底：动态解析（版本不符时可能拿到旧残留，仅作最后手段）
  RAW_CP="$(resolve_cp)"
  if [[ -n "${RAW_CP}" ]]; then
    IFS=';' read -r -a JARS <<< "${RAW_CP}"
  else
    JARS=("${M2_REPO}/org/flywaydb/flyway-core/${FLYWAY_VER}/flyway-core-${FLYWAY_VER}.jar"
          "${M2_REPO}/org/flywaydb/flyway-database-postgresql/${FLYWAY_VER}/flyway-database-postgresql-${FLYWAY_VER}.jar"
          "${PG_JDBC}")
  fi
fi

# Windows 下 Java 不认 Unix 风格路径分隔符与盘符 —— 必须**逐个路径**转换：
#   历史缺陷：对整串做 sed 's|:|;|g' 会把盘符的冒号（C:）也成分号 → classpath 被截断成 "C"
#   （表现为「classpath 缺失: C」）。
if [[ "${OSTYPE:-}" == msys* || "${OS:-}" == Windows_NT ]]; then
  SEP=";"
  CP=""
  for j in "${JARS[@]}"; do
    [[ -z "${j}" ]] && continue
    jw="$(cygpath -w "${j}" 2>/dev/null || echo "${j}")"
    CP="${CP}${SEP}${jw}"
  done
  CP="${CP#${SEP}}"
else
  SEP=":"
  CP=""
  for j in "${JARS[@]}"; do
    [[ -z "${j}" ]] && continue
    CP="${CP}${SEP}${j}"
  done
  CP="${CP#${SEP}}"
fi
for j in $(echo "${CP}" | tr "${SEP}" '\n'); do
  [[ -f "${j}" ]] || { fail "classpath 缺失: ${j}"; exit 1; }
done
ok "classpath 就绪（flyway ${FLYWAY_VER}）"

RUNNER_DIR="${ARTIFACT_DIR}/runner"
mkdir -p "${RUNNER_DIR}"
cat > "${RUNNER_DIR}/FlywayRunner.java" <<'JAVA'
import org.flywaydb.core.Flyway;

public class FlywayRunner {
    public static void main(String[] args) {
        Flyway flyway = Flyway.configure()
                .dataSource(System.getenv("FW_URL"), System.getenv("FW_USER"), System.getenv("FW_PASS"))
                .locations("filesystem:" + System.getenv("FW_LOC"))
                .baselineOnMigrate(false)
                .cleanDisabled(true)
                .load();
        var result = flyway.migrate();
        System.out.println("MIGRATED=" + result.migrationsExecuted);
    }
}
JAVA
LOC_DIR="${SERVER_DIR}/yuanshu/yuanshu-platform/src/main/resources/db/migration"
if [[ "${OSTYPE:-}" == msys* || "${OS:-}" == Windows_NT ]]; then
  LOC_DIR="$(cygpath -w "${LOC_DIR}")"
  RUNNER_CLASS_DIR="$(cygpath -w "${RUNNER_DIR}")"
else
  RUNNER_CLASS_DIR="${RUNNER_DIR}"
fi
if ! javac -cp "${CP}" -d "${RUNNER_DIR}" "${RUNNER_DIR}/FlywayRunner.java" > "${MVN_LOG}" 2>&1; then
  fail "执行器编译失败"; tail -10 "${MVN_LOG}"; exit 1
fi
if ( cd "${RUNNER_DIR}" && FW_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}" \
      FW_USER="${DB_USER}" FW_PASS="${DB_PASS}" FW_LOC="${LOC_DIR}" \
      java -cp "${RUNNER_CLASS_DIR}${SEP}${CP}" FlywayRunner ) >> "${MVN_LOG}" 2>&1; then
  ok "迁移执行成功（flyway ${FLYWAY_VER}，日志：$(basename "${MVN_LOG}")）"
else
  fail "迁移失败，详见 ${MVN_LOG}"; grep -aE "ERROR|Caused by|Migrate|SQL State|error" "${MVN_LOG}" | head -20; exit 1
fi

# ------------------------------------------------------------ 6. 验收核对
log "验收核对（直连 DB）"

# ---- 准备隔离测试账号（非 owner、非 superuser）----
# PostgreSQL 规则：superuser 与表 owner 默认绕过 RLS。
# 要真正验证隔离，必须用一个「非 owner、非 superuser」的账号连接。
ISO_USER="${LX_TEST_DB_USER:-lx_rls_test}"
ISO_PASS="${LX_TEST_DB_PASSWORD:-lx_rls_test_pwd}"
log "准备隔离测试账号 ${ISO_USER}（非 owner、非 superuser）"
if psql_admin -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${ISO_USER}'" | grep -q 1; then
  psql_admin -d postgres -tAc "ALTER ROLE ${ISO_USER} LOGIN PASSWORD '${ISO_PASS}' NOSUPERUSER NOBYPASSRLS" >/dev/null 2>&1
else
  psql_admin -d postgres -tAc "CREATE ROLE ${ISO_USER} LOGIN PASSWORD '${ISO_PASS}' NOSUPERUSER NOBYPASSRLS" >/dev/null 2>&1
fi
psql_db -tAc "GRANT USAGE ON SCHEMA public TO ${ISO_USER}" >/dev/null 2>&1
psql_db -tAc "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ISO_USER}" >/dev/null 2>&1
# 注意：PostgreSQL 布尔::text 产出的是 'false'/'true'（不是 'f'/'t'），
# 故统一转成 0/1 再比较，避免字符串形态误判。
ISO_SUPER="$(psql_admin -d postgres -tAc "SELECT CASE WHEN rolsuper THEN 1 ELSE 0 END FROM pg_roles WHERE rolname='${ISO_USER}'" 2>/dev/null | tr -d ' \r')"
ISO_OWNER_CNT="$(psql_db -tAc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner=(SELECT oid FROM pg_roles WHERE rolname='${ISO_USER}')" 2>/dev/null | tr -d ' \r')"
if [[ "${ISO_SUPER}" == "0" && "${ISO_OWNER_CNT}" == "0" ]]; then
  ok "隔离测试账号就绪（非 superuser · 拥有表=0）"
else
  fail "隔离测试账号不合格（superuser=${ISO_SUPER} · 拥有表=${ISO_OWNER_CNT}）—— 会绕过 RLS，测出的隔离是假象"
  exit 1
fi

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
log "验证跨租户隔离实际生效（造数据 → 非 owner 账号直查 → 必须互不可见）"
# 关键：RLS 对 **superuser 与表 owner 默认不生效**（PG 规则，需 FORCE ROW LEVEL SECURITY 才强制）。
# 故此处的直查必须用**非 owner、非 superuser 的测试账号**（ISO_USER），
# 否则测到的是"绕过 RLS"的结果 —— 那是假象，不是策略缺陷。
psql_iso() { PGPASSWORD="${ISO_PASS}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${ISO_USER}" -d "${DB_NAME}" "$@" 2>/dev/null; }

SEED_SQL="
SET app.tenant_id = '1001';
INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
VALUES (1, 1001, 'T1001', 'Tenant One Co', 'tenant one', 1.0) ON CONFLICT (id) DO NOTHING;
SET app.tenant_id = '2002';
INSERT INTO dt_entity_company (id, tenant_id, biz_code, name, name_normalized, confidence)
VALUES (2, 2002, 'T2002', 'Tenant Two Co', 'tenant two', 1.0) ON CONFLICT (id) DO NOTHING;
"
if psql_db -q -c "${SEED_SQL}" >/dev/null 2>&1; then
  ok "已造 2 条测试数据（租户 1001 / 2002 各 1 条）"
  # 以非 owner 账号直查：RLS 真实生效
  A_ALL="$(psql_iso -tAc "SET app.tenant_id='1001'; SELECT count(*) FROM dt_entity_company" 2>/dev/null | tr -d ' \r' | tail -1)"
  A_IDS="$(psql_iso -tAc "SET app.tenant_id='1001'; SELECT COALESCE(string_agg(id::text,','),'NONE') FROM dt_entity_company" 2>/dev/null | tr -d ' \r' | tail -1)"
  B_IDS="$(psql_iso -tAc "SET app.tenant_id='2002'; SELECT COALESCE(string_agg(id::text,','),'NONE') FROM dt_entity_company" 2>/dev/null | tr -d ' \r' | tail -1)"
  NO_CTX="$(psql_iso -tAc "SELECT COALESCE(string_agg(id::text,','),'NONE') FROM dt_entity_company" 2>/dev/null | tr -d ' \r' | tail -1)"
  # 断言：租户 A 只见 id=1；租户 B 只见 id=2；无租户上下文 0 行（fail-closed）
  if [[ "${A_IDS}" == "1" && "${B_IDS}" == "2" && "${NO_CTX}" == "NONE" ]]; then
    ok "隔离生效（非 owner 账号直查）：租户1001 见 [${A_IDS}] · 租户2002 见 [${B_IDS}] · 无租户上下文 见 [${NO_CTX}]（fail-closed）"
  else
    fail "隔离失效：1001→[${A_IDS}] 2002→[${B_IDS}] 无上下文→[${NO_CTX}]（期望 1 / 2 / NONE）"
  fi
  psql_db -q -c "SET app.tenant_id='1001'; DELETE FROM dt_entity_company WHERE id=1; SET app.tenant_id='2002'; DELETE FROM dt_entity_company WHERE id=2;" >/dev/null 2>&1
  ok "测试数据已清理"
else
  fail "无法写入测试数据 —— 隔离实测跳过"
fi

echo "" | tee -a "${LOG}"
log "演练产物：${ARTIFACT_DIR}"
[[ "${APPLIED}" == "${TOTAL_SQL}" && "${FN}" -ge 1 && "${POLICY}" -ge 21 ]] && log "===== 演练通过 =====" || { log "===== 演练未通过 ====="; exit 1; }