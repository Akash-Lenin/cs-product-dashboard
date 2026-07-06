-- Defense in depth: enable row-level security on every app table with NO policies.
--
-- Effect: the anon/publishable key can no longer read or write these tables
-- directly (PostgREST denies everything without a policy). The backend is
-- unaffected because it connects with the service role key, which bypasses RLS.
--
-- Run this BEFORE enabling Google SSO, since SSO ships the anon key to
-- every browser by design.
--
-- Reversible per table with:
--   alter table public.<name> disable row level security;

alter table public.cs_accounts enable row level security;
alter table public.cs_issues enable row level security;
alter table public.cs_issue_accounts enable row level security;
alter table public.cs_issue_updates enable row level security;
alter table public.cs_deleted_issues enable row level security;
alter table public.cs_meetings enable row level security;
alter table public.cs_meeting_notes enable row level security;
alter table public.cs_meeting_action_items enable row level security;
alter table public.cs_app_users enable row level security;
