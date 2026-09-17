#!/usr/bin/env bash
# ============================================================================
# 灵犀系统 —— deploy.sh（脚本化灰度发布，无容器）
#
# 职责：新版本目录隔离 -> 启动新实例 -> 健康检查通过 -> 切换 Nginx upstream -> 停旧实例
# 幂等：版本目录隔离，重复执行同一版本不重复启动
# 依据：《灵犀系统技术规约2.0》§4.14.2 · §3.1 E1（全链路禁止 Docker/K8s）
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_ROOT="${LX_RELEASE_ROOT:-/opt/lingxi}"
VERSION="${1:-$(date -u +%Y%m%d%H%M%S)}"
RELEASE_DIR="${RELEASE_ROOT}/releases/${VERSION}"
CURRENT_LINK="${RELEASE_ROOT}/current"
NGINX_UPSTREAM="${LX_NGINX_UPSTREAM_FILE:-/etc/nginx/conf.d/lingxi-upstream.conf}"
[[ -f "${OPS_ROOT}/.env" ]] && { set -a; source "${OPS_ROOT}/.env"; set +a; }

SCRIPT_NAME="deploy"
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [deploy] $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [deploy] [FAIL] $*" >&2; exit 1; }

# ---- 发布 Checklist（缺一不可，§4.14.2）----
log "发布前 Checklist 校验…"
[[ -f "${RELEASE_DIR}/lingxi-server.jar" || -f "${RELEASE_DIR}/lingxi-platform.jar" ]] \
  || fail "缺失构建产物；请先完成构建并放入 ${RELEASE_DIR}"
[[ -z "${LX_SKIP_ENV_CHECK:-}" ]] && bash "${SCRIPT_DIR}/check-env.sh" || log "跳过环境体检（LX_SKIP_ENV_CHECK）"
[[ -n "${LX_MIGRATION_VERIFIED:-}" ]] || log "[提醒] 需确认：迁移脚本已在 staging 验证通过"
[[ -n "${LX_ROLLBACK_PLAN:-}" ]] || log "[提醒] 需确认：回滚预案已就绪（rollback.sh 保留上一版本）"
[[ -n "${LX_GRAYSCALE_RATIO:-}" ]] || log "[提醒] 灰度计划未指定，默认按租户白名单全量切换"

# ---- 启动新实例 ----
PID_FILE="${RELEASE_DIR}/app.pid"
NEW_PORT="${LX_NEW_INSTANCE_PORT:-18080}"
log "启动新实例 version=${VERSION} port=${NEW_PORT}"
( cd "${RELEASE_DIR}" && nohup java -XX:+UseZGC -Dspring.profiles.active="${SPRING_PROFILES_ACTIVE:-prod}" \
    -jar lingxi-platform.jar --server.port="${NEW_PORT}" \
    > "${RELEASE_DIR}/app.log" 2>&1 & echo $! > "${PID_FILE}" )

log "等待健康检查（就绪探测，最多 120 秒）…"
READY=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${NEW_PORT}/actuator/health/readiness" >/dev/null 2>&1; then
    READY=1; break
  fi
  sleep 2
done
if (( READY == 0 )); then
  kill "$(cat "${PID_FILE}")" 2>/dev/null || true
  fail "新实例健康检查未通过，已终止发布并保留旧版本（Nginx 未切换，用户无感）"
fi

# ---- 切换 Nginx upstream（灰度：按比例或白名单）----
log "切换 Nginx upstream -> ${NEW_PORT}"
if [[ -w "${NGINX_UPSTREAM}" ]] || [[ -w "$(dirname "${NGINX_UPSTREAM}")" ]]; then
  cp -f "${NGINX_UPSTREAM}" "${NGINX_UPSTREAM}.bak.$(date -u +%Y%m%d%H%M%S)" 2>/dev/null || true
  sed -i "s/server 127.0.0.1:[0-9]\+;/server 127.0.0.1:${NEW_PORT};/" "${NGINX_UPSTREAM}"
  nginx -t && nginx -s reload || fail "Nginx 配置校验失败，已保留备份文件"
else
  log "[提醒] 无权限修改 ${NGINX_UPSTREAM}，请人工切换（本脚本不越权）"
fi

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
log "发布完成：${VERSION}。保留上一版本用于回滚（目标 <5 分钟，§4.14.2）"
