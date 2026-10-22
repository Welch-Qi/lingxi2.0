#!/usr/bin/env python3
"""
最小 OIDC Provider stub —— 仅为让 Spring Security 的 oauth2-resource-server 完成启动期
元数据拉取（本地开发/演练用，非生产）。

用途：
  - 提供 /.well-known/openid-configuration（issuer 声明）
  - 提供 /protocol/openid-connect/certs（JWKS）
  - 提供 /protocol/openid-connect/token（签发测试用 JWT）

⚠️ 仅用于本地启动验证。生产环境必须用真实 Keycloak（§4.2 / §4.9.1）。
   密钥为本地生成的 RSA 私钥，仅供本地签发测试 token，绝不可用于任何真实环境。

用法：python3 oidc-stub.py <port> [issuer]
默认端口 18080，issuer 为 http://127.0.0.1:18080
"""
import json
import sys
import time
import base64
import hashlib
import hmac
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 18080
ISSUER = sys.argv[2] if len(sys.argv) > 2 else f"http://127.0.0.1:{PORT}"

# ---- 本地 RSA 密钥对（openssl 生成，嵌入本文件仅供本地演练）----
# 用纯 Python 难以做 RSA 签名，故改为加载同目录 oidc-key.pem；
# 若不存在则尝试用 openssl 生成。
import os
import subprocess

KEY_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PEM = os.path.join(KEY_DIR, "oidc-key.pem")


def ensure_key():
    if os.path.exists(KEY_PEM):
        return
    try:
        subprocess.run(
            ["openssl", "genrsa", "-out", KEY_PEM, "2048"],
            check=True, capture_output=True,
        )
        print(f"[oidc-stub] 已生成 RSA 私钥: {KEY_PEM}")
    except Exception as e:
        print(f"[oidc-stub] 无法生成密钥（需要 openssl）: {e}")
        print("[oidc-stub] 请手动放置 oidc-key.pem 后重启")


ensure_key()

# 预计算 JWKS（n/e）
try:
    out = subprocess.run(
        ["openssl", "rsa", "-in", KEY_PEM, "-noout", "-modulus"],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    modulus_hex = out.split("=")[1]
    modulus_b64 = base64.urlsafe_b64encode(bytes.fromhex(modulus_hex)).rstrip(b"=").decode()
    exponent_b64 = base64.urlsafe_b64encode((65537).to_bytes(3, "big")).rstrip(b"=").decode()
    KID = "lingxi-local-stub"
    JWKS = {
        "keys": [{
            "kty": "RSA", "use": "sig", "alg": "RS256", "kid": KID,
            "n": modulus_b64, "e": exponent_b64,
        }]
    }
except Exception as e:
    KID = "lingxi-local-stub"
    JWKS = {"keys": []}
    print(f"[oidc-stub] JWKS 计算失败: {e}")


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_jwt(tenant_id: int = 1001, user_id: int = 1, realm: str = "lingxi") -> str:
    """签发一个测试用 JWT（RS256）。"""
    header = {"alg": "RS256", "typ": "JWT", "kid": KID}
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "sub": f"user-{user_id}",
        "aud": "lingxi-server",
        "exp": now + 3600,
        "iat": now,
        "realm_access": {"roles": ["default-roles"]},
        "tenant_id": tenant_id,
        "user_id": user_id,
        "preferred_username": f"t{tenant_id}-u{user_id}",
        "realm": realm,
    }
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode()) + "."
        + b64url(json.dumps(payload, separators=(",", ":")).encode())
    )
    try:
        sig = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", KEY_PEM],
            input=signing_input.encode(), check=True, capture_output=True,
        ).stdout
        return signing_input + "." + b64url(sig)
    except Exception as e:
        print(f"[oidc-stub] 签名失败: {e}")
        return ""


class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/.well-known/openid-configuration", "/realms/lingxi/.well-known/openid-configuration"):
            self._json({
                "issuer": ISSUER,
                "jwks_uri": f"{ISSUER}/protocol/openid-connect/certs",
                "token_endpoint": f"{ISSUER}/protocol/openid-connect/token",
                "grant_types_supported": ["password", "client_credentials", "authorization_code", "refresh_token"],
                "subject_types_supported": ["public"],
                "id_token_signing_alg_values_supported": ["RS256"],
                "response_types_supported": ["code", "token", "id_token"],
                "scopes_supported": ["openid", "profile", "email"],
                "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
                "claims_supported": ["tenant_id", "user_id", "realm"],
            })
        elif path in ("/protocol/openid-connect/certs", "/realms/lingxi/protocol/openid-connect/certs"):
            self._json(JWKS)
        elif path == "/health":
            self._json({"status": "UP", "issuer": ISSUER})
        else:
            self._json({"error": "not_found", "path": path}, 404)

    def do_POST(self):
        path = self.path.split("?")[0]
        if path in ("/protocol/openid-connect/token", "/realms/lingxi/protocol/openid-connect/token"):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode() if length else ""
            form = {}
            for pair in body.split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    form[k] = v
            try:
                from urllib.parse import unquote_plus
                tenant = int(unquote_plus(form.get("tenant_id", "1001")))
            except ValueError:
                tenant = 1001
            token = make_jwt(tenant_id=tenant)
            self._json({
                "access_token": token, "token_type": "Bearer",
                "expires_in": 3600, "refresh_token": token, "scope": "openid profile",
            })
        else:
            self._json({"error": "not_found"}, 404)

    def log_message(self, fmt, *args):
        print(f"[oidc-stub] {fmt % args}")


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[oidc-stub] OIDC stub 已启动: {ISSUER}")
    print(f"[oidc-stub] JWKS: {ISSUER}/protocol/openid-connect/certs")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
