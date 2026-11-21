# Recipe Box

Dan's personal recipe web app: library, search and filters, recipe detail with big macros, review queue, bilingual (English / Español) editing, duplicate check and capture log. Recipes come from Facebook Saved (collections **Cooking** and **Cooking - SL**) and always link back to the original post or reel.

Live: **https://myvirtualclone.github.io/recipes/** (PIN-gated).

Out of scope on purpose: meal planning, grocery lists, cook mode, and anything that posts to Facebook.

## UI conventions follow Margory's app

The look and patterns are taken directly from Margory's shopping app (`myvirtualclone.github.io/margory/`, source `/workspace/margory/app`): the same CSS tokens (colors, Segoe UI/system font, radii, shadows), topbar with EN/ES chip, main tab bar, provider-style pill tabs, chips and badges, cards, bottom sheet, buttons, status pills, toast and the PIN gate. The top of `src/App.css` is copied from Margory's `App.css`; recipe-only styles come after it. A warm accent (`--warm`) is used only for calorie chips and tiles. Language handling mirrors Margory's `lib/i18n.ts` (`t(key, lang)`, persisted choice) but defaults to English.

## Stack

React + TypeScript + Vite PWA, hash router, base path `/recipes/`. Manifest and service worker are scoped to `/recipes/` only (Margory lives at `/margory/` on the same origin; this SW never touches the site root or Margory's caches).

Data: the free Supabase project **Margory** (ref `imbfcskczwkdjwfwagvs`), anon key only (never `service_role`). Recipe tables live in `public` with a `rec_` prefix and never reference Margory's tables.

If `rec_recipes` is missing (SQL not applied yet) or Supabase is unreachable, the app runs in **demo mode**: it shows the bundled seed recipes with a banner ("Database not set up yet: showing sample recipes"), and edits are saved to `localStorage` on that device only.

## Environment

`.env` (never committed):

```bash
VITE_PIN=1357
VITE_SUPABASE_URL=https://imbfcskczwkdjwfwagvs.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

In GitHub, the same three values are **repository Actions variables** (`Settings → Secrets and variables → Actions → Variables`), read by the deploy workflow.

## Run locally

```bash
npm ci
npm run dev        # http://localhost:5173/recipes/
npm run build && npm run preview   # http://localhost:4173/recipes/
```

## 1. Apply the SQL (one time)

Open the Margory project's **SQL Editor** in Supabase (account droitman@outlook.com) and run `supabase/001_rec_init.sql`. It is idempotent and only creates `rec_*` objects:

- `rec_recipes`: bilingual title/ingredients/steps (`*_en`, `*_es` as jsonb arrays), collection, tags, Facebook URL + `fb_post_id` (unique, dedupe key), thumbnail, macros (`calories`, `protein_g`, `carbs_g`, `fat_g`, `macro_basis`, `macro_source` = `post` | `estimated`), `es_reviewed`, status `draft | approved | archived`, timestamps.
- `rec_capture_log`: one row per capture run (found / new / duplicate / failed).
- RLS on, with anon select/insert/update/delete policies (MVP, PIN-gated like Margory), plus its own `rec_set_updated_at()` trigger.

## 2. Seed the recipes

```bash
npm run seed -- --dry-run   # checks the table is reachable
npm run seed                # upserts public/seed/recipes.json (215 recipes) on fb_post_id, in batches of 50
```

`public/seed/recipes.json` holds all 215 recipes from Rosa's capture (SL-* → collection "Cooking - SL", CK-* → "Cooking"), status `approved`. It is fetched lazily at runtime (demo mode) and is not in the JS bundle. Macros are only present when the post stated them (`macro_source = 'post'`); none are estimated. Spanish title/ingredients/steps are offline machine translations (Helsinki-NLP opus-mt-en-es, no paid API) marked `es_reviewed = false`; SL-001…005 are hand-translated.

To rebuild it (e.g. after Rosa captures more thumbnails):

```bash
python3 scripts/translate_seed.py   # needs the MT venv; caches to ../meta/es_cache.json
python3 scripts/build_seed.py       # merges scripts/seed_base.json + ../capture/rows.json, tags, thumbs → public/seed/
```

### Tags

Every recipe has `ingredient_tags` (dish-defining ingredients only, not salt/pepper/oil/water) and `equipment_tags` (air_fryer, oven, blender, microwave, stovetop, freezer, no_cook, …). Tags are canonical English keys; labels in both languages come from `src/lib/tagdefs.json` (which also holds the matching rules used by `build_seed.py`). The library shows chip rows for both (most common first, with counts, "Show all"); selected chips combine with AND alongside the other filters and search. Tapping a tag on a recipe filters the library; the edit form edits both lists. The SQL adds both `text[]` columns idempotently (`ADD COLUMN IF NOT EXISTS`) with GIN indexes.

## 3. Deploy

**Current (interim):** `scripts/deploy-gh-pages.sh` builds with `.env` and force-pushes `dist/` to this repo's `gh-pages` branch; GitHub Pages serves that branch (Pages source: "Deploy from a branch", `gh-pages` `/`). It only ever pushes to `myvirtualclone/recipes`, never to `myvirtualclone.github.io`, so Margory's deploys and this app can't overwrite each other.

```bash
./scripts/deploy-gh-pages.sh
```

**Planned (Actions):** `ci/github-pages-deploy.yml` is a ready workflow: on push to `main` it runs `npm ci`, builds with the `VITE_*` repository variables, and publishes with `actions/upload-pages-artifact` + `actions/deploy-pages`. It isn't in `.github/workflows/` yet because the box's GitHub token has no `workflow` scope (GitHub rejects pushes that add workflow files). To switch over: refresh the token with `gh auth refresh -s workflow` (or add the file in the GitHub web UI), move it to `.github/workflows/deploy.yml`, and set Pages "Source" to "GitHub Actions".

## Facebook post IDs

`src/lib/fb.ts` turns `/reel/<id>`, `/watch/?v=<id>`, `/videos/<id>`, `/posts/<id|pfbid…>`, `permalink.php?story_fbid=`, `?fbid=` and `/share/r|v|p/<token>` URLs into one key. The edit form refuses to save a second recipe with the same key, and the Duplicates screen groups same-ID and near-identical titles.

## Screens

1. Library (thumbnail grid, macro chips, collection badge, FB link)
2. Search + filters (collection, tags, protein range, calorie range, macros-from-post, sort)
3. Recipe detail (macro tiles with basis and from-post / estimated, ingredients, steps, tags, notes, caption, "Open original on Facebook")
4. Review queue (drafts: approve / edit / archive, approve all clean)
5. Edit (EN and ES side by side, macros, tags, collection, thumbnail, Spanish-reviewed toggle)
6. Duplicates (keep one, archive the rest)
7. Capture log
