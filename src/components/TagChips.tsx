import { useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import type { TagKind } from '../lib/tags';
import { EQUIP_ICON, ingredientChipLabel, isVariantKey, tagText } from '../lib/tags';

interface RowProps {
  lang: Lang;
  kind: TagKind | 'variant';
  counts: [string, number][];
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
  initial?: number;
  label?: string;
}

/** Library filter row: heading above a full-width chip row. */
export function TagFilterRow({ lang, kind, counts, selected, onToggle, onClear, initial = 8, label }: RowProps) {
  const [open, setOpen] = useState(false);
  const byKey = new Map(counts);
  const ordered: [string, number][] = [
    ...selected.map((k) => [k, byKey.get(k) ?? 0] as [string, number]),
    ...counts.filter(([k]) => !selected.includes(k)),
  ];
  const visible = open ? ordered : ordered.slice(0, Math.max(initial, selected.length));
  const hidden = ordered.length - visible.length;
  if (!ordered.length) return null;
  const heading =
    label ??
    (kind === 'variant' ? t('variantRow', lang) : t(kind === 'ingredient' ? 'ingTags' : 'eqTags', lang));
  const rowKind = kind === 'variant' ? 'ingredient' : kind;
  return (
    <div className={`tagrow ${open ? 'open' : ''}`} role="group" aria-label={heading}>
      <div className="tagrow-label">{heading}</div>
      <div className="tagrow-chips">
        {visible.map(([k, n]) => {
          const on = selected.includes(k);
          const text = kind === 'variant' || isVariantKey(k) ? ingredientChipLabel(k, lang) : tagText(rowKind, k, lang);
          return (
            <button
              type="button"
              key={k}
              className={`ftag ${rowKind} ${kind === 'variant' ? 'variant' : ''} ${on ? 'on' : ''}`}
              aria-pressed={on}
              onClick={() => onToggle(k)}
            >
              {rowKind === 'equipment' && EQUIP_ICON[k] ? <span aria-hidden>{EQUIP_ICON[k]} </span> : null}
              {text}
              <i>{n}</i>
            </button>
          );
        })}
        {hidden > 0 && (
          <button type="button" className="ftag more" onClick={() => setOpen(true)}>
            {t('showAll', lang, { n: ordered.length })}
          </button>
        )}
        {open && ordered.length > initial && (
          <button type="button" className="ftag more" onClick={() => setOpen(false)}>
            {t('showLess', lang)}
          </button>
        )}
        {selected.length > 0 && (
          <button type="button" className="ftag more clear" onClick={onClear}>
            ✕ {t('clearTagFilter', lang)}
          </button>
        )}
      </div>
    </div>
  );
}

/** Read-only tag chips on the detail page; tapping filters the library. */
export function TagLinks({
  lang,
  kind,
  keys,
  onTap,
}: {
  lang: Lang;
  kind: TagKind;
  keys: string[];
  onTap: (key: string) => void;
}) {
  if (!keys.length) return null;
  return (
    <div className="tag-row">
      {keys.map((k) => (
        <button type="button" key={k} className={`ftag ${kind}${isVariantKey(k) ? ' variant' : ''}`} onClick={() => onTap(k)}>
          {kind === 'equipment' && EQUIP_ICON[k] ? <span aria-hidden>{EQUIP_ICON[k]} </span> : null}
          {kind === 'ingredient' ? ingredientChipLabel(k, lang) : tagText(kind, k, lang)}
        </button>
      ))}
    </div>
  );
}
