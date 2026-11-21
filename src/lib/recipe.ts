import type { Lang } from './i18n';
import type { Recipe } from '../types';

export interface Localized {
  title: string;
  titleFallback: boolean;
  ingredients: string[];
  ingredientsFallback: boolean;
  steps: string[];
  stepsFallback: boolean;
}

/** Content in the chosen language, falling back to the other one (flagged so the UI can badge it). */
export function localize(r: Recipe, lang: Lang): Localized {
  const pick = <T,>(want: T, other: T, empty: (v: T) => boolean): [T, boolean] =>
    !empty(want) ? [want, false] : [other, !empty(other)];
  const emptyStr = (v: string | null) => !v || !v.trim();
  const emptyArr = (v: string[]) => !v || v.length === 0;
  const [title, titleFallback] =
    lang === 'es'
      ? pick(r.title_es, r.title_en, emptyStr)
      : pick(r.title_en, r.title_es, emptyStr);
  const [ingredients, ingredientsFallback] =
    lang === 'es'
      ? pick(r.ingredients_es, r.ingredients_en, emptyArr)
      : pick(r.ingredients_en, r.ingredients_es, emptyArr);
  const [steps, stepsFallback] =
    lang === 'es' ? pick(r.steps_es, r.steps_en, emptyArr) : pick(r.steps_en, r.steps_es, emptyArr);
  return {
    title: title || r.code || '—',
    titleFallback,
    ingredients,
    ingredientsFallback,
    steps,
    stepsFallback,
  };
}

export function thumbSrc(url: string | null): string | null {
  if (!url) return null;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w400`;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
}

export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function searchHaystack(r: Recipe): string {
  return fold(
    [
      r.title_en,
      r.title_es,
      r.author,
      r.caption,
      r.code,
      ...r.ingredients_en,
      ...r.ingredients_es,
      ...r.tags,
    ]
      .filter(Boolean)
      .join(' \n '),
  );
}

export type SortKey = 'newest' | 'oldest' | 'protein' | 'calories' | 'title';

export interface Filters {
  q: string;
  collection: string; // '' = all
  tags: string[];
  proteinMin: string;
  proteinMax: string;
  calMin: string;
  calMax: string;
  postedOnly: boolean;
  showArchived: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  collection: '',
  tags: [],
  proteinMin: '',
  proteinMax: '',
  calMin: '',
  calMax: '',
  postedOnly: false,
  showArchived: false,
  sort: 'newest',
};

export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.collection) n++;
  n += f.tags.length;
  if (f.proteinMin || f.proteinMax) n++;
  if (f.calMin || f.calMax) n++;
  if (f.postedOnly) n++;
  if (f.showArchived) n++;
  return n;
}

function inRange(v: number | null, min: string, max: string): boolean {
  if (!min && !max) return true;
  if (v == null) return false;
  if (min && v < Number(min)) return false;
  if (max && v > Number(max)) return false;
  return true;
}

export function applyFilters(all: Recipe[], f: Filters, lang: Lang): Recipe[] {
  const terms = fold(f.q).split(/\s+/).filter(Boolean);
  const out = all.filter((r) => {
    if (r.status === 'draft') return false;
    if (r.status === 'archived' && !f.showArchived) return false;
    if (f.collection && r.collection !== f.collection) return false;
    if (f.tags.length && !f.tags.every((tg) => r.tags.includes(tg))) return false;
    if (!inRange(r.protein_g, f.proteinMin, f.proteinMax)) return false;
    if (!inRange(r.calories, f.calMin, f.calMax)) return false;
    if (f.postedOnly && r.macro_source !== 'post') return false;
    if (terms.length) {
      const hay = searchHaystack(r);
      if (!terms.every((tm) => hay.includes(tm))) return false;
    }
    return true;
  });
  const savedAt = (r: Recipe) => r.captured_at || r.created_at || '';
  const cmp: Record<SortKey, (a: Recipe, b: Recipe) => number> = {
    newest: (a, b) => savedAt(b).localeCompare(savedAt(a)) || (b.code ?? '').localeCompare(a.code ?? ''),
    oldest: (a, b) => savedAt(a).localeCompare(savedAt(b)) || (a.code ?? '').localeCompare(b.code ?? ''),
    protein: (a, b) => (b.protein_g ?? -1) - (a.protein_g ?? -1),
    calories: (a, b) => (a.calories ?? Infinity) - (b.calories ?? Infinity),
    title: (a, b) => localize(a, lang).title.localeCompare(localize(b, lang).title, lang),
  };
  return out.sort(cmp[f.sort]);
}

export function allTags(all: Recipe[]): string[] {
  const counts = new Map<string, number>();
  for (const r of all) if (r.status !== 'archived') for (const tg of r.tags) counts.set(tg, (counts.get(tg) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k]) => k);
}

export function fmtNum(n: number | null): string {
  if (n == null) return '–';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Groups for the Duplicates screen: same fb_post_id, or near-identical titles. */
export interface DupeGroup {
  kind: 'fb' | 'title';
  key: string;
  recipes: Recipe[];
}

function titleTokens(r: Recipe): Set<string> {
  const s = fold(`${r.title_en ?? ''}`).replace(/[^a-z0-9 ]+/g, ' ');
  return new Set(s.split(/\s+/).filter((w) => w.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function findDuplicates(all: Recipe[]): DupeGroup[] {
  const live = all.filter((r) => r.status !== 'archived');
  const groups: DupeGroup[] = [];
  const byFb = new Map<string, Recipe[]>();
  for (const r of live) {
    if (!r.fb_post_id) continue;
    byFb.set(r.fb_post_id, [...(byFb.get(r.fb_post_id) ?? []), r]);
  }
  const inFbGroup = new Set<string>();
  for (const [k, rs] of byFb) {
    if (rs.length > 1) {
      groups.push({ kind: 'fb', key: k, recipes: rs });
      rs.forEach((r) => inFbGroup.add(r.id));
    }
  }
  const seen = new Set<string>();
  const toks = new Map(live.map((r) => [r.id, titleTokens(r)]));
  for (const a of live) {
    if (seen.has(a.id)) continue;
    const grp = [a];
    for (const b of live) {
      if (b.id === a.id || seen.has(b.id)) continue;
      if (a.fb_post_id && a.fb_post_id === b.fb_post_id) continue; // already an fb group
      if (jaccard(toks.get(a.id)!, toks.get(b.id)!) >= 0.8) grp.push(b);
    }
    if (grp.length > 1) {
      grp.forEach((r) => seen.add(r.id));
      groups.push({ kind: 'title', key: a.id, recipes: grp });
    }
  }
  return groups;
}
