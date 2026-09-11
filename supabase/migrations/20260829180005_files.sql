-- LILIRVE — Phase 1: Supabase database schema
-- Files metadata table — the single source of truth for every uploaded file's storage location
-- and metadata. Actual bytes live in Supabase Storage (see the storage migration); this table
-- never holds binary data, only references. Every *_images child table and every single-image
-- *_file_id column points into this one table, so file metadata (size, mime type, ownership,
-- privacy) has exactly one home regardless of how many entities reference the same upload.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  entity_type text not null,
  -- e.g. 'customer_avatar' | 'designer_avatar' | 'studio_banner' | 'studio_highlight' |
  --      'meet_the_designer' | 'collection_cover' | 'dress_image' | 'previous_creation' |
  --      'portfolio_item' | 'verification_document' | 'request_image' | 'diary_image' |
  --      'project_update_image' | 'message_image'
  bucket_id text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

comment on table public.files is
  'Metadata/reference table for Supabase Storage objects. is_private=true for verification/KYC '
  'documents (and any other file that must never be publicly readable) — served only via a '
  'signed URL to an authorized viewer, never bucket-public.';

create index files_owner_id_idx on public.files (owner_id);
create index files_entity_type_idx on public.files (entity_type);

-- Now that files exists, wire up the FKs that earlier migrations deferred (Postgres has no
-- forward-references within a single ALTER — these columns were created nullable, unlinked).
alter table public.customer_profiles
  add constraint customer_profiles_avatar_file_id_fkey
  foreign key (avatar_file_id) references public.files (id) on delete set null;

alter table public.designer_profiles
  add constraint designer_profiles_avatar_file_id_fkey
  foreign key (avatar_file_id) references public.files (id) on delete set null,
  add constraint designer_profiles_banner_file_id_fkey
  foreign key (banner_file_id) references public.files (id) on delete set null;

alter table public.designer_portfolio_items
  add constraint designer_portfolio_items_file_id_fkey
  foreign key (file_id) references public.files (id) on delete set null;
