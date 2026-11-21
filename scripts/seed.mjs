// Upsert the bundled seed recipes (public/seed/recipes.json, built by scripts/build_seed.py)
// into rec_recipes. Match existing rows by code (not fb_post_id) and upsert on id.
// Rows in the table whose code is no longer in the seed are archived, never deleted.
// is_favorite is always preserved. If a row's updated_at is newer than the seed and
// a content field differs from the previous seed, that field is kept (user edit).
//
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run seed
//   (or put them in .env — it is read automatically)
//   npm run seed -- --dry-run
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = new URL('..', import.meta.url);
const envPath = new URL('.env', root);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const seed = JSON.parse(readFileSync(new URL('public/seed/recipes.json', root), 'utf8'));
const dryRun = process.argv.includes('--dry-run');

const PREV_CANDIDATES = [
  new URL('../../capture/recipes_v6_seed.json', root),
  new URL('scripts/.prev_seed.json', root),
];
let prevByCode = new Map();
for (const p of PREV_CANDIDATES) {
  if (existsSync(p)) {
    const prev = JSON.parse(readFileSync(p, 'utf8'));
    prevByCode = new Map(prev.map((r) => [r.code, r]));
    break;
  }
}

const CONTENT_FIELDS = [
  'title_en', 'title_es', 'ingredients_en', 'ingredients_es', 'steps_en', 'steps_es',
  'notes', 'author', 'caption', 'servings', 'prep_time', 'cook_time', 'cuisine', 'meal_type',
  'calories', 'protein_g', 'carbs_g', 'fat_g', 'macro_basis', 'macro_source',
  'source_type', 'is_substitute', 'thumbnail_url', 'fb_url', 'tags',
  'ingredient_tags', 'equipment_tags', 'ingredient_variants', 'review_reasons',
  'es_reviewed', 'collection', 'status',
];

const probe = await supabase.from('rec_recipes').select('id').limit(1);
if (probe.error) {
  console.error('rec_recipes is not reachable:', probe.error.message);
  console.error('Apply supabase/001_rec_init.sql in the Supabase SQL Editor first.');
  process.exit(1);
}

async function fetchAll() {
  const all = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from('rec_recipes').select('*').range(from, from + page - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return all;
}

function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function mergeRow(seedRow, existing, prev) {
  const row = { ...seedRow, id: existing.id };
  row.is_favorite = Boolean(existing.is_favorite);
  const seedTs = seedRow.updated_at ? Date.parse(seedRow.updated_at) : 0;
  const dbTs = existing.updated_at ? Date.parse(existing.updated_at) : 0;
  if (dbTs > seedTs && prev) {
    const kept = [];
    for (const f of CONTENT_FIELDS) {
      if (!same(existing[f], prev[f]) && !same(existing[f], seedRow[f])) {
        row[f] = existing[f];
        kept.push(f);
      }
    }
    if (kept.length) {
      console.log(`preserved user edits on ${existing.code}: ${kept.join(', ')}`);
    }
  }
  return row;
}

const existing = await fetchAll();
const byCode = new Map(existing.map((r) => [r.code, r]));
const seedCodes = new Set(seed.map((r) => r.code));

const rows = [];
let matched = 0;
let created = 0;
let preserved = 0;
for (const r of seed) {
  const ex = byCode.get(r.code);
  if (ex) {
    matched += 1;
    const prev = prevByCode.get(r.code);
    const seedTs = r.updated_at ? Date.parse(r.updated_at) : 0;
    const dbTs = ex.updated_at ? Date.parse(ex.updated_at) : 0;
    if (dbTs > seedTs && prev) preserved += 1; // counted pre-merge; log happens inside
    rows.push(mergeRow(r, ex, prev));
  } else {
    created += 1;
    rows.push({ ...r, is_favorite: Boolean(r.is_favorite) });
  }
}

const toArchive = existing.filter((e) => !seedCodes.has(e.code) && e.status !== 'archived');
const alreadyArchived = existing.filter((e) => !seedCodes.has(e.code) && e.status === 'archived');

console.log(
  `${seed.length} seed recipes, ${matched} already in the table, ${created} new, ` +
  `${toArchive.length} to archive, ${alreadyArchived.length} already archived.`,
);
if (dryRun) process.exit(0);

let done = 0;
for (let i = 0; i < rows.length; i += 50) {
  const { data, error } = await supabase
    .from('rec_recipes')
    .upsert(rows.slice(i, i + 50), { onConflict: 'id' })
    .select('code');
  if (error) {
    console.error(`Upsert failed at rows ${i}-${i + 49}:`, error.message);
    process.exit(1);
  }
  done += data.length;
}
console.log(`Upserted ${done} recipes (tags, variants, source, review_reasons included).`);

if (toArchive.length) {
  const { data, error } = await supabase
    .from('rec_recipes')
    .update({ status: 'archived' })
    .in('id', toArchive.map((e) => e.id))
    .select('code');
  if (error) {
    console.error('Archive failed:', error.message);
    process.exit(1);
  }
  console.log(`Archived ${data.length} recipes (not deleted): ${data.map((r) => r.code).sort().join(', ')}`);
}
