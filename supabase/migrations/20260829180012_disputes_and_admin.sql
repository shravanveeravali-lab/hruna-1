-- LILIRVE — Phase 1: Supabase database schema
-- Reports & Disputes, admin notifications, admin audit log.
-- No Community, Delivery Agent, or Moodboard administration — those features don't exist.

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id),
  designer_id uuid not null references public.designer_profiles (id),
  project_id uuid references public.projects (id),
  issue text not null,
  details text,
  status dispute_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispute_notes (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  admin_id uuid not null references public.users (id),
  note text not null,
  created_at timestamptz not null default now()
);

comment on table public.dispute_notes is 'Append-only — no update/delete policy is granted to any role in the RLS migration.';

create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users (id),
  title text not null,
  message text not null,
  audience notification_audience not null default 'all',
  created_at timestamptz not null default now()
);

comment on table public.admin_notifications is
  'Admin-authored platform announcements. Distinct from any future per-user notification inbox — '
  'that fan-out (a notification_receipts table) is intentionally not built yet; nothing in the '
  'current frontend reads these into a per-user list.';

-- Generalizes the frontend's AdminReviewLogEntry ("designerId" reused informally as a subject
-- id for customer suspensions and platform-level settings changes too) into a properly-named,
-- properly-typed subject_type/subject_id pair.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users (id),
  subject_type text not null check (subject_type in ('designer', 'customer', 'platform')),
  subject_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is
  'Append-only. subject_id is null for platform-level actions (e.g. toggling payment_settings).';

create index disputes_customer_id_idx on public.disputes (customer_id);
create index disputes_designer_id_idx on public.disputes (designer_id);
create index disputes_status_idx on public.disputes (status);
create index dispute_notes_dispute_id_idx on public.dispute_notes (dispute_id);
create index admin_notifications_audience_idx on public.admin_notifications (audience);
create index admin_audit_log_subject_idx on public.admin_audit_log (subject_type, subject_id);
