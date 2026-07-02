create table if not exists public.cs_meetings (
  id bigint generated always as identity primary key,
  title text not null,
  meeting_type text not null default 'CS x Product sync',
  meeting_date date not null default current_date,
  digest text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists cs_meetings_meeting_date_idx
  on public.cs_meetings(meeting_date desc, created_at desc);

create table if not exists public.cs_meeting_notes (
  id bigint generated always as identity primary key,
  meeting_id bigint not null references public.cs_meetings(id) on delete cascade,
  issue_import_key text references public.cs_issues(issue_import_key) on delete set null,
  note_type text not null default 'discussion',
  body text not null,
  author_name text,
  created_at timestamptz not null default now()
);

create index if not exists cs_meeting_notes_meeting_id_idx
  on public.cs_meeting_notes(meeting_id, created_at asc);

create index if not exists cs_meeting_notes_issue_import_key_idx
  on public.cs_meeting_notes(issue_import_key);

create table if not exists public.cs_meeting_action_items (
  id bigint generated always as identity primary key,
  meeting_id bigint not null references public.cs_meetings(id) on delete cascade,
  issue_import_key text references public.cs_issues(issue_import_key) on delete set null,
  description text not null,
  owner_name text,
  due_date date,
  status text not null default 'open',
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists cs_meeting_action_items_meeting_id_idx
  on public.cs_meeting_action_items(meeting_id, created_at asc);

create index if not exists cs_meeting_action_items_status_idx
  on public.cs_meeting_action_items(status, due_date);
