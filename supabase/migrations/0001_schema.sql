-- smartcooked · Schema (M0) · Postgres/Supabase
create extension if not exists citext;
create extension if not exists pg_trgm;
create extension if not exists unaccent;

create type user_role         as enum ('admin','editor','user');
create type recipe_visibility as enum ('public','members','private');
create type difficulty        as enum ('simpel','normal','pfiffig');
create type share_resource    as enum ('cookbook','collection','planner','shopping_list');
create type share_role        as enum ('viewer','editor');

-- ---------- Profile ----------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     citext unique not null check (username ~ '^[a-z0-9][a-z0-9_.-]{2,29}$'),
  display_name text,
  role         user_role not null default 'user',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- Rezepte ----------
create table recipes (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  owner_id      uuid references profiles(id) on delete set null,
  visibility    recipe_visibility not null default 'private',
  forked_from   uuid references recipes(id) on delete set null,
  schema_version int not null default 1,
  title         text not null check (length(title) between 3 and 120),
  subtitle      text,
  description   text,
  servings      int  not null check (servings between 1 and 50),
  ingredients   jsonb not null default '[]',
  steps         jsonb not null default '[]',
  prep_min      int not null default 0 check (prep_min >= 0),
  cook_min      int not null default 0 check (cook_min >= 0),
  rest_min      int not null default 0 check (rest_min >= 0),
  difficulty    difficulty not null default 'normal',
  calories_per_serving int,
  nutrition     jsonb,
  tip           text,
  image_path    text,
  image_source  text,
  source_type   text check (source_type in ('text','photo','pdf','screenshot','idea','url')),
  source_note   text,
  source_url    text,
  author        text,
  estimated     text[] not null default '{}',
  diet          text[] not null default '{}',
  categories    text[] not null default '{}',
  cuisine       text,
  keywords      text[] not null default '{}',
  tags          text[] not null default '{}',
  meal          text[] not null default '{}',
  daytime       text[] not null default '{}',
  dish_type     text[] not null default '{}',
  properties    text[] not null default '{}',
  method        text[] not null default '{}',
  occasion      text[] not null default '{}',
  ingredient_names text[] not null default '{}',
  nutrition_per_serving jsonb,
  nutrition_source text,
  search        tsvector,
  rating_avg    numeric(3,2),
  rating_count  int not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);
create index recipes_owner_idx      on recipes(owner_id);
create index recipes_visibility_idx on recipes(visibility);
create index recipes_search_idx     on recipes using gin(search);
create index recipes_ingr_idx       on recipes using gin(ingredient_names);
create index recipes_meal_idx       on recipes using gin(meal);
create index recipes_dish_idx       on recipes using gin(dish_type);
create index recipes_diet_idx       on recipes using gin(diet);
create index recipes_title_trgm     on recipes using gin(title gin_trgm_ops);

create table slug_redirects (
  old_slug  text primary key,
  recipe_id uuid not null references recipes(id) on delete cascade
);

create table recipe_history (
  id         bigserial primary key,
  recipe_id  uuid not null references recipes(id) on delete cascade,
  snapshot   jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index recipe_history_recipe_idx on recipe_history(recipe_id, changed_at desc);

-- ---------- Bewertungen, Notizen ----------
create table ratings (
  recipe_id uuid references recipes(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  stars     smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);
create table recipe_notes (
  recipe_id uuid references recipes(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  body      text not null,
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

-- ---------- Kochbuch, Sammlungen ----------
create table cookbooks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index cookbooks_one_default on cookbooks(owner_id) where is_default;

create table cookbook_recipes (
  cookbook_id uuid references cookbooks(id) on delete cascade,
  recipe_id   uuid references recipes(id) on delete cascade,
  added_by    uuid references profiles(id) on delete set null,
  added_at    timestamptz not null default now(),
  primary key (cookbook_id, recipe_id)
);

create table collections (
  id          uuid primary key default gen_random_uuid(),
  cookbook_id uuid not null references cookbooks(id) on delete cascade,
  name        text not null,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, cookbook_id)
);

create table collection_recipes (
  collection_id uuid not null,
  cookbook_id   uuid not null,
  recipe_id     uuid not null,
  added_by      uuid references profiles(id) on delete set null,
  added_at      timestamptz not null default now(),
  position      int not null default 0,
  primary key (collection_id, recipe_id),
  foreign key (collection_id, cookbook_id) references collections(id, cookbook_id) on delete cascade,
  foreign key (cookbook_id, recipe_id)     references cookbook_recipes(cookbook_id, recipe_id) on delete cascade
);

-- ---------- Freigaben ----------
create table shares (
  resource_type share_resource not null,
  resource_id   uuid not null,
  user_id       uuid not null references profiles(id) on delete cascade,
  role          share_role not null default 'editor',
  invited_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (resource_type, resource_id, user_id)
);
create index shares_user_idx on shares(user_id);

-- ---------- Wochenplaner ----------
create table planners (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table planner_entries (
  id             uuid primary key default gen_random_uuid(),
  planner_id     uuid not null references planners(id) on delete cascade,
  day            date not null,
  position       int  not null default 0,
  recipe_id      uuid references recipes(id) on delete set null,
  title_snapshot text,
  servings       int check (servings between 1 and 50),
  note           text,
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (recipe_id is not null or note is not null or title_snapshot is not null)
);
create index planner_entries_day_idx on planner_entries(planner_id, day, position);

-- ---------- Einkauf ----------
create table shopping_categories (
  id   text primary key,
  name text not null,
  sort int  not null,
  icon text
);
create table ingredient_keywords (
  keyword        text primary key,
  category_id    text not null references shopping_categories(id),
  canonical_name text,
  is_staple      boolean not null default false
);
create table pantry_items (
  user_id   uuid references profiles(id) on delete cascade,
  name_norm text not null,
  primary key (user_id, name_norm)
);
create table shopping_lists (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references profiles(id) on delete cascade,
  name       text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index shopping_lists_one_default on shopping_lists(owner_id) where is_default;
create table shopping_items (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references shopping_lists(id) on delete cascade,
  name        text not null,
  name_norm   text not null,
  qty         numeric(10,2),
  unit        text,
  category_id text references shopping_categories(id) default 'sonstiges',
  checked     boolean not null default false,
  checked_at  timestamptz,
  checked_by  uuid references profiles(id) on delete set null,
  sources     jsonb not null default '[]',
  added_by    uuid references profiles(id) on delete set null,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index shopping_items_list_idx on shopping_items(list_id, checked, category_id, position);
create unique index shopping_items_merge_idx on shopping_items(list_id, name_norm, coalesce(unit,'')) where not checked;

-- ---------- Einladungen, Exportseiten ----------
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null,
  username    citext not null,
  role        user_role not null default 'user',
  invited_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  user_id     uuid references profiles(id) on delete set null
);
create table export_pages (
  token      text primary key,
  created_by uuid references profiles(id) on delete cascade,
  title      text not null,
  servings   int not null default 1,
  items      jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
