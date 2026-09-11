-- LILIRVE — same root cause as 20260902000002_start_identity_verification.sql, found while fixing
-- it: `designer_verifications_update_admin_only` blocks ALL non-admin writes to that table, but
-- TWO more designer-initiated routes also do a plain `.update()` against it directly —
-- app/api/designer/onboarding/submit-portfolio (portfolio_status -> 'submitted') and
-- app/api/designer/onboarding/submit-profile (overall_status -> 'pending'). Both were silently
-- no-ops (0 rows affected, no thrown error) exactly like start-identity was: every designer who
-- ever clicked "Submit Portfolio for Review" or the final "Submit for Verification" saw a success
-- toast while nothing was actually submitted — their designer_verifications row never left
-- not_submitted, so no admin ever saw them in the verification queue.
--
-- Same fix shape as start_identity_verification(): one SECURITY DEFINER function per action,
-- each re-implementing that route's own precondition checks in SQL before writing, touching only
-- the one column each action is meant to touch, only on the caller's own row.

create function public.submit_portfolio_for_review()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_ownership_accepted boolean;
  v_item_count int;
begin
  v_designer_id := public.current_designer_id();
  if v_designer_id is null then
    raise exception 'Only a designer can submit a portfolio';
  end if;

  select portfolio_ownership_accepted into v_ownership_accepted
  from public.designer_onboarding
  where designer_id = v_designer_id;

  select count(*) into v_item_count
  from public.designer_portfolio_items
  where designer_id = v_designer_id;

  if v_ownership_accepted is not true or v_item_count < 3 then
    raise exception 'Add at least 3 portfolio items and accept ownership before submitting.';
  end if;

  update public.designer_verifications
  set portfolio_status = 'submitted', portfolio_review_note = null
  where designer_id = v_designer_id;
end;
$$;

comment on function public.submit_portfolio_for_review() is
  'Designer-initiated write allowed against the otherwise admin-only designer_verifications table: '
  'portfolio_status -> submitted, on the caller''s own row, only once >= 3 portfolio items exist '
  'and ownership is accepted (mirrors the route''s own precondition exactly).';

create function public.submit_designer_profile_for_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_onboarding public.designer_onboarding;
  v_item_count int;
  v_identity_status identity_status;
begin
  v_designer_id := public.current_designer_id();
  if v_designer_id is null then
    raise exception 'Only a designer can submit for verification';
  end if;

  select * into v_onboarding from public.designer_onboarding where designer_id = v_designer_id;
  select count(*) into v_item_count from public.designer_portfolio_items where designer_id = v_designer_id;
  select identity_status into v_identity_status from public.designer_verifications where designer_id = v_designer_id;

  if v_onboarding is null
    or coalesce(array_length(v_onboarding.roles, 1), 0) = 0
    or v_item_count < 3
    or v_onboarding.portfolio_ownership_accepted is not true
    or coalesce(trim(v_onboarding.studio_name), '') = ''
    or v_identity_status = 'not_started'
  then
    raise exception 'Complete your professional profile, portfolio, and studio sections before submitting.';
  end if;

  update public.designer_verifications
  set overall_status = 'pending', submitted_at = now()
  where designer_id = v_designer_id;
end;
$$;

comment on function public.submit_designer_profile_for_verification() is
  'Designer-initiated write allowed against the otherwise admin-only designer_verifications table: '
  'overall_status -> pending, on the caller''s own row, only once the full onboarding wizard''s own '
  'readiness rule is satisfied (mirrors the route''s own precondition exactly). Never sets '
  '''approved'' — only an admin action can do that.';

grant execute on function public.submit_portfolio_for_review() to authenticated;
grant execute on function public.submit_designer_profile_for_verification() to authenticated;
