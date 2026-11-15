-- ================= foodies – Haushalte & Einladungen =================
-- In Supabase: SQL Editor → New query → alles einfügen → ZUERST unten bei
-- „VERWALTER“ deine Login-E-Mail eintragen → Run.
-- Kann gefahrlos mehrfach ausgeführt werden. Bestehende Daten werden eurem
-- Haushalt zugeordnet, es geht nichts verloren.

-- ---------- 1) Tabellen ----------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users on delete cascade
);
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 60),
  created_by  uuid references auth.users on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.households add column if not exists subtitle text;
create table if not exists public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  role         text not null check (role in ('owner', 'editor', 'viewer')),
  email        text,
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create table if not exists public.invites (
  code         text primary key,
  kind         text not null check (kind in ('household', 'member')),
  household_id uuid references public.households on delete cascade,
  role         text check (role in ('editor', 'viewer')),
  label        text,
  created_by   uuid references auth.users on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  used_by      uuid references auth.users on delete set null,
  used_at      timestamptz
);

-- ---------- 2) Hilfsfunktionen (prüfen Mitgliedschaft & Rechte) ----------
create or replace function public.is_app_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid())
$$;
create or replace function public.my_role(hh uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.household_members where household_id = hh and user_id = auth.uid()
$$;
create or replace function public.can_read(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select hh is not null and exists (select 1 from public.household_members where household_id = hh and user_id = auth.uid())
$$;
create or replace function public.can_write(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select hh is not null and exists (select 1 from public.household_members where household_id = hh and user_id = auth.uid() and role in ('owner', 'editor'))
$$;

-- ---------- 3) Zugriffsregeln für Haushalte/Mitglieder/Einladungen ----------
alter table public.app_admins enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.invites enable row level security;
-- (Einladungen & Verwalter nur über die Funktionen unten – keine direkten Regeln)
drop policy if exists "haushalt lesen" on public.households;
create policy "haushalt lesen" on public.households for select to authenticated using (public.can_read(id));
drop policy if exists "mitglieder lesen" on public.household_members;
create policy "mitglieder lesen" on public.household_members for select to authenticated using (public.can_read(household_id));

-- ---------- 4) Daten-Tabellen bekommen einen Haushalt ----------
alter table public.recipes        add column if not exists household_id uuid references public.households on delete cascade;
alter table public.shopping_items add column if not exists household_id uuid references public.households on delete cascade;
alter table public.meal_plan      add column if not exists household_id uuid references public.households on delete cascade;
create index if not exists recipes_household_idx        on public.recipes (household_id);
create index if not exists shopping_items_household_idx on public.shopping_items (household_id);
create index if not exists meal_plan_household_idx      on public.meal_plan (household_id);

-- Ältere App-Versionen schicken keinen Haushalt mit → automatisch den eigenen eintragen
create or replace function public.set_default_household() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.household_id is null then
    select household_id into new.household_id from public.household_members
      where user_id = auth.uid() order by joined_at limit 1;
  end if;
  return new;
end $$;
drop trigger if exists recipes_default_household on public.recipes;
create trigger recipes_default_household before insert on public.recipes for each row execute function public.set_default_household();
drop trigger if exists shopping_default_household on public.shopping_items;
create trigger shopping_default_household before insert on public.shopping_items for each row execute function public.set_default_household();
drop trigger if exists plan_default_household on public.meal_plan;
create trigger plan_default_household before insert on public.meal_plan for each row execute function public.set_default_household();

-- Neue Regeln: lesen = Mitglied, schreiben = Mitglied mit Bearbeiten-Recht
do $$
declare t text;
begin
  foreach t in array array['recipes', 'shopping_items', 'meal_plan'] loop
    -- alte Regeln („alle Angemeldeten dürfen alles“) entfernen
    execute format('drop policy if exists "foodies lesen" on public.%I', t);
    execute format('drop policy if exists "foodies anlegen" on public.%I', t);
    execute format('drop policy if exists "foodies ändern" on public.%I', t);
    execute format('drop policy if exists "foodies löschen" on public.%I', t);
    execute format('drop policy if exists "foodies einkauf lesen" on public.%I', t);
    execute format('drop policy if exists "foodies einkauf anlegen" on public.%I', t);
    execute format('drop policy if exists "foodies einkauf ändern" on public.%I', t);
    execute format('drop policy if exists "foodies einkauf löschen" on public.%I', t);
    execute format('drop policy if exists "foodies plan lesen" on public.%I', t);
    execute format('drop policy if exists "foodies plan anlegen" on public.%I', t);
    execute format('drop policy if exists "foodies plan ändern" on public.%I', t);
    execute format('drop policy if exists "foodies plan löschen" on public.%I', t);
    execute format('drop policy if exists "haushalt lesen" on public.%I', t);
    execute format('drop policy if exists "haushalt anlegen" on public.%I', t);
    execute format('drop policy if exists "haushalt ändern" on public.%I', t);
    execute format('drop policy if exists "haushalt löschen" on public.%I', t);
    execute format('create policy "haushalt lesen" on public.%I for select to authenticated using (public.can_read(household_id))', t);
    execute format('create policy "haushalt anlegen" on public.%I for insert to authenticated with check (public.can_write(household_id))', t);
    execute format('create policy "haushalt ändern" on public.%I for update to authenticated using (public.can_write(household_id)) with check (public.can_write(household_id))', t);
    execute format('create policy "haushalt löschen" on public.%I for delete to authenticated using (public.can_write(household_id))', t);
  end loop;
end $$;

-- Bilder: neue Bilder liegen im Ordner des Haushalts; alte Bilder darf der Haushalt
-- des zugehörigen Rezepts ändern/löschen
drop policy if exists "foodies bilder hochladen" on storage.objects;
drop policy if exists "foodies bilder ändern"    on storage.objects;
drop policy if exists "foodies bilder löschen"   on storage.objects;
drop policy if exists "haushalt bilder hochladen" on storage.objects;
drop policy if exists "haushalt bilder ändern"    on storage.objects;
drop policy if exists "haushalt bilder löschen"   on storage.objects;
create or replace function public.can_write_image(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.household_members m
    where m.user_id = auth.uid() and m.role in ('owner', 'editor')
      and (m.household_id::text = (storage.foldername(path))[1]
           or exists (select 1 from public.recipes r where r.household_id = m.household_id and r.data->>'imagePath' = path))
  )
$$;
-- Supabase braucht zum Überschreiben/Löschen zusätzlich eine Leseregel (der Bucket ist ohnehin öffentlich lesbar)
drop policy if exists "haushalt bilder lesen" on storage.objects;
create policy "haushalt bilder lesen" on storage.objects for select to authenticated
  using (bucket_id = 'recipe-images');
create policy "haushalt bilder hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.can_write_image(name));
create policy "haushalt bilder ändern" on storage.objects for update to authenticated
  using (bucket_id = 'recipe-images' and public.can_write_image(name));
create policy "haushalt bilder löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-images' and public.can_write_image(name));

-- ---------- 5) Funktionen für Einladungen & Verwaltung ----------
create or replace function public.new_invite_code() returns text
language sql volatile as $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) $$;

