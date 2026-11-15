-- ================= foodies – Profile & Freunde =================
-- Voraussetzung: households.sql wurde bereits ausgeführt.
-- In Supabase: SQL Editor → New query → alles einfügen → Run. Kann mehrfach ausgeführt werden.

-- ---------- 1) Profile ----------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users on delete cascade,
  username     text not null,
  display_name text not null,
  avatar_url   text,
  avatar_path  text,
  updated_at   timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9._]{3,20}$'),
  constraint profiles_display_name_len check (length(trim(display_name)) between 1 and 40)
);
create unique index if not exists profiles_username_key on public.profiles (username);
alter table public.profiles enable row level security;
-- Profile (Name, @Benutzername, Bild) sind für angemeldete Nutzer sichtbar – E-Mails nicht
drop policy if exists "profile lesen" on public.profiles;
drop policy if exists "profil anlegen" on public.profiles;
drop policy if exists "profil ändern" on public.profiles;
create policy "profile lesen"  on public.profiles for select to authenticated using (true);
create policy "profil anlegen" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profil ändern"  on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 2) Freundschaften (Anfrage → Annahme) ----------
create table if not exists public.friendships (
  requester  uuid not null references auth.users on delete cascade,
  addressee  uuid not null references auth.users on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
alter table public.friendships enable row level security;
drop policy if exists "freundschaft lesen" on public.friendships;
create policy "freundschaft lesen" on public.friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
-- Schreiben nur über die Funktionen unten

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships
    where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a)))
$$;

-- Rezepte lesen dürfen: Mitglieder des Haushalts ODER Freunde eines Mitglieds
create or replace function public.can_view_recipes(hh uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.can_read(hh) or exists (
    select 1 from public.household_members m
    where m.household_id = hh and public.are_friends(auth.uid(), m.user_id))
$$;
drop policy if exists "haushalt lesen" on public.recipes;
create policy "haushalt lesen" on public.recipes for select to authenticated using (public.can_view_recipes(household_id));
-- (Einkaufsliste, Kalender & Kühlschrank bleiben unverändert: nur der eigene Haushalt)

create or replace function public.friend_status(other uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when public.are_friends(auth.uid(), other) then 'friends'
    when exists (select 1 from public.friendships where requester = auth.uid() and addressee = other) then 'outgoing'
    when exists (select 1 from public.friendships where requester = other and addressee = auth.uid()) then 'incoming'
    else 'none' end
$$;

create or replace function public.send_friend_request(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden'; end if;
  if p_user = auth.uid() then raise exception 'Du kannst dich nicht selbst hinzufügen'; end if;
  if not exists (select 1 from public.profiles where user_id = p_user) then raise exception 'Diese Person gibt es nicht'; end if;
  -- hat die andere Person mich schon angefragt? → direkt befreundet
  update public.friendships set status = 'accepted' where requester = p_user and addressee = auth.uid() and status = 'pending';
  if found then return 'friends'; end if;
  insert into public.friendships (requester, addressee) values (auth.uid(), p_user) on conflict do nothing;
  return public.friend_status(p_user);
end $$;

create or replace function public.respond_friend_request(p_user uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted' where requester = p_user and addressee = auth.uid() and status = 'pending';
  else
    delete from public.friendships where requester = p_user and addressee = auth.uid() and status = 'pending';
  end if;
end $$;

-- Freundschaft beenden bzw. eigene Anfrage zurückziehen
create or replace function public.remove_friend(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friendships
  where (requester = auth.uid() and addressee = p_user) or (requester = p_user and addressee = auth.uid() and status = 'accepted')
$$;

-- Suche nach @Benutzername oder Anzeigename (ohne mich selbst)
create or replace function public.search_profiles(p_query text)
returns table (user_id uuid, username text, display_name text, avatar_url text, status text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.username, p.display_name, p.avatar_url, public.friend_status(p.user_id)
  from public.profiles p
  where auth.uid() is not null and p.user_id <> auth.uid()
    and length(trim(p_query)) >= 2
    and (p.username like lower(trim(leading '@' from trim(p_query))) || '%' or p.display_name ilike '%' || trim(p_query) || '%')
  order by p.username
  limit 20
$$;

-- Meine Freunde & offene Anfragen
create or replace function public.my_friends()
returns table (user_id uuid, username text, display_name text, avatar_url text, status text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.username, p.display_name, p.avatar_url,
    case when f.status = 'accepted' then 'friends' when f.requester = auth.uid() then 'outgoing' else 'incoming' end
  from public.friendships f
  join public.profiles p on p.user_id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.requester = auth.uid() or f.addressee = auth.uid()
  order by f.status desc, p.display_name
$$;

-- Haushalte eines Freundes (um dessen Rezepte zu laden) – nur wenn befreundet
create or replace function public.friend_households(p_user uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.household_members
  where user_id = p_user and public.are_friends(auth.uid(), p_user)
$$;

revoke all on function public.send_friend_request(uuid), public.respond_friend_request(uuid, boolean), public.remove_friend(uuid),
  public.search_profiles(text), public.my_friends(), public.friend_households(uuid) from anon;

-- ---------- 3) Profilbilder ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "profilbild lesen"     on storage.objects;
drop policy if exists "profilbild hochladen" on storage.objects;
drop policy if exists "profilbild ändern"    on storage.objects;
drop policy if exists "profilbild löschen"   on storage.objects;
create policy "profilbild lesen" on storage.objects for select to authenticated using (bucket_id = 'avatars');
create policy "profilbild hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profilbild ändern" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profilbild löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

select 'Profile & Freunde eingerichtet ✓' as ergebnis;
