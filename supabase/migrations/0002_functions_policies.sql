-- smartcooked · Funktionen, Trigger, RLS (M0)

-- ---------- Allgemeine Trigger ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['profiles','recipes','cookbooks','collections','planners','planner_entries','shopping_lists','shopping_items','ratings','recipe_notes'] loop
    execute format('create trigger %I_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop; end $$;

-- ---------- Rollen-Helfer ----------
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active) $$;
create or replace function is_editor() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role in ('admin','editor') and active) $$;

-- ---------- Neuer Auth-Nutzer -> Profil, Kochbuch, Einkaufsliste ----------
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare uname text; urole user_role;
begin
  uname := lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  uname := regexp_replace(uname, '[^a-z0-9_.-]', '', 'g');
  if length(uname) < 3 then uname := 'user' || substr(replace(new.id::text,'-',''),1,6); end if;
  if exists (select 1 from profiles where username = uname) then uname := uname || substr(replace(new.id::text,'-',''),1,4); end if;
  urole := coalesce((new.raw_user_meta_data->>'role')::user_role, 'user');
  insert into profiles (id, username, display_name, role) values (new.id, uname, new.raw_user_meta_data->>'display_name', urole);
  insert into cookbooks (owner_id, name, is_default) values (new.id, 'Mein Kochbuch', true);
  insert into shopping_lists (owner_id, name, is_default) values (new.id, 'Einkaufsliste', true);
  update invitations set accepted_at = now(), user_id = new.id where lower(email::text) = lower(new.email) and accepted_at is null;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Rolle darf nur Admin ändern
create or replace function profiles_protect_role() returns trigger language plpgsql as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active) and not is_admin() then
    raise exception 'Nur Admins dürfen Rolle oder Status ändern';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on profiles for each row execute function profiles_protect_role();

-- ---------- Rezepte: abgeleitete Felder ----------
create or replace function recipes_derive() returns trigger language plpgsql as $$
declare ing jsonb; tot_kcal numeric := 0; tot_p numeric := 0; tot_f numeric := 0; tot_c numeric := 0;
        complete boolean := true; has_rows boolean := false; g numeric; p jsonb; est text[];
begin
  new.ingredient_names := coalesce((select array_agg(x->>'name') from jsonb_array_elements(new.ingredients) x where x->>'name' is not null), '{}');
  for ing in select * from jsonb_array_elements(new.ingredients) loop
    g := (ing->>'grams')::numeric; p := ing->'per100';
    if g is null or p is null or p->>'kcal' is null then
      if ing->>'amount' is not null then complete := false; end if;
      continue;
    end if;
    has_rows := true;
    tot_kcal := tot_kcal + coalesce((p->>'kcal')::numeric,0) * g / 100;
    tot_p := tot_p + coalesce((p->>'protein_g')::numeric,0) * g / 100;
    tot_f := tot_f + coalesce((p->>'fat_g')::numeric,0) * g / 100;
    tot_c := tot_c + coalesce((p->>'carbs_g')::numeric,0) * g / 100;
  end loop;
  est := new.estimated;
  if has_rows and complete then
    new.nutrition_per_serving := jsonb_build_object('kcal', round(tot_kcal / new.servings), 'protein_g', round(tot_p / new.servings), 'fat_g', round(tot_f / new.servings), 'carbs_g', round(tot_c / new.servings));
    new.nutrition_source := 'berechnet';
  elsif new.calories_per_serving is not null then
    new.nutrition_per_serving := jsonb_build_object('kcal', new.calories_per_serving, 'protein_g', (new.nutrition->>'protein_g')::numeric, 'fat_g', (new.nutrition->>'fat_g')::numeric, 'carbs_g', (new.nutrition->>'carbs_g')::numeric);
    new.nutrition_source := case when 'calories' = any(est) or 'all' = any(est) or 'nutrition' = any(est) then 'geschaetzt' else 'angabe' end;
  else
    new.nutrition_per_serving := null; new.nutrition_source := null;
  end if;
  new.search := setweight(to_tsvector('german', coalesce(new.title,'')), 'A')
             || setweight(to_tsvector('german', coalesce(new.subtitle,'') || ' ' || coalesce(new.description,'')), 'B')
             || setweight(to_tsvector('simple', array_to_string(new.ingredient_names, ' ')), 'B')
             || setweight(to_tsvector('simple', array_to_string(new.tags || new.keywords || new.categories || new.meal || new.dish_type || new.method || new.occasion || new.properties || array[coalesce(new.cuisine,'')], ' ')), 'C');
  if new.visibility = 'public' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger recipes_derive before insert or update on recipes for each row execute function recipes_derive();

create or replace function recipes_history() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into recipe_history (recipe_id, snapshot, changed_by) values (old.id, to_jsonb(old) - 'search', auth.uid());
  return new;
