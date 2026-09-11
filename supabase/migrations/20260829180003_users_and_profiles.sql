-- LILIRVE — Phase 1: Supabase database schema
-- Core user model: ONE auth identity, optional Customer profile, optional Designer profile.
--
-- IMPORTANT ADAPTATION FROM BACKEND_ARCHITECTURE.md, NOW THAT SUPABASE IS THE PLATFORM:
-- the architecture doc's `users` table (pre-Supabase) held email + password_hash directly.
-- That's now wrong on Supabase: authentication identity lives in auth.users (managed entirely
-- by Supabase Auth — email, encrypted password, email_confirmed_at, etc.), and this migration
-- must NOT duplicate that. public.users below is a thin 1:1 extension of auth.users holding only
-- app-specific fields auth.users doesn't have (is_admin, display_name) — this is what "keep
-- authentication identity separate from application profile data" means concretely.
--
-- email IS denormalized onto public.users (kept in sync by trigger below) because auth.users is
-- NOT exposed through Supabase's public Data API — the app has no other way to read a user's
-- email without a service-role key. This is a deliberate, intentional sync, not a second
-- authority: auth.users.email remains the only place login actually checks.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.users is
  'Thin 1:1 extension of auth.users. Authentication (email/password/session) is entirely owned by '
  'Supabase Auth (auth.users) — this table only adds application-specific fields. email is a '
  'synced read copy, not authoritative.';
comment on column public.users.is_admin is
  'MVP admin model: a flat boolean, no tiers (super-admin/moderator/etc.) per the finalized '
  'architecture — nothing in the existing frontend distinguishes admin capability levels.';

-- Auto-provision a public.users row whenever someone signs up through Supabase Auth, and keep
-- the denormalized email in sync if it ever changes. SECURITY DEFINER because auth.users triggers
-- run before the new session exists to satisfy RLS as the user themselves.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Customer profile — optional, 0..1 per user.
-- ---------------------------------------------------------------------------
create table public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  name text not null,
  avatar_file_id uuid, -- FK added in the files migration (files table doesn't exist yet)
  city text,
  phone text,
  status account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_profiles is
  'A user''s customer capability. Suspension is scoped here, independently of designer_profiles.status '
  '— suspending someone as a designer must never affect their standing as a customer, and vice versa.';

-- ---------------------------------------------------------------------------
-- Designer profile — optional, 0..1 per user. This IS the Studio (decision 2:
-- one designer = one studio, not a separate table) — Studio Highlights, Meet
-- the Designer, Collections, Dresses and Previous Creations all hang off this
-- row's id via FK (see the studio-content migration).
-- ---------------------------------------------------------------------------
create table public.designer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  studio_name text not null default '',
  type designer_type not null default 'Designer',
  specializations text[] not null default '{}',
  city text,
  country text,
  experience_years int not null default 0 check (experience_years >= 0),
  starting_price numeric(12, 2) check (starting_price is null or starting_price >= 0),
  bio text,
  story text,
  opening_hours text,
  atelier_location text,
  contact_email text,
  instagram_url text,
  website_url text,
  avatar_file_id uuid,   -- FK added in the files migration
  banner_file_id uuid,   -- FK added in the files migration
  -- Derived, never independently writable — see the reviews migration for the
  -- trigger that's the ONLY thing allowed to update these two columns.
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count int not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.designer_profiles is
  'A user''s designer capability AND their Studio — one designer = one studio for the MVP, so '
  'this row is the studio; there is no separate studios table.';
comment on column public.designer_profiles.rating is
  'Derived from reviews — see recompute_designer_rating() trigger. Never set directly by the API.';
comment on column public.designer_profiles.review_count is
  'Derived from reviews — see recompute_designer_rating() trigger. Never set directly by the API.';

-- "Verified/approved" is derived entirely from designer_verifications.overall_status = 'approved'
-- — there is deliberately no verified/available boolean column on designer_profiles to keep in
-- sync (that was the exact kind of duplicate-source-of-truth the architecture explicitly rules
-- out for this field). A convenience view (designer_public_profiles) joining that status in is
-- created in 20260829180004_designer_verification_onboarding.sql, once designer_verifications
-- exists.
