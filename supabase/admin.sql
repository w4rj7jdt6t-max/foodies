-- ================= foodies – Haushalte löschen (nur Verwalter) =================
-- Voraussetzung: households.sql und profiles.sql. In Supabase: SQL Editor → New query → einfügen → Run.

-- Vorschau: was würde beim Löschen alles verschwinden?
create or replace function public.admin_household_preview(p_household uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'Nur der Verwalter darf Haushalte löschen'; end if;
  return jsonb_build_object(
    'recipes', (select count(*) from public.recipes where household_id = p_household),
    'members', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'email', m.email,
        'name', p.display_name,
        -- Konto darf nur mit weg, wenn es in keinem anderen Haushalt ist und kein Verwalter ist
        'deletable', m.user_id <> auth.uid()
          and not exists (select 1 from public.household_members o where o.user_id = m.user_id and o.household_id <> p_household)
          and not exists (select 1 from public.app_admins a where a.user_id = m.user_id),
        'avatars', coalesce((select jsonb_agg(o.name) from storage.objects o
                              where o.bucket_id = 'avatars' and (storage.foldername(o.name))[1] = m.user_id::text), '[]'::jsonb)
      ) order by m.joined_at)
      from public.household_members m left join public.profiles p on p.user_id = m.user_id
      where m.household_id = p_household), '[]'::jsonb),
    -- Rezeptbilder dieses Haushalts (aber keine, die ein anderer Haushalt noch benutzt)
    'images', coalesce((select jsonb_agg(o.name) from storage.objects o
      where o.bucket_id = 'recipe-images'
        and ((storage.foldername(o.name))[1] = p_household::text
             or o.name in (select r.data->>'imagePath' from public.recipes r where r.household_id = p_household))
        and not exists (select 1 from public.recipes r where r.household_id <> p_household and r.data->>'imagePath' = o.name)), '[]'::jsonb)
  );
end $$;

-- Löschen: Haushalt mit Rezepten, Einkaufsliste, Kalender, Einladungen –
-- und auf Wunsch die Konten der Mitglieder, die sonst nirgends dabei sind
create or replace function public.admin_delete_household(p_household uuid, p_delete_accounts boolean) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; u uuid;
begin
  if not public.is_app_admin() then raise exception 'Nur der Verwalter darf Haushalte löschen'; end if;
  if not exists (select 1 from public.households where id = p_household) then raise exception 'Diesen Haushalt gibt es nicht mehr'; end if;
  if p_delete_accounts then
    for u in select m.user_id from public.household_members m
             where m.household_id = p_household and m.user_id <> auth.uid()
               and not exists (select 1 from public.household_members o where o.user_id = m.user_id and o.household_id <> p_household)
               and not exists (select 1 from public.app_admins a where a.user_id = m.user_id)
    loop
      delete from auth.users where id = u;  -- Profil, Freundschaften, Mitgliedschaft gehen automatisch mit
      n := n + 1;
    end loop;
  end if;
  delete from public.households where id = p_household;  -- Rezepte, Liste, Kalender, Einladungen gehen automatisch mit
  return n;
end $$;
revoke all on function public.admin_household_preview(uuid), public.admin_delete_household(uuid, boolean) from anon;

-- Der Verwalter darf die zugehörigen Bilder und Profilbilder entfernen
drop policy if exists "verwalter bilder löschen" on storage.objects;
create policy "verwalter bilder löschen" on storage.objects for delete to authenticated
  using (bucket_id in ('recipe-images', 'avatars') and public.is_app_admin());

select 'Haushalte löschen möglich ✓' as ergebnis;
