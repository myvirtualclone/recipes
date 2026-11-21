import { useMemo, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { fold } from '../lib/recipe';
import type { Recipe } from '../types';
import { tagText, variantShort } from '../lib/tags';

interface Props {
  lang: Lang;
  recipes: Recipe[];
  onOpenParent: (key: string) => void;
  onOpenVariant: (key: string) => void;
}

interface VariantEntry {
  key: string;
  count: number;
}

interface ParentEntry {
  key: string;
  count: number;
  variants: VariantEntry[];
}

function indexOf(recipes: Recipe[]): ParentEntry[] {
  const live = recipes.filter((r) => r.status !== 'archived');
  const parents = new Map<string, { count: number; variants: Map<string, number> }>();
  for (const r of live) {
    for (const p of r.ingredient_tags) {
      const rec = parents.get(p) ?? { count: 0, variants: new Map() };
      rec.count += 1;
      parents.set(p, rec);
    }
    for (const v of r.ingredient_variants ?? []) {
      const p = v.split(':')[0];
      const rec = parents.get(p) ?? { count: 0, variants: new Map() };
      rec.variants.set(v, (rec.variants.get(v) ?? 0) + 1);
      parents.set(p, rec);
    }
  }
  return [...parents.entries()]
    .map(([key, rec]) => ({
      key,
      count: rec.count,
      variants: [...rec.variants.entries()]
        .map(([k, count]) => ({ key: k, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export function IngredientIndex({ lang, recipes, onOpenParent, onOpenVariant }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const all = useMemo(
    () => indexOf(recipes).sort((a, b) => tagText('ingredient', a.key, lang).localeCompare(tagText('ingredient', b.key, lang), lang)),
    [recipes, lang],
  );
  const items = useMemo(() => {
    const needle = fold(q).trim();
    if (!needle) return all;
    return all.filter((p) => {
      const label = fold(tagText('ingredient', p.key, lang));
      if (label.includes(needle) || p.key.includes(needle.replace(/\s+/g, '_'))) return true;
      return p.variants.some((v) => fold(variantShort(v.key, lang)).includes(needle) || v.key.includes(needle));
    });
  }, [all, q, lang]);

  return (
    <div className="screen index-screen">
      <h2 className="screen-title">{t('indexTitle', lang)}</h2>
      <p className="muted small">{t('indexSub', lang)}</p>
      <div className="search-bar index-search">
        <input
          type="search"
          value={q}
          placeholder={t('indexSearch', lang)}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('indexSearch', lang)}
        />
      </div>
      {items.length === 0 ? (
        <p className="muted center empty">{t('indexEmpty', lang)}</p>
      ) : (
        <ul className="index-list">
          {items.map((p) => {
            const expanded = open === p.key;
            const label = tagText('ingredient', p.key, lang);
            return (
              <li key={p.key} className={`index-item ${expanded ? 'open' : ''}`}>
                <div className="index-parent">
                  <button
                    type="button"
                    className="index-caret-btn"
                    aria-expanded={expanded}
                    aria-label={label}
                    onClick={() => setOpen(expanded ? null : p.key)}
                    disabled={p.variants.length === 0}
                  >
                    <span className="index-caret" aria-hidden>
                      {p.variants.length ? (expanded ? '▾' : '▸') : '·'}
                    </span>
                  </button>
                  <button type="button" className="index-toggle" onClick={() => onOpenParent(p.key)}>
                    <span className="index-name">{label}</span>
                    <span className="index-count">
                      {p.count === 1 ? t('recipesWith1', lang) : t('recipesWith', lang, { n: p.count })}
                    </span>
                  </button>
                </div>
                {expanded && p.variants.length > 0 && (
                  <ul className="index-variants">
                    {p.variants.map((v) => (
                      <li key={v.key}>
                        <button type="button" className="index-variant" onClick={() => onOpenVariant(v.key)}>
                          <span>
                            {label} · {variantShort(v.key, lang)}
                          </span>
                          <i>{v.count}</i>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