end $$;
create trigger recipes_history after update on recipes for each row when (old.* is distinct from new.*) execute function recipes_history();

-- ---------- Bewertungsdurchschnitt ----------
create or replace function ratings_refresh() returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid := coalesce(new.recipe_id, old.recipe_id);
begin
  update recipes set rating_avg = s.avg, rating_count = s.cnt
  from (select round(avg(stars),2) avg, count(*) cnt from ratings where recipe_id = rid) s
  where id = rid;
  return null;
end $$;
create trigger ratings_after after insert or update or delete on ratings for each row execute function ratings_refresh();

-- ---------- Sammlung: automatisch herzen ----------
create or replace function collection_recipes_ensure_heart() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select cookbook_id into new.cookbook_id from collections where id = new.collection_id;
  insert into cookbook_recipes (cookbook_id, recipe_id, added_by) values (new.cookbook_id, new.recipe_id, auth.uid()) on conflict do nothing;
  return new;
end $$;
create trigger collection_recipes_before before insert on collection_recipes for each row execute function collection_recipes_ensure_heart();

-- ---------- Freigaben aufräumen ----------
create or replace function shares_cleanup() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from shares where resource_type = tg_argv[0]::share_resource and resource_id = old.id; return old; end $$;
create trigger cookbooks_shares_cleanup      after delete on cookbooks      for each row execute function shares_cleanup('cookbook');
create trigger collections_shares_cleanup    after delete on collections    for each row execute function shares_cleanup('collection');
create trigger planners_shares_cleanup       after delete on planners       for each row execute function shares_cleanup('planner');
create trigger shopping_lists_shares_cleanup after delete on shopping_lists for each row execute function shares_cleanup('shopping_list');

-- ---------- Zugriffs-Helfer ----------
create or replace function access_role(rtype share_resource, rid uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); owner uuid; parent uuid; r share_role; pr share_role;
begin
  if uid is null then return null; end if;
  case rtype
    when 'cookbook'      then select owner_id into owner from cookbooks where id = rid;
    when 'collection'    then select c.owner_id, c.id into owner, parent from collections co join cookbooks c on c.id = co.cookbook_id where co.id = rid;
    when 'planner'       then select owner_id into owner from planners where id = rid;
    when 'shopping_list' then select owner_id into owner from shopping_lists where id = rid;
  end case;
  if owner is null then return null; end if;
  if owner = uid then return 'owner'; end if;
  select role into r from shares where resource_type = rtype and resource_id = rid and user_id = uid;
  if parent is not null then
    select role into pr from shares where resource_type = 'cookbook' and resource_id = parent and user_id = uid;
    if pr = 'editor' or r = 'editor' then return 'editor'; end if;
    if pr is not null or r is not null then return 'viewer'; end if;
    return null;
  end if;
  return r::text;
end $$;

create or replace function has_access(rtype share_resource, rid uuid, min_role text) returns boolean
language sql stable as $$
  select case min_role
    when 'viewer' then access_role(rtype, rid) is not null
    when 'editor' then access_role(rtype, rid) in ('owner','editor')
    when 'owner'  then access_role(rtype, rid) = 'owner' end $$;

create or replace function recipe_shared_with_me(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
      exists (select 1 from cookbook_recipes cr join shares s on s.resource_type='cookbook' and s.resource_id=cr.cookbook_id where cr.recipe_id = rid and s.user_id = auth.uid())
   or exists (select 1 from collection_recipes cr join shares s on s.resource_type='collection' and s.resource_id=cr.collection_id where cr.recipe_id = rid and s.user_id = auth.uid())
   or exists (select 1 from planner_entries pe join shares s on s.resource_type='planner' and s.resource_id=pe.planner_id where pe.recipe_id = rid and s.user_id = auth.uid())) $$;

create or replace function can_edit_recipe(r recipes) returns boolean language sql stable as $$
  select r.owner_id = auth.uid() or is_admin() or (is_editor() and r.visibility <> 'private') $$;

-- Benutzername -> E-Mail (nur service_role)
create or replace function email_for_username(u text) returns text language sql stable security definer set search_path = public as
$$ select au.email::text from profiles p join auth.users au on au.id = p.id where p.username = u and p.active $$;
revoke execute on function email_for_username(text) from anon, authenticated, public;

-- Nutzersuche für Freigaben
create or replace function find_users(q text) returns table (id uuid, username citext, display_name text)
language sql stable security definer set search_path = public as $$
  select id, username, display_name from profiles
  where active and auth.uid() is not null and (username ilike '%' || q || '%' or display_name ilike '%' || q || '%') and id <> auth.uid()
  limit 10 $$;

