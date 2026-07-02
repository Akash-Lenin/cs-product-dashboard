function formatCurrency(value) {
  if (!value) return "No ACV";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function differenceInDays(value) {
  if (!value) return null;
  const now = new Date();
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(value) {
  if (!value) return null;
  const now = new Date();
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  return Math.ceil((then.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function FocusColumn({ title, subtitle, issues, accent, onSelectIssue }) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-stone-500">Focus lane</div>
          <h3 className="mt-2 text-lg font-semibold text-stone-50">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-400">{subtitle}</p>
        </div>
        <span className={`h-3 w-3 rounded-full ${accent}`} />
      </div>

      <div className="mt-5 space-y-3">
        {issues.length ? (
          issues.map((issue) => (
            <button
              key={issue.issue_import_key}
              type="button"
              onClick={() => onSelectIssue(issue)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-400/40 hover:bg-black/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-medium text-stone-100">{issue.issue_title}</div>
                  <div className="mt-1 truncate text-sm text-stone-500">{issue.account_name_raw}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-stone-500">
                  <div>{issue.priority || "No priority"}</div>
                  <div className="mt-1">{formatCurrency(issue.acv)}</div>
                </div>
              </div>
              <div className="mt-3 line-clamp-2 text-sm leading-6 text-stone-400">
                {issue.business_impact || "No business impact captured"}
              </div>
              {issue.assignee_name ? (
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                  Owner {issue.assignee_name}
                </div>
              ) : null}
              {issue.lastHistoryAt ? (
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                  Last update {differenceInDays(issue.lastHistoryAt)}d ago
                </div>
              ) : (
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                  No history yet
                </div>
              )}
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-stone-500">
            Nothing in this lane right now.
          </div>
        )}
      </div>
    </article>
  );
}

export function IssueFocusBoard({ issues, onSelectIssue }) {
  const escalations = issues
    .filter((issue) => issue.priority === "High" && (issue.health === "Red" || issue.health === "Amber"))
    .slice(0, 3);

  const needsUpdate = [...issues]
    .filter((issue) => {
      const ageInDays = differenceInDays(issue.lastHistoryAt);
      return issue.current_status !== "Released" && (
        issue.historyCount === 0 ||
        ageInDays === null ||
        ageInDays >= 7 ||
        !issue.next_steps
      );
    })
    .sort((left, right) => {
      const leftAge = differenceInDays(left.lastHistoryAt);
      const rightAge = differenceInDays(right.lastHistoryAt);
      return (rightAge ?? 999) - (leftAge ?? 999);
    })
    .slice(0, 3);

  const stageDue = [...issues]
    .filter((issue) => issue.stage_due_date && issue.current_status !== "Released")
    .sort((left, right) => {
      const leftDays = daysUntil(left.stage_due_date);
      const rightDays = daysUntil(right.stage_due_date);
      return (leftDays ?? 999) - (rightDays ?? 999);
    })
    .slice(0, 3);

  return (
    <section className="grid gap-4 2xl:grid-cols-3">
      <FocusColumn
        title="Escalations"
        subtitle="High-priority work on amber or red accounts."
        issues={escalations}
        accent="bg-rose-400"
        onSelectIssue={onSelectIssue}
      />
      <FocusColumn
        title="Needs update this week"
        subtitle="Open issues with stale history, no history, or missing next steps."
        issues={needsUpdate}
        accent="bg-sky-400"
        onSelectIssue={onSelectIssue}
      />
      <FocusColumn
        title="Due soon or overdue"
        subtitle="Open issues with stage due dates that need attention first."
        issues={stageDue}
        accent="bg-amber-400"
        onSelectIssue={onSelectIssue}
      />
    </section>
  );
}
