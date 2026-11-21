import type { Lang } from '../lib/i18n';
import { t } from '../lib/i18n';
import { fmtNum, localize, type SortDir, type SortKey } from '../lib/recipe';
import type { Recipe } from '../types';
import { needsReview } from '../types';
import { Star } from './Star';

const COLS: { key: SortKey; label: 'colTitle' | 'colCal' | 'colP' | 'colC' | 'colF'; field?: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'; cls: string }[] = [
  { key: 'title', label: 'colTitle', cls: 'col-title' },
  { key: 'calories', label: 'colCal', field: 'calories', cls: 'col-cal' },
  { key: 'protein', label: 'colP', field: 'protein_g', cls: 'col-p' },
  { key: 'carbs', label: 'colC', field: 'carbs_g', cls: 'col-c' },
  { key: 'fat', label: 'colF', field: 'fat_g', cls: 'col-f' },
];

export const LIST_SORT_DEFAULT: Record<'title' | 'calories' | 'protein' | 'carbs' | 'fat', SortDir> = {
  title: 'asc',
  calories: 'asc',
  protein: 'desc',
  carbs: 'desc',
  fat: 'desc',
};

interface Props {
  lang: Lang;
  recipes: Recipe[];
  sort: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey, dir: SortDir) => void;
  onOpen: (id: string) => void;
  onFav: (r: Recipe) => void;
}

export function RecipeList({ lang, recipes, sort, sortDir, onSort, onOpen, onFav }: Props) {
  function headerClick(key: SortKey) {
    const def = LIST_SORT_DEFAULT[key as keyof typeof LIST_SORT_DEFAULT] ?? 'asc';
    if (sort === key) onSort(key, sortDir === 'asc' ? 'desc' : 'asc');
    else onSort(key, def);
  }

  return (
    <div className="table-wrap recipe-list-wrap">
      <table className="recipe-list">
        <thead>
          <tr>
            <th className="col-star"></th>
            {COLS.map((c) => {
              const active = sort === c.key;
              const arrow = active ? (sortDir === 'asc' ? ' ▴' : ' ▾') : '';
              return (
                <th key={c.key} className={`${c.cls}${active ? ' sorted' : ''}`} aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => headerClick(c.key)}>
                    {t(c.label, lang)}
                    {arrow && <span className="sort-arrow">{arrow}</span>}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const title = localize(r, lang).title;
            const flag = needsReview(r);
            const est = r.macro_source === 'estimated';
            return (
              <tr key={r.id} className="recipe-list-row" onClick={() => onOpen(r.id)} tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(r.id); } }}
                role="link">
                <td className="col-star" onClick={(e) => e.stopPropagation()}>
                  <Star on={r.is_favorite} lang={lang} onToggle={() => onFav(r)} className="list-star" />
                </td>
                <td className="col-title">
                  <div className="title-inner">
                    {flag && <span className="needs-dot" title={t('needsReview', lang)} aria-label={t('needsReview', lang)} />}
                    <span className="list-title" title={title}>{title}</span>
                    {r.is_substitute && <span className="sub-badge">{t('subShort', lang)}</span>}
                  </div>
                </td>
                {COLS.filter((c) => c.field).map((c) => {
                  const v = r[c.field!];
                  const miss = v == null;
                  const numCls = miss ? 'miss' : c.field === 'calories' ? 'num cal' : c.field === 'protein_g' ? 'num pro' : 'num';
                  const showEst = est && c.field === 'calories';
                  return (
                    <td key={c.key} className={`${c.cls} ${numCls}`}>
                      <span className="list-num">{miss ? '–' : fmtNum(v)}</span>
                      {showEst && <abbr className="est-mark" title={t('estimated', lang)}>est.</abbr>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
