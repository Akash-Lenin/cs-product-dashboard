alter table public.cs_issues
  add column if not exists attention_snoozed_until date;

alter table public.cs_issues
  add column if not exists attention_snoozed_by text;

create index if not exists cs_issues_attention_snoozed_until_idx
  on public.cs_issues(attention_snoozed_until);
