import { useMemo, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { authorKey, creatorCounts, fold } from '../lib/recipe';
import type { Recipe } from '../types';
import { tagText, variantShort } from '../lib/tags';

interface Props {
  lang: Lang;
  recipes: Recipe[];
  onOpenParent: (key: string) => void;
  onOpenVariant: (key: string) => void;
  onOpenCreator: (name: string) => void;
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

export function IngredientIndex({ lang, recipes, onOpenParent, onOpenVariant, onOpenCreator }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'ingredients' | 'creators'>('ingredients');
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

  const creators = useMemo(() => creatorCounts(recipes), [recipes]);
  const creatorItems = useMemo(() => {
    const needle = fold(q).trim().replace(/^@/, '');
    if (!needle) return creators;
    return creators.filter((c) => fold(c.name).includes(needle) || authorKey(c.name).includes(needle));
  }, [creators, q]);

  return (
    <div className="screen index-screen">
      <h2 className="screen-title">{tab === 'creators' ? t('indexCreators', lang) : t('indexTitle', lang)}</h2>
      <div className="index-subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'ingredients'} className={tab === 'ingredients' ? 'on' : ''} onClick={() => { setTab('ingredients'); setQ(''); }}>
          {t('indexTitle', lang)}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'creators'} className={tab === 'creators' ? 'on' : ''} onClick={() => { setTab('creators'); setQ(''); }}>
          {t('indexCreators', lang)}
        </button>
      </div>
      <p className="muted small">{tab === 'creators' ? t('indexCreatorsSub', lang) : t('indexSub', lang)}</p>
      <div className="search-bar index-search">
        <input
          type="search"
          value={q}
          placeholder={tab === 'creators' ? t('indexCreatorSearch', lang) : t('indexSearch', lang)}
          onChange={(e) => setQ(e.target.value)}
          aria-label={tab === 'creators' ? t('indexCreatorSearch', lang) : t('indexSearch', lang)}
        />
      </div>
      {tab === 'creators' ? (
        creatorItems.length === 0 ? (
          <p className="muted center empty">{t('indexCreatorsEmpty', lang)}</p>
        ) : (
          <ul className="index-list">
            {creatorItems.map((c) => (
              <li key={authorKey(c.name)} className="index-item">
                <div className="index-parent">
                  <button type="button" className="index-toggle" onClick={() => onOpenCreator(c.name)}>
                    <span className="index-name">@{c.name}</span>
                    <span className="index-count">
                      {c.count === 1 ? t('recipesWith1', lang) : t('recipesWith', lang, { n: c.count })}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : items.length === 0 ? (
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
