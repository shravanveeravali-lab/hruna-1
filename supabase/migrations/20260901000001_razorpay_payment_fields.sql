-- LILIRVE — Phase 8: Razorpay payment fields + idempotency constraints.
--
-- Minimum schema change needed for a real Razorpay Orders + Checkout integration on top of the
-- existing provider-agnostic `payments` table (20260829180011_subscriptions_and_payments.sql).
-- `payments.provider_reference` already exists and is documented as "the payment provider's own
-- transaction/order/reference id (e.g. Razorpay payment_id)" — that covers the PAYMENT id once a
-- charge succeeds. What's missing is somewhere to store the Razorpay ORDER id, created at checkout
-- time, before any payment_id exists yet (a `payments` row is created in `pending` status the
-- moment checkout starts, so the server has something to verify against and Razorpay's webhook can
-- correlate back to).
--
-- No changes to user_subscriptions: `payment_provider_subscription_id` already exists there for a
-- future true Razorpay Subscriptions/recurring-mandate integration, and stays unused by this
-- phase's Orders-based flow (one paid period per successful checkout) — not touched, not repurposed.
-- No RLS changes: `payments_admin_write` (admin/service-role only) already covers these new columns
-- automatically, since RLS policies apply per-row, not per-column.

alter table public.payments add column provider_order_id text;

comment on column public.payments.provider_order_id is
  'Razorpay order id (order_xxx), set when checkout is created — before provider_reference '
  '(the payment id) exists. Lets the webhook and the client-verify route both correlate an '
  'incoming payment back to the pending `payments` row that was created for it.';

-- Idempotency (§14): a partial unique index (not a plain UNIQUE column constraint) so multiple
-- NULL values are allowed — most historical/future payment rows may never populate these — but no
-- two rows can ever claim the SAME real order id or payment id. This is what makes duplicate
-- webhook delivery, a client retrying /verify, and a race between the two, all safe to just
-- attempt again: the second writer either finds the row already updated (no-op) or hits this
-- constraint and is treated as a duplicate, never creates a second record for one real charge.
create unique index payments_provider_order_id_key
  on public.payments (provider_order_id)
  where provider_order_id is not null;

create unique index payments_provider_reference_key
  on public.payments (provider_reference)
  where provider_reference is not null;
