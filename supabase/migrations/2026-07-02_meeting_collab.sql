-- Meeting collaboration pass:
--   1. notes can carry an owner (tagged person becomes responsible)
--   2. issue history entries can reference the meeting they came from,
--      so the issue drawer can link back into Meeting space

alter table public.cs_meeting_notes
  add column if not exists owner_name text;

alter table public.cs_issue_updates
  add column if not exists meeting_id bigint references public.cs_meetings(id) on delete set null;

create index if not exists cs_issue_updates_meeting_id_idx
  on public.cs_issue_updates(meeting_id);
