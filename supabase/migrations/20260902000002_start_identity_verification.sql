-- LILIRVE — fixes a real, confirmed-live bug: `designer_verifications_update_admin_only`
-- (20260829180013_rls.sql) correctly locks the FINAL verification decision (approve/reject/
-- suspend, overall_status) to admins only — but it also has no exception for the designer's own
-- narrow, legitimate self-service action of starting identity verification (identity_status:
-- not_started -> pending). app/api/designer/onboarding/start-identity/route.ts has always called
-- a plain `.update()` through the regular authenticated client, which RLS silently blocks (0 rows
-- affected, no error) — the route never checked the affected-row count, so it returned a false
-- `{"status":"ok"}` while writing nothing. Every designer who has ever clicked "Start Identity
-- Verification" has been stuck exactly here: the wizard's Continue button never unlocks, because
-- identity_status never actually left 'not_started'.
--
-- Same pattern as accept_proposal() (20260830000001_accept_proposal.sql) for the same reason: a
-- narrow, safe carve-out of an otherwise RLS-locked table, implemented as a SECURITY DEFINER
-- function that re-verifies ownership and preconditions explicitly, rather than broadening the
-- table's RLS policy itself. Designers still cannot touch overall_status, identity_status once
-- it's left 'not_started', or any other admin-owned field — only this one specific, one-way
-- transition, and only on their own row.

create function public.start_identity_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_dob date;
begin
  v_designer_id := public.current_designer_id();
  if v_designer_id is null then
    raise exception 'Only a designer can start identity verification';
  end if;

  select date_of_birth into v_dob
  from public.designer_onboarding
  where designer_id = v_designer_id;

  if v_dob is null then
    raise exception 'Enter your date of birth first';
  end if;

  update public.designer_verifications
  set identity_status = 'pending', identity_failure_reason = null
  where designer_id = v_designer_id and identity_status = 'not_started';
end;
$$;

comment on function public.start_identity_verification() is
  'The one designer-initiated write allowed against the otherwise admin-only designer_verifications '
  'table: not_started -> pending, on the caller''s own row, only after their date of birth is on '
  'file. Silently a no-op (not an error) if identity_status has already moved past not_started, so '
  'a duplicate click is safe.';

grant execute on function public.start_identity_verification() to authenticated;
