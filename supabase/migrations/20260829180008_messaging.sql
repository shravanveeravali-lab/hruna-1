-- LILIRVE — Phase 1: Supabase database schema
-- Conversations & messages. Exactly one conversation per (customer, designer) pair — matches the
-- frontend's getOrCreateConversation guarantee.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles (id) on delete cascade,
  designer_id uuid not null references public.designer_profiles (id) on delete cascade,
  customer_last_read_at timestamptz,
  designer_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, designer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.users (id),
  text text not null,
  image_file_id uuid references public.files (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.messages is
  'Append-only. sender_id references public.users (the login identity), not a role-specific '
  'profile id, since either side of a conversation can send from their one identity.';

-- last_message / last_timestamp / unread_count are deliberately NOT stored columns (they'd be
-- derived data that can drift) — this view computes them per side from the messages themselves.
-- "Unread" is per-viewer by construction: each side has its own *_last_read_at watermark.
create view public.conversation_previews as
  select
    c.id,
    c.customer_id,
    c.designer_id,
    c.customer_last_read_at,
    c.designer_last_read_at,
    m_last.text as last_message,
    m_last.created_at as last_message_at,
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.sender_id != (select user_id from public.customer_profiles where id = c.customer_id)
        and (c.customer_last_read_at is null or m.created_at > c.customer_last_read_at)
    ) as customer_unread_count,
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.sender_id != (select user_id from public.designer_profiles where id = c.designer_id)
        and (c.designer_last_read_at is null or m.created_at > c.designer_last_read_at)
    ) as designer_unread_count
  from public.conversations c
  left join lateral (
    select text, created_at from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) m_last on true;

comment on view public.conversation_previews is
  'Read-only convenience view for inbox lists — last message + per-side unread count, computed '
  'live from messages rather than maintained as columns that could fall out of sync.';

-- See the identical note in the designer_verification migration: without security_invoker this
-- view would bypass RLS on conversations/messages entirely.
alter view public.conversation_previews set (security_invoker = on);

create index conversations_customer_id_idx on public.conversations (customer_id);
create index conversations_designer_id_idx on public.conversations (designer_id);
create index messages_conversation_id_idx on public.messages (conversation_id, created_at);
