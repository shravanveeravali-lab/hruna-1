-- LILIRVE — Phase 1: Supabase database schema
-- Row Level Security. This is the actual data-protection layer — nothing in the eventual API
-- should be trusted to enforce these rules on its own; the database enforces them regardless of
-- what any client asks for.
--
-- SCOPE NOTE: policies here express OWNERSHIP and VISIBILITY (who can see/touch which rows —
-- squarely a database-security concern). They deliberately do NOT encode workflow/business logic
-- (e.g. "which request statuses can move to which other statuses", "how accepting a proposal
-- auto-declines siblings and creates a project") — that orchestration is explicitly deferred to
-- the backend foundation phase, per this phase's instructions. Two narrow exceptions are kept as
-- triggers because they're referential-integrity constraints, not workflow: a private request
-- must target an approved designer (already added in the requests migration), and a review must
-- match its own project's parties (already added in the reviews migration).

-- ===========================================================================
-- Helper functions — SECURITY DEFINER so they read customer_profiles /
-- designer_profiles / users directly, bypassing RLS on those lookups. Without
-- this, using them INSIDE a policy on the same table would recurse into that
-- table's own RLS while evaluating the policy that's supposed to be deciding
-- access in the first place.
-- ===========================================================================

create function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customer_profiles where user_id = auth.uid();
$$;

create function public.current_designer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.designer_profiles where user_id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.users where id = auth.uid()), false);
$$;

create function public.is_approved_designer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select v.overall_status = 'approved'
     from public.designer_verifications v
     where v.designer_id = public.current_designer_id()),
    false
  );
$$;

grant execute on function
  public.current_customer_id(), public.current_designer_id(),
  public.is_admin(), public.is_approved_designer()
  to authenticated, anon;