-- Nur der Verwalter: Einladung für ein neues Paar (gründet einen eigenen Haushalt)
create or replace function public.create_household_invite(p_label text default null) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_app_admin() then raise exception 'Nur der Verwalter darf neue Paare einladen'; end if;
  c := public.new_invite_code();
  insert into public.invites (code, kind, label, created_by, expires_at)
    values (c, 'household', nullif(trim(p_label), ''), auth.uid(), now() + interval '30 days');
  return c;
end $$;

-- Mitglieder mit Bearbeiten-Recht: jemanden in den EIGENEN Haushalt einladen
create or replace function public.create_member_invite(p_household uuid, p_role text default 'editor') returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.can_write(p_household) then raise exception 'Keine Berechtigung für diesen Haushalt'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'Unbekannte Rolle'; end if;
  c := public.new_invite_code();
  insert into public.invites (code, kind, household_id, role, created_by, expires_at)
    values (c, 'member', p_household, p_role, auth.uid(), now() + interval '14 days');
  return c;
end $$;

-- Was steckt hinter einem Einladungscode? (auch vor der Registrierung abrufbar)
create or replace function public.invite_info(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'kind', i.kind, 'role', i.role, 'label', i.label,
    'household', h.name,
    'valid', i.used_at is null and i.expires_at > now()
  )
  from public.invites i left join public.households h on h.id = i.household_id
  where i.code = p_code
$$;

