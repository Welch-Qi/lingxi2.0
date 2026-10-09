import { useState, type FormEvent } from 'react';

/**
 * 自然语言取数条 LxAskBar（问答式取数）。
 *
 * 只用于经营分析与市场情报两个模块，不要扩散到其他分区——这两个模块的典型用户
 * （CEO / 产品开发总监）的问题是"临时起意的",用固定看板穷举不现实；
 * 而客户中心、售后服务这类模块的问题是"每天都一样的",固定队列比自然语言入口更高效。
 *
 * 交互口径（产品规划说明书 V2.1 §2.10 / 技术规约2.0 §3.6 G9）：
 *   意图识别 → 槽位抽取 → 语义层映射参数化 SQL → 受限执行 → 结果解释。
 *   **LLM 不直接生成 SQL**，因此这里只是入口，不做任何本地解析。
 *
 * 示例问题（examples）必须给出：新用户不知道"能问什么"，
 * 空输入框会让人放弃使用；给三个真实业务问句比给一段说明文字有效得多。
 */
export interface LxAskBarProps {
  label: string;
  placeholder: string;
  examples: readonly string[];
  onSubmit?: ((question: string) => void) | undefined;
  /** 数据说明，如"答案来自已同步至 09:30 的经营数据" */
  caption?: string | undefined;
}

export function LxAskBar({ label, placeholder, examples, onSubmit, caption }: LxAskBarProps) {
  const [value, setValue] = useState('');

  const submit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }
    onSubmit?.(trimmed);
    setValue('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(value);
  };

  return (
    <section className="lx-askbar">
      <span className="lx-askbar__label">{label}</span>

      <form className="lx-askbar__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="lx-askbar__input"
          value={value}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="lx-askbar__submit lx-focusable">
          {label}
        </button>
      </form>

      <div className="lx-askbar__examples">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="lx-askbar__example lx-focusable"
            onClick={() => submit(example)}
          >
            {example}
          </button>
        ))}
      </div>

      {caption ? <span className="lx-askbar__caption">{caption}</span> : null}
    </section>
  );
}