-- Einkaufsliste: Zeilen hinzufügen/mergen
create or replace function add_shopping_items(p_list_id uuid, p_items jsonb) returns setof shopping_items
language plpgsql security definer set search_path = public as $$
declare it jsonb; pos int;
begin
  if not has_access('shopping_list', p_list_id, 'editor') then raise exception 'Keine Berechtigung'; end if;
  select coalesce(max(position),0) into pos from shopping_items where list_id = p_list_id;
  for it in select * from jsonb_array_elements(p_items) loop
    pos := pos + 1;
    insert into shopping_items (list_id, name, name_norm, qty, unit, category_id, sources, added_by, position)
    values (p_list_id, it->>'name', lower(unaccent(trim(it->>'name'))), (it->>'qty')::numeric, nullif(it->>'unit',''),
            coalesce(nullif(it->>'category_id',''), 'sonstiges'), coalesce(it->'sources','[]'::jsonb), auth.uid(), pos)
    on conflict (list_id, name_norm, coalesce(unit,'')) where not checked
    do update set qty = case when shopping_items.qty is null and excluded.qty is null then null else coalesce(shopping_items.qty,0) + coalesce(excluded.qty,0) end,
                  sources = shopping_items.sources || excluded.sources, updated_at = now();
  end loop;
  return query select * from shopping_items where list_id = p_list_id order by checked, position;
end $$;

-- Volltextsuche
create or replace function search_recipes(q text) returns setof recipes language sql stable as $$
  select * from recipes where (q is null or q = '' or search @@ websearch_to_tsquery('german', q) or title ilike '%' || q || '%') and archived_at is null
  order by ts_rank(search, websearch_to_tsquery('german', coalesce(q,''))) desc, updated_at desc $$;

-- ---------- Vorschau-View ----------
create view recipe_previews with (security_invoker = false) as
  select id, slug, title, subtitle, description, image_path, visibility, difficulty, prep_min, prep_min + cook_min + rest_min as total_min,
         (nutrition_per_serving->>'kcal')::int as kcal, meal, daytime, dish_type, diet, properties, method, occasion, cuisine, tags, categories,
         rating_avg, rating_count, updated_at, published_at
  from recipes where visibility in ('public','members') and archived_at is null;
grant select on recipe_previews to anon, authenticated;

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table recipes enable row level security;
alter table slug_redirects enable row level security;
alter table recipe_history enable row level security;
alter table ratings enable row level security;
alter table recipe_notes enable row level security;
alter table cookbooks enable row level security;
alter table cookbook_recipes enable row level security;
alter table collections enable row level security;
alter table collection_recipes enable row level security;
alter table shares enable row level security;
alter table planners enable row level security;
alter table planner_entries enable row level security;
alter table shopping_categories enable row level security;
alter table ingredient_keywords enable row level security;
alter table pantry_items enable row level security;
alter table shopping_lists enable row level security;
alter table shopping_items enable row level security;
alter table invitations enable row level security;
alter table export_pages enable row level security;

-- profiles
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- recipes
create policy recipes_select on recipes for select using (
  archived_at is null and (
    visibility = 'public'
    or (auth.uid() is not null and visibility = 'members')
    or owner_id = auth.uid()
    or is_admin()
    or recipe_shared_with_me(id))
  or (archived_at is not null and (is_admin() or owner_id = auth.uid()))
);
create policy recipes_insert on recipes for insert to authenticated with check (owner_id = auth.uid() and (visibility = 'private' or is_editor()));
create policy recipes_update on recipes for update to authenticated using (can_edit_recipe(recipes)) with check (can_edit_recipe(recipes) and (visibility = 'private' or is_editor()));
create policy recipes_delete on recipes for delete to authenticated using (owner_id = auth.uid() or is_admin() or (is_editor() and visibility <> 'private'));
create policy slug_redirects_select on slug_redirects for select using (true);
create policy slug_redirects_write on slug_redirects for all to authenticated using (is_editor()) with check (is_editor());
create policy recipe_history_select on recipe_history for select to authenticated using (is_editor());

-- ratings / notes
create policy ratings_own on ratings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notes_own on recipe_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- cookbooks
create policy cookbooks_select on cookbooks for select to authenticated using (has_access('cookbook', id, 'viewer'));
create policy cookbooks_insert on cookbooks for insert to authenticated with check (owner_id = auth.uid());
create policy cookbooks_update on cookbooks for update to authenticated using (owner_id = auth.uid());
create policy cookbooks_delete on cookbooks for delete to authenticated using (owner_id = auth.uid() and not is_default);
create policy cookbook_recipes_select on cookbook_recipes for select to authenticated using (has_access('cookbook', cookbook_id, 'viewer'));
create policy cookbook_recipes_insert on cookbook_recipes for insert to authenticated with check (has_access('cookbook', cookbook_id, 'editor'));
create policy cookbook_recipes_delete on cookbook_recipes for delete to authenticated using (has_access('cookbook', cookbook_id, 'editor'));

