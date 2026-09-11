-- LILIRVE — Phase 1: Supabase database schema
-- Designer verification (three-track model, kept exactly as the frontend implements it) +
-- onboarding draft data.

create table public.designer_verifications (
  designer_id uuid primary key references public.designer_profiles (id) on delete cascade,
  identity_status identity_status not null default 'not_started',
  identity_failure_reason text,
  portfolio_status portfolio_status not null default 'not_submitted',
  portfolio_review_note text,
  overall_status designer_overall_status not null default 'not_submitted',
  profile_review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.designer_verifications is
  'Three independent tracks (identity / portfolio / overall) — never one boolean. Only APPROVED '
  '(overall_status) designers are eligible for the public request feed (see requests migration).';

-- Convenience read view: a designer's profile with its approval flag joined in, for pages that
-- just need "is this designer publicly eligible" without hand-writing the join every time.
create view public.designer_public_profiles as
  select
    d.*,
    coalesce(v.overall_status = 'approved', false) as is_approved
  from public.designer_profiles d
  left join public.designer_verifications v on v.designer_id = d.id;

comment on view public.designer_public_profiles is
  'designer_profiles + a derived is_approved flag from designer_verifications.overall_status. '
  'Read-only convenience view — never write through it.';

-- CRITICAL: without security_invoker, a view runs with the VIEW OWNER's privileges (effectively
-- postgres/superuser), which BYPASSES RLS on the underlying tables entirely — exactly the kind of
-- accidental "everyone can read everything" hole the brief warns against. security_invoker makes
-- it respect the querying role's own RLS instead.
alter view public.designer_public_profiles set (security_invoker = on);

-- ---------------------------------------------------------------------------
-- Onboarding draft data — the multi-step /designer-onboarding wizard's working area. Once
-- submitted, the studio-identity fields here get copied into the live designer_profiles row
-- (mirrors the frontend's own submitProfileForVerification behavior, which explicitly avoids a
-- second permanent studio object — this table is a one-time draft→publish source, not an
-- ongoing dual-write). date_of_birth is sensitive and is never public — see RLS.
-- ---------------------------------------------------------------------------
create table public.designer_onboarding (
  designer_id uuid primary key references public.designer_profiles (id) on delete cascade,
  phone text,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  roles text[] not null default '{}',
  other_role_description text,
  specialization_categories text[] not null default '{}',
  specialization_crafts text[] not null default '{}',
  experience_level text,
  learning_background text,
  experience_description text,
  portfolio_ownership_accepted boolean not null default false,
  date_of_birth date,
  studio_name text,
  city text,
  area text,
  service_locations text[] not null default '{}',
  address text,
  about_studio text,
  instagram_url text,
  website_url text,
  working_model text,
  updated_at timestamptz not null default now()
);

comment on column public.designer_onboarding.date_of_birth is
  'Private — never shown on the public profile. RLS restricts reads to the owning designer and admin.';

create table public.designer_credentials (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  type text not null,
  institution text,
  qualification text,
  year text,
  created_at timestamptz not null default now()
);

-- Portfolio items each carry exactly one image (frontend PortfolioItem shape) — a plain
-- file_id, not a gallery child table, matching the "single-image fields stay as-is" note in
-- BACKEND_ARCHITECTURE.md §11.
create table public.designer_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  file_id uuid, -- FK added in the files migration
  title text not null,
  category text,
  description text,
  year text,
  created_at timestamptz not null default now()
);

create index designer_verifications_overall_status_idx
  on public.designer_verifications (overall_status);
create index designer_credentials_designer_id_idx on public.designer_credentials (designer_id);
create index designer_portfolio_items_designer_id_idx on public.designer_portfolio_items (designer_id);