-- Einladung annehmen: neues Paar → Haushalt gründen; sonst → Haushalt beitreten
create or replace function public.accept_invite(p_code text, p_household_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare i public.invites; hh uuid;
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden'; end if;
  select * into i from public.invites where code = p_code for update;
  if not found then raise exception 'Diese Einladung gibt es nicht'; end if;
  if i.used_at is not null then raise exception 'Diese Einladung wurde schon benutzt'; end if;
  if i.expires_at <= now() then raise exception 'Diese Einladung ist abgelaufen'; end if;
  if i.kind = 'household' then
    if coalesce(trim(p_household_name), '') = '' then raise exception 'Bitte gib eurem Haushalt einen Namen'; end if;
    insert into public.households (name, created_by) values (trim(p_household_name), auth.uid()) returning id into hh;
    insert into public.household_members (household_id, user_id, role, email) values (hh, auth.uid(), 'owner', auth.jwt()->>'email');
  else
    hh := i.household_id;
    insert into public.household_members (household_id, user_id, role, email)
      values (hh, auth.uid(), i.role, auth.jwt()->>'email')
      on conflict (household_id, user_id) do nothing;
  end if;
  update public.invites set used_by = auth.uid(), used_at = now() where code = p_code;
  return hh;
end $$;

-- Offene Einladungen eines Haushalts (bzw. alle Paar-Einladungen für den Verwalter)
create or replace function public.list_invites(p_household uuid default null) returns setof public.invites
language sql stable security definer set search_path = public as $$
  select * from public.invites
  where used_at is null and expires_at > now()
    and ((p_household is not null and household_id = p_household and public.can_write(p_household))
      or (p_household is null and kind = 'household' and public.is_app_admin()))
  order by created_at desc
$$;
create or replace function public.revoke_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.invites where code = p_code and used_at is null
    and ((kind = 'member' and public.can_write(household_id)) or (kind = 'household' and public.is_app_admin()));
end $$;

-- Mitglieder verwalten (nur Eigentümer) bzw. selbst austreten
create or replace function public.set_member_role(p_household uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_household), '') <> 'owner' then raise exception 'Nur Eigentümer dürfen Rollen ändern'; end if;
  if p_role not in ('owner', 'editor', 'viewer') then raise exception 'Unbekannte Rolle'; end if;
  if p_role <> 'owner' and (select count(*) from public.household_members where household_id = p_household and role = 'owner' and user_id <> p_user) = 0 then
    raise exception 'Ein Haushalt braucht mindestens einen Eigentümer';
  end if;
  update public.household_members set role = p_role where household_id = p_household and user_id = p_user;
end $$;
create or replace function public.remove_member(p_household uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user <> auth.uid() and coalesce(public.my_role(p_household), '') <> 'owner' then raise exception 'Nur Eigentümer dürfen Mitglieder entfernen'; end if;
  if (select role from public.household_members where household_id = p_household and user_id = p_user) = 'owner'
     and (select count(*) from public.household_members where household_id = p_household and role = 'owner') = 1
     and (select count(*) from public.household_members where household_id = p_household) > 1 then
    raise exception 'Bitte zuerst jemand anderen zum Eigentümer machen';
  end if;
  delete from public.household_members where household_id = p_household and user_id = p_user;
end $$;
create or replace function public.update_household(p_household uuid, p_name text, p_subtitle text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_household), '') <> 'owner' then raise exception 'Nur Eigentümer dürfen das ändern'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte gib einen Namen ein'; end if;
  update public.households set name = trim(p_name), subtitle = nullif(trim(p_subtitle), '') where id = p_household;
end $$;

-- Übersicht für den Verwalter: alle Haushalte (nur Name & Größe, keine Inhalte)
create or replace function public.admin_households() returns table (id uuid, name text, created_at timestamptz, members bigint, recipes bigint)
language sql stable security definer set search_path = public as $$
  select h.id, h.name, h.created_at,
    (select count(*) from public.household_members m where m.household_id = h.id),
    (select count(*) from public.recipes r where r.household_id = h.id)
  from public.households h
  where public.is_app_admin()
  order by h.created_at
$$;

revoke all on function public.create_household_invite(text), public.create_member_invite(uuid, text), public.accept_invite(text, text),
  public.list_invites(uuid), public.revoke_invite(text), public.set_member_role(uuid, uuid, text), public.remove_member(uuid, uuid),
  public.update_household(uuid, text, text), public.admin_households() from anon;
grant execute on function public.invite_info(text) to anon, authenticated;

-- ---------- 6) Bestehende Daten: euer Haushalt ----------
do $$
declare hh uuid;
begin
  if not exists (select 1 from public.households) then
    insert into public.households (name, subtitle) values ('Nushka & Toem', 'Nushkas und Toems gemeinsame Küche') returning id into hh;
    insert into public.household_members (household_id, user_id, role, email)
      select hh, id, 'owner', email from auth.users;
  else
    select id into hh from public.households order by created_at limit 1;
  end if;
  update public.recipes        set household_id = hh where household_id is null;
  update public.shopping_items set household_id = hh where household_id is null;
  update public.meal_plan      set household_id = hh where household_id is null;
end $$;

-- ---------- 7) VERWALTER: hier DEINE Login-E-Mail eintragen ----------
insert into public.app_admins (user_id)
  select id from auth.users where lower(email) = lower('DEINE-EMAIL@BEISPIEL.DE')
on conflict do nothing;

-- Kontrolle: zeigt den Verwalter und euren Haushalt an
select 'Verwalter' as was, u.email as wert from public.app_admins a join auth.users u on u.id = a.user_id
union all
select 'Haushalt', name || ' (' || (select count(*) from public.household_members m where m.household_id = h.id) || ' Mitglieder)' from public.households h;
