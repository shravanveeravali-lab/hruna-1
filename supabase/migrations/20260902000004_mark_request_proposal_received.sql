-- LILIRVE — real, confirmed bug: `request_status` already has a 'proposal_received' value
-- (20260829180002_enums.sql), and the customer's own Requests list page already filters a
-- "Proposal Received" tab on exactly that status — but nothing in the app ever set it. Proposal
-- creation (app/api/designer/proposals POST) was deliberately built to never touch
-- fashion_requests at all (its own comment: "Creating a proposal never touches fashion_requests"),
-- so a request just sat at 'submitted' forever even after a real proposal arrived — the tab always
-- showed (0) no matter how many proposals existed. `fashion_requests_update_own` RLS is
-- customer-or-admin only, so a designer genuinely can't flip this themselves via a plain update
-- even if the route tried — same shape of gap as accept_proposal()/start_identity_verification()/
-- the two submit_* functions already in this project: a narrow, legitimate cross-boundary write,
-- fixed with a small SECURITY DEFINER function rather than broadening the RLS policy itself.
--
-- Deliberately separate from proposal creation (not folded into one bigger transaction) — the
-- proposal insert itself already works correctly via existing RLS
-- (proposals_insert_own) and isn't touched; this only adds the one missing status transition,
-- callable only by a designer who has genuinely already submitted a proposal for that request, and
-- only a one-way 'submitted' -> 'proposal_received' move (idempotent — a second proposal on an
-- already-'proposal_received' request is a safe no-op, never regresses a request that's since
-- moved further, e.g. to 'accepted').

create function public.mark_request_proposal_received(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_has_proposal boolean;
begin
  v_designer_id := public.current_designer_id();
  if v_designer_id is null then
    raise exception 'Only a designer can do this';
  end if;

  select exists(
    select 1 from public.proposals
    where request_id = p_request_id and designer_id = v_designer_id
  ) into v_has_proposal;

  if not v_has_proposal then
    raise exception 'You have not submitted a proposal for this request';
  end if;

  update public.fashion_requests
  set status = 'proposal_received', updated_at = now()
  where id = p_request_id and status = 'submitted';
end;
$$;

comment on function public.mark_request_proposal_received(uuid) is
  'The one designer-initiated write allowed against fashion_requests despite '
  'fashion_requests_update_own being customer-or-admin-only: submitted -> proposal_received, and '
  'only when the caller has genuinely already submitted a proposal for that request. Called right '
  'after a successful proposal insert (app/api/designer/proposals POST) — kept separate from that '
  'insert rather than combined into one bigger transaction.';

grant execute on function public.mark_request_proposal_received(uuid) to authenticated;
