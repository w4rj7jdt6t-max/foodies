-- ================= foodies – Bilder nachträglich zuschneiden =================
-- Speichert zu Profil- und Haushaltsbild das Original und den gewählten Ausschnitt,
-- damit man später wieder verschieben/zoomen kann.
-- Voraussetzung: profiles.sql und household-image.sql. In Supabase: SQL Editor → New query → einfügen → Run.

alter table public.profiles   add column if not exists avatar_src jsonb;
alter table public.households add column if not exists image_src  jsonb;

drop function if exists public.set_household_image(uuid, text, text);
create or replace function public.set_household_image(p_household uuid, p_url text, p_path text, p_src jsonb default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_household), '') <> 'owner' then raise exception 'Nur Eigentümer dürfen das Haushaltsbild ändern'; end if;
  if p_path is not null and (storage.foldername(p_path))[1] <> p_household::text then raise exception 'Ungültiger Bildpfad'; end if;
  if p_src ? 'path' and (storage.foldername(p_src->>'path'))[1] <> p_household::text then raise exception 'Ungültiger Bildpfad'; end if;
  update public.households set image_url = p_url, image_path = p_path, image_src = p_src where id = p_household;
end $$;
revoke all on function public.set_household_image(uuid, text, text, jsonb) from anon;

select 'Bilder nachträglich zuschneiden möglich ✓' as ergebnis;