-- ===========================================================================
-- Enable RLS on every table. A table with RLS enabled and NO policies denies
-- all access by default (except to the postgres/service_role, which bypasses
-- RLS entirely — that's what seed scripts and privileged backend jobs use).
-- ===========================================================================
alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.designer_profiles enable row level security;
alter table public.designer_verifications enable row level security;
alter table public.designer_onboarding enable row level security;
alter table public.designer_credentials enable row level security;
alter table public.designer_portfolio_items enable row level security;
alter table public.files enable row level security;
alter table public.studio_highlights enable row level security;
alter table public.meet_the_designer_entries enable row level security;
alter table public.collections enable row level security;
alter table public.dresses enable row level security;
alter table public.dress_images enable row level security;
alter table public.previous_creations enable row level security;
alter table public.previous_creation_images enable row level security;
alter table public.fashion_requests enable row level security;
alter table public.request_images enable row level security;
alter table public.designer_request_interactions enable row level security;
alter table public.proposals enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_update_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.diary_entries enable row level security;
alter table public.diary_entry_images enable row level security;
alter table public.customer_saved_items enable row level security;
alter table public.reviews enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_settings enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_notes enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.admin_audit_log enable row level security;

-- ===========================================================================
-- users — self + admin only. is_admin must never be client-settable — not
-- even by an admin's own session, since real admin promotion should happen
-- out-of-band (service role / SQL), never through the client API.
--
-- A plain `revoke update (is_admin) from authenticated` does NOT work here —
-- verified empirically. Supabase's own default privilege provisioning
-- re-grants broad table+column UPDATE to `authenticated` on every new table,
-- and that survives this migration's REVOKE. A trigger enforces it instead,
-- since it fires at row-write time regardless of column-grant state — same
-- fix, same reasoning as designer_profiles.rating/review_count (see the
-- reviews migration for the fuller explanation).
-- ===========================================================================
-- Deliberately SECURITY INVOKER (the default — no "security definer" here), unlike most other
-- functions in these migrations: this one's whole job is to see the CALLING role's own
-- current_user (authenticated/anon vs. postgres/service_role). A security definer function's
-- current_user is escalated to the function OWNER for the duration of the call — verified
-- empirically that this silently defeated the exact check below when first written that way.
create function public.enforce_is_admin_not_client_settable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Blocks the client-facing roles PostgREST actually connects as (authenticated/anon) while
  -- still allowing postgres/service_role — i.e. the "out-of-band / service role / SQL" path this
  -- table's own comment describes, which is also how seed.sql promotes the dev admin account.
  if new.is_admin is distinct from old.is_admin and current_user in ('authenticated', 'anon') then
    raise exception 'is_admin cannot be changed through the client API';
  end if;
  return new;
end;
$$;

create trigger users_is_admin_not_client_settable
  before update on public.users
  for each row execute function public.enforce_is_admin_not_client_settable();

create policy users_select_self_or_admin on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ===========================================================================
-- customer_profiles
-- ===========================================================================

-- Enforce "only admin can change status" (suspend/reactivate) while still letting the owner
-- freely edit name/avatar/city/phone — a column-level REVOKE can't distinguish "admin" from
-- "regular customer" (both are the `authenticated` Postgres role), so this has to be a trigger.
create function public.enforce_customer_status_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only an admin can change a customer''s account status';
  end if;
  return new;
end;
$$;

create trigger customer_profiles_status_admin_only
  before update on public.customer_profiles
  for each row execute function public.enforce_customer_status_admin_only();

create policy customer_profiles_select on public.customer_profiles
  for select using (
    user_id = auth.uid()
    or public.is_admin()
    -- A designer can see a customer's profile if they share a project, or if the designer can
    -- see any request from that customer (both delegate to those tables' own RLS below).
    or exists (select 1 from public.projects p where p.customer_id = customer_profiles.id)
    or exists (select 1 from public.fashion_requests r where r.customer_id = customer_profiles.id)
  );

create policy customer_profiles_insert_self on public.customer_profiles
  for insert with check (user_id = auth.uid());

create policy customer_profiles_update on public.customer_profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- designer_profiles — the Studio. Publicly readable (it's a public catalog);
-- writable only by its owner.
-- ===========================================================================
create policy designer_profiles_select_public on public.designer_profiles
  for select using (true);

create policy designer_profiles_insert_self on public.designer_profiles
  for insert with check (user_id = auth.uid());

create policy designer_profiles_update_owner on public.designer_profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- designer_verifications — owner can read their own (to see their status);
-- only admin can change it. "Admin controls designer verification" — no
-- owner-update policy exists at all.
-- ===========================================================================
create policy designer_verifications_select on public.designer_verifications
  for select using (
    designer_id = public.current_designer_id() or public.is_admin()
  );

create policy designer_verifications_update_admin_only on public.designer_verifications
  for update using (public.is_admin()) with check (public.is_admin());

-- Auto-provision designer_verifications + designer_onboarding whenever a designer_profiles row
-- is created, so the client never needs (and is never granted) an INSERT policy on either.
create function public.handle_new_designer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.designer_verifications (designer_id) values (new.id)
  on conflict (designer_id) do nothing;
  insert into public.designer_onboarding (designer_id) values (new.id)
  on conflict (designer_id) do nothing;
  return new;
end;
$$;

create trigger on_designer_profile_created
  after insert on public.designer_profiles
  for each row execute function public.handle_new_designer_profile();

-- ===========================================================================
-- designer_onboarding — private (contains date_of_birth). Owner + admin only,
-- never public, never visible to other designers or customers.
-- ===========================================================================
create policy designer_onboarding_select on public.designer_onboarding
  for select using (designer_id = public.current_designer_id() or public.is_admin());

create policy designer_onboarding_update_owner on public.designer_onboarding
  for update using (designer_id = public.current_designer_id() or public.is_admin())
  with check (designer_id = public.current_designer_id() or public.is_admin());

-- ===========================================================================
-- designer_credentials, designer_portfolio_items — owner-managed, visible to
-- the owner + admin only (these are verification-review artifacts, not shown
-- on the public studio page).
-- ===========================================================================
create policy designer_credentials_select on public.designer_credentials
  for select using (designer_id = public.current_designer_id() or public.is_admin());
create policy designer_credentials_all_owner on public.designer_credentials
  for all using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy designer_portfolio_items_select on public.designer_portfolio_items
  for select using (designer_id = public.current_designer_id() or public.is_admin());
create policy designer_portfolio_items_all_owner on public.designer_portfolio_items
  for all using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

-- ===========================================================================
-- files — metadata only (never binary content). Public files readable by
-- anyone; private files (KYC/verification docs) readable only by their owner
-- or admin. The REAL gate on private file content is the Storage bucket
-- policy (storage migration) — this table only guards the metadata row.
-- ===========================================================================
create policy files_select on public.files
  for select using (not is_private or owner_id = auth.uid() or public.is_admin());

create policy files_insert_own on public.files
  for insert with check (owner_id = auth.uid());

create policy files_update_own on public.files
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy files_delete_own on public.files
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- Studio content — public read, owner write. All five tables share the exact
-- same shape of policy.
-- ===========================================================================
create policy studio_highlights_select on public.studio_highlights for select using (true);
create policy studio_highlights_all_owner on public.studio_highlights for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy meet_the_designer_entries_select on public.meet_the_designer_entries for select using (true);
create policy meet_the_designer_entries_all_owner on public.meet_the_designer_entries for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy collections_select on public.collections for select using (true);
create policy collections_all_owner on public.collections for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy dresses_select on public.dresses for select using (true);
create policy dresses_all_owner on public.dresses for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy dress_images_select on public.dress_images for select using (true);
create policy dress_images_all_owner on public.dress_images for all
  using (exists (select 1 from public.dresses d where d.id = dress_id and d.designer_id = public.current_designer_id()))
  with check (exists (select 1 from public.dresses d where d.id = dress_id and d.designer_id = public.current_designer_id()));

create policy previous_creations_select on public.previous_creations for select using (true);
create policy previous_creations_all_owner on public.previous_creations for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

create policy previous_creation_images_select on public.previous_creation_images for select using (true);
create policy previous_creation_images_all_owner on public.previous_creation_images for all
  using (exists (select 1 from public.previous_creations c where c.id = previous_creation_id and c.designer_id = public.current_designer_id()))
  with check (exists (select 1 from public.previous_creations c where c.id = previous_creation_id and c.designer_id = public.current_designer_id()));

-- ===========================================================================
-- fashion_requests — the canonical request. Visible to its own customer, to
-- an approved designer if it's public, to the specifically preferred
-- designer if it's private, or to admin.
-- ===========================================================================
create policy fashion_requests_select on public.fashion_requests
  for select using (
    customer_id = public.current_customer_id()
    or public.is_admin()
    or (visibility = 'public' and public.is_approved_designer())
    or preferred_designer_id = public.current_designer_id()
  );

create policy fashion_requests_insert_own on public.fashion_requests
  for insert with check (customer_id = public.current_customer_id());

create policy fashion_requests_update_own on public.fashion_requests
  for update using (customer_id = public.current_customer_id() or public.is_admin())
  with check (customer_id = public.current_customer_id() or public.is_admin());

comment on policy fashion_requests_update_own on public.fashion_requests is
  'Row-level ownership only — WHICH statuses may be edited into is workflow logic, intentionally '
  'left to the backend phase (see this migration''s top-of-file scope note).';

create policy request_images_select on public.request_images
  for select using (exists (select 1 from public.fashion_requests r where r.id = request_id));

create policy request_images_all_owner on public.request_images
  for all
  using (exists (select 1 from public.fashion_requests r where r.id = request_id and r.customer_id = public.current_customer_id()))
  with check (exists (select 1 from public.fashion_requests r where r.id = request_id and r.customer_id = public.current_customer_id()));

create policy designer_request_interactions_all_own on public.designer_request_interactions
  for all
  using (designer_id = public.current_designer_id())
  with check (designer_id = public.current_designer_id());

-- ===========================================================================
-- proposals
-- ===========================================================================
create policy proposals_select on public.proposals
  for select using (
    designer_id = public.current_designer_id()
    or public.is_admin()
    or exists (select 1 from public.fashion_requests r where r.id = request_id and r.customer_id = public.current_customer_id())
  );

create policy proposals_insert_own on public.proposals
  for insert with check (
    designer_id = public.current_designer_id()
    -- Implicitly requires the request to be visible to this designer, since fashion_requests'
    -- own RLS applies to this subquery too.
    and exists (select 1 from public.fashion_requests r where r.id = request_id)
  );

create policy proposals_update_own_designer on public.proposals
  for update using (designer_id = public.current_designer_id() or public.is_admin())
  with check (designer_id = public.current_designer_id() or public.is_admin());

comment on policy proposals_update_own_designer on public.proposals is
  'Lets a designer edit their own pending proposal, and lets admin touch any row for '
  'moderation. The actual "customer accepts → siblings auto-decline → project created" flow is '
  'NOT exposed as a raw client UPDATE — it will be a privileged transaction/RPC in the backend '
  'phase (see BACKEND_ARCHITECTURE.md §6.3), precisely because RLS alone can''t safely express '
  'that multi-row, multi-table transaction.';

-- ===========================================================================
-- projects — participant read/write (ownership only; transition legality is
-- backend-phase logic, per this file's scope note).
-- ===========================================================================
create policy projects_select on public.projects
  for select using (
    customer_id = public.current_customer_id()
    or designer_id = public.current_designer_id()
    or public.is_admin()
  );

create policy projects_update_participant on public.projects
  for update
  using (customer_id = public.current_customer_id() or designer_id = public.current_designer_id() or public.is_admin())
  with check (customer_id = public.current_customer_id() or designer_id = public.current_designer_id() or public.is_admin());

-- No client-facing INSERT policy on projects: a project is only ever created as part of the
-- proposal-acceptance transaction, which (per the note above) will run as a privileged
-- operation in the backend phase, not a raw client insert.

create policy project_updates_select on public.project_updates
  for select using (exists (
    select 1 from public.projects p where p.id = project_id
  ));

create policy project_updates_insert_designer on public.project_updates
  for insert with check (
    author_id = public.current_designer_id()
    and exists (select 1 from public.projects p where p.id = project_id and p.designer_id = public.current_designer_id())
  );

create policy project_updates_modify_author on public.project_updates
  for update using (author_id = public.current_designer_id())
  with check (author_id = public.current_designer_id());

create policy project_updates_delete_author on public.project_updates
  for delete using (author_id = public.current_designer_id());

create policy project_update_images_select on public.project_update_images
  for select using (exists (select 1 from public.project_updates u where u.id = update_id));

create policy project_update_images_all_author on public.project_update_images
  for all
  using (exists (select 1 from public.project_updates u where u.id = update_id and u.author_id = public.current_designer_id()))
  with check (exists (select 1 from public.project_updates u where u.id = update_id and u.author_id = public.current_designer_id()));

-- ===========================================================================
-- conversations & messages — participants only.
-- ===========================================================================
create policy conversations_select on public.conversations
  for select using (
    customer_id = public.current_customer_id()
    or designer_id = public.current_designer_id()
    or public.is_admin()
  );

create policy conversations_insert_participant on public.conversations
  for insert with check (
    customer_id = public.current_customer_id() or designer_id = public.current_designer_id()
  );

create policy conversations_update_participant on public.conversations
  for update
  using (customer_id = public.current_customer_id() or designer_id = public.current_designer_id())
  with check (customer_id = public.current_customer_id() or designer_id = public.current_designer_id());

create policy messages_select on public.messages
  for select using (
    exists (select 1 from public.conversations c where c.id = conversation_id)
    or public.is_admin()
  );

create policy messages_insert_participant on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.customer_profiles cp on cp.id = c.customer_id
      join public.designer_profiles dp on dp.id = c.designer_id
      where c.id = conversation_id and (cp.user_id = auth.uid() or dp.user_id = auth.uid())
    )
  );

-- No update/delete policy on messages — append-only, matches the existing chat UI (no
-- edit/delete-message feature in the frontend).

-- ===========================================================================
-- Fashion Diary — strictly private. No admin access at all: nothing in the
-- existing frontend reads another user's diary, including admin, and this
-- keeps that guarantee at the database level rather than by convention.
-- ===========================================================================
create policy diary_entries_all_owner on public.diary_entries
  for all
  using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

create policy diary_entry_images_all_owner on public.diary_entry_images
  for all
  using (exists (select 1 from public.diary_entries e where e.id = entry_id and e.customer_id = public.current_customer_id()))
  with check (exists (select 1 from public.diary_entries e where e.id = entry_id and e.customer_id = public.current_customer_id()));

-- ===========================================================================
-- customer_saved_items — owner only.
-- ===========================================================================
create policy customer_saved_items_all_owner on public.customer_saved_items
  for all
  using (customer_id = public.current_customer_id())
  with check (customer_id = public.current_customer_id());

-- ===========================================================================
-- reviews — publicly readable (they're shown on a designer's public studio
-- page); insertable only by the reviewing customer (the trigger from the
-- reviews migration enforces the completed-project + party-matching rules);
-- no update/delete policy for anyone — immutable per the finalized business
-- rule.
-- ===========================================================================
create policy reviews_select_public on public.reviews for select using (true);

create policy reviews_insert_own on public.reviews
  for insert with check (customer_id = public.current_customer_id());

-- ===========================================================================
-- Subscriptions & payments — plans are public; a user's own subscription/
-- payment rows are visible only to them + admin. Writes are admin-only for
-- this phase: the real subscribe/charge flow will run through a privileged
-- service (payment webhook handler), not a raw client insert — see
-- BACKEND_ARCHITECTURE.md §11a.
-- ===========================================================================
create policy subscription_plans_select_public on public.subscription_plans for select using (true);
create policy subscription_plans_admin_write on public.subscription_plans
  for all using (public.is_admin()) with check (public.is_admin());

create policy user_subscriptions_select on public.user_subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy user_subscriptions_admin_write on public.user_subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create policy payments_select on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy payments_admin_write on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

create policy payment_settings_select_public on public.payment_settings for select using (true);
create policy payment_settings_admin_update on public.payment_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Disputes — admin-managed only for this phase. No customer/designer-facing
-- "file a dispute" or "view my disputes" flow exists in the current
-- frontend, so this stays admin-only rather than speculatively opened up.
-- ===========================================================================
create policy disputes_admin_all on public.disputes
  for all using (public.is_admin()) with check (public.is_admin());

create policy dispute_notes_admin_all on public.dispute_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Admin notifications & audit log — admin only. No per-user inbox exists yet
-- to read these into (see BACKEND_ARCHITECTURE.md §5.8) — see comment on
-- admin_notifications in the previous migration.
-- ===========================================================================
create policy admin_notifications_admin_all on public.admin_notifications
  for all using (public.is_admin()) with check (public.is_admin());

create policy admin_audit_log_select_admin on public.admin_audit_log
  for select using (public.is_admin());
create policy admin_audit_log_insert_admin on public.admin_audit_log
  for insert with check (public.is_admin());
-- No update/delete policy anywhere on admin_audit_log — append-only.
