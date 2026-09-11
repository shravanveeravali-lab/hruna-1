-- LILIRVE — Phase 1: Supabase database schema
-- Reviews: 0..1 per project, customer-authored, immutable, never anonymous. No designer-to-
-- customer reviews — there is no field here that would even represent one, by design.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id),
  designer_id uuid not null references public.designer_profiles (id),
  customer_id uuid not null references public.customer_profiles (id),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null,
  created_at timestamptz not null default now()
);

comment on table public.reviews is
  'Exactly one review per project (unique project_id). No updated_at, no update policy — reviews '
  'are immutable once created, per the finalized business rules. customer_id is never null: '
  'reviews are never anonymous.';

-- Defense-in-depth beyond RLS/application checks: a review can only be inserted for a project
-- that is actually completed, and only naming the exact customer/designer that project belongs
-- to (prevents a row that's internally inconsistent with its own project, regardless of what
-- layer is asking).
create function public.enforce_review_project_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status project_status;
  v_customer_id uuid;
  v_designer_id uuid;
begin
  select status, customer_id, designer_id
    into v_status, v_customer_id, v_designer_id
  from public.projects
  where id = new.project_id;

  if v_status is null then
    raise exception 'Project % does not exist', new.project_id;
  end if;

  if v_status != 'completed' then
    raise exception 'Reviews can only be submitted for a completed project (project % is %)',
      new.project_id, v_status;
  end if;

  if new.customer_id != v_customer_id or new.designer_id != v_designer_id then
    raise exception
      'Review customer/designer must match the project''s own customer/designer';
  end if;

  return new;
end;
$$;

create trigger reviews_enforce_project_rules
  before insert on public.reviews
  for each row execute function public.enforce_review_project_rules();

-- Designer rating/review_count are derived, never independently writable — this trigger is the
-- ONLY writer of those two columns (see designer_profiles_rating_not_client_settable below,
-- which blocks every other writer; the `set local lilirve.internal_trigger` here is what lets
-- THIS trigger's own update through that guard).
create function public.recompute_designer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('lilirve.internal_trigger', 'on', true);
  update public.designer_profiles d
  set
    rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.designer_id = d.id), 0),
    review_count = (select count(*) from public.reviews r where r.designer_id = d.id),
    updated_at = now()
  where d.id = new.designer_id;
  return new;
end;
$$;

create trigger reviews_recompute_designer_rating
  after insert on public.reviews
  for each row execute function public.recompute_designer_rating();

-- Belt-and-suspenders: block a client from setting rating/review_count directly through the
-- normal owner-update policy, so only the SECURITY DEFINER trigger above can ever change them.
--
-- NOTE: a plain `revoke update (rating, review_count) on designer_profiles from authenticated`
-- does NOT work here — verified empirically against a running instance. Supabase's own default
-- privilege provisioning re-grants broad table+column UPDATE to `authenticated` on every new
-- table (that's what makes a fresh table usable via the Data API without hand-written GRANTs at
-- all), and that happens in a way this migration's REVOKE doesn't survive. A trigger is immune to
-- that ordering issue, since it enforces the rule at row-write time regardless of what column
-- privileges the role technically holds.
create function public.enforce_designer_rating_not_client_settable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rating is distinct from old.rating or new.review_count is distinct from old.review_count)
     and current_setting('lilirve.internal_trigger', true) is distinct from 'on' then
    raise exception 'rating and review_count are derived from reviews and cannot be set directly';
  end if;
  return new;
end;
$$;

create trigger designer_profiles_rating_not_client_settable
  before update on public.designer_profiles
  for each row execute function public.enforce_designer_rating_not_client_settable();

create index reviews_designer_id_idx on public.reviews (designer_id);
create index reviews_customer_id_idx on public.reviews (customer_id);
