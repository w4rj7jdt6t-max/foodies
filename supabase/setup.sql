-- ================= foodies – Datenbank einrichten =================
-- In Supabase: SQL Editor → New query → alles einfügen → Run.
-- Kann gefahrlos mehrfach ausgeführt werden.

-- 1) Tabelle für Rezepte (das ganze Rezept liegt als JSON in „data“)
create table if not exists public.recipes (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) Zugriff nur für angemeldete Personen (ihr beide)
alter table public.recipes enable row level security;

drop policy if exists "foodies lesen"     on public.recipes;
drop policy if exists "foodies anlegen"   on public.recipes;
drop policy if exists "foodies ändern"    on public.recipes;
drop policy if exists "foodies löschen"   on public.recipes;
create policy "foodies lesen"   on public.recipes for select to authenticated using (true);
create policy "foodies anlegen" on public.recipes for insert to authenticated with check (true);
create policy "foodies ändern"  on public.recipes for update to authenticated using (true) with check (true);
create policy "foodies löschen" on public.recipes for delete to authenticated using (true);

-- 3) Live-Aktualisierung auf allen Geräten
do $$ begin
  alter publication supabase_realtime add table public.recipes;
exception when duplicate_object then null; end $$;

-- 4) Speicher für Rezeptbilder (Bilder haben zufällige Namen und sind per Link abrufbar)
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

drop policy if exists "foodies bilder hochladen" on storage.objects;
drop policy if exists "foodies bilder ändern"    on storage.objects;
drop policy if exists "foodies bilder löschen"   on storage.objects;
create policy "foodies bilder hochladen" on storage.objects for insert to authenticated with check (bucket_id = 'recipe-images');
create policy "foodies bilder ändern"    on storage.objects for update to authenticated using (bucket_id = 'recipe-images');
create policy "foodies bilder löschen"   on storage.objects for delete to authenticated using (bucket_id = 'recipe-images');

-- ================= Einkaufsliste =================
create table if not exists public.shopping_items (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.shopping_items enable row level security;
drop policy if exists "foodies einkauf lesen"   on public.shopping_items;
drop policy if exists "foodies einkauf anlegen" on public.shopping_items;
drop policy if exists "foodies einkauf ändern"  on public.shopping_items;
drop policy if exists "foodies einkauf löschen" on public.shopping_items;
create policy "foodies einkauf lesen"   on public.shopping_items for select to authenticated using (true);
create policy "foodies einkauf anlegen" on public.shopping_items for insert to authenticated with check (true);
create policy "foodies einkauf ändern"  on public.shopping_items for update to authenticated using (true) with check (true);
create policy "foodies einkauf löschen" on public.shopping_items for delete to authenticated using (true);
do $$ begin
  alter publication supabase_realtime add table public.shopping_items;
exception when duplicate_object then null; end $$;

-- ================= Kalender (geplante Mahlzeiten) =================
create table if not exists public.meal_plan (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.meal_plan enable row level security;
drop policy if exists "foodies plan lesen"   on public.meal_plan;
drop policy if exists "foodies plan anlegen" on public.meal_plan;
drop policy if exists "foodies plan ändern"  on public.meal_plan;
drop policy if exists "foodies plan löschen" on public.meal_plan;
create policy "foodies plan lesen"   on public.meal_plan for select to authenticated using (true);
create policy "foodies plan anlegen" on public.meal_plan for insert to authenticated with check (true);
create policy "foodies plan ändern"  on public.meal_plan for update to authenticated using (true) with check (true);
create policy "foodies plan löschen" on public.meal_plan for delete to authenticated using (true);
do $$ begin
  alter publication supabase_realtime add table public.meal_plan;
exception when duplicate_object then null; end $$;
