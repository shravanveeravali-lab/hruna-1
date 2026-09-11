-- LILIRVE — Phase 1: Supabase database schema
-- Enums / status systems
--
-- Every value here is taken from BACKEND_ARCHITECTURE.md (Round 2), cross-checked against the
-- actual frontend types in types/index.ts. One deliberate deviation, called out below.

-- ---------------------------------------------------------------------------
-- Account status (customer_profiles) — a customer's own standing.
-- ---------------------------------------------------------------------------
create type account_status as enum ('active', 'suspended');

-- ---------------------------------------------------------------------------
-- Designer verification — kept as THREE independent tracks, exactly as the
-- frontend already implements it (identityStatus / portfolioStatus /
-- overallStatus are three separate fields on DesignerVerification, driving
-- three separate admin actions on /admin/designers/[id]). Collapsing this to
-- one status would be a real regression against a decision already
-- reconfirmed twice in BACKEND_ARCHITECTURE.md (Round 1, decision 14).
--
-- DEVIATION FROM THE ARCHITECTURE DOC, DELIBERATE: this phase's brief
-- restates the *overall* track's vocabulary as exactly
-- NOT_SUBMITTED / PENDING / APPROVED / REJECTED / SUSPENDED. The doc's prior
-- overall_status had six values (draft/submitted/under_review/verified/
-- rejected/suspended). This migration adopts the brief's five-value list for
-- designer_overall_status (draft+submitted+under_review collapse into
-- "pending"; "verified" becomes "approved"), since it's stated explicitly and
-- literally in this phase's instructions. identity_status and
-- portfolio_status are UNCHANGED — this phase's brief doesn't mention them,
-- and they still carry real granularity the admin verification UI uses today.
-- See the final report for the full mapping and why this was a judgment call
-- rather than a silent decision.
create type identity_status as enum (
  'not_started', 'pending', 'verified', 'failed', 'requires_action'
);

create type portfolio_status as enum (
  'not_submitted', 'submitted', 'under_review', 'approved', 'rejected', 'revision_required'
);

create type designer_overall_status as enum (
  'not_submitted', 'pending', 'approved', 'rejected', 'suspended'
);

-- ---------------------------------------------------------------------------
-- Designer professional type (Designer.type in the frontend).
-- ---------------------------------------------------------------------------
create type designer_type as enum ('Designer', 'Boutique', 'Tailor');

-- ---------------------------------------------------------------------------
-- Fashion request lifecycle (RequestStatus, extended with 'cancelled' per
-- BACKEND_ARCHITECTURE.md Round 1 decision 6).
-- ---------------------------------------------------------------------------
create type request_status as enum (
  'draft', 'submitted', 'reviewed', 'proposal_received',
  'accepted', 'declined', 'cancelled', 'expired'
);

-- ---------------------------------------------------------------------------
-- Proposal status — unchanged 3-value frontend model.
-- ---------------------------------------------------------------------------
create type proposal_status as enum ('pending', 'accepted', 'declined');

-- ---------------------------------------------------------------------------
-- Project stage — the fixed 8-step timeline (ProjectStage in the frontend).
-- A closed, ordered set — a real enum, not free text.
-- ---------------------------------------------------------------------------
create type project_stage as enum (
  'Request Accepted', 'Design Confirmed', 'Fabric Selected', 'Cutting',
  'Stitching', 'Fitting', 'Final Alterations', 'Completed'
);

-- ---------------------------------------------------------------------------
-- Project status, extended with 'on_hold' and 'cancelled' per
-- BACKEND_ARCHITECTURE.md Round 1 decision 7. No 'not_started' — a project
-- only ever comes into existence already 'active', via proposal acceptance.
-- ---------------------------------------------------------------------------
create type project_status as enum (
  'active', 'on_hold', 'awaiting_confirmation', 'completed', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Saved item type (CustomerSavedItem.itemType).
-- ---------------------------------------------------------------------------
create type saved_item_type as enum ('designer', 'dress', 'collection', 'project');

-- ---------------------------------------------------------------------------
-- Subscriptions & payments.
-- ---------------------------------------------------------------------------
create type subscriber_role as enum ('customer', 'designer');
create type subscription_status as enum ('none', 'active', 'expired', 'cancelled');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- ---------------------------------------------------------------------------
-- Disputes — already an exact match with the frontend, unchanged.
-- ---------------------------------------------------------------------------
create type dispute_status as enum ('open', 'under_review', 'resolved', 'closed');

-- ---------------------------------------------------------------------------
-- Admin notification audience.
-- ---------------------------------------------------------------------------
create type notification_audience as enum ('all', 'customer', 'designer');
