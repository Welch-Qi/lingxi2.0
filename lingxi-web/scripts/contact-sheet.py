"""
把逐路由截图拼成一张总览图（contact sheet），用于一屏扫完全部一级菜单。

为什么需要它：12 张 PNG 逐个打开看太慢，而"这批页面到底长什么样"是每轮改动后
都要回答的问题。拼成一张图后，版式错乱、颜色跑偏、页面空白这类问题一眼可见。

依赖 Pillow（用项目内的 python venv，不要往全局装）：
    node scripts/screenshot-routes.mjs            # 先出图
    python scripts/contact-sheet.py               # 再拼总览

用法：
    python scripts/contact-sheet.py                       # 默认读 artifacts/screenshots
    python scripts/contact-sheet.py <截图目录> <输出文件>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WEB = Path(__file__).resolve().parent.parent
SHOT_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else WEB / "artifacts" / "screenshots"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else SHOT_DIR / "_all-pages.png"

# 与 app/router/modules.ts 的分区顺序一致：业务 → 分析 → 平台
ORDER = [
    "workbench",
    "workbench-brief",
    "customer",
    "product",
    "order",
    "service",
    "marketing",
    "intel",
    "analytics",
    "agent",
    "knowledge",
    "config",
]

COLS = 3
THUMB_W = 480
GAP = 18
PAD = 22
LABEL_H = 26
BG = (243, 247, 251)        # 霜白，与设计令牌 --lx-color-bg 一致
LABEL_FG = (30, 41, 59)
LABEL_BG = (255, 255, 255)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main() -> int:
    found = {p.stem: p for p in SHOT_DIR.glob("*.png") if not p.stem.startswith("_")}
    names = [n for n in ORDER if n in found]
    missing = [n for n in ORDER if n not in found]
    if not names:
        print(f"{SHOT_DIR} 下没有可用的截图，请先跑 node scripts/screenshot-routes.mjs")
        return 1
    if missing:
        print(f"  ! 缺图：{', '.join(missing)}")

    thumbs = []
    for name in names:
        img = Image.open(found[name]).convert("RGB")
        ratio = THUMB_W / img.width
        thumbs.append((name, img.resize((THUMB_W, round(img.height * ratio)), Image.LANCZOS)))

    cell_h = max(t.height for _, t in thumbs) + LABEL_H
    rows = -(-len(thumbs) // COLS)
    width = PAD * 2 + COLS * THUMB_W + (COLS - 1) * GAP
    height = PAD * 2 + rows * cell_h + (rows - 1) * GAP

    sheet = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(sheet)
    font = load_font(15)

    for i, (name, thumb) in enumerate(thumbs):
        col, row = i % COLS, i // COLS
        x = PAD + col * (THUMB_W + GAP)
        y = PAD + row * (cell_h + GAP)
        # 标签条在上方，保证缩略图顶部（页头/面包屑）与图对齐可比
        draw.rectangle([x, y, x + THUMB_W, y + LABEL_H], fill=LABEL_BG)
        draw.text((x + 9, y + 5), f"/{name.replace('-', '/')}", fill=LABEL_FG, font=font)
        sheet.paste(thumb, (x, y + LABEL_H))

    sheet.save(OUT)
    print(f"总览图已生成：{OUT}  ({len(names)} 页, {sheet.width}x{sheet.height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
