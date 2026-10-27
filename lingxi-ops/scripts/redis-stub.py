#!/usr/bin/env python3
"""
最小 Redis 协议服务端 —— 仅为让 Spring Boot 应用在本地启动期完成 Redis 连接装配。

⚠️ 仅用于本地启动验证，**不是** Redis 实现，不持久化、不支持复杂命令。
   生产环境必须用 Valkey 9（技术规约2.0 §3.1 E2）。

依据：本仓 Java 侧目前 **0 处** Redis 业务调用（无 RedisTemplate/StreamOperations），
应用仅因 spring-boot-starter-data-redis 在 classpath 而自动装配连接工厂，
启动期只需完成 TCP 连接 + AUTH + SELECT + PING 握手。
故实现这些命令 + 少量常用命令即可。

用法：python3 redis-stub.py <port> [password]
默认端口 16379（对齐 config/cache.yml 的 LX_CACHE_TUNNEL_PORT 默认值）
"""
import socket
import socketserver
import sys
import threading
import time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 16379
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else ""

# 内存 KV（够用即可）
STORE = {}
STREAMS = {}
LOCK = threading.Lock()

RESP = {
    "PING": lambda args: b"PONG" if not args else args[0],
    "AUTH": lambda args: b"OK",
    "SELECT": lambda args: b"OK",
    "QUIT": lambda args: b"OK",
    # HELLO 3（Lettuce 用 RESP3 握手）：必须返回 map 形态，否则 Lettuce 握手失败
    # -> Redis 健康探针 DOWN。返回字段按 RESP3 map 编码（%n 后跟 key/value 交替）。
    "HELLO": lambda args: b"__HELLO__",
    "CLIENT": lambda args: b"OK",
    "CONFIG": lambda args: b"OK",
    "COMMAND": lambda args: b"",
    "INFO": lambda args: b"# Server\r\nredis_version:7.0.0-mini\r\nredis_mode:standalone\r\n",
    "TIME": lambda args: None,  # 特殊：返回数组
    "SET": lambda args: b"OK",
    "GET": lambda args: STORE.get(args[0].decode(), None) if args else None,
    "DEL": lambda args: str(len(args)).encode(),
    "EXISTS": lambda args: b"1" if args and args[0].decode() in STORE else b"0",
    "EXPIRE": lambda args: b"1",
    "PTTL": lambda args: b"-1",
    "TTL": lambda args: b"-1",
    "INCR": lambda args: b"1",
    "SETNX": lambda args: b"1",
    "SETEX": lambda args: b"OK",
    "HSET": lambda args: b"1",
    "HGET": lambda args: b"",
    "SADD": lambda args: b"1",
    "SMEMBERS": lambda args: b"",
    "FLUSHALL": lambda args: b"OK",
    "FLUSHDB": lambda args: b"OK",
    "SHUTDOWN": lambda args: b"OK",
    "XADD": lambda args: b"1-1",
    "XLEN": lambda args: b"0",
    "XREAD": lambda args: b"*0",
    "XGROUP": lambda args: b"OK",
    "XREADGROUP": lambda args: b"*0",
    "XACK": lambda args: b"1",
    "XAUTOCLAIM": lambda args: b"*0",
    "XCLAIM": lambda args: b"*0",
    "XINFO": lambda args: b"*0",
    "XRANGE": lambda args: b"*0",
    "XTRIM": lambda args: b"OK",
    "XDEL": lambda args: b"1",
    "XSETID": lambda args: b"OK",
}


def encode_simple(s: bytes) -> bytes:
    return b"+" + s + b"\r\n"


def encode_error(s: str) -> bytes:
    return b"-ERR " + s.encode() + b"\r\n"


def encode_int(n: int) -> bytes:
    return b":" + str(n).encode() + b"\r\n"


def encode_bulk(v: bytes) -> bytes:
    if v is None:
        return b"$-1\r\n"
    return b"$" + str(len(v)).encode() + b"\r\n" + v + b"\r\n"


def encode_array(items) -> bytes:
    if items is None:
        return b"*-1\r\n"
    out = b"*" + str(len(items)).encode() + b"\r\n"
    for it in items:
        out += it
    return out


class Handler(socketserver.StreamRequestHandler):
    def read_command(self):
        """解析 RESP 数组形式的命令。"""
        line = self.rfile.readline()
        if not line:
            return None
        line = line.strip()
        if not line:
            return []
        if line.startswith(b"*"):
            n = int(line[1:])
            args = []
            for _ in range(n):
                hdr = self.rfile.readline().strip()
                if hdr.startswith(b"$"):
                    ln = int(hdr[1:])
                    data = self.rfile.read(ln)
                    self.rfile.read(2)  # CRLF
                    args.append(data)
                else:
                    args.append(hdr)
            return args
        # inline 命令
        return line.split()

    def handle(self):
        try:
            while True:
                args = self.read_command()
                if args is None:
                    break
                if not args:
                    continue
                cmd = args[0].decode(errors="replace").upper()
                rest = args[1:]
                fn = RESP.get(cmd)
                if fn is None:
                    self.wfile.write(encode_error(f"unknown command '{cmd}'"))
                    self.wfile.flush()
                    continue
                try:
                    res = fn(rest)
                except Exception as e:
                    self.wfile.write(encode_error(str(e)))
                    self.wfile.flush()
                    continue
                if cmd == "HELLO":
                    # RESP3 map：%<n> 后跟 n 组 key/value
                    # ⚠️ 值类型必须正确：Lettuce 握手时把 "id" 强转为 Long，
                    #    用字符串会抛 ClassCastException(String cannot be cast to Long)
                    #    -> Redis 健康探针 DOWN。整数用 RESP 整数编码（:n），其余用 bulk。
                    out = b"%7\r\n"
                    for k, v in ((b"server", b"redis"), (b"version", b"7.0.0-mini"),
                                 (b"proto", b"3"), (b"id", 1), (b"mode", b"standalone"),
                                 (b"role", b"master"), (b"modules", b"")):
                        out += encode_bulk(k)
                        out += encode_int(v) if isinstance(v, int) else encode_bulk(v)
                elif cmd == "TIME":
                    now = time.time()
                    sec = int(now)
                    usec = int((now - sec) * 1e6)
                    out = encode_array([encode_bulk(str(sec).encode()), encode_bulk(str(usec).encode())])
                elif cmd == "SHUTDOWN":
                    self.wfile.write(encode_simple(b"OK"))
                    self.wfile.flush()
                    break
                elif res is None:
                    out = encode_bulk(None)
                elif isinstance(res, bytes):
                    out = encode_bulk(res)
                elif isinstance(res, str):
                    out = encode_bulk(res.encode())
                elif isinstance(res, int):
                    out = encode_int(res)
                else:
                    out = encode_bulk(str(res).encode())
                self.wfile.write(out)
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    srv = Server(("127.0.0.1", PORT), Handler)
    print(f"[redis-stub] 最小 Redis 协议服务端已启动: 127.0.0.1:{PORT}"
          f"{' (AUTH 密码已配置)' if PASSWORD else ''}")
    print("[redis-stub] 仅供本地启动验证，非生产 Redis")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
