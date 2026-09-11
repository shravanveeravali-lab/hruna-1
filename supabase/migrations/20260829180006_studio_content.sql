-- LILIRVE — Phase 1: Supabase database schema
-- Studio content: Highlights, Meet the Designer, Collections, Dresses, Previous Creations.
-- All owned by designer_profiles.id (the Studio) — only the owning designer may write to any of
-- these (see RLS migration); customers get read-only access.

create table public.studio_highlights (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  caption text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (designer_id, position)
);
comment on table public.studio_highlights is 'Max 3 per designer — enforced at the application layer, not the DB, matching the existing frontend UI limit.';

create table public.meet_the_designer_entries (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  description text,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (designer_id, position)
);
comment on table public.meet_the_designer_entries is 'Max 2 per designer — application-layer limit, same as studio_highlights.';

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  name text not null,
  category text,
  cover_image_file_id uuid references public.files (id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dresses (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  available boolean not null default true,
  fabric text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.dresses is
  'collection_id ON DELETE CASCADE matches the existing frontend''s deleteCollection behavior '
  '(which already deletes its dresses). Flagged in the architecture doc as a real production '
  'data-loss risk worth reconsidering later (RESTRICT + require moving dresses first) — kept as '
  'CASCADE for now to stay consistent with current frontend behavior, not silently changed.';

create table public.dress_images (
  id uuid primary key default gen_random_uuid(),
  dress_id uuid not null references public.dresses (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (dress_id, position)
);

create table public.previous_creations (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  description text,
  year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.previous_creations is
  'Today''s frontend only ever shows one image per previous creation; previous_creation_images '
  'is still a proper child table (not a bare image_url column) so "add more than one photo" is a '
  'UI change later, not a schema migration — per BACKEND_ARCHITECTURE.md §6.2.';

create table public.previous_creation_images (
  id uuid primary key default gen_random_uuid(),
  previous_creation_id uuid not null references public.previous_creations (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (previous_creation_id, position)
);

create index studio_highlights_designer_id_idx on public.studio_highlights (designer_id);
create index meet_the_designer_entries_designer_id_idx on public.meet_the_designer_entries (designer_id);
create index collections_designer_id_idx on public.collections (designer_id);
create index dresses_designer_id_idx on public.dresses (designer_id);
create index dresses_collection_id_idx on public.dresses (collection_id);
create index dress_images_dress_id_idx on public.dress_images (dress_id);
create index previous_creations_designer_id_idx on public.previous_creations (designer_id);
create index previous_creation_images_previous_creation_id_idx
  on public.previous_creation_images (previous_creation_id);
