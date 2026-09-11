-- LILIRVE — Phase 4: accept_proposal() RPC.
--
-- Phase 1's own RLS migration flagged exactly this need and deliberately left it undone:
--   "The actual 'customer accepts -> siblings auto-decline -> project created' flow is NOT exposed
--    as a raw client UPDATE — it will be a privileged transaction/RPC in the backend phase."
--   "No client-facing INSERT policy on projects: a project is only ever created as part of the
--    proposal-acceptance transaction, which... will run as a privileged operation."
-- This migration adds exactly that one function — nothing else. No existing table, column, or
-- policy is touched.
--
-- SECURITY DEFINER is required here (not just convenient): a normal SECURITY INVOKER call would
-- hit two real RLS gaps that are gaps ON PURPOSE per the comments above —
--   1. no client-facing INSERT policy on public.projects at all, and
--   2. no client-facing UPDATE policy that lets a CUSTOMER touch public.proposals (only the
--      owning designer/admin can, per proposals_update_own_designer) — yet accepting must both
--      mark one proposal accepted AND auto-decline its siblings, which are rows the calling
--      customer does not "own" in the RLS sense.
-- Because this function bypasses RLS, it re-implements the ownership checks RLS would otherwise
-- provide, explicitly and first, before touching anything.
--
-- Concurrency: proposals_one_accepted_per_request (the existing partial unique index from
-- 20260829180007_requests_proposals_projects.sql) remains the final, unconditional guarantee that
-- only one proposal per request can ever be 'accepted' — even if two different proposals on the
-- same request were accepted in truly concurrent transactions, the second UPDATE below would fail
-- the unique index at statement time and the whole function call would roll back and error out.
-- The `for update` row lock on the target proposal additionally makes a double-click "accept the
-- SAME proposal twice" race resolve cleanly (the second caller re-reads status='accepted' after
-- acquiring the lock and gets a clean "no longer eligible" error, not a partial state).

create function public.accept_proposal(p_proposal_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_customer_id uuid;
  v_request_id uuid;
  v_request_customer_id uuid;
  v_designer_id uuid;
  v_proposal_status proposal_status;
  v_project public.projects;
begin
  v_caller_customer_id := public.current_customer_id();
  if v_caller_customer_id is null then
    raise exception 'Only a customer can accept a proposal';
  end if;

  select p.request_id, p.designer_id, p.status
    into v_request_id, v_designer_id, v_proposal_status
  from public.proposals p
  where p.id = p_proposal_id
  for update;

  if v_request_id is null then
    raise exception 'Proposal not found';
  end if;

  select r.customer_id into v_request_customer_id
  from public.fashion_requests r
  where r.id = v_request_id
  for update;

  if v_request_customer_id is distinct from v_caller_customer_id then
    raise exception 'You do not own the request this proposal belongs to';
  end if;

  if v_proposal_status is distinct from 'pending' then
    raise exception 'This proposal is no longer eligible to be accepted';
  end if;

  update public.proposals set status = 'accepted', updated_at = now()
  where id = p_proposal_id;

  -- Auto-decline every other still-pending proposal on the same request.
  update public.proposals
  set status = 'declined', updated_at = now()
  where request_id = v_request_id and id <> p_proposal_id and status = 'pending';

  update public.fashion_requests
  set status = 'accepted', updated_at = now()
  where id = v_request_id;

  -- stage/stages/progress_percent/status all use the table's own defaults (see
  -- 20260829180007_requests_proposals_projects.sql) — nothing request/proposal-specific is copied
  -- in here, only the three reference ids plus the two ownership ids.
  insert into public.projects (request_id, proposal_id, customer_id, designer_id)
  values (v_request_id, p_proposal_id, v_caller_customer_id, v_designer_id)
  returning * into v_project;

  return v_project;
end;
$$;

comment on function public.accept_proposal(uuid) is
  'Atomically: verifies the caller owns the request, verifies the proposal is still pending, '
  'accepts it, auto-declines sibling proposals, moves the request to accepted, and creates the '
  'project — referencing request_id/proposal_id only, never copying their content (Core Principle, '
  'Phase 4 brief). The only writer of public.projects rows.';

grant execute on function public.accept_proposal(uuid) to authenticated;
