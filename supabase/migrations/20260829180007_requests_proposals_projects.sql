-- LILIRVE — Phase 1: Supabase database schema
-- Requests → Proposals → Projects. The canonical chain:
--   ONE fashion_requests row → MANY proposals → exactly ONE accepted → exactly ONE project,
--   referencing request_id + proposal_id, never copying either. See BACKEND_ARCHITECTURE.md §6.3
--   and §18 for the full "no duplicate source of truth" reasoning.
--
-- NOTE ON SCOPE: this migration adds the data-integrity GUARANTEES (constraints, a partial unique
-- index, a validation trigger) that make the eventual accept/decline/cancel workflow safe to
-- build on top of. It deliberately does NOT implement that workflow itself (an "accept this
-- proposal, decline the rest, create the project" stored procedure/RPC) — that's request/proposal
-- BUSINESS LOGIC, explicitly out of scope for this database-only phase and left for the backend
-- foundation phase.

-- ---------------------------------------------------------------------------
-- fashion_requests — the one canonical request record.
-- ---------------------------------------------------------------------------
create table public.fashion_requests (
  id uuid primary key default gen_random_uuid(),
  -- No ON DELETE CASCADE here, deliberately: a customer_profiles row with real request history
  -- must not be hard-deletable (matches BACKEND_ARCHITECTURE.md §6.12 — RESTRICT, soft-delete
  -- via suspension instead). Plain REFERENCES defaults to Postgres's NO ACTION, which blocks the
  -- delete exactly like RESTRICT would for our purposes.
  customer_id uuid not null references public.customer_profiles (id),
  preferred_designer_id uuid references public.designer_profiles (id),
  title text not null,
  category text not null,
  occasion text,
  gender text,
  size text,
  measurements jsonb not null default '{}'::jsonb,
  description text not null,
  fabric_preference text,
  budget_min numeric(12, 2),
  budget_max numeric(12, 2),
  location text,
  due_date date,
  additional_preferences text,
  status request_status not null default 'draft',
  -- Generated, never independently settable — see BACKEND_ARCHITECTURE.md §6.3 / correction 3.
  visibility text generated always as (
    case when preferred_designer_id is null then 'public' else 'private' end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fashion_requests_budget_range_chk
    check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

comment on table public.fashion_requests is
  'The single source of truth for a customer''s request. Designer feed, request detail, proposal '
  'context, and the project workspace on both sides all read THIS row (via proposals/projects '
  'FKs) — never a separate designer-side copy.';
comment on column public.fashion_requests.visibility is
  'PUBLIC (preferred_designer_id is null) → eligible approved designers'' feed. '
  'PRIVATE (preferred_designer_id set) → visible only to that one designer.';

-- Correction 6: a private/directed request can only target an APPROVED designer. Cross-table, so
-- it can't be a plain CHECK constraint — enforced with a trigger, which is the DB-level
-- equivalent of a CHECK that spans tables.
create function public.enforce_preferred_designer_is_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status designer_overall_status;
begin
  if new.preferred_designer_id is null then
    return new;
  end if;

  select overall_status into v_status
  from public.designer_verifications
  where designer_id = new.preferred_designer_id;

  if v_status is distinct from 'approved' then
    raise exception
      'A private/directed request can only target an approved designer (designer % is %)',
      new.preferred_designer_id, coalesce(v_status::text, 'not submitted');
  end if;

  return new;
end;
$$;

create trigger fashion_requests_preferred_designer_approved
  before insert or update of preferred_designer_id on public.fashion_requests
  for each row execute function public.enforce_preferred_designer_is_approved();

create table public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fashion_requests (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (request_id, position)
);

-- Per-designer swipe/save state on a (typically public) request — can't live on fashion_requests
-- itself since many designers can each swipe/save the same public request independently.
create table public.designer_request_interactions (
  request_id uuid not null references public.fashion_requests (id) on delete cascade,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  swipe_status text check (swipe_status in ('interested', 'declined')),
  saved boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (request_id, designer_id)
);

-- ---------------------------------------------------------------------------
-- Proposals — many per request, at most one ever accepted.
-- ---------------------------------------------------------------------------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.fashion_requests (id) on delete cascade,
  -- No cascade on designer_id: a designer_profiles row with proposal history must not be
  -- hard-deletable either (§6.12) — same reasoning as fashion_requests.customer_id above.
  designer_id uuid not null references public.designer_profiles (id),
  price numeric(12, 2) not null check (price >= 0),
  estimated_days int check (estimated_days is null or estimated_days > 0),
  description text,
  notes text,
  status proposal_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, designer_id)
);

comment on table public.proposals is
  'Never duplicates request content — price/estimated_days/description/notes are the only '
  'proposal-specific fields; everything about what''s being proposed on is read via request_id.';

-- Correction 5: makes a double-accept on the same request physically impossible, not just
-- discouraged by application logic — a hard DB-level guarantee independent of any transaction
-- discipline the eventual API layer implements.
create unique index proposals_one_accepted_per_request
  on public.proposals (request_id)
  where (status = 'accepted');

-- ---------------------------------------------------------------------------
-- Projects — thin, reference-only. Correction 1: no request/proposal content copied.
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.fashion_requests (id),
  proposal_id uuid not null unique references public.proposals (id),
  -- Denormalized REFERENCES (not content) for ownership/RLS query performance — always equal to
  -- request.customer_id / proposal.designer_id by construction; see BACKEND_ARCHITECTURE.md §6.3
  -- for why this specifically doesn't reintroduce the duplication problem.
  customer_id uuid not null references public.customer_profiles (id),
  designer_id uuid not null references public.designer_profiles (id),
  stage project_stage not null default 'Request Accepted',
  stages project_stage[] not null default array[
    'Request Accepted', 'Design Confirmed', 'Fabric Selected', 'Cutting',
    'Stitching', 'Fitting', 'Final Alterations', 'Completed'
  ]::project_stage[],
  progress_percent int not null default 13 check (progress_percent between 0 and 100),
  status project_status not null default 'active',
  completed_at timestamptz,
  changes_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is
  'References request_id + proposal_id ONLY — title/description/budget/measurements/images etc. '
  'are read by joining through those two FKs, never copied here. This is the correction applied '
  'in the final architecture review: the prior draft described this table as a "snapshot" that '
  'copied request fields, which directly contradicted the "one canonical request" principle '
  'stated elsewhere in the same document. Fixed at the schema level, not just in prose.';

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  stage project_stage not null,
  note text,
  author_id uuid not null references public.designer_profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.project_updates is
  'Append-only history of dress/design progress updates — never overwritten, matching the '
  'existing frontend''s edit/delete-a-single-update model (each update is its own row, not a '
  'field that gets replaced).';

create table public.project_update_images (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.project_updates (id) on delete cascade,
  file_id uuid not null references public.files (id) on delete restrict,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (update_id, position)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index fashion_requests_customer_id_idx on public.fashion_requests (customer_id);
create index fashion_requests_status_idx on public.fashion_requests (status);
create index fashion_requests_visibility_idx on public.fashion_requests (visibility);
create index fashion_requests_preferred_designer_id_idx
  on public.fashion_requests (preferred_designer_id);
create index fashion_requests_created_at_idx on public.fashion_requests (created_at desc);
create index request_images_request_id_idx on public.request_images (request_id);
create index designer_request_interactions_designer_id_idx
  on public.designer_request_interactions (designer_id);

create index proposals_request_id_idx on public.proposals (request_id);
create index proposals_designer_id_idx on public.proposals (designer_id);
create index proposals_status_idx on public.proposals (status);

create index projects_customer_id_idx on public.projects (customer_id);
create index projects_designer_id_idx on public.projects (designer_id);
create index projects_status_idx on public.projects (status);
create index project_updates_project_id_idx on public.project_updates (project_id);
create index project_update_images_update_id_idx on public.project_update_images (update_id);
