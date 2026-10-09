"""i18n 语言包自检（技术规约2.0 §4.10 + 附录D 规则 10）。

做四件事：
  1. 校验 zh-CN / en-US 两个语言包的 key 完全对齐（缺一即报错，避免英文站出现裸 key）；
  2. 扫描源码里引用的 i18n key，找出语言包中不存在的（这类 key 上线后会原样显示给用户）；
  3. 校验模板类 key（如 t(`cus.stage.${key}.label`)）：${} 无法静态求值，
     但静态前缀 + 后缀足以定位一个 key 家族，故只做"族匹配"——
     语言包中必须至少存在一个命中该家族的 key，否则报缺失。
  4. 校验值里含 {{占位符}} 的 key 是否都在调用处传了参（2026-10-07 加）。
     前三条都拦不住「把 `{{count}} 处引用` 当列名用」——那条 key 存在、parity 也齐，
     缺的是调用处的第二个参数，只能靠这一条。

为什么第 3 条必须做：早期版本只查字面量 key，导致
「阶段口径由租户配置」类页面（商机漏斗、OTD 七节点）整族文案缺失时门禁仍报通过——
而这正是最该拦住的情形，因为缺的是整块业务语义，不是个别词条。

为什么模板里的每个 ${} 都要当通配（而不是只切第一个）：
`intel.idea.${category}.${idea.id}.name` 这类**双变量**模板，若只按第一个 ${} 切分，
剩下的 `${idea.id}` 会被当成字面后缀，而任何真实 key 都不含 `${}`——
于是族匹配永远失败，门禁对着正确的语言包持续报错。
误报的门禁会被绕过，比没有门禁更糟，故这里把 ${} 逐个换成单段通配 [^.]+。

为什么只做族匹配、不逐个枚举取值：曾试过用同文件内的 `key: 'xxx'` 字面量展开取值，
但该写法与表格列定义（columns 的 key/dataIndex）无法可靠区分，
实测产生 200+ 条误报。误报的门禁会被绕过，比没有门禁更糟，故主动收窄。
"族在、个别成员缺"属人工兜底范围，不在此脚本职责内。

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
en_map = json.load(open(EN_PATH, encoding='utf-8'))

only_zh = sorted(zh - en)
only_en = sorted(en - zh)
print(f'zh-CN: {len(zh)} 个 key，en-US: {len(en)} 个 key')
print('仅中文包有：', only_zh if only_zh else '无')
print('仅英文包有：', only_en if only_en else '无')

# 键集 parity 查不出「值写错了语言」——曾把整页中文值写进 en 包（135 键）而门禁全绿。
# 故检查 en 包的值里不得出现中文（白名单：语言切换按钮这类自指两种语言名字的文案）。
_CJK = re.compile(r'[一-龥]')
_VALUE_LANG_WHITELIST = {'nav.switchLanguage'}
bad_lang = sorted(
    k for k, v in en_map.items()
    if isinstance(v, str) and _CJK.search(v) and k not in _VALUE_LANG_WHITELIST
)
print('en 值含中文：', bad_lang if bad_lang else '无')

files = glob.glob(f'{ROOT}/src/**/*.ts', recursive=True) + glob.glob(f'{ROOT}/src/**/*.tsx', recursive=True)
files += glob.glob('packages/**/*.ts', recursive=True) + glob.glob('packages/**/*.tsx', recursive=True)
files = [p for p in files if 'locales' not in p and 'node_modules' not in p and not p.endswith('.d.ts')]

# 只收集"能静态确定"的 key；模板字符串里的 ${} 变量由第 3 步族匹配兜底。
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

# 模板字面量：t(`前缀.${变量}后缀`)，可含多个 ${}
TEMPLATE = re.compile(r't\(\s*`([^`]*)`')
PLACEHOLDER = re.compile(r'\$\{[^}]*\}')


def template_family(raw):
    """把模板字面量编译成"族正则"：每个 ${} 换成单段通配。

    返回 None 表示这段模板没有静态段（如 t(`${x}`)），无从定位家族，跳过。
    """
    head = raw.split('${', 1)[0]
    if head.count('.') < 1:
        return None
    parts = PLACEHOLDER.split(raw)
    return re.compile('^' + '[^.]+'.join(re.escape(part) for part in parts) + '$')


used = set()
templates = []
for path in files:
    src = open(path, encoding='utf-8').read()
    for pattern in PATTERNS:
        for hit in pattern.findall(src):
            candidate = hit[-1] if isinstance(hit, tuple) else hit
            # key 约定为 {域}.{模块}.{位置}.{含义}，至少两段，借此滤掉属性名误匹配
            if candidate.count('.') >= 1:
                used.add(candidate)

    for raw in TEMPLATE.findall(src):
        if '${' not in raw:
            continue
        family = template_family(raw)
        if family is not None:
            templates.append((path, raw, family))

missing = sorted(k for k in used if k not in zh)
print(f'扫描 {len(files)} 个文件，静态引用 key {len(used)} 个')
print('语言包中缺失：', missing if missing else '无')

# 模板 key 族匹配：要求语言包中存在至少一个命中该家族的 key。
template_missing = sorted({
    f'{raw}  (来源 {path})'
    for path, raw, family in templates
    if not any(family.match(k) for k in zh)
})
print(f'模板类 key {len(templates)} 处（按前缀/后缀族匹配）')
print('模板 key 缺失：', template_missing if template_missing else '无')

# ---------------------------------------------------------------------------
# 第 4 条：值里含 {{占位符}} 的 key 被当**静态文案**用（没传 params）。
#
# 真实缺陷（2026-10-07）：订单阶段页把 `cc.dict.usedBy`（值 =「{{count}} 处引用」）
# 直接当列名用，页面上真的印出了「{{count}} 处引用」六个字符。
#
# 为什么前三条都拦不住：那条 key **确实存在**、parity 也齐、也没有 ${} 模板结构 ——
# 缺的不是 key，是**调用处的第二个参数**。
#
# 判据：`t('K')` 后面紧跟的第一个非空白字符若是 `)` 而不是 `,`，即判定为未传参。
# 误报面：故意不传参而依赖默认值的写法（i18next 的 `{{}}` 无默认渲染）不存在；
# 而 `t('K',{...})` 的多行写法同样以 `,` 紧跟，故多行不会被误判。
#
# 白名单：`ana.funnel.rate` 的占位符由 LxFunnel 组件内的
# `rateTemplate.replace(/\{\{?rate\}?\}/g, rate)` 二次替换（它收的是模板串，不是成品串）。
# 这类"模板在组件里填"的用法是合法的，故显式列出而不是放宽判据 ——
# 放宽判据会把这个检查变成永远为绿的形式检查。
_PARAMS_WHITELIST = {
    'ana.funnel.rate',  # 见packages/lingxi-ui/src/LxFunnel.tsx：模板串由组件内 replace 填充
}

unsubstituted = []
_ZH_VALUES = json.load(open(ZH_PATH, encoding='utf-8'))
_PLACEHOLDER_VALUE = {k for k, v in _ZH_VALUES.items() if isinstance(v, str) and '{{' in v}
_CALL_WITHOUT_PARAMS = re.compile(r"""t\(\s*'([A-Za-z][\w.]*)'\s*\)""")

for path in files:
    src = open(path, encoding='utf-8').read()
    for key in _CALL_WITHOUT_PARAMS.findall(src):
        if key in _PLACEHOLDER_VALUE and key not in _PARAMS_WHITELIST:
            unsubstituted.append(f'{key}  (来源 {path})')
unsubstituted = sorted(set(unsubstituted))
print(
    f'占位符 key {len(_PLACEHOLDER_VALUE)} 个'
    f'（白名单 {len(_PARAMS_WHITELIST)} 个由组件内二次替换）；'
    f'其中未传参使用 {len(unsubstituted)} 处'
)
print('未替换占位符风险：', unsubstituted if unsubstituted else '无')

if missing or only_zh or only_en or template_missing or bad_lang or unsubstituted:
    sys.exit(1)
print('i18n 自检通过')
