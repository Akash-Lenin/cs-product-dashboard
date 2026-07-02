create table if not exists public.cs_app_users (
  email text primary key,
  full_name text,
  role text not null default 'reviewer',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists cs_app_users_role_idx
  on public.cs_app_users(role);

-- Roles:
--   'editor'   full access: create, edit, delete, restore, meetings, quick triage
--   'reviewer' read-only: can view every workspace, filters, and drawers
--
-- New sign-ins default to 'reviewer'. Promote someone with:
--   update public.cs_app_users set role = 'editor' where email = 'person@everstage.com';