-- collections
create policy collections_select on collections for select to authenticated using (has_access('collection', id, 'viewer'));
create policy collections_insert on collections for insert to authenticated with check (has_access('cookbook', cookbook_id, 'editor'));
create policy collections_update on collections for update to authenticated using (has_access('cookbook', cookbook_id, 'editor'));
create policy collections_delete on collections for delete to authenticated using (has_access('cookbook', cookbook_id, 'editor'));
create policy collection_recipes_select on collection_recipes for select to authenticated using (has_access('collection', collection_id, 'viewer'));
create policy collection_recipes_insert on collection_recipes for insert to authenticated with check (has_access('collection', collection_id, 'editor'));
create policy collection_recipes_update on collection_recipes for update to authenticated using (has_access('collection', collection_id, 'editor'));
create policy collection_recipes_delete on collection_recipes for delete to authenticated using (has_access('collection', collection_id, 'editor'));

-- shares
create policy shares_select on shares for select to authenticated using (user_id = auth.uid() or has_access(resource_type, resource_id, 'owner'));
create policy shares_insert on shares for insert to authenticated with check (has_access(resource_type, resource_id, 'owner') and user_id <> auth.uid());
create policy shares_update on shares for update to authenticated using (has_access(resource_type, resource_id, 'owner'));
create policy shares_delete on shares for delete to authenticated using (user_id = auth.uid() or has_access(resource_type, resource_id, 'owner'));

-- planners
create policy planners_select on planners for select to authenticated using (has_access('planner', id, 'viewer'));
create policy planners_insert on planners for insert to authenticated with check (owner_id = auth.uid());
create policy planners_update on planners for update to authenticated using (owner_id = auth.uid());
create policy planners_delete on planners for delete to authenticated using (owner_id = auth.uid());
create policy planner_entries_select on planner_entries for select to authenticated using (has_access('planner', planner_id, 'viewer'));
create policy planner_entries_insert on planner_entries for insert to authenticated with check (has_access('planner', planner_id, 'editor'));
create policy planner_entries_update on planner_entries for update to authenticated using (has_access('planner', planner_id, 'editor'));
create policy planner_entries_delete on planner_entries for delete to authenticated using (has_access('planner', planner_id, 'editor'));

-- shopping
create policy shopping_categories_select on shopping_categories for select using (true);
create policy shopping_categories_write on shopping_categories for all to authenticated using (is_editor()) with check (is_editor());
create policy ingredient_keywords_select on ingredient_keywords for select using (true);
create policy ingredient_keywords_write on ingredient_keywords for all to authenticated using (is_editor()) with check (is_editor());
create policy pantry_own on pantry_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy shopping_lists_select on shopping_lists for select to authenticated using (has_access('shopping_list', id, 'viewer'));
create policy shopping_lists_insert on shopping_lists for insert to authenticated with check (owner_id = auth.uid());
create policy shopping_lists_update on shopping_lists for update to authenticated using (owner_id = auth.uid());
create policy shopping_lists_delete on shopping_lists for delete to authenticated using (owner_id = auth.uid() and not is_default);
create policy shopping_items_select on shopping_items for select to authenticated using (has_access('shopping_list', list_id, 'viewer'));
create policy shopping_items_insert on shopping_items for insert to authenticated with check (has_access('shopping_list', list_id, 'editor'));
create policy shopping_items_update on shopping_items for update to authenticated using (has_access('shopping_list', list_id, 'editor'));
create policy shopping_items_delete on shopping_items for delete to authenticated using (has_access('shopping_list', list_id, 'editor'));

-- invitations (nur Admin; Service-Rolle umgeht RLS)
create policy invitations_admin on invitations for all to authenticated using (is_admin()) with check (is_admin());

-- export_pages: eigene Zeilen; öffentliche Seite liest per Service-Rolle
create policy export_pages_own on export_pages for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ---------- Realtime ----------
alter publication supabase_realtime add table shopping_items, shopping_lists, planner_entries, planners;
alter table shopping_items  replica identity full;
alter table planner_entries replica identity full;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true) on conflict (id) do nothing;
create policy img_read on storage.objects for select using (bucket_id = 'recipe-images');
create policy img_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'recipe-images' and exists (select 1 from recipes r where r.id::text = (storage.foldername(name))[1] and can_edit_recipe(r)));
create policy img_update on storage.objects for update to authenticated using (
  bucket_id = 'recipe-images' and exists (select 1 from recipes r where r.id::text = (storage.foldername(name))[1] and can_edit_recipe(r)));
create policy img_delete on storage.objects for delete to authenticated using (
  bucket_id = 'recipe-images' and exists (select 1 from recipes r where r.id::text = (storage.foldername(name))[1] and can_edit_recipe(r)));
