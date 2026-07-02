alter table public.cs_issues
  add column if not exists assignee_name text,
  add column if not exists stage_due_date date,
  add column if not exists dev_jira_ticket text,
  add column if not exists revision_owner text,
  add column if not exists revision_request text;
