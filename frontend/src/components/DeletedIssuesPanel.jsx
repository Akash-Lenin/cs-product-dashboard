function formatDeletedTime(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatAcvCompact(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `$${(number / 1000000).toFixed(1).replace(".0", "")}M`;
  if (number >= 1000) return `$${Math.round(number / 1000)}k`;
  return `$${number}`;
}

export function DeletedIssuesPanel({
  issues,
  loading,
  restoringId,
  purgingId,
  message,
  onRestore,
  onDeleteForever
}) {
  if (loading) {
    return <div className="cs-panel px-6 py-14 text-center text-sm text-[var(--app-text-muted)]">Loading review bin...</div>;
  }

  if (!issues.length) {
    return (
      <div className="cs-panel px-6 py-14 text-center text-sm text-[var(--app-text-muted)]">
        No deleted issues are waiting for review.
      </div>
    );
  }

  return (
    <section className="cs-panel overflow-hidden">
      <div className="border-b border-[var(--app-border)] px-6 py-5">
        <h2 className="cs-panel-title">Review bin</h2>
        <p className="cs-panel-subtitle">Deleted issues stay here until someone restores them or removes them permanently.</p>
      </div>

      {message ? (
        <div className="border-b border-[var(--app-border)] bg-[#FFF5F7] px-6 py-3 text-[13px] text-[#842A42]">
          {message}
        </div>
      ) : null}

      <div className="divide-y divide-[var(--app-border)]">
        {issues.map((issue) => {
          const busy = restoringId === issue.deleted_id || purgingId === issue.deleted_id;

          return (
            <div key={issue.deleted_id} className="grid gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--app-text-muted)]">
                  <span className="font-semibold text-[var(--app-text-body)]">
                    {issue.jira_ticket || issue.issue_import_key}
                  </span>
                  <span>•</span>
                  <span>Deleted {formatDeletedTime(issue.deleted_at)}</span>
                  {issue.deleted_by ? (
                    <>
                      <span>•</span>
                      <span>by {issue.deleted_by}</span>
                    </>
                  ) : null}
                </div>

                <div className="mt-2 text-[18px] font-semibold text-[var(--app-text)]">{issue.issue_title || "Untitled issue"}</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(issue.accounts || []).map((account) => (
                    <span
                      key={`${issue.deleted_id}-${account.accountKey}`}
                      className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--app-text-body)]"
                    >
                      {account.accountName}
                    </span>
                  ))}
                </div>

                {issue.delete_reason ? (
                  <div className="mt-3 rounded-[10px] border border-[rgba(132,42,66,0.18)] bg-[#F8DAE2] px-3.5 py-3 text-[13px] text-[#842A42]">
                    <span className="font-semibold">Delete note:</span> {issue.delete_reason}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-surface-2)] px-4 py-4">
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em] text-[var(--app-text-muted)]">Owner</div>
                    <div className="mt-1 text-[var(--app-text-body)]">{issue.assignee_name || issue.csm || "Unassigned"}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em] text-[var(--app-text-muted)]">ACV</div>
                    <div className="mt-1 text-[var(--app-text-body)]">{formatAcvCompact(issue.acv)}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em] text-[var(--app-text-muted)]">Status</div>
                    <div className="mt-1 text-[var(--app-text-body)]">{issue.current_status || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-[0.07em] text-[var(--app-text-muted)]">History</div>
                    <div className="mt-1 text-[var(--app-text-body)]">{issue.historyCount || 0} entries</div>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRestore(issue.deleted_id)}
                    className="flex-1 bg-[var(--app-sidebar)] px-4 py-3 text-[13px] font-semibold text-[#FAFAF7] disabled:opacity-60"
                  >
                    {restoringId === issue.deleted_id ? "Restoring..." : "Restore issue"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDeleteForever(issue.deleted_id)}
                    className="border border-[rgba(132,42,66,0.28)] px-4 py-3 text-[13px] font-semibold text-[#842A42] disabled:opacity-60"
                  >
                    {purgingId === issue.deleted_id ? "Deleting..." : "Delete forever"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
