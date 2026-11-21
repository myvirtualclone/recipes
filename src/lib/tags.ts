import defs from './tagdefs.json';
import variantDefs from './variantdefs.json';
import type { Lang } from './i18n';

export type TagKind = 'ingredient' | 'equipment';

type Defs = Record<TagKind, Record<string, [string, string, string]>>;
const D = defs as unknown as Defs;

export const TAG_KEYS: Record<TagKind, string[]> = {
  ingredient: Object.keys(D.ingredient),
  equipment: Object.keys(D.equipment),
};

/** Canonical key from free text ("Greek yogurt" -> greek_yogurt), matching a known label in either language. */
export function toTagKey(kind: TagKind, input: string): string {
  const raw = input.trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  for (const [k, [en, es]] of Object.entries(D[kind])) {
    if (k === low || en.toLowerCase() === low || es.toLowerCase() === low) return k;
  }
  return low
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function tagText(kind: TagKind, key: string, lang: Lang): string {
  const d = D[kind][key];
  if (d) return lang === 'es' ? d[1] : d[0];
  const s = key.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const EQUIP_ICON: Record<string, string> = {
  air_fryer: '🌀',
  oven: '♨️',
  blender: '🥤',
  microwave: '📡',
  slow_cooker: '🍲',
  pressure_cooker: '⏲️',
  stovetop: '🍳',
  grill: '🔥',
  waffle_maker: '🧇',
  ice_cream_maker: '🍦',
  freezer: '❄️',
  no_cook: '🥗',
};

const DISH_EMOJI: [string, string][] = [
  ['chicken', '🍗'],
  ['ground_beef', '🍔'],
  ['beef', '🥩'],
  ['salmon', '🐟'],
  ['tuna', '🐟'],
  ['shrimp', '🍤'],
  ['rice_paper', '🥟'],
  ['pepperoni', '🍕'],
  ['bacon', '🥓'],
  ['eggs', '🍳'],
  ['chocolate', '🍫'],
  ['peanut_butter', '🥜'],
  ['sweet_potato', '🍠'],
  ['potato', '🥔'],
  ['banana', '🍌'],
  ['apple', '🍎'],
  ['berries', '🍓'],
  ['greek_yogurt', '🥣'],
  ['cottage_cheese', '🧀'],
  ['oats', '🥣'],
  ['avocado', '🥑'],
  ['pasta', '🍝'],
  ['bread', '🍞'],
];

/** Emoji for the placeholder thumbnail, from the recipe's ingredient tags. */
export function dishEmoji(ingredientTags: string[]): string {
  for (const [k, e] of DISH_EMOJI) if (ingredientTags.includes(k)) return e;
  return '🍽️';
}

type VariantDefs = Record<string, Record<string, [string, string]>>;
const V = variantDefs as unknown as VariantDefs;

export function isVariantKey(key: string): boolean {
  return key.includes(':');
}

export function variantParent(key: string): string {
  return key.split(':')[0] ?? key;
}

/** Short label for just the variant (e.g. "Chocolate"). */
export function variantShort(key: string, lang: Lang): string {
  const [parent, child] = key.split(':');
  if (!child) return tagText('ingredient', key, lang);
  const d = V[parent]?.[child];
  if (d) return lang === 'es' ? d[1] : d[0];
  const s = child.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Full chip label: "Protein powder · Chocolate". */
export function variantText(key: string, lang: Lang): string {
  if (!isVariantKey(key)) return tagText('ingredient', key, lang);
  const parent = variantParent(key);
  return `${tagText('ingredient', parent, lang)} · ${variantShort(key, lang)}`;
}

export function ingredientChipLabel(key: string, lang: Lang): string {
  return isVariantKey(key) ? variantText(key, lang) : tagText('ingredient', key, lang);
}
