"""i18n 语言包自检（技术规约2.0 §4.10 + 附录D 规则 10）。

做两件事：
  1. 校验 zh-CN / en-US 两个语言包的 key 完全对齐（缺一即报错，避免英文站出现裸 key）；
  2. 扫描源码里引用的 i18n key，找出语言包中不存在的（这类 key 上线后会原样显示给用户）。

用法（在 lingxi-web 目录下执行）：
    python scripts/check-i18n.py

退出码 0 表示通过；1 表示存在缺失或不对齐，可直接接入 CI 门禁。
"""

import glob
import json
import re
import sys

ROOT = 'apps/lingxi-web'
ZH_PATH = f'{ROOT}/src/locales/zh-CN/common.json'
EN_PATH = f'{ROOT}/src/locales/en-US/common.json'

zh = set(json.load(open(ZH_PATH, encoding='utf-8')))
en = set(json.load(open(EN_PATH, encoding='utf-8')))

only_zh = sorted(zh - en)
only_en = sorted(en - zh)
print(f'zh-CN: {len(zh)} 个 key，en-US: {len(en)} 个 key')
print('仅中文包有：', only_zh if only_zh else '无')
print('仅英文包有：', only_en if only_en else '无')

files = glob.glob(f'{ROOT}/src/**/*.ts', recursive=True) + glob.glob(f'{ROOT}/src/**/*.tsx', recursive=True)
files += glob.glob('packages/**/*.ts', recursive=True) + glob.glob('packages/**/*.tsx', recursive=True)
files = [p for p in files if 'locales' not in p and 'node_modules' not in p and not p.endswith('.d.ts')]

# 只收集"能静态确定"的 key；模板字符串里的 ${} 变量无法静态求值，由人工兜底。
PATTERNS = [
    re.compile(r"""t\(\s*'([A-Za-z][\w.]*)'"""),
    re.compile(r"""labelKey:\s*'([\w.]+)'"""),
    re.compile(r"""titleKey:\s*'([\w.]+)'"""),
    re.compile(r"""subtitleKey:\s*'([\w.]+)'"""),
    re.compile(r"""titleKey="([\w.]+)\""""),
    re.compile(r"""subtitleKey="([\w.]+)\""""),
    re.compile(r"""([a-zA-Z]+Key):\s*'([\w.]+)'"""),
    re.compile(r"""([a-zA-Z]+Key)="([\w.]+)\""""),
]

used = set()
for path in files:
    src = open(path, encoding='utf-8').read()
    for pattern in PATTERNS:
        for hit in pattern.findall(src):
            candidate = hit[-1] if isinstance(hit, tuple) else hit
            # key 约定为 {域}.{模块}.{位置}.{含义}，至少两段，借此滤掉属性名误匹配
            if candidate.count('.') >= 1:
                used.add(candidate)

missing = sorted(k for k in used if k not in zh)
print(f'扫描 {len(files)} 个文件，静态引用 key {len(used)} 个')
print('语言包中缺失：', missing if missing else '无')

if missing or only_zh or only_en:
    sys.exit(1)
print('i18n 自检通过')
