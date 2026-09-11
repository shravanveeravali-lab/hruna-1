-- Customer Settings completion: real, persisted notification preferences. The Notifications tab on
-- app/(app)/profile/page.tsx previously held these four toggles in local React state only, with an
-- on-page disclaimer that nothing was actually saved. This is the smallest possible fix — one
-- additive, nullable-safe jsonb column, not a new table, and not a duplicate of the unrelated
-- /notifications activity-feed feature (that page computes a live feed from fashion_requests/
-- messages/projects and has nothing to do with per-user preferences).
--
-- No RLS change needed: RLS policies on public.customer_profiles are row-level, not column-level —
-- the existing customer_profiles_select/customer_profiles_update policies (user_id = auth.uid())
-- automatically cover this new column too. It is also untouched by the
-- customer_profiles_status_admin_only trigger, which only guards the `status` column.
alter table public.customer_profiles
  add column notification_preferences jsonb not null default
    '{"proposals":true,"messages":true,"projectUpdates":true,"marketing":false}'::jsonb;

comment on column public.customer_profiles.notification_preferences is
  'Customer-controlled notification preference toggles, managed from the Settings > Notifications tab. Purely a preference store — unrelated to the admin_notifications table or the live-computed activity feed at /notifications.';
