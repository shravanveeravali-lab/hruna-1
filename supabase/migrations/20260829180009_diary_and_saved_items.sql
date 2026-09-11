-- LILIRVE — Phase 1: Supabase database schema
-- Fashion Diary (private, customer-owned) + Saved Items. No Moodboard table — that feature was
-- removed from LILIRVE; Fashion Diary is the only private-inspiration entity.

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  title text not null,
  note text,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diary_entries is
  'Strictly private — belongs to exactly one customer, never joined into any public/designer/'
  'admin-facing query. RLS (next migration) enforces this at the database level, not just by '
  'convention.';

create table public.diary_entry_images (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.diary_entries (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (entry_id, position)
);

-- ---------------------------------------------------------------------------
-- Saved items — a customer can save a designer, a dress, a collection, or a project. Exactly
-- one of the four target columns is set, matching item_type; enforced by a CHECK constraint plus
-- a partial unique index PER item_type (a single composite UNIQUE would NOT actually block
-- duplicates here, since the other three target columns are NULL in every row and SQL never
-- treats NULL = NULL as a match for uniqueness purposes).
-- ---------------------------------------------------------------------------
create table public.customer_saved_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  item_type saved_item_type not null,
  designer_id uuid references public.designer_profiles (id) on delete cascade,
  dress_id uuid references public.dresses (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_saved_items_target_matches_type check (
    (item_type = 'designer' and designer_id is not null and dress_id is null and collection_id is null and project_id is null) or
    (item_type = 'dress' and dress_id is not null and designer_id is null and collection_id is null and project_id is null) or
    (item_type = 'collection' and collection_id is not null and designer_id is null and dress_id is null and project_id is null) or
    (item_type = 'project' and project_id is not null and designer_id is null and dress_id is null and collection_id is null)
  )
);

create unique index customer_saved_items_designer_uq
  on public.customer_saved_items (customer_id, designer_id) where item_type = 'designer';
create unique index customer_saved_items_dress_uq
  on public.customer_saved_items (customer_id, dress_id) where item_type = 'dress';
create unique index customer_saved_items_collection_uq
  on public.customer_saved_items (customer_id, collection_id) where item_type = 'collection';
create unique index customer_saved_items_project_uq
  on public.customer_saved_items (customer_id, project_id) where item_type = 'project';

create index diary_entries_customer_id_idx on public.diary_entries (customer_id);
create index diary_entry_images_entry_id_idx on public.diary_entry_images (entry_id);
create index customer_saved_items_customer_id_idx on public.customer_saved_items (customer_id);
