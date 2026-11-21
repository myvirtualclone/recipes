// Upsert the bundled seed recipes (src/seed/recipes.json) into rec_recipes,
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

const seed = JSON.parse(readFileSync(new URL('src/seed/recipes.json', root), 'utf8'));
const dryRun = process.argv.includes('--dry-run');

const probe = await supabase.from('rec_recipes').select('id').limit(1);
if (probe.error) {
  console.error('rec_recipes is not reachable:', probe.error.message);
  console.error('Apply supabase/001_rec_init.sql in the Supabase SQL Editor first.');
  process.exit(1);
}

// Keep whatever id an existing row already has; the seed id is only used for new rows.
const ids = seed.map((r) => r.fb_post_id);
const existing = await supabase.from('rec_recipes').select('id,fb_post_id').in('fb_post_id', ids);
if (existing.error) throw existing.error;
const idByFb = new Map(existing.data.map((r) => [r.fb_post_id, r.id]));
const rows = seed.map((r) => ({ ...r, id: idByFb.get(r.fb_post_id) ?? r.id }));

console.log(`${rows.length} seed recipes, ${idByFb.size} already in the table.`);
if (dryRun) process.exit(0);

const { data, error } = await supabase
  .from('rec_recipes')
  .upsert(rows, { onConflict: 'fb_post_id' })
  .select('code,fb_post_id');
if (error) {
  console.error('Upsert failed:', error.message);
  process.exit(1);
}
console.log('Upserted:', data.map((r) => r.code).join(', '));
