#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— rollback.sh（一键回滚，目标 <5 分钟）
#
# 职责：切回上一版本目录并 reload Nginx；数据库回滚需人工确认（前向兼容设计下通常无需）
# 幂等：重复执行结果一致
# 依据：《灵犀系统技术规约2.0》§4.14.2
#
# 说明：迁移脚本遵循"只增列不删列、不改列语义"（§4.4.3），
#       因此代码回滚通常不需要回滚数据库——这是前向兼容设计的直接收益。
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_ROOT="${LX_RELEASE_ROOT:-/opt/lingxi}"
RELEASES_DIR="${RELEASE_ROOT}/releases"
CURRENT_LINK="${RELEASE_ROOT}/current"
NGINX_UPSTREAM="${LX_NGINX_UPSTREAM_FILE:-/etc/nginx/conf.d/lingxi-upstream.conf}"
[[ -f "${OPS_ROOT}/.env" ]] && { set -a; source "${OPS_ROOT}/.env"; set +a; }

SCRIPT_NAME="rollback"
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [rollback] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [rollback] [FAIL] $*" >&2; exit 1; }

CURRENT_TARGET="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || echo '')"
[[ -z "${CURRENT_TARGET}" ]] && fail "无法解析当前版本：${CURRENT_LINK}"

PREV_VERSION="${1:-$(ls -1t "${RELEASES_DIR}" | grep -v "$(basename "${CURRENT_TARGET}")" | head -1)}"
[[ -z "${PREV_VERSION}" ]] && fail "未找到可回滚的上一版本（releases 目录：${RELEASES_DIR}）"
PREV_DIR="${RELEASES_DIR}/${PREV_VERSION}"
[[ -d "${PREV_DIR}" ]] || fail "上一版本目录不存在：${PREV_DIR}"

log "回滚：$(basename "${CURRENT_TARGET}") -> ${PREV_VERSION}"

PORT="${LX_ROLLBACK_PORT:-18081}"
( cd "${PREV_DIR}" && nohup java -Dspring.profiles.active="${SPRING_PROFILES_ACTIVE:-prod}" \
    -jar lingxi-platform.jar --server.port="${PORT}" \
    > "${PREV_DIR}/app.rollback.log" 2>&1 & echo $! > "${PREV_DIR}/app.pid" )

for _ in $(seq 1 30); do
  curl -sf "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1 && break
  sleep 2
done
curl -sf "http://127.0.0.1:${PORT}/actuator/health" >/dev/null 2>&1 \
  || fail "回滚实例健康检查未通过；当前线上版本未受影响"

if [[ -w "${NGINX_UPSTREAM}" ]]; then
  sed -i "s/server 127.0.0.1:[0-9]\+;/server 127.0.0.1:${PORT};/" "${NGINX_UPSTREAM}"
  nginx -t && nginx -s reload || fail "Nginx 重载失败"
fi
ln -sfn "${PREV_DIR}" "${CURRENT_LINK}"

log "回滚完成：${PREV_VERSION}。"
log "[提醒] 若本次故障涉及数据库变更，请人工评估是否需要恢复备份（init-db.sh 已留存迁移前备份）"
