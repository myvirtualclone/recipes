import { supabase } from './supabase';
import { loadDemoEdits, saveDemoEdit } from './storage';
import type { CaptureLogEntry, Recipe } from '../types';

export type DataMode = 'db' | 'demo';

let seedPromise: Promise<Recipe[]> | null = null;
/** Bundled sample/seed recipes, fetched lazily from public/seed/ (kept out of the JS bundle). */
export function loadSeed(): Promise<Recipe[]> {
  seedPromise ??= fetch(`${import.meta.env.BASE_URL}seed/recipes.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`seed ${r.status}`);
      return r.json() as Promise<Recipe[]>;
    })
    .catch((e) => {
      seedPromise = null;
      throw e;
    });
  return seedPromise;
}
const TABLE = 'rec_recipes';
const LOG_TABLE = 'rec_capture_log';

function normalize(r: Partial<Recipe>): Recipe {
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    ...(r as Recipe),
    ingredients_en: arr(r.ingredients_en),
    ingredients_es: arr(r.ingredients_es),
    steps_en: arr(r.steps_en),
    steps_es: arr(r.steps_es),
    tags: arr(r.tags),
    ingredient_tags: arr(r.ingredient_tags),
    equipment_tags: arr(r.equipment_tags),
    calories: num(r.calories),
    protein_g: num(r.protein_g),
    carbs_g: num(r.carbs_g),
    fat_g: num(r.fat_g),
    es_reviewed: Boolean(r.es_reviewed),
  };
}

/** Is rec_recipes reachable with the anon key? Missing table / no config ⇒ demo mode. */
export async function detectMode(): Promise<DataMode> {
  if (!supabase) return 'demo';
  try {
    const { error } = await supabase.from(TABLE).select('id').limit(1);
    if (!error) return 'db';
    return 'demo';
  } catch {
    return 'demo';
  }
}

export async function listRecipes(mode: DataMode): Promise<Recipe[]> {
  if (mode === 'db' && supabase) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('captured_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []).map(normalize);
  }
  const edits = loadDemoEdits();
  const byId = new Map<string, Recipe>();
  for (const r of await loadSeed()) byId.set(r.id, normalize(r));
  for (const r of Object.values(edits)) byId.set(r.id, normalize(r));
  return [...byId.values()];
}

export async function saveRecipe(mode: DataMode, r: Recipe): Promise<Recipe> {
  const row = { ...r, updated_at: new Date().toISOString() };
  if (mode === 'db' && supabase) {
    const { data, error } = await supabase.from(TABLE).upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return normalize(data as Recipe);
  }
  saveDemoEdit(row);
  return row;
}

export async function listCaptureLog(mode: DataMode): Promise<CaptureLogEntry[]> {
  if (mode === 'db' && supabase) {
    const { data, error } = await supabase
      .from(LOG_TABLE)
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) return [];
    return (data ?? []) as CaptureLogEntry[];
  }
  return [];
}
