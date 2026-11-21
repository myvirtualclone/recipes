export type RecipeStatus = 'draft' | 'approved' | 'archived';
export type Collection = 'Cooking' | 'Cooking - SL';
export type MacroSource = 'post' | 'estimated';
export type MacroBasis = 'per_serving' | 'per_item' | 'total';

export const COLLECTIONS: Collection[] = ['Cooking - SL', 'Cooking'];
export const MACRO_BASES: MacroBasis[] = ['per_serving', 'per_item', 'total'];

export interface Recipe {
  id: string;
  code: string | null;
  status: RecipeStatus;
  title_en: string | null;
  title_es: string | null;
  ingredients_en: string[];
  ingredients_es: string[];
  steps_en: string[];
  steps_es: string[];
  notes: string | null;
  author: string | null;
  caption: string | null;
  collection: Collection | null;
  tags: string[];
  ingredient_tags: string[];
  equipment_tags: string[];
  fb_url: string | null;
  fb_post_id: string | null;
  thumbnail_url: string | null;
  screenshot_url: string | null;
  post_date: string | null;
  captured_at: string | null;
  servings: string | null;
  prep_time: string | null;
  cook_time: string | null;
  cuisine: string | null;
  meal_type: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  macro_basis: MacroBasis | null;
  macro_source: MacroSource | null;
  es_reviewed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaptureLogEntry {
  id: string;
  started_at: string;
  finished_at: string | null;
  collection: string | null;
  found: number;
  new_count: number;
  duplicate_count: number;
  failed_count: number;
  notes: string | null;
}

export function emptyRecipe(): Recipe {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    code: null,
    status: 'draft',
    title_en: '',
    title_es: '',
    ingredients_en: [],
    ingredients_es: [],
    steps_en: [],
    steps_es: [],
    notes: null,
    author: null,
    caption: null,
    collection: 'Cooking - SL',
    tags: [],
    ingredient_tags: [],
    equipment_tags: [],
    fb_url: null,
    fb_post_id: null,
    thumbnail_url: null,
    screenshot_url: null,
    post_date: null,
    captured_at: now,
    servings: null,
    prep_time: null,
    cook_time: null,
    cuisine: null,
    meal_type: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    macro_basis: null,
    macro_source: null,
    es_reviewed: false,
    created_at: now,
    updated_at: now,
  };
}

export function hasMacros(r: Recipe): boolean {
  return r.calories != null || r.protein_g != null || r.carbs_g != null || r.fat_g != null;
}
