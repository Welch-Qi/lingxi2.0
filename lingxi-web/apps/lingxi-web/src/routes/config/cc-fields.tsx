import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Select } from 'antd';
import { DATA_SCOPES, DATA_SCOPE_DESC_KEY } from '@/app/providers/dataScope';
import { DEPTS, type RoleRow, type UserRow } from './cc-store';

/**
 * 数据范围选择器（五档 + CUSTOM 时的部门多选）。
 *
 * 为什么单独抽成组件而不是内联在用户表单里：
 * 「用户编辑」「角色默认值」「审计展示」三处都要出现同一组选项，且必须同序同措辞；
 * 更关键的是 **CUSTOM 才出现部门多选**这条联动规则 —— 散开写三次，
 * 迟早有一次写成"永远显示部门多选"，用户看到一堆用不上的复选框却不知道该不该勾。
 *
 * 受控值用单个对象 `{ scope, deptKeys }` 而不是两个独立 state：
 * 切档时要把上一档残留的 deptKeys 清掉，分两个 state 就会出现
 * "档位已经是 SELF 了，但对象里还藏着两个部门"的脏组合。
 */
export function DataScopePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: { scope: UserRow['scope']; deptKeys: readonly string[] };
  onChange: (next: { scope: UserRow['scope']; deptKeys: readonly string[] }) => void;
  disabled?: boolean | undefined;
}) {
  const { t } = useTranslation();

  return (
    <div className="lx-cc-scope">
      <div className="lx-cc-scope__row">
        {DATA_SCOPES.map((scope) => {
          const active = scope === value.scope;
          return (
            <button
              key={scope}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              className={`lx-cc-scope__opt lx-focusable${active ? ' is-active' : ''}`}
              onClick={() =>
                // 换档时清空已选部门：SELF/DEPT/DEPT_AND_SUB/ALL 都不看这个字段，
                // 留着只会在用户切回 CUSTOM 时冒出一堆他自己都记不清的授权。
                onChange({ scope, deptKeys: scope === 'CUSTOM' ? value.deptKeys : [] })
              }
            >
              <span className="lx-cc-scope__name">{t(`cc.scope.${scope}`)}</span>
              <span className="lx-cc-scope__desc">{t(DATA_SCOPE_DESC_KEY[scope])}</span>
            </button>
          );
        })}
      </div>

      {value.scope === 'CUSTOM' ? (
        <div className="lx-cc-scope__custom">
          <span className="lx-cc-field__label">{t('cc.users.f.scopeDepts')}</span>
          <Checkbox.Group
            className="lx-cc-scope__depts"
            value={[...value.deptKeys]}
            disabled={disabled}
            onChange={(next) => onChange({ scope: value.scope, deptKeys: next })}
          >
            {DEPTS.map((dept) => (
              <Checkbox key={dept.key} value={dept.key}>
                {t(dept.nameKey)}
              </Checkbox>
            ))}
          </Checkbox.Group>
          <span className="lx-cc-field__hint">{t('cc.users.f.scopeDeptsHint')}</span>
        </div>
      ) : null}
    </div>
  );
}

/** 角色多选（用户可同时持有多个角色，权限取并集）。 */
export function RoleMultiSelect({
  value,
  roles,
  onChange,
  disabled = false,
}: {
  value: readonly string[];
  roles: readonly RoleRow[];
  onChange: (next: string[]) => void;
  disabled?: boolean | undefined;
}) {
  const { t } = useTranslation();
  // 未分配角色的角色不列出来：角色被删后用户身上的引用会悬空，
  // 那种情况下既不该被选中，也不该在这里显示成"一个都不选"的假象。
  const available = useMemo(() => roles, [roles]);

  if (available.length === 0) {
    return <span className="lx-cc-empty">{t('cc.roles.empty')}</span>;
  }

  return (
    <div className="lx-cc-roles">
      <Select
        mode="multiple"
        className="lx-cc-roles__select"
        disabled={disabled}
        value={[...value]}
        placeholder={t('cc.users.roleNone')}
        onChange={(next) => onChange(next)}
        options={available.map((role) => ({
          value: role.id,
          label: (
            <span className="lx-cc-roles__opt">
              {t(role.nameKey)}
              <span className="lx-cc-roles__meta">{role.perms.length} · {t(`cc.scope.${role.defaultScope}`)}</span>
            </span>
          ),
        }))}
        optionRender={(opt) => opt.label}
      />
      <span className="lx-cc-field__hint">
        {value.length > 0 ? t('cc.users.rolePicked', { count: value.length }) : t('cc.users.roleNone')}
      </span>
    </div>
  );
}