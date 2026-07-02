create table if not exists public.cs_issue_updates (
  id bigint generated always as identity primary key,
  issue_import_key text not null references public.cs_issues(issue_import_key) on delete cascade,
  entry_type text not null default 'meeting_note',
  body text not null,
  author_name text,
  source text not null default 'app',
  created_at timestamptz not null default now()
);

create index if not exists cs_issue_updates_issue_import_key_idx
  on public.cs_issue_updates(issue_import_key, created_at desc);
