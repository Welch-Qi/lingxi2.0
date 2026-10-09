"""校验 artifacts/screenshots 下所有评审页的图片引用是否有效。

背景：评审页放在 artifacts/screenshots/ 根，而截图放在同名子目录里，
若 src 忘了带子目录前缀，页面打开就是一片破图 —— 而 HTML 本身语法合法、
任何构建门禁都不会报错。属"产物自身的完整性"盲区。

注意：评审页常用 JS 模板字符串动态拼 src（`src="${after}"`），那类路径
在静态扫描里无法判定，一律归为 dynamic 不算失效；要确认它们得在浏览器里
实载（见 scripts/check-review-pages.mjs）。本脚本负责静态那部分。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "artifacts" / "screenshots"
if not ROOT.is_dir():
    print(f"[FATAL] 目录不存在: {ROOT}")
    sys.exit(1)

total_bad = 0
for html in sorted(ROOT.glob("*review*.html")):
    srcs = re.findall(r'src="([^"]+)"', html.read_text(encoding="utf-8"))
    bad, dynamic = [], 0
    for s in srcs:
        if s.startswith(("http://", "https://", "data:")):
            continue
        if "${" in s:  # 模板字符串占位，运行时才确定
            dynamic += 1
            continue
        if not (html.parent / s).is_file():
            bad.append(s)
    flag = "BAD " if bad else "ok  "
    print(f"[{flag}] {html.name}  静态引用 {len(srcs) - dynamic} 张 / 失效 {len(bad)} 张 / 动态 {dynamic} 张")
    for s in bad:
        print(f"        MISS {s}")
    total_bad += len(bad)

print(f"\n静态失效图片引用合计: {total_bad}")
sys.exit(0)
