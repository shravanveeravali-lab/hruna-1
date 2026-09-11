-- LILIRVE — Phase 7 (Storage/Uploads gap-fill): fix shared-image visibility RLS.
--
-- Two coupled bugs found this phase, confirmed live (an approved designer viewing an eligible
-- public fashion_request saw an EMPTY inspirationImages array, even though the owning customer's
-- own view of the same request correctly showed the real signed URL):
--
-- BUG 1 — too restrictive: `files_select` only ever allowed `owner_id = auth.uid() or is_admin()`
-- for a private file. That's correct for diary-images (never shared, by design) and
-- verification-documents (owner+admin only, by design — admin's real access route is a
-- service-role-signed URL, per that policy's own comment, not a broadened RLS clause). But
-- request-images and project-updates are NOT owner-only by design — a request-image must also be
-- visible to whichever designer is eligible for that request (public+approved, or the preferred
-- designer), and a project-update image must be visible to BOTH project participants, not just
-- whichever one uploaded it. Because `files` has no way to know which entity a row belongs to
-- without joining back out to request_images/project_update_images, the eligible non-owner viewer
-- was silently denied — no error, the embedded `files` field in the API response just came back
-- null and got filtered out by the resolver, so it read as "this request/update has no images."
--
-- BUG 2 — too permissive, in the opposite direction: `request_images_select`,
-- `project_update_images_select`, and storage.objects' `request_images_read`/`project_updates_read`
-- were all written as `exists (select 1 from <parent table> where id = <fk>)` — which only checks
-- that the PARENT ROW EXISTS AT ALL, not that the CALLER has any relationship to it. Every one of
-- these policies was accidentally a "true for any authenticated request" policy. In practice this
-- was masked by BUG 1 (the embedded `files` row still came back null for a non-eligible caller),
-- but it meant `files_select`'s real eligibility check was the ONLY thing preventing a stranger
-- from reading the join-table row / signing a storage URL directly (bypassing the app's own
-- routes entirely via a raw authenticated Supabase client call) — the wrong layer was carrying
-- the actual protection.
--
-- Fix: both bugs are fixed together, consistently, using the exact same eligibility rule the
-- table-level fashion_requests_select / projects_select policies already encode (single source of
-- truth for "who can see this request/project" — not a new, parallel rule). Four policies
-- corrected; `files_select`'s diary-image/verification-document/public-file behavior is
-- unchanged. No table/column changes, no data changes.

drop policy files_select on public.files;
create policy files_select on public.files
  for select using (
    not is_private
    or owner_id = auth.uid()
    or public.is_admin()
    or (
      entity_type = 'request_image'
      and exists (
        select 1 from public.request_images ri
        join public.fashion_requests r on r.id = ri.request_id
        where ri.file_id = files.id
          and (
            r.customer_id = public.current_customer_id()
            or (r.visibility = 'public' and public.is_approved_designer())
            or r.preferred_designer_id = public.current_designer_id()
          )
      )
    )
    or (
      entity_type = 'project_update_image'
      and exists (
        select 1 from public.project_update_images pui
        join public.project_updates u on u.id = pui.update_id
        join public.projects p on p.id = u.project_id
        where pui.file_id = files.id
          and (p.customer_id = public.current_customer_id() or p.designer_id = public.current_designer_id())
      )
    )
  );

drop policy request_images_select on public.request_images;
create policy request_images_select on public.request_images
  for select using (
    exists (
      select 1 from public.fashion_requests r
      where r.id = request_id
        and (
          r.customer_id = public.current_customer_id()
          or public.is_admin()
          or (r.visibility = 'public' and public.is_approved_designer())
          or r.preferred_designer_id = public.current_designer_id()
        )
    )
  );

drop policy project_update_images_select on public.project_update_images;
create policy project_update_images_select on public.project_update_images
  for select using (
    exists (
      select 1 from public.project_updates u
      join public.projects p on p.id = u.project_id
      where u.id = update_id
        and (p.customer_id = public.current_customer_id() or p.designer_id = public.current_designer_id() or public.is_admin())
    )
  );

drop policy request_images_read on storage.objects;
create policy request_images_read on storage.objects
  for select using (
    bucket_id = 'request-images'
    and exists (
      select 1 from public.files f
      join public.request_images ri on ri.file_id = f.id
      join public.fashion_requests r on r.id = ri.request_id
      where f.bucket_id = 'request-images' and f.storage_path = storage.objects.name
        and (
          r.customer_id = public.current_customer_id()
          or public.is_admin()
          or (r.visibility = 'public' and public.is_approved_designer())
          or r.preferred_designer_id = public.current_designer_id()
        )
    )
  );

drop policy project_updates_read on storage.objects;
create policy project_updates_read on storage.objects
  for select using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.files f
      join public.project_update_images pui on pui.file_id = f.id
      join public.project_updates u on u.id = pui.update_id
      join public.projects p on p.id = u.project_id
      where f.bucket_id = 'project-updates' and f.storage_path = storage.objects.name
        and (p.customer_id = public.current_customer_id() or p.designer_id = public.current_designer_id() or public.is_admin())
    )
  );
