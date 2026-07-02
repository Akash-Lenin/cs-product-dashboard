function formatDateLabel(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function daysUntil(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
}

function noteTypeStyle(value) {
  const map = {
    decision: { background: "#DDF1E4", color: "#1F6B44" },
    risk: { background: "#F8DAE2", color: "#842A42" }
  };
  return map[value] || { background: "var(--app-surface-2)", color: "var(--app-text-body)" };
}

function ColumnHeader({ children }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
      {children}
    </div>
  );
}

function MoreLine({ count }) {
  if (count <= 0) return null;
  return (
    <div className="text-[12px]" style={{ color: "var(--app-text-muted)" }}>
      +{count} more in Meeting space
    </div>
  );
}

const COLUMN_CAP = 4;

export function LastMeetingCard({ meeting, onOpenMeetings }) {
  if (!meeting) {
    return (
      <section className="cs-panel px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="cs-panel-title">Last meeting</h2>
            <p className="cs-panel-subtitle">No meetings logged yet. Run the first sync from Meeting space.</p>
          </div>
          <button type="button" className="cs-link-button" onClick={onOpenMeetings}>
            Open Meeting space
          </button>
        </div>
      </section>
    );
  }

  const notes = meeting.notes || [];
  const discussed = notes.filter((note) => !["decision", "risk"].includes(note.note_type));
  const decisions = notes.filter((note) => ["decision", "risk"].includes(note.note_type));
  const actionItems = meeting.action_items || [];
  const openActions = actionItems.filter((item) => item.status !== "done");

  return (
    <section className="cs-panel px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.09em]" style={{ color: "var(--app-text-muted)" }}>
            Last meeting · {formatDateLabel(meeting.meeting_date)}
          </div>
          <h2 className="mt-1 text-[17px] font-semibold" style={{ color: "var(--app-text)" }}>{meeting.title}</h2>
          {meeting.digest ? (
            <p className="mt-1.5 line-clamp-2 max-w-[720px] text-[13px] leading-6" style={{ color: "var(--app-text-body)" }}>
              {meeting.digest}
            </p>
          ) : null}
        </div>
        <button type="button" className="cs-link-button shrink-0" onClick={onOpenMeetings}>
          Open Meeting space
        </button>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div className="flex flex-col gap-2.5">
          <ColumnHeader>Discussed · {discussed.length}</ColumnHeader>
          {discussed.length ? (
            discussed.slice(0, COLUMN_CAP).map((note) => (
              <div key={note.id} className="rounded-[10px] border px-3 py-2.5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                <div className="line-clamp-2 text-[12.5px] leading-5" style={{ color: "var(--app-text-body)" }}>{note.body}</div>
                <div className="mt-1 text-[11px]" style={{ color: "var(--app-text-muted)" }}>{note.author_name || "Unattributed"}</div>
              </div>
            ))
          ) : (
            <div className="text-[12.5px]" style={{ color: "var(--app-text-muted)" }}>Nothing captured.</div>
          )}
          <MoreLine count={discussed.length - COLUMN_CAP} />
        </div>

        <div className="flex flex-col gap-2.5">
          <ColumnHeader>Decisions & risks · {decisions.length}</ColumnHeader>
          {decisions.length ? (
            decisions.slice(0, COLUMN_CAP).map((note) => (
              <div key={note.id} className="rounded-[10px] border px-3 py-2.5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={noteTypeStyle(note.note_type)}>
                    {note.note_type === "risk" ? "Risk" : "Decision"}
                  </span>
                  <span className="line-clamp-2 text-[12.5px] leading-5" style={{ color: "var(--app-text-body)" }}>{note.body}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-[12.5px]" style={{ color: "var(--app-text-muted)" }}>Nothing captured.</div>
          )}
          <MoreLine count={decisions.length - COLUMN_CAP} />
        </div>

        <div className="flex flex-col gap-2.5">
          <ColumnHeader>Action items · {openActions.length} open</ColumnHeader>
          {actionItems.length ? (
            actionItems.slice(0, COLUMN_CAP).map((item) => {
              const done = item.status === "done";
              const dueDays = daysUntil(item.due_date);
              return (
                <div key={item.id} className="rounded-[10px] border px-3 py-2.5" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-2)" }}>
                  <div
                    className="line-clamp-1 text-[12.5px] font-semibold leading-5"
                    style={{ color: done ? "var(--app-text-muted)" : "var(--app-text)", textDecoration: done ? "line-through" : "none" }}
                  >
                    {item.description}
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: done || dueDays === null || dueDays >= 0 ? "var(--app-text-muted)" : "#842A42" }}>
                    {item.owner_name || "Unassigned"}
                    {" · "}
                    {done
                      ? "Done"
                      : item.due_date
                        ? dueDays < 0
                          ? `${Math.abs(dueDays)}d overdue`
                          : `Due ${formatDateLabel(item.due_date)}`
                        : "No due date"}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-[12.5px]" style={{ color: "var(--app-text-muted)" }}>No action items yet.</div>
          )}
          <MoreLine count={actionItems.length - COLUMN_CAP} />
        </div>
      </div>
    </section>
  );
}

export function DueThisWeekPanel({ issues, onSelectIssue, onOpenPending }) {
  const dueEntries = issues
    .filter((issue) => issue.current_status !== "Released")
    .map((issue) => ({ issue, dueDays: daysUntil(issue.stage_due_date) }))
    .filter((entry) => entry.dueDays !== null && entry.dueDays <= 7)
    .sort((left, right) => left.dueDays - right.dueDays)
    .slice(0, 8);

  return (
    <section className="cs-panel">
      <div className="cs-panel-header">
        <div>
          <h2 className="cs-panel-title">Due this week</h2>
          <p className="cs-panel-subtitle">Stage due dates in the next 7 days, overdue first</p>
        </div>
        <button type="button" onClick={onOpenPending} className="cs-link-button">
          Open Pending
        </button>
      </div>
      <div>
        {dueEntries.length ? (
          dueEntries.map(({ issue, dueDays }) => (
            <button
              key={issue.issue_import_key}
              type="button"
              onClick={() => onSelectIssue(issue)}
              className="cs-attention-row"
            >
              <div className="min-w-0 flex-1">
                <div className="cs-row-title">{issue.issue_title}</div>
                <div className="cs-row-subtitle">
                  {issue.assignee_name || issue.csm || "Unassigned"}
                </div>
              </div>
              <span
                className="shrink-0 text-[12px] font-semibold"
                style={{ color: dueDays < 0 ? "#842A42" : "var(--app-text-body)" }}
              >
                {dueDays < 0 ? `${Math.abs(dueDays)}d overdue` : dueDays === 0 ? "Due today" : `${dueDays}d left`}
              </span>
            </button>
          ))
        ) : (
          <div className="px-5 py-6 text-sm" style={{ color: "var(--app-text-muted)" }}>
            Nothing is due in the next 7 days.
          </div>
        )}
      </div>
    </section>
  );
}
