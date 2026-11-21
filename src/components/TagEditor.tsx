import { useId, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import type { TagKind } from '../lib/tags';
import { TAG_KEYS, tagText, toTagKey } from '../lib/tags';

interface Props {
  lang: Lang;
  kind: TagKind;
  value: string[];
  onChange: (v: string[]) => void;
  /** Extra known keys (e.g. tags already used by other recipes). */
  known?: string[];
}

export function TagEditor({ lang, kind, value, onChange, known = [] }: Props) {
  const [text, setText] = useState('');
  const listId = useId();
  const all = [...new Set([...TAG_KEYS[kind].filter((k) => k !== 'no_cook' || kind === 'equipment'), ...known])];
  const suggestions = all.filter((k) => !value.includes(k));
  const q = text.trim().toLowerCase();
  const quick = (q
    ? suggestions.filter((k) => tagText(kind, k, lang).toLowerCase().includes(q) || k.includes(q))
    : suggestions
  ).slice(0, 8);

  const add = (raw: string) => {
    const k = toTagKey(kind, raw);
    if (k && !value.includes(k)) onChange([...value, k]);
    setText('');
  };

  return (
    <div className="tag-editor">
      <div className="tag-row">
        {value.map((k) => (
          <span key={k} className={`ftag ${kind} on`}>
            {tagText(kind, k, lang)}
            <button type="button" className="x" aria-label={`${t('removeTag', lang)} ${tagText(kind, k, lang)}`} onClick={() => onChange(value.filter((x) => x !== k))}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="tag-add">
        <input
          list={listId}
          value={text}
          placeholder={t('addTag', lang)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <datalist id={listId}>
          {suggestions.map((k) => (
            <option key={k} value={tagText(kind, k, lang)} />
          ))}
        </datalist>
        <button type="button" className="btn sm" onClick={() => add(text)} disabled={!text.trim()}>
          {t('addTagBtn', lang)}
        </button>
      </div>
      {quick.length > 0 && (
        <div className="tag-row suggest">
          <span className="muted small">{t('suggestions', lang)}:</span>
          {quick.map((k) => (
            <button type="button" key={k} className={`ftag ${kind} ghost`} onClick={() => add(k)}>
              + {tagText(kind, k, lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
