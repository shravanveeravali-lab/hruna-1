-- LILIRVE — Phase 1: Supabase database schema
-- Extensions
--
-- pgcrypto: gen_random_uuid() for all primary keys.
-- citext:   case-insensitive text, used for the denormalized email column on public.users
--           (auth.users.email is already case-insensitive on Supabase's side; citext keeps
--           the public-schema copy consistent with that).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
