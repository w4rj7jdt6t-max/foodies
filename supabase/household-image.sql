-- ================= foodies – Haushaltsbild (z. B. Paarbild) =================
-- Voraussetzung: households.sql. In Supabase: SQL Editor → New query → einfügen → Run.

alter table public.households add column if not exists image_url  text;
alter table public.households add column if not exists image_path text;

-- Nur Eigentümer eines Haushalts dürfen das Bild setzen oder entfernen (p_url = null → entfernen)
create or replace function public.set_household_image(p_household uuid, p_url text, p_path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.my_role(p_household), '') <> 'owner' then raise exception 'Nur Eigentümer dürfen das Haushaltsbild ändern'; end if;
  if p_path is not null and (storage.foldername(p_path))[1] <> p_household::text then raise exception 'Ungültiger Bildpfad'; end if;
  update public.households set image_url = p_url, image_path = p_path where id = p_household;
end $$;
revoke all on function public.set_household_image(uuid, text, text) from anon;

select 'Haushaltsbild möglich ✓' as ergebnis;
