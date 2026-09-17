#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check-doc-counts.py · 《灵犀系统功能清单V2.0》计数自洽性校验

用途
    校验功能清单「统计概览」表的数字与功能表实际行数是否一致，防止计数口径漂移。
    2026-09-13 实测发现：合计行 P0-A 写 98、各行之和为 104；4 行「功能项数」低于其分项之和。

用法
    python3 check-doc-counts.py [功能清单路径]
    默认路径：../../lingxi-docs/01-product/灵犀系统功能清单V2.0.md（相对本脚本，本脚本位于 lingxi-ops/scripts/）

退出码
    0 = 全部自洽 ｜ 1 = 存在不自洽项（可接入 qa-gate.sh / CI）

性质
    只读、幂等、无副作用；仅读取文档并打印核对结果。
"""
import collections
import pathlib
import re
import sys

DEFAULT_DOC = '../../lingxi-docs/01-product/灵犀系统功能清单V2.0.md'

# 功能编号四形态：UW-01 / OP-CUS-01 / BO-SAL-09 / GM-07
CODE_RE = r'[A-Z]{2,3}(?:-[A-Z]{2,4})?-\d+'
ROW_RE = re.compile(
    r'^\|\s*([^|]+?)\s*\|\s*(' + CODE_RE + r')\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|'
    r'\s*([^|]*?)\s*\|\s*\**\s*(P0-A|P0-B|P1|P2|P3)\s*\**\s*\|\s*([^|]*?)\s*\|'
)
TOP_RE = re.compile(r'^##\s+[一二三四五六七八九十]+、(.+)$')
PRIOS = ('P0-A', 'P0-B', 'P1', 'P2', 'P3')


def parse(doc_path):
    """返回 (per_menu, duplicates)；per_menu: 菜单 -> Counter(优先级)"""
    per_menu = collections.OrderedDict()
    codes = collections.Counter()
    top = None
    for ln in doc_path.read_text(encoding='utf-8').splitlines():
        if ln.startswith('## '):
            m = TOP_RE.match(ln)
            top = re.sub(r'（.*?）$', '', m.group(1)).strip() if m else None
            if top:
                per_menu.setdefault(top, collections.Counter())
            continue
        m = ROW_RE.match(ln)
        if m and top:
            per_menu[top][m.group(6)] += 1
            codes[m.group(2)] += 1
    dups = {k: v for k, v in codes.items() if v > 1}
    return per_menu, codes, dups


def stated_rows(doc_path):
    """从「统计概览」表解析文档自报的每菜单数字。"""
    out = []
    started = False
    for ln in doc_path.read_text(encoding='utf-8').splitlines():
        if '统计概览' in ln:
            started = True
            continue
        if not started:
            continue
        m = re.match(
            r'^\|\s*(\*\*)?([^|*]+?)(\*\*)?\s*\|\s*\**\s*(\d+)\s*\**\s*\|\s*\**\s*(\d+)\s*\**\s*\|'
            r'\s*\**\s*(\d+)\s*\**\s*\|\s*\**\s*(\d+)\s*\**\s*\|\s*\**\s*(\d+)\s*\**\s*\|'
            r'\s*\**\s*(\d+)\s*\**\s*\|',
            ln,
        )
        if not m:
            if ln.startswith('##'):
                break
            continue
        name = m.group(2).strip()
        if name in ('一级菜单', '合计'):
            if name == '合计':
                out.append(('__TOTAL__',) + tuple(int(m.group(i)) for i in (4, 5, 6, 7, 8, 9)))
            continue
        out.append((name,) + tuple(int(m.group(i)) for i in (4, 5, 6, 7, 8, 9)))
    return out


def main():
    rel = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DOC
    doc = (pathlib.Path(__file__).parent / rel).resolve()
    if not doc.exists():
        print(f'[ERROR] 找不到功能清单：{doc}')
        return 1

    per_menu, codes, dups = parse(doc)
    print(f'[INFO] 文档：{doc}')
    print(f'[INFO] 唯一功能编号 {len(codes)} 个'
          f'（{"无重复" if not dups else "重复：" + str(dups)}）')
    print()

    failures = []
    hdr = f"{'一级菜单':<12}{'项数':>6}{'分项和':>7}  {'P0-A':>5}{'实测':>5}  {'P0-B':>5}{'实测':>5}"
    print(hdr)
    print('-' * len(hdr))

    agg_stated = collections.Counter()
    agg_real = collections.Counter()
    for row in stated_rows(doc):
        if row[0] == '__TOTAL__':
            continue
        name, sub_n, cnt, a, b, p1, p2 = row
        c = per_menu.get(name)
        if c is None:
            failures.append(f'{name}: 统计概览有此菜单，但未解析到功能表')
            continue
        comp = a + b + p1 + p2
        flags = []
        if comp != cnt:
            flags.append(f'项数不自洽(分项和{comp})')
        if c['P0-A'] != a:
            flags.append(f'P0-A不自洽(实测{c["P0-A"]})')
        print(f'{name:<12}{cnt:>6}{comp:>7}  {a:>5}{c["P0-A"]:>5}  {b:>5}{c["P0-B"]:>5}'
              + ('   ✗ ' + '；'.join(flags) if flags else ''))
        if flags:
            failures.append(f'{name}: ' + '；'.join(flags))
        agg_stated.update({'项数': cnt, 'P0-A': a, 'P0-B': b, 'P1': p1, 'P2': p2})
        agg_real.update(c)

    print('-' * len(hdr))
    agg_real['项数'] = sum(agg_real[k] for k in PRIOS)

    def fmt(at, key):
        return f'{at[key]}/{agg_real[key]}'
    print(f'各行之和 vs 实测：项数 {fmt(agg_stated,"项数")} ｜ P0-A {fmt(agg_stated,"P0-A")} '
          f'｜ P0-B {fmt(agg_stated,"P0-B")} ｜ P1 {fmt(agg_stated,"P1")} ｜ P2 {fmt(agg_stated,"P2")}')

    for key in PRIOS:
        if agg_stated[key] != agg_real[key]:
            failures.append(f'合计列 {key}：文档各行之和 {agg_stated[key]} ≠ 实测 {agg_real[key]}')

    print()
    if failures:
        print(f'[FAIL] 发现 {len(failures)} 处计数不自洽：')
        for f in failures:
            print('   -', f)
        return 1
    print('[PASS] 计数自洽')
    return 0


if __name__ == '__main__':
    sys.exit(main())
