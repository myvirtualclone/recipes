import { useMemo, useState } from 'react';
import type { Lang } from '../lib/i18n';
import { t, tagLabel } from '../lib/i18n';
import type { Filters, SortDir, SortKey } from '../lib/recipe';
import { activeFilterCount, allTags, applyFilters, authorKey, creatorCounts, EMPTY_FILTERS, tagCounts, variantCounts } from '../lib/recipe';
import { TagFilterRow } from './TagChips';
import type { Recipe } from '../types';
import { COLLECTIONS } from '../types';
import { RecipeCard } from './RecipeCard';
import { RecipeList } from './RecipeList';
import { CreatorChip } from './CreatorChip';
import { loadLibraryView, saveLibraryView, type LibraryView } from '../lib/storage';

interface Props {
  lang: Lang;
  recipes: Recipe[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onFav: (r: Recipe) => void;
  onCreator: (name: string) => void;
}

const SORTS: SortKey[] = ['newest', 'oldest', 'protein', 'calories', 'title'];

export function Library({ lang, recipes, filters, setFilters, onOpen, onAdd, onFav, onCreator }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [view, setView] = useState<LibraryView>(() => loadLibraryView());
  const setLibraryView = (v: LibraryView) => {
    setView(v);
    saveLibraryView(v);
  };

  const results = useMemo(() => applyFilters(recipes, filters, lang), [recipes, filters, lang]);
  const tags = useMemo(() => allTags(recipes), [recipes]);
  const nActive = activeFilterCount(filters);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const ingCounts = useMemo(() => tagCounts(results, 'ingredient'), [results]);
  const eqCounts = useMemo(() => tagCounts(results, 'equipment'), [results]);
  const varParents = useMemo(
    () => (filters.ingTags.length ? filters.ingTags : filters.variantTags.map((k) => k.split(':')[0])),
    [filters.ingTags, filters.variantTags],
  );
  const varCounts = useMemo(
    () => (varParents.length ? variantCounts(results, varParents) : []),
    [results, varParents],
  );
  const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  return (
    <>
      <div className="search-bar">
        <input
          type="search"
          value={filters.q}
          placeholder={t('search', lang)}
          onChange={(e) => set({ q: e.target.value })}
          aria-label={t('search', lang)}
        />
      </div>
      <div className="provider-tabs">
        <button
          type="button"
          className={`provider-tab fav-tab ${filters.favOnly ? 'active' : ''}`}
          aria-pressed={filters.favOnly}
          onClick={() => set({ favOnly: !filters.favOnly })}
        >
          {t('favorites', lang)}
        </button>
        <button type="button" className={`provider-tab filter-btn ${nActive ? 'on' : ''}`} onClick={() => setSheetOpen(true)}>
          ⚙ {t('filters', lang)}
          {nActive > 0 && <i className="badge">{nActive}</i>}
        </button>
      </div>
      <div className="tagrows">
        <TagFilterRow
          lang={lang}
          kind="ingredient"
          counts={ingCounts}
          selected={filters.ingTags}
          onToggle={(k) => set({ ingTags: toggle(filters.ingTags, k) })}
          onClear={() => set({ ingTags: [] })}
        />
        <TagFilterRow
          lang={lang}
          kind="equipment"
          counts={eqCounts}
          selected={filters.eqTags}
          onToggle={(k) => set({ eqTags: toggle(filters.eqTags, k) })}
          onClear={() => set({ eqTags: [] })}
          initial={6}
        />
        {varCounts.length > 0 && (
          <TagFilterRow
            lang={lang}
            kind="variant"
            counts={varCounts}
            selected={filters.variantTags}
            onToggle={(k) => set({ variantTags: toggle(filters.variantTags, k) })}
            onClear={() => set({ variantTags: [] })}
            initial={8}
          />
        )}
      </div>
      <CreatorFilter
        lang={lang}
        recipes={recipes}
        selected={filters.author}
        onSelect={(name) => set({ author: name })}
      />
      <div className="lib-toolbar">
        <span className="muted">
          {results.length === 1 ? t('recipesCount1', lang) : t('recipesCount', lang, { n: results.length })}
        </span>
        <div className="view-toggle" role="group" aria-label={t('viewList', lang)}>
          <button type="button" className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} onClick={() => setLibraryView('grid')}>
            ▦ {t('viewGrid', lang)}
          </button>
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => setLibraryView('list')}>
            ☰ {t('viewList', lang)}
          </button>
        </div>
        {view === 'grid' && (
          <label className="sort-select">
            <span className="sr-only">{t('sort', lang)}</span>
            <select
              value={filters.sort}
              onChange={(e) => {
                const sort = e.target.value as SortKey;
                const sortDir: SortDir =
                  sort === 'calories' || sort === 'title' || sort === 'oldest' ? 'asc' : 'desc';
                set({ sort, sortDir });
              }}
            >
              {SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`sort_${s}`, lang)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="chip" onClick={onAdd}>
          {t('addRecipe', lang)}
        </button>
      </div>

      {recipes.length === 0 ? (
        <p className="muted center empty">{t('emptyLibrary', lang)}</p>
      ) : results.length === 0 ? (
        <div className="center empty">
          <p className="muted">{t('noResults', lang)}</p>
          <button type="button" className="btn sm" onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort, sortDir: filters.sortDir })}>
            {t('clearFilters', lang)}
          </button>
        </div>
      ) : (
        view === 'list' ? (
          <RecipeList
            lang={lang}
            recipes={results}
            sort={filters.sort}
            sortDir={filters.sortDir ?? 'desc'}
            onSort={(sort, sortDir) => set({ sort, sortDir })}
            onOpen={onOpen}
            onFav={onFav}
          />
        ) : (
          <div className="recipe-grid">
            {results.map((r) => (
              <RecipeCard key={r.id} r={r} lang={lang} onOpen={() => onOpen(r.id)} onFav={() => onFav(r)} onCreator={onCreator} />
            ))}
          </div>
        )
      )}

      {sheetOpen && (
        <FilterSheet
          lang={lang}
          filters={filters}
          tags={tags}
          count={applyFilters(recipes, filters, lang).length}
          onChange={setFilters}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}

function FilterSheet({
  lang,
  filters,
  tags,
  count,
  onChange,
  onClose,
}: {
  lang: Lang;
  filters: Filters;
  tags: string[];
  count: number;
  onChange: (f: Filters) => void;
  onClose: () => void;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggleTag = (tg: string) =>
    set({ tags: filters.tags.includes(tg) ? filters.tags.filter((x) => x !== tg) : [...filters.tags, tg] });

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet tall" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t('filters', lang)}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>{t('filters', lang)}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close', lang)}>
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <h3 className="filter-h">{t('collection', lang)}</h3>
          <div className="pill-row">
            <button type="button" className={`unit-pill ${!filters.collection ? 'active' : ''}`} onClick={() => set({ collection: '' })}>
              {t('all', lang)}
            </button>
            {COLLECTIONS.map((c) => (
              <button
                type="button"
                key={c}
                className={`unit-pill ${filters.collection === c ? 'active' : ''}`}
                onClick={() => set({ collection: c })}
              >
                {c}
              </button>
            ))}
          </div>

          <h3 className="filter-h">{t('proteinRange', lang)}</h3>
          <RangeRow
            lang={lang}
            min={filters.proteinMin}
            max={filters.proteinMax}
            onChange={(proteinMin, proteinMax) => set({ proteinMin, proteinMax })}
            quick={[
              { label: '≥ 20g', min: '20', max: '' },
              { label: '≥ 30g', min: '30', max: '' },
              { label: '≥ 50g', min: '50', max: '' },
            ]}
          />

          <h3 className="filter-h">{t('caloriesRange', lang)}</h3>
          <RangeRow
            lang={lang}
            min={filters.calMin}
            max={filters.calMax}
            onChange={(calMin, calMax) => set({ calMin, calMax })}
            quick={[
              { label: '≤ 300', min: '', max: '300' },
              { label: '≤ 500', min: '', max: '500' },
            ]}
          />

          {tags.length > 0 && (
            <>
              <h3 className="filter-h">{t('tags', lang)}</h3>
              <div className="pill-row">
                {tags.map((tg) => (
                  <button
                    type="button"
                    key={tg}
                    className={`unit-pill ${filters.tags.includes(tg) ? 'active' : ''}`}
                    onClick={() => toggleTag(tg)}
                  >
                    {tagLabel(tg, lang)}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="check-row">
            <input type="checkbox" checked={filters.postedOnly} onChange={(e) => set({ postedOnly: e.target.checked })} />
            {t('postedMacrosOnly', lang)}
          </label>
          <label className="check-row">
            <input type="checkbox" checked={filters.showArchived} onChange={(e) => set({ showArchived: e.target.checked })} />
            {t('showArchived', lang)}
          </label>
        </div>
        <div className="sheet-foot">
          <button type="button" className="btn" onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q, sort: filters.sort })}>
            {t('clearFilters', lang)}
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            {count === 1 ? t('showResult1', lang) : t('showResults', lang, { n: count })}
          </button>
        </div>
      </div>
    </div>
  );
}

function RangeRow({
  lang,
  min,
  max,
  onChange,
  quick,
}: {
  lang: Lang;
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  quick: { label: string; min: string; max: string }[];
}) {
  return (
    <div className="range-row">
      <div className="range-inputs">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={t('min', lang)}
          value={min}
          onChange={(e) => onChange(e.target.value, max)}
        />
        <span>–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={t('max', lang)}
          value={max}
          onChange={(e) => onChange(min, e.target.value)}
        />
      </div>
      <div className="pill-row">
        {quick.map((q) => {
          const on = q.min === min && q.max === max;
          return (
            <button
              type="button"
              key={q.label}
              className={`unit-pill ${on ? 'active' : ''}`}
              onClick={() => (on ? onChange('', '') : onChange(q.min, q.max))}
            >
              {q.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreatorFilter({
  lang,
  recipes,
  selected,
  onSelect,
}: {
  lang: Lang;
  recipes: Recipe[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [q, setQ] = useState('');
  const all = useMemo(() => creatorCounts(recipes), [recipes]);
  const needle = q.trim().toLowerCase();
  const matched = needle
    ? all.filter((c) => c.name.toLowerCase().includes(needle) || authorKey(c.name).includes(needle.replace(/^@/, '')))
    : all;
  const shown = needle ? matched : matched.slice(0, 8);
  const hidden = needle ? 0 : Math.max(0, matched.length - shown.length);
  // Always keep the selected chip visible.
  const rows =
    selected && !shown.some((c) => authorKey(c.name) === authorKey(selected))
      ? [...shown, all.find((c) => authorKey(c.name) === authorKey(selected))].filter(Boolean)
      : shown;

  return (
    <div className="tagrow creator-row">
      <div className="tagrow-label">{t('filterCreator', lang)}</div>
      <input
        type="search"
        className="creator-search"
        value={q}
        placeholder={t('creatorSearch', lang)}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t('creatorSearch', lang)}
      />
      <div className="tagrow-chips">
        {rows.map((c) => (
          <CreatorChip
            key={authorKey(c!.name)}
            name={c!.name}
            lang={lang}
            count={c!.count}
            on={authorKey(selected) === authorKey(c!.name)}
            onClick={() => onSelect(authorKey(selected) === authorKey(c!.name) ? '' : c!.name)}
          />
        ))}
        {hidden > 0 && (
          <span className="ftag more">{t('moreCreators', lang, { n: hidden })}</span>
        )}
      </div>
    </div>
  );
}
