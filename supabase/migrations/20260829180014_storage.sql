-- LILIRVE — Phase 1: Supabase database schema
-- Storage buckets + storage.objects RLS.
--
-- Convention: every object's path starts with the uploading user's auth uid — 'avatars/<uid>/…',
-- 'diary-images/<uid>/…', etc. — so ownership can be checked from the path alone for the
-- simple, single-owner buckets. The two buckets whose *readers* are broader than "the owner"
-- (request-images: visible to eligible designers too; project-updates: visible to the other
-- project participant too) are gated by joining back to public.files + the owning row instead,
-- since path-prefix alone can't express "and also this other specific person."
--
-- Six buckets cover the eight upload surfaces in BACKEND_ARCHITECTURE.md §11 (profile photos and
-- studio images share the same public-read/owner-write shape, so they share two buckets between
-- them rather than one bucket each).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('studio-images', 'studio-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('request-images', 'request-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('diary-images', 'diary-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('project-updates', 'project-updates', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars, studio-images — PUBLIC read (they're catalog/marketing content),
-- owner-folder write. Path convention: '<uid>/...'.
-- ---------------------------------------------------------------------------
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_modify on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy studio_images_public_read on storage.objects
  for select using (bucket_id = 'studio-images');
create policy studio_images_owner_write on storage.objects
  for insert with check (bucket_id = 'studio-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy studio_images_owner_modify on storage.objects
  for update using (bucket_id = 'studio-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy studio_images_owner_delete on storage.objects
  for delete using (bucket_id = 'studio-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- diary-images, verification-documents — PRIVATE, single-owner only (Fashion
-- Diary is never shared; verification docs are owner + admin only, and admin
-- access to a private bucket is granted via a signed URL issued by a
-- privileged backend process in a later phase, not a broad storage.objects
-- policy — so this policy intentionally covers the owner case only).
-- ---------------------------------------------------------------------------
create policy diary_images_owner_all on storage.objects
  for all
  using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy verification_documents_owner_rw on storage.objects
  for all
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

comment on policy verification_documents_owner_rw on storage.objects is
  'Owner read/write only. Admin review access is via a signed URL from a privileged backend '
  'process (Phase 2/3), not a broad storage.objects SELECT policy — keeps KYC documents from '
  'being listable by every admin session by default.';

-- ---------------------------------------------------------------------------
-- request-images — visible to the request's owning customer AND any designer
-- who can see that request (public+approved, or the preferred designer) —
-- broader than "the uploader," so this joins back through public.files and
-- public.request_images/fashion_requests rather than using the path prefix.
-- ---------------------------------------------------------------------------
create policy request_images_read on storage.objects
  for select using (
    bucket_id = 'request-images'
    and exists (
      select 1 from public.files f
      join public.request_images ri on ri.file_id = f.id
      where f.bucket_id = 'request-images' and f.storage_path = storage.objects.name
        and exists (select 1 from public.fashion_requests r where r.id = ri.request_id)
    )
  );
create policy request_images_owner_write on storage.objects
  for insert with check (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy request_images_owner_delete on storage.objects
  for delete using (bucket_id = 'request-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- project-updates — visible to both project participants, not just the
-- designer who uploaded it. Same join-through-files pattern.
-- ---------------------------------------------------------------------------
create policy project_updates_read on storage.objects
  for select using (
    bucket_id = 'project-updates'
    and exists (
      select 1 from public.files f
      join public.project_update_images pui on pui.file_id = f.id
      join public.project_updates u on u.id = pui.update_id
      where f.bucket_id = 'project-updates' and f.storage_path = storage.objects.name
        and exists (select 1 from public.projects p where p.id = u.project_id)
    )
  );
create policy project_updates_owner_write on storage.objects
  for insert with check (bucket_id = 'project-updates' and (storage.foldername(name))[1] = auth.uid()::text);
create policy project_updates_owner_delete on storage.objects
  for delete using (bucket_id = 'project-updates' and (storage.foldername(name))[1] = auth.uid()::text);
