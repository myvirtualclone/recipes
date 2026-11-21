-- Recipe Box schema (Dan's personal recipe app).
-- Lives in the shared free "Margory" Supabase project, in `public` with a `rec_`
-- prefix so no "Exposed schemas" change is needed.
-- This file ONLY creates/changes rec_* objects. It never touches Margory's tables
-- (catalog_items, orders, order_items, ...) or her set_updated_at() function.
-- Idempotent: safe to run more than once in the SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.rec_recipes (
  id uuid primary key default gen_random_uuid(),
  code text,                                   -- e.g. SL-001
  status text not null default 'draft',
  title_en text,
  title_es text,
  ingredients_en jsonb not null default '[]'::jsonb,
  ingredients_es jsonb not null default '[]'::jsonb,
  steps_en jsonb not null default '[]'::jsonb,
  steps_es jsonb not null default '[]'::jsonb,
  notes text,
  author text,
  caption text,
  collection text,
  tags text[] not null default '{}',
  ingredient_tags text[] not null default '{}',   -- canonical keys, e.g. greek_yogurt, rice_paper
  equipment_tags text[] not null default '{}',    -- canonical keys, e.g. air_fryer, oven, no_cook
  fb_url text,
  fb_post_id text,                              -- canonical FB reel/post id, dedupe key
  thumbnail_url text,
  screenshot_url text,
  post_date date,
  captured_at timestamptz,
  servings text,
  prep_time text,
  cook_time text,
  cuisine text,
  meal_type text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  macro_basis text,                             -- per_serving | per_item | total | null (not stated)
  macro_source text,                            -- post | estimated | null (no macros)
  es_reviewed boolean not null default false,
  ingredient_variants text[] not null default '{}', -- parent:variant keys, e.g. protein_powder:chocolate
  is_favorite boolean not null default false,
  source_type text,                                 -- caption, audio, linked_page, creator_page, equivalent_recipe, …
  is_substitute boolean not null default false,
  review_reasons text[] not null default '{}',      -- duplicate_fb, duplicate_title, missing_title, missing_ingredients, missing_steps, non_en_es, substitute
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns added after first release (no-ops on a fresh install).
alter table public.rec_recipes add column if not exists prep_time text;
alter table public.rec_recipes add column if not exists cook_time text;
alter table public.rec_recipes add column if not exists cuisine text;
alter table public.rec_recipes add column if not exists meal_type text;
alter table public.rec_recipes add column if not exists ingredient_tags text[] not null default '{}';
alter table public.rec_recipes add column if not exists equipment_tags text[] not null default '{}';
alter table public.rec_recipes add column if not exists ingredient_variants text[] not null default '{}';
alter table public.rec_recipes add column if not exists is_favorite boolean not null default false;
alter table public.rec_recipes add column if not exists source_type text;
alter table public.rec_recipes add column if not exists is_substitute boolean not null default false;
alter table public.rec_recipes add column if not exists review_reasons text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rec_recipes_status_chk') then
    alter table public.rec_recipes add constraint rec_recipes_status_chk
      check (status in ('draft','approved','archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rec_recipes_collection_chk') then
    alter table public.rec_recipes add constraint rec_recipes_collection_chk
      check (collection is null or collection in ('Cooking','Cooking - SL'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rec_recipes_macro_source_chk') then
    alter table public.rec_recipes add constraint rec_recipes_macro_source_chk
      check (macro_source is null or macro_source in ('post','estimated'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'rec_recipes_fb_post_id_key') then
    alter table public.rec_recipes add constraint rec_recipes_fb_post_id_key unique (fb_post_id);
  end if;
end $$;

create index if not exists rec_recipes_status_idx on public.rec_recipes (status);
create index if not exists rec_recipes_collection_idx on public.rec_recipes (collection);
create index if not exists rec_recipes_code_idx on public.rec_recipes (code);
create index if not exists rec_recipes_ingredient_tags_idx on public.rec_recipes using gin (ingredient_tags);
create index if not exists rec_recipes_equipment_tags_idx on public.rec_recipes using gin (equipment_tags);
create index if not exists rec_recipes_ingredient_variants_idx on public.rec_recipes using gin (ingredient_variants);
create index if not exists rec_recipes_review_reasons_idx on public.rec_recipes using gin (review_reasons);

create table if not exists public.rec_capture_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  collection text,
  found int not null default 0,
  new_count int not null default 0,
  duplicate_count int not null default 0,
  failed_count int not null default 0,
  notes text
);

create index if not exists rec_capture_log_started_idx on public.rec_capture_log (started_at desc);

-- Own trigger function (does not reuse Margory's set_updated_at()).
create or replace function public.rec_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rec_recipes_updated_at on public.rec_recipes;
create trigger rec_recipes_updated_at
  before update on public.rec_recipes
  for each row execute function public.rec_set_updated_at();

-- MVP access: PIN gate lives in the PWA (same model as Margory). Tighten later.
alter table public.rec_recipes enable row level security;
alter table public.rec_capture_log enable row level security;

drop policy if exists rec_recipes_anon_select on public.rec_recipes;
drop policy if exists rec_recipes_anon_insert on public.rec_recipes;
drop policy if exists rec_recipes_anon_update on public.rec_recipes;
drop policy if exists rec_recipes_anon_delete on public.rec_recipes;
create policy rec_recipes_anon_select on public.rec_recipes for select to anon, authenticated using (true);
create policy rec_recipes_anon_insert on public.rec_recipes for insert to anon, authenticated with check (true);
create policy rec_recipes_anon_update on public.rec_recipes for update to anon, authenticated using (true) with check (true);
create policy rec_recipes_anon_delete on public.rec_recipes for delete to anon, authenticated using (true);

drop policy if exists rec_capture_log_anon_select on public.rec_capture_log;
drop policy if exists rec_capture_log_anon_insert on public.rec_capture_log;
drop policy if exists rec_capture_log_anon_update on public.rec_capture_log;
drop policy if exists rec_capture_log_anon_delete on public.rec_capture_log;
create policy rec_capture_log_anon_select on public.rec_capture_log for select to anon, authenticated using (true);
create policy rec_capture_log_anon_insert on public.rec_capture_log for insert to anon, authenticated with check (true);
create policy rec_capture_log_anon_update on public.rec_capture_log for update to anon, authenticated using (true) with check (true);
create policy rec_capture_log_anon_delete on public.rec_capture_log for delete to anon, authenticated using (true);

grant select, insert, update, delete on public.rec_recipes to anon, authenticated;
grant select, insert, update, delete on public.rec_capture_log to anon, authenticated;

-- Make PostgREST see the new tables right away.
notify pgrst, 'reload schema';
