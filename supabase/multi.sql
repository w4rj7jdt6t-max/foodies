-- ================= foodies – Weitere Haushalte anlegen (nur Verwalter) =================
-- Voraussetzung: households.sql. In Supabase: SQL Editor → New query → einfügen → Run.

create or replace function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hh uuid;
begin
  if not public.is_app_admin() then raise exception 'Nur der Verwalter darf Haushalte anlegen'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Bitte gib einen Namen ein'; end if;
  insert into public.households (name, created_by) values (trim(p_name), auth.uid()) returning id into hh;
  insert into public.household_members (household_id, user_id, role, email) values (hh, auth.uid(), 'owner', auth.jwt()->>'email');
  return hh;
end $$;
revoke all on function public.create_household(text) from anon;

select 'Weitere Haushalte möglich ✓' as ergebnis;
