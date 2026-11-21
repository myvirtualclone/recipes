// Upsert the bundled seed recipes (public/seed/recipes.json, built by scripts/build_seed.py) into rec_recipes,
// matching on fb_post_id (the dedupe key). Run AFTER supabase/001_rec_init.sql
// has been applied. Uses the public anon key only (same as the app).
//
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run seed
//   (or put them in .env — it is read automatically)
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

const probe = await supabase.from('rec_recipes').select('id').limit(1);
if (probe.error) {
  console.error('rec_recipes is not reachable:', probe.error.message);
  console.error('Apply supabase/001_rec_init.sql in the Supabase SQL Editor first.');
  process.exit(1);
}

// Keep whatever id an existing row already has; the seed id is only used for new rows.
const ids = seed.map((r) => r.fb_post_id);
const idByFb = new Map();
for (let i = 0; i < ids.length; i += 100) {
  const existing = await supabase.from('rec_recipes').select('id,fb_post_id').in('fb_post_id', ids.slice(i, i + 100));
  if (existing.error) throw existing.error;
  for (const r of existing.data) idByFb.set(r.fb_post_id, r.id);
}
const rows = seed.map((r) => ({ ...r, id: idByFb.get(r.fb_post_id) ?? r.id }));

console.log(`${rows.length} seed recipes, ${idByFb.size} already in the table.`);
if (dryRun) process.exit(0);

let done = 0;
for (let i = 0; i < rows.length; i += 50) {
  const { data, error } = await supabase
    .from('rec_recipes')
    .upsert(rows.slice(i, i + 50), { onConflict: 'fb_post_id' })
    .select('code');
  if (error) {
    console.error(`Upsert failed at rows ${i}-${i + 49}:`, error.message);
    process.exit(1);
  }
  done += data.length;
}
console.log(`Upserted ${done} recipes (ingredient_tags + equipment_tags included).`);
