-- Topic-table model for meetings:
--   a discussed note (topic) carries its decision on the same row,
--   and action items can belong to a specific topic

alter table public.cs_meeting_notes
  add column if not exists decision text;

alter table public.cs_meeting_action_items
  add column if not exists note_id bigint references public.cs_meeting_notes(id) on delete set null;

create index if not exists cs_meeting_action_items_note_id_idx
  on public.cs_meeting_action_items(note_id);
