create table if not exists public.cs_deleted_issues (
  id bigint generated always as identity primary key,
  issue_import_key text not null unique,
  logical_issue_key text,
  issue_title text,
  account_name_raw text,
  jira_ticket text,
  deleted_by text,
  delete_reason text,
  deleted_at timestamptz not null default now(),
  issue_snapshot jsonb not null,
  accounts_snapshot jsonb not null default '[]'::jsonb,
  history_snapshot jsonb not null default '[]'::jsonb
);

create index if not exists cs_deleted_issues_deleted_at_idx
  on public.cs_deleted_issues(deleted_at desc);

create index if not exists cs_deleted_issues_issue_title_idx
  on public.cs_deleted_issues(issue_title);
