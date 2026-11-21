import type { Lang } from './i18n';
import type { Recipe } from '../types';

const LANG_KEY = 'recipes.lang.v1';
const AUTH_KEY = 'recipes.auth.v1';
const DEMO_KEY = 'recipes.demo.v1';
const DEMO_DELETED_KEY = 'recipes.demo.deleted.v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export function loadLang(): Lang {
  const v = readJson<string>(LANG_KEY, 'en');
  return v === 'es' ? 'es' : 'en';
}
export function saveLang(lang: Lang) {
  writeJson(LANG_KEY, lang);
}

export function loadUnlocked(): boolean {
  return readJson<boolean>(AUTH_KEY, false) === true;
}
export function saveUnlocked(v: boolean) {
  writeJson(AUTH_KEY, v);
}

/** Demo-mode edits (no database yet): full recipe rows keyed by id, layered over the bundled seed. */
export function loadDemoEdits(): Record<string, Recipe> {
  return readJson<Record<string, Recipe>>(DEMO_KEY, {});
}
export function saveDemoEdit(r: Recipe) {
  const all = loadDemoEdits();
  all[r.id] = r;
  writeJson(DEMO_KEY, all);
}

export function loadDemoDeleted(): string[] {
  return readJson<string[]>(DEMO_DELETED_KEY, []);
}

export function deleteDemoRecipe(id: string) {
  const all = loadDemoEdits();
  delete all[id];
  writeJson(DEMO_KEY, all);
  const deleted = loadDemoDeleted();
  if (!deleted.includes(id)) writeJson(DEMO_DELETED_KEY, [...deleted, id]);
}

const VIEW_KEY = 'recipes.view.v1';
export type LibraryView = 'grid' | 'list';

export function loadLibraryView(): LibraryView {
  const v = readJson<string>(VIEW_KEY, 'grid');
  return v === 'list' ? 'list' : 'grid';
}
export function saveLibraryView(view: LibraryView) {
  writeJson(VIEW_KEY, view);
}
