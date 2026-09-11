-- LILIRVE — Phase 1: Supabase database schema
-- Subscriptions & payments. Kept exactly as the finalized architecture — provider-agnostic
-- schema, master OFF switch, Razorpay as the planned (not yet implemented) initial provider.

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  role subscriber_role not null,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'INR',
  billing_interval text not null default 'monthly',
  description text,
  features text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- No cascade: subscription/billing history is a financial record and shouldn't silently
  -- vanish via an unrelated account-deletion action — same reasoning as payments below.
  user_id uuid not null references public.users (id),
  role subscriber_role not null,
  plan_id uuid not null references public.subscription_plans (id),
  status subscription_status not null default 'none',
  start_date timestamptz,
  end_date timestamptz,
  renewal_date timestamptz,
  cancelled_at timestamptz,
  payment_provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Subscription uniqueness" (task 24): at most one ACTIVE subscription per user per role.
-- Historical (expired/cancelled) rows can accumulate freely for audit purposes.
create unique index user_subscriptions_one_active_per_role
  on public.user_subscriptions (user_id, role)
  where (status = 'active');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- No cascade: payment records should never be silently deleted by an account-deletion action —
  -- financial/audit data outlives the convenience of a simple cascading delete.
  user_id uuid not null references public.users (id),
  subscription_id uuid references public.user_subscriptions (id),
  plan_id uuid references public.subscription_plans (id),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'INR',
  status payment_status not null default 'pending',
  payment_provider text not null default 'razorpay',
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.payments.payment_provider is
  'Razorpay is the planned initial provider (India-first). Stored as free text, not an enum, so '
  'a future additional/alternate provider is a data value, never a schema migration — this is '
  'part of keeping the app decoupled from any one gateway (see PaymentService/'
  'PaymentProviderAdapter in BACKEND_ARCHITECTURE.md §11a). Not implemented in this phase.';
comment on column public.payments.provider_reference is
  'The payment provider''s own transaction/order/reference id (e.g. Razorpay payment_id) — set '
  'once a real integration exists; null for now since no gateway is connected yet.';

-- ---------------------------------------------------------------------------
-- Master switch — singleton row (the `id boolean primary key default true check (id)` trick
-- guarantees exactly one row can ever exist). payment_system_enabled = false is the seeded
-- default; see the seed file. While false, the application must not attempt any charge —
-- enforced at the application layer in a later phase; this table is the config source of truth.
-- ---------------------------------------------------------------------------
create table public.payment_settings (
  id boolean primary key default true check (id),
  payment_system_enabled boolean not null default false,
  customer_subscriptions_enabled boolean not null default true,
  designer_subscriptions_enabled boolean not null default true,
  currency text not null default 'INR',
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id, payment_system_enabled)
values (true, false);

create index subscription_plans_role_idx on public.subscription_plans (role);
create index user_subscriptions_user_id_idx on public.user_subscriptions (user_id);
create index user_subscriptions_status_idx on public.user_subscriptions (status);
create index payments_user_id_idx on public.payments (user_id);
create index payments_status_idx on public.payments (status);
